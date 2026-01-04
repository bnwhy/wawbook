import JSZip from 'jszip';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { browserPool } from './browserPool';
import { objectStorageClient, ObjectStorageService } from '../replit_integrations/object_storage/objectStorage';

interface ExtractedPage {
  id: string;
  html: string;
  width: number;
  height: number;
  order: number;
}

interface ExtractedTemplate {
  bookId: string;
  pages: ExtractedPage[];
  css: string;
  imageMap: Record<string, string>;
  fontDataUris: Record<string, string>;
  loadedAt: Date;
}

interface FontInfo {
  family: string;
  src: string;
  weight: string;
  style: string;
}

function extractFontsFromCss(css: string): FontInfo[] {
  const fonts: FontInfo[] = [];
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi;
  
  let match;
  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = block.match(/font-family\s*:\s*["']?([^;"']+)["']?\s*;?/i);
    let srcMatch = block.match(/src\s*:\s*url\(\s*["'](data:[^"']+)["']\s*\)/i);
    if (!srcMatch) {
      srcMatch = block.match(/src\s*:\s*url\(\s*(data:[^)]+)\s*\)/i);
    }
    const weightMatch = block.match(/font-weight\s*:\s*([^;]+)\s*;?/i);
    const styleMatch = block.match(/font-style\s*:\s*([^;]+)\s*;?/i);
    
    if (familyMatch && srcMatch) {
      fonts.push({
        family: familyMatch[1].trim(),
        src: srcMatch[1],
        weight: weightMatch ? weightMatch[1].trim() : 'normal',
        style: styleMatch ? styleMatch[1].trim() : 'normal',
      });
    }
  }
  return fonts;
}

function generateFontPreloadScript(fonts: FontInfo[]): string {
  if (fonts.length === 0) return '';
  
  const fontLoaders = fonts.map((font, i) => `
    (function() {
      try {
        console.log('[fontPreload] Loading font ${i + 1}/${fonts.length}: ${font.family} (${font.weight} ${font.style})');
        var srcData = '${font.src.substring(0, 50)}...';
        var font${i} = new FontFace('${font.family}', 'url(${font.src})', {
          weight: '${font.weight}',
          style: '${font.style}',
          display: 'block'
        });
        fontPromises.push(
          font${i}.load().then(function(loadedFont) {
            document.fonts.add(loadedFont);
            console.log('[fontPreload] SUCCESS: ${font.family}');
            return { family: '${font.family}', status: 'loaded' };
          }).catch(function(err) {
            console.error('[fontPreload] FAILED: ${font.family}', err.message || err);
            return { family: '${font.family}', status: 'error', error: err.message };
          })
        );
      } catch(e) {
        console.error('[fontPreload] EXCEPTION: ${font.family}', e.message || e);
      }
    })();
  `).join('\n');
  
  return `
    <script>
      (function() {
        console.log('[fontPreload] Starting to load ${fonts.length} fonts...');
        var fontPromises = [];
        ${fontLoaders}
        window.__fontsLoaded = Promise.all(fontPromises).then(function(results) {
          var loaded = results.filter(function(r) { return r && r.status === 'loaded'; }).length;
          console.log('[fontPreload] Completed: ' + loaded + '/${fonts.length} fonts loaded');
          return results;
        });
      })();
    </script>
  `;
}

class TemplateEngine {
  private templates: Map<string, ExtractedTemplate> = new Map();
  private objectStorageService = new ObjectStorageService();

  async loadTemplateFromBuffer(bookId: string, epubBuffer: Buffer, baseUrl: string): Promise<ExtractedTemplate> {
    console.log(`[TemplateEngine] Loading template for book: ${bookId}`);
    
    const zip = await JSZip.loadAsync(epubBuffer);
    
    const imageMap: Record<string, string> = {};
    const fontDataUris: Record<string, string> = {};
    const htmlFiles: string[] = [];
    const htmlContent: Record<string, string> = {};
    const cssContent: Record<string, string> = {};

    const publicPaths = this.objectStorageService.getPublicObjectSearchPaths();
    const publicPath = publicPaths[0];
    const { bucketName, objectName: basePath } = this.parseObjectPath(publicPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const sessionId = `template_${bookId}`;

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
        const imageBuffer = await zipEntry.async('nodebuffer');
        const ext = relativePath.split('.').pop() || 'png';
        const fileName = relativePath.split('/').pop() || relativePath;
        const storageName = `${sessionId}_${fileName}`;
        const objectName = basePath ? `${basePath}/${storageName}` : storageName;
        
        const file = bucket.file(objectName);
        await file.save(imageBuffer, {
          contentType: this.getContentType(ext),
          metadata: { cacheControl: 'public, max-age=31536000' },
        });
        
        const objectPath = `/objects/${bucketName}/${objectName}`;
        imageMap[relativePath] = objectPath;
        imageMap[fileName] = objectPath;
        
        const parts = relativePath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const partialPath = parts.slice(i).join('/');
          if (!imageMap[partialPath]) {
            imageMap[partialPath] = objectPath;
          }
        }
      }
      else if (/\.(ttf|otf|woff2?|eot)$/i.test(relativePath)) {
        const fontBuffer = await zipEntry.async('nodebuffer');
        const base64 = fontBuffer.toString('base64');
        const ext = relativePath.split('.').pop() || 'ttf';
        const mimeType = this.getFontMimeType(ext);
        const dataUri = `data:${mimeType};base64,${base64}`;
        
        const fileName = relativePath.split('/').pop() || relativePath;
        fontDataUris[relativePath] = dataUri;
        fontDataUris[fileName] = dataUri;
        
        const parts = relativePath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const partialPath = parts.slice(i).join('/');
          if (!fontDataUris[partialPath]) {
            fontDataUris[partialPath] = dataUri;
          }
        }
      }
      else if (/\.(html?|xhtml)$/i.test(relativePath)) {
        htmlFiles.push(relativePath);
        const content = await zipEntry.async('string');
        htmlContent[relativePath] = content;
      }
      else if (/\.css$/i.test(relativePath)) {
        const content = await zipEntry.async('string');
        cssContent[relativePath] = content;
      }
    }

    let combinedCss = Object.values(cssContent).join('\n');
    
    for (const [fontPath, dataUri] of Object.entries(fontDataUris)) {
      const escaped = fontPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`url\\(["']?[^"')]*${escaped}["']?\\)`, 'gi');
      combinedCss = combinedCss.replace(regex, `url("${dataUri}")`);
    }

    const contentHtmlFiles = htmlFiles
      .filter(f => !f.toLowerCase().includes('toc') && 
                   !f.toLowerCase().includes('nav'))
      .sort();

    const pages: ExtractedPage[] = [];
    for (let i = 0; i < contentHtmlFiles.length; i++) {
      const htmlFile = contentHtmlFiles[i];
      const html = htmlContent[htmlFile];
      
      const viewportMatch = html.match(/width[=:](\d+).*?height[=:](\d+)/i);
      const width = viewportMatch ? parseInt(viewportMatch[1]) : 595;
      const height = viewportMatch ? parseInt(viewportMatch[2]) : 842;
      
      pages.push({
        id: htmlFile,
        html,
        width,
        height,
        order: i,
      });
    }

    const template: ExtractedTemplate = {
      bookId,
      pages,
      css: combinedCss,
      imageMap,
      fontDataUris,
      loadedAt: new Date(),
    };

    this.templates.set(bookId, template);
    console.log(`[TemplateEngine] Template loaded: ${pages.length} pages, ${Object.keys(imageMap).length} images, ${Object.keys(fontDataUris).length} fonts`);
    
    return template;
  }

  async loadTemplateFromStorage(bookId: string, epubPath: string, baseUrl: string): Promise<ExtractedTemplate> {
    const pathWithoutPrefix = epubPath.replace(/^\/objects\//, '');
    const parts = pathWithoutPrefix.split('/');
    const bucketName = parts[0];
    const objectName = parts.slice(1).join('/');
    
    const bucket = objectStorageClient.bucket(bucketName);
    const epubFile = bucket.file(objectName);
    
    const [exists] = await epubFile.exists();
    if (!exists) {
      throw new Error(`EPUB not found: ${epubPath}`);
    }

    const [epubBuffer] = await epubFile.download();
    return this.loadTemplateFromBuffer(bookId, epubBuffer, baseUrl);
  }

  getTemplate(bookId: string): ExtractedTemplate | undefined {
    return this.templates.get(bookId);
  }

  isTemplateLoaded(bookId: string): boolean {
    return this.templates.has(bookId);
  }

  async generatePreviews(
    bookId: string,
    variables: Record<string, string>,
    baseUrl: string
  ): Promise<Array<{ pageIndex: number; imageUrl: string }>> {
    const template = this.templates.get(bookId);
    if (!template) {
      throw new Error(`Template not loaded for book: ${bookId}`);
    }

    const publicPaths = this.objectStorageService.getPublicObjectSearchPaths();
    const publicPath = publicPaths[0];
    const { bucketName, objectName: basePath } = this.parseObjectPath(publicPath);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const sessionId = `preview_${Date.now().toString(36)}`;
    const results: Array<{ pageIndex: number; imageUrl: string }> = [];

    const embeddedFonts = extractFontsFromCss(template.css);
    const fontPreloadScript = generateFontPreloadScript(embeddedFonts);

    for (let i = 0; i < template.pages.length; i++) {
      const page = template.pages[i];
      
      let processedHtml = page.html;
      const $ = cheerio.load(processedHtml, { xmlMode: true });

      for (const [key, value] of Object.entries(variables)) {
        $('body').html(
          ($('body').html() || '').replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
        );
        $('body').html(
          ($('body').html() || '').replace(new RegExp(`\\{${key}\\}`, 'g'), value)
        );
      }

      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          for (const [originalPath, storagePath] of Object.entries(template.imageMap)) {
            if (src.includes(originalPath) || src.endsWith(originalPath.split('/').pop() || '')) {
              $(el).attr('src', `${baseUrl}${storagePath}`);
              break;
            }
          }
        }
      });

      processedHtml = $.html();

      const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : processedHtml;

      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${fontPreloadScript}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${page.width}px; 
      height: ${page.height}px; 
      overflow: hidden;
      background: white;
    }
    ${template.css}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

      try {
        let imageBuffer = await browserPool.renderPage({
          html: fullHtml,
          width: page.width,
          height: page.height,
          format: 'jpeg',
          quality: 85,
        });

        imageBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        const imageName = `${sessionId}_page_${i + 1}.jpg`;
        const objectName = basePath ? `${basePath}/${imageName}` : imageName;
        const file = bucket.file(objectName);
        
        await file.save(imageBuffer, {
          contentType: 'image/jpeg',
          metadata: { cacheControl: 'public, max-age=3600' },
        });

        const imageUrl = `/objects/${bucketName}/${objectName}`;
        results.push({ pageIndex: i + 1, imageUrl });
        
        console.log(`[TemplateEngine] Rendered page ${i + 1}/${template.pages.length}`);
      } catch (err) {
        console.error(`[TemplateEngine] Failed to render page ${i + 1}:`, err);
      }
    }

    return results;
  }

  unloadTemplate(bookId: string): boolean {
    return this.templates.delete(bookId);
  }

  getLoadedTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  async renderSinglePage(options: {
    html: string;
    css: string;
    width: number;
    height: number;
    variables: Record<string, string>;
    baseUrl: string;
  }): Promise<{ imageUrl: string }> {
    const { html, css, width, height, variables, baseUrl } = options;
    
    let processedHtml = html;
    const $ = cheerio.load(processedHtml, { xmlMode: true });

    for (const [key, value] of Object.entries(variables)) {
      $('body').html(
        ($('body').html() || '').replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      );
      $('body').html(
        ($('body').html() || '').replace(new RegExp(`\\{${key}\\}`, 'g'), value)
      );
    }

    processedHtml = $.html();

    const embeddedFonts = extractFontsFromCss(css);
    const fontPreloadScript = generateFontPreloadScript(embeddedFonts);

    const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : processedHtml;

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${fontPreloadScript}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${width}px; 
      height: ${height}px; 
      overflow: hidden;
      background: white;
    }
    ${css}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    let imageBuffer = await browserPool.renderPage({
      html: fullHtml,
      width,
      height,
      format: 'jpeg',
      quality: 85,
    });

    imageBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const publicPaths = this.objectStorageService.getPublicObjectSearchPaths();
    const publicPath = publicPaths[0];
    const { bucketName, objectName: basePath } = this.parseObjectPath(publicPath);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const sessionId = `render_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    const imageName = `${sessionId}.jpg`;
    const objectName = basePath ? `${basePath}/${imageName}` : imageName;
    const file = bucket.file(objectName);
    
    await file.save(imageBuffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=3600' },
    });

    return { imageUrl: `/objects/${bucketName}/${objectName}` };
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith('/')) path = `/${path}`;
    const parts = path.split('/');
    return {
      bucketName: parts[1] || '',
      objectName: parts.slice(2).join('/'),
    };
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  private getFontMimeType(ext: string): string {
    const types: Record<string, string> = {
      ttf: 'font/ttf',
      otf: 'font/otf',
      woff: 'font/woff',
      woff2: 'font/woff2',
      eot: 'application/vnd.ms-fontobject',
    };
    return types[ext.toLowerCase()] || 'font/ttf';
  }
}

export const templateEngine = new TemplateEngine();
