import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertCustomerSchema, insertOrderSchema, insertShippingZoneSchema, insertPrinterSchema, insertMenuSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import * as path from "path";
import * as fs from "fs";
import { extractFontsFromCss } from "./utils/fontExtractor";

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
  console.log(`[routes] Serving local assets from ${assetsPath}`);

  // ===== BOOKS =====
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      console.error("Error getting books:", error);
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
      console.error("Error getting book:", error);
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
      console.error("Error creating book:", error);
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
      console.log('[PATCH /api/books/:id] Received imageElements count:', body.contentConfig?.imageElements?.length);
      if (body.contentConfig?.imageElements?.length > 0) {
        const firstWithConditions = body.contentConfig.imageElements.find((img: any) => img.conditions?.length > 0);
        console.log('[PATCH /api/books/:id] First image with conditions:', JSON.stringify(firstWithConditions));
      }
      
      if (body.contentConfig?.cssContent) {
        const assetsBasePath = path.join(process.cwd(), 'server', 'assets');
        const { processedCss, fonts } = await extractFontsFromCss(
          body.contentConfig.cssContent,
          req.params.id,
          assetsBasePath
        );
        if (fonts.length > 0) {
          console.log(`[PATCH /api/books/:id] Extracted ${fonts.length} fonts from CSS`);
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
      console.error("Error updating book:", error);
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
          console.log(`[DELETE /api/books/:id] Deleted local assets: ${resolvedPath}`);
        }
      } catch (fsError) {
        console.error(`[DELETE /api/books/:id] Error deleting local assets:`, fsError);
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
            console.log(`[DELETE /api/books/:id] Deleted ${files.length} preview files from object storage`);
          }
        }
      } catch (storageError) {
        console.error(`[DELETE /api/books/:id] Error deleting from object storage:`, storageError);
      }
      
      // 3. Delete book from database
      await storage.deleteBook(bookId);
      console.log(`[DELETE /api/books/:id] Deleted book ${bookId} from database`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
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

      const contentConfig = book.contentConfig as any;
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
      const imageMatchesSelections = (img: any): boolean => {
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
      const imageMatchesConditions = (img: any, userCharacters: Record<string, Record<string, any>>): boolean => {
        if (!img.conditions || img.conditions.length === 0) {
          return true;
        }
        
        return img.conditions.every((cond: any) => {
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
        console.log('[render-pages] Could not find chromium in PATH, using default');
      }
      
      // Launch browser using system Chromium
      const browser = await chromium.launch({
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });

      const renderedPages: Array<{ pageIndex: number; imageUrl: string }> = [];
      
      // Try to load CSS from local file (which has base64 embedded fonts) for accurate rendering
      let cssContent = contentConfig?.cssContent || '';
      const localCssPath = path.join(process.cwd(), 'server', 'assets', 'books', book.id, 'html', 'styles.css');
      try {
        const localCss = await fs.promises.readFile(localCssPath, 'utf-8');
        if (localCss && localCss.includes('data:font/')) {
          console.log(`[render-pages] Using base64-embedded CSS from local file`);
          cssContent = localCss;
        }
      } catch (e) {
        // Local CSS not found, use database CSS
        console.log(`[render-pages] Local CSS not found, using database CSS`);
      }
      
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicBucketPath = publicSearchPaths[0] || '/replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2/public';
      
      console.log(`[render-pages] Rendering ${pages.length} pages for book ${book.id}`);

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
            (img: any) => {
              // Must be on the correct page
              if (img.position?.pageIndex !== pageData.pageIndex) return false;
              
              // If image has conditions, check them
              if (img.conditions && img.conditions.length > 0) {
                // ALL conditions must match
                const allMatch = img.conditions.every((cond: any) => {
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
          const imagesByPosition = new Map<string, any[]>();
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
          const finalImages: any[] = [];
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
                    const matchingCount = img.conditions.filter((cond: any) => {
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
              
              console.log(`[render-pages] Page ${pageData.pageIndex}: Position ${posKey} has ${imagesAtPosition.length} images, selected: ${bestImage.id} (score: ${bestScore})`);
              finalImages.push(bestImage);
            }
          }
          
          // Sort by layer if available
          finalImages.sort((a, b) => (a.position?.layer || 0) - (b.position?.layer || 0));
          
          console.log(`[render-pages] Page ${pageData.pageIndex}: Filtered ${pageImages.length} images to ${finalImages.length} (removed ${pageImages.length - finalImages.length} duplicates at same position)`);
          
          // Get text zones for this page
          const pageTexts = (contentConfig?.texts || []).filter(
            (txt: any) => txt.position?.pageIndex === pageData.pageIndex
          );
          
          // Build clean HTML with positioned zones instead of raw InDesign HTML
          // Images use pixel positions from EPUB CSS (same as texts)
          let imagesHtml = finalImages.map((img: any) => {
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
            
            // Replace variables
            if (config.childName) {
              content = content.replace(/\{\{nom_enfant\}\}/g, config.childName);
              content = content.replace(/\{nom_enfant\}/g, config.childName);
            }
            
            // Apply text transform
            const textTransform = style.textTransform || 'none';
            if (textTransform === 'uppercase') {
              content = content.toUpperCase();
            } else if (textTransform === 'lowercase') {
              content = content.toLowerCase();
            }
            
            const textColor = style.color || '#000000';
            const textFontSize = style.fontSize || '16px';
            const textFontFamily = style.fontFamily || 'sans-serif';
            const fontWeight = style.fontWeight || 'normal';
            const fontStyle = style.fontStyle || 'normal';
            const letterSpacing = style.letterSpacing || 'normal';
            const textDecoration = style.textDecoration || 'none';
            const lineHeight = style.lineHeight || '1.2';
            const textAlign = style.textAlign || 'left';
            const textIndent = style.textIndent || '0';
            const marginTop = style.marginTop || '0';
            const marginBottom = style.marginBottom || '0';
            
            // For proper text-align, we need to clean the content properly
            // Trim all whitespace to ensure clean alignment
            content = content.trim();
            
            console.log(`[render-pages] Text: "${content.substring(0, 30)}..." color=${textColor} fontSize=${textFontSize} align=${textAlign} weight=${fontWeight} style=${fontStyle} indent=${textIndent}`);
            console.log(`[render-pages] Text position: x=${pos.x} y=${pos.y} width=${pos.width} height=${pos.height}`);
            console.log(`[render-pages] Text style object:`, JSON.stringify(style).substring(0, 200));
            
            // Escape HTML and convert line breaks
            const escapedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            
            // Use a single div with proper text styling
            // Remove display:inline-block which can cause alignment issues
            const containerStyle = `position:absolute;left:${pos.x}px;top:${pos.y}px;width:${pos.width}px;height:${pos.height}px;box-sizing:border-box;overflow:hidden;font-family:${textFontFamily};font-size:${textFontSize};font-weight:${fontWeight};font-style:${fontStyle};color:${textColor};text-align:${textAlign};letter-spacing:${letterSpacing};text-decoration:${textDecoration};text-transform:${textTransform};text-indent:${textIndent};padding-top:${marginTop};padding-bottom:${marginBottom};line-height:${lineHeight};margin:0;padding-left:0;padding-right:0;transform:rotate(${pos.rotation || 0}deg) scale(${pos.scaleX || 1}, ${pos.scaleY || 1});transform-origin:0 0;`;
            
            return `<div style="${containerStyle}">${escapedContent}</div>`;
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

          await browserPage.setContent(html, { waitUntil: 'networkidle' });
          
          // Wait for all fonts to be loaded
          await browserPage.evaluate(async () => {
            await document.fonts.ready;
          });
          
          // Additional delay to ensure font rendering is complete
          await new Promise(resolve => setTimeout(resolve, 300));

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
              console.log(`[render-pages] Deleted old version: ${oldFile.name}`);
            }
          } catch (deleteError) {
            console.warn(`[render-pages] Could not delete old versions:`, deleteError);
          }
          
          const file = bucket.file(objectPath);
          await file.save(screenshot, {
            contentType: 'image/jpeg',
            metadata: { cacheControl: 'public, max-age=31536000' }, // 1 year cache for production
          });

          const imageUrl = `/objects/${bucketName}/${objectPath}`;
          console.log(`[render-pages] Generated imageUrl: ${imageUrl}`);
          renderedPages.push({ pageIndex: pageData.pageIndex, imageUrl });
          
          console.log(`[render-pages] Page ${pageData.pageIndex} uploaded to ${imageUrl}`);
        } catch (pageError) {
          console.error(`[render-pages] Error rendering page ${pageData.pageIndex}:`, pageError);
        }
      }

      await browser.close();
      
      console.log(`[render-pages] Successfully rendered ${renderedPages.length} pages`);
      console.log(`[render-pages] Returning pages:`, renderedPages.map(p => ({ pageIndex: p.pageIndex, url: p.imageUrl })));
      res.json({ success: true, pages: renderedPages });
    } catch (error) {
      console.error("[render-pages] Error:", error);
      res.status(500).json({ error: "Failed to render pages" });
    }
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
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
      console.error("Error getting customer:", error);
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
      console.error("Error creating customer:", error);
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
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
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
      console.error("Error generating order ID:", error);
      res.status(500).json({ error: "Failed to generate order ID" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error getting orders:", error);
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
      console.error("Error getting order:", error);
      res.status(500).json({ error: "Failed to get order" });
    }
  });

  app.get("/api/customers/:customerId/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByCustomer(req.params.customerId);
      res.json(orders);
    } catch (error) {
      console.error("Error getting customer orders:", error);
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
      console.error("Error creating order:", error);
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
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // ===== SHIPPING ZONES =====
  app.get("/api/shipping-zones", async (req, res) => {
    try {
      const zones = await storage.getAllShippingZones();
      res.json(zones);
    } catch (error) {
      console.error("Error getting shipping zones:", error);
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
      console.error("Error getting shipping zone:", error);
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
      console.error("Error creating shipping zone:", error);
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
      console.error("Error updating shipping zone:", error);
      res.status(500).json({ error: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping-zones/:id", async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipping zone:", error);
      res.status(500).json({ error: "Failed to delete shipping zone" });
    }
  });

  // ===== PRINTERS =====
  app.get("/api/printers", async (req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      res.json(printers);
    } catch (error) {
      console.error("Error getting printers:", error);
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
      console.error("Error getting printer:", error);
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
      console.error("Error creating printer:", error);
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
      console.error("Error updating printer:", error);
      res.status(500).json({ error: "Failed to update printer" });
    }
  });

  app.delete("/api/printers/:id", async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting printer:", error);
      res.status(500).json({ error: "Failed to delete printer" });
    }
  });

  // ===== MENUS =====
  app.get("/api/menus", async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      res.json(menus);
    } catch (error) {
      console.error("Error getting menus:", error);
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
      console.error("Error getting menu:", error);
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
      console.error("Error creating menu:", error);
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
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  app.delete("/api/menus/:id", async (req, res) => {
    try {
      await storage.deleteMenu(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu:", error);
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
      console.error("Error getting setting:", error);
      res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.setSetting(req.params.key, req.body.value);
      res.json(setting);
    } catch (error) {
      console.error("Error setting value:", error);
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
      console.error("Error getting Stripe config:", error);
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

      const lineItems = items.map((item: any) => ({
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
      console.error("Error creating checkout session:", error);
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
      console.error("Error verifying payment:", error);
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
      console.error("Error getting payment status:", error);
      res.status(500).json({ error: "Failed to get payment status" });
    }
  });

  return httpServer;
}
