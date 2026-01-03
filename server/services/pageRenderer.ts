import { browserPool } from './browserPool';
import sharp from 'sharp';

export interface RenderPageOptions {
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
        const font${i} = new FontFace('${font.family}', 'url(${font.src})', {
          weight: '${font.weight}',
          style: '${font.style}'
        });
        fontPromises.push(
          font${i}.load().then(function(loadedFont) {
            document.fonts.add(loadedFont);
          }).catch(function(err) {})
        );
      } catch(e) {}
    })();
  `).join('\n');
  
  return `
    <script>
      (function() {
        var fontPromises = [];
        ${fontLoaders}
        window.__fontsLoaded = Promise.all(fontPromises);
      })();
    </script>
  `;
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

export async function renderHtmlToImage(options: RenderPageOptions): Promise<Buffer> {
  const { html, css, width, height, imageMap = {}, variables = {}, baseUrl = '' } = options;
  
  let processedHtml = html;
  
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
  
  const embeddedFonts = extractFontsFromCss(css);
  const fontPreloadScript = generateFontPreloadScript(embeddedFonts);
  
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
  ${extractBodyContent(processedHtml)}
</body>
</html>`;

  const imageBuffer = await browserPool.renderPage({
    html: fullHtml,
    width,
    height,
    format: 'jpeg',
    quality: 85,
  });

  return await sharp(imageBuffer)
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

export async function closeBrowser(): Promise<void> {
  await browserPool.shutdown();
}
