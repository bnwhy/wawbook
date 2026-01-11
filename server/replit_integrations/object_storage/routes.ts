import type { Express, Request } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

/**
 * Clean CSS syntax errors that can prevent fonts from loading
 * - Fixes spaces before colons (e.g., "src : url" -> "src: url")
 * - Normalizes @font-face declarations
 */
function cleanCssSyntax(css: string): string {
  return css
    .replace(/\s+:/g, ':')
    .replace(/:\s+/g, ': ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

/**
 * Shared EPUB extraction logic - extracts an EPUB buffer to local server storage
 */
async function extractEpubFromBuffer(epubBuffer: Buffer, bookId: string) {
  // Create local directories for this book
  const bookAssetsDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId);
  const imagesDir = path.join(bookAssetsDir, 'images');
  const fontsDir = path.join(bookAssetsDir, 'fonts');
  const htmlDir = path.join(bookAssetsDir, 'html');
  
  await fs.promises.mkdir(imagesDir, { recursive: true });
  await fs.promises.mkdir(fontsDir, { recursive: true });
  await fs.promises.mkdir(htmlDir, { recursive: true });

  // Extract ZIP
  const zip = await JSZip.loadAsync(epubBuffer);
  
  const imageMap: Record<string, string> = {};
  const fontMap: Record<string, string> = {};
  const htmlFiles: string[] = [];
  const htmlContent: Record<string, string> = {};
  const cssContent: Record<string, string> = {};
  
  // Extract all files
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const fileName = relativePath.split('/').pop() || relativePath;
    
    // Handle images - save to local server
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
      const imageBuffer = await zipEntry.async('nodebuffer');
      const localPath = path.join(imagesDir, fileName);
      await fs.promises.writeFile(localPath, imageBuffer);
      
      // Create a URL path for browser to access
      const serverPath = `/assets/books/${bookId}/images/${fileName}`;
      imageMap[relativePath] = serverPath;
      imageMap[fileName] = serverPath;
      
      // Add all partial paths (e.g., "image/1.jpg" from "OEBPS/image/1.jpg")
      const parts = relativePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const partialPath = parts.slice(i).join('/');
        if (!imageMap[partialPath]) {
          imageMap[partialPath] = serverPath;
        }
      }
      console.log(`[epub-extract] Saved image: ${fileName}`);
    }
    
    // Handle fonts - save to local server
    if (/\.(ttf|otf|woff|woff2|eot)$/i.test(relativePath)) {
      const fontBuffer = await zipEntry.async('nodebuffer');
      const localPath = path.join(fontsDir, fileName);
      await fs.promises.writeFile(localPath, fontBuffer);
      
      const serverPath = `/assets/books/${bookId}/fonts/${fileName}`;
      fontMap[relativePath] = serverPath;
      fontMap[fileName] = serverPath;
      
      // Add all partial paths
      const parts = relativePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const partialPath = parts.slice(i).join('/');
        if (!fontMap[partialPath]) {
          fontMap[partialPath] = serverPath;
        }
      }
      console.log(`[epub-extract] Saved font: ${fileName}`);
    }
    
    // Handle HTML/XHTML
    if (/\.(xhtml|html)$/i.test(relativePath)) {
      const content = await zipEntry.async('string');
      htmlFiles.push(relativePath);
      htmlContent[relativePath] = content;
      
      // Save HTML to local server
      const localPath = path.join(htmlDir, fileName);
      await fs.promises.writeFile(localPath, content, 'utf-8');
    }
    
    // Handle CSS
    if (/\.css$/i.test(relativePath)) {
      const content = await zipEntry.async('string');
      cssContent[relativePath] = content;
      
      // Save CSS to local server
      const localPath = path.join(htmlDir, fileName);
      await fs.promises.writeFile(localPath, content, 'utf-8');
    }
  }

  // Process CSS to embed fonts as base64 data URIs
  // Clean CSS syntax errors (e.g., "src : url" -> "src: url")
  let allCss = cleanCssSyntax(Object.values(cssContent).join('\n'));
  
  // Convert each font to base64 and embed directly in CSS
  for (const [originalPath, serverPath] of Object.entries(fontMap)) {
    const filename = originalPath.split('/').pop() || originalPath;
    const fontLocalPath = path.join(fontsDir, filename);
    
    try {
      // Read font file and convert to base64
      const fontBuffer = await fs.promises.readFile(fontLocalPath);
      const fontBase64 = fontBuffer.toString('base64');
      
      // Determine MIME type based on extension
      const ext = filename.toLowerCase().split('.').pop();
      let mimeType = 'font/truetype';
      if (ext === 'otf') mimeType = 'font/opentype';
      else if (ext === 'woff') mimeType = 'font/woff';
      else if (ext === 'woff2') mimeType = 'font/woff2';
      
      const dataUri = `data:${mimeType};base64,${fontBase64}`;
      
      // Match url() with any path containing this filename and replace with base64
      const pattern = new RegExp(
        `url\\(["']?(?:\\.\\.\\/)*(?:[^"')]*\\/)?${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\)`,
        'gi'
      );
      const formatHint = ext === 'otf' ? 'opentype' : ext === 'woff' ? 'woff' : ext === 'woff2' ? 'woff2' : 'truetype';
      allCss = allCss.replace(pattern, `url("${dataUri}") format('${formatHint}')`);
      
      console.log(`[epub-extract] Embedded font as base64: ${filename} (${Math.round(fontBase64.length / 1024)}KB)`);
    } catch (fontError) {
      console.error(`[epub-extract] Failed to embed font ${filename}:`, fontError);
      const pattern = new RegExp(
        `url\\(["']?(?:\\.\\.\\/)*(?:[^"')]*\\/)?${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\)`,
        'gi'
      );
      allCss = allCss.replace(pattern, `url("${serverPath}")`);
    }
  }
  
  // Save processed CSS with embedded fonts
  const processedCssPath = path.join(htmlDir, 'styles.css');
  await fs.promises.writeFile(processedCssPath, allCss, 'utf-8');

  // Process each HTML page
  const contentHtmlFiles = htmlFiles.filter(f => 
    !f.toLowerCase().includes('toc') && 
    !f.toLowerCase().includes('nav') &&
    !f.toLowerCase().includes('cover')
  ).sort();
  
  const pagesDimensions: Array<{ width: number; height: number; pageIndex: number }> = [];
  const extractedTexts: Array<any> = [];
  const extractedImages: Array<any> = [];

  for (let i = 0; i < contentHtmlFiles.length; i++) {
    const htmlFile = contentHtmlFiles[i];
    let pageHtml = htmlContent[htmlFile] || '';
    
    // Parse viewport dimensions
    const viewportMatch = pageHtml.match(/width[=:](\d+).*?height[=:](\d+)/i);
    const pageWidth = viewportMatch ? parseInt(viewportMatch[1]) : 595;
    const pageHeight = viewportMatch ? parseInt(viewportMatch[2]) : 842;
    
    // Replace image paths with server paths
    for (const [originalPath, serverPath] of Object.entries(imageMap)) {
      const patterns = [
        new RegExp(`src=["']([^"']*${originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi'),
        new RegExp(`src=["']([^"']*${originalPath.split('/').pop()?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''})["']`, 'gi'),
      ];
      for (const pattern of patterns) {
        pageHtml = pageHtml.replace(pattern, `src="${serverPath}"`);
      }
    }
    
    pagesDimensions.push({
      width: pageWidth,
      height: pageHeight,
      pageIndex: i + 1,
    });
    
    // Parse text elements from HTML using cheerio
    // Detect InDesign text frames (Bloc-de-texte-standard) and extract complete text blocks
    const $ = cheerio.load(pageHtml);
    
    // Find all text frame divs (InDesign exports them with class "Bloc-de-texte-standard")
    $('div.Bloc-de-texte-standard').each((index, element) => {
      const $element = $(element);
      const containerId = $element.attr('id') || `textblock-${index}`;
      
      // Get the full text content of the block (all nested text combined)
      const textContent = $element.text().replace(/\s+/g, ' ').trim();
      
      if (textContent) {
        // Check for variables in the format {variable_name}
        const isVariable = /\{[^}]+\}/.test(textContent);
        
        // Process content: replace {var} with {{var}} for template engine
        let processedContent = textContent;
        if (isVariable) {
          processedContent = textContent.replace(/\{([^}]+)\}/g, '{{$1}}');
        }
        
        // Extract CSS position from the container element
        // Look for transform, width, height in CSS (via #id selector in allCss)
        // Handle CSS where multiple IDs share rules OR individual ID rules
        const idPattern = new RegExp(`#${containerId}[^{]*\\{([^}]+)\\}`, 'i');
        const cssMatch = allCss.match(idPattern);
        let cssProps: Record<string, string> = {};
        
        console.log(`[epub-extract] Looking for CSS of #${containerId}, found:`, !!cssMatch);
        
        if (cssMatch) {
          const cssBlock = cssMatch[1];
          // Parse CSS properties
          const propRegex = /([a-z-]+)\s*:\s*([^;]+)/gi;
          let propMatch;
          while ((propMatch = propRegex.exec(cssBlock)) !== null) {
            cssProps[propMatch[1].toLowerCase().trim()] = propMatch[2].trim();
          }
        }
        
        // Extract transform values (translate X, Y)
        let translateX = 0, translateY = 0, rotation = 0, scaleX = 1, scaleY = 1;
        const transformVal = cssProps['transform'] || cssProps['-webkit-transform'] || '';
        const translateMatch = transformVal.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
          translateX = parseFloat(translateMatch[1]) || 0;
          translateY = parseFloat(translateMatch[2]) || 0;
        }
        const rotateMatch = transformVal.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
          rotation = parseFloat(rotateMatch[1]) || 0;
        }
        const scaleMatch = transformVal.match(/scale\(([^,]+),\s*([^)]+)\)/);
        if (scaleMatch) {
          scaleX = parseFloat(scaleMatch[1]) || 1;
          scaleY = parseFloat(scaleMatch[2]) || 1;
        }
        
        // Get width/height
        const blockWidth = parseFloat(cssProps['width']) || 100;
        const blockHeight = parseFloat(cssProps['height']) || 30;
        
        console.log(`[epub-extract] Block ${containerId}: x=${translateX}, y=${translateY}, w=${blockWidth}, h=${blockHeight}`);
        
        // Check for inline scale transform in child divs (InDesign often uses this)
        let inlineScale = 1;
        const $innerDiv = $element.find('div[style*="scale"]').first();
        if ($innerDiv.length) {
          const innerStyle = $innerDiv.attr('style') || '';
          const inlineScaleMatch = innerStyle.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
          if (inlineScaleMatch) {
            inlineScale = parseFloat(inlineScaleMatch[2] || inlineScaleMatch[1]) || 1;
          }
        }
        
        // Extract text style from first span with CharOverride class
        const $firstSpan = $element.find('span[class*="CharOverride"]').first();
        let fontFamily = 'serif';
        let fontSize = '16px';
        let rawFontSize = 16;
        let color = '#000000';
        
        if ($firstSpan.length) {
          // Get class name to find style in CSS
          const spanClass = $firstSpan.attr('class') || '';
          const charOverrideMatch = spanClass.match(/CharOverride-\d+/);
          if (charOverrideMatch) {
            const charPattern = new RegExp(`span\\.${charOverrideMatch[0]}\\s*\\{([^}]+)\\}`, 'i');
            const charCssMatch = allCss.match(charPattern);
            if (charCssMatch) {
              const charCss = charCssMatch[1];
              const fontFamilyMatch = charCss.match(/font-family\s*:\s*([^;]+)/i);
              if (fontFamilyMatch) fontFamily = fontFamilyMatch[1].trim();
              const fontSizeMatch = charCss.match(/font-size\s*:\s*([^;]+)/i);
              if (fontSizeMatch) {
                rawFontSize = parseFloat(fontSizeMatch[1]) || 16;
                // Apply inline scale to get effective font size
                const effectiveFontSize = Math.round(rawFontSize * inlineScale);
                fontSize = `${effectiveFontSize}px`;
              }
              const colorMatch = charCss.match(/color\s*:\s*([^;]+)/i);
              if (colorMatch) color = colorMatch[1].trim();
            }
          }
        }
        
        console.log(`[epub-extract] Text ${containerId}: rawFontSize=${rawFontSize}, inlineScale=${inlineScale}, effectiveFontSize=${fontSize}`);
        
        extractedTexts.push({
          id: `text-${bookId}-${i + 1}-${containerId}`,
          type: isVariable ? 'variable' : 'fixed',
          label: containerId,
          content: processedContent,
          originalContent: textContent,
          style: {
            color,
            fontSize,
            textAlign: 'left',
            fontFamily,
          },
          position: {
            x: translateX,
            y: translateY,
            width: blockWidth,
            height: blockHeight,
            scaleX,
            scaleY,
            layer: 50,
            pageIndex: i + 1,
            rotation,
          },
          cssSelector: `#${containerId}`,
          combinationKey: 'default',
        });
      }
    });
    
    // Parse image elements from HTML
    const imgRegex = /<img[^>]*(?:class=["']([^"']+)["'])?[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*\/?>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(pageHtml)) !== null) {
      const match = imgMatch;
      const imgClass = match[1] || '';
      const imgSrc = match[2];
      const imgAlt = match[3] || '';
      
      extractedImages.push({
        id: `img-${bookId}-${i + 1}-${randomUUID().substring(0, 8)}`,
        type: 'static',
        label: imgClass || imgAlt || `image-page-${i + 1}`,
        url: imgSrc,
        position: {
          x: 0,
          y: 0,
          layer: 10,
          pageIndex: i + 1,
          rotation: 0,
          width: 100,
          height: 100,
        },
        combinationKey: 'default',
      });
    }
  }

  console.log(`[epub-extract] Complete: ${Object.keys(imageMap).length} images, ${Object.keys(fontMap).length} fonts, ${extractedTexts.length} texts, ${extractedImages.length} image elements`);

  return {
    success: true,
    bookId,
    assetsPath: `/assets/books/${bookId}`,
    images: imageMap,
    fonts: fontMap,
    cssContent: allCss,
    pages: pagesDimensions,
    texts: extractedTexts,
    imageElements: extractedImages,
  };
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
      res.json(result);
    } catch (error) {
      console.error("[epub-extract] Error:", error);
      res.status(500).json({ error: "Failed to extract EPUB from bucket. Try direct file upload instead." });
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

