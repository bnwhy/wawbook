import type { Express } from "express";
import express from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertCustomerSchema, insertShippingZoneSchema, insertPrinterSchema, insertMenuSchema, type ImageElement } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./services/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import * as path from "path";
import * as fs from "fs";
import { extractFontsFromCss } from "./utils/fontExtractor";
import { logger } from "./utils/logger";
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve local book assets (images, fonts)
  const assetsPath = path.join(process.cwd(), 'server', 'assets');
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    immutable: true,
  }));
  logger.info({ assetsPath }, 'Serving local assets');

  // ===== BOOKS =====
  app.get("/api/books", async (_req, res) => {
    try {
      const books = await storage.getAllBooks();
      return res.json(books);
    } catch (error) {
      logger.error({ error }, "Error getting books");
      return res.status(500).json({ error: "Failed to get books" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      return res.json(book);
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error getting book");
      return res.status(500).json({ error: "Failed to get book" });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const body = {
        ...req.body,
        price: req.body.price != null ? String(req.body.price) : null,
        oldPrice: req.body.oldPrice != null ? String(req.body.oldPrice) : null,
      };
      const validationResult = insertBookSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const book = await storage.createBook(validationResult.data);
      return res.status(201).json(book);
    } catch (error) {
      logger.error({ error }, "Error creating book");
      return res.status(500).json({ error: "Failed to create book" });
    }
  });

  app.patch("/api/books/:id", async (req, res) => {
    try {
      const { createdAt, ...rest } = req.body;
      const body = {
        ...rest,
        price: rest.price != null ? String(rest.price) : (rest.price === null ? null : undefined),
        oldPrice: rest.oldPrice != null ? String(rest.oldPrice) : (rest.oldPrice === null ? null : undefined),
      };
      if (body.contentConfig?.cssContent) {
        const assetsBasePath = path.join(process.cwd(), 'server', 'assets');
        const { processedCss, fonts } = await extractFontsFromCss(
          body.contentConfig.cssContent,
          req.params.id,
          assetsBasePath
        );
        if (fonts.length > 0) {
          body.contentConfig.cssContent = processedCss;
          body.contentConfig.extractedFonts = fonts;
        }
      }
      
      const book = await storage.updateBook(req.params.id, body);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      return res.json(book);
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error updating book");
      return res.status(500).json({ error: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      const bookId = req.params.id;
      
      // Security: Validate bookId format (only alphanumeric and hyphens allowed)
      if (!/^[a-zA-Z0-9_-]+$/.test(bookId)) {
        return res.status(400).json({ error: "Invalid book ID format" });
      }
      
      // Verify the book exists in database before deleting files
      const existingBook = await storage.getBook(bookId);
      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      // 1. Delete local assets folder (images, fonts, CSS)
      const booksBasePath = path.join(process.cwd(), 'server', 'assets', 'books');
      const localAssetsPath = path.join(booksBasePath, bookId);
      
      // Security: Ensure resolved path is within the books directory (prevent path traversal)
      const resolvedPath = path.resolve(localAssetsPath);
      const resolvedBasePath = path.resolve(booksBasePath);
      if (!resolvedPath.startsWith(resolvedBasePath + path.sep)) {
        return res.status(400).json({ error: "Invalid book ID" });
      }
      
      try {
        if (fs.existsSync(resolvedPath)) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
          logger.info({ path: resolvedPath }, 'Deleted local assets');
        }
      } catch (fsError) {
        logger.error({ error: fsError, path: resolvedPath }, 'Error deleting local assets');
      }
      
      // 2. Delete previews from object storage
      try {
        const objectStorageService = new ObjectStorageService();
        const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
        const publicBucketPath = publicSearchPaths[0] || '';
        
        if (publicBucketPath) {
          // Parse bucket name from path like /bucketname/public
          const pathParts = publicBucketPath.startsWith('/') 
            ? publicBucketPath.slice(1).split('/') 
            : publicBucketPath.split('/');
          const bucketName = pathParts[0];
          const previewPrefix = pathParts.slice(1).join('/') + `/previews/${bookId}/`;
          
          const bucket = objectStorageClient.bucket(bucketName);
          const [files] = await bucket.getFiles({ prefix: previewPrefix });
          
          if (files.length > 0) {
            await Promise.all(files.map(file => file.delete()));
            logger.info({ count: files.length, bookId }, 'Deleted preview files from object storage');
          }
        }
      } catch (storageError) {
        logger.error({ error: storageError, bookId }, 'Error deleting from object storage');
      }
      
      // 3. Delete book from database
      await storage.deleteBook(bookId);
      logger.info({ bookId }, 'Deleted book from database');
      
      return res.status(204).send();
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error deleting book");
      return res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // ===== BOOK PAGE RENDERING =====
  app.post("/api/books/:id/render-pages", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      const contentConfig = book.contentConfig;
      const pages = contentConfig?.pages;
      if (!pages || pages.length === 0) {
        return res.status(400).json({ error: "No pages to render" });
      }

      const { config = {}, combinationKey = 'default', characters = {}, dedicationOnly = false } = req.body;
      
      // Parse combinationKey into key-value pairs for partial matching
      // e.g., "haircolor:blond_skin:light" -> { haircolor: "blond", skin: "light" }
      const parseKeyToCharacteristics = (key: string): Record<string, string> => {
        if (!key || key === 'default' || key === 'all') return {};
        const result: Record<string, string> = {};
        key.split('_').forEach(part => {
          const [k, v] = part.split(':');
          if (k && v) result[k] = v;
        });
        return result;
      };
      
      const userSelections = parseKeyToCharacteristics(combinationKey);
      
      // Check if an image matches user selections (partial matching)
      // An image matches if ALL its characteristics are satisfied by user selections
      const imageMatchesSelections = (img: ImageElement): boolean => {
        if (!img.combinationKey || img.combinationKey === 'default' || img.combinationKey === 'all') {
          return true; // Static images always match
        }
        
        const imgCharacteristics = img.characteristics || parseKeyToCharacteristics(img.combinationKey);
        
        // For each characteristic in the image, check if user has same selection
        for (const [key, value] of Object.entries(imgCharacteristics)) {
          if (userSelections[key] && userSelections[key] !== value) {
            return false; // User selected a different value for this characteristic
          }
        }
        return true; // All image characteristics match (or user hasn't selected that characteristic)
      };
      
      // Check if an image's conditions are satisfied by user selections
      const imageMatchesConditions = (img: ImageElement, userCharacters: Record<string, Record<string, string>>): boolean => {
        if (!img.conditions || img.conditions.length === 0) {
          return true;
        }
        
        return img.conditions.every((cond) => {
          for (const tabSelections of Object.values(userCharacters)) {
            if (tabSelections[cond.variantId] === cond.optionId) {
              return true;
            }
          }
          return false;
        });
      };
      
      // Import chromium dynamically
      const { chromium } = await import('playwright-core');
      const { execSync } = await import('child_process');
      
      // Find chromium path dynamically
      let chromiumPath = 'chromium';
      try {
        chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
      } catch {
        // Chromium not found in PATH, using default
      }
      
      // Launch browser using system Chromium
      const browser = await chromium.launch({
        executablePath: chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-file-access-from-files',
        ],
      });

      const renderedPages: Array<{ pageIndex: number; imageUrl: string }> = [];
      
      // Check if pages already exist in bucket before regenerating
      const { objectStorageClient } = await import('./services/object_storage/objectStorage');
      const bucketName = process.env.R2_BUCKET_NAME || 'wawbook';
      const bucket = objectStorageClient.bucket(bucketName);
      
      // Generate stable hash for this combination
      const crypto = await import('node:crypto');
      
      // CRITICAL: Include ALL personalization data in the hash, not just combinationKey
      // This ensures each unique book (name, age, dedication, etc.) gets its own stored pages
      const fullPersonalizationData = {
        childName: config.childName || '',
        age: config.age || '',
        dedication: config.dedication || '',
        author: config.author || '',
        gender: config.gender || '',
        characters: characters || {},
        combinationKey: combinationKey || 'default',
      };
      
      const fullDataString = JSON.stringify(fullPersonalizationData);
      const keyHash = crypto.createHash('md5').update(fullDataString).digest('hex').substring(0, 16);
      
      // Check if all pages already exist (skip for dedicationOnly — only check targeted pages)
      let allPagesExist = true;
      const existingPages: Array<{ pageIndex: number; imageUrl: string }> = [];
      
      const pagesToCheck = dedicationOnly ? [] : pages;
      for (const pageData of pagesToCheck) {
        try {
          const [files] = await bucket.getFiles({
            prefix: `public/previews/${book.id}/${keyHash}/page-${pageData.pageIndex}-`
          });
          
          if (files.length > 0) {
            // Sort by timestamp (newest first) and take the most recent
            const sortedFiles = files.sort((a, b) => {
              const aMatch = a.name.match(/page-\d+-(\d+)\.jpg$/);
              const bMatch = b.name.match(/page-\d+-(\d+)\.jpg$/);
              const aTime = aMatch ? parseInt(aMatch[1]) : 0;
              const bTime = bMatch ? parseInt(bMatch[1]) : 0;
              return bTime - aTime;
            });
            
            const mostRecentFile = sortedFiles[0];
            const imageUrl = `/objects/${bucketName}/${mostRecentFile.name}`;
            existingPages.push({ pageIndex: pageData.pageIndex, imageUrl });
          } else {
            allPagesExist = false;
            break;
          }
        } catch (err) {
          allPagesExist = false;
          break;
        }
      }
      
      // If all pages exist, return them immediately without regenerating
      if (!dedicationOnly && allPagesExist && existingPages.length === pages.length) {
        return res.json({ pages: existingPages });
      }
      
      // SOLUTION 2: Use system-installed fonts for Chromium headless
      // Note: Fonts must be pre-installed in ~/.fonts (e.g., Andika from SIL)
      // We don't copy from book fonts as they may be corrupted
      const systemFontsDir = path.join(process.env.HOME || '/home/runner', '.fonts');
      
      // IGNORE EPUB CSS COMPLETELY - Only use IDML for text and fonts
      // EPUB only provides positions and images
      
      // Extract font names from IDML texts (not from EPUB CSS)
      const availableFonts: string[] = [];
      const allTexts = contentConfig?.texts || [];
      
      for (const text of allTexts) {
        const fontFamily = text.fontFamily || text.style?.fontFamily;
        if (fontFamily) {
          const cleanFont = fontFamily.replace(/['"]/g, '').trim();
          if (cleanFont && !availableFonts.includes(cleanFont)) {
            availableFonts.push(cleanFont);
          }
        }
      }
      
      // Load EPUB CSS but ONLY for container positions/dimensions (NOT for fonts/text styles)
      let cssContent = '';
      const localCssPath = path.join(process.cwd(), 'server', 'assets', 'books', book.id, 'html', 'styles.css');
      try {
        const localCss = await fs.promises.readFile(localCssPath, 'utf-8');
        // Remove ALL font-related rules from EPUB CSS (font-family, @font-face, etc.)
        cssContent = localCss
          .replace(/@font-face\s*\{[^}]+\}/gi, '') // Remove @font-face
          .replace(/font-family\s*:[^;]+;/gi, '') // Remove font-family declarations
          .replace(/font-size\s*:[^;]+;/gi, '') // Remove font-size
          .replace(/font-weight\s*:[^;]+;/gi, '') // Remove font-weight
          .replace(/font-style\s*:[^;]+;/gi, '') // Remove font-style
          .replace(/color\s*:[^;]+;/gi, '') // Remove color
          .replace(/text-[^:]+:[^;]+;/gi, ''); // Remove text-* properties
      } catch (e) {
        // No CSS file, use minimal CSS
        cssContent = `
body, div, dl, dt, dd, h1, h2, h3, h4, h5, h6, p, pre, code, blockquote, figure {
  margin:0;
  padding:0;
  border-width:0;
  text-rendering:optimizeSpeed;
}
`;
      }
      
      // Embed fonts as base64 in CSS
      // This is the ONLY method that works reliably in Chromium headless
      const systemFontFaces: string[] = [];
      const bookFontDir = path.join(process.cwd(), 'server', 'assets', 'books', book.id, 'font');
      
      for (const fontName of availableFonts) {
        try {
          let fontPath: string | null = null;
          let fontFile: string | null = null;
          
          // Search for font file (case-insensitive, handle spaces)
          const searchName = fontName.toLowerCase().replace(/\s+/g, '');
          
          // Helper to search in a directory
          const searchFontInDir = async (dir: string) => {
            try {
              const fontFiles = await fs.promises.readdir(dir);
              const candidates = fontFiles.filter(f => {
                const fileName = f.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
                return fileName.includes(searchName) && (f.endsWith('.ttf') || f.endsWith('.otf'));
              });
              
              return candidates.sort((a, b) => {
                const aHasRegular = a.toLowerCase().includes('regular');
                const bHasRegular = b.toLowerCase().includes('regular');
                if (aHasRegular && !bHasRegular) return -1;
                if (!aHasRegular && bHasRegular) return 1;
                return 0;
              })[0];
            } catch (err) {
              return null;
            }
          };
          
          // Try book fonts first, then system fonts
          fontFile = await searchFontInDir(bookFontDir);
          if (fontFile) {
            fontPath = path.join(bookFontDir, fontFile);
          } else {
            fontFile = await searchFontInDir(systemFontsDir);
            if (fontFile) {
              fontPath = path.join(systemFontsDir, fontFile);
            }
          }
          
          if (fontPath && fontFile) {
            
            // Verify font is valid before embedding
            const fontBuffer = await fs.promises.readFile(fontPath);
            const magic = fontBuffer.slice(0, 4).toString('hex').toUpperCase();
            const validMagics = ['00010000', '74727565', '4F54544F', '774F4646', '774F4632'];
            
            if (!validMagics.some(m => magic.startsWith(m))) {
              continue;
            }
            
            const fontBase64 = fontBuffer.toString('base64');
            
            // Create @font-face with base64 data
            const mimeType = fontFile.endsWith('.otf') ? 'font/otf' : 'font/ttf';
            const format = fontFile.endsWith('.otf') ? 'opentype' : 'truetype';
            const dataUri = `data:${mimeType};base64,${fontBase64}`;
            
            systemFontFaces.push(
              `@font-face { font-family: '${fontName}'; src: url('${dataUri}') format('${format}'); }`
            );
          } else {
            // Font not found locally — try R2 using stored fontMappings from contentConfig
            try {
              const fontMappings: Record<string, string> = (contentConfig as any)?.fontMappings || {};
              // objectPath format: '/objects/bucketName/public/fonts/...'
              // or fallback: list R2 by bookId prefix (backward compat for books without fontMappings)
              let r2Key: string | null = null;
              const storedPath = fontMappings[fontName];
              // #region agent log
              logger.info({ fontName, hasMappings: Object.keys(fontMappings).length > 0, storedPath: storedPath || null, bookId: book.id }, '[font-debug] font not found locally, checking R2');
              // #endregion
              if (storedPath) {
                // Direct lookup: strip '/objects/bucketName/' prefix to get S3 key
                r2Key = storedPath.replace(/^\/objects\/[^/]+\//, '');
                // #region agent log
                logger.info({ fontName, storedPath, r2Key }, '[font-debug] r2Key from fontMappings');
                // #endregion
              } else {
                // Fallback for older books: list R2 and find by name
                const r2Bucket = objectStorageClient.bucket();
                const [r2Files] = await r2Bucket.getFiles({ prefix: `public/fonts/${book.id}_` });
                const searchName = fontName.toLowerCase().replace(/[\s\-_]/g, '');
                // #region agent log
                logger.info({ fontName, searchName, r2FilesCount: r2Files.length, prefix: `public/fonts/${book.id}_` }, '[font-debug] R2 fallback listing');
                // #endregion
                const r2Match = r2Files.find(f => {
                  const basename = f.name.split('/').pop() || '';
                  const withoutPrefix = basename.replace(/^\d+_(?:[a-f0-9]+_)?/i, '');
                  const normalized = withoutPrefix.toLowerCase().replace(/[\s\-_]/g, '').replace(/\.(ttf|otf)$/i, '').replace(/regular$/i, '');
                  return normalized.includes(searchName) || searchName.includes(normalized);
                });
                if (r2Match) r2Key = r2Match.name;
                // #region agent log
                logger.info({ fontName, r2Key, r2MatchName: r2Match?.name || null }, '[font-debug] R2 fallback result');
                // #endregion
              }

              if (r2Key) {
                const r2File = objectStorageClient.bucket().file(r2Key);
                const [r2Buffer] = await r2File.download();
                const r2Magic = r2Buffer.slice(0, 4).toString('hex').toUpperCase();
                const validMagics2 = ['00010000', '74727565', '4F54544F', '774F4646', '774F4632'];
                if (validMagics2.some(m => r2Magic.startsWith(m))) {
                  const ext = r2Key.endsWith('.otf') ? 'otf' : 'ttf';
                  const mimeType2 = ext === 'otf' ? 'font/otf' : 'font/ttf';
                  const format2 = ext === 'otf' ? 'opentype' : 'truetype';
                  const dataUri2 = `data:${mimeType2};base64,${r2Buffer.toString('base64')}`;
                  systemFontFaces.push(
                    `@font-face { font-family: '${fontName}'; src: url('${dataUri2}') format('${format2}'); }`
                  );
                  // #region agent log
                  logger.info({ fontName, r2Key, sizeBytes: r2Buffer.length }, '[font-debug] font embedded from R2 OK');
                  // #endregion
                } else {
                  // #region agent log
                  logger.warn({ fontName, r2Key, magic: r2Magic }, '[font-debug] R2 font failed magic bytes validation');
                  // #endregion
                }
              } else {
                // #region agent log
                logger.warn({ fontName, bookId: book.id }, '[font-debug] font not found in R2 either');
                // #endregion
              }
            } catch (r2Err) {
              // #region agent log
              logger.error({ error: r2Err, fontName, bookId: book.id }, '[font-debug] R2 font lookup error');
              // #endregion
            }
          }
        } catch (err) {
          logger.error({ error: err, fontName }, 'Error embedding font');
        }
      }
      
      cssContent = systemFontFaces.join('\n') + '\n' + cssContent;
      
      // Default font to use when no fontFamily is specified
      const defaultFont = availableFonts[0] || 'sans-serif';

      // Si dedicationOnly, ne régénérer que les pages contenant des variables dédicace/auteur
      const allBookTexts = contentConfig?.texts || [];
      const dedicationPageIndices = new Set(
        allBookTexts
          .filter((t: any) => t.content && /\{(TXTVAR_)?(dedication|author)\}/i.test(t.content))
          .map((t: any) => t.position?.pageIndex)
          .filter((idx: any) => idx !== undefined)
      );
      const pagesToRender = dedicationOnly
        ? pages.filter((p: any) => dedicationPageIndices.has(p.pageIndex))
        : pages;

      for (const pageData of pagesToRender) {
        try {
          const browserPage = await browser.newPage();
          
          const pageWidth = pageData.width || 400;
          const pageHeight = pageData.height || 293;
          await browserPage.setViewportSize({ width: pageWidth, height: pageHeight });

          const baseUrl = `${req.protocol}://${req.get('host')}`;
          
          // Get images for this page, filtered by conditions, combinationKey, or characteristics
          // Priority: conditions > combinationKey > characteristics > default
          const pageImages = (contentConfig?.imageElements || []).filter(
            (img) => {
              // Must be on the correct page
              if (img.position?.pageIndex !== pageData.pageIndex) return false;
              
              // If image has conditions, check them
              if (img.conditions && img.conditions.length > 0) {
                // ALL conditions must match
                const allMatch = img.conditions.every((cond) => {
                  // Find if user selected this variant with this value
                  for (const tabSelections of Object.values(characters) as Record<string, string>[]) {
                    if (tabSelections[cond.variantId] === cond.optionId) {
                      return true; // Found matching selection
                    }
                  }
                  return false; // This condition not satisfied
                });
                
                return allMatch;
              }
              
              // Static images or images without conditions always match
              return true;
            }
          );
          
          // Group images by position to avoid duplicates
          // If multiple images have the same position, keep only the one that best matches user selections
          const imagesByPosition = new Map<string, ImageElement[]>();
          for (const img of pageImages) {
            const pos = (img.position || {}) as { x?: number; y?: number; width?: number; height?: number };
            // Create a position key (rounded to avoid floating point issues)
            const posKey = `${Math.round(pos.x || 0)}_${Math.round(pos.y || 0)}_${Math.round(pos.width || 0)}_${Math.round(pos.height || 0)}`;
            
            if (!imagesByPosition.has(posKey)) {
              imagesByPosition.set(posKey, []);
            }
            imagesByPosition.get(posKey)!.push(img);
          }
          
          // For each position, keep only the best matching image
          const finalImages: ImageElement[] = [];
          for (const [_posKey, imagesAtPosition] of imagesByPosition.entries()) {
            if (imagesAtPosition.length === 1) {
              // Only one image at this position, use it
              finalImages.push(imagesAtPosition[0]);
            } else {
              // Multiple images at same position - choose the one that best matches
              // Priority: images with conditions that match > images with combinationKey match > others
              let bestImage = imagesAtPosition[0];
              let bestScore = 0;
              
              for (const img of imagesAtPosition) {
                let score = 0;
                
                // Score based on conditions: if ALL conditions match, highest priority
                if (img.conditions && img.conditions.length > 0) {
                  const allConditionsMatch = imageMatchesConditions(img, characters);
                  if (allConditionsMatch) {
                    score = 1000 + img.conditions.length; // Highest priority, more conditions = better match
                  } else {
                    // Partial match - count how many conditions match
                    const matchingCount = img.conditions.filter((cond) => {
                      for (const [_tabId, tabSelections] of Object.entries(characters) as [string, Record<string, string>][]) {
                        if (tabSelections[cond.variantId] === cond.optionId) {
                          return true;
                        }
                      }
                      return false;
                    }).length;
                    score = matchingCount * 10; // Lower priority for partial matches
                  }
                } else if (img.combinationKey && img.combinationKey !== 'default' && img.combinationKey !== 'all') {
                  // Score based on combinationKey match
                  if (img.combinationKey === combinationKey) {
                    score = 500; // High priority for exact combinationKey match
                  } else if (imageMatchesSelections(img)) {
                    score = 300; // Medium priority for partial combinationKey match
                  }
                } else {
                  // Static/default image - lowest priority
                  score = 1;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestImage = img;
                }
              }
              
              finalImages.push(bestImage);
            }
          }
          
          // Sort by layer if available
          finalImages.sort((a, b) => (a.position?.layer || 0) - (b.position?.layer || 0));
          
          // Get text zones for this page
          const pageTexts = (contentConfig?.texts || []).filter(
            (txt) => txt.position?.pageIndex === pageData.pageIndex
          );
          
          // Build clean HTML with positioned zones instead of raw InDesign HTML
          // Images use pixel positions from EPUB CSS (same as texts)
          let imagesHtml = finalImages.map((img) => {
            const pos = (img.position || {}) as { x?: number; y?: number; width?: number; height?: number; scaleX?: number; scaleY?: number; rotation?: number };
            const imgUrl = img.url?.startsWith('/') ? `${baseUrl}${img.url}` : img.url;
            const scaleX = pos.scaleX || 1;
            const scaleY = pos.scaleY || 1;
            const rotation = pos.rotation || 0;
            // Use pixel positions like texts, with transform for scale/rotation
            return `<img src="${imgUrl}" style="position:absolute;left:${pos.x || 0}px;top:${pos.y || 0}px;width:${pos.width || pageWidth}px;height:${pos.height || pageHeight}px;object-fit:cover;transform:rotate(${rotation}deg) scale(${scaleX}, ${scaleY});transform-origin:0% 0%;" />`;
          }).join('\n');
          
          let textsHtml = pageTexts.map((txt: any) => {
            const pos = txt.position || {};
            const style = txt.style || {};
            let content = txt.content || '';
            
            // Helper function to check if a condition is active
            const isConditionActive = (segment: any): boolean => {
              if (!segment.condition) return true;
              
              if (segment.parsedCondition) {
                const { character: tabId, variant: variantId, option: optionId } = segment.parsedCondition;
                const wizardTabId = tabId.startsWith('hero-') ? tabId.replace(/^hero-/, '') : tabId;
                const tabSelections = (characters ?? {})[wizardTabId] as Record<string, string> | undefined;
                return tabSelections ? tabSelections[variantId] === optionId : false;
              }
              
              return true;
            };
            
            // Helper function to resolve variables in text
            const resolveVariablesInText = (text: string): string => {
              let resolved = text;
              
              // Replace variables - support multiple formats
              if (config.childName) {
                resolved = resolved.replace(/\{\{child_name\}\}/gi, config.childName);
                resolved = resolved.replace(/\{\{nom_enfant\}\}/gi, config.childName);
                resolved = resolved.replace(/\{child_name\}/gi, config.childName);
                resolved = resolved.replace(/\{nom_enfant\}/gi, config.childName);
              }
              
              // Replace dedication variable (chaîne vide si non renseigné)
              resolved = resolved.replace(/\{\{dedication\}\}/gi, config.dedication || '');
              resolved = resolved.replace(/\{dedication\}/gi, config.dedication || '');
              
              // Replace author variable (chaîne vide si non renseigné)
              resolved = resolved.replace(/\{\{author\}\}/gi, config.author || '');
              resolved = resolved.replace(/\{author\}/gi, config.author || '');
              
              // Replace TXTVAR system variables (dedication, author)
              // Toujours remplacer (chaîne vide si non renseigné) pour ne pas afficher {TXTVAR_...}
              resolved = resolved.replace(/\{\{TXTVAR_dedication\}\}/gi, config.dedication || '');
              resolved = resolved.replace(/\{TXTVAR_dedication\}/gi, config.dedication || '');
              resolved = resolved.replace(/\{\{TXTVAR_author\}\}/gi, config.author || '');
              resolved = resolved.replace(/\{TXTVAR_author\}/gi, config.author || '');
              
              // Replace TXTVAR wizard variables (tabId_variantId)
              resolved = resolved.replace(/\{TXTVAR_([^_]+)_([^}]+)\}/g, (match: string, tabId: string, variantId: string) => {
                const wizardTabId = tabId.startsWith('hero-') ? tabId.replace(/^hero-/, '') : tabId;
                const tabSelections = characters?.[wizardTabId];
                if (tabSelections && tabSelections[variantId]) {
                  return ' ' + tabSelections[variantId] + ' ';
                }
                return match;
              });
              
              return resolved;
            };
            
            // Helper function to build style for a segment
            const buildSegmentStyle = (segmentStyle: any, globalStyle: any): string => {
              const segStyle = segmentStyle || globalStyle;
              
              // Convert fontSize from points to pixels (factor 20)
              let textFontSize = segStyle.fontSize || globalStyle.fontSize || '16pt';
              if (textFontSize.includes('pt')) {
                const ptValue = parseFloat(textFontSize);
                textFontSize = `${ptValue * 20}px`;
              }
              
              // Ensure font family is properly quoted
              let rawFontFamily = segStyle.fontFamily || globalStyle.fontFamily || defaultFont;
              rawFontFamily = rawFontFamily.replace(/^["']|["']$/g, '');
              const textFontFamily = rawFontFamily.includes(' ') ? `'${rawFontFamily}'` : rawFontFamily;
              
              const fontWeight = segStyle.fontWeight || globalStyle.fontWeight || 'normal';
              const fontStyle = segStyle.fontStyle || globalStyle.fontStyle || 'normal';
              const textColor = segStyle.color || globalStyle.color || '#000000';
              const letterSpacing = segStyle.letterSpacing || globalStyle.letterSpacing || 'normal';
              const textDecoration = segStyle.textDecoration || globalStyle.textDecoration || 'none';
              const fontStretch = segStyle.fontStretch || globalStyle.fontStretch || '';
              
              // Handle stroke (text outline)
              const strokeColor = segStyle.strokeColor || globalStyle.strokeColor;
              const strokeWeight = segStyle.strokeWeight || globalStyle.strokeWeight;
              const strokeWidthPx = strokeColor
                ? (strokeWeight ? `${strokeWeight * 20}px` : '20px')
                : undefined;
              
              const strokeCss = strokeColor && strokeWidthPx
                ? `-webkit-text-stroke-color:${strokeColor};-webkit-text-stroke-width:${strokeWidthPx};text-stroke-color:${strokeColor};text-stroke-width:${strokeWidthPx};`
                : '';
              
              const fontStretchCss = fontStretch ? `font-stretch:${fontStretch};` : '';
              
              return `font-family:${textFontFamily};font-size:${textFontSize};font-weight:${fontWeight};font-style:${fontStyle};color:${textColor};${strokeCss}${fontStretchCss}letter-spacing:${letterSpacing};text-decoration:${textDecoration};`;
            };
            
            // NOUVEAU: Si segments conditionnels, rendre chaque segment avec son propre style
            let segmentsHtml = '';
            let globalTextTransform = style.textTransform || 'none';
            
            if (txt.conditionalSegments && txt.conditionalSegments.length > 0) {
              // Filtrer les segments actifs
              const activeSegments = txt.conditionalSegments.filter((segment: any) => isConditionActive(segment));
              
              // Rendre chaque segment avec son propre style
              segmentsHtml = activeSegments.map((segment: any) => {
                let segmentText = segment.text || '';
                
                // Resolve variables in segment text
                segmentText = resolveVariablesInText(segmentText);
                
                // Apply text transform from segment or global
                // Priorité: resolvedStyle.textTransform (si défini et différent de 'none') > text.style.textTransform > 'none'
                const hasResolvedStyle = segment.resolvedStyle !== undefined;
                const segmentTextTransform = hasResolvedStyle && segment.resolvedStyle?.textTransform && segment.resolvedStyle.textTransform !== 'none'
                  ? segment.resolvedStyle.textTransform
                  : globalTextTransform;
                
                // Apply text transform to the text content
                if (segmentTextTransform === 'uppercase') {
                  segmentText = segmentText.toUpperCase();
                } else if (segmentTextTransform === 'lowercase') {
                  segmentText = segmentText.toLowerCase();
                }
                
                // Build style for this segment
                const segmentStyleStr = buildSegmentStyle(segment.resolvedStyle, style);
                
                // Escape HTML
                const escapedText = segmentText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                
                // Note: text-transform est déjà appliqué en JavaScript, mais on l'ajoute aussi en CSS
                // pour garantir la cohérence avec le rendu client
                const textTransformCss = segmentTextTransform !== 'none' ? `text-transform:${segmentTextTransform};` : '';
                
                return `<span style="${segmentStyleStr}${textTransformCss}">${escapedText}</span>`;
              }).join('');
              
              content = segmentsHtml;
            } else {
              // Pas de segments conditionnels : utiliser le contenu global
              // Resolve all variables using resolveVariablesInText
              content = resolveVariablesInText(content);
              
              // Apply text transform
              const textTransform = style.textTransform || 'none';
              if (textTransform === 'uppercase') {
                content = content.toUpperCase();
              } else if (textTransform === 'lowercase') {
                content = content.toLowerCase();
              }
              
              // Escape HTML and convert line breaks
              content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
              
              // Wrap in span with font styling (same as conditional segments)
              const globalStyleStr = buildSegmentStyle(null, style);
              const textTransformCss = textTransform !== 'none' ? `text-transform:${textTransform};` : '';
              content = `<span style="${globalStyleStr}${textTransformCss}">${content}</span>`;
            }
            
            // Build common container styles (paragraph layout)
            const lineHeight = style.lineHeight || '1.2';
            const textAlign = style.textAlign || 'left';
            const textAlignLast = style.textAlignLast || undefined;
            const textIndent = style.textIndent || '0';
            
            // Build the text-align-last CSS if defined
            const textAlignLastCss = textAlignLast ? `text-align-last:${textAlignLast};` : '';
            
            // BUGFIX: Reproduire exactement l'approche EPUB avec conteneur géant + scale
            const scaleFactor = 20;
            const containerWidth = pos.width * scaleFactor;
            const containerHeight = pos.height * scaleFactor;
            
            // BUGFIX: Appliquer HorizontalScale via scaleX()
            let transformValue = `rotate(${pos.rotation || 0}deg) scale(${1 / scaleFactor}, ${1 / scaleFactor})`;
            let finalPosX = pos.x;
            const finalPosY = pos.y;
            
            if (style.idmlHorizontalScale && style.idmlHorizontalScale !== 100) {
              const scaleXValue = style.idmlHorizontalScale / 100;
              transformValue = `rotate(${pos.rotation || 0}deg) scale(${1 / scaleFactor}, ${1 / scaleFactor}) scaleX(${scaleXValue})`;
              
              if (textAlign === 'center') {
                const extraWidth = pos.width * (scaleXValue - 1);
                finalPosX = pos.x - (extraWidth / 2);
              }
            }
            
            // Add text-transform to container if defined globally (for non-segmented text or as fallback)
            const containerTextTransform = globalTextTransform !== 'none' ? `text-transform:${globalTextTransform};` : '';
            
            const containerStyle = `position:absolute;left:${finalPosX}px;top:${finalPosY}px;width:${containerWidth}px;height:${containerHeight}px;box-sizing:border-box;overflow:visible;display:flex;flex-direction:column;justify-content:center;align-items:${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};line-height:${lineHeight};${containerTextTransform}margin:0;padding:0;transform:${transformValue};transform-origin:0 0;`;
            
            // Wrapper interne pour le texte avec text-align et text-indent
            const innerStyle = `width:100%;text-align:${textAlign};${textAlignLastCss}text-indent:${textIndent};margin:0;padding:0;`;
            
            return `<div style="${containerStyle}"><div style="${innerStyle}">${content}</div></div>`;
          }).join('\n');
          
          let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${cssContent}</style>
</head>
<body style="margin:0;padding:0;width:${pageWidth}px;height:${pageHeight}px;position:relative;overflow:hidden;">
${imagesHtml}
${textsHtml}
</body>
</html>`;

          // Save HTML to temp file in public assets directory
          const tempHtmlPath = path.join(process.cwd(), 'server', 'assets', 'books', book.id, `render_${pageData.pageIndex}.html`);
          await fs.promises.mkdir(path.dirname(tempHtmlPath), { recursive: true });
          await fs.promises.writeFile(tempHtmlPath, html, 'utf-8');

          // Load via HTTP URL instead of setContent for proper font loading
          const serverPort = process.env.PORT || 5001;
          const htmlUrl = `http://localhost:${serverPort}/api/books/${book.id}/render-html/${pageData.pageIndex}`;
          
          try {
            await browserPage.goto(htmlUrl, { waitUntil: 'networkidle', timeout: 10000 });
          } catch (gotoErr) {
            await browserPage.setContent(html, { waitUntil: 'networkidle' });
          }
          
          // CRITICAL: Force font loading with document.fonts.load()
          // This is the ONLY way to ensure fonts are loaded in Chromium headless
          await browserPage.evaluate(async (fontNames: string[]) => {
            const results: string[] = [];
            
            // Force load each font at multiple sizes
            for (const fontName of fontNames) {
              try {
                await document.fonts.load(`12pt "${fontName}"`);
                await document.fonts.load(`24pt "${fontName}"`);
                results.push(`${fontName}: OK`);
              } catch (e) {
                results.push(`${fontName}: FAILED - ${e}`);
              }
            }
            
            // Wait for all fonts to be ready
            await document.fonts.ready;
            
            // Check final status
            const allFonts = Array.from(document.fonts);
            return {
              forced: results,
              total: allFonts.length,
              loaded: allFonts.filter(f => f.status === 'loaded').map(f => f.family),
              error: allFonts.filter(f => f.status === 'error').map(f => f.family),
            };
          }, availableFonts);
          
          // Wait for font rendering to stabilize
          await browserPage.waitForTimeout(500);

          // Take screenshot
          const screenshot = await browserPage.screenshot({ type: 'jpeg', quality: 85 });
          await browserPage.close();

          // Upload to bucket (reuse bucket/keyHash from earlier check)
          // Add timestamp to make unique filename
          const timestamp = Date.now();
          const objectPath = `public/previews/${book.id}/${keyHash}/page-${pageData.pageIndex}-${timestamp}.jpg`;
          
          // Delete all old versions of this page (files matching pattern page-{pageIndex}-*.jpg)
          try {
            const [files] = await bucket.getFiles({
              prefix: `public/previews/${book.id}/${keyHash}/page-${pageData.pageIndex}-`
            });
            for (const oldFile of files) {
              await oldFile.delete();
            }
          } catch (deleteError) {
            logger.warn({ error: deleteError, bookId: book.id }, 'Could not delete old versions');
          }
          
          const file = bucket.file(objectPath);
          await file.save(screenshot, {
            contentType: 'image/jpeg',
            metadata: { cacheControl: 'public, max-age=31536000' }, // 1 year cache for production
          });

          const imageUrl = `/objects/${bucketName}/${objectPath}`;
          renderedPages.push({ pageIndex: pageData.pageIndex, imageUrl });
        } catch (pageError) {
          logger.error({ error: pageError, pageIndex: pageData.pageIndex, bookId: book.id }, 'Error rendering page');
        }
      }

      await browser.close();
      
      logger.info({ count: renderedPages.length }, 'Successfully rendered pages');
      return res.json({ success: true, pages: renderedPages });
    } catch (error) {
      logger.error({ error }, "Failed to render pages");
      return res.status(500).json({ error: "Failed to render pages" });
    }
  });

  // Serve rendered HTML files for Playwright to access via HTTP
  app.get("/api/books/:id/render-html/:pageIndex", async (req, res) => {
    try {
      const htmlPath = path.join(process.cwd(), 'server', 'assets', 'books', req.params.id, `render_${req.params.pageIndex}.html`);
      const htmlContent = await fs.promises.readFile(htmlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlContent);
    } catch (error) {
      return res.status(404).send('HTML file not found');
    }
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      return res.json(customers);
    } catch (error) {
      logger.error({ error }, "Error getting customers");
      return res.status(500).json({ error: "Failed to get customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      return res.json(customer);
    } catch (error) {
      logger.error({ error, customerId: req.params.id }, "Error getting customer");
      return res.status(500).json({ error: "Failed to get customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
      };
      const validationResult = insertCustomerSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      
      // Check if customer already exists with this email - just return it
      if (validationResult.data.email) {
        const existingCustomer = await storage.getCustomerByEmail(validationResult.data.email);
        if (existingCustomer) {
          return res.status(200).json(existingCustomer);
        }
      }
      
      const customer = await storage.createCustomer(validationResult.data);
      return res.status(201).json(customer);
    } catch (error) {
      logger.error({ error }, "Error creating customer");
      return res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
      };
      const customer = await storage.updateCustomer(req.params.id, body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      return res.json(customer);
    } catch (error) {
      logger.error({ error }, "Error updating customer");
      return res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting customer");
      return res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ===== SHIPPING ZONES =====
  app.get("/api/shipping-zones", async (_req, res) => {
    try {
      const zones = await storage.getAllShippingZones();
      return res.json(zones);
    } catch (error) {
      logger.error({ error }, "Error getting shipping zones");
      return res.status(500).json({ error: "Failed to get shipping zones" });
    }
  });

  app.get("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.getShippingZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      return res.json(zone);
    } catch (error) {
      logger.error({ error }, "Error getting shipping zone");
      return res.status(500).json({ error: "Failed to get shipping zone" });
    }
  });

  app.post("/api/shipping-zones", async (req, res) => {
    try {
      const validationResult = insertShippingZoneSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const zone = await storage.createShippingZone(validationResult.data);
      return res.status(201).json(zone);
    } catch (error) {
      logger.error({ error }, "Error creating shipping zone");
      return res.status(500).json({ error: "Failed to create shipping zone" });
    }
  });

  app.patch("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      return res.json(zone);
    } catch (error) {
      logger.error({ error }, "Error updating shipping zone");
      return res.status(500).json({ error: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping-zones/:id", async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting shipping zone");
      return res.status(500).json({ error: "Failed to delete shipping zone" });
    }
  });

  // ===== PRINTERS =====
  app.get("/api/printers", async (_req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      return res.json(printers);
    } catch (error) {
      logger.error({ error }, "Error getting printers");
      return res.status(500).json({ error: "Failed to get printers" });
    }
  });

  app.get("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.getPrinter(req.params.id);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      return res.json(printer);
    } catch (error) {
      logger.error({ error }, "Error getting printer");
      return res.status(500).json({ error: "Failed to get printer" });
    }
  });

  app.post("/api/printers", async (req, res) => {
    try {
      const validationResult = insertPrinterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const printer = await storage.createPrinter(validationResult.data);
      return res.status(201).json(printer);
    } catch (error) {
      logger.error({ error }, "Error creating printer");
      return res.status(500).json({ error: "Failed to create printer" });
    }
  });

  app.patch("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.updatePrinter(req.params.id, req.body);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      return res.json(printer);
    } catch (error) {
      logger.error({ error }, "Error updating printer");
      return res.status(500).json({ error: "Failed to update printer" });
    }
  });

  app.delete("/api/printers/:id", async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting printer");
      return res.status(500).json({ error: "Failed to delete printer" });
    }
  });

  // ===== MENUS =====
  app.get("/api/menus", async (_req, res) => {
    try {
      const menus = await storage.getAllMenus();
      return res.json(menus);
    } catch (error) {
      logger.error({ error }, "Error getting menus");
      return res.status(500).json({ error: "Failed to get menus" });
    }
  });

  app.get("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.getMenu(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      return res.json(menu);
    } catch (error) {
      logger.error({ error }, "Error getting menu");
      return res.status(500).json({ error: "Failed to get menu" });
    }
  });

  app.post("/api/menus", async (req, res) => {
    try {
      const validationResult = insertMenuSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const menu = await storage.createMenu(validationResult.data);
      return res.status(201).json(menu);
    } catch (error) {
      logger.error({ error }, "Error creating menu");
      return res.status(500).json({ error: "Failed to create menu" });
    }
  });

  app.patch("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.updateMenu(req.params.id, req.body);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      return res.json(menu);
    } catch (error) {
      logger.error({ error }, "Error updating menu");
      return res.status(500).json({ error: "Failed to update menu" });
    }
  });

  app.delete("/api/menus/:id", async (req, res) => {
    try {
      await storage.deleteMenu(req.params.id);
      return res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting menu");
      return res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  // ===== SETTINGS =====
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      return res.json(setting);
    } catch (error) {
      logger.error({ error }, "Error getting setting");
      return res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.setSetting(req.params.key, req.body.value);
      return res.json(setting);
    } catch (error) {
      logger.error({ error }, "Error setting value");
      return res.status(500).json({ error: "Failed to set value" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // ===== STRIPE CHECKOUT =====
  app.get("/api/stripe/config", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      return res.json({ publishableKey });
    } catch (error) {
      logger.error({ error }, "Error getting Stripe config");
      return res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      const { items, shippingOption, customerEmail, customerName, shippingAddress, orderId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
      }

      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return res.status(400).json({ error: "Adresse email invalide. Veuillez saisir un email valide (ex: nom@domaine.com)" });
      }

      const lineItems = items.map((item) => ({
        name: item.name || item.title || 'Livre personnalisé',
        description: item.description,
        amount: parseFloat(item.price) || 29.90,
        quantity: item.quantity || 1,
      }));

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripeService.createCheckoutSession({
        customerEmail,
        lineItems,
        shippingOption: shippingOption ? {
          name: shippingOption.name,
          description: shippingOption.description,
          amount: parseFloat(shippingOption.price) || 0,
        } : undefined,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/checkout/cancel`,
        metadata: {
          orderId: orderId || '',
          customerName: customerName || '',
          shippingAddress: JSON.stringify(shippingAddress || {}),
        },
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      logger.error({ error }, "Error creating checkout session");
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify payment status and update order
  app.post("/api/checkout/verify-payment", async (req, res) => {
    try {
      const { sessionId, orderId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const paymentResult = await stripeService.getPaymentStatus(sessionId);
      
      // Update order with payment status if orderId is provided
      if (orderId) {
        await storage.updateOrder(orderId, {
          paymentStatus: paymentResult.status,
          stripeSessionId: sessionId,
          stripePaymentIntentId: paymentResult.paymentIntentId,
        });
      }

      return res.json({
        paymentStatus: paymentResult.status,
        paymentIntentId: paymentResult.paymentIntentId,
      });
    } catch (error) {
      logger.error({ error }, "Error verifying payment");
      return res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  return httpServer;
}
