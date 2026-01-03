import { Page } from 'playwright-core';
import { browserPool } from './browserPool';
import sharp from 'sharp';

interface RenderPageOptions {
  html: string;
  css: string;
  width: number;
  height: number;
  variables?: Record<string, string>;
  serverBaseUrl: string;
}

export async function renderHtmlToImage(options: RenderPageOptions): Promise<Buffer> {
  const { html, css, width, height, variables = {}, serverBaseUrl } = options;
  
  return browserPool.usePage(async (page) => {
    await page.setViewportSize({ width, height });
    
    let processedHtml = html;
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
  ${processedHtml}
</body>
</html>`;

    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
    
    const screenshot = await page.screenshot({ type: 'png', fullPage: true });
    
    // Compress with Sharp to JPEG
    return await sharp(screenshot)
      .jpeg({ quality: 85 })
      .toBuffer();
  });
}
