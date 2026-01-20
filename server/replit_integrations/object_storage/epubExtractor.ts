/**
 * Module pour l'extraction et le traitement des fichiers EPUB
 * 
 * ⚠️ IMPORTANT : L'EPUB contient uniquement la structure visuelle et les positions.
 * 
 * L'EPUB fournit :
 * - Les images du storyboard
 * - Les conteneurs de texte VIDES (positions uniquement via CSS)
 * - Le CSS pour extraire les positions et transformations (x, y, width, height, rotation, scale)
 * - Les dimensions des pages
 * 
 * L'EPUB ne contient PAS :
 * - Le contenu textuel (vient de l'IDML)
 * - Les polices / fontFamily (vient de l'IDML)
 * - Les styles de texte (fontSize, color, fontWeight, etc. - viennent de l'IDML)
 * - La mise en forme (vient de l'IDML)
 * 
 * Résumé : EPUB = images + positions + conteneurs vides | IDML = texte + mise en forme complète
 */

import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { cleanCssSyntax, detectFontIssues, FontWarning } from './utils/cssHelpers';
import { parseImageFilename, ImageCharacteristics } from './utils/filenameParser';
import { buildWizardConfigFromCharacteristics, WizardTabServer } from './wizardConfigBuilder';

interface EpubExtractionResult {
  success: boolean;
  bookId: string;
  assetsPath: string;
  images: Record<string, string>;
  cssContent: string;
  pages: Array<{ width: number; height: number; pageIndex: number }>;
  textPositions: Array<any>;
  imageElements: Array<any>;
  fontWarnings: FontWarning[];
  generatedWizardTabs: WizardTabServer[];
  detectedCharacteristics: Record<string, string[]>;
  cssFontMapping: Record<string, string>; // Maps CSS class/selector to fontFamily
}

/**
 * Extrait un fichier EPUB depuis un buffer vers le stockage local du serveur
 * 
 * L'EPUB contient :
 * - Images : toutes les images du storyboard
 * - Conteneurs de texte vides : positions uniquement (x, y, width, height)
 * - CSS : pour extraire les positions et transformations
 * - Dimensions : largeur et hauteur de chaque page
 * 
 * L'EPUB ne contient PAS :
 * - Le contenu textuel → vient de l'IDML
 * - Les polices / fontFamily → vient de l'IDML
 * - La mise en forme (fontSize, color, styles) → vient de l'IDML
 */
export async function extractEpubFromBuffer(
  epubBuffer: Buffer,
  bookId: string
): Promise<EpubExtractionResult> {
  // Crée les répertoires locaux pour ce livre
  const bookAssetsDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId);
  const imagesDir = path.join(bookAssetsDir, 'images');
  const htmlDir = path.join(bookAssetsDir, 'html');
  
  await fs.promises.mkdir(imagesDir, { recursive: true });
  await fs.promises.mkdir(htmlDir, { recursive: true });

  // Extrait le ZIP
  const zip = await JSZip.loadAsync(epubBuffer);
  
  const imageMap: Record<string, string> = {};
  const htmlFiles: string[] = [];
  const htmlContent: Record<string, string> = {};
  const cssContent: Record<string, string> = {};
  
  // Suivi des caractéristiques des images pour la génération de la config wizard
  const imageCharacteristicsMap: Record<string, ImageCharacteristics> = {};
  const allCharacteristics: Record<string, Set<string>> = {};
  
  // Extrait tous les fichiers
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const fileName = relativePath.split('/').pop() || relativePath;
    
    // Traite les images
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
      await extractImage(zipEntry, fileName, relativePath, imagesDir, bookId, imageMap, imageCharacteristicsMap, allCharacteristics);
    }
    // Traite HTML/XHTML (les polices de l'EPUB sont ignorées - doivent être uploadées manuellement)
    else if (/\.(xhtml|html)$/i.test(relativePath)) {
      const content = await zipEntry.async('string');
      htmlFiles.push(relativePath);
      htmlContent[relativePath] = content;
      
      const localPath = path.join(htmlDir, fileName);
      await fs.promises.writeFile(localPath, content, 'utf-8');
    }
    // Traite CSS
    else if (/\.css$/i.test(relativePath)) {
      const content = await zipEntry.async('string');
      cssContent[relativePath] = content;
      
      const localPath = path.join(htmlDir, fileName);
      await fs.promises.writeFile(localPath, content, 'utf-8');
    }
  }

  // Traite le CSS (nettoyage syntaxique uniquement, pas d'extraction de polices)
  const allCss = cleanCssSyntax(Object.values(cssContent).join('\n'));
  
  // Sauvegarde le CSS traité
  const processedCssPath = path.join(htmlDir, 'styles.css');
  await fs.promises.writeFile(processedCssPath, allCss, 'utf-8');

  // Traite chaque page HTML
  const contentHtmlFiles = htmlFiles
    .filter(f => 
      !f.toLowerCase().includes('toc') && 
      !f.toLowerCase().includes('nav') &&
      !f.toLowerCase().includes('cover')
    )
    .sort();
  
  const pagesDimensions: Array<{ width: number; height: number; pageIndex: number }> = [];
  const textPositions: Array<any> = [];
  const extractedImages: Array<any> = [];

  for (let i = 0; i < contentHtmlFiles.length; i++) {
    const result = await processHtmlPage(
      htmlContent[contentHtmlFiles[i]] || '',
      i,
      allCss,
      imageMap,
      imageCharacteristicsMap,
      bookId
    );
    
    pagesDimensions.push(result.pageDimension);
    textPositions.push(...result.textPositions);
    extractedImages.push(...result.images);
  }

  // Détecte les problèmes de polices (fontMap vide car polices doivent être uploadées manuellement)
  const fontWarnings = detectFontIssues(allCss, {});
  if (fontWarnings.length > 0) {
    console.log(`[epub-extract] Font warnings: ${fontWarnings.length}`);
    fontWarnings.forEach(w => console.log(`  - [${w.severity}] ${w.fontFamily}: ${w.reason}`));
  }

  // Génère la configuration wizard depuis les caractéristiques détectées
  const generatedWizardTabs = buildWizardConfigFromCharacteristics(allCharacteristics);
  
  // Extrait le mapping class -> fontFamily depuis le CSS (pour compatibilité uniquement)
  // ⚠️ Ce mapping n'est PAS utilisé - les polices doivent venir de l'IDML
  const cssFontMapping = extractCssFontMapping(allCss);
  console.log(`[epub-extract] CSS font mapping extracted: ${Object.keys(cssFontMapping).length} classes (NOT USED - fonts must come from IDML)`);
  
  console.log(`[epub-extract] =============== EXTRACTION COMPLETE ===============`);
  console.log(`[epub-extract] Images: ${Object.keys(imageMap).length}`);
  console.log(`[epub-extract] Text zones: ${textPositions.length}, Image elements: ${extractedImages.length}`);
  console.log(`[epub-extract] Note: Fonts must be uploaded manually (not extracted from EPUB)`);
  console.log(`[epub-extract] ===================================================`);

  return {
    success: true,
    bookId,
    assetsPath: `/assets/books/${bookId}`,
    images: imageMap,
    cssContent: allCss,
    pages: pagesDimensions,
    textPositions,
    imageElements: extractedImages,
    fontWarnings,
    generatedWizardTabs,
    detectedCharacteristics: Object.fromEntries(
      Object.entries(allCharacteristics).map(([key, values]) => [key, Array.from(values)])
    ),
    cssFontMapping,
  };
}

/**
 * Extrait une image du ZIP et la sauvegarde localement
 */
async function extractImage(
  zipEntry: any,
  fileName: string,
  relativePath: string,
  imagesDir: string,
  bookId: string,
  imageMap: Record<string, string>,
  imageCharacteristicsMap: Record<string, ImageCharacteristics>,
  allCharacteristics: Record<string, Set<string>>
): Promise<void> {
  const imageBuffer = await zipEntry.async('nodebuffer');
  const localPath = path.join(imagesDir, fileName);
  await fs.promises.writeFile(localPath, imageBuffer);
  
  const serverPath = `/assets/books/${bookId}/images/${fileName}`;
  imageMap[relativePath] = serverPath;
  imageMap[fileName] = serverPath;
  
  // Parse le nom de fichier pour les caractéristiques
  const parsedFilename = parseImageFilename(fileName);
  imageCharacteristicsMap[fileName] = parsedFilename;
  
  // Collecte toutes les caractéristiques pour la génération de config wizard
  for (const [key, value] of Object.entries(parsedFilename.characteristics)) {
    if (!allCharacteristics[key]) {
      allCharacteristics[key] = new Set<string>();
    }
    allCharacteristics[key].add(value);
  }
  
  // Ajoute tous les chemins partiels
  const parts = relativePath.split('/');
  for (let i = 1; i < parts.length; i++) {
    const partialPath = parts.slice(i).join('/');
    if (!imageMap[partialPath]) {
      imageMap[partialPath] = serverPath;
    }
  }
}

/**
 * Traite une page HTML pour extraire les dimensions, textes et images
 */
async function processHtmlPage(
  pageHtml: string,
  pageIndex: number,
  allCss: string,
  imageMap: Record<string, string>,
  imageCharacteristicsMap: Record<string, ImageCharacteristics>,
  bookId: string
): Promise<{
  pageDimension: { width: number; height: number; pageIndex: number };
  textPositions: Array<any>;
  images: Array<any>;
}> {
  // Parse les dimensions du viewport
  const viewportMatch = pageHtml.match(/width[=:](\d+).*?height[=:](\d+)/i);
  const pageWidth = viewportMatch ? parseInt(viewportMatch[1]) : 595;
  const pageHeight = viewportMatch ? parseInt(viewportMatch[2]) : 842;
  
  // Remplace les chemins d'images avec les chemins du serveur
  for (const [originalPath, serverPath] of Object.entries(imageMap)) {
    const patterns = [
      new RegExp(`src=["']([^"']*${originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})["']`, 'gi'),
      new RegExp(`src=["']([^"']*${originalPath.split('/').pop()?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''})["']`, 'gi'),
    ];
    for (const pattern of patterns) {
      pageHtml = pageHtml.replace(pattern, `src="${serverPath}"`);
    }
  }
  
  const $ = cheerio.load(pageHtml);
  const textPositions: Array<any> = [];
  const extractedImages: Array<any> = [];
  
  // Extrait les zones de texte
  const textSelectors = [
    'div.Bloc-de-texte-standard',
    'div[id^="_idContainer"]',
    'div.text-frame',
    'div.textframe',
    'div[class*="text"]',
    'body > div[id]',
  ];
  
  let $textContainers = $();
  for (const selector of textSelectors) {
    $textContainers = $(selector);
    if ($textContainers.length > 0) break;
  }
  
  $textContainers.each((index, element) => {
    const $element = $(element);
    const containerId = $element.attr('id') || `textblock-${pageIndex}-${index}`;
    
    if ($element.find('img').length > 0 || !$element.text().trim()) {
      return; // Ignore les conteneurs avec images ou sans texte
    }
    
    const position = extractPositionFromCss(containerId, allCss);
    
    textPositions.push({
      containerId,
      pageIndex: pageIndex + 1,
      position,
    });
  });
  
  // Extrait les images
  const imageContainers = $('div[id^="_idContainer"]');
  imageContainers.each((index, element) => {
    const $container = $(element);
    const $img = $container.find('img').first();
    if ($img.length === 0) return;
    
    const containerId = $container.attr('id') || `container-${index}`;
    const imgSrc = $img.attr('src') || '';
    const srcFilename = imgSrc.split('/').pop() || '';
    
    const position = extractPositionFromCss(containerId, allCss, pageWidth, pageHeight);
    const imgCharacteristics = imageCharacteristicsMap[srcFilename] || {
      pageIndex: null,
      characteristics: {},
      combinationKey: 'default'
    };
    
    const hasCharacteristics = Object.keys(imgCharacteristics.characteristics).length > 0;
    const imageType = hasCharacteristics ? 'personalized' : 'static';
    // Use actual page position in EPUB structure, ignore pageIndex from filename
    const effectivePageIndex = pageIndex + 1;
    
    extractedImages.push({
      id: `img-${bookId}-${effectivePageIndex}-${Math.random().toString(36).substr(2, 8)}`,
      type: imageType,
      label: $img.attr('class') || $img.attr('alt') || containerId,
      url: imgSrc,
      position: {
        ...position,
        pageIndex: effectivePageIndex,
      },
      combinationKey: imgCharacteristics.combinationKey,
      characteristics: hasCharacteristics ? imgCharacteristics.characteristics : undefined,
    });
  });
  
  return {
    pageDimension: {
      width: pageWidth,
      height: pageHeight,
      pageIndex: pageIndex + 1,
    },
    textPositions,
    images: extractedImages,
  };
}

/**
 * Extrait la position et les transformations CSS d'un élément
 * 
 * Le CSS de l'EPUB sert UNIQUEMENT à extraire les propriétés de layout :
 * - width, height : dimensions de l'élément
 * - transform: translate() : position x, y
 * - transform: rotate() : rotation
 * - transform: scale() : échelle
 */
function extractPositionFromCss(
  elementId: string,
  css: string,
  defaultWidth: number = 100,
  defaultHeight: number = 30
): {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  layer: number;
} {
  const idPattern = new RegExp(`#${elementId}[^{]*\\{([^}]+)\\}`, 'i');
  const cssMatch = css.match(idPattern);
  
  let translateX = 0, translateY = 0, rotation = 0, scaleX = 1, scaleY = 1;
  let width = defaultWidth, height = defaultHeight;
  
  if (cssMatch) {
    const cssBlock = cssMatch[1];
    const cssProps: Record<string, string> = {};
    
    const propRegex = /([a-z-]+)\s*:\s*([^;]+)/gi;
    let propMatch;
    while ((propMatch = propRegex.exec(cssBlock)) !== null) {
      cssProps[propMatch[1].toLowerCase().trim()] = propMatch[2].trim();
    }
    
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
    
    width = parseFloat(cssProps['width']) || width;
    height = parseFloat(cssProps['height']) || height;
  }
  
  return {
    x: translateX,
    y: translateY,
    width,
    height,
    rotation,
    scaleX,
    scaleY,
    layer: defaultHeight === 30 ? 50 : 10, // Texte = 50, Image = 10
  };
}

/**
 * Extrait le mapping class/selector -> fontFamily depuis le CSS de l'EPUB
 * 
 * ⚠️ ATTENTION : Ce mapping n'est PAS utilisé pour les polices.
 * Il est conservé pour compatibilité mais les polices doivent OBLIGATOIREMENT
 * être définies dans l'IDML.
 * 
 * Hiérarchie des polices (IDML UNIQUEMENT) :
 * 1. IDML Inline Character Properties (priorité la plus haute)
 * 2. IDML Applied Character Style
 * 3. IDML Paragraph Style
 * 
 * Si aucune police n'est trouvée dans l'IDML, c'est une erreur.
 */
function extractCssFontMapping(css: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Regex pour trouver les règles CSS avec font-family
  // Supporte les sélecteurs complexes comme "span.CharOverride-1", "p.ParaOverride-1", etc.
  const ruleRegex = /([\w.#\-\[\]=~^$*|:"\s,]+)\s*\{([^}]+)\}/gi;
  
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2];
    
    // Ignore les @font-face et les @-rules
    if (selector.toLowerCase().includes('font-face') || selector.startsWith('@')) {
      continue;
    }
    
    // Cherche font-family dans les déclarations
    const fontFamilyMatch = declarations.match(/font-family\s*:\s*([^;]+)/i);
    if (fontFamilyMatch) {
      // Nettoie la valeur font-family
      let fontFamily = fontFamilyMatch[1].trim();
      // Retire les quotes et prend la première police de la liste
      fontFamily = fontFamily.split(',')[0].trim().replace(/["']/g, '');
      
      // Stocke le mapping pour chaque sélecteur
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        if (sel && fontFamily) {
          mapping[sel] = fontFamily;
          // Extrait aussi juste le nom de la classe pour un fallback plus facile
          const classMatch = sel.match(/\.([\w\-]+)/);
          if (classMatch) {
            mapping[`.${classMatch[1]}`] = fontFamily;
          }
        }
      }
    }
  }
  
  return mapping;
}
