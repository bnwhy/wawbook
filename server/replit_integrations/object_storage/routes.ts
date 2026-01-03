import type { Express, Request } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import { renderHtmlToImage } from "../../services/pageRenderer";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Upload a base64 encoded image directly to object storage.
   * This is used for converting blob URLs to permanent storage URLs.
   *
   * Request body (JSON):
   * {
   *   "data": "base64_encoded_image_data",
   *   "contentType": "image/png",
   *   "filename": "optional_filename.png"
   * }
   *
   * Response:
   * {
   *   "objectPath": "/objects/uploads/uuid",
   *   "publicUrl": "https://..."
   * }
   */
  app.post("/api/uploads/base64", async (req, res) => {
    try {
      const { data, contentType, filename } = req.body;

      if (!data) {
        return res.status(400).json({ error: "Missing required field: data" });
      }

      // Get the bucket from PUBLIC_OBJECT_SEARCH_PATHS (first path)
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths.length) {
        return res.status(500).json({ error: "No public object storage path configured" });
      }

      const publicPath = publicPaths[0];
      const { bucketName, objectName: basePath } = parseObjectPathSimple(publicPath);
      
      // Generate unique filename
      const fileId = randomUUID();
      const ext = getExtensionFromContentType(contentType || 'image/png');
      const finalFilename = filename ? `${filename}.${ext}` : `image_${fileId}.${ext}`;
      const objectName = basePath ? `${basePath}/${finalFilename}` : finalFilename;

      // Decode base64 and upload
      const buffer = Buffer.from(data, 'base64');
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      await file.save(buffer, {
        contentType: contentType || 'image/png',
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Return the object path that can be served (includes bucket name)
      const objectPath = `/objects/${bucketName}/${objectName}`;

      res.json({
        objectPath,
        filename: finalFilename,
      });
    } catch (error) {
      console.error("Error uploading base64 image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  /**
   * Upload and extract a ZIP/EPUB file, storing all images in object storage.
   * 
   * Request body (JSON):
   * {
   *   "data": "base64_encoded_zip_file",
   *   "filename": "book.epub"
   * }
   * 
   * Response:
   * {
   *   "images": { "original/path.png": "/objects/bucket/public/uuid.png", ... },
   *   "htmlFiles": ["content.xhtml", ...],
   *   "htmlContent": { "content.xhtml": "<html>...</html>" }
   * }
   */
  app.post("/api/uploads/extract-zip", async (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data) {
        return res.status(400).json({ error: "Missing required field: data" });
      }

      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths.length) {
        return res.status(500).json({ error: "No public object storage path configured" });
      }

      const publicPath = publicPaths[0];
      const { bucketName, objectName: basePath } = parseObjectPathSimple(publicPath);
      
      const sessionId = randomUUID().substring(0, 8);
      const buffer = Buffer.from(data, 'base64');
      const zip = await JSZip.loadAsync(buffer);
      
      const imageMap: Record<string, string> = {};
      const fontMap: Record<string, string> = {};
      const htmlFiles: string[] = [];
      const htmlContent: Record<string, string> = {};
      const cssContent: Record<string, string> = {};
      const fontWarnings: string[] = [];
      
      const bucket = objectStorageClient.bucket(bucketName);
      
      // First pass: extract all assets (images and fonts)
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        const lowerPath = relativePath.toLowerCase();
        
        // Handle images
        if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
          const imageBuffer = await zipEntry.async('nodebuffer');
          const ext = relativePath.split('.').pop() || 'png';
          const imageId = randomUUID().substring(0, 8);
          const storageName = `${sessionId}_${imageId}.${ext}`;
          const objectName = basePath ? `${basePath}/${storageName}` : storageName;
          
          const file = bucket.file(objectName);
          const contentType = getContentTypeFromExt(ext);
          
          await file.save(imageBuffer, {
            contentType,
            metadata: { cacheControl: 'public, max-age=31536000' },
          });
          
          const objectPath = `/objects/${bucketName}/${objectName}`;
          imageMap[relativePath] = objectPath;
          
          const parts = relativePath.split('/');
          const justFilename = parts[parts.length - 1];
          imageMap[justFilename] = objectPath;
          
          // Also add partial paths (e.g., "image/1.png" from "OEBPS/image/1.png")
          for (let i = 1; i < parts.length; i++) {
            const partialPath = parts.slice(i).join('/');
            if (!imageMap[partialPath]) {
              imageMap[partialPath] = objectPath;
            }
          }
        }
        // Handle fonts (.ttf, .otf, .woff, .woff2)
        else if (/\.(ttf|otf|woff2?|eot)$/i.test(relativePath)) {
          const fontBuffer = await zipEntry.async('nodebuffer');
          const ext = relativePath.split('.').pop() || 'ttf';
          const fontId = randomUUID().substring(0, 8);
          const storageName = `${sessionId}_${fontId}.${ext}`;
          const objectName = basePath ? `${basePath}/fonts/${storageName}` : `fonts/${storageName}`;
          
          const file = bucket.file(objectName);
          const contentType = getFontContentType(ext);
          
          await file.save(fontBuffer, {
            contentType,
            metadata: { cacheControl: 'public, max-age=31536000' },
          });
          
          const objectPath = `/objects/${bucketName}/${objectName}`;
          fontMap[relativePath] = objectPath;
          
          // Add various path mappings for font references
          const parts = relativePath.split('/');
          const justFilename = parts[parts.length - 1];
          fontMap[justFilename] = objectPath;
          
          for (let i = 1; i < parts.length; i++) {
            const partialPath = parts.slice(i).join('/');
            if (!fontMap[partialPath]) {
              fontMap[partialPath] = objectPath;
            }
          }
          
          console.log(`[EPUB] Extracted font: ${justFilename} -> ${objectPath}`);
        }
        else if (/\.(html?|xhtml)$/i.test(relativePath)) {
          htmlFiles.push(relativePath);
          const content = await zipEntry.async('string');
          htmlContent[relativePath] = content;
        } else if (/\.css$/i.test(relativePath)) {
          const content = await zipEntry.async('string');
          cssContent[relativePath] = content;
        }
      }
      
      // Second pass: update CSS with correct font URLs and detect missing fonts
      let allCssUpdated: Record<string, string> = {};
      for (const [cssPath, css] of Object.entries(cssContent)) {
        let updatedCss = css;
        
        // Find all @font-face declarations and update src URLs
        updatedCss = updatedCss.replace(
          /(@font-face\s*\{[^}]*src\s*:\s*url\(["']?)([^"')]+)(["']?\)[^}]*\})/gi,
          (match, before, fontPath, after) => {
            // Clean up the font path (remove quotes, ../, etc.)
            const cleanPath = fontPath.replace(/^["']|["']$/g, '').replace(/^\.\.\//, '').replace(/^\.\//, '');
            const justFilename = cleanPath.split('/').pop() || cleanPath;
            
            // Look for the font in our fontMap
            const storedPath = fontMap[cleanPath] || fontMap[justFilename];
            
            if (storedPath) {
              console.log(`[EPUB] Updated font reference: ${fontPath} -> ${storedPath}`);
              return `${before}${storedPath}${after}`;
            } else {
              // Font not found in EPUB - check if it might be a system/Google font
              const fontNameMatch = match.match(/font-family\s*:\s*["']?([^"';,]+)/i);
              const fontName = fontNameMatch ? fontNameMatch[1].trim() : justFilename.replace(/\.[^.]+$/, '');
              fontWarnings.push(`Police "${fontName}" non trouvée dans l'EPUB (fichier: ${fontPath})`);
              console.warn(`[EPUB] Font not found: ${fontPath}`);
              return match; // Keep original
            }
          }
        );
        
        allCssUpdated[cssPath] = updatedCss;
      }
      
      // Now render HTML pages to images using Puppeteer
      const pageImages: Array<{ pageIndex: number; imageUrl: string }> = [];
      
      // Combine all updated CSS content (with font URLs updated)
      const allCss = Object.values(allCssUpdated).join('\n');
      
      // Filter to only content pages (not TOC, etc.)
      const contentHtmlFiles = htmlFiles.filter(f => 
        !f.toLowerCase().includes('toc') && 
        !f.toLowerCase().includes('nav') &&
        !f.toLowerCase().includes('cover')
      );
      
      // Process each HTML page
      for (let i = 0; i < contentHtmlFiles.length; i++) {
        const htmlFile = contentHtmlFiles[i];
        let pageHtml = htmlContent[htmlFile] || '';
        
        // Parse viewport dimensions from the HTML
        const viewportMatch = pageHtml.match(/width[=:](\d+).*?height[=:](\d+)/i);
        const pageWidth = viewportMatch ? parseInt(viewportMatch[1]) : 595;
        const pageHeight = viewportMatch ? parseInt(viewportMatch[2]) : 842;
        
        // Replace image paths with Object Storage URLs
        for (const [originalPath, storagePath] of Object.entries(imageMap)) {
          // Match various path patterns
          const patterns = [
            new RegExp(`src=["']([^"']*${originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi'),
            new RegExp(`src=["']([^"']*${originalPath.split('/').pop()?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''})["']`, 'gi'),
          ];
          
          for (const pattern of patterns) {
            pageHtml = pageHtml.replace(pattern, `src="${storagePath}"`);
          }
        }
        
        try {
          // Render HTML to image
          const imageBuffer = await renderHtmlToImage({
            html: pageHtml,
            css: allCss,
            width: pageWidth,
            height: pageHeight,
          });
          
          // Upload the rendered image to Object Storage
          const pageImageName = `${sessionId}_page_${i + 1}.png`;
          const objectName = basePath ? `${basePath}/${pageImageName}` : pageImageName;
          const file = bucket.file(objectName);
          
          await file.save(imageBuffer, {
            contentType: 'image/png',
            metadata: { cacheControl: 'public, max-age=31536000' },
          });
          
          const imageUrl = `/objects/${bucketName}/${objectName}`;
          pageImages.push({ pageIndex: i + 1, imageUrl });
          
          console.log(`Rendered page ${i + 1} to ${imageUrl}`);
        } catch (renderError) {
          console.error(`Failed to render page ${i + 1}:`, renderError);
        }
      }
      
      res.json({
        images: imageMap,
        fonts: fontMap,
        fontWarnings,
        htmlFiles,
        htmlContent,
        cssContent: allCssUpdated,
        sessionId,
        pageImages,
      });
    } catch (error) {
      console.error("Error extracting ZIP:", error);
      res.status(500).json({ error: "Failed to extract ZIP file" });
    }
  });

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      // Try to get file from private dir first
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        await objectStorageService.downloadObject(objectFile, res);
        return;
      } catch (e) {
        // If not found in private dir, try public paths
      }

      // Extract the object path from /objects/<path>
      const objectPath = req.path.replace(/^\/objects\//, '');
      
      // Search in public paths
      const publicFile = await objectStorageService.searchPublicObject(objectPath);
      if (publicFile) {
        await objectStorageService.downloadObject(publicFile, res);
        return;
      }
      
      // Also try direct bucket/path lookup
      const parts = objectPath.split('/');
      if (parts.length >= 2) {
        const bucketName = parts[0];
        const fileName = parts.slice(1).join('/');
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(fileName);
        const [exists] = await file.exists();
        if (exists) {
          await objectStorageService.downloadObject(file, res);
          return;
        }
      }

      return res.status(404).json({ error: "Object not found" });
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

function parseObjectPathSimple(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 2) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return { bucketName, objectName };
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[contentType] || 'png';
}

function getContentTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  };
  return map[ext.toLowerCase()] || 'image/png';
}

function getFontContentType(ext: string): string {
  const map: Record<string, string> = {
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'eot': 'application/vnd.ms-fontobject',
  };
  return map[ext.toLowerCase()] || 'font/ttf';
}

