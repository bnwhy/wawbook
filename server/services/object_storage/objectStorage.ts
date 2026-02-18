import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// R2/S3 configuration from environment
const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "wawbook";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// S3 client configured for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Compatibility layer: mimics the @google-cloud/storage File interface
 * so that existing route code works with minimal changes.
 */
export class StorageFile {
  constructor(
    public readonly name: string,
    private bucket: string = R2_BUCKET_NAME
  ) {}

  async exists(): Promise<[boolean]> {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.name }));
      return [true];
    } catch {
      return [false];
    }
  }

  async save(data: Buffer, options?: { contentType?: string; metadata?: { cacheControl?: string; [key: string]: any } }): Promise<void> {
    await s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.name,
      Body: data,
      ContentType: options?.contentType || "application/octet-stream",
      CacheControl: options?.metadata?.cacheControl,
      Metadata: options?.metadata ? Object.fromEntries(
        Object.entries(options.metadata).filter(([k]) => k !== "cacheControl").map(([k, v]) => [k, String(v)])
      ) : undefined,
    }));
  }

  async download(): Promise<[Buffer]> {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.name }));
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return [Buffer.concat(chunks)];
  }

  createReadStream(): Readable {
    const passthrough = new Readable({ read() {} });
    s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.name }))
      .then(response => {
        const body = response.Body as Readable;
        body.on("data", (chunk) => passthrough.push(chunk));
        body.on("end", () => passthrough.push(null));
        body.on("error", (err) => passthrough.destroy(err));
      })
      .catch(err => passthrough.destroy(err));
    return passthrough;
  }

  async getMetadata(): Promise<[{ contentType?: string; size?: string; metadata?: Record<string, string>; updated?: string }]> {
    const response = await s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.name }));
    return [{
      contentType: response.ContentType,
      size: response.ContentLength?.toString(),
      metadata: response.Metadata,
      updated: response.LastModified?.toISOString(),
    }];
  }

  async setMetadata(meta: { metadata?: Record<string, string> }): Promise<void> {
    // R2: copy object to itself with new metadata (S3 standard pattern)
    const existing = await s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.name }));
    const [data] = await this.download();
    await s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.name,
      Body: data,
      ContentType: existing.ContentType,
      CacheControl: existing.CacheControl,
      Metadata: { ...existing.Metadata, ...meta.metadata },
    }));
  }

  async delete(): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.name }));
  }
}

/**
 * Compatibility layer: mimics the @google-cloud/storage Bucket interface.
 * All bucket names map to the single R2 bucket (R2_BUCKET_NAME).
 */
class StorageBucket {
  constructor(private bucketName: string = R2_BUCKET_NAME) {}

  file(key: string): StorageFile {
    return new StorageFile(key, this.bucketName);
  }

  async getFiles(options?: { prefix?: string }): Promise<[StorageFile[]]> {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: options?.prefix,
      MaxKeys: 1000,
    }));
    const files = (response.Contents || []).map(obj => {
      const file = new StorageFile(obj.Key || "", this.bucketName);
      // Attach metadata for list results
      (file as any).metadata = {
        size: obj.Size?.toString(),
        updated: obj.LastModified?.toISOString(),
      };
      return file;
    });
    return [files];
  }
}

/**
 * Compatibility layer: mimics the @google-cloud/storage Storage interface.
 * Routes call `objectStorageClient.bucket(name)` — all buckets map to R2.
 */
class StorageClientCompat {
  bucket(_name?: string): StorageBucket {
    return new StorageBucket(R2_BUCKET_NAME);
  }
}

// Drop-in replacement for the old GCS client
export const objectStorageClient = new StorageClientCompat();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      // Fallback: use a default public prefix in R2
      return [`/${R2_BUCKET_NAME}/public`];
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      // Fallback: use a default private prefix in R2
      return `/${R2_BUCKET_NAME}/private`;
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { objectName } = parseObjectPath(fullPath);
      const file = new StorageFile(objectName, R2_BUCKET_NAME);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }

  async downloadObject(file: StorageFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const key = `private/uploads/${objectId}`;
    const url = await getSignedUrl(s3Client, new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }), { expiresIn: 900 });
    return url;
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { objectName } = parseObjectPath(objectEntityPath);
    const objectFile = new StorageFile(objectName, R2_BUCKET_NAME);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Handle R2 presigned URLs
    if (rawPath.startsWith("https://")) {
      try {
        const url = new URL(rawPath);
        const rawObjectPath = url.pathname;
        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }
        if (rawObjectPath.startsWith(objectEntityDir)) {
          const entityId = rawObjectPath.slice(objectEntityDir.length);
          return `/objects/${entityId}`;
        }
        // Extract key from path (remove leading /)
        const key = rawObjectPath.startsWith("/") ? rawObjectPath.slice(1) : rawObjectPath;
        return `/objects/${key}`;
      } catch {
        return rawPath;
      }
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StorageFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}
