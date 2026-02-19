import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import * as path from "path";
import * as fs from "fs";
import { parseIdmlBuffer } from "./idmlParser";
import { extractEpubFromBuffer } from "./epubExtractor";
import { mergeEpubWithIdml } from "./idmlMerger";
import { cleanCssSyntax, detectFontIssues } from "./utils/cssHelpers";
import { parseImageFilename } from "./utils/filenameParser";
import { parseFontFileName } from "./utils/fontNameParser";
import { 
  getContentTypeFromExt, 
  getFontContentType, 
  getExtensionFromContentType,
  parseObjectPathSimple 
} from "./utils/contentTypeHelpers";
import { logger } from "../../utils/logger";

// Fonctions utilitaires déplacées vers utils/cssHelpers.ts, utils/filenameParser.ts, etc.

// Fonction parseImageFilename déplacée vers utils/filenameParser.ts

// Fonction buildWizardConfigFromCharacteristics déplacée vers wizardConfigBuilder.ts

// Fonction detectFontIssues déplacée vers utils/cssHelpers.ts

// Fonctions mergeEpubWithIdml et extractEpubFromBuffer déplacées vers des modules séparés
// (idmlMerger.ts et epubExtractor.ts respectivement)

/**
 * Download a file from object storage given its objectPath (e.g. "/objects/bucket/path/to/file").
 * Returns the file content as a Buffer. Throws if the file does not exist.
 */
async function downloadFromBucket(objectPath: string): Promise<Buffer> {
  const pathWithoutPrefix = objectPath.replace(/^\/objects\//, '');
  const parts = pathWithoutPrefix.split('/');
  const bucketName = parts[0];
  const objectName = parts.slice(1).join('/');

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found in bucket: ${objectPath}`);
  }

  const [buffer] = await file.download();
  return buffer;
}

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

      const fileId = randomUUID();
      const ext = getExtensionFromContentType(contentType || 'image/png');
      const finalFilename = filename ? `${filename}.${ext}` : `image_${fileId}.${ext}`;
      const objectKey = `uploads/${finalFilename}`;

      const buffer = Buffer.from(data, 'base64');
      const file = objectStorageService.file(objectKey);
      await file.save(buffer, { contentType: contentType || 'image/png' });

      const publicUrl = objectStorageService.getPublicUrl(objectKey);

      return res.json({
        objectPath: publicUrl,
        filename: finalFilename,
      });
    } catch (error: any) {
      logger.error({ error, message: error.message }, "Error uploading base64 image");
      return res.status(500).json({
        error: "Failed to upload image",
        details: {
          message: error.message,
          code: error.code,
        }
      });
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
      const { data } = req.body;

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
      const htmlFiles: string[] = [];
      const htmlContent: Record<string, string> = {};
      const cssContent: Record<string, string> = {};
      
      const bucket = objectStorageClient.bucket(bucketName);

      // First pass: extract all assets (images and fonts)
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
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
        // Fonts from EPUB are ignored - must be uploaded manually
        else if (/\.(html?|xhtml)$/i.test(relativePath)) {
          htmlFiles.push(relativePath);
          const content = await zipEntry.async('string');
          htmlContent[relativePath] = content;
        } else if (/\.css$/i.test(relativePath)) {
          const content = await zipEntry.async('string');
          cssContent[relativePath] = content;
        }
      }
      
      // Clean CSS syntax only (fonts are ignored - must be uploaded manually)
      const allCssUpdated: Record<string, string> = {};
      for (const [cssPath, css] of Object.entries(cssContent)) {
        allCssUpdated[cssPath] = cleanCssSyntax(css);
      }
      
      return res.json({
        images: imageMap,
        htmlFiles,
        htmlContent,
        cssContent: allCssUpdated,
        sessionId,
      });
    } catch (error) {
      logger.error({ error }, "Error extracting ZIP");
      return res.status(500).json({ error: "Failed to extract ZIP file" });
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

      return res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      logger.error({ error }, "Error generating upload URL");
      return res.status(500).json({ error: "Failed to generate upload URL" });
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
      // Extract the object path from /objects/<path>
      const objectPath = req.path.replace(/^\/objects\//, '');
      const parts = objectPath.split('/');
      
      // PRIORITY 1: Check if first part looks like a bucket name
      // If bucket is explicitly specified, strip it and use the file path
      if (parts.length >= 2 && parts[0] === (process.env.R2_BUCKET_NAME || 'wawbook')) {
        const bucketName = parts[0];
        const fileName = parts.slice(1).join('/');
        try {
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(fileName);
          const [exists] = await file.exists();
          if (exists) {
            await objectStorageService.downloadObject(file, res);
            return;
          } else {
            return res.status(404).json({ error: "Object not found" });
          }
        } catch (bucketError) {
          console.error(`[objects] Bucket ${bucketName} error:`, bucketError);
          return res.status(500).json({ error: "Failed to access object storage" });
        }
      }
      
      // PRIORITY 2: Try to get file from private dir (for paths without explicit bucket)
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        await objectStorageService.downloadObject(objectFile, res);
        return;
      } catch (e) {
        // If not found in private dir, try public paths
      }

      // PRIORITY 3: Search in public paths (for paths without explicit bucket)
      const publicFile = await objectStorageService.searchPublicObject(objectPath);
      if (publicFile) {
        await objectStorageService.downloadObject(publicFile, res);
        return;
      }

      return res.status(404).json({ error: "Object not found" });
    } catch (error) {
      logger.error({ error }, "Error serving object");
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  /**
   * Upload an EPUB file to the private bucket (.private/epubs/)
   */
  app.post("/api/uploads/epub", async (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data || !filename) {
        return res.status(400).json({ error: "Missing required fields: data, filename" });
      }

      const privateDir = objectStorageService.getPrivateObjectDir();
      const { bucketName, objectName: basePath } = parseObjectPathSimple(privateDir);
      
      const epubPath = basePath ? `${basePath}/epubs/${filename}` : `epubs/${filename}`;
      const buffer = Buffer.from(data, 'base64');
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(epubPath);

      await file.save(buffer, {
        contentType: 'application/epub+zip',
        metadata: { cacheControl: 'private, max-age=31536000' },
      });

      const objectPath = `/objects/${bucketName}/${epubPath}`;

      return res.json({
        objectPath,
        filename,
        size: buffer.length,
      });
    } catch (error) {
      logger.error({ error }, "Error uploading EPUB");
      return res.status(500).json({ error: "Failed to upload EPUB" });
    }
  });

  /**
   * List all EPUB files from all known buckets
   */
  app.get("/api/epubs", async (_req, res) => {
    try {
      const allEpubs: Array<{name: string, path: string, size?: number, updated?: string}> = [];
      
      // List of buckets to search (default bucket + any configured private dir bucket)
      const bucketsToSearch = new Set<string>();
      
      // Add default bucket
      const defaultBucket = process.env.R2_BUCKET_NAME || 'wawbook';
      bucketsToSearch.add(defaultBucket);
      
      // Also check the configured private dir bucket if different
      try {
        const privateDir = objectStorageService.getPrivateObjectDir();
        const { bucketName } = parseObjectPathSimple(privateDir);
        bucketsToSearch.add(bucketName);
      } catch (e) {
        // Ignore if PRIVATE_OBJECT_DIR is not set
      }
      
      
      for (const bucketName of Array.from(bucketsToSearch)) {
        try {
          const bucket = objectStorageClient.bucket(bucketName);
          
          // Search entire bucket for EPUB files
          const [files] = await bucket.getFiles();
          
          const epubs = files
            .filter(f => f.name.toLowerCase().endsWith('.epub'))
            .map(f => ({
              name: f.name.split('/').pop() || f.name,
              path: `/objects/${bucketName}/${f.name}`,
              size: f.metadata?.size ? Number(f.metadata.size) : undefined,
              updated: f.metadata?.updated,
            }));
          
          allEpubs.push(...epubs);
        } catch (bucketError) {
        }
      }

      return res.json({ epubs: allEpubs });
    } catch (error) {
      logger.error({ error }, "Error listing EPUBs");
      return res.status(500).json({ error: "Failed to list EPUBs" });
    }
  });

  /**
   * Extract an EPUB from bucket to local server storage
   */
  app.post("/api/epubs/extract", async (req, res) => {
    try {
      const { epubPath, bookId } = req.body;

      if (!epubPath || !bookId) {
        return res.status(400).json({ error: "Missing required fields: epubPath, bookId" });
      }


      const epubBuffer = await downloadFromBucket(epubPath);
      const result = await extractEpubFromBuffer(epubBuffer, bookId);
      
      // Match image characteristics to existing wizard configuration
      if (result.imageElements && result.imageElements.length > 0) {
        // Load existing book to get its wizardConfig
        const { storage } = await import('../../storage');
        const existingBook = await storage.getBook(bookId);
        const wizardConfig = existingBook?.wizardConfig as any;
        
        if (wizardConfig?.tabs && wizardConfig.tabs.length > 0) {
          
          // Build a lookup: characteristic key -> { tabId, variantId, optionId, optionLabel }
          const wizardLookup: Record<string, Record<string, { tabId: string; variantId: string; optionId: string; optionLabel: string }>> = {};
          
          for (const tab of wizardConfig.tabs) {
            if (tab.type === 'character' && tab.variants) {
              for (const variant of tab.variants) {
                if (variant.type === 'options' && variant.options) {
                  // The variant.id is the characteristic key (e.g., 'skin', 'haircolor', 'hero')
                  const charKey = variant.id;
                  if (!wizardLookup[charKey]) {
                    wizardLookup[charKey] = {};
                  }
                  for (const option of variant.options) {
                    wizardLookup[charKey][option.id] = {
                      tabId: tab.id,
                      variantId: variant.id,
                      optionId: option.id,
                      optionLabel: option.label,
                    };
                  }
                }
              }
            }
          }
          
          // Special handling for 'hero' characteristic: create lookup from all character tabs
          // This allows mapping hero:father → tab id="father"
          if (!wizardLookup['hero']) {
            wizardLookup['hero'] = {};
          }
          
          // Create wizardLookup['hero'] from all tabs of type 'character'
          // This allows direct mapping: hero:father → tab id="father"
          for (const tab of wizardConfig.tabs) {
            if (tab.type === 'character') {
              // For each character tab, map its ID as a possible hero value
              const firstVariant = tab.variants?.find((v: any) => v.type === 'options' && v.options && v.options.length > 0);
              if (firstVariant && firstVariant.options) {
                const firstOption = firstVariant.options[0];
                // Map tab.id → this tab (for hero:tabId)
                wizardLookup['hero'][tab.id] = {
                  tabId: tab.id,
                  variantId: firstVariant.id,
                  optionId: firstOption.id,
                  optionLabel: firstOption.label,
                };
                // Also map all options from this tab
                for (const option of firstVariant.options) {
                  if (!wizardLookup['hero'][option.id]) {
                    wizardLookup['hero'][option.id] = {
                      tabId: tab.id,
                      variantId: firstVariant.id,
                      optionId: option.id,
                      optionLabel: option.label,
                    };
                  }
                }
              }
            }
          }
          
          
          // Always try direct mapping by tab ID: if hero="father", look for tab with id="father"
          // Collect all hero values from images
          const heroValuesFromImages = new Set<string>();
          for (const img of result.imageElements) {
            if (img.characteristics?.hero) {
              heroValuesFromImages.add(img.characteristics.hero);
            }
          }
          
          // For each hero value, check if there's a tab with matching ID
          for (const heroValue of Array.from(heroValuesFromImages)) {
            // Normalize hero value for comparison
            const normalizedHeroValue = heroValue.toLowerCase().trim();
            
            // Skip if this value is already mapped (check both original and normalized)
            if (wizardLookup['hero'][heroValue] || 
                Object.keys(wizardLookup['hero']).some(key => key.toLowerCase().trim() === normalizedHeroValue)) {
              continue;
            }
            
            // Find tab with matching ID (normalized comparison)
            const matchingTab = wizardConfig.tabs.find(
              (tab: any) => tab.type === 'character' && tab.id.toLowerCase().trim() === normalizedHeroValue
            );
            
            if (matchingTab && matchingTab.variants) {
              // Direct match found! Use variants from this tab
              
              // Map the hero value itself to the corresponding tab
              // First, look for a variant/option that exactly matches the hero value
              let heroMapped = false;
              for (const variant of matchingTab.variants) {
                if (variant.type === 'options' && variant.options) {
                  // Look for an option with ID matching heroValue
                  const matchingOption = variant.options.find((opt: any) => opt.id === heroValue);
                  if (matchingOption) {
                    wizardLookup['hero'][heroValue] = {
                      tabId: matchingTab.id,
                      variantId: variant.id,
                      optionId: matchingOption.id,
                      optionLabel: matchingOption.label,
                    };
                    heroMapped = true;
                    break;
                  }
                }
              }
              
              // If no exact option found, use the first variant/option available
              if (!heroMapped) {
                for (const variant of matchingTab.variants) {
                  if (variant.type === 'options' && variant.options && variant.options.length > 0) {
                    // Use tab ID as variantId and optionId to identify the character
                    wizardLookup['hero'][heroValue] = {
                      tabId: matchingTab.id,
                      variantId: variant.id,
                      optionId: variant.options[0].id,
                      optionLabel: variant.options[0].label,
                    };
                    break;
                  }
                }
              }
              
              // Map all options from all variants to allow other mappings
              for (const variant of matchingTab.variants) {
                if (variant.type === 'options' && variant.options) {
                  for (const option of variant.options) {
                    // Only add if not already mapped (enrich existing lookup)
                    if (!wizardLookup['hero'][option.id]) {
                      wizardLookup['hero'][option.id] = {
                        tabId: matchingTab.id,
                        variantId: variant.id,
                        optionId: option.id,
                        optionLabel: option.label,
                      };
                    }
                  }
                }
              }
              // Continue processing all hero values (removed break)
            }
          }
          
          // If some hero values are still unmapped, use fallback logic
          // Check which hero values from images are not yet mapped
          const unmappedHeroValues = Array.from(heroValuesFromImages).filter(
            hv => {
              const normalized = hv.toLowerCase().trim();
              return !wizardLookup['hero'][hv] && 
                     !Object.keys(wizardLookup['hero']).some(key => 
                       key.toLowerCase().trim() === normalized
                     );
            }
          );
          
          if (unmappedHeroValues.length > 0) {
              
              // Hero values that might appear in EPUB
              const heroValues = ['father', 'mother', 'boy', 'girl', 'grandpa', 'grandma', 'grandfather', 'grandmother'];
              
              // Search through all character tabs to find a variant that contains hero-like options
              for (const tab of wizardConfig.tabs) {
                if (tab.type === 'character' && tab.variants) {
                  for (const variant of tab.variants) {
                    if (variant.type === 'options' && variant.options) {
                      // Check if this variant has options that match hero values
                      const matchingOptions = variant.options.filter((opt: any) => 
                        heroValues.includes(opt.id) || 
                        heroValues.some((hv: string) => opt.label.toLowerCase().includes(hv.toLowerCase()))
                      );
                      
                      if (matchingOptions.length > 0) {
                        
                        // Create lookup for 'hero' using this variant
                        wizardLookup['hero'] = {};
                        for (const option of variant.options) {
                          wizardLookup['hero'][option.id] = {
                            tabId: tab.id,
                            variantId: variant.id,
                            optionId: option.id,
                            optionLabel: option.label,
                          };
                        }
                        
                        // Also create reverse mapping for hero values
                        // Map hero values to option IDs if they don't match exactly
                        const heroValueMap: Record<string, string> = {
                          'father': 'father',
                          'mother': 'mother',
                          'boy': 'boy',
                          'girl': 'girl',
                          'grandpa': 'grandpa',
                          'grandfather': 'grandpa',
                          'grandma': 'grandma',
                          'grandmother': 'grandma',
                        };
                        
                        // Try to find matching options by ID or label
                        for (const heroValue of heroValues) {
                          if (!wizardLookup['hero'][heroValue]) {
                            // Try exact ID match
                            const exactMatch = variant.options.find((opt: any) => opt.id === heroValue);
                            if (exactMatch) {
                              wizardLookup['hero'][heroValue] = {
                                tabId: tab.id,
                                variantId: variant.id,
                                optionId: exactMatch.id,
                                optionLabel: exactMatch.label,
                              };
                            } else {
                              // Try mapped value
                              const mappedValue = heroValueMap[heroValue];
                              if (mappedValue && wizardLookup['hero'][mappedValue]) {
                                wizardLookup['hero'][heroValue] = wizardLookup['hero'][mappedValue];
                              } else {
                                // Try label match (case-insensitive)
                                const labelMatch = variant.options.find((opt: any) => 
                                  opt.label.toLowerCase().includes(heroValue.toLowerCase()) ||
                                  heroValue.toLowerCase().includes(opt.label.toLowerCase())
                                );
                                if (labelMatch) {
                                  wizardLookup['hero'][heroValue] = {
                                    tabId: tab.id,
                                    variantId: variant.id,
                                    optionId: labelMatch.id,
                                    optionLabel: labelMatch.label,
                                  };
                                }
                              }
                            }
                          }
                        }
                        
                        break; // Use the first matching variant found
                      }
                    }
                  }
                }
              }
              
              if (unmappedHeroValues.length > 0 && Object.keys(wizardLookup['hero']).length === 0) {
              }
          }
          
          if (wizardLookup['hero']) {
          }
          
          // Match each image's characteristics to wizard options
          let matchedCount = 0;
          const unmappedCharacteristics: Record<string, Set<string>> = {};
          
          for (const img of result.imageElements) {
            if (img.characteristics && Object.keys(img.characteristics).length > 0) {
              const conditions: Array<{ variantId: string; optionId: string }> = [];
              // IMPORTANT: originalCharacteristics must come ONLY from the filename, not from anywhere else
              const originalCharacteristics = { ...img.characteristics };
              
              for (const [charKey, charValue] of Object.entries(img.characteristics)) {
                // Skip 'hero' - it's just a marker for which character, not a condition
                if (charKey === 'hero') {
                  continue;
                }
                
                // Normalize the characteristic value
                const normalizedValue = (charValue as string).toLowerCase().trim();
                const lookup = wizardLookup[charKey];
                
                // Try exact match first (original value)
                if (lookup && lookup[charValue as string]) {
                  const match = lookup[charValue as string];
                  conditions.push({
                    variantId: match.variantId,
                    optionId: match.optionId,
                  });
                } else if (lookup) {
                  // Try normalized match (case-insensitive, trimmed)
                  const normalizedMatch = Object.entries(lookup).find(([optId]) => 
                    optId.toLowerCase().trim() === normalizedValue
                  );
                  
                  if (normalizedMatch) {
                    const match = lookup[normalizedMatch[0]];
                    conditions.push({
                      variantId: match.variantId,
                      optionId: match.optionId,
                    });
                  } else {
                    // Track unmapped characteristics
                    if (!unmappedCharacteristics[charKey]) {
                      unmappedCharacteristics[charKey] = new Set<string>();
                    }
                    unmappedCharacteristics[charKey].add(charValue as string);
                  }
                } else {
                  // No lookup exists for this characteristic key
                  if (!unmappedCharacteristics[charKey]) {
                    unmappedCharacteristics[charKey] = new Set<string>();
                  }
                  unmappedCharacteristics[charKey].add(charValue as string);
                }
              }
              
              if (conditions.length > 0) {
                img.conditions = conditions;
                
                // Regenerate combinationKey ONLY from the original characteristics of the image
                // This ensures the key matches what's actually in the filename
                // Format: "variantId:optionId_variantId:optionId" (sorted alphabetically)
                // Map each original characteristic to its condition, but only include those that were in the original filename
                const keyPartsFromOriginal: string[] = [];
                for (const [charKey, charValue] of Object.entries(originalCharacteristics)) {
                  // Find the condition that was created from this specific original characteristic
                  // We can identify it by checking which condition matches the lookup for this charKey/charValue
                  const lookup = wizardLookup[charKey];
                  if (lookup) {
                    // Find the match that was used for this characteristic
                    const match = lookup[charValue as string] || 
                                 Object.entries(lookup).find(([optId]) => 
                                   optId.toLowerCase().trim() === String(charValue).toLowerCase().trim()
                                 )?.[1];
                    
                    if (match) {
                      // Find the condition that corresponds to this match
                      const matchingCondition = conditions.find(c => 
                        c.variantId === match.variantId && c.optionId === match.optionId
                      );
                      
                      if (matchingCondition) {
                        keyPartsFromOriginal.push(`${matchingCondition.variantId}:${matchingCondition.optionId}`);
                      }
                    }
                  }
                }
                
                // Sort and join
                keyPartsFromOriginal.sort();
                img.combinationKey = keyPartsFromOriginal.length > 0 ? keyPartsFromOriginal.join('_') : 'default';
                
                matchedCount++;
                
                // Verify: combinationKey should only contain characteristics from originalCharacteristics
                const originalKeys = Object.keys(originalCharacteristics);
                const keyPartsKeys = keyPartsFromOriginal.map(kp => kp.split(':')[0]);
                const extraKeys = keyPartsKeys.filter(k => !originalKeys.includes(k));
                if (extraKeys.length > 0) {
                  console.error(`[epub-extract] ⚠️ ERROR: combinationKey contains keys not in original characteristics!`);
                  console.error(`[epub-extract]   Original keys: ${originalKeys.join(', ')}`);
                  console.error(`[epub-extract]   Key parts keys: ${keyPartsKeys.join(', ')}`);
                  console.error(`[epub-extract]   Extra keys: ${extraKeys.join(', ')}`);
                } else {
                }
              } else {
                // No conditions matched, keep original combinationKey or set to 'default'
                if (!img.combinationKey || img.combinationKey === 'default') {
                  // Try to build from original characteristics if possible
                  const originalKeyParts = Object.entries(originalCharacteristics)
                    .map(([k, v]) => `${k}:${v}`)
                    .sort()
                    .join('_');
                  img.combinationKey = originalKeyParts || 'default';
                }
              }
            }
          }
          
          // Convert unmapped characteristics to plain object for response
          const unmappedSummary = Object.fromEntries(
            Object.entries(unmappedCharacteristics).map(([key, values]) => [key, Array.from(values)])
          );
          
          if (Object.keys(unmappedSummary).length > 0) {
            // Note: unmappedCharacteristics is for debugging only, not returned in result
          }
          
          
          // Log final combinationKeys for verification
          result.imageElements.forEach((img: any, _idx: number) => {
            if (img.combinationKey && img.combinationKey !== 'default') {
            }
          });
        } else {
        }
      }
      
      return res.json(result);
    } catch (error) {
      console.error("[epub-extract] Error:", error);
      return res.status(500).json({ error: "Failed to extract EPUB from bucket. Try direct file upload instead." });
    }
  });

  /**
   * Extract avatar template EPUB for a specific character tab
   */
  app.post("/api/epubs/extract-avatar-template", async (req, res) => {
    try {
      const { epubPath, bookId, tabId } = req.body;

      if (!epubPath || !bookId || !tabId) {
        return res.status(400).json({ error: "Missing required fields: epubPath, bookId, tabId" });
      }


      // Parse the epub path to get bucket and object name
      const pathWithoutPrefix = epubPath.replace(/^\/objects\//, '');
      const parts = pathWithoutPrefix.split('/');
      const bucketName = parts[0];
      const objectName = parts.slice(1).join('/');
      
      const bucket = objectStorageClient.bucket(bucketName);
      const epubFile = bucket.file(objectName);
      
      const [exists] = await epubFile.exists();
      if (!exists) {
        return res.status(404).json({ error: "EPUB file not found" });
      }

      // Download EPUB to memory
      const [epubBuffer] = await epubFile.download();

      // Extract images from EPUB
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(epubBuffer);
      
      // Create local directory for avatar images
      const fs = await import('fs');
      const path = await import('path');
      const avatarDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId, 'avatars', tabId, 'images');
      await fs.promises.mkdir(avatarDir, { recursive: true });
      
      // Store all extracted images with their characteristics
      const extractedImages: Array<{ fileName: string; localPath: string; characteristics: Record<string, string> }> = [];
      
      // Extract only images
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
          const fileName = relativePath.split('/').pop() || relativePath;
          const imageBuffer = await zipEntry.async('nodebuffer');
          const localPath = path.join(avatarDir, fileName);
          await fs.promises.writeFile(localPath, imageBuffer);
          
          // Parse filename for characteristics
          const parsedFilename = parseImageFilename(fileName);
          const characteristics = parsedFilename.characteristics;
          
          
          // Security check: verify hero matches tabId
          if (characteristics.hero) {
            const heroValue = characteristics.hero.toLowerCase();
            const tabIdLower = tabId.toLowerCase();
            
            if (heroValue !== tabIdLower) {
              continue;
            }
          }
          
          extractedImages.push({ fileName, localPath, characteristics });
        }
      }
      
      
      // Load the book to get the tab configuration
      const { storage } = await import('../../storage');
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      const wizardConfig = book.wizardConfig as any;
      if (!wizardConfig?.tabs) {
        return res.status(400).json({ error: "Book has no wizard configuration" });
      }
      
      const tab = wizardConfig.tabs.find((t: any) => t.id === tabId);
      if (!tab) {
        return res.status(404).json({ error: `Tab ${tabId} not found in wizard configuration` });
      }
      
      // Get option variants for this tab
      const optionVariants = tab.variants.filter((v: any) => v.type === 'options');
      
      // Find images with all variants (complete avatars) first
      const completeAvatars = extractedImages.filter(img => {
        for (const variant of optionVariants) {
          if (!img.characteristics[variant.id]) return false;
        }
        return true;
      });
      
      // Generate avatar mappings
      const avatarMappings: Record<string, string> = {};
      let mappedCount = 0;
      
      if (completeAvatars.length > 0) {
        // Use complete avatars directly (no composition needed)
        
        for (const img of completeAvatars) {
          const optionIds = optionVariants.map((v: any) => img.characteristics[v.id]);
          const scopedKey = `${tabId}:${optionIds.join('_')}`;
          const serverPath = `/assets/books/${bookId}/avatars/${tabId}/images/${img.fileName}`;
          avatarMappings[scopedKey] = serverPath;
          mappedCount++;
        }
      } else {
        // No complete avatars, need to compose from partial layers
        
        // Generate all possible complete combinations by matching partial layers
        const variantValues: Record<string, Set<string>> = {};
        for (const img of extractedImages) {
          for (const variant of optionVariants) {
            const value = img.characteristics[variant.id];
            if (value) {
              if (!variantValues[variant.id]) variantValues[variant.id] = new Set();
              variantValues[variant.id].add(value);
            }
          }
        }
        
        // Generate cartesian product
        const generateCombos = (vIdx: number, current: Record<string, string>): Record<string, string>[] => {
          if (vIdx >= optionVariants.length) return [current];
          
          const variant = optionVariants[vIdx];
          const values = Array.from(variantValues[variant.id] || []);
          if (values.length === 0) return [];
          
          const results: Record<string, string>[] = [];
          for (const value of values) {
            results.push(...generateCombos(vIdx + 1, { ...current, [variant.id]: value }));
          }
          return results;
        };
        
        const allPossibleCombos = generateCombos(0, {});
        
        // For each combo, find matching layers and compose
        const composedDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId, 'avatars', tabId, 'composed');
        await fs.promises.mkdir(composedDir, { recursive: true });
        
        for (const combo of allPossibleCombos) {
          try {
            // Find all layers that match this combination (subset match)
            const matchingLayers: any[] = [];
            
            for (const img of extractedImages) {
              let matches = true;
              for (const [variantId, optionId] of Object.entries(combo)) {
                const imgValue = img.characteristics[variantId];
                if (imgValue && imgValue !== optionId) {
                  matches = false;
                  break;
                }
              }
              
              if (matches) {
                // This layer is compatible with this combination
                const coverage = Object.keys(img.characteristics).filter(k => k !== 'hero' && combo[k] === img.characteristics[k]);
                matchingLayers.push({ ...img, coverage: coverage.length });
              }
            }
            
            if (matchingLayers.length === 0) {
              continue;
            }
            
            // Sort by coverage (least complete first for proper layering - skin/base first, details on top)
            matchingLayers.sort((a, b) => a.coverage - b.coverage);
            
            const optionIds = optionVariants.map((v: any) => combo[v.id]);
            const scopedKey = `${tabId}:${optionIds.join('_')}`;
            const safeKey = scopedKey.replace(/:/g, '-');
            const outputFileName = `${safeKey}.png`;
            const outputPath = path.join(composedDir, outputFileName);
            
            // Get dimensions from first layer
            const sharp = (await import('sharp')).default;
            const baseImage = sharp(matchingLayers[0].localPath);
            const metadata = await baseImage.metadata();
            const targetWidth = metadata.width || 800;
            const targetHeight = metadata.height || 800;
            
            // Create a transparent canvas
            const canvas = await sharp({
              create: {
                width: targetWidth,
                height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              }
            });
            
            // Prepare all layers for composition (resize to target dimensions)
            const compositeInputs = [];
            for (const layer of matchingLayers) {
              const layerBuffer = await sharp(layer.localPath)
                .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();
              
              compositeInputs.push({
                input: layerBuffer,
                blend: 'over' as const
              });
            }
            
            // Compose all layers on the transparent canvas
            await canvas
              .composite(compositeInputs)
              .png()
              .toFile(outputPath);
            
            
            const serverPath = `/assets/books/${bookId}/avatars/${tabId}/composed/${outputFileName}`;
            avatarMappings[scopedKey] = serverPath;
            mappedCount++;
          } catch (composeError) {
            console.error(`[avatar-template] Failed to compose:`, combo, composeError);
          }
        }
      }
      
      
      // Count characteristics coverage
      const charCoverage: Record<string, Set<string>> = {};
      for (const img of extractedImages) {
        for (const [key, value] of Object.entries(img.characteristics)) {
          if (key === 'hero') continue;
          if (!charCoverage[key]) charCoverage[key] = new Set();
          charCoverage[key].add(value);
        }
      }
      
      return res.json({
        avatarMappings,
        stats: {
          totalImages: extractedImages.length,
          mappedImages: mappedCount,
          skippedImages: extractedImages.length - mappedCount,
          characteristicsCoverage: Object.fromEntries(
            Object.entries(charCoverage).map(([k, v]) => [k, Array.from(v)])
          ),
          tabId,
          variantCount: optionVariants.length
        }
      });
    } catch (error: any) {
      console.error("[avatar-template] Error:", error);
      return res.status(500).json({ 
        error: "Failed to extract avatar template EPUB",
        details: error.message || String(error)
      });
    }
  });

  /**
   * Extract avatar template EPUB from uploaded file (base64)
   */
  app.post("/api/epubs/extract-avatar-template-file", async (req, res) => {
    try {
      const { epub, bookId, tabId } = req.body;

      if (!epub || !bookId || !tabId) {
        return res.status(400).json({ error: "Missing required fields: epub, bookId, tabId" });
      }


      // Decode base64 EPUB
      const epubBuffer = Buffer.from(epub, 'base64');

      // Extract images from EPUB
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(epubBuffer);
      
      // Create local directory for avatar images
      const fs = await import('fs');
      const path = await import('path');
      const avatarDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId, 'avatars', tabId, 'images');
      await fs.promises.mkdir(avatarDir, { recursive: true });
      
      // Store all extracted images with their characteristics
      const extractedImages: Array<{ fileName: string; localPath: string; characteristics: Record<string, string> }> = [];
      
      // Extract only images
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
          const fileName = relativePath.split('/').pop() || relativePath;
          const imageBuffer = await zipEntry.async('nodebuffer');
          const localPath = path.join(avatarDir, fileName);
          await fs.promises.writeFile(localPath, imageBuffer);
          
          // Parse filename for characteristics
          const parsedFilename = parseImageFilename(fileName);
          const characteristics = parsedFilename.characteristics;
          
          
          // Security check: verify hero matches tabId
          if (characteristics.hero) {
            const heroValue = characteristics.hero.toLowerCase();
            const tabIdLower = tabId.toLowerCase();
            
            if (heroValue !== tabIdLower) {
              continue;
            }
          }
          
          extractedImages.push({ fileName, localPath, characteristics });
        }
      }
      
      
      // Load the book to get the tab configuration
      const { storage } = await import('../../storage');
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      const wizardConfig = book.wizardConfig as any;
      if (!wizardConfig?.tabs) {
        return res.status(400).json({ error: "Book has no wizard configuration" });
      }
      
      const tab = wizardConfig.tabs.find((t: any) => t.id === tabId);
      if (!tab) {
        return res.status(404).json({ error: `Tab ${tabId} not found in wizard configuration` });
      }
      
      // Get option variants for this tab
      const optionVariants = tab.variants.filter((v: any) => v.type === 'options');
      
      // Group images by their characteristic sets to enable composition
      const imagesByCharSet: Record<string, Array<{ img: any; chars: string[] }>> = {};
      
      for (const img of extractedImages) {
        const charKeys = Object.keys(img.characteristics).filter(k => k !== 'hero').sort();
        const charSetKey = charKeys.join('_');
        
        if (!imagesByCharSet[charSetKey]) {
          imagesByCharSet[charSetKey] = [];
        }
        imagesByCharSet[charSetKey].push({ img, chars: charKeys });
      }
      
      
      // Find images with all variants (complete avatars) first
      const completeAvatars = extractedImages.filter(img => {
        for (const variant of optionVariants) {
          if (!img.characteristics[variant.id]) return false;
        }
        return true;
      });
      
      // Generate avatar mappings
      const avatarMappings: Record<string, string> = {};
      let mappedCount = 0;
      
      if (completeAvatars.length > 0) {
        // Use complete avatars directly (no composition needed)
        
        for (const img of completeAvatars) {
          const optionIds = optionVariants.map((v: any) => img.characteristics[v.id]);
          const scopedKey = `${tabId}:${optionIds.join('_')}`;
          const serverPath = `/assets/books/${bookId}/avatars/${tabId}/images/${img.fileName}`;
          avatarMappings[scopedKey] = serverPath;
          mappedCount++;
        }
      } else {
        // No complete avatars, need to compose from partial layers
        
        // Build index of available layers for each variant-option combination
        const layerIndex: Record<string, Array<{ img: any; missingVariants: string[] }>> = {};
        
        for (const img of extractedImages) {
          // For each variant this image HAS a value for, index it
          const hasVariants: string[] = [];
          const missingVariants: string[] = [];
          
          for (const variant of optionVariants) {
            if (img.characteristics[variant.id]) {
              hasVariants.push(variant.id);
            } else {
              missingVariants.push(variant.id);
            }
          }
          
          // Create a key from the characteristics this image HAS
          const partialKey = hasVariants.map(v => `${v}:${img.characteristics[v]}`).sort().join('_');
          
          if (!layerIndex[partialKey]) {
            layerIndex[partialKey] = [];
          }
          layerIndex[partialKey].push({ img, missingVariants });
        }
        
        
        // Generate all possible complete combinations by matching partial layers
        const variantValues: Record<string, Set<string>> = {};
        for (const img of extractedImages) {
          for (const variant of optionVariants) {
            const value = img.characteristics[variant.id];
            if (value) {
              if (!variantValues[variant.id]) variantValues[variant.id] = new Set();
              variantValues[variant.id].add(value);
            }
          }
        }
        
        // Generate cartesian product
        const generateCombos = (vIdx: number, current: Record<string, string>): Record<string, string>[] => {
          if (vIdx >= optionVariants.length) return [current];
          
          const variant = optionVariants[vIdx];
          const values = Array.from(variantValues[variant.id] || []);
          if (values.length === 0) return [];
          
          const results: Record<string, string>[] = [];
          for (const value of values) {
            results.push(...generateCombos(vIdx + 1, { ...current, [variant.id]: value }));
          }
          return results;
        };
        
        const allPossibleCombos = generateCombos(0, {});
        
        // For each combo, find matching layers and compose
        const composedDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId, 'avatars', tabId, 'composed');
        await fs.promises.mkdir(composedDir, { recursive: true });
        
        for (const combo of allPossibleCombos) {
          try {
            // Find all layers that match this combination (subset match)
            const matchingLayers: any[] = [];
            
            for (const img of extractedImages) {
              let matches = true;
              for (const [variantId, optionId] of Object.entries(combo)) {
                const imgValue = img.characteristics[variantId];
                if (imgValue && imgValue !== optionId) {
                  matches = false;
                  break;
                }
              }
              
              if (matches) {
                // This layer is compatible with this combination
                const coverage = Object.keys(img.characteristics).filter(k => k !== 'hero' && combo[k] === img.characteristics[k]);
                matchingLayers.push({ ...img, coverage: coverage.length });
              }
            }
            
            if (matchingLayers.length === 0) {
              continue;
            }
            
            // Sort by coverage (least complete first for proper layering - skin/base first, details on top)
            matchingLayers.sort((a, b) => a.coverage - b.coverage);
            
            const optionIds = optionVariants.map((v: any) => combo[v.id]);
            const scopedKey = `${tabId}:${optionIds.join('_')}`;
            const safeKey = scopedKey.replace(/:/g, '-');
            const outputFileName = `${safeKey}.png`;
            const outputPath = path.join(composedDir, outputFileName);
            
            // Get dimensions from first layer
            const sharp = (await import('sharp')).default;
            const baseImage = sharp(matchingLayers[0].localPath);
            const metadata = await baseImage.metadata();
            const targetWidth = metadata.width || 800;
            const targetHeight = metadata.height || 800;
            
            // Create a transparent canvas
            const canvas = await sharp({
              create: {
                width: targetWidth,
                height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              }
            });
            
            // Prepare all layers for composition (resize to target dimensions)
            const compositeInputs = [];
            for (const layer of matchingLayers) {
              const layerBuffer = await sharp(layer.localPath)
                .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();
              
              compositeInputs.push({
                input: layerBuffer,
                blend: 'over' as const
              });
            }
            
            // Compose all layers on the transparent canvas
            await canvas
              .composite(compositeInputs)
              .png()
              .toFile(outputPath);
            
            
            const serverPath = `/assets/books/${bookId}/avatars/${tabId}/composed/${outputFileName}`;
            avatarMappings[scopedKey] = serverPath;
            mappedCount++;
          } catch (composeError) {
            console.error(`[avatar-template-file] Failed to compose:`, combo, composeError);
          }
        }
      }
      
      
      // Count characteristics coverage
      const charCoverage: Record<string, Set<string>> = {};
      for (const img of extractedImages) {
        for (const [key, value] of Object.entries(img.characteristics)) {
          if (key === 'hero') continue;
          if (!charCoverage[key]) charCoverage[key] = new Set();
          charCoverage[key].add(value);
        }
      }
      
      return res.json({
        avatarMappings,
        stats: {
          totalImages: extractedImages.length,
          mappedImages: mappedCount,
          skippedImages: extractedImages.length - mappedCount,
          characteristicsCoverage: Object.fromEntries(
            Object.entries(charCoverage).map(([k, v]) => [k, Array.from(v)])
          ),
          tabId,
          variantCount: optionVariants.length
        }
      });
    } catch (error: any) {
      console.error("[avatar-template-file] Error:", error);
      return res.status(500).json({ 
        error: "Failed to extract avatar template EPUB from file",
        details: error.message || String(error)
      });
    }
  });

  /**
   * Check import files (IDML, EPUB, fonts) before actual import.
   * Accepts bucket paths instead of base64 data.
   */
  app.post("/api/books/check-import", async (req, res) => {
    try {
      const { idmlPath, epubPath, fonts } = req.body;
      
      const results: {
        idml?: { valid: boolean; stats?: any; fonts?: string[]; error?: string };
        epub?: { valid: boolean; pages?: number; error?: string };
        fonts?: Array<{ name: string; valid: boolean; obfuscated: boolean; error?: string; details?: string }>;
      } = {};
      
      // 1. Check IDML
      if (idmlPath) {
        try {
          const idmlBuffer = await downloadFromBucket(idmlPath);
          const idmlData = await parseIdmlBuffer(idmlBuffer);
          
          const detectedFonts = idmlData.fonts || [];
          
          results.idml = {
            valid: true,
            stats: {
              textFrames: idmlData.textFrames.length,
              characterStyles: Object.keys(idmlData.characterStyles).length,
              paragraphStyles: Object.keys(idmlData.paragraphStyles).length,
            },
            fonts: detectedFonts,
          };
        } catch (e: any) {
          results.idml = { valid: false, error: e.message };
          console.error('[check-import] IDML error:', e.message);
        }
      }
      
      // 2. Check EPUB
      if (epubPath) {
        try {
          const epubBuffer = await downloadFromBucket(epubPath);
          const zip = await JSZip.loadAsync(epubBuffer);
          const htmlFiles = Object.keys(zip.files).filter(f => /\.(xhtml|html)$/i.test(f));
          results.epub = { valid: true, pages: htmlFiles.length };
        } catch (e: any) {
          results.epub = { valid: false, error: e.message };
          console.error('[check-import] EPUB error:', e.message);
        }
      }
      
      // 3. Check fonts for obfuscation
      if (fonts && Array.isArray(fonts) && fonts.length > 0) {
        results.fonts = [];
        
        for (const font of fonts) {
          const fontResult: { name: string; valid: boolean; obfuscated: boolean; error?: string; details?: string } = {
            name: font.name,
            valid: false,
            obfuscated: false,
          };
          
          try {
            const fontBuffer = await downloadFromBucket(font.objectPath);
            const ext = font.name.split('.').pop()?.toLowerCase() || 'ttf';
            
            const magic = fontBuffer.slice(0, 4);
            const magicHex = magic.toString('hex').toUpperCase();
            const magicStr = magic.toString('ascii');
            
            const validMagics: Record<string, string[]> = {
              ttf: ['00010000', '74727565'],
              otf: ['4F54544F'],
              woff: ['774F4646'],
              woff2: ['774F4632'],
            };
            
            const expectedMagics = validMagics[ext] || validMagics.ttf;
            const isValidMagic = expectedMagics.some(m => magicHex.startsWith(m));
            
            if (isValidMagic) {
              fontResult.valid = true;
              fontResult.obfuscated = false;
              fontResult.details = `Format valide (${magicHex})`;
            } else {
              fontResult.valid = false;
              fontResult.obfuscated = true;
              fontResult.details = `Format invalide: ${magicHex} (${magicStr}). La police semble obfusquée par Adobe InDesign.`;
              fontResult.error = 'Police obfusquée - utilisez le fichier TTF/OTF original';
            }
          } catch (e: any) {
            fontResult.valid = false;
            fontResult.error = e.message;
          }
          
          results.fonts.push(fontResult);
        }
      }
      
      return res.json({ success: true, results });
    } catch (error: any) {
      console.error('[check-import] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Test IDML parsing only (diagnostic endpoint) - DEPRECATED, use check-import
   */
  app.post("/api/books/test-idml", async (req, res) => {
    try {
      const { idml, debug } = req.body;
      
      if (!idml) {
        return res.status(400).json({ error: "Missing idml field (base64)" });
      }
      
      const idmlBuffer = Buffer.from(idml, 'base64');
      
      // Debug mode: return raw XML from first Spread to see TextFrame structure
      if (debug) {
        const zip = await JSZip.loadAsync(idmlBuffer);
        const spreadFiles = Object.keys(zip.files).filter(f => f.match(/^Spreads\/Spread_.*\.xml$/i));
        
        if (spreadFiles.length > 0) {
          const firstSpread = spreadFiles[0];
          const spreadFile = zip.file(firstSpread);
          if (spreadFile) {
            const spreadXml = await spreadFile.async('string');
            
            // Also parse it to show the structure
            const { XMLParser } = await import('fast-xml-parser');
            const parser = new XMLParser({
              ignoreAttributes: false,
              attributeNamePrefix: '@_',
              textNodeName: '#text',
              parseAttributeValue: false,
              trimValues: true,
              removeNSPrefix: true,
            });
            const parsed = parser.parse(spreadXml);
            
            // Extract TextFrames specifically
            const spread = parsed?.Spread?.Spread;
            const page = spread?.Page;
            const textFrames = page?.TextFrame;
            
            return res.json({
              success: true,
              debug: true,
              spreadFile: firstSpread,
              rawXml: spreadXml, // Full XML
              parsed: parsed,
              parsedKeys: Object.keys(parsed),
              spreadKeys: spread ? Object.keys(spread) : [],
              pageKeys: page ? Object.keys(page) : [],
              textFrames: textFrames,
              textFrameCount: textFrames ? (Array.isArray(textFrames) ? textFrames.length : 1) : 0
            });
          }
        }
        
        return res.json({ error: "No spread files found" });
      }
      
      const idmlData = await parseIdmlBuffer(idmlBuffer);

      // Detect fonts (names exactly as present in IDML-derived structures)
      const normalizeFont = (v: unknown): string | null => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        return s ? s : null;
      };

      const resolveStyleId = (
        map: Record<string, any>,
        styleId: string | undefined,
        prefix: "CharacterStyle/" | "ParagraphStyle/"
      ): string | undefined => {
        if (!styleId) return undefined;
        if (map[styleId]) return styleId;
        if (styleId.startsWith(prefix)) {
          const noPrefix = styleId.replace(prefix, "");
          if (map[noPrefix]) return noPrefix;
        } else {
          const withPrefix = `${prefix}${styleId}`;
          if (map[withPrefix]) return withPrefix;
        }
        return undefined;
      };

      const fontsCharacterStyles = new Set<string>();
      for (const style of Object.values(idmlData.characterStyles || {})) {
        const f = normalizeFont((style as any)?.fontFamily);
        if (f) fontsCharacterStyles.add(f);
      }

      const fontsParagraphStyles = new Set<string>();
      for (const style of Object.values(idmlData.paragraphStyles || {})) {
        const f = normalizeFont((style as any)?.fontFamily);
        if (f) fontsParagraphStyles.add(f);
      }

      const fontsInline = new Set<string>();
      const usedByTextFramesCounts: Record<string, number> = {};
      const usedByTextFrames = new Set<string>();
      const resolutionSample = (idmlData.textFrames || []).slice(0, 10).map((tf: any) => {
        const inlineFont = normalizeFont(tf?.inlineCharProperties?.fontFamily);
        if (inlineFont) fontsInline.add(inlineFont);

        const resolvedCharId = resolveStyleId(idmlData.characterStyles || {}, tf?.appliedCharacterStyle, "CharacterStyle/");
        const resolvedParaId = resolveStyleId(idmlData.paragraphStyles || {}, tf?.appliedParagraphStyle, "ParagraphStyle/");

        const charFont = normalizeFont(resolvedCharId ? idmlData.characterStyles?.[resolvedCharId]?.fontFamily : undefined);
        const paraFont = normalizeFont(resolvedParaId ? idmlData.paragraphStyles?.[resolvedParaId]?.fontFamily : undefined);

        const resolvedFont = inlineFont || charFont || paraFont;
        if (resolvedFont) {
          usedByTextFrames.add(resolvedFont);
          usedByTextFramesCounts[resolvedFont] = (usedByTextFramesCounts[resolvedFont] || 0) + 1;
        }

        return {
          id: tf?.id,
          contentPreview: (tf?.content || "").substring(0, 60),
          appliedCharacterStyle: tf?.appliedCharacterStyle,
          appliedParagraphStyle: tf?.appliedParagraphStyle,
          inlineFontFamily: inlineFont || undefined,
          resolvedCharStyleId: resolvedCharId,
          resolvedParaStyleId: resolvedParaId,
          resolvedFontFamily: resolvedFont || undefined
        };
      });

      // Count all frames (not just sample) for usedByTextFramesCounts
      for (const tf of idmlData.textFrames || []) {
        const inlineFont = normalizeFont(tf?.inlineCharProperties?.fontFamily);
        const resolvedCharId = resolveStyleId(idmlData.characterStyles || {}, tf?.appliedCharacterStyle, "CharacterStyle/");
        const resolvedParaId = resolveStyleId(idmlData.paragraphStyles || {}, tf?.appliedParagraphStyle, "ParagraphStyle/");
        const charFont = normalizeFont(resolvedCharId ? idmlData.characterStyles?.[resolvedCharId]?.fontFamily : undefined);
        const paraFont = normalizeFont(resolvedParaId ? idmlData.paragraphStyles?.[resolvedParaId]?.fontFamily : undefined);
        const resolvedFont = inlineFont || charFont || paraFont;
        if (resolvedFont) {
          usedByTextFrames.add(resolvedFont);
          usedByTextFramesCounts[resolvedFont] = (usedByTextFramesCounts[resolvedFont] || 0) + 1;
        }
      }

      const detectedFonts = Array.from(
        new Set([
          ...Array.from(fontsCharacterStyles),
          ...Array.from(fontsParagraphStyles),
          ...Array.from(fontsInline),
        ])
      ).sort((a, b) => a.localeCompare(b));
      
      return res.json({
        success: true,
        stats: {
          textFrames: idmlData.textFrames.length,
          characterStyles: Object.keys(idmlData.characterStyles).length,
          paragraphStyles: Object.keys(idmlData.paragraphStyles).length,
          colors: Object.keys(idmlData.colors).length,
          pages: Object.keys(idmlData.pageDimensions).length
        },
        textFrames: idmlData.textFrames,
        characterStyles: idmlData.characterStyles,
        paragraphStyles: idmlData.paragraphStyles,
        fonts: {
          detected: detectedFonts,
          bySource: {
            characterStyles: Array.from(fontsCharacterStyles).sort((a, b) => a.localeCompare(b)),
            paragraphStyles: Array.from(fontsParagraphStyles).sort((a, b) => a.localeCompare(b)),
            inline: Array.from(fontsInline).sort((a, b) => a.localeCompare(b)),
          },
          usedByTextFrames: Array.from(usedByTextFrames).sort((a, b) => a.localeCompare(b)),
          usedByTextFramesCounts,
          resolutionSample
        }
      });
    } catch (error: any) {
      console.error('[test-idml] Error:', error);
      return res.status(500).json({ 
        error: "Failed to parse IDML: " + error.message,
        stack: error.stack
      });
    }
  });

  /**
   * Import storyboard from EPUB + IDML
   * 
   * ARCHITECTURE :
   * - EPUB : fournit uniquement les images et les positions (x, y, width, height) des zones de texte
   * - IDML : fournit le contenu textuel, les polices (fontFamily) et TOUS les styles de mise en forme
   * 
   * ⚠️ IMPORTANT : L'EPUB ne contient aucune information sur le texte ni les polices.
   * Les polices doivent OBLIGATOIREMENT être définies dans l'IDML.
   * Il n'y a AUCUN fallback CSS - si la police n'est pas dans l'IDML, c'est une erreur.
   * 
   * Request body (JSON):
   * {
   *   "epubPath": "/objects/bucket/path/to/file.epub",  // Bucket path
   *   "idmlPath": "/objects/bucket/path/to/file.idml",  // Bucket path
   *   "bookId": "unique_book_id",
   *   "fonts": [                                         // Optionnel
   *     { "name": "font.ttf", "objectPath": "/objects/bucket/...", "fontFamily": "..." }
   *   ]
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "bookId": "...",
   *   "contentConfig": { 
   *     pages,           // Dimensions depuis EPUB
   *     texts,           // Position (EPUB) + contenu/styles (IDML)
   *     imageElements    // Images depuis EPUB
   *   },
   *   "stats": {
   *     "pages": 10,
   *     "texts": 25,     // Zones de texte avec position + contenu + styles
   *     "images": 50
   *   }
   * }
   */
  app.post("/api/books/import-storyboard", async (req, res) => {
    try {
      const { epubPath, idmlPath, bookId, fonts } = req.body;

      if (!epubPath || !idmlPath || !bookId) {
        return res.status(400).json({ 
          error: "Missing required fields: epubPath, idmlPath, bookId" 
        });
      }

      // 1. Download & extract EPUB from bucket
      const epubBuffer = await downloadFromBucket(epubPath);
      const epubResult = await extractEpubFromBuffer(epubBuffer, bookId);

      if (!epubResult.success) {
        console.error(`[import-storyboard] EPUB extraction failed`);
        return res.status(500).json({ error: "Failed to extract EPUB" });
      }

      // 1.5. Process fonts already uploaded to bucket
      const uploadedFonts: Record<string, { url: string; fontFamily?: string; fontWeight?: string; fontStyle?: string }> = {};
      
      if (fonts && Array.isArray(fonts) && fonts.length > 0) {
        for (const font of fonts) {
          try {
            const fontBuffer = await downloadFromBucket(font.objectPath);
            const ext = font.name.split('.').pop()?.toLowerCase() || 'ttf';
            
            // Check if font is valid (not obfuscated)
            const magic = fontBuffer.slice(0, 4).toString('hex').toUpperCase();
            const validMagics: Record<string, string[]> = {
              ttf: ['00010000', '74727565'],
              otf: ['4F54544F'],
              woff: ['774F4646'],
              woff2: ['774F4632'],
            };
            const expectedMagics = validMagics[ext] || validMagics.ttf;
            const isValidFont = expectedMagics.some(m => magic.startsWith(m));
            
            if (!isValidFont) {
              continue;
            }
            
            const parsed = parseFontFileName(font.name);
            const fontFamilyName = font.fontFamily || parsed.fontFamily;
            
            // Font is already in bucket — copy to the book's font directory in object storage
            const publicPaths = objectStorageService.getPublicObjectSearchPaths();
            let fontSaved = false;

            if (publicPaths.length > 0) {
              try {
                const publicPath = publicPaths[0];
                const { bucketName, objectName: basePath } = parseObjectPathSimple(publicPath);
                const bucket = objectStorageClient.bucket(bucketName);
                
                const fontId = randomUUID().substring(0, 8);
                const storageName = `${bookId}_${fontId}_${font.name}`;
                const objectName = basePath ? `${basePath}/fonts/${storageName}` : `fonts/${storageName}`;
                
                const file = bucket.file(objectName);
                const contentType = getFontContentType(ext);
                
                await file.save(fontBuffer, {
                  contentType,
                  metadata: { cacheControl: 'public, max-age=31536000' },
                });
                
                const objectPathFinal = `/objects/${bucketName}/${objectName}`;
                uploadedFonts[font.name] = {
                  url: objectPathFinal,
                  fontFamily: fontFamilyName,
                  fontWeight: parsed.fontWeight,
                  fontStyle: parsed.fontStyle
                };
                fontSaved = true;
              } catch (uploadError) {
                console.warn('[import-storyboard] Object storage copy failed, using local fallback:', font.name);
              }
            }
            
            if (!fontSaved) {
              const bookFontDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId, 'font');
              await fs.promises.mkdir(bookFontDir, { recursive: true });
              
              const localFontPath = path.join(bookFontDir, font.name);
              await fs.promises.writeFile(localFontPath, fontBuffer);
              
              const fontUrl = `../font/${font.name}`;
              uploadedFonts[font.name] = {
                url: fontUrl,
                fontFamily: fontFamilyName,
                fontWeight: parsed.fontWeight,
                fontStyle: parsed.fontStyle
              };
            }
            
          } catch (fontError) {
            console.error(`[import-storyboard] Failed to process font ${font.name}:`, fontError);
          }
        }
      }

      // 2. Download & parse IDML from bucket
      const idmlBuffer = await downloadFromBucket(idmlPath);
      const idmlData = await parseIdmlBuffer(idmlBuffer);

      
      if (epubResult.textPositions.length === 0) {
        console.error(`[import-storyboard] ⚠️ WARNING: No text positions found in EPUB!`);
      }
      
      if (idmlData.textFrames.length === 0) {
        console.error(`[import-storyboard] ⚠️ WARNING: No text frames found in IDML!`);
      }

      // 3. Merge EPUB positions with IDML texts/fonts/styles
      const mergedTexts = mergeEpubWithIdml(
        epubResult.textPositions,       // Positions from EPUB
        idmlData,                        // Texts + fonts + styles from IDML
        bookId
      );
      
      // 4. Clean CSS: Remove ALL font declarations (fonts are managed via .ttf files)
      let finalCssContent = epubResult.cssContent || '';
      
      // Remove ALL font-related declarations from EPUB CSS
      // Fonts are loaded from book/{bookId}/font/ directory at render time
      finalCssContent = finalCssContent
        .replace(/@font-face\s*\{[^}]+\}/gi, '') // Remove all @font-face declarations
        .replace(/font-family\s*:[^;]+;/gi, '') // Remove font-family
        .replace(/font-size\s*:[^;]+;/gi, '') // Remove font-size
        .replace(/font-weight\s*:[^;]+;/gi, '') // Remove font-weight
        .replace(/font-style\s*:[^;]+;/gi, '') // Remove font-style
        .replace(/color\s*:[^;]+;/gi, ''); // Remove color
      
      if (mergedTexts.length === 0 && epubResult.textPositions.length > 0 && idmlData.textFrames.length > 0) {
        console.error(`[import-storyboard] ⚠️ ERROR: Merge produced 0 texts but inputs were non-empty!`);
        console.error(`[import-storyboard]   This should not happen. Check merge logic.`);
      }
      
      // Note: We no longer inject @font-face declarations in CSS
      // Fonts are loaded directly from book/{bookId}/font/ at render time

      // 5. Re-detect font issues after injecting uploaded fonts
      const fontWarnings = detectFontIssues(finalCssContent, {});
      
      // 6. Build complete ContentConfiguration
      const contentConfig = {
        pages: epubResult.pages,
        texts: mergedTexts,
        images: [], // Legacy format, not used with imageElements
        imageElements: epubResult.imageElements,
        cssContent: finalCssContent,
        pageImages: [] // Legacy format
      };

      // Save contentConfig to disk for render-pages endpoint
      const bookDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId);
      const contentJsonPath = path.join(bookDir, 'content.json');
      await fs.promises.writeFile(
        contentJsonPath,
        JSON.stringify(contentConfig, null, 2),
        'utf-8'
      );

      // Add debug info to response
      const debugInfo = {
        epubTextPositionsCount: epubResult.textPositions.length,
        idmlTextFramesCount: idmlData.textFrames.length,
        mergedTextsCount: mergedTexts.length,
        conditionalTextFrames: idmlData.textFrames.filter((tf: any) => 
          tf.conditionalSegments && tf.conditionalSegments.length > 0
        ).length,
        epubTextPositionsSample: epubResult.textPositions.slice(0, 3).map(tp => ({
          containerId: tp.containerId,
          pageIndex: tp.pageIndex,
          y: tp.position.y
        })),
        idmlTextFramesSample: idmlData.textFrames.slice(0, 3).map(tf => ({
          id: tf.id,
          pageIndex: tf.pageIndex,
          contentPreview: tf.content.substring(0, 50)
        })),
        mergedTextsSample: mergedTexts.slice(0, 3).map(mt => ({
          id: mt.id,
          type: mt.type,
          content: mt.content,
          contentPreview: mt.content?.substring(0, 50) || '',
          pageIndex: mt.position?.pageIndex,
          style: mt.style,
          appliedParagraphStyle: mt.appliedParagraphStyle,
          appliedCharacterStyle: mt.appliedCharacterStyle,
          idmlFrameId: mt.idmlFrameId
        })),
        availableParagraphStyles: Object.keys(idmlData.paragraphStyles),
        paragraphStylesDetails: idmlData.paragraphStyles
      };

      return res.json({
        success: true,
        bookId,
        contentConfig,
        wizardConfig: epubResult.generatedWizardTabs || [],
        fontWarnings: fontWarnings,
        uploadedFonts,
        detectedFonts: idmlData.fonts || [],
        stats: {
          pages: epubResult.pages.length,
          texts: mergedTexts.length,
          images: epubResult.imageElements.length,
          uploadedCustomFonts: Object.keys(uploadedFonts).length,
          detectedFonts: (idmlData.fonts || []).length,
          conditionalTextFrames: idmlData.textFrames.filter((tf: any) => 
            tf.conditionalSegments && tf.conditionalSegments.length > 0
          ).length
        },
        debug: debugInfo
      });

    } catch (error: any) {
      console.error("[import-storyboard] Error:", error);
      return res.status(500).json({ 
        error: "Failed to import storyboard: " + error.message 
      });
    }
  });
}

// Fonctions utilitaires déplacées vers utils/contentTypeHelpers.ts

