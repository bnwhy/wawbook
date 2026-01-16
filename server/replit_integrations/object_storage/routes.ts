import type { Express, Request } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import { parseIdmlBuffer } from "./idmlParser";
import { extractEpubFromBuffer } from "./epubExtractor";
import { mergeEpubWithIdml } from "./idmlMerger";
import { cleanCssSyntax, detectFontIssues } from "./utils/cssHelpers";
import { parseImageFilename } from "./utils/filenameParser";
import { buildWizardConfigFromCharacteristics } from "./wizardConfigBuilder";
import { 
  getContentTypeFromExt, 
  getFontContentType, 
  getExtensionFromContentType,
  parseObjectPathSimple 
} from "./utils/contentTypeHelpers";

// Fonctions utilitaires déplacées vers utils/cssHelpers.ts, utils/filenameParser.ts, etc.

// Fonction parseImageFilename déplacée vers utils/filenameParser.ts

// Fonction buildWizardConfigFromCharacteristics déplacée vers wizardConfigBuilder.ts

// Fonction detectFontIssues déplacée vers utils/cssHelpers.ts

// Fonctions mergeEpubWithIdml et extractEpubFromBuffer déplacées vers des modules séparés
// (idmlMerger.ts et epubExtractor.ts respectivement)

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

      // Construct base URL for Puppeteer to access images
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      console.log(`[extract-zip] Using base URL: ${baseUrl}`);

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
        // Clean CSS syntax errors (e.g., "src : url" -> "src: url")
        let updatedCss = cleanCssSyntax(css);
        
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
      
      // Combine all updated CSS content (with font URLs updated)
      const allCss = Object.values(allCssUpdated).join('\n');
      
      res.json({
        images: imageMap,
        fonts: fontMap,
        fontWarnings,
        htmlFiles,
        htmlContent,
        cssContent: allCssUpdated,
        sessionId,
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
      // Extract the object path from /objects/<path>
      const objectPath = req.path.replace(/^\/objects\//, '');
      const parts = objectPath.split('/');
      
      // PRIORITY 1: Check if first part looks like a bucket name (replit-objstore-*)
      // If bucket is explicitly specified, ONLY use that bucket - no fallback
      if (parts.length >= 2 && parts[0].startsWith('replit-objstore-')) {
        const bucketName = parts[0];
        const fileName = parts.slice(1).join('/');
        console.log(`[objects] Direct bucket access: ${bucketName}/${fileName}`);
        try {
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(fileName);
          const [exists] = await file.exists();
          if (exists) {
            await objectStorageService.downloadObject(file, res);
            return;
          } else {
            console.log(`[objects] File not found in bucket ${bucketName}: ${fileName}`);
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
      console.error("Error serving object:", error);
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
      console.log(`[upload-epub] Uploaded EPUB to ${objectPath}`);

      res.json({
        objectPath,
        filename,
        size: buffer.length,
      });
    } catch (error) {
      console.error("Error uploading EPUB:", error);
      res.status(500).json({ error: "Failed to upload EPUB" });
    }
  });

  /**
   * List all EPUB files from all known buckets
   */
  app.get("/api/epubs", async (req, res) => {
    try {
      const allEpubs: Array<{name: string, path: string, size?: number, updated?: string}> = [];
      
      // List of buckets to search (default bucket + any configured private dir bucket)
      const bucketsToSearch = new Set<string>();
      
      // Add default bucket
      const defaultBucket = 'replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2';
      bucketsToSearch.add(defaultBucket);
      
      // Also check the configured private dir bucket if different
      try {
        const privateDir = objectStorageService.getPrivateObjectDir();
        const { bucketName } = parseObjectPathSimple(privateDir);
        bucketsToSearch.add(bucketName);
      } catch (e) {
        // Ignore if PRIVATE_OBJECT_DIR is not set
      }
      
      console.log(`[list-epubs] Searching in buckets:`, Array.from(bucketsToSearch));
      
      for (const bucketName of Array.from(bucketsToSearch)) {
        try {
          const bucket = objectStorageClient.bucket(bucketName);
          
          // Search entire bucket for EPUB files
          const [files] = await bucket.getFiles();
          console.log(`[list-epubs] Bucket ${bucketName}: found ${files.length} total files`);
          
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
          console.warn(`[list-epubs] Could not access bucket ${bucketName}:`, bucketError);
        }
      }

      console.log(`[list-epubs] Found ${allEpubs.length} EPUB files total:`, allEpubs.map(e => e.name));
      res.json({ epubs: allEpubs });
    } catch (error) {
      console.error("Error listing EPUBs:", error);
      res.status(500).json({ error: "Failed to list EPUBs" });
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

      console.log(`[epub-extract] Attempting to extract from bucket: ${epubPath}`);

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
      console.log(`[epub-extract] Downloaded EPUB (${epubBuffer.length} bytes)`);

      // Use shared extraction logic
      const result = await extractEpubFromBuffer(epubBuffer, bookId);
      
      // Match image characteristics to existing wizard configuration
      if (result.imageElements && result.imageElements.length > 0) {
        // Load existing book to get its wizardConfig
        const { storage } = await import('../../storage');
        const existingBook = await storage.getBook(bookId);
        const wizardConfig = existingBook?.wizardConfig as any;
        
        if (wizardConfig?.tabs && wizardConfig.tabs.length > 0) {
          console.log(`[epub-extract] Matching images to existing wizard with ${wizardConfig.tabs.length} tabs`);
          
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
          
          console.log(`[epub-extract] Created wizardLookup['hero'] with ${Object.keys(wizardLookup['hero']).length} entries from character tabs`);
          
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
              console.log(`[epub-extract] Mappé hero="${heroValue}" vers onglet id="${matchingTab.id}"`);
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
            console.log(`[epub-extract] Unmapped hero values found: ${unmappedHeroValues.join(', ')}. Using fallback logic...`);
              console.log(`[epub-extract] 'hero' not found directly, searching in character tabs...`);
              
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
                        console.log(`[epub-extract] Found hero-like options in tab '${tab.id}', variant '${variant.id}'`);
                        
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
                console.warn(`[epub-extract] Could not find any character tab with hero-like options`);
              }
          }
          
          console.log(`[epub-extract] Wizard lookup keys:`, Object.keys(wizardLookup));
          if (wizardLookup['hero']) {
            console.log(`[epub-extract] 'hero' mapped to tab/variant with ${Object.keys(wizardLookup['hero']).length} options`);
          }
          
          // Match each image's characteristics to wizard options
          let matchedCount = 0;
          const unmappedCharacteristics: Record<string, Set<string>> = {};
          
          for (const img of result.imageElements) {
            if (img.characteristics && Object.keys(img.characteristics).length > 0) {
              const conditions: Array<{ variantId: string; optionId: string }> = [];
              // IMPORTANT: originalCharacteristics must come ONLY from the filename, not from anywhere else
              const originalCharacteristics = { ...img.characteristics };
              console.log(`[epub-extract] ===== Processing image ${img.id || img.label} =====`);
              console.log(`[epub-extract] Image URL: ${img.url}`);
              console.log(`[epub-extract] Original characteristics from filename (img.characteristics):`, originalCharacteristics);
              
              for (const [charKey, charValue] of Object.entries(img.characteristics)) {
                // Skip 'hero' - it's just a marker for which character, not a condition
                if (charKey === 'hero') {
                  console.log(`[epub-extract] Skipping hero characteristic "${charValue}" - it's just a marker, not creating condition`);
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
                  console.log(`[epub-extract] Matched ${charKey}:${charValue} -> tab:${match.tabId}/variant:${match.variantId}/option:${match.optionId} (${match.optionLabel})`);
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
                    console.log(`[epub-extract] Matched ${charKey}:${charValue} (normalized) -> tab:${match.tabId}/variant:${match.variantId}/option:${match.optionId} (${match.optionLabel})`);
                  } else {
                    // Track unmapped characteristics
                    if (!unmappedCharacteristics[charKey]) {
                      unmappedCharacteristics[charKey] = new Set<string>();
                    }
                    unmappedCharacteristics[charKey].add(charValue as string);
                    console.warn(`[epub-extract] Unmapped characteristic: ${charKey}:${charValue} (no matching option in wizard)`);
                  }
                } else {
                  // No lookup exists for this characteristic key
                  if (!unmappedCharacteristics[charKey]) {
                    unmappedCharacteristics[charKey] = new Set<string>();
                  }
                  unmappedCharacteristics[charKey].add(charValue as string);
                  console.warn(`[epub-extract] Unmapped characteristic: ${charKey}:${charValue} (no lookup found for this key)`);
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
                console.log(`[epub-extract] ===== Result for image ${img.id} =====`);
                console.log(`[epub-extract] Final combinationKey: ${img.combinationKey}`);
                console.log(`[epub-extract] Original characteristics keys: ${Object.keys(originalCharacteristics).join(', ')}`);
                console.log(`[epub-extract] Key parts generated: ${keyPartsFromOriginal.join(', ')}`);
                console.log(`[epub-extract] Total conditions created: ${conditions.length}`);
                console.log(`[epub-extract] Conditions:`, conditions);
                
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
                  console.log(`[epub-extract] ✓ Verification passed: combinationKey only contains original characteristics`);
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
                console.warn(`[epub-extract] Image ${img.id}: No conditions matched, using combinationKey=${img.combinationKey}`);
              }
            }
          }
          
          // Convert unmapped characteristics to plain object for response
          const unmappedSummary = Object.fromEntries(
            Object.entries(unmappedCharacteristics).map(([key, values]) => [key, Array.from(values)])
          );
          
          if (Object.keys(unmappedSummary).length > 0) {
            console.warn(`[epub-extract] Unmapped characteristics found:`, unmappedSummary);
            // Note: unmappedCharacteristics is for debugging only, not returned in result
          }
          
          console.log(`[epub-extract] Matched ${matchedCount}/${result.imageElements.length} images to wizard`);
          
          // Log final combinationKeys for verification
          console.log(`[epub-extract] ===== Final imageElements combinationKeys =====`);
          result.imageElements.forEach((img: any, idx: number) => {
            if (img.combinationKey && img.combinationKey !== 'default') {
              console.log(`[epub-extract] Image ${idx + 1} (${img.id}): combinationKey="${img.combinationKey}", characteristics:`, img.characteristics);
            }
          });
        } else {
          console.log(`[epub-extract] No wizard config found, skipping image matching`);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error("[epub-extract] Error:", error);
      res.status(500).json({ error: "Failed to extract EPUB from bucket. Try direct file upload instead." });
    }
  });

  /**
   * Test IDML parsing only (diagnostic endpoint)
   */
  app.post("/api/books/test-idml", async (req, res) => {
    try {
      const { idml, debug } = req.body;
      
      if (!idml) {
        return res.status(400).json({ error: "Missing idml field (base64)" });
      }
      
      console.log('[test-idml] Parsing IDML...');
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
      
      res.json({
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
        paragraphStyles: idmlData.paragraphStyles
      });
    } catch (error: any) {
      console.error('[test-idml] Error:', error);
      res.status(500).json({ 
        error: "Failed to parse IDML: " + error.message,
        stack: error.stack
      });
    }
  });

  /**
   * Import storyboard from EPUB (positions/images) + IDML (texts/styles)
   * 
   * Request body (JSON):
   * {
   *   "epub": "base64_encoded_epub_file",
   *   "idml": "base64_encoded_idml_file",
   *   "bookId": "unique_book_id"
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "bookId": "...",
   *   "contentConfig": { pages, texts, images, imageElements }
   * }
   */
  app.post("/api/books/import-storyboard", async (req, res) => {
    try {
      const { epub, idml, bookId } = req.body;

      if (!epub || !idml || !bookId) {
        return res.status(400).json({ 
          error: "Missing required fields: epub (base64), idml (base64), bookId" 
        });
      }

      console.log(`[import-storyboard] ========================================`);
      console.log(`[import-storyboard] Starting import for book ${bookId}`);
      console.log(`[import-storyboard] EPUB size: ${Buffer.from(epub, 'base64').length} bytes`);
      console.log(`[import-storyboard] IDML size: ${Buffer.from(idml, 'base64').length} bytes`);
      console.log(`[import-storyboard] ========================================`);

      // 1. Extract EPUB (images + text positions)
      console.log(`[import-storyboard] Step 1: Extracting EPUB...`);
      const epubBuffer = Buffer.from(epub, 'base64');
      const epubResult = await extractEpubFromBuffer(epubBuffer, bookId);

      if (!epubResult.success) {
        console.error(`[import-storyboard] EPUB extraction failed`);
        return res.status(500).json({ error: "Failed to extract EPUB" });
      }

      console.log(`[import-storyboard] ✓ EPUB extracted successfully`);
      console.log(`[import-storyboard]   - Text positions: ${epubResult.textPositions.length}`);
      console.log(`[import-storyboard]   - Images: ${epubResult.imageElements.length}`);
      console.log(`[import-storyboard]   - Pages: ${epubResult.pages.length}`);

      // 2. Parse IDML (texts + styles)
      console.log(`[import-storyboard] Step 2: Parsing IDML...`);
      const idmlBuffer = Buffer.from(idml, 'base64');
      const idmlData = await parseIdmlBuffer(idmlBuffer);

      console.log(`[import-storyboard] ✓ IDML parsed successfully`);
      console.log(`[import-storyboard]   - Text frames: ${idmlData.textFrames.length}`);
      console.log(`[import-storyboard]   - Character styles: ${Object.keys(idmlData.characterStyles).length}`);
      console.log(`[import-storyboard]   - Paragraph styles: ${Object.keys(idmlData.paragraphStyles).length}`);
      
      if (epubResult.textPositions.length === 0) {
        console.error(`[import-storyboard] ⚠️ WARNING: No text positions found in EPUB!`);
      }
      
      if (idmlData.textFrames.length === 0) {
        console.error(`[import-storyboard] ⚠️ WARNING: No text frames found in IDML!`);
      }

      // 3. Merge EPUB positions with IDML texts/styles
      console.log(`[import-storyboard] Step 3: Merging EPUB + IDML...`);
      const mergedTexts = mergeEpubWithIdml(
        epubResult.textPositions,
        idmlData,
        bookId
      );

      console.log(`[import-storyboard] ✓ Merge completed: ${mergedTexts.length} texts created`);
      
      if (mergedTexts.length === 0 && epubResult.textPositions.length > 0 && idmlData.textFrames.length > 0) {
        console.error(`[import-storyboard] ⚠️ ERROR: Merge produced 0 texts but inputs were non-empty!`);
        console.error(`[import-storyboard]   This should not happen. Check merge logic.`);
      }

      // 4. Build complete ContentConfiguration
      const contentConfig = {
        pages: epubResult.pages,
        texts: mergedTexts,
        images: [], // Legacy format, not used with imageElements
        imageElements: epubResult.imageElements,
        cssContent: epubResult.cssContent,
        pageImages: [] // Legacy format
      };

      // Add debug info to response
      const debugInfo = {
        epubTextPositionsCount: epubResult.textPositions.length,
        idmlTextFramesCount: idmlData.textFrames.length,
        mergedTextsCount: mergedTexts.length,
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

      res.json({
        success: true,
        bookId,
        contentConfig,
        wizardConfig: epubResult.generatedWizardTabs,
        fontWarnings: epubResult.fontWarnings,
        stats: {
          pages: epubResult.pages.length,
          texts: mergedTexts.length,
          images: epubResult.imageElements.length,
          fonts: Object.keys(epubResult.fonts).length
        },
        debug: debugInfo
      });

    } catch (error: any) {
      console.error("[import-storyboard] Error:", error);
      res.status(500).json({ 
        error: "Failed to import storyboard: " + error.message 
      });
    }
  });
}

// Fonctions utilitaires déplacées vers utils/contentTypeHelpers.ts

