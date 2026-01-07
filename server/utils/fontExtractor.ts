import fs from 'fs';
import path from 'path';

interface FontInfo {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  format: string;
  filePath: string;
}

interface ExtractResult {
  processedCss: string;
  fonts: FontInfo[];
}

export async function extractFontsFromCss(
  cssContent: string,
  bookId: string,
  assetsBasePath: string
): Promise<ExtractResult> {
  const fonts: FontInfo[] = [];
  let processedCss = cssContent;

  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = fontFaceRegex.exec(cssContent)) !== null) {
    matches.push(match);
  }

  for (const match of matches) {
    const fontFaceBlock = match[0];
    const fontFaceContent = match[1];

    const fontFamilyMatch = fontFaceContent.match(/font-family\s*:\s*([^;]+)/i);
    const fontWeightMatch = fontFaceContent.match(/font-weight\s*:\s*([^;]+)/i);
    const fontStyleMatch = fontFaceContent.match(/font-style\s*:\s*([^;]+)/i);
    const srcMatch = fontFaceContent.match(/src\s*:\s*url\s*\(\s*["']?(data:font\/([^;]+);base64,([^"')]+))["']?\)/i);

    if (!srcMatch || !fontFamilyMatch) {
      continue;
    }

    const fontFamily = fontFamilyMatch[1].trim().replace(/['"]/g, '');
    const fontWeight = fontWeightMatch ? fontWeightMatch[1].trim() : 'normal';
    const fontStyle = fontStyleMatch ? fontStyleMatch[1].trim() : 'normal';
    const fontFormat = srcMatch[2].toLowerCase();
    const base64Data = srcMatch[3];

    let extension = 'ttf';
    let formatValue = 'truetype';
    if (fontFormat.includes('otf') || fontFormat.includes('opentype')) {
      extension = 'otf';
      formatValue = 'opentype';
    } else if (fontFormat.includes('woff2')) {
      extension = 'woff2';
      formatValue = 'woff2';
    } else if (fontFormat.includes('woff')) {
      extension = 'woff';
      formatValue = 'woff';
    }

    const sanitizedFontFamily = fontFamily.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fontFileName = `${sanitizedFontFamily}-${fontWeight}-${fontStyle}.${extension}`;
    
    const fontsDir = path.join(assetsBasePath, 'books', bookId, 'fonts');
    await fs.promises.mkdir(fontsDir, { recursive: true });
    
    const fontFilePath = path.join(fontsDir, fontFileName);
    const fontBuffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(fontFilePath, fontBuffer);

    const fontUrl = `/assets/books/${bookId}/fonts/${fontFileName}`;

    const newFontFace = `@font-face {
  font-family: '${fontFamily}';
  src: url('${fontUrl}') format('${formatValue}');
  font-weight: ${fontWeight};
  font-style: ${fontStyle};
}`;

    processedCss = processedCss.replace(fontFaceBlock, newFontFace);

    fonts.push({
      fontFamily,
      fontWeight,
      fontStyle,
      format: formatValue,
      filePath: fontUrl
    });

    console.log(`[fontExtractor] Extracted font: ${fontFamily} (${fontWeight}/${fontStyle}) -> ${fontUrl}`);
  }

  return { processedCss, fonts };
}
