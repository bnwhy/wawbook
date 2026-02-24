import { BookProduct, ImageCondition } from '../types/admin';
import { BookConfig } from '../types';

// Import du module de text-fitting (auto-ajustement de taille de police)
import { calculateTextFitScale, calculateSegmentsFitScale } from './textFitter';

// Import des fonctions de résolution de texte conditionnel
// @ts-ignore - Import depuis le serveur
import { resolveConditionalText } from '../../../server/services/object_storage/utils/conditionalTextResolver';

/**
 * Checks if all image conditions are satisfied by the current wizard selections.
 * 
 * @param conditions - Array of conditions that must all be satisfied
 * @param selections - Current wizard selections: { [tabId]: { [variantId]: optionId } }
 * @param book - Optional book to help resolve tab/variant relationships
 * @returns true if all conditions are satisfied, false otherwise
 */
export const matchesImageConditions = (
  conditions: ImageCondition[] | undefined,
  selections: Record<string, Record<string, any>>,
  book?: BookProduct
): boolean => {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  
  const result = conditions.every(cond => {
    // Normalize the condition values for comparison
    const normalizedVariantId = cond.variantId.toLowerCase().trim();
    const normalizedOptionId = cond.optionId.toLowerCase().trim();
    
    // Strategy 1: For characteristic-based wizards, tabId often equals variantId
    // Try direct lookup: selections[variantId][variantId] = optionId
    const directTabSelections = selections[cond.variantId];
    if (directTabSelections) {
      // Check exact match
      if (directTabSelections[cond.variantId] === cond.optionId) {
        return true;
      }
      // Check normalized match
      const selectedValue = directTabSelections[cond.variantId];
      if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
        return true;
      }
    }
    
    // Strategy 2: Search through all tabs to find where this variant exists
    // This handles cases like tabId="father", variantId="haircolor"
    for (const [tabId, tabSelections] of Object.entries(selections)) {
      // Check exact variant ID match in this tab's selections
      if (tabSelections[cond.variantId] === cond.optionId) {
        return true;
      }
      // Check normalized match
      const selectedValue = tabSelections[cond.variantId];
      if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
        return true;
      }
      
      // Also check if tabId matches variantId (characteristic-based wizard)
      // e.g., tabId="hair", variantId="hair"
      const normalizedTabId = tabId.toLowerCase().trim();
      if (normalizedTabId === normalizedVariantId) {
        // For characteristic-based: tabId="hair", variantId="hair"
        // Check all variants in this tab
        for (const [variantKey, variantValue] of Object.entries(tabSelections)) {
          if (variantKey.toLowerCase().trim() === normalizedVariantId) {
            const normalizedVariantValue = String(variantValue).toLowerCase().trim();
            if (normalizedVariantValue === normalizedOptionId) {
              return true;
            }
          }
        }
      }
    }
    
    // Strategy 3: If we have the book config, try to find the tab that contains this variant
    if (book?.wizardConfig?.tabs) {
      for (const tab of book.wizardConfig.tabs) {
        if (tab.type === 'character' && tab.variants) {
          for (const variant of tab.variants) {
            // Check if variant ID matches (exact or normalized)
            const variantIdMatches = variant.id === cond.variantId || 
                                    variant.id.toLowerCase().trim() === normalizedVariantId;
            
            if (variantIdMatches) {
              // Found the tab containing this variant
              const tabSelections = selections[tab.id] || {};
              
              // Check exact match
              if (tabSelections[cond.variantId] === cond.optionId) {
                return true;
              }
              
              // Check normalized match
              const selectedValue = tabSelections[cond.variantId];
              if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
                return true;
              }
              
              // Also check if variant.id is in tabSelections (for characteristic-based)
              if (tabSelections[variant.id] === cond.optionId) {
                return true;
              }
              const variantSelectedValue = tabSelections[variant.id];
              if (variantSelectedValue && String(variantSelectedValue).toLowerCase().trim() === normalizedOptionId) {
                return true;
              }
            }
          }
        }
      }
    }
    
    return false; // Condition not satisfied
  });
  return result;
};

/**
 * Resolves the effective combination key based on user configuration and book wizard config.
 * For example: "hair:brown_hero:father_skin:light" (sorted alphabetically)
 * 
 * Structure: config.characters[tabId][variantId] = selectedOptionId
 * For characteristic-based wizard: tabId = variantId = characteristic key (e.g., 'hero', 'skin')
 */
export const getCombinationKey = (book: BookProduct, config: BookConfig): string => {
  if (!book.wizardConfig || !book.wizardConfig.tabs) return 'default';
  
  const characteristicParts: string[] = [];
  
  book.wizardConfig.tabs.forEach((tab: any) => {
      if (tab.type === 'character' && config.characters?.[tab.id]) {
          tab.variants?.forEach((v: any) => {
              if (v.type === 'options' || v.type === 'color') {
                  const selectedOptId = config.characters![tab.id][v.id];
                  if (selectedOptId) {
                      characteristicParts.push(`${v.id}:${selectedOptId}`);
                  }
              }
          });
      }
  });
  
  if (characteristicParts.length === 0) return 'default';
  characteristicParts.sort();
  return characteristicParts.join('_');
};

/**
 * Loads an image from a URL and returns a Promise resolving to HTMLImageElement
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

/**
 * Mappe les valeurs d'alignement IDML/CSS vers Canvas textAlign.
 * Canvas ne supporte que: 'left', 'center', 'right', 'start', 'end'
 * 
 * @param textAlign - Valeur CSS textAlign (peut être 'justify')
 * @param textAlignLast - Alignement de la dernière ligne (pour les textes justifiés)
 * @param idmlJustification - Valeur IDML originale (ex: 'RightJustified')
 * @returns Valeur compatible avec Canvas textAlign
 */
function mapTextAlignToCanvas(
  textAlign: string | undefined,
  textAlignLast: string | undefined,
  idmlJustification: string | undefined
): CanvasTextAlign {
  // Si on a la valeur IDML originale, l'utiliser pour un mapping précis
  if (idmlJustification) {
    switch (idmlJustification) {
      case 'LeftAlign':
      case 'LeftJustified':
        return 'left';
      case 'CenterAlign':
      case 'CenterJustified':
        return 'center';
      case 'RightAlign':
      case 'RightJustified':
        return 'right';
      case 'FullyJustified':
        return 'left'; // Canvas ne supporte pas justify, approximation
      case 'ToBindingSide':
        return 'left';
      case 'AwayFromBindingSide':
        return 'right';
      default:
        return 'left';
    }
  }
  
  // Fallback sur textAlign CSS
  if (textAlign === 'justify') {
    // Pour justify, utiliser textAlignLast comme guide (alignement de la dernière ligne)
    return (textAlignLast as CanvasTextAlign) || 'left';
  }
  
  return (textAlign as CanvasTextAlign) || 'left';
}

/**
 * Rend les segments conditionnels avec leurs styles spécifiques sur le Canvas
 */
function renderConditionalSegments(
  ctx: CanvasRenderingContext2D,
  layer: any, // TextElement
  wizardSelections: Record<string, Record<string, string>>,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  config?: BookConfig,
  fontScale: number = 4
) {
  if (!layer.conditionalSegments || layer.conditionalSegments.length === 0) {
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  if (rotation) {
    ctx.rotate(rotation * Math.PI / 180);
  }

  // No clip - text fitting handles overflow

  // Filtrer les segments actifs selon les conditions
  const activeSegments = layer.conditionalSegments.filter((segment: any) => {
    if (!segment.condition) return true;
    
    // Vérifier si la condition est satisfaite
    if (segment.parsedCondition) {
      const { character: tabId, variant: variantId, option: optionId } = segment.parsedCondition;
      
      // Mapper hero-* vers le tabId du wizard
      const wizardTabId = tabId.startsWith('hero-') ? tabId.replace(/^hero-/, '') : tabId;
      const tabSelections = wizardSelections[wizardTabId];
      
      return tabSelections && tabSelections[variantId] === optionId;
    }
    
    return true;
  });

  // === TEXT FITTING : Calcul du facteur d'échelle pour que le texte tienne ===
  // Fonction de résolution des variables pour le fitting
  const resolveSegmentVariables = (text: string): string => {
    let resolved = text;
    // Résoudre TXTVAR system variables
    resolved = resolved.replace(/\{TXTVAR_dedication\}/gi, config?.dedication || '');
    resolved = resolved.replace(/\{TXTVAR_author\}/gi, config?.author || '');
    // Résoudre TXTVAR wizard variables
    resolved = resolved.replace(/\{TXTVAR_([^_}]+(?:-[^_}]+)?)_([^}]+)\}/g, (_match: string, tabId: string, variantId: string) => {
      const heroPrefix = 'hero-';
      const wizardTabId = tabId.startsWith(heroPrefix) ? tabId.substring(heroPrefix.length) : tabId;
      // Try direct tab + variantId lookup
      const directTab = wizardSelections[wizardTabId] || wizardSelections[tabId];
      if (directTab && directTab[variantId]) return directTab[variantId];
      // Fallback: search all tabs for a key matching variantId or a text value (for name/nom)
      for (const tab of Object.values(wizardSelections)) {
        if (tab && typeof tab === 'object') {
          if (tab[variantId]) return tab[variantId];
          // For 'name' variantId, look for common French equivalents
          if (variantId === 'name' && (tab['nom'] || tab['prenom'] || tab['name'])) {
            return tab['nom'] || tab['prenom'] || tab['name'];
          }
        }
      }
      // Ultimate fallback: childName from config
      if (variantId === 'name' && config?.childName) return config.childName;
      return '';
    });

    return resolved;
  };
  
  // Calculer le facteur de réduction uniforme pour tous les segments
  // On utilise h complet car topOffset < 1 ligne et le fitting gère le débordement
  const textFitScaleFactor = h > 0 
    ? calculateSegmentsFitScale(ctx, activeSegments, w, h, layer.style || {}, resolveSegmentVariables, fontScale)
    : 1.0;  // === FIN TEXT FITTING ===

  // Configuration commune (du style global du layer comme fallback)
  const globalStyle = layer.style || {};
  const globalFontSize = parseFloat(globalStyle.fontSize || '16') * fontScale * textFitScaleFactor;
  const globalLineHeight = globalFontSize * (parseFloat(globalStyle.lineHeight || '1.2'));
  
  // Parse textIndent from global style
  let textIndent = 0;
  if (globalStyle.textIndent) {
    const ti = globalStyle.textIndent;
    if (typeof ti === 'string' && ti.endsWith('pt')) {
      textIndent = parseFloat(ti) * 4;
    } else if (typeof ti === 'number') {
      textIndent = ti * 4;
    }
  }

  // Alignement du texte
  const textAlign = globalStyle.textAlign || 'left';
  let canvasAlign: CanvasTextAlign = 'left';
  if (textAlign === 'center') canvasAlign = 'center';
  else if (textAlign === 'right') canvasAlign = 'right';
  else if (textAlign === 'justify') canvasAlign = 'left'; // Justification manuelle

  // Rendu segment par segment
  const lines: Array<{segments: Array<{text: string, style: any}>, isFirstLine: boolean}> = [];
  let currentLine: Array<{text: string, style: any}> = [];
  let currentLineWidth = 0;
  let isFirstLineOfPara = true;

  for (const segment of activeSegments) {
    const segmentStyle = segment.resolvedStyle || globalStyle;
    // Extraire les propriétés de style du segment (avec text-fitting scale appliqué)
    const fontSize = parseFloat(segmentStyle.fontSize?.toString() || '16') * fontScale * textFitScaleFactor;
    const fontFamily = segmentStyle.fontFamily || 'serif';
    const fontWeight = segmentStyle.fontWeight || 'normal';
    const fontStyle = segmentStyle.fontStyle || 'normal';
    const color = segmentStyle.color || '#000000';
    const textTransform = (segmentStyle.textTransform && segmentStyle.textTransform !== 'none')
      ? segmentStyle.textTransform
      : (globalStyle.textTransform || 'none');
    const strokeColor = segmentStyle.strokeColor || segmentStyle.webkitTextStroke || segmentStyle.webkitTextStrokeColor
      || globalStyle.strokeColor || globalStyle.webkitTextStroke || globalStyle.webkitTextStrokeColor;
    const strokeWeight = segmentStyle.strokeWeight || (segmentStyle.webkitTextStrokeWidth ? parseFloat(segmentStyle.webkitTextStrokeWidth) : undefined)
      || globalStyle.strokeWeight || (globalStyle.webkitTextStrokeWidth ? parseFloat(globalStyle.webkitTextStrokeWidth) : undefined);
    const horizontalScale = (segmentStyle.idmlHorizontalScale || globalStyle.idmlHorizontalScale || 100) / 100;

    // Letter spacing
    let letterSpacing = 0;
    if (segmentStyle.letterSpacing && segmentStyle.letterSpacing !== 'normal') {
      const ls = segmentStyle.letterSpacing;
      if (typeof ls === 'string' && ls.endsWith('em')) {
        letterSpacing = parseFloat(ls) * fontSize;
      } else if (typeof ls === 'number') {
        letterSpacing = ls * fontSize; // Assume em unit
      }
    }

    // Résoudre les variables dans le texte
    let text = segment.text || '';
    
    // First resolve TXTVAR system variables (dedication, author)
    // IMPORTANT: Si vide, remplacer par chaîne vide (ne pas afficher {TXTVAR_...})
    text = text.replace(/\{TXTVAR_dedication\}/gi, config?.dedication || '');
    text = text.replace(/\{TXTVAR_author\}/gi, config?.author || '');
    
    // Then resolve TXTVAR wizard variables (tabId_variantId)
    // IMPORTANT: Si la variable n est pas resolue, remplacer par chaine vide
    text = text.replace(/\{TXTVAR_([^_]+)_([^}]+)\}/g, (_match: string, tabId: string, variantId: string) => {
      const heroPrefix = 'hero-';
      const wizardTabId = tabId.startsWith(heroPrefix) ? tabId.substring(heroPrefix.length) : tabId;
      const tabSelections = wizardSelections[wizardTabId];
      if (tabSelections && tabSelections[variantId]) {
        return ' ' + tabSelections[variantId] + ' ';
      }
      return '';
    });

    // Appliquer text-transform
    if (textTransform === 'uppercase') {
      text = text.toUpperCase();
    } else if (textTransform === 'lowercase') {
      text = text.toLowerCase();
    }

    // Word wrapping avec styles mixtes
    const paragraphs = text.split('\n');
    
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const words = para.split(' ');
      
      for (const word of words) {
        if (!word) continue;
        
        const testWord = word + ' ';
        
        // Configurer le contexte pour mesurer
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(testWord);
        const wordWidth = metrics.width + (letterSpacing * testWord.length);
        
        const maxWidth = isFirstLineOfPara ? w - textIndent : w;
        
        if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
          // Nouvelle ligne
          lines.push({ segments: currentLine, isFirstLine: isFirstLineOfPara });
          currentLine = [];
          currentLineWidth = 0;
          isFirstLineOfPara = false;
        }
        
        currentLine.push({
          text: testWord,
          style: {
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            color,
            letterSpacing,
            strokeColor,
            strokeWeight,
            horizontalScale
          }
        });
        currentLineWidth += wordWidth;
      }
      
      // Fin de paragraphe
      if (pIdx < paragraphs.length - 1) {
        lines.push({ segments: currentLine, isFirstLine: isFirstLineOfPara });
        currentLine = [];
        currentLineWidth = 0;
        isFirstLineOfPara = true;
      }
    }
  }

  // Ajouter la dernière ligne
  if (currentLine.length > 0) {
    lines.push({ segments: currentLine, isFirstLine: isFirstLineOfPara });
  }

  // Mesurer le vrai débordement supérieur avec la police réellement chargée
  let topOffset = 0;
  if (lines.length > 0 && lines[0].segments.length > 0) {
    const s0 = lines[0].segments[0];
    ctx.font = `${s0.style.fontStyle} ${s0.style.fontWeight} ${s0.style.fontSize}px ${s0.style.fontFamily}`;
    ctx.textBaseline = 'top';
    const m = ctx.measureText('ÀÉHg');
    // Avec textBaseline='top': actualBoundingBoxAscent > 0 = glyphes AU-DESSUS du point y
    // → décaler currentY vers le bas pour que le haut des glyphes soit à y=0
    topOffset = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : 0;
  }

  // Rendu des lignes
  let currentY = topOffset;
  for (const line of lines) {
    let currentX = line.isFirstLine ? textIndent : 0;
    
    if (canvasAlign === 'center') {
      // Calculer la largeur totale de la ligne
      let lineWidth = 0;
      for (const seg of line.segments) {
        ctx.font = `${seg.style.fontStyle} ${seg.style.fontWeight} ${seg.style.fontSize}px ${seg.style.fontFamily}`;
        lineWidth += ctx.measureText(seg.text).width + (seg.style.letterSpacing * seg.text.length);
      }
      currentX = (w - lineWidth) / 2;
    } else if (canvasAlign === 'right') {
      let lineWidth = 0;
      for (const seg of line.segments) {
        ctx.font = `${seg.style.fontStyle} ${seg.style.fontWeight} ${seg.style.fontSize}px ${seg.style.fontFamily}`;
        lineWidth += ctx.measureText(seg.text).width + (seg.style.letterSpacing * seg.text.length);
      }
      currentX = w - lineWidth;
    }
    
    // Rendre chaque segment de la ligne
    for (const seg of line.segments) {
      ctx.save();
      ctx.font = `${seg.style.fontStyle} ${seg.style.fontWeight} ${seg.style.fontSize}px ${seg.style.fontFamily}`;
      ctx.fillStyle = seg.style.color;
      ctx.textBaseline = 'top';
      
      // Configurer le strokeColor si présent (contour du texte)
      const hasStroke = seg.style.strokeColor && seg.style.strokeWeight;
      if (hasStroke) {
        ctx.strokeStyle = seg.style.strokeColor;
        ctx.lineWidth = seg.style.strokeWeight * fontScale;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
      }
      
      // Rendre le texte caractère par caractère avec letter-spacing
      if (seg.style.letterSpacing > 0) {
        for (const char of seg.text) {
          if (hasStroke) {
            ctx.strokeText(char, currentX, currentY);
          }
          ctx.fillText(char, currentX, currentY);
          currentX += ctx.measureText(char).width + seg.style.letterSpacing;
        }
      } else {
        if (hasStroke) {
          ctx.strokeText(seg.text, currentX, currentY);
        }
        ctx.fillText(seg.text, currentX, currentY);
        // Mesurer le mot + espace séparément car measureText ignore les trailing spaces
        const wordWidth = ctx.measureText(seg.text.trimEnd()).width;
        const spaceWidth = seg.text.endsWith(' ') ? ctx.measureText(' ').width : 0;
        currentX += wordWidth + spaceWidth;
      }
      ctx.restore();
    }
    
    currentY += globalLineHeight;
  }

  ctx.restore();
}

/**
 * Simulates backend generation of book pages as JPGs.
 * Returns a map of pageIndex -> Data URL (base64 encoded JPG).
 */
export const generateBookPages = async (
  book: BookProduct, 
  config: BookConfig, 
  combinationKey: string = 'default',
  onProgress?: (progress: number) => void
): Promise<Record<number, string>> => {
  
  const pages: Record<number, string> = {};

  // Charger les fonts custom du livre via FontFace API avant le rendu canvas
  const usedFontFamilies = new Set<string>();
  book.contentConfig?.texts?.forEach(t => {
    const ff = t.style?.fontFamily as string;
    if (ff) usedFontFamilies.add(ff.replace(/["']/g, '').trim());
    t.conditionalSegments?.forEach((seg: any) => {
      const sff = seg.resolvedStyle?.fontFamily as string;
      if (sff) usedFontFamilies.add(sff.replace(/["']/g, '').trim());
    });
  });
  // Cache statique pour éviter les rechargements multiples
  const _loadedFonts: Set<string> = (generateBookPages as any)._loadedFonts 
    || ((generateBookPages as any)._loadedFonts = new Set<string>());

  const fontLoadPromises: Promise<void>[] = [];
  for (const fontFamily of usedFontFamilies) {
    if (!fontFamily || fontFamily === 'serif' || fontFamily === 'sans-serif') continue;
    if (_loadedFonts.has(fontFamily)) continue; // déjà chargée avec succès
    const baseName = fontFamily.replace(/ /g, '');
    const variants = [
      `/assets/books/${book.id}/font/${baseName}.ttf`,
      `/assets/books/${book.id}/font/${baseName}.otf`,
      `/assets/books/${book.id}/font/${baseName}-Regular.ttf`,
      `/assets/books/${book.id}/font/${baseName}-Regular.otf`,
      `/assets/books/${book.id}/font/${fontFamily.replace(/ /g, '_')}.ttf`,
      `/assets/books/${book.id}/font/${fontFamily.replace(/ /g, '_')}-Regular.ttf`,
      `/assets/books/${book.id}/font/${fontFamily.replace(/ /g, '-')}.ttf`,
      `/assets/books/${book.id}/font/${fontFamily.replace(/ /g, '-')}-Regular.ttf`,
    ];
    const tryLoad = async () => {
      for (const url of variants) {
        try {
          const ff = new FontFace(fontFamily, `url('${url}')`);
          const loaded = await ff.load();
          document.fonts.add(loaded);
          _loadedFonts.add(fontFamily);
          return;
        } catch { /* essayer suivant */ }
      }
    };
    fontLoadPromises.push(tryLoad());
  }
  if (fontLoadPromises.length > 0) {
    await Promise.allSettled(fontLoadPromises);
    await document.fonts.ready;
  }
  
  let maxPage = book.features?.pages || 20;
  
  // Scan content to find actual max page usage
  const allElements = [
      ...(book.contentConfig?.texts || []), 
      ...(book.contentConfig?.imageElements || []),
      ...(book.contentConfig?.images || [])
  ];
  
  allElements.forEach(el => {
      const p = 'pageIndex' in el ? el.pageIndex : el.position?.pageIndex;
      if (typeof p === 'number' && p < 900) { // Ignore 999 (back cover) for max page calc
          maxPage = Math.max(maxPage, p);
      }
  });

  // Canvas dimensions: use EPUB page dims if available (IDML books), else features.dimensions or default 210
  const epubPageDims = book.contentConfig?.pages?.[0];
  const hasHtmlPages = !!(epubPageDims?.width);
  const pageDims = hasHtmlPages
    ? { width: epubPageDims!.width, height: epubPageDims!.height }
    : (book.features?.dimensions || { width: 210, height: 210 });
  const width = pageDims.width * 4;
  const height = pageDims.height * 4;

  // IDML/EPUB: positions are in page CSS pixels → multiply by 4 (same as canvas scale)
  // Non-IDML: positions are percentages (0-100) → divide by 100, multiply by canvas size
  const posScaleW = hasHtmlPages ? pageDims.width : 100;
  const posScaleH = hasHtmlPages ? pageDims.height : 100;
  // IDML font sizes are in pt. CSS at 96dpi: 1pt = 96/72 px. Canvas scale is ×4.
  // IDML font sizes are in pt. EPUB CSS positions are at 72dpi (1pt=1px).
  // Canvas is at 4x resolution. At 96dpi screen, 1pt = 96/72 px → fontScale = (96/72)*4
  const fontScale = hasHtmlPages ? (96 / 72) * 4 : 4;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
      console.error("Could not get canvas context");
      return {};
  }

  // Helper to replace text variables
  const resolveText = (text: string) => {
      let content = text;
      
      // 1. Handle {{variable}} style (Admin Dashboard standard)
      content = content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const k = key.trim();
          if (k === 'childName') return config.childName || 'Enfant';
          if (k === 'age') return config.age?.toString() || '';
          if (k === 'dedication') return config.dedication || '';
          if (k === 'author') return config.author || '';
          if (k === 'heroName') return config.childName || 'Héros';
          if (k === 'gender') return config.gender || 'Garçon';
          
          // Try to find in custom characters config if it matches a variant ID
          // Structure: config.characters[tabId] = selectedValue (for options) or value (for text)
          // But here we only have the variant ID (k). We'd need to know which tab it belongs to.
          // For now, let's assume standard variables are the main use case.
          
          return match;
      });

      // 2. Handle {TXTVAR_*} style (IDML variables)
      content = content.replace(/\{TXTVAR_dedication\}/gi, config.dedication || '');
      content = content.replace(/\{TXTVAR_author\}/gi, config.author || '');
      content = content.replace(/\{TXTVAR_([^_}]+(?:-[^_}]+)?)_([^}]+)\}/g, (_match, tabId, variantId) => {
        const heroPrefix = 'hero-';
        const wizardTabId = tabId.startsWith(heroPrefix) ? tabId.substring(heroPrefix.length) : tabId;
        const directTab = (config.characters || {})[wizardTabId] || (config.characters || {})[tabId];
        if (directTab && directTab[variantId]) return directTab[variantId];
        for (const tab of Object.values(config.characters || {})) {
          if (tab && typeof tab === 'object') {
            if ((tab as any)[variantId]) return (tab as any)[variantId];
            if (variantId === 'name') return (tab as any)['nom'] || (tab as any)['prenom'] || (tab as any)['name'] || '';
          }
        }
        if (variantId === 'name' && config.childName) return config.childName;
        return '';
      });

      // 3. Handle legacy [variable] style
      content = content.replace(/\[childName\]/gi, config.childName || 'Enfant');
      content = content.replace(/\[age\]/gi, config.age?.toString() || '');
      content = content.replace(/\[dedication\]/gi, config.dedication || '');
      content = content.replace(/\[author\]/gi, config.author || '');
      
      return content;
  };

  // Generate each page
  // Use configured pages from content.json if available
  const relevantPages = new Set<number>();
  
  if (book.contentConfig?.pages && book.contentConfig.pages.length > 0) {
    // Use pages defined in content.json
    book.contentConfig.pages.forEach(page => {
      if (page.pageIndex !== undefined) relevantPages.add(page.pageIndex);
    });
  } else {
    // Fallback: generate all pages up to maxPage
    for(let i=1; i<=maxPage; i++) relevantPages.add(i);
  }
  
  // Add cover (0) and back cover (999) only if they have content
  // Check both img.pageIndex (for background images) and img.position.pageIndex (for imageElements)
  if (book.contentConfig?.images?.some(img => (img as any).pageIndex === 0) ||
      book.contentConfig?.imageElements?.some(img => img.position?.pageIndex === 0) ||
      book.contentConfig?.texts?.some(txt => txt.position?.pageIndex === 0)) {
    relevantPages.add(0);
  }
  if (book.contentConfig?.images?.some(img => (img as any).pageIndex === 999) ||
      book.contentConfig?.imageElements?.some(img => img.position?.pageIndex === 999) ||
      book.contentConfig?.texts?.some(txt => txt.position?.pageIndex === 999)) {
    relevantPages.add(999);
  }
  
  // Sort pages to process in order
  const pageIndices = Array.from(relevantPages).sort((a,b) => a - b);
  const totalPages = pageIndices.length;
  let processedPages = 0;
  
  for (const pageIndex of pageIndices) {
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Background Image
      const bgImage = book.contentConfig?.images?.find(
          img => img.pageIndex === pageIndex && (img.combinationKey === combinationKey || img.combinationKey === 'default' || img.combinationKey === 'all')
      );
      
      if (bgImage) {
          try {
              const img = await loadImage(bgImage.imageUrl);
              ctx.drawImage(img, 0, 0, width, height);
          } catch (e) {
              console.warn(`Failed to load background for page ${pageIndex}`, e);
          }
      }
      
      // 2. Draw Image Elements (Layers)
      const imageLayers = book.contentConfig?.imageElements?.filter(
          el => {
            // Must be on the correct page
            if (el.position.pageIndex !== pageIndex) return false;
            
            // Check combinationKey match
            const keyMatches = !el.combinationKey || 
                              el.combinationKey === combinationKey || 
                              el.combinationKey === 'default' || 
                              el.combinationKey === 'all';
            
            // Check conditions match (if conditions exist, they must all be satisfied)
            const conditionsMatch = matchesImageConditions(el.conditions, config.characters || {}, book);            
            // Image is included if either:
            // - No conditions AND key matches, OR
            // - Conditions exist AND all are satisfied (key check is secondary)
            if (el.conditions && el.conditions.length > 0) {
              return conditionsMatch; // Conditions take precedence
            }
            
            return keyMatches; // Fall back to key matching if no conditions
          }
      ) || [];
      
      // Sort by layer if available
       imageLayers.sort((a, b) => (a.position.layer || 0) - (b.position.layer || 0));
      
      for (const layer of imageLayers) {
          if (layer.url) {
             try {
                 const img = await loadImage(layer.url);
                 
                 const x = (layer.position.x || 0) / posScaleW * width;
                 const y = (layer.position.y || 0) / posScaleH * height;
                 const w = (layer.position.width || posScaleW) / posScaleW * width;
                 const h = (layer.position.height || posScaleH) / posScaleH * height;
                 
                 ctx.save();
                 // Move to center of image for rotation
                 ctx.translate(x + w/2, y + h/2);
                 if (layer.position.rotation) ctx.rotate(layer.position.rotation * Math.PI / 180);
                 ctx.drawImage(img, -w/2, -h/2, w, h); // Draw centered
                 ctx.restore();
             } catch (e) {
                 console.warn(`Failed to load layer ${layer.label}`, e);
             }
          }
      }

      // 3. Draw Text Elements
      const textLayers = book.contentConfig?.texts?.filter(
          el => el.position.pageIndex === pageIndex &&
                (!el.combinationKey || el.combinationKey === combinationKey || el.combinationKey === 'default' || el.combinationKey === 'all')
      ) || [];
      
      for (const layer of textLayers) {
          // Déterminer si on doit utiliser le rendu par segments ou le rendu classique
          const hasConditionalSegmentsWithStyles = layer.conditionalSegments && 
                                                   layer.conditionalSegments.length > 0 &&
                                                   layer.conditionalSegments.some((seg: any) => seg.resolvedStyle);          
          if (hasConditionalSegmentsWithStyles) {              
              // Rendu segment-par-segment avec styles spécifiques
              const x = (layer.position.x || 0) / posScaleW * width;
              const y = (layer.position.y || 0) / posScaleH * height;
              const w = (layer.position.width || posScaleW * 0.3) / posScaleW * width;
              const h = (layer.position.height || posScaleH * 0.3) / posScaleH * height;
              const rotation = layer.position.rotation || 0;
              
              renderConditionalSegments(ctx, layer, config.characters || {}, x, y, w, h, rotation, config, fontScale);
              continue; // Passer au layer suivant
          }          
          // Rendu classique (code existant)
          let text = resolveText(layer.content);
          
          ctx.save();
          const x = (layer.position.x || 0) / posScaleW * width;
          const y = (layer.position.y || 0) / posScaleH * height;
          const w = (layer.position.width || posScaleW * 0.3) / posScaleW * width;
          const h = (layer.position.height || posScaleH * 0.3) / posScaleH * height;

          ctx.translate(x, y);
          if (layer.position.rotation) {
             ctx.rotate(layer.position.rotation * Math.PI / 180);
          }
          // Clip: allow ascenders above (same logic as renderConditionalSegments)
          ctx.beginPath();
          ctx.rect(0, -h * 0.5, w, h * 1.5);
          ctx.clip();
          
          // Extract style properties
          const originalFontSize = parseFloat((layer.style?.fontSize as string) || '16') * fontScale;
          let fontSize = originalFontSize; // Sera ajusté par le text-fitting si nécessaire
          const fontFamily = (layer.style?.fontFamily as string) || 'serif';
          const fontWeight = (layer.style?.fontWeight as string) || 'normal';
          const fontStyle = (layer.style?.fontStyle as string) || 'normal'; // italic/oblique
          const color = (layer.style?.color as string) || '#000000';
          const textTransform = (layer.style?.textTransform as string) || 'none';          const canvasAlign = mapTextAlignToCanvas(
            layer.style?.textAlign as string,
            layer.style?.textAlignLast as string,
            (layer.style as any)?.idmlJustification as string
          );
          
          // Parse lineHeight from style (ex: "1.2" or "14.4pt")
          let lineHeightMultiplier = 1.2; // default
          if (layer.style?.lineHeight) {
            const lh = layer.style.lineHeight as string;
            if (lh.endsWith('pt')) {
              // Absolute lineHeight in points
              const lhPt = parseFloat(lh);
              const fontSizePt = parseFloat((layer.style?.fontSize as string) || '12');
              if (!isNaN(lhPt) && !isNaN(fontSizePt) && fontSizePt > 0) {
                lineHeightMultiplier = lhPt / fontSizePt;
              }
            } else {
              // Relative lineHeight (unitless)
              const lhValue = parseFloat(lh);
              if (!isNaN(lhValue) && lhValue > 0) {
                lineHeightMultiplier = lhValue;
              }
            }
          }
          // lineHeight basé sur pt×4 (pas fontScale) pour fidélité InDesign
          const fontSizePt = parseFloat((layer.style?.fontSize as string) || '16');
          let lineHeight = fontSizePt * 4 * lineHeightMultiplier;
          
          // Parse textIndent (ex: "12pt" or "0")
          let textIndent = 0;
          if (layer.style?.textIndent) {
            const ti = layer.style.textIndent as string;
            if (ti.endsWith('pt')) {
              textIndent = parseFloat(ti) * 4;
            } else {
              textIndent = parseFloat(ti) * 4;
            }
          }
          
          // Parse letterSpacing (ex: "0.05em" or "normal")
          let letterSpacing = 0;
          if (layer.style?.letterSpacing && layer.style.letterSpacing !== 'normal') {
            const ls = layer.style.letterSpacing as string;
            if (ls.endsWith('em')) {
              letterSpacing = parseFloat(ls) * fontSize;
            } else if (ls.endsWith('px')) {
              letterSpacing = parseFloat(ls);
            }
          }
          
          // Apply text transform
          if (textTransform === 'uppercase') {
            text = text.toUpperCase();
          } else if (textTransform === 'lowercase') {
            text = text.toLowerCase();
          }
          
          // === TEXT FITTING : Ajuster la taille de police pour que le texte tienne ===
          if (h > 0 && text.trim()) {
            const fitResult = calculateTextFitScale(ctx, text, w, h, {
              originalFontSize: originalFontSize,
              fontFamily,
              fontWeight,
              fontStyle,
              lineHeightMultiplier,
              letterSpacing,
              textIndent
            });
            
            // Appliquer le scale si nécessaire
            if (fitResult.scale < 1) {
              fontSize = fitResult.fittedFontSize;
              // Recalculer lineHeight basé sur pt×4×scale
              lineHeight = fontSizePt * 4 * fitResult.scale * lineHeightMultiplier;
              if (layer.style?.letterSpacing && (layer.style.letterSpacing as string).endsWith('em')) {
                letterSpacing = parseFloat(layer.style.letterSpacing as string) * fontSize;
              }            }
          }
          // === FIN TEXT FITTING ===
          
          // Configure canvas context
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = canvasAlign;
          ctx.textBaseline = 'top';

          // topOffset: décaler vers le bas pour éviter rognage des ascendantes
          const classicMeasure = ctx.measureText('ÀÉHg');
          const classicTopOffset = classicMeasure.actualBoundingBoxAscent > 0 ? classicMeasure.actualBoundingBoxAscent : 0;

          // Stroke (contour) depuis style
          const classicStrokeColor = (layer.style as any)?.strokeColor || (layer.style as any)?.webkitTextStrokeColor;
          const classicStrokeWeight = (layer.style as any)?.strokeWeight;
          if (classicStrokeColor && classicStrokeWeight) {
            ctx.strokeStyle = classicStrokeColor;
            ctx.lineWidth = classicStrokeWeight * fontScale;
            ctx.lineJoin = 'round';
          }

          // Apply baseline shift if present (approximation via translate)
          let baselineShift = 0;
          if (layer.style?.baselineShift) {
            const bs = layer.style.baselineShift as string;
            if (bs.endsWith('pt')) {
              baselineShift = -parseFloat(bs) * 4;
            }
          }
          
          
          // Word wrapping with paragraph support
          const lines: Array<{text: string, isFirstLine: boolean}> = [];
          const paragraphs = text.split('\n');
          
          for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
              const para = paragraphs[pIdx];
              const paraWords = para.split(' ');
              let line = '';
              let isFirstLineOfPara = true;
              
              for (let n = 0; n < paraWords.length; n++) {
                  const testLine = line + paraWords[n] + ' ';
                  // Measure with letter spacing approximation
                  const metrics = ctx.measureText(testLine);
                  const effectiveWidth = metrics.width + (letterSpacing * testLine.length);
                  const maxWidth = isFirstLineOfPara ? w - textIndent : w;
                  
                  if (effectiveWidth > maxWidth && n > 0) {
                      lines.push({ text: line, isFirstLine: isFirstLineOfPara });
                      line = paraWords[n] + ' ';
                      isFirstLineOfPara = false;
                  } else {
                      line = testLine;
                  }
              }
              lines.push({ text: line, isFirstLine: isFirstLineOfPara });
          }
          
          // Calculate margin top offset
          let marginTopOffset = 0;
          if (layer.style?.marginTop) {
            const mt = layer.style.marginTop as string;
            if (mt.endsWith('pt')) {
              marginTopOffset = parseFloat(mt) * 4;
            }
          }
          
          // Draw lines with proper positioning and decorations
          lines.forEach((lineObj, idx) => {
            let lineText = lineObj.text;
            if (!lineText.trim()) return; // Skip empty lines
            
            // Trim trailing spaces for proper alignment (especially for right/center)
            // But keep leading spaces for left alignment
            if (canvasAlign === 'right' || canvasAlign === 'center') {
              lineText = lineText.trimEnd();
            }
            
            let xPos = 0;
            const yPos = classicTopOffset + idx * lineHeight + marginTopOffset + baselineShift;
            
            // Apply text indent to first line
            const indent = lineObj.isFirstLine ? textIndent : 0;
            
            if (canvasAlign === 'center') {
              xPos = w / 2;
            } else if (canvasAlign === 'right') {
              // Pour l'alignement à droite, textIndent affecte uniquement le wrapping (maxWidth), pas l'ancre
              xPos = w;
            } else { // left or start
              xPos = indent;
            }
            
            // Draw text with letter spacing
            if (letterSpacing !== 0) {
              // Manual letter spacing - need to draw character by character
              const savedAlign = ctx.textAlign;
              ctx.textAlign = 'left'; // Force left alignment for character-by-character drawing
              
              let currentX = xPos;
              const totalWidth = ctx.measureText(lineText).width + (letterSpacing * lineText.length);
              
              if (canvasAlign === 'center') {
                currentX = xPos - totalWidth / 2;
              } else if (canvasAlign === 'right') {
                currentX = xPos - totalWidth;
              }
              
              for (const char of lineText) {
                ctx.fillText(char, currentX, yPos);
                currentX += ctx.measureText(char).width + letterSpacing;
              }
              
              ctx.textAlign = savedAlign; // Restore original alignment
            } else {
              if (classicStrokeColor && classicStrokeWeight) ctx.strokeText(lineText, xPos, yPos);
              ctx.fillText(lineText, xPos, yPos);
            }
            
            // Text decoration (underline, line-through)
            if (layer.style?.textDecoration && layer.style.textDecoration !== 'none') {
              const decoration = layer.style.textDecoration as string;
              const metrics = ctx.measureText(lineText);
              const textWidth = metrics.width + (letterSpacing * lineText.length);
              
              let decorationY = yPos;
              let decorationX = xPos;
              
              if (canvasAlign === 'center') {
                decorationX = xPos - textWidth / 2;
              } else if (canvasAlign === 'right') {
                decorationX = xPos - textWidth;
              }
              
              ctx.strokeStyle = color;
              ctx.lineWidth = Math.max(1, fontSize * 0.05);
              
              if (decoration.includes('underline')) {
                decorationY = yPos + fontSize * 0.85;
                ctx.beginPath();
                ctx.moveTo(decorationX, decorationY);
                ctx.lineTo(decorationX + textWidth, decorationY);
                ctx.stroke();
              }
              
              if (decoration.includes('line-through')) {
                decorationY = yPos + fontSize * 0.45;
                ctx.beginPath();
                ctx.moveTo(decorationX, decorationY);
                ctx.lineTo(decorationX + textWidth, decorationY);
                ctx.stroke();
              }
            }
          });
          
          ctx.restore();
      }
      
      // Export page
      pages[pageIndex] = canvas.toDataURL('image/jpeg', 0.8);
      
      // Report progress if callback provided
      processedPages++;
      if (onProgress) {
        const progress = (processedPages / totalPages) * 100;
        onProgress(progress);
      }
  }

  return pages;
};
