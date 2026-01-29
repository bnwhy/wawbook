import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { convertColorToHex } from './utils/colorConverter';
import { IdmlValidator } from './validators/IdmlValidator';
import {
  idmlLogger,
  logParsingStart,
  logParsingComplete,
  logParsingError,
  logValidation,
} from './utils/logger';
import { IdmlCorruptedFileError } from './errors/IdmlErrors';

/**
 * IDML Parser - Extrait les textes et styles depuis un fichier IDML InDesign
 * 
 * ⚠️ L'IDML est la SOURCE UNIQUE pour toutes les informations textuelles :
 * - Contenu textuel complet avec variables ({nom_enfant}, etc.)
 * - Polices (fontFamily) pour chaque zone de texte
 * - Styles de caractère (fontSize, fontWeight, fontStyle, color, letterSpacing, etc.)
 * - Styles de paragraphe (textAlign, lineHeight, marginTop, marginBottom, etc.)
 * - Palette de couleurs InDesign
 * - Textes conditionnels (AppliedConditions sur CharacterStyleRange)
 * - Variables de texte (TextVariableInstance)
 * 
 * L'EPUB fournit uniquement les positions des zones de texte, pas le contenu ni les polices.
 * 
 * ## Textes Conditionnels
 * 
 * Format des conditions : TXTCOND_tabId_variantId-optionId
 * Exemple : TXTCOND_hero-child_gender-boy
 * 
 * Format des variables : TXTVAR_tabId_variantId
 * Exemple : TXTVAR_hero-child_name
 * 
 * Mapping automatique : hero-child → child (pour compatibilité avec wizard existants)
 */

interface CharacterStyleProperties {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  letterSpacing: number;
  baselineShift: number;
  textDecoration: string;
  textTransform: string;
  
  // PRIORITY 1: Transformations et crénage
  horizontalScale?: number;      // HorizontalScale (100 = normal)
  verticalScale?: number;        // VerticalScale (100 = normal)
  skew?: number;                 // Skew en degrés
  kerningMethod?: string;        // Optical, Metrics, None
  ligatures?: boolean;           // Activer ligatures
  noBreak?: boolean;             // Empêcher coupure
  
  // PRIORITY 1: Couleurs et contours
  fillTint?: number;             // Teinte de couleur (0-100%)
  strokeColor?: string;          // Couleur du contour
  strokeTint?: number;           // Teinte du contour (0-100%)
  strokeWeight?: number;         // Épaisseur du contour en points
  overprintFill?: boolean;       // Surimpression du remplissage
  overprintStroke?: boolean;     // Surimpression du contour
  
  // PRIORITY 1: Soulignement et barré avancés
  underlineColor?: string;       // Couleur du soulignement
  underlineWeight?: number;      // Épaisseur du soulignement
  underlineOffset?: number;      // Décalage vertical du soulignement
  strikeThroughColor?: string;   // Couleur du barré
  strikeThroughWeight?: number;  // Épaisseur du barré
  strikeThroughOffset?: number;  // Décalage vertical du barré
  
  // PRIORITY 1: Position
  position?: string;             // Normal, Superscript, Subscript, etc.
  
  // PRIORITY 2: OpenType Features
  otfContextualAlternate?: boolean;
  otfDiscretionaryLigature?: boolean;
  otfFraction?: boolean;
  otfHistorical?: boolean;
  otfOrdinal?: boolean;
  otfSlashedZero?: boolean;
  otfSwash?: boolean;
  otfTitling?: boolean;
  otfStylisticSets?: string;     // Liste des stylistic sets (ex: "ss01 ss03")
  glyphForm?: string;            // JIS78, JIS83, Traditional, Expert, etc.
  
  // PRIORITY 2: Soulignement/barré - types
  underlineType?: string;        // Type de ligne soulignement
  strikeThroughType?: string;    // Type de ligne barré
}

interface ParagraphStyleProperties {
  textAlign: string;
  textAlignLast?: string;
  lineHeight: string;
  whiteSpace: string;
  marginTop: number;
  marginBottom: number;
  textIndent: number;
  // Font properties (when no CharacterStyle is applied)
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  
  // PRIORITY 1: Retraits
  leftIndent?: number;           // LeftIndent
  rightIndent?: number;          // RightIndent
  
  // PRIORITY 1: Césure
  hyphenate?: boolean;           // Hyphenation on/off
  
  // PRIORITY 1: Langue et composition
  appliedLanguage?: string;      // Langue appliquée (ex: $ID/French)
  composer?: string;             // Compositeur de paragraphe
  
  // PRIORITY 2: Interlignage avancé
  autoLeading?: number;          // AutoLeading en % (défaut 120)
  leadingModel?: string;         // LeadingModel (TopDown, Baseline, etc.)
  
  // PRIORITY 2: Lettrines
  dropCapCharacters?: number;    // Nombre de caractères en lettrine
  dropCapLines?: number;         // Nombre de lignes de hauteur
  
  // PRIORITY 2: Keep options (pagination)
  keepWithNext?: boolean;        // Garder avec paragraphe suivant
  keepLinesTogether?: boolean;   // Garder lignes ensemble
  keepFirstLines?: number;       // Nb lignes à garder au début
  keepLastLines?: number;        // Nb lignes à garder à la fin
  keepAllLinesTogether?: boolean;// Forcer toutes lignes ensemble
  
  // PRIORITY 2: Justification avancée (valeurs "desired")
  desiredLetterSpacing?: number; // Espacement lettres désiré (%)
  desiredWordSpacing?: number;   // Espacement mots désiré (%)
  desiredGlyphScaling?: number;  // Échelle glyphes désirée (%)
  
  // PRIORITY 2: Justification single word
  singleWordJustification?: string; // Comment justifier un mot seul
  balanceRaggedLines?: boolean;     // Équilibrer lignes non justifiées
  
  // PRIORITY 3: Direction (RTL support)
  paragraphDirection?: string;   // LeftToRightDirection | RightToLeftDirection
  
  // PRIORITY 3: Justification complète (min/max)
  minimumLetterSpacing?: number;
  maximumLetterSpacing?: number;
  minimumWordSpacing?: number;
  maximumWordSpacing?: number;
  minimumGlyphScaling?: number;
  maximumGlyphScaling?: number;
  
  // PRIORITY 3: Césure détaillée
  hyphenateBeforeLast?: number;      // Nb caractères avant dernier trait
  hyphenateAfterFirst?: number;      // Nb caractères après premier trait
  hyphenateCapitalizedWords?: boolean; // Césure des mots capitalisés
  hyphenateLadderLimit?: number;     // Nb max traits d'union consécutifs
  hyphenateWordsLongerThan?: number; // Longueur min des mots à couper
  hyphenationZone?: number;          // Zone de césure en points
  hyphenWeight?: number;             // Poids de la césure
  
  // PROPRIÉTÉS DE CARACTÈRE SUR PARAGRAPHSTYLE
  // Quand le ParagraphStyle définit des propriétés de caractère (sans CharacterStyle)
  paraHorizontalScale?: number;      // HorizontalScale défini sur ParagraphStyle
  paraTextTransform?: string;        // Capitalization défini sur ParagraphStyle
  paraColor?: string;                // FillColor défini sur ParagraphStyle
  paraLetterSpacing?: number;        // Tracking défini sur ParagraphStyle
  paraStrokeColor?: string;          // StrokeColor défini sur ParagraphStyle
  paraStrokeWeight?: number;         // StrokeWeight défini sur ParagraphStyle (en points)
}

/**
 * Segment conditionnel - un morceau de texte avec une condition optionnelle
 * Pattern de naming: TXTCOND_personnage_variant-option
 * Ex: TXTCOND_hero-child_gender-boy, TXTCOND_hero-child_gender-girl
 */
interface ConditionalTextSegment {
  text: string;                    // Le texte du segment
  condition?: string;              // Nom de la condition (ex: "TXTCOND_hero-child_gender-boy")
  parsedCondition?: {              // Condition parsée pour le matching wizard
    character: string;             // ex: "hero-child"
    variant: string;               // ex: "gender"
    option: string;                // ex: "boy"
  };
  variables?: string[];            // Variables dans ce segment (ex: ["name_child"])
  appliedCharacterStyle?: string;  // Style de caractère appliqué
  inlineCharProperties?: any;      // Propriétés inline de caractère au niveau du segment
}

interface TextFrameData {
  id: string;
  name: string;
  pageIndex: number;
  content: string;
  variables: string[];
  conditions?: Array<{ name: string; visible: boolean }>;
  // NOUVEAU: Segments conditionnels pour le texte conditionnel InDesign
  conditionalSegments?: ConditionalTextSegment[];
  // Liste des conditions uniques utilisées dans ce TextFrame
  availableConditions?: string[];
  appliedCharacterStyle?: string;
  appliedParagraphStyle?: string;
  localParaProperties?: any; // Local paragraph properties (overrides)
  inlineCharProperties?: any; // Inline character properties (font, size, etc.)
  // Position from IDML Spreads (if available)
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  layoutOrder?: number; // Order in spread (for deterministic matching)
  parentStory?: string; // Reference to the Story ID
}

interface IdmlData {
  characterStyles: Record<string, CharacterStyleProperties>;
  paragraphStyles: Record<string, ParagraphStyleProperties>;
  textFrames: TextFrameData[];
  colors: Record<string, string>;
  pageDimensions: Record<number, { width: number; height: number }>;
  fonts?: string[]; // List of unique font families used in the document
}

/**
 * Parse un fichier IDML (ZIP) et extrait tous les textes et styles
 * 
 * Extraction complète :
 * - characterStyles : tous les styles de caractère avec fontFamily, fontSize, color, etc.
 * - paragraphStyles : tous les styles de paragraphe avec textAlign, lineHeight, fontFamily, etc.
 * - textFrames : contenu textuel de chaque zone avec ses variables
 * - colors : palette de couleurs InDesign convertie en hex
 * - pageDimensions : dimensions des pages (pour vérification)
 */
export async function parseIdmlBuffer(idmlBuffer: Buffer): Promise<IdmlData> {
  const startTime = Date.now();
  
  // logParsingStart(); // Temporairement désactivé - cause erreur logPath
  
  const zip = await JSZip.loadAsync(idmlBuffer);
  
  // Valider la structure du package IDML avant de continuer
  // const validation = await IdmlValidator.validatePackage(zip);
  // logValidation(validation.valid, validation.errors, validation.warnings);
  
  // if (!validation.valid) {
  //   throw new IdmlCorruptedFileError(
  //     'IDML package',
  //     validation.errors.join('; ')
  //   );
  // }
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false, // Keep as strings to avoid parsing issues
    trimValues: false, // BUGFIX: Désactivé pour préserver les espaces dans le Content (les espaces sont importants pour la mise en forme)
    removeNSPrefix: true, // Remove namespace prefixes (idPkg:, etc.)
    isArray: (tagName) => {
      // Force ces éléments à être toujours des arrays pour gérer les multiples occurrences
      return ['Content', 'Br', 'ParagraphStyleRange', 'CharacterStyleRange'].includes(tagName);
    },
  });
  
  const result: IdmlData = {
    characterStyles: {},
    paragraphStyles: {},
    textFrames: [],
    colors: {},
    pageDimensions: {}
  };
  
  // 1. Extract colors from Resources/Swatches.xml AND Resources/Graphic.xml
  // BUGFIX: Les couleurs peuvent être dans Swatches.xml OU Graphic.xml
  try {
    const swatchesFile = zip.file('Resources/Swatches.xml');
    if (swatchesFile) {
      const swatchesXml = await swatchesFile.async('string');
      const swatchesData = parser.parse(swatchesXml);
      result.colors = extractColors(swatchesData);
    }
  } catch (e) {
  }
  
  // BUGFIX: Si pas de Swatches.xml ou si vide, essayer Graphic.xml
  if (Object.keys(result.colors).length === 0) {
    try {
      const graphicFile = zip.file('Resources/Graphic.xml');
      if (graphicFile) {
        const graphicXml = await graphicFile.async('string');
        const graphicData = parser.parse(graphicXml);
        result.colors = extractColors(graphicData);
      }
    } catch (e) {
    }
  }
  
  // 2. Extract Character Styles and Paragraph Styles from Styles.xml
  try {
    const stylesFile = zip.file('Resources/Styles.xml');
    if (stylesFile) {
      const stylesXml = await stylesFile.async('string');
      const stylesData = parser.parse(stylesXml);
      
      // Try different possible paths
      const possibleRoots = [
        stylesData,
        stylesData?.idPkg_Styles,
        stylesData?.Styles
      ];
      
      for (const root of possibleRoots) {
        if (root) {
          if (root.RootCharacterStyleGroup) {
          }
          if (root.RootParagraphStyleGroup) {
          }
        }
      }

      result.characterStyles = extractCharacterStyles(stylesData, result.colors);
      result.paragraphStyles = extractParagraphStyles(stylesData, result.colors);
      
    } else {
    }
  } catch (e) {
  }
  
  // 3. Extract all story contents into a map (storyId -> story data)
  const allFiles = Object.keys(zip.files);
  
  const storyFiles = allFiles.filter(f => f.match(/^Stories\/Story_.*\.xml$/i));
  
  // Map: storyId -> story content + styles + segments conditionnels
  const storiesMap: Record<string, {
    content: string;
    variables: string[];
    appliedCharacterStyle?: string;
    appliedParagraphStyle?: string;
    localParaProperties?: any;
    inlineCharProperties?: any;
    conditionalSegments?: ConditionalTextSegment[];
    availableConditions?: string[];
  }> = {};
  
  for (const storyPath of storyFiles) {
    try {
      const storyFile = zip.file(storyPath);
      if (storyFile) {
        const storyXml = await storyFile.async('string');
        const storyData = parser.parse(storyXml);
        
        // Extract story content (similar to extractTextFrames but store in map)
        const storyInfo = extractStoryContent(storyData);
        if (storyInfo && storyInfo.storyId && storyInfo.content) {
          storiesMap[storyInfo.storyId] = {
            content: storyInfo.content,
            variables: storyInfo.variables,
            appliedCharacterStyle: storyInfo.appliedCharStyle,
            appliedParagraphStyle: storyInfo.appliedParaStyle,
            localParaProperties: storyInfo.localParaProperties,
            inlineCharProperties: storyInfo.inlineCharProperties,
            // NOUVEAU: Segments conditionnels
            conditionalSegments: storyInfo.conditionalSegments,
            availableConditions: storyInfo.availableConditions
          };
        }
      }
    } catch (e) {
    }
  }
  
  
  // 4. Extract TextFrames from Spreads and link to story contents
  try {
    const spreadFiles = Object.keys(zip.files).filter(f => f.match(/^Spreads\/Spread_.*\.xml$/i));
    
    for (const spreadPath of spreadFiles) {
      const spreadFile = zip.file(spreadPath);
      if (spreadFile) {
        const spreadXml = await spreadFile.async('string');
        const spreadData = parser.parse(spreadXml);
        
        const { dimensions: pageDims, pagesInfo } = extractPageDimensionsAndPositions(spreadData);
        Object.assign(result.pageDimensions, pageDims);
        
        // Extract text frames from spreads (now creating TextFrameData entries)
        const textFramesFromSpread = extractTextFramesFromSpread(spreadData, pagesInfo, storiesMap);
        
        result.textFrames.push(...textFramesFromSpread);
      }
    }
  } catch (e) {
  }
  
  // Extract all unique fonts used in the document
  result.fonts = extractUsedFonts(result);
  
  // Log parsing statistics
  // const durationMs = Date.now() - startTime;
  // logParsingComplete({
  //   characterStyles: Object.keys(result.characterStyles).length,
  //   paragraphStyles: Object.keys(result.paragraphStyles).length,
  //   textFrames: result.textFrames.length,
  //   colors: Object.keys(result.colors).length,
  //   pages: Object.keys(result.pageDimensions).length,
  //   durationMs,
  // });
  
  return result;
}

/**
 * Extract colors from Swatches.xml OR Graphic.xml
 * BUGFIX: Les couleurs peuvent être dans deux emplacements différents:
 * - Swatches.xml: structure ColorGroup > Color
 * - Graphic.xml: structure directe avec éléments Color
 */
function extractColors(data: any): Record<string, string> {
  const colors: Record<string, string> = {};
  
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:421',message:'extractColors ENTRY',data:{hasColorGroup:!!data?.ColorGroup,hasGraphicRoot:!!(data?.idPkg_Graphic||data?.Graphic),dataKeys:Object.keys(data||{}).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H5'})}).catch(()=>{});
  // #endregion
  
  try {
    // Structure 1: Swatches.xml avec ColorGroup
    const colorGroup = data?.ColorGroup;
    if (colorGroup) {
      const swatches = Array.isArray(colorGroup) ? colorGroup : [colorGroup];
      
      // #region agent log
      fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:428',message:'ColorGroup found',data:{swatchesCount:swatches.length,isArray:Array.isArray(colorGroup)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      for (const swatch of swatches) {
        const colorSwatches = swatch?.Color;
        if (!colorSwatches) continue;
        
        const colorArray = Array.isArray(colorSwatches) ? colorSwatches : [colorSwatches];
        
        for (const color of colorArray) {
          const self = color['@_Self'];
          const name = color['@_Name'];
          const space = color['@_Space'];
          const colorValue = color['@_ColorValue'];
          
          if (self && colorValue) {
            const hexColor = convertColorToHex(space, colorValue);
            colors[self] = hexColor;
            if (name) {
              colors[name] = hexColor;
            }
            
            // #region agent log
            fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:442',message:'Color added from ColorGroup',data:{self,name,space,colorValue,hexColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3'})}).catch(()=>{});
            // #endregion
          }
        }
      }
    }
    
    // Structure 2: Graphic.xml avec Color directement sous la racine
    // Essayer différents chemins possibles
    const graphicRoot = data?.idPkg_Graphic || data?.Graphic || data;
    const directColors = graphicRoot?.Color;
    
    if (directColors) {
      const colorArray = Array.isArray(directColors) ? directColors : [directColors];
      
      // #region agent log
      fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:457',message:'Direct colors found',data:{colorsCount:colorArray.length,isArray:Array.isArray(directColors)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      for (const color of colorArray) {
        const self = color['@_Self'];
        const name = color['@_Name'];
        const space = color['@_Space'];
        const colorValue = color['@_ColorValue'];
        
        if (self && colorValue) {
          const hexColor = convertColorToHex(space, colorValue);
          colors[self] = hexColor;
          if (name && name !== '$ID/') {
            colors[name] = hexColor;
          }
          
          // #region agent log
          fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:467',message:'Color added from direct',data:{self,name,space,colorValue,hexColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3'})}).catch(()=>{});
          // #endregion
        }
      }
    }
  } catch (e) {
    // #region agent log
    fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:474',message:'extractColors ERROR',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H5'})}).catch(()=>{});
    // #endregion
  }
  
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:477',message:'extractColors EXIT',data:{totalColors:Object.keys(colors).length,colorKeys:Object.keys(colors).slice(0,10),colorValues:Object.values(colors).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  return colors;
}

// Fonction déplacée vers utils/colorConverter.ts

/**
 * Extract Character Styles from Styles.xml
 * 
 * Les Character Styles contiennent la police (fontFamily) et tous les styles de caractère.
 * Ils sont appliqués sur des portions de texte spécifiques.
 * 
 * Propriétés extraites :
 * - fontFamily : nom de la police (ex: "Minion Pro", "Arial Bold")
 * - fontSize : taille en points
 * - fontWeight, fontStyle : normal/bold, normal/italic
 * - color : couleur du texte en hex
 * - letterSpacing, baselineShift, textDecoration, textTransform
 * 
 * Gestion de l'héritage : si un style ne définit pas de police, on remonte
 * la chaîne BasedOn pour trouver la police héritée.
 */
export function extractCharacterStyles(
  stylesData: any,
  colors: Record<string, string>
): Record<string, CharacterStyleProperties> {
  const characterStyles: Record<string, CharacterStyleProperties> = {};
  
  try {
    // Try different possible root paths (XML parser transforms idPkg:Styles -> idPkg_Styles)
    const stylesRoot = stylesData?.idPkg_Styles || stylesData?.Styles || stylesData;
    
    const rootCharStyles = stylesRoot?.RootCharacterStyleGroup?.CharacterStyle;
    if (!rootCharStyles) {
      return characterStyles;
    }
    
    const charStylesArray = Array.isArray(rootCharStyles) ? rootCharStyles : [rootCharStyles];
    
    // First pass: Create a temporary map with raw data
    const rawStylesMap = new Map<string, any>();
    
    for (const charStyle of charStylesArray) {
      const self = charStyle['@_Self'];
      if (self) {
        rawStylesMap.set(self, charStyle);
        const name = charStyle['@_Name'];
        if (name && name !== '[None]') {
          rawStylesMap.set(name, charStyle);
        }
      }
    }
    
    // Second pass: Process each style with inheritance resolution
    for (const charStyle of charStylesArray) {
      const self = charStyle['@_Self'];
      const name = charStyle['@_Name'];
      
      if (!self) continue;
      
      const props = charStyle?.Properties || {};

      // Extract font properties from known IDML locations.
      // In practice, InDesign can store font info on:
      // - the style element itself (@_AppliedFont, @_PointSize, @_FontStyle)
      // - Properties (@_AppliedFont / AppliedFont element)
      // - Properties.CharacterStyleProperties (attributes)
      const embeddedCharProps = Array.isArray(props?.CharacterStyleProperties)
        ? props.CharacterStyleProperties[0]
        : props?.CharacterStyleProperties;

      const fontCandidates = [charStyle, props, embeddedCharProps].filter(Boolean);

      let fontFamily: string = '';
      let fontStyleName: string = '';
      let fontSize: number = 12;

      for (const c of fontCandidates) {
        if (!fontFamily) {
          const appliedFont =
            c['@_AppliedFont'] ||
            c['@_FontFamily'] ||
            (typeof c.AppliedFont === 'string' ? c.AppliedFont : c.AppliedFont?.['#text']);
          if (appliedFont) fontFamily = appliedFont;
        }
        if (!fontStyleName) {
          const fs = c['@_FontStyle'];
          if (fs) fontStyleName = String(fs).toLowerCase();
        }
        if (fontSize === 12) {
          const ps = c['@_PointSize'];
          const parsed = ps !== undefined ? parseFloat(ps) : NaN;
          if (!Number.isNaN(parsed)) fontSize = parsed;
        }
      }
      
      // If no font defined, check BasedOn (inheritance) - recursively
      if (!fontFamily) {
        let currentBasedOn = charStyle['@_BasedOn'];
        let depth = 0;
        const maxDepth = 10;
        
        while (!fontFamily && currentBasedOn && depth < maxDepth) {
          depth++;
          
          // Normalize BasedOn key - try multiple formats
          // BasedOn might be "CharacterStyle/$ID/..." but Self is "$ID/..."
          let parentStyle = rawStylesMap.get(currentBasedOn);
          if (!parentStyle && currentBasedOn.startsWith('CharacterStyle/')) {
            const normalizedKey = currentBasedOn.replace('CharacterStyle/', '');
            parentStyle = rawStylesMap.get(normalizedKey);
          }
          if (!parentStyle) {
            break;
          }
          
          const parentProps = parentStyle?.Properties || {};
          const parentEmbeddedCharProps = Array.isArray(parentProps?.CharacterStyleProperties)
            ? parentProps.CharacterStyleProperties[0]
            : parentProps?.CharacterStyleProperties;
          const parentCandidates = [parentStyle, parentProps, parentEmbeddedCharProps].filter(Boolean);
          
          for (const c of parentCandidates) {
            if (!fontFamily) {
              const appliedFont =
                c['@_AppliedFont'] ||
                c['@_FontFamily'] ||
                (typeof c.AppliedFont === 'string' ? c.AppliedFont : c.AppliedFont?.['#text']);
              if (appliedFont) fontFamily = appliedFont;
            }
            if (!fontStyleName) {
              const fs = c['@_FontStyle'];
              if (fs) fontStyleName = String(fs).toLowerCase();
            }
            if (fontSize === 12) {
              const ps = c['@_PointSize'];
              const parsed = ps !== undefined ? parseFloat(ps) : NaN;
              if (!Number.isNaN(parsed)) fontSize = parsed;
            }
          }
          
          currentBasedOn = parentStyle['@_BasedOn'];
        }
      }
      
      if (!fontFamily) {
      }
      
      // Font style and weight from font style name
      let fontWeight = 'normal';
      let fontStyle = 'normal';
      
      if (fontStyleName.includes('bold') || fontStyleName.includes('black')) {
        fontWeight = 'bold';
      }
      if (fontStyleName.includes('italic') || fontStyleName.includes('oblique')) {
        fontStyle = 'italic';
      }
      
      // Color - check both locations
      const fillColorRef = charStyle['@_FillColor'] || props['@_FillColor'];
      const color = fillColorRef && colors[fillColorRef] ? colors[fillColorRef] : '#000000';
      
      // #region agent log
      fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:636',message:'CharStyle color resolution',data:{styleName:name||self,fillColorRef,resolvedColor:color,colorFound:!!(fillColorRef&&colors[fillColorRef]),availableColorKeys:Object.keys(colors).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      // Letter spacing (tracking) - check both locations
      // InDesign peut utiliser deux formats:
      // - Standard: tracking en 1/1000 em (ex: 50 = 0.05em)
      // - Pourcentage: tracking en % (ex: 141 = 141% = 1.41em)
      const tracking = parseFloat(charStyle['@_Tracking'] || props['@_Tracking']) || 0;
      // Si tracking > 100, on considère que c'est un pourcentage
      const letterSpacing = tracking > 100 ? tracking / 100 : tracking / 1000;
      
      // Baseline shift - check both locations
      const baselineShift = parseFloat(charStyle['@_BaselineShift'] || props['@_BaselineShift']) || 0;
      
      // PRIORITY 1: Transformations
      const horizontalScale = parseFloat(charStyle['@_HorizontalScale'] || props['@_HorizontalScale']) || 100;
      const verticalScale = parseFloat(charStyle['@_VerticalScale'] || props['@_VerticalScale']) || 100;
      const skew = parseFloat(charStyle['@_Skew'] || props['@_Skew']) || 0;
      
      // PRIORITY 1: Crénage et ligatures
      const kerningMethod = charStyle['@_KerningMethod'] || props['@_KerningMethod'];
      const ligatures = charStyle['@_Ligatures'] === 'true' || props['@_Ligatures'] === 'true';
      const noBreak = charStyle['@_NoBreak'] === 'true' || props['@_NoBreak'] === 'true';
      
      // PRIORITY 1: Couleurs et contours avancés
      const fillTint = parseFloat(charStyle['@_FillTint'] || props['@_FillTint']);
      const strokeColorRef = charStyle['@_StrokeColor'] || props['@_StrokeColor'];
      const strokeColor = strokeColorRef && colors[strokeColorRef] ? colors[strokeColorRef] : undefined;
      const strokeTint = parseFloat(charStyle['@_StrokeTint'] || props['@_StrokeTint']);
      const strokeWeight = parseFloat(charStyle['@_StrokeWeight'] || props['@_StrokeWeight']);
      const overprintFill = charStyle['@_OverprintFill'] === 'true' || props['@_OverprintFill'] === 'true';
      const overprintStroke = charStyle['@_OverprintStroke'] === 'true' || props['@_OverprintStroke'] === 'true';
      
      // PRIORITY 1: Soulignement et barré avancés
      const underlineColorRef = charStyle['@_UnderlineColor'] || props['@_UnderlineColor'];
      const underlineColor = underlineColorRef && colors[underlineColorRef] ? colors[underlineColorRef] : undefined;
      const underlineWeight = parseFloat(charStyle['@_UnderlineWeight'] || props['@_UnderlineWeight']);
      const underlineOffset = parseFloat(charStyle['@_UnderlineOffset'] || props['@_UnderlineOffset']);
      const underlineType = charStyle['@_UnderlineType'] || props['@_UnderlineType'];
      
      const strikeThroughColorRef = charStyle['@_StrikeThroughColor'] || props['@_StrikeThroughColor'];
      const strikeThroughColor = strikeThroughColorRef && colors[strikeThroughColorRef] ? colors[strikeThroughColorRef] : undefined;
      const strikeThroughWeight = parseFloat(charStyle['@_StrikeThroughWeight'] || props['@_StrikeThroughWeight']);
      const strikeThroughOffset = parseFloat(charStyle['@_StrikeThroughOffset'] || props['@_StrikeThroughOffset']);
      const strikeThroughType = charStyle['@_StrikeThroughType'] || props['@_StrikeThroughType'];
      
      // PRIORITY 1: Position (superscript/subscript)
      const position = charStyle['@_Position'] || props['@_Position'];
      
      // PRIORITY 2: OpenType Features
      const otfContextualAlternate = charStyle['@_OTFContextualAlternate'] === 'true' || props['@_OTFContextualAlternate'] === 'true';
      const otfDiscretionaryLigature = charStyle['@_OTFDiscretionaryLigature'] === 'true' || props['@_OTFDiscretionaryLigature'] === 'true';
      const otfFraction = charStyle['@_OTFFraction'] === 'true' || props['@_OTFFraction'] === 'true';
      const otfHistorical = charStyle['@_OTFHistorical'] === 'true' || props['@_OTFHistorical'] === 'true';
      const otfOrdinal = charStyle['@_OTFOrdinal'] === 'true' || props['@_OTFOrdinal'] === 'true';
      const otfSlashedZero = charStyle['@_OTFSlashedZero'] === 'true' || props['@_OTFSlashedZero'] === 'true';
      const otfSwash = charStyle['@_OTFSwash'] === 'true' || props['@_OTFSwash'] === 'true';
      const otfTitling = charStyle['@_OTFTitling'] === 'true' || props['@_OTFTitling'] === 'true';
      const otfStylisticSets = charStyle['@_OTFStylisticSets'] || props['@_OTFStylisticSets'];
      const glyphForm = charStyle['@_GlyphForm'] || props['@_GlyphForm'];
      
      // Text decoration - check both locations
      let textDecoration = 'none';
      if (charStyle['@_Underline'] === 'true' || props['@_Underline'] === 'true') {
        textDecoration = 'underline';
      } else if (charStyle['@_StrikeThru'] === 'true' || props['@_StrikeThru'] === 'true') {
        textDecoration = 'line-through';
      }
      
      // Text transform - check both locations
      let textTransform = 'none';
      const capitalization = charStyle['@_Capitalization'] || props['@_Capitalization'];
      if (capitalization === 'AllCaps') {
        textTransform = 'uppercase';
      } else if (capitalization === 'SmallCaps') {
        textTransform = 'uppercase'; // Approximate
      }
      
      characterStyles[self] = {
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        color,
        letterSpacing,
        baselineShift,
        textDecoration,
        textTransform,
        
        // PRIORITY 1: Transformations (uniquement si différent du défaut)
        horizontalScale: horizontalScale !== 100 ? horizontalScale : undefined,
        verticalScale: verticalScale !== 100 ? verticalScale : undefined,
        skew: skew !== 0 ? skew : undefined,
        
        // PRIORITY 1: Crénage et ligatures
        kerningMethod: kerningMethod || undefined,
        ligatures: ligatures || undefined,
        noBreak: noBreak || undefined,
        
        // PRIORITY 1: Couleurs et contours
        fillTint: !isNaN(fillTint) ? fillTint : undefined,
        strokeColor: strokeColor || undefined,
        strokeTint: !isNaN(strokeTint) ? strokeTint : undefined,
        strokeWeight: !isNaN(strokeWeight) ? strokeWeight : undefined,
        overprintFill: overprintFill || undefined,
        overprintStroke: overprintStroke || undefined,
        
        // PRIORITY 1: Soulignement et barré avancés
        underlineColor: underlineColor || undefined,
        underlineWeight: !isNaN(underlineWeight) ? underlineWeight : undefined,
        underlineOffset: !isNaN(underlineOffset) ? underlineOffset : undefined,
        underlineType: underlineType || undefined,
        strikeThroughColor: strikeThroughColor || undefined,
        strikeThroughWeight: !isNaN(strikeThroughWeight) ? strikeThroughWeight : undefined,
        strikeThroughOffset: !isNaN(strikeThroughOffset) ? strikeThroughOffset : undefined,
        strikeThroughType: strikeThroughType || undefined,
        
        // PRIORITY 1: Position
        position: position && position !== 'Normal' ? position : undefined,
        
        // PRIORITY 2: OpenType Features
        otfContextualAlternate: otfContextualAlternate || undefined,
        otfDiscretionaryLigature: otfDiscretionaryLigature || undefined,
        otfFraction: otfFraction || undefined,
        otfHistorical: otfHistorical || undefined,
        otfOrdinal: otfOrdinal || undefined,
        otfSlashedZero: otfSlashedZero || undefined,
        otfSwash: otfSwash || undefined,
        otfTitling: otfTitling || undefined,
        otfStylisticSets: otfStylisticSets || undefined,
        glyphForm: glyphForm || undefined
      };
      
      // Also store by name for easier lookup
      if (name && name !== '[None]') {
        characterStyles[name] = characterStyles[self];
      }
    }
  } catch (e) {
  }
  
  return characterStyles;
}

/**
 * Extract Paragraph Styles from Styles.xml
 * 
 * Les Paragraph Styles contiennent :
 * - Les propriétés de paragraphe (textAlign, lineHeight, marginTop, marginBottom, etc.)
 * - La police du paragraphe (fontFamily) utilisée quand aucun Character Style n'est appliqué
 * 
 * ⚠️ Important : les Paragraph Styles peuvent aussi contenir fontFamily.
 * Si une zone de texte n'a pas de Character Style appliqué, on utilise la police du Paragraph Style.
 */
export function extractParagraphStyles(stylesData: any, colors: Record<string, string> = {}): Record<string, ParagraphStyleProperties> {
  const paragraphStyles: Record<string, ParagraphStyleProperties> = {};

  try {
    // Try different possible root paths (XML parser transforms idPkg:Styles -> idPkg_Styles)
    const stylesRoot = stylesData?.idPkg_Styles || stylesData?.Styles || stylesData;
    
    // BUGFIX: Les styles peuvent être dans RootParagraphStyleGroup OU dans des ParagraphStyleGroup imbriqués
    // D'après la spec IDML, la structure peut être:
    // RootParagraphStyleGroup
    //   ├─ ParagraphStyle (styles directs)
    //   └─ ParagraphStyleGroup (groupes de styles)
    //        └─ ParagraphStyle (styles dans le groupe)
    
    const rootGroup = stylesRoot?.RootParagraphStyleGroup;
    if (!rootGroup) {
      console.warn('[extractParagraphStyles] No RootParagraphStyleGroup found in Styles.xml');
      return paragraphStyles;
    }
    
    // Collecte tous les ParagraphStyle (directs + dans les groupes)
    const allParaStyles: any[] = [];
    
    // Styles directs dans RootParagraphStyleGroup
    if (rootGroup.ParagraphStyle) {
      const direct = Array.isArray(rootGroup.ParagraphStyle) ? rootGroup.ParagraphStyle : [rootGroup.ParagraphStyle];
      allParaStyles.push(...direct);
    }
    
    // Styles dans les ParagraphStyleGroup imbriqués
    if (rootGroup.ParagraphStyleGroup) {
      const groups = Array.isArray(rootGroup.ParagraphStyleGroup) ? rootGroup.ParagraphStyleGroup : [rootGroup.ParagraphStyleGroup];
      groups.forEach((group: any) => {
        if (group.ParagraphStyle) {
          const groupStyles = Array.isArray(group.ParagraphStyle) ? group.ParagraphStyle : [group.ParagraphStyle];
          allParaStyles.push(...groupStyles);
        }
      });
    }
    
    if (allParaStyles.length === 0) {
      console.warn('[extractParagraphStyles] No ParagraphStyle found');
      return paragraphStyles;
    }
    
    console.log(`[extractParagraphStyles] Found ${allParaStyles.length} paragraph styles (including nested groups)`);
    
    const paraStylesArray = allParaStyles;
    
    // First pass: Create a temporary map with raw data
    const rawParaStylesMap = new Map<string, any>();
    
    for (const paraStyle of paraStylesArray) {
      const self = paraStyle['@_Self'];
      if (self) {
        rawParaStylesMap.set(self, paraStyle);
        const name = paraStyle['@_Name'];
        if (name && name !== '[None]') {
          rawParaStylesMap.set(name, paraStyle);
        }
      }
    }
    
    // Second pass: Process each style with inheritance resolution
    for (const paraStyle of paraStylesArray) {
      const self = paraStyle['@_Self'];
      const name = paraStyle['@_Name'];
      
      if (!self) continue;
      
      const props = paraStyle?.Properties || {};
      
      // Text align (justification)
      // BUGFIX: Justification peut être soit sur l'élément ParagraphStyle directement,
      // soit dans Properties. On vérifie les deux emplacements.
      let textAlign = 'left';
      let textAlignLast = undefined;
      const justification = paraStyle['@_Justification'] || props['@_Justification'];
      switch (justification) {
        case 'LeftAlign':
          textAlign = 'left';
          break;
        case 'CenterAlign':
          textAlign = 'center';
          break;
        case 'RightAlign':
          textAlign = 'right';
          break;
        case 'LeftJustified':
          textAlign = 'justify';
          textAlignLast = 'left';
          break;
        case 'RightJustified':
          textAlign = 'justify';
          textAlignLast = 'right';
          break;
        case 'CenterJustified':
          textAlign = 'justify';
          textAlignLast = 'center';
          break;
        case 'FullyJustified':
        case 'Justify':
          textAlign = 'justify';
          textAlignLast = 'justify';
          break;
        case 'ToBindingSide':
          textAlign = 'left';
          break;
        case 'AwayFromBindingSide':
          textAlign = 'right';
          break;
      }
      
      // Line height (leading)
      let lineHeight = '1';
      const leading = props['@_Leading'];
      const pointSize = parseFloat(props['@_PointSize']) || 12;
      
      if (leading && leading !== 'Auto') {
        const leadingValue = parseFloat(leading);
        if (!isNaN(leadingValue) && pointSize > 0) {
          lineHeight = (leadingValue / pointSize).toString();
        }
      }
      
      // White space
      let whiteSpace = 'normal';
      if (props['@_KeepLinesTogether'] === 'true') {
        whiteSpace = 'nowrap';
      }
      
      // Spacing - BUGFIX: Vérifier d'abord l'élément paraStyle, puis Properties
      const marginTop = parseFloat(paraStyle['@_SpaceBefore'] || props['@_SpaceBefore']) || 0;
      const marginBottom = parseFloat(paraStyle['@_SpaceAfter'] || props['@_SpaceAfter']) || 0;
      const textIndent = parseFloat(paraStyle['@_FirstLineIndent'] || props['@_FirstLineIndent']) || 0;
      
      // PRIORITY 1: Retraits - BUGFIX: Vérifier d'abord l'élément paraStyle
      const leftIndent = parseFloat(paraStyle['@_LeftIndent'] || props['@_LeftIndent']) || 0;
      const rightIndent = parseFloat(paraStyle['@_RightIndent'] || props['@_RightIndent']) || 0;
      
      // PRIORITY 1: Césure - BUGFIX: Peut être "false" (string) ou false (boolean)
      const hyphenate = paraStyle['@_Hyphenate'] === 'true' || paraStyle['@_Hyphenate'] === true ||
                        props['@_Hyphenate'] === 'true' || props['@_Hyphenate'] === true;
      
      // PRIORITY 1: Langue et composition
      const appliedLanguage = paraStyle['@_AppliedLanguage'] || props['@_AppliedLanguage'];
      const composer = paraStyle['@_Composer'] || props['@_Composer'];
      
      // PRIORITY 2: Interlignage avancé - BUGFIX: Vérifier paraStyle d'abord
      const autoLeading = parseFloat(paraStyle['@_AutoLeading'] || props['@_AutoLeading']) || 120;
      const leadingModel = paraStyle['@_LeadingModel'] || props['@_LeadingModel'];
      
      // PRIORITY 2: Lettrines - BUGFIX: Vérifier paraStyle d'abord
      const dropCapCharacters = parseInt(paraStyle['@_DropCapCharacters'] || props['@_DropCapCharacters']) || 0;
      const dropCapLines = parseInt(paraStyle['@_DropCapLines'] || props['@_DropCapLines']) || 0;
      
      // PRIORITY 2: Keep options - BUGFIX: Vérifier paraStyle d'abord
      const keepWithNext = paraStyle['@_KeepWithNext'] === 'true' || props['@_KeepWithNext'] === 'true';
      const keepLinesTogether = paraStyle['@_KeepLinesTogether'] === 'true' || props['@_KeepLinesTogether'] === 'true';
      const keepFirstLines = parseInt(paraStyle['@_KeepFirstLines'] || props['@_KeepFirstLines']);
      const keepLastLines = parseInt(paraStyle['@_KeepLastLines'] || props['@_KeepLastLines']);
      const keepAllLinesTogether = paraStyle['@_KeepAllLinesTogether'] === 'true' || props['@_KeepAllLinesTogether'] === 'true';
      
      // PRIORITY 2: Justification avancée (valeurs desired) - BUGFIX: Vérifier paraStyle d'abord
      const desiredLetterSpacing = parseFloat(paraStyle['@_DesiredLetterSpacing'] || props['@_DesiredLetterSpacing']);
      const desiredWordSpacing = parseFloat(paraStyle['@_DesiredWordSpacing'] || props['@_DesiredWordSpacing']);
      const desiredGlyphScaling = parseFloat(paraStyle['@_DesiredGlyphScaling'] || props['@_DesiredGlyphScaling']);
      
      // PRIORITY 2: Single word justification - BUGFIX: Vérifier paraStyle d'abord
      const singleWordJustification = paraStyle['@_SingleWordJustification'] || props['@_SingleWordJustification'];
      const balanceRaggedLines = paraStyle['@_BalanceRaggedLines'] === 'true' || props['@_BalanceRaggedLines'] === 'true';
      
      // PRIORITY 3: Direction (RTL) - Déjà correct
      const paragraphDirection = paraStyle['@_ParagraphDirection'] || props['@_ParagraphDirection'];
      
      // PRIORITY 3: Justification complète (min/max) - BUGFIX: Vérifier paraStyle d'abord
      const minimumLetterSpacing = parseFloat(paraStyle['@_MinimumLetterSpacing'] || props['@_MinimumLetterSpacing']);
      const maximumLetterSpacing = parseFloat(paraStyle['@_MaximumLetterSpacing'] || props['@_MaximumLetterSpacing']);
      const minimumWordSpacing = parseFloat(paraStyle['@_MinimumWordSpacing'] || props['@_MinimumWordSpacing']);
      const maximumWordSpacing = parseFloat(paraStyle['@_MaximumWordSpacing'] || props['@_MaximumWordSpacing']);
      const minimumGlyphScaling = parseFloat(paraStyle['@_MinimumGlyphScaling'] || props['@_MinimumGlyphScaling']);
      const maximumGlyphScaling = parseFloat(paraStyle['@_MaximumGlyphScaling'] || props['@_MaximumGlyphScaling']);
      
      // PRIORITY 3: Césure détaillée - BUGFIX: Vérifier paraStyle d'abord
      const hyphenateBeforeLast = parseInt(paraStyle['@_HyphenateBeforeLast'] || props['@_HyphenateBeforeLast']);
      const hyphenateAfterFirst = parseInt(paraStyle['@_HyphenateAfterFirst'] || props['@_HyphenateAfterFirst']);
      const hyphenateCapitalizedWords = paraStyle['@_HyphenateCapitalizedWords'] === 'true' || props['@_HyphenateCapitalizedWords'] === 'true';
      const hyphenateLadderLimit = parseInt(paraStyle['@_HyphenateLadderLimit'] || props['@_HyphenateLadderLimit']);
      const hyphenateWordsLongerThan = parseInt(paraStyle['@_HyphenateWordsLongerThan'] || props['@_HyphenateWordsLongerThan']);
      const hyphenationZone = parseFloat(paraStyle['@_HyphenationZone'] || props['@_HyphenationZone']);
      const hyphenWeight = parseInt(paraStyle['@_HyphenWeight'] || props['@_HyphenWeight']);
      
      // Font properties (ParagraphStyle can have font properties when no CharacterStyle is used)
      // BUGFIX: Font properties peuvent être:
      // 1. Directement sur l'élément ParagraphStyle (attributs)
      // 2. Dans Properties (sous-élément)
      // 3. Dans Properties.CharacterStyleProperties (sous-sous-élément)
      const embeddedCharProps = Array.isArray(props?.CharacterStyleProperties)
        ? props.CharacterStyleProperties[0]
        : props?.CharacterStyleProperties;

      // On vérifie d'abord l'élément paraStyle lui-même, puis Properties
      const fontCandidates = [paraStyle, props, embeddedCharProps].filter(Boolean);

      let fontFamily: string | undefined = undefined;
      let fontSize: number | undefined = undefined;
      let fontStyleName: string = '';
      
      // BUGFIX CRITIQUE: Extraire TOUTES les propriétés de caractère depuis ParagraphStyle
      // Ces propriétés peuvent être directement sur l'élément ParagraphStyle (attributs)
      for (const c of fontCandidates) {
        if (!fontFamily) {
          const appliedFont =
            c['@_AppliedFont'] ||
            c['@_FontFamily'] ||
            (typeof c.AppliedFont === 'string' ? c.AppliedFont : c.AppliedFont?.['#text']);
          // BUGFIX: Trim les espaces (InDesign peut ajouter des espaces trailing)
          if (appliedFont) fontFamily = String(appliedFont).trim();
        }
        if (!fontStyleName) {
          const fs = c['@_FontStyle'];
          if (fs) fontStyleName = String(fs).toLowerCase();
        }
        if (fontSize === undefined) {
          const ps = c['@_PointSize'];
          const parsed = ps !== undefined ? parseFloat(ps) : NaN;
          if (!Number.isNaN(parsed)) fontSize = parsed;
        }
      }
      
      // If no font defined, check BasedOn (inheritance) - recursively
      if (!fontFamily) {
        let currentBasedOn = paraStyle['@_BasedOn'];
        let depth = 0;
        const maxDepth = 10; // Prevent infinite loops
        
        while (!fontFamily && currentBasedOn && depth < maxDepth) {
          depth++;
          
          // Normalize BasedOn key - try multiple formats
          // BasedOn might be "ParagraphStyle/$ID/NormalParagraphStyle" but Self is "$ID/NormalParagraphStyle"
          let parentStyle = rawParaStylesMap.get(currentBasedOn);
          if (!parentStyle && currentBasedOn.startsWith('ParagraphStyle/')) {
            const normalizedKey = currentBasedOn.replace('ParagraphStyle/', '');
            parentStyle = rawParaStylesMap.get(normalizedKey);
          }
          if (!parentStyle) {
            break;
          }
          
          const parentProps = parentStyle?.Properties || {};
          const parentEmbeddedCharProps = Array.isArray(parentProps?.CharacterStyleProperties)
            ? parentProps.CharacterStyleProperties[0]
            : parentProps?.CharacterStyleProperties;
          const parentCandidates = [parentStyle, parentProps, parentEmbeddedCharProps].filter(Boolean);
          
          for (const c of parentCandidates) {
            if (!fontFamily) {
              const appliedFont =
                c['@_AppliedFont'] ||
                c['@_FontFamily'] ||
                (typeof c.AppliedFont === 'string' ? c.AppliedFont : c.AppliedFont?.['#text']);
              if (appliedFont) fontFamily = appliedFont;
            }
            if (!fontStyleName) {
              const fs = c['@_FontStyle'];
              if (fs) fontStyleName = String(fs).toLowerCase();
            }
            if (fontSize === undefined) {
              const ps = c['@_PointSize'];
              const parsed = ps !== undefined ? parseFloat(ps) : NaN;
              if (!Number.isNaN(parsed)) fontSize = parsed;
            }
          }
          
          // Move to next parent
          currentBasedOn = parentStyle['@_BasedOn'];
        }
      }
      
      let fontWeight: string | undefined = undefined;
      let fontStyle: string | undefined = undefined;
      
      if (fontStyleName) {
        if (fontStyleName.includes('bold') || fontStyleName.includes('black')) {
          fontWeight = 'bold';
        }
        if (fontStyleName.includes('italic') || fontStyleName.includes('oblique')) {
          fontStyle = 'italic';
        }
      }
      
      // EXTRACTION COMPLÈTE: Propriétés de caractère sur ParagraphStyle
      // Ces propriétés s'appliquent au texte quand il n'y a pas de CharacterStyle
      
      // HorizontalScale sur ParagraphStyle
      const paraHorizontalScale = parseFloat(paraStyle['@_HorizontalScale'] || props['@_HorizontalScale']) || undefined;
      
      // Capitalization sur ParagraphStyle
      const paraCapitalization = paraStyle['@_Capitalization'] || props['@_Capitalization'];
      let paraTextTransform: string | undefined = undefined;
      if (paraCapitalization === 'AllCaps') {
        paraTextTransform = 'uppercase';
      } else if (paraCapitalization === 'SmallCaps') {
        paraTextTransform = 'uppercase'; // Approximate
      }
      
      // FillColor sur ParagraphStyle
      const paraFillColorRef = paraStyle['@_FillColor'] || props['@_FillColor'];
      const paraColor = paraFillColorRef && colors[paraFillColorRef] ? colors[paraFillColorRef] : undefined;
      
      // StrokeColor et StrokeWeight sur ParagraphStyle (contour du texte)
      const paraStrokeColorRef = paraStyle['@_StrokeColor'] || props['@_StrokeColor'];
      const paraStrokeColor = paraStrokeColorRef && colors[paraStrokeColorRef] ? colors[paraStrokeColorRef] : undefined;
      const paraStrokeWeight = parseFloat(paraStyle['@_StrokeWeight'] || props['@_StrokeWeight']) || undefined;
      
      // Tracking sur ParagraphStyle
      // InDesign peut utiliser deux formats:
      // - Standard: tracking en 1/1000 em (ex: 50 = 0.05em)
      // - Pourcentage: tracking en % (ex: 141 = 141% = 1.41em)
      const paraTracking = parseFloat(paraStyle['@_Tracking'] || props['@_Tracking']) || undefined;
      const paraLetterSpacing = paraTracking 
        ? (paraTracking > 100 ? paraTracking / 100 : paraTracking / 1000) 
        : undefined;
      
      if (!fontFamily) {
      }
      
      // DEBUG: Log pour voir les styles extraits
      if (name === 'Titre livre' || self.includes('Titre livre')) {
        console.log(`[extractParagraphStyles] ✓ Found "Titre livre" style!`);
        console.log(`  Self: ${self}`);
        console.log(`  Name: ${name}`);
        console.log(`  textAlign: ${textAlign}`);
        console.log(`  Justification: ${justification}`);
      }
      
      paragraphStyles[self] = {
        textAlign,
        textAlignLast,
        lineHeight,
        whiteSpace,
        marginTop,
        marginBottom,
        textIndent,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        
        // EXTRACTION COMPLÈTE: Propriétés de caractère définies sur ParagraphStyle
        // Ces propriétés s'appliquent au texte quand il n'y a pas de CharacterStyle
        paraHorizontalScale: paraHorizontalScale,
        paraTextTransform: paraTextTransform,
        paraColor: paraColor,
        paraLetterSpacing: paraLetterSpacing,
        paraStrokeColor: paraStrokeColor,
        paraStrokeWeight: paraStrokeWeight,
        
        // PRIORITY 1: Retraits
        leftIndent: leftIndent !== 0 ? leftIndent : undefined,
        rightIndent: rightIndent !== 0 ? rightIndent : undefined,
        
        // PRIORITY 1: Césure
        hyphenate: hyphenate || undefined,
        
        // PRIORITY 1: Langue et composition
        appliedLanguage: appliedLanguage || undefined,
        composer: composer || undefined,
        
        // PRIORITY 2: Interlignage avancé
        autoLeading: autoLeading !== 120 ? autoLeading : undefined,
        leadingModel: leadingModel || undefined,
        
        // PRIORITY 2: Lettrines
        dropCapCharacters: dropCapCharacters > 0 ? dropCapCharacters : undefined,
        dropCapLines: dropCapLines > 0 ? dropCapLines : undefined,
        
        // PRIORITY 2: Keep options
        keepWithNext: keepWithNext || undefined,
        keepLinesTogether: keepLinesTogether || undefined,
        keepFirstLines: !isNaN(keepFirstLines) && keepFirstLines > 0 ? keepFirstLines : undefined,
        keepLastLines: !isNaN(keepLastLines) && keepLastLines > 0 ? keepLastLines : undefined,
        keepAllLinesTogether: keepAllLinesTogether || undefined,
        
        // PRIORITY 2: Justification avancée
        desiredLetterSpacing: !isNaN(desiredLetterSpacing) ? desiredLetterSpacing : undefined,
        desiredWordSpacing: !isNaN(desiredWordSpacing) ? desiredWordSpacing : undefined,
        desiredGlyphScaling: !isNaN(desiredGlyphScaling) ? desiredGlyphScaling : undefined,
        singleWordJustification: singleWordJustification || undefined,
        balanceRaggedLines: balanceRaggedLines || undefined,
        
        // PRIORITY 3: Direction
        paragraphDirection: paragraphDirection || undefined,
        
        // PRIORITY 3: Justification complète
        minimumLetterSpacing: !isNaN(minimumLetterSpacing) ? minimumLetterSpacing : undefined,
        maximumLetterSpacing: !isNaN(maximumLetterSpacing) ? maximumLetterSpacing : undefined,
        minimumWordSpacing: !isNaN(minimumWordSpacing) ? minimumWordSpacing : undefined,
        maximumWordSpacing: !isNaN(maximumWordSpacing) ? maximumWordSpacing : undefined,
        minimumGlyphScaling: !isNaN(minimumGlyphScaling) ? minimumGlyphScaling : undefined,
        maximumGlyphScaling: !isNaN(maximumGlyphScaling) ? maximumGlyphScaling : undefined,
        
        // PRIORITY 3: Césure détaillée
        hyphenateBeforeLast: !isNaN(hyphenateBeforeLast) ? hyphenateBeforeLast : undefined,
        hyphenateAfterFirst: !isNaN(hyphenateAfterFirst) ? hyphenateAfterFirst : undefined,
        hyphenateCapitalizedWords: hyphenateCapitalizedWords || undefined,
        hyphenateLadderLimit: !isNaN(hyphenateLadderLimit) ? hyphenateLadderLimit : undefined,
        hyphenateWordsLongerThan: !isNaN(hyphenateWordsLongerThan) ? hyphenateWordsLongerThan : undefined,
        hyphenationZone: !isNaN(hyphenationZone) ? hyphenationZone : undefined,
        hyphenWeight: !isNaN(hyphenWeight) ? hyphenWeight : undefined
      };
      
      // Also store by name
      if (name && name !== '[None]') {
        paragraphStyles[name] = paragraphStyles[self];
      }
    }
    
    // DEBUG: Log all extracted paragraph styles
    console.log(`[extractParagraphStyles] Extracted ${Object.keys(paragraphStyles).length} paragraph style entries:`);
    Object.keys(paragraphStyles).forEach(key => {
      console.log(`  - "${key}" → textAlign: ${paragraphStyles[key].textAlign}`);
    });
  } catch (e) {
    console.error('[extractParagraphStyles] Error:', e);
  }
  
  return paragraphStyles;
}

/**
 * Extract story content from a Story XML (for the stories map)
 */
function extractStoryContent(storyData: any): {
  storyId: string;
  content: string;
  variables: string[];
  appliedCharStyle: string;
  appliedParaStyle: string;
  localParaProperties?: any;
  inlineCharProperties?: any;
  conditionalSegments?: ConditionalTextSegment[];
  availableConditions?: string[];
} | null {
  try {
    const outerStory = storyData?.Story;
    if (!outerStory) return null;
    
    const story = outerStory?.Story;
    if (!story) return null;
    
    const storyId = story['@_Self'];
    if (!storyId) return null;
    
    // Extract text using the same logic as extractTextFromParagraphRanges
    const extracted = extractTextFromParagraphRanges(
      story.ParagraphStyleRange,
      storyId,
      storyId
    );
    
    if (!extracted.content) return null;
    
    // Detect variables
    const variables: string[] = [];
    const varMatches = extracted.content.match(/\{([^}]+)\}/g);
    if (varMatches) {
      varMatches.forEach(m => {
        variables.push(m.replace(/[{}]/g, ''));
      });
    }
    
    const result: {
      storyId: string;
      content: string;
      variables: string[];
      appliedCharStyle: string;
      appliedParaStyle: string;
      localParaProperties?: any;
      inlineCharProperties?: any;
      conditionalSegments?: ConditionalTextSegment[];
      availableConditions?: string[];
    } = {
      storyId,
      content: extracted.content,
      variables,
      appliedCharStyle: extracted.appliedCharStyle,
      appliedParaStyle: extracted.appliedParaStyle,
      localParaProperties: extracted.localParaProperties,
      inlineCharProperties: extracted.inlineCharProperties
    };
    
    // NOUVEAU: Ajouter les segments conditionnels si présents
    if (extracted.conditionalSegments && extracted.conditionalSegments.length > 0) {
      result.conditionalSegments = extracted.conditionalSegments;
      result.availableConditions = extracted.availableConditions;
      console.log(`[extractStoryContent] Story ${storyId} has ${extracted.conditionalSegments.length} conditional segments`);
      console.log(`[extractStoryContent] Available conditions: ${extracted.availableConditions?.join(', ')}`);
    }
    
    return result;
  } catch (e) {
    console.error('[extractStoryContent] Error:', e);
    return null;
  }
}

/**
 * Parse le nom d'une condition IDML pour extraire les informations de matching
 * Pattern: (TXTCOND)tabId_variantId-optionId (même format que les images)
 * 
 * Exemples:
 *   "Condition/(TXTCOND)hero-child_gender-boy" → { tabId: "hero-child", variantId: "gender", optionId: "boy" }
 *   "(TXTCOND)hero-child_gender-girl" → { tabId: "hero-child", variantId: "gender", optionId: "girl" }
 *   "Version_Garcon" → null (ancien format non supporté)
 */
function parseConditionName(conditionRef: string): { tabId: string; variantId: string; optionId: string } | null {
  // Retirer le préfixe "Condition/" si présent
  const conditionName = conditionRef.replace(/^Condition\//, '');
  
  // Pattern: TXTCOND_tabId_variantId-optionId (format InDesign)
  const match = conditionName.match(/^TXTCOND_([^_]+)_([^-]+)-(.+)$/);
  if (match) {
    return {
      tabId: match[1],      // ex: "hero-child"
      variantId: match[2],  // ex: "gender"
      optionId: match[3]    // ex: "boy"
    };
  }
  
  return null;
}

/**
 * Extrait le texte d'un CharacterStyleRange (contenu + variables)
 */
function extractTextFromCharRange(charRange: any): { text: string; variables: string[] } {
  let text = '';
  const variables: string[] = [];
  
  const content = charRange?.Content;
  const br = charRange?.Br;
  const textVariable = charRange?.TextVariableInstance;
  
  if (Array.isArray(content)) {
    content.forEach((t, idx) => {
      text += t;
      if (idx < content.length - 1 || br) {
        text += '\n';
      }
    });
  } else if (content) {
    // Content peut être une chaîne vide ou contenant juste des espaces
    // trimValues: true supprime les espaces, mais on doit les préserver si c'est le seul contenu
    text += content;
    if (br) {
      const brArray = Array.isArray(br) ? br : [br];
      text += '\n'.repeat(brArray.length);
    }
  } else if (textVariable) {
    let varName = textVariable['@_Name'] || textVariable['@_ResultText'];
    if (varName) {
      if (!varName.startsWith('{')) varName = '{' + varName;
      if (!varName.endsWith('}')) varName = varName + '}';
      text += varName;
      variables.push(varName.replace(/[{}]/g, ''));
    }
  } else if (charRange?.['#text']) {
    // #text peut contenir des espaces entre les éléments XML
    text += charRange['#text'];
  }
  
  return { text, variables };
}

/**
 * Extract text content from ParagraphStyleRange structure
 * Retourne maintenant aussi les segments conditionnels pour le texte conditionnel InDesign
 */
function extractTextFromParagraphRanges(
  paraRanges: any,
  frameId: string,
  frameName: string
): { 
  content: string; 
  appliedCharStyle: string; 
  appliedParaStyle: string; 
  localParaProperties?: any;
  inlineCharProperties?: any;
  conditionalSegments?: ConditionalTextSegment[];
  availableConditions?: string[];
} {
  let fullContent = '';
  let appliedCharStyle = '';
  let appliedParaStyle = '';
  let localParaProperties: any = null;
  let inlineCharProperties: any = null;
  
  // NOUVEAU: Segments conditionnels
  const conditionalSegments: ConditionalTextSegment[] = [];
  const availableConditionsSet = new Set<string>();
  let hasAnyCondition = false;
  
  if (!paraRanges) {
    return { content: '', appliedCharStyle: '', appliedParaStyle: '' };
  }
  
  const paraArray = Array.isArray(paraRanges) ? paraRanges : [paraRanges];
  
  for (const paraRange of paraArray) {
    appliedParaStyle = paraRange['@_AppliedParagraphStyle'] || appliedParaStyle;
    
    // Extract local paragraph properties (overrides)
    // Justification can be either in Properties OR as direct attribute
    if (!localParaProperties) {
      localParaProperties = {};
    }
    
    if (paraRange?.Properties) {
      Object.assign(localParaProperties, paraRange.Properties);
    }
    
    // Check for direct Justification attribute (common in IDML)
    if (paraRange['@_Justification']) {
      localParaProperties['@_Justification'] = paraRange['@_Justification'];
    }
    
    if (Object.keys(localParaProperties).length > 0) {
    }
    
    // Extract character ranges
    const charRanges = paraRange?.CharacterStyleRange;
    if (charRanges) {
      const charArray = Array.isArray(charRanges) ? charRanges : [charRanges];
      
      for (const charRange of charArray) {
        appliedCharStyle = charRange['@_AppliedCharacterStyle'] || appliedCharStyle;
        
        // NOUVEAU: Capturer la condition appliquée sur ce CharacterStyleRange
        const appliedConditions = charRange['@_AppliedConditions'];
        let conditionName: string | undefined;
        let parsedCondition: { tabId: string; variantId: string; optionId: string } | undefined;
        
        if (appliedConditions) {
          // AppliedConditions peut être une string ou un array
          // Format: "Condition/TXTCOND_hero-child_gender-boy" ou "Condition/Version_Garcon"
          const conditionRef = Array.isArray(appliedConditions) ? appliedConditions[0] : appliedConditions;
          conditionName = conditionRef.replace(/^Condition\//, '');
          availableConditionsSet.add(conditionName);
          hasAnyCondition = true;
          
          // Parser la condition pour le matching wizard
          const parsed = parseConditionName(conditionRef);
          if (parsed) {
            parsedCondition = parsed;
          }
        }
        
        // Extract inline character properties (direct on CharacterStyleRange)
        if (!inlineCharProperties) {
          inlineCharProperties = {};
        }
        
        // Check for inline font properties - ALL possible locations
        const props = charRange?.Properties || {};
        
        // AppliedFont can be attribute OR element - check ALL possible locations
        let inlineFont: string | undefined = undefined;
        
        // Source 1: Direct attribute on CharacterStyleRange
        if (charRange['@_AppliedFont']) {
          inlineFont = charRange['@_AppliedFont'];
        }
        
        // Source 2: Properties.AppliedFont as element or string
        if (!inlineFont && props.AppliedFont) {
          if (typeof props.AppliedFont === 'string') {
            inlineFont = props.AppliedFont;
          } else if (props.AppliedFont?.['#text']) {
            inlineFont = props.AppliedFont['#text'];
          } else if (props.AppliedFont?.['@_type'] === 'string') {
            inlineFont = props.AppliedFont['#text'] || props.AppliedFont['_'];
          }
          if (inlineFont) {
          }
        }
        
        // Source 3: Properties attributes
        if (!inlineFont) {
          inlineFont = props['@_AppliedFont'] || props['@_FontFamily'];
          if (inlineFont) {
          }
        }
        
        // Source 4: CharacterStyleProperties (embedded)
        if (!inlineFont) {
          const embedded = Array.isArray(props?.CharacterStyleProperties)
            ? props.CharacterStyleProperties[0]
            : props?.CharacterStyleProperties;
          if (embedded) {
            inlineFont = embedded['@_AppliedFont'] || embedded['@_FontFamily'];
            if (!inlineFont && embedded.AppliedFont) {
              inlineFont = typeof embedded.AppliedFont === 'string' 
                ? embedded.AppliedFont 
                : embedded.AppliedFont?.['#text'];
            }
            if (inlineFont) {
            }
          }
        }
        
        const inlineSize = charRange['@_PointSize'] || props['@_PointSize'];
        const inlineFontStyle = charRange['@_FontStyle'] || props['@_FontStyle'];
        
        // Tracking inline (letter-spacing) sur CharacterStyleRange
        const inlineTracking = parseFloat(charRange['@_Tracking'] || props['@_Tracking']) || undefined;
        
        // Couleur inline
        const inlineFillColor = charRange['@_FillColor'] || props['@_FillColor'];
        
        // #region agent log
        if (inlineFillColor) {
          fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlParser.ts:1539',message:'Inline FillColor detected',data:{inlineFillColor,charRangeAppliedStyle:charRange['@_AppliedCharacterStyle']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H11'})}).catch(()=>{});
        }
        // #endregion
        
        // HorizontalScale, VerticalScale, Skew
        const inlineHorizontalScale = parseFloat(charRange['@_HorizontalScale'] || props['@_HorizontalScale']) || undefined;
        const inlineVerticalScale = parseFloat(charRange['@_VerticalScale'] || props['@_VerticalScale']) || undefined;
        const inlineSkew = parseFloat(charRange['@_Skew'] || props['@_Skew']) || undefined;
        
        if (inlineFont && !inlineCharProperties.fontFamily) {
          inlineCharProperties.fontFamily = inlineFont;
        } else if (!inlineFont) {
        }
        if (inlineSize && !inlineCharProperties.fontSize) {
          inlineCharProperties.fontSize = parseFloat(inlineSize);
        }
        if (inlineFontStyle) {
          const styleName = inlineFontStyle.toLowerCase();
          if (styleName.includes('bold') || styleName.includes('black')) {
            inlineCharProperties.fontWeight = 'bold';
          }
          if (styleName.includes('italic') || styleName.includes('oblique')) {
            inlineCharProperties.fontStyle = 'italic';
          }
        }
        
        // Appliquer le tracking inline
        if (inlineTracking && !inlineCharProperties.letterSpacing) {
          // Si tracking > 100, on considère que c'est un pourcentage
          inlineCharProperties.letterSpacing = inlineTracking > 100 ? inlineTracking / 100 : inlineTracking / 1000;
        }
        
        // Appliquer les transformations inline
        if (inlineHorizontalScale && inlineHorizontalScale !== 100) {
          inlineCharProperties.horizontalScale = inlineHorizontalScale;
        }
        if (inlineVerticalScale && inlineVerticalScale !== 100) {
          inlineCharProperties.verticalScale = inlineVerticalScale;
        }
        if (inlineSkew && inlineSkew !== 0) {
          inlineCharProperties.skew = inlineSkew;
        }
        
        // BUGFIX: Handle mixed content (Content + Br + TextVariableInstance)
        // In IDML, text with line breaks and variables is structured as:
        // <CharacterStyleRange>
        //   <Content>Text line 1</Content>
        //   <Br/>
        //   <Content>Text line 2</Content>
        // </CharacterStyleRange>
        // <CharacterStyleRange>
        //   <TextVariableInstance Name="{var_name}" ResultText="{var_name}" />
        // </CharacterStyleRange>
        //
        // The XML parser may represent Content as:
        // - A single string: "Text line 1"
        // - An array: ["Text line 1", "Text line 2"]
        // - Or the Br may be a separate property
        
        // Utiliser la fonction helper pour extraire le texte
        const { text: segmentText, variables: segmentVars } = extractTextFromCharRange(charRange);
        
        // BUGFIX: Si le segment est vide, c'est probablement un espace entre deux segments
        // Dans l'IDML, les espaces peuvent être dans des CharacterStyleRange séparés
        // Le parseur XML avec trimValues: false préserve maintenant les espaces, mais on garde cette logique
        // pour gérer les cas où les segments vides représentent des espaces
        let finalSegmentText = segmentText;
        
        // Si le segment est vide (pas de Content, pas de TextVariable, pas de #text)
        // ET qu'il y a un segment précédent
        // ALORS c'est probablement un espace entre deux segments
        // Note: Dans l'IDML, les espaces peuvent être dans des CharacterStyleRange séparés
        // Même si le segment a un Br, il peut s'agir d'un espace si le segment suivant n'est pas un saut de ligne
        if (!finalSegmentText && conditionalSegments.length > 0) {
          // Vérifier si le segment précédent ne se termine pas par un espace ou un saut de ligne
          const prevSegment = conditionalSegments[conditionalSegments.length - 1];
          // Si le segment suivant existe et n'est pas vide, c'est probablement un espace
          // (on ne peut pas vérifier le segment suivant ici, mais on peut supposer que si le segment précédent
          // ne se termine pas par un espace/saut de ligne, alors c'est un espace)
          if (prevSegment && !prevSegment.text.endsWith(' ') && !prevSegment.text.endsWith('\n')) {
            // Si le segment a un Br mais qu'on est entre deux segments de texte, 
            // c'est peut-être un espace mal interprété (dans certains cas IDML)
            // Sinon, c'est juste un espace normal
            if (charRange?.Br) {
              // Dans certains cas, un Br dans un segment vide peut être un espace
              // On ajoute un espace seulement si le segment précédent ne se termine pas par un saut de ligne
              finalSegmentText = ' ';
            } else {
              // Segment vide sans Br = espace
              finalSegmentText = ' ';
            }
          }
        }
        
        // Si le segment est vide mais qu'il y a un nœud texte (#text), c'est probablement un espace
        if (!finalSegmentText && charRange?.['#text']) {
          // Le #text peut contenir l'espace qui a été trimmé
          finalSegmentText = charRange['#text'];
        }
        
        // Ajouter au contenu complet (pour rétrocompatibilité)
        fullContent += finalSegmentText;
        
        // NOUVEAU: Créer un segment conditionnel (même si vide, pour préserver les espaces)
        const segment: ConditionalTextSegment = {
          text: finalSegmentText,
          appliedCharacterStyle: appliedCharStyle
        };
        
        if (conditionName) {
          segment.condition = conditionName;
        }
        if (parsedCondition) {
          segment.parsedCondition = parsedCondition;
        }
        if (segmentVars.length > 0) {
          segment.variables = segmentVars;
        }
        
        // Ajouter les propriétés inline spécifiques à ce segment
        const segmentInlineProps: any = {};
        
        if (inlineFont) {
          segmentInlineProps.fontFamily = inlineFont;
        }
        if (inlineSize) {
          segmentInlineProps.fontSize = parseFloat(inlineSize);
        }
        if (inlineFontStyle) {
          const styleName = inlineFontStyle.toLowerCase();
          if (styleName.includes('bold') || styleName.includes('black')) {
            segmentInlineProps.fontWeight = 'bold';
          }
          if (styleName.includes('italic') || styleName.includes('oblique')) {
            segmentInlineProps.fontStyle = 'italic';
          }
        }
        if (inlineTracking) {
          segmentInlineProps.letterSpacing = inlineTracking > 100 ? inlineTracking / 100 : inlineTracking / 1000;
        }
        if (inlineFillColor) {
          segmentInlineProps.fillColor = inlineFillColor;
        }
        if (inlineHorizontalScale && inlineHorizontalScale !== 100) {
          segmentInlineProps.horizontalScale = inlineHorizontalScale;
        }
        if (inlineVerticalScale && inlineVerticalScale !== 100) {
          segmentInlineProps.verticalScale = inlineVerticalScale;
        }
        if (inlineSkew && inlineSkew !== 0) {
          segmentInlineProps.skew = inlineSkew;
        }
        
        if (Object.keys(segmentInlineProps).length > 0) {
          segment.inlineCharProperties = segmentInlineProps;
        }
        
        conditionalSegments.push(segment);
      }
    }
    
    // Add paragraph break
    fullContent += '\n';
  }
  
  // Construire le résultat
  const result: {
    content: string;
    appliedCharStyle: string;
    appliedParaStyle: string;
    localParaProperties?: any;
    inlineCharProperties?: any;
    conditionalSegments?: ConditionalTextSegment[];
    availableConditions?: string[];
  } = {
    content: fullContent.trim(),
    appliedCharStyle,
    appliedParaStyle,
    localParaProperties,
    inlineCharProperties
  };
  
  // Ajouter les segments conditionnels seulement si des conditions sont présentes
  if (hasAnyCondition && conditionalSegments.length > 0) {
    result.conditionalSegments = conditionalSegments;
    result.availableConditions = Array.from(availableConditionsSet);
  }
  
  
  return result;
}

/**
 * Extract text frames from Stories
 */
export function extractTextFrames(
  storyData: any,
  characterStyles: Record<string, CharacterStyleProperties>,
  paragraphStyles: Record<string, ParagraphStyleProperties>
): TextFrameData[] {
  const textFrames: TextFrameData[] = [];
  
  try {
    // Structure is: storyData.Story.Story (double nested)
    const outerStory = storyData?.Story;
    if (!outerStory) {
      return textFrames;
    }
    
    const story = outerStory?.Story;
    if (!story) {
      return textFrames;
    }
    
    const storyId = story['@_Self'] || 'unknown';
    
    // Case 1: Text in TextFrame elements
    const textFrameElements = story?.TextFrame;
    if (textFrameElements) {
      const textFrameArray = Array.isArray(textFrameElements) ? textFrameElements : [textFrameElements];
      
      for (const textFrame of textFrameArray) {
        const frameId = textFrame['@_Self'];
        const frameName = textFrame['@_Name'] || frameId;
        
        if (!frameId) continue;
        
        const extracted = extractTextFromParagraphRanges(
          textFrame?.ParagraphStyleRange,
          frameId,
          frameName
        );
        
        if (!extracted.content) continue;
        
        // Detect variables
        const variables: string[] = [];
        const varMatches = extracted.content.match(/\{([^}]+)\}/g);
        if (varMatches) {
          varMatches.forEach(m => {
            variables.push(m.replace(/[{}]/g, ''));
          });
        }
        
        textFrames.push({
          id: frameId,
          name: frameName,
          pageIndex: 0,
          content: extracted.content,
          variables,
          appliedCharacterStyle: extracted.appliedCharStyle,
          appliedParagraphStyle: extracted.appliedParaStyle,
          localParaProperties: extracted.localParaProperties,
          inlineCharProperties: extracted.inlineCharProperties
        });
        
      }
    }
    
    // Case 2: Text directly in Story (no TextFrame wrapper) - MOST COMMON CASE
    // This happens when text is directly in the Story element
    if (story?.ParagraphStyleRange) {
      
      const extracted = extractTextFromParagraphRanges(
        story.ParagraphStyleRange,
        storyId,
        storyId
      );
      
      if (extracted.content) {
        const variables: string[] = [];
        const varMatches = extracted.content.match(/\{([^}]+)\}/g);
        if (varMatches) {
          varMatches.forEach(m => {
            variables.push(m.replace(/[{}]/g, ''));
          });
        }
        
        textFrames.push({
          id: storyId,
          name: storyId,
          pageIndex: 0,
          content: extracted.content,
          variables,
          appliedCharacterStyle: extracted.appliedCharStyle,
          appliedParagraphStyle: extracted.appliedParaStyle,
          localParaProperties: extracted.localParaProperties,
          inlineCharProperties: extracted.inlineCharProperties
        });
        
      }
    }
    
    if (textFrames.length === 0) {
    }
  } catch (e) {
  }
  
  return textFrames;
}

/**
 * Extract page dimensions and positions from Spreads
 */
function extractPageDimensionsAndPositions(spreadData: any): {
  dimensions: Record<number, { width: number; height: number }>;
  pagesInfo: Array<{pageIndex: number, transformX: number, width: number}>;
} {
  const dimensions: Record<number, { width: number; height: number }> = {};
  const pagesInfo: Array<{pageIndex: number, transformX: number, width: number}> = [];
  
  try {
    // Support both structures: spreadData.Spread and spreadData.Spread.Spread
    let spread = spreadData?.Spread?.Spread || spreadData?.Spread;
    if (!spread) return { dimensions, pagesInfo };
    
    const pages = spread?.Page;
    if (!pages) return { dimensions, pagesInfo };
    
    const pageArray = Array.isArray(pages) ? pages : [pages];
    
    for (const page of pageArray) {
      const geometricBounds = page['@_GeometricBounds'];
      const itemTransform = page['@_ItemTransform'];
      const pageName = page['@_Name']; // Page name (e.g. "1", "2")
      
      if (geometricBounds) {
        // Format: "top left bottom right"
        const bounds = geometricBounds.split(' ').map((v: string) => parseFloat(v));
        if (bounds.length === 4) {
          const width = bounds[3] - bounds[1];
          const height = bounds[2] - bounds[0];
          
          // Use @_Name as page index, fallback to 1
          const pageIndex = pageName ? parseInt(pageName) : 1;
          dimensions[pageIndex] = { width, height };
          
          // Extract transform X position
          let transformX = 0;
          if (itemTransform) {
            const transform = itemTransform.split(' ').map((v: string) => parseFloat(v));
            if (transform.length === 6) {
              transformX = transform[4];
            }
          }
          
          pagesInfo.push({
            pageIndex,
            transformX,
            width
          });
          
        }
      }
    }
  } catch (e) {
  }
  
  return { dimensions, pagesInfo };
}

/**
 * Extract TextFrames from a Spread and create TextFrameData entries linked to story contents
 */
function extractTextFramesFromSpread(
  spreadData: any,
  spreadPagesInfo: Array<{pageIndex: number, transformX: number, width: number}>,
  storiesMap: Record<string, {
    content: string;
    variables: string[];
    appliedCharacterStyle?: string;
    appliedParagraphStyle?: string;
    localParaProperties?: any;
    inlineCharProperties?: any;
    conditionalSegments?: ConditionalTextSegment[];
    availableConditions?: string[];
  }>
): TextFrameData[] {
  const textFrames: TextFrameData[] = [];
  
  try {
    let spread = spreadData?.Spread?.Spread || spreadData?.Spread;
    if (!spread) return textFrames;
    
    const textFrameElements = spread?.TextFrame;
    if (!textFrameElements) return textFrames;
    
    const textFrameArray = Array.isArray(textFrameElements) ? textFrameElements : [textFrameElements];
    
    for (let layoutOrder = 0; layoutOrder < textFrameArray.length; layoutOrder++) {
      const tf = textFrameArray[layoutOrder];
      
      const textFrameId = tf['@_Self'];
      const parentStory = tf['@_ParentStory'];
      const itemTransform = tf['@_ItemTransform'];
      
      if (!textFrameId || !parentStory) continue;
      
      // Get story content from the stories map
      const storyData = storiesMap[parentStory];
      if (!storyData || !storyData.content) {
        continue;
      }
      
      // Extract position
      let x = 0, y = 0, width = 100, height = 30;
      
      if (itemTransform) {
        const transform = itemTransform.split(' ').map((v: string) => parseFloat(v));
        if (transform.length === 6) {
          x = transform[4];
          y = transform[5];
        }
      }
      
      // Extract dimensions from PathGeometry
      const pathGeometry = tf?.Properties?.PathGeometry?.GeometryPathType?.PathPointArray?.PathPointType;
      if (pathGeometry && Array.isArray(pathGeometry) && pathGeometry.length >= 2) {
        const points = pathGeometry.map((pt: any) => {
          const anchor = pt['@_Anchor'];
          if (anchor) {
            const coords = anchor.split(' ').map((v: string) => parseFloat(v));
            return { x: coords[0], y: coords[1] };
          }
          return null;
        }).filter((p: any) => p !== null);
        
        if (points.length >= 2) {
          const xCoords = points.map((p: any) => p.x);
          const yCoords = points.map((p: any) => p.y);
          width = Math.max(...xCoords) - Math.min(...xCoords);
          height = Math.max(...yCoords) - Math.min(...yCoords);
        }
      }
      
      // Determine pageIndex based on X position
      const sortedPages = [...spreadPagesInfo].sort((a, b) => a.transformX - b.transformX);
      let pageIndex = sortedPages[0]?.pageIndex || 1;
      
      for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i];
        const nextPage = sortedPages[i + 1];
        
        const pageLeft = page.transformX;
        
        if (nextPage) {
          if (x >= pageLeft && x < nextPage.transformX) {
            pageIndex = page.pageIndex;
            break;
          }
        } else {
          if (x >= pageLeft) {
            pageIndex = page.pageIndex;
            break;
          }
        }
      }
      
      // Create TextFrameData entry
      const textFrameData: TextFrameData = {
        id: textFrameId,
        name: textFrameId,
        pageIndex,
        content: storyData.content,
        variables: storyData.variables,
        appliedCharacterStyle: storyData.appliedCharacterStyle,
        appliedParagraphStyle: storyData.appliedParagraphStyle,
        localParaProperties: storyData.localParaProperties,
        inlineCharProperties: storyData.inlineCharProperties,
        position: { x, y, width, height },
        layoutOrder,
        parentStory
      };
      
      // NOUVEAU: Ajouter les segments conditionnels si présents
      if (storyData.conditionalSegments && storyData.conditionalSegments.length > 0) {
        textFrameData.conditionalSegments = storyData.conditionalSegments;
        textFrameData.availableConditions = storyData.availableConditions;
      }
      
      textFrames.push(textFrameData);
      
    }
  } catch (e) {
    console.error('[extractTextFramesFromSpread] Error:', e);
  }
  
  return textFrames;
}

/**
 * Extract text frame positions from Spreads
 */
function extractTextFramePositions(spreadData: any, spreadPagesInfo: Array<{pageIndex: number, transformX: number, width: number}>): Array<{
  parentStory: string;
  textFrameId?: string;
  pageIndex: number;
  position: { x: number; y: number; width: number; height: number };
}> {
  const positions: Array<any> = [];
  
  try {
    // Support both structures: spreadData.Spread and spreadData.Spread.Spread
    let spread = spreadData?.Spread?.Spread || spreadData?.Spread;
    if (!spread) return positions;
    
    // TextFrames are at spread level, not page level
    const textFrames = spread?.TextFrame;
    if (!textFrames) return positions;
    
    const textFrameArray = Array.isArray(textFrames) ? textFrames : [textFrames];
    
    for (const tf of textFrameArray) {
      const parentStory = tf['@_ParentStory'];
      const textFrameId = tf['@_Self'];
      const itemTransform = tf['@_ItemTransform'];
      
      if ((parentStory || textFrameId) && itemTransform) {
        // ItemTransform format: "a b c d tx ty" (matrix transformation)
        // For simple translation: "1 0 0 1 x y"
        const transform = itemTransform.split(' ').map((v: string) => parseFloat(v));
        if (transform.length === 6) {
          const x = transform[4];
          const y = transform[5];
          
          // Extract dimensions from PathGeometry
          let width = 100;
          let height = 30;
          
          const pathGeometry = tf?.Properties?.PathGeometry?.GeometryPathType?.PathPointArray?.PathPointType;
          if (pathGeometry && Array.isArray(pathGeometry) && pathGeometry.length >= 2) {
            // Calculate bounding box from path points
            const points = pathGeometry.map((pt: any) => {
              const anchor = pt['@_Anchor'];
              if (anchor) {
                const coords = anchor.split(' ').map((v: string) => parseFloat(v));
                return { x: coords[0], y: coords[1] };
              }
              return null;
            }).filter((p: any) => p !== null);
            
            if (points.length >= 2) {
              const xCoords = points.map((p: any) => p.x);
              const yCoords = points.map((p: any) => p.y);
              width = Math.max(...xCoords) - Math.min(...xCoords);
              height = Math.max(...yCoords) - Math.min(...yCoords);
            }
          }
          
          // Determine pageIndex based on X position
          // Pages in a spread are positioned side by side
          // Sort pages by transformX to get left-to-right order
          const sortedPages = [...spreadPagesInfo].sort((a, b) => a.transformX - b.transformX);
          
          let pageIndex = sortedPages[0]?.pageIndex || 1;
          
          // Find which page contains this TextFrame based on X position
          for (let i = 0; i < sortedPages.length; i++) {
            const page = sortedPages[i];
            const nextPage = sortedPages[i + 1];
            
            const pageLeft = page.transformX;
            const pageRight = page.transformX + page.width;
            
            // Check if TextFrame X is within this page's bounds
            if (nextPage) {
              // Not the last page: check if X is before the next page
              if (x >= pageLeft && x < nextPage.transformX) {
                pageIndex = page.pageIndex;
                break;
              }
            } else {
              // Last page: check if X is within or after this page's left edge
              if (x >= pageLeft) {
                pageIndex = page.pageIndex;
                break;
              }
            }
          }
          
          positions.push({
            parentStory,
            textFrameId,
            pageIndex,
            position: {
              x,
              y,
              width,
              height
            }
          });
        }
      }
    }
  } catch (e) {
  }
  
  return positions;
}

/**
 * Extract all unique font families used in the IDML document
 */
export function extractUsedFonts(idmlData: IdmlData): string[] {
  const fonts = new Set<string>();
  
  // Extract from character styles
  Object.values(idmlData.characterStyles).forEach(style => {
    if (style.fontFamily) {
      // Normalize: trim extra spaces
      fonts.add(style.fontFamily.trim());
    }
  });
  
  // Extract from paragraph styles
  Object.values(idmlData.paragraphStyles).forEach(style => {
    if (style.fontFamily) {
      // Normalize: trim extra spaces
      fonts.add(style.fontFamily.trim());
    }
  });
  
  // Extract from inline properties in text frames
  idmlData.textFrames.forEach(frame => {
    if (frame.inlineCharProperties?.fontFamily) {
      // Normalize: trim extra spaces
      fonts.add(frame.inlineCharProperties.fontFamily.trim());
    }
  });
  
  return Array.from(fonts).sort();
}
