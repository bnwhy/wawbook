import { chromium, Browser } from 'playwright-core';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

async function launchBrowser(): Promise<Browser> {
  console.log('[pageRenderer] Launching Playwright browser instance...');
  return chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  });
}

export async function closeBrowser(): Promise<void> {
  // No-op now since we create fresh browsers per render
}

interface RenderPageOptions {
  html: string;
  css: string;
  width: number;
  height: number;
  imageMap?: Record<string, string>;
  variables?: Record<string, string>;
  baseUrl?: string;
}

interface FontInfo {
  family: string;
  src: string;
  weight?: string;
  style?: string;
}

function extractFontsFromCss(css: string): FontInfo[] {
  const fonts: FontInfo[] = [];
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi;
  
  let match;
  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    console.log(`[pageRenderer] Processing @font-face block`);
    
    const familyMatch = block.match(/font-family\s*:\s*["']?([^;"']+)["']?\s*;?/i);
    
    // Improved regex to capture full base64 data URI - match everything between url(" and ")
    let srcMatch = block.match(/src\s*:\s*url\(\s*["'](data:[^"']+)["']\s*\)/i);
    if (!srcMatch) {
      // Try without quotes around the URL
      srcMatch = block.match(/src\s*:\s*url\(\s*(data:[^)]+)\s*\)/i);
    }
    
    const weightMatch = block.match(/font-weight\s*:\s*([^;]+)\s*;?/i);
    const styleMatch = block.match(/font-style\s*:\s*([^;]+)\s*;?/i);
    
    console.log(`[pageRenderer] Font family: ${familyMatch ? familyMatch[1] : 'NOT FOUND'}`);
    console.log(`[pageRenderer] Font src found: ${srcMatch ? 'YES (length: ' + srcMatch[1].length + ')' : 'NO'}`);
    
    if (familyMatch && srcMatch) {
      fonts.push({
        family: familyMatch[1].trim(),
        src: srcMatch[1],
        weight: weightMatch ? weightMatch[1].trim() : 'normal',
        style: styleMatch ? styleMatch[1].trim() : 'normal',
      });
      console.log(`[pageRenderer] Found embedded font: ${familyMatch[1].trim()}, src length: ${srcMatch[1].length}`);
    } else {
      console.log(`[pageRenderer] Failed to extract font - family: ${!!familyMatch}, src: ${!!srcMatch}`);
    }
  }
  
  console.log(`[pageRenderer] Total fonts extracted: ${fonts.length}`);
  return fonts;
}

function generateFontPreloadScript(fonts: FontInfo[]): string {
  if (fonts.length === 0) return '';
  
  const fontLoaders = fonts.map((font, i) => {
    return `
      (function() {
        try {
          const font${i} = new FontFace('${font.family}', 'url(${font.src})', {
            weight: '${font.weight}',
            style: '${font.style}'
          });
          fontPromises.push(
            font${i}.load().then(function(loadedFont) {
              document.fonts.add(loadedFont);
              console.log('[fontPreload] Loaded: ${font.family}');
            }).catch(function(err) {
              console.error('[fontPreload] Failed to load ${font.family}:', err);
            })
          );
        } catch(e) {
          console.error('[fontPreload] Error creating FontFace for ${font.family}:', e);
        }
      })();
    `;
  }).join('\n');
  
  return `
    <script>
      (function() {
        var fontPromises = [];
        ${fontLoaders}
        window.__fontsLoaded = Promise.all(fontPromises).then(function() {
          console.log('[fontPreload] All fonts loaded');
          return true;
        });
      })();
    </script>
  `;
}

export async function renderHtmlToImage(options: RenderPageOptions): Promise<Buffer> {
  const { html, css, width, height, imageMap = {}, variables = {}, baseUrl = '' } = options;
  
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  
  try {
    let processedHtml = html;
    
    // Convert image paths to HTTP URLs via Express server
    const serverBaseUrl = 'http://localhost:5000';
    
    // Convert /assets/books/... images to HTTP URLs
    processedHtml = processedHtml.replace(
      /src=["'](\/assets\/books\/[^"']+)["']/gi,
      (match, path) => {
        const httpUrl = `${serverBaseUrl}${path}`;
        return `src="${httpUrl}"`;
      }
    );
    
    // Fallback: Convert other /assets/... paths to HTTP URLs
    processedHtml = processedHtml.replace(
      /src=["'](\/assets\/[^"']+)["']/gi,
      (match, path) => {
        if (match.includes('http://') || match.includes('https://')) return match;
        const httpUrl = `${serverBaseUrl}${path}`;
        return `src="${httpUrl}"`;
      }
    );
    
    for (const [originalPath, newPath] of Object.entries(imageMap)) {
      const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const absolutePath = baseUrl ? `${baseUrl}${newPath}` : newPath;
      const regex = new RegExp(`(src=["'])([^"']*${escapedPath})["']`, 'gi');
      processedHtml = processedHtml.replace(regex, `$1${absolutePath}"`);
      
      const simpleFilename = originalPath.split('/').pop();
      if (simpleFilename) {
        const simpleRegex = new RegExp(`(src=["'])([^"']*${simpleFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi');
        processedHtml = processedHtml.replace(simpleRegex, `$1${absolutePath}"`);
      }
    }
    
    for (const [key, value] of Object.entries(variables)) {
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        new RegExp(`\\{${key}\\}`, 'g'),
      ];
      for (const pattern of patterns) {
        processedHtml = processedHtml.replace(pattern, value);
      }
    }
    
    // Extract fonts from CSS for preloading via FontFace API
    const embeddedFonts = extractFontsFromCss(css);
    const fontPreloadScript = generateFontPreloadScript(embeddedFonts);
    
    let processedCss = css;
    
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
    ${processedCss}
  </style>
</head>
<body>
  ${extractBodyContent(processedHtml)}
</body>
</html>`;
    
    await page.setContent(fullHtml, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for fonts to be loaded via FontFace API
    if (embeddedFonts.length > 0) {
      await page.evaluate(() => {
        return (window as any).__fontsLoaded || Promise.resolve();
      }).catch((err) => {
        console.log('[pageRenderer] Font preload error:', err.message);
      });
      
      // Also wait for document.fonts.ready as a fallback
      await page.evaluate(() => {
        return document.fonts.ready;
      }).catch(() => {});
    }
    
    // Wait for images to load and ensure they loaded successfully
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).every(img => img.complete && img.naturalWidth > 0);
    }, { timeout: 15000 }).catch((err) => {
      console.log('[pageRenderer] Image loading timeout or error:', err.message);
    });
    
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    });
    
    return Buffer.from(screenshot);
  } finally {
    await context.close();
    await browser.close();
  }
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  return html;
}

export interface PageRenderResult {
  pageIndex: number;
  imageUrl: string;
}

export async function renderPagesToImages(
  rawHtmlPages: Array<{ html: string; width: number; height: number; pageIndex: number }>,
  cssContent: string,
  imageMap: Record<string, string>,
  variables: Record<string, string>,
  uploadImage: (buffer: Buffer, filename: string) => Promise<string>
): Promise<PageRenderResult[]> {
  const results: PageRenderResult[] = [];
  
  for (const page of rawHtmlPages) {
    try {
      const imageBuffer = await renderHtmlToImage({
        html: page.html,
        css: cssContent,
        width: page.width || 595,
        height: page.height || 842,
        imageMap,
        variables,
      });
      
      const filename = `page_${page.pageIndex}.png`;
      const imageUrl = await uploadImage(imageBuffer, filename);
      
      results.push({
        pageIndex: page.pageIndex,
        imageUrl,
      });
    } catch (error) {
      console.error(`Failed to render page ${page.pageIndex}:`, error);
    }
  }
  
  return results;
}
