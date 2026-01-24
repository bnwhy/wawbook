import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertCustomerSchema, insertOrderSchema, insertShippingZoneSchema, insertPrinterSchema, insertMenuSchema, type ImageElement, type TextElement, type BookConfiguration } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import * as path from "path";
import * as fs from "fs";
import { extractFontsFromCss } from "./utils/fontExtractor";
import { logger } from "./utils/logger";
import { resolveConditionalText } from "./replit_integrations/object_storage/utils/conditionalTextResolver";

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
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      logger.error({ error }, "Error getting books");
      res.status(500).json({ error: "Failed to get books" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error getting book");
      res.status(500).json({ error: "Failed to get book" });
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
      res.status(201).json(book);
    } catch (error) {
      logger.error({ error }, "Error creating book");
      res.status(500).json({ error: "Failed to create book" });
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
      res.json(book);
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error updating book");
      res.status(500).json({ error: "Failed to update book" });
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
          // Parse bucket name from path like /replit-objstore-xxx/public
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
      
      res.status(204).send();
    } catch (error) {
      logger.error({ error, bookId: req.params.id }, "Error deleting book");
      res.status(500).json({ error: "Failed to delete book" });
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

      const { config = {}, combinationKey = 'default', characters = {} } = req.body;
      const objectStorageService = new ObjectStorageService();
      
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
      
      // SOLUTION 2: Use system-installed fonts for Chromium headless
      // Note: Fonts must be pre-installed in ~/.fonts (e.g., Andika from SIL)
      // We don't copy from book fonts as they may be corrupted
      const systemFontsDir = path.join(process.env.HOME || '/home/runner', '.fonts');
      
      // IGNORE EPUB CSS COMPLETELY - Only use IDML for text and fonts
      // EPUB only provides positions and images
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicBucketPath = publicSearchPaths[0] || '/replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2/public';
      
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
          }
        } catch (err) {
          logger.error({ error: err, fontName }, 'Error embedding font');
        }
      }
      
      cssContent = systemFontFaces.join('\n') + '\n' + cssContent;
      
      // Default font to use when no fontFamily is specified
      const defaultFont = availableFonts[0] || 'sans-serif';

      for (const pageData of pages) {
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
                  for (const tabSelections of Object.values(characters)) {
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
            const pos = img.position || {};
            // Create a position key (rounded to avoid floating point issues)
            const posKey = `${Math.round(pos.x || 0)}_${Math.round(pos.y || 0)}_${Math.round(pos.width || 0)}_${Math.round(pos.height || 0)}`;
            
            if (!imagesByPosition.has(posKey)) {
              imagesByPosition.set(posKey, []);
            }
            imagesByPosition.get(posKey)!.push(img);
          }
          
          // For each position, keep only the best matching image
          const finalImages: ImageElement[] = [];
          for (const [posKey, imagesAtPosition] of imagesByPosition.entries()) {
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
                      for (const [tabId, tabSelections] of Object.entries(characters)) {
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
            const pos = img.position || {};
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
            
            // NOUVEAU: Résoudre les textes conditionnels si présents
            if (txt.conditionalSegments && txt.conditionalSegments.length > 0) {
              // Résoudre le texte conditionnel avec les sélections du wizard
              // Format attendu: { tabId: { variantId: optionId } }
              content = resolveConditionalText(txt.conditionalSegments, characters || {});
            }
            
            // Replace variables - support multiple formats
            if (config.childName) {
              content = content.replace(/\{\{child_name\}\}/gi, config.childName);
              content = content.replace(/\{\{nom_enfant\}\}/gi, config.childName);
              content = content.replace(/\{child_name\}/gi, config.childName);
              content = content.replace(/\{nom_enfant\}/gi, config.childName);
            }
            
            // Apply text transform
            const textTransform = style.textTransform || 'none';
            if (textTransform === 'uppercase') {
              content = content.toUpperCase();
            } else if (textTransform === 'lowercase') {
              content = content.toLowerCase();
            }
            
            const textColor = style.color || '#000000';
            
            // BUGFIX: Convertir fontSize de points vers pixels comme l'EPUB
            // L'EPUB InDesign utilise un facteur de 20px par point (840px pour 42pt)
            // Cela garantit un rendu identique à l'EPUB
            let textFontSize = style.fontSize || '16pt';
            if (textFontSize.includes('pt')) {
              const ptValue = parseFloat(textFontSize);
              textFontSize = `${ptValue * 20}px`; // Facteur 20 comme l'EPUB InDesign
            }
            
            // Ensure font family is properly quoted for CSS (handles fonts with spaces like "Minion Pro")
            let rawFontFamily = style.fontFamily || defaultFont;
            // Remove existing quotes if any
            rawFontFamily = rawFontFamily.replace(/^["']|["']$/g, '');
            // Use single quotes to avoid breaking the HTML style attribute (which uses double quotes)
            const textFontFamily = rawFontFamily.includes(' ') ? `'${rawFontFamily}'` : rawFontFamily;
            const fontWeight = style.fontWeight || 'normal';
            const fontStyle = style.fontStyle || 'normal';
            const letterSpacing = style.letterSpacing || 'normal';
            const textDecoration = style.textDecoration || 'none';
            const lineHeight = style.lineHeight || '1.2';
            const textAlign = style.textAlign || 'left';
            const textAlignLast = style.textAlignLast || undefined;
            const textIndent = style.textIndent || '0';
            const marginTop = style.marginTop || '0';
            const marginBottom = style.marginBottom || '0';
            
            // BUGFIX: Extraire le stroke (contour du texte) depuis IDML
            const strokeColor = style.strokeColor || undefined;
            const strokeWeight = style.strokeWeight || undefined;
            
            // Convertir strokeWeight de points vers pixels (facteur 20)
            // Si strokeColor défini mais pas strokeWeight, utiliser 1pt (20px) par défaut comme l'EPUB
            const strokeWidthPx = strokeColor
              ? (strokeWeight ? `${strokeWeight * 20}px` : '20px')
              : undefined;
            
            // For proper text-align, we need to clean the content properly
            // Trim all whitespace to ensure clean alignment
            content = content.trim();
            
            // Escape HTML and convert line breaks
            const escapedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            
            // Build the text-align-last CSS if defined
            const textAlignLastCss = textAlignLast ? `text-align-last:${textAlignLast};` : '';
            
            // BUGFIX: Reproduire exactement l'approche EPUB avec conteneur géant + scale
            // L'EPUB utilise un conteneur 20x plus grand que la zone finale, puis scale(0.05)
            // Cela permet au texte de 840px d'avoir assez d'espace
            
            const scaleFactor = 20; // Facteur 20 comme l'EPUB (42pt → 840px)
            const containerWidth = pos.width * scaleFactor;
            const containerHeight = pos.height * scaleFactor;
            const finalFontSize = textFontSize;
            
            // Construire les propriétés de stroke (contour du texte)
            const strokeCss = strokeColor && strokeWidthPx
              ? `-webkit-text-stroke-color:${strokeColor};-webkit-text-stroke-width:${strokeWidthPx};text-stroke-color:${strokeColor};text-stroke-width:${strokeWidthPx};`
              : '';
            
            // Conteneur avec dimensions géantes, puis scale pour revenir à la taille finale
            // overflow:visible permet au texte de déborder naturellement (comme l'EPUB)
            // BUGFIX: Ajouter font-stretch et scaleX() pour HorizontalScale
            const fontStretchCss = style.fontStretch ? `font-stretch:${style.fontStretch};` : '';
            
            
            // BUGFIX: Appliquer HorizontalScale via scaleX()
            // Pour texte centré, compenser le décalage en ajustant left
            let transformValue = `rotate(${pos.rotation || 0}deg) scale(${1 / scaleFactor}, ${1 / scaleFactor})`;
            let finalPosX = pos.x;
            const finalPosY = pos.y;
            
            if (style.idmlHorizontalScale && style.idmlHorizontalScale !== 100) {
              const scaleXValue = style.idmlHorizontalScale / 100;
              transformValue = `rotate(${pos.rotation || 0}deg) scale(${1 / scaleFactor}, ${1 / scaleFactor}) scaleX(${scaleXValue})`;
              
              // Pour texte centré, compenser le décalage
              // Le scaleX étire depuis transform-origin (0,0), donc décale vers la droite
              // On doit reculer de la moitié de l'espace supplémentaire créé
              if (textAlign === 'center') {
                const extraWidth = pos.width * (scaleXValue - 1); // 557.29 * 0.41 = ~228px
                finalPosX = pos.x - (extraWidth / 2); // 36 - 114 = -78px
              }
            }
            
            const containerStyle = `position:absolute;left:${finalPosX}px;top:${finalPosY}px;width:${containerWidth}px;height:${containerHeight}px;box-sizing:border-box;overflow:visible;display:flex;flex-direction:column;justify-content:center;align-items:${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};font-family:${textFontFamily};font-size:${finalFontSize};font-weight:${fontWeight};font-style:${fontStyle};color:${textColor};${strokeCss}${fontStretchCss}letter-spacing:${letterSpacing};text-decoration:${textDecoration};text-transform:${textTransform};line-height:${lineHeight};margin:0;padding:0;transform:${transformValue};transform-origin:0 0;`;
            
            // Wrapper interne pour le texte avec text-align et text-indent
            const innerStyle = `width:100%;text-align:${textAlign};${textAlignLastCss}text-indent:${textIndent};margin:0;padding:0;`;
            
            return `<div style="${containerStyle}"><div style="${innerStyle}">${escapedContent}</div></div>`;
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
          const fontsLoaded = await browserPage.evaluate(async (fontNames: string[]) => {
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

          // Upload to bucket
          const { objectStorageClient } = await import('./replit_integrations/object_storage/objectStorage');
          const bucketName = 'replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2';
          
          // Generate a stable hash from combinationKey for the file path
          // This ensures different combinations get different files, preventing cache issues
                const crypto = await import('node:crypto');
                const keyHash = combinationKey !== 'default'
                  ? crypto.createHash('md5').update(combinationKey).digest('hex').substring(0, 16)
                  : 'default';
                // Add timestamp to force cache invalidation
                const timestamp = Date.now();
                const objectPath = `public/previews/${book.id}/${keyHash}/page-${pageData.pageIndex}-${timestamp}.jpg`;
          
          const bucket = objectStorageClient.bucket(bucketName);
          
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
      res.json({ success: true, pages: renderedPages });
    } catch (error) {
      logger.error({ error }, "Failed to render pages");
      res.status(500).json({ error: "Failed to render pages" });
    }
  });

  // Serve rendered HTML files for Playwright to access via HTTP
  app.get("/api/books/:id/render-html/:pageIndex", async (req, res) => {
    try {
      const htmlPath = path.join(process.cwd(), 'server', 'assets', 'books', req.params.id, `render_${req.params.pageIndex}.html`);
      const htmlContent = await fs.promises.readFile(htmlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      res.status(404).send('HTML file not found');
    }
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      logger.error({ error }, "Error getting customers");
      res.status(500).json({ error: "Failed to get customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      logger.error({ error, customerId: req.params.id }, "Error getting customer");
      res.status(500).json({ error: "Failed to get customer" });
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
      res.status(201).json(customer);
    } catch (error) {
      logger.error({ error }, "Error creating customer");
      res.status(500).json({ error: "Failed to create customer" });
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
      res.json(customer);
    } catch (error) {
      logger.error({ error }, "Error updating customer");
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting customer");
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ===== ORDERS =====
  app.get("/api/orders/next-id", async (req, res) => {
    try {
      const { pool } = await import("./storage");
      const result = await pool.query("SELECT nextval('order_number_seq') as seq");
      const seq = result.rows[0].seq;
      const year = new Date().getFullYear().toString().slice(-2);
      const orderId = `ORD-${year}-${String(seq).padStart(7, '0')}`;
      res.json({ orderId });
    } catch (error) {
      logger.error({ error }, "Error generating order ID");
      res.status(500).json({ error: "Failed to generate order ID" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      logger.error({ error }, "Error getting orders");
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      logger.error({ error }, "Error getting order");
      res.status(500).json({ error: "Failed to get order" });
    }
  });

  app.get("/api/customers/:customerId/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByCustomer(req.params.customerId);
      res.json(orders);
    } catch (error) {
      logger.error({ error }, "Error getting customer orders");
      res.status(500).json({ error: "Failed to get customer orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
      };
      const validationResult = insertOrderSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const order = await storage.createOrder(validationResult.data);
      res.status(201).json(order);
    } catch (error) {
      logger.error({ error }, "Error creating order");
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
      };
      const order = await storage.updateOrder(req.params.id, body);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      logger.error({ error }, "Error updating order");
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting order");
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // ===== SHIPPING ZONES =====
  app.get("/api/shipping-zones", async (req, res) => {
    try {
      const zones = await storage.getAllShippingZones();
      res.json(zones);
    } catch (error) {
      logger.error({ error }, "Error getting shipping zones");
      res.status(500).json({ error: "Failed to get shipping zones" });
    }
  });

  app.get("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.getShippingZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      res.json(zone);
    } catch (error) {
      logger.error({ error }, "Error getting shipping zone");
      res.status(500).json({ error: "Failed to get shipping zone" });
    }
  });

  app.post("/api/shipping-zones", async (req, res) => {
    try {
      const validationResult = insertShippingZoneSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const zone = await storage.createShippingZone(validationResult.data);
      res.status(201).json(zone);
    } catch (error) {
      logger.error({ error }, "Error creating shipping zone");
      res.status(500).json({ error: "Failed to create shipping zone" });
    }
  });

  app.patch("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      res.json(zone);
    } catch (error) {
      logger.error({ error }, "Error updating shipping zone");
      res.status(500).json({ error: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping-zones/:id", async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting shipping zone");
      res.status(500).json({ error: "Failed to delete shipping zone" });
    }
  });

  // ===== PRINTERS =====
  app.get("/api/printers", async (req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      res.json(printers);
    } catch (error) {
      logger.error({ error }, "Error getting printers");
      res.status(500).json({ error: "Failed to get printers" });
    }
  });

  app.get("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.getPrinter(req.params.id);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      logger.error({ error }, "Error getting printer");
      res.status(500).json({ error: "Failed to get printer" });
    }
  });

  app.post("/api/printers", async (req, res) => {
    try {
      const validationResult = insertPrinterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const printer = await storage.createPrinter(validationResult.data);
      res.status(201).json(printer);
    } catch (error) {
      logger.error({ error }, "Error creating printer");
      res.status(500).json({ error: "Failed to create printer" });
    }
  });

  app.patch("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.updatePrinter(req.params.id, req.body);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      logger.error({ error }, "Error updating printer");
      res.status(500).json({ error: "Failed to update printer" });
    }
  });

  app.delete("/api/printers/:id", async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting printer");
      res.status(500).json({ error: "Failed to delete printer" });
    }
  });

  // ===== MENUS =====
  app.get("/api/menus", async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      res.json(menus);
    } catch (error) {
      logger.error({ error }, "Error getting menus");
      res.status(500).json({ error: "Failed to get menus" });
    }
  });

  app.get("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.getMenu(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      logger.error({ error }, "Error getting menu");
      res.status(500).json({ error: "Failed to get menu" });
    }
  });

  app.post("/api/menus", async (req, res) => {
    try {
      const validationResult = insertMenuSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const menu = await storage.createMenu(validationResult.data);
      res.status(201).json(menu);
    } catch (error) {
      logger.error({ error }, "Error creating menu");
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  app.patch("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.updateMenu(req.params.id, req.body);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      logger.error({ error }, "Error updating menu");
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  app.delete("/api/menus/:id", async (req, res) => {
    try {
      await storage.deleteMenu(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Error deleting menu");
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  // ===== SETTINGS =====
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      logger.error({ error }, "Error getting setting");
      res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.setSetting(req.params.key, req.body.value);
      res.json(setting);
    } catch (error) {
      logger.error({ error }, "Error setting value");
      res.status(500).json({ error: "Failed to set value" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // ===== STRIPE CHECKOUT =====
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      logger.error({ error }, "Error getting Stripe config");
      res.status(500).json({ error: "Failed to get Stripe config" });
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

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      logger.error({ error }, "Error creating checkout session");
      res.status(500).json({ error: "Failed to create checkout session" });
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

      res.json({
        paymentStatus: paymentResult.status,
        paymentIntentId: paymentResult.paymentIntentId,
      });
    } catch (error) {
      logger.error({ error }, "Error verifying payment");
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Get payment status for an order
  app.get("/api/orders/:id/payment-status", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // If we have a Stripe session ID, get fresh status from Stripe
      if (order.stripeSessionId) {
        try {
          const paymentResult = await stripeService.getPaymentStatus(order.stripeSessionId);
          
          // Update if status changed
          if (paymentResult.status !== order.paymentStatus) {
            await storage.updateOrder(order.id, {
              paymentStatus: paymentResult.status,
              stripePaymentIntentId: paymentResult.paymentIntentId,
            });
          }
          
          res.json({
            paymentStatus: paymentResult.status,
            stripeSessionId: order.stripeSessionId,
            stripePaymentIntentId: paymentResult.paymentIntentId,
          });
        } catch (stripeError) {
          // If Stripe fails, return stored status
          res.json({
            paymentStatus: order.paymentStatus || 'pending',
            stripeSessionId: order.stripeSessionId,
          });
        }
      } else {
        res.json({
          paymentStatus: order.paymentStatus || 'pending',
        });
      }
    } catch (error) {
      logger.error({ error }, "Error getting payment status");
      res.status(500).json({ error: "Failed to get payment status" });
    }
  });

  return httpServer;
}
