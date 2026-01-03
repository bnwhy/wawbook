import puppeteer, { Browser } from 'puppeteer';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

async function launchBrowser(): Promise<Browser> {
  console.log('[pageRenderer] Launching new browser instance...');
  return puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || CHROMIUM_PATH,
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
  // No-op now since we create fresh browsers
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

export async function renderHtmlToImage(options: RenderPageOptions): Promise<Buffer> {
  const { html, css, width, height, imageMap = {}, variables = {}, baseUrl = '' } = options;
  
  const browser = await launchBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    
    let processedHtml = html;
    
    // Convert relative image paths to absolute URLs
    if (baseUrl) {
      // Replace /objects/... paths with absolute URLs
      processedHtml = processedHtml.replace(
        /src=["'](\/objects\/[^"']+)["']/gi,
        `src="${baseUrl}$1"`
      );
      // Also handle other relative paths
      processedHtml = processedHtml.replace(
        /src=["'](\/[^"']+)["']/gi,
        (match, path) => {
          if (path.startsWith('/objects/')) {
            return `src="${baseUrl}${path}"`;
          }
          return match;
        }
      );
    }
    
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
    
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chewy&family=Nunito:wght@400;500;600;700&family=Patrick+Hand&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
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
  ${extractBodyContent(processedHtml)}
</body>
</html>`;
    
    await page.setContent(fullHtml, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000 
    });
    
    // Wait for fonts to load
    await page.waitForFunction(() => {
      return (document as any).fonts.ready.then(() => true);
    }, { timeout: 10000 }).catch(() => {
      console.log('[pageRenderer] Font loading timeout, continuing...');
    });
    
    // Wait for images to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).every(img => img.complete);
    }, { timeout: 10000 }).catch(() => {});
    
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    });
    
    return screenshot as Buffer;
  } finally {
    await page.close();
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
