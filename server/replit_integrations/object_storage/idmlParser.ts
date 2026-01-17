import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { convertColorToHex } from './utils/colorConverter';

/**
 * IDML Parser - Extrait les textes et styles depuis un fichier IDML InDesign
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
}

interface TextFrameData {
  id: string;
  name: string;
  pageIndex: number;
  content: string;
  variables: string[];
  conditions?: Array<{ name: string; visible: boolean }>;
  appliedCharacterStyle?: string;
  appliedParagraphStyle?: string;
  localParaProperties?: any; // Local paragraph properties (overrides)
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
}

/**
 * Parse un fichier IDML (ZIP) et extrait tous les textes et styles
 */
export async function parseIdmlBuffer(idmlBuffer: Buffer): Promise<IdmlData> {
  const zip = await JSZip.loadAsync(idmlBuffer);
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false, // Keep as strings to avoid parsing issues
    trimValues: true,
    removeNSPrefix: true, // Remove namespace prefixes (idPkg:, etc.)
  });
  
  const result: IdmlData = {
    characterStyles: {},
    paragraphStyles: {},
    textFrames: [],
    colors: {},
    pageDimensions: {}
  };
  
  // 1. Extract colors from Resources/Swatches.xml
  try {
    const swatchesFile = zip.file('Resources/Swatches.xml');
    if (swatchesFile) {
      const swatchesXml = await swatchesFile.async('string');
      const swatchesData = parser.parse(swatchesXml);
      result.colors = extractColors(swatchesData);
    }
  } catch (e) {
    console.warn('[idml-parser] Could not parse Swatches.xml:', e);
  }
  
  // 2. Extract Character Styles and Paragraph Styles from Styles.xml
  try {
    const stylesFile = zip.file('Resources/Styles.xml');
    if (stylesFile) {
      console.log('[idml-parser] Styles.xml found, extracting styles...');
      const stylesXml = await stylesFile.async('string');
      const stylesData = parser.parse(stylesXml);
      
      // DEBUG: Log the actual structure to understand the XML
      console.log('[idml-parser] Styles.xml structure:');
      console.log('[idml-parser]   Root keys:', Object.keys(stylesData));
      
      // Try different possible paths
      const possibleRoots = [
        stylesData,
        stylesData?.idPkg_Styles,
        stylesData?.Styles
      ];
      
      for (const root of possibleRoots) {
        if (root) {
          console.log('[idml-parser]   Checking root with keys:', Object.keys(root));
          if (root.RootCharacterStyleGroup) {
            console.log('[idml-parser]   ✓ Found RootCharacterStyleGroup in this root');
          }
          if (root.RootParagraphStyleGroup) {
            console.log('[idml-parser]   ✓ Found RootParagraphStyleGroup in this root');
          }
        }
      }

      result.characterStyles = extractCharacterStyles(stylesData, result.colors);
      result.paragraphStyles = extractParagraphStyles(stylesData);
      
      console.log(`[idml-parser] Extracted ${Object.keys(result.characterStyles).length} character styles`);
      console.log(`[idml-parser] Extracted ${Object.keys(result.paragraphStyles).length} paragraph styles`);
    } else {
      console.warn('[idml-parser] ⚠️ Styles.xml NOT FOUND in IDML!');
    }
  } catch (e) {
    console.warn('[idml-parser] Could not parse Styles.xml:', e);
  }
  
  // 3. Extract all story contents into a map (storyId -> story data)
  console.log('[idml-parser] Looking for Story files...');
  const allFiles = Object.keys(zip.files);
  console.log(`[idml-parser] Total files in IDML: ${allFiles.length}`);
  
  const storyFiles = allFiles.filter(f => f.match(/^Stories\/Story_.*\.xml$/i));
  console.log(`[idml-parser] Story files found: ${storyFiles.length}`, storyFiles);
  
  // Map: storyId -> story content + styles
  const storiesMap: Record<string, {
    content: string;
    variables: string[];
    appliedCharacterStyle?: string;
    appliedParagraphStyle?: string;
    localParaProperties?: any;
  }> = {};
  
  for (const storyPath of storyFiles) {
    try {
      console.log(`[idml-parser] Parsing ${storyPath}...`);
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
            localParaProperties: storyInfo.localParaProperties
          };
          console.log(`[idml-parser] Stored story ${storyInfo.storyId}: "${storyInfo.content.substring(0, 50)}..."`);
        }
      }
    } catch (e) {
      console.error(`[idml-parser] Error parsing ${storyPath}:`, e);
    }
  }
  
  console.log(`[idml-parser] Extracted ${Object.keys(storiesMap).length} stories into map`);
  
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
        
        console.log(`[idml-parser] Extracted ${textFramesFromSpread.length} text frames from ${spreadPath}`);
        result.textFrames.push(...textFramesFromSpread);
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Could not parse Spreads:', e);
  }
  
  console.log(`[idml-parser] Extracted: ${Object.keys(result.characterStyles).length} char styles, ${Object.keys(result.paragraphStyles).length} para styles, ${result.textFrames.length} text frames`);
  
  return result;
}

/**
 * Extract colors from Swatches.xml
 */
function extractColors(swatchesData: any): Record<string, string> {
  const colors: Record<string, string> = {};
  
  try {
    const colorGroup = swatchesData?.ColorGroup;
    if (!colorGroup) return colors;
    
    const swatches = Array.isArray(colorGroup) ? colorGroup : [colorGroup];
    
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
          colors[self] = convertColorToHex(space, colorValue);
          if (name) {
            colors[name] = convertColorToHex(space, colorValue);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting colors:', e);
  }
  
  return colors;
}

// Fonction déplacée vers utils/colorConverter.ts

/**
 * Extract Character Styles from Styles.xml
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
      console.warn('[extractCharacterStyles] No CharacterStyle found. Checked paths: stylesData.RootCharacterStyleGroup, stylesData.idPkg_Styles.RootCharacterStyleGroup, stylesData.Styles.RootCharacterStyleGroup');
      return characterStyles;
    }
    
    const charStylesArray = Array.isArray(rootCharStyles) ? rootCharStyles : [rootCharStyles];
    
    for (const charStyle of charStylesArray) {
      const self = charStyle['@_Self'];
      const name = charStyle['@_Name'];
      
      if (!self) continue;
      
      const props = charStyle?.Properties || {};
      
      // Extract font properties - check both direct attributes and Properties
      // InDesign can put them in either location
      const fontFamily = charStyle['@_AppliedFont'] || props['@_AppliedFont'] || props['@_FontFamily'] || '';
      const fontSize = parseFloat(charStyle['@_PointSize'] || props['@_PointSize']) || 12;
      
      if (!fontFamily) {
        console.warn(`[extractCharacterStyles] ⚠️ Style ${self} (${name}) has NO font family defined in InDesign`);
      }
      
      // Font style and weight from font style name - check both locations
      const fontStyleName = (charStyle['@_FontStyle'] || props['@_FontStyle'] || '').toLowerCase();
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
      
      // Letter spacing (tracking in 1/1000 em) - check both locations
      const tracking = parseFloat(charStyle['@_Tracking'] || props['@_Tracking']) || 0;
      const letterSpacing = tracking / 1000;
      
      // Baseline shift - check both locations
      const baselineShift = parseFloat(charStyle['@_BaselineShift'] || props['@_BaselineShift']) || 0;
      
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
        textTransform
      };
      
      // Also store by name for easier lookup
      if (name && name !== '[None]') {
        characterStyles[name] = characterStyles[self];
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting character styles:', e);
  }
  
  return characterStyles;
}

/**
 * Extract Paragraph Styles from Styles.xml
 */
export function extractParagraphStyles(stylesData: any): Record<string, ParagraphStyleProperties> {
  const paragraphStyles: Record<string, ParagraphStyleProperties> = {};

  try {
    // Try different possible root paths (XML parser transforms idPkg:Styles -> idPkg_Styles)
    const stylesRoot = stylesData?.idPkg_Styles || stylesData?.Styles || stylesData;
    
    const rootParaStyles = stylesRoot?.RootParagraphStyleGroup?.ParagraphStyle;
    if (!rootParaStyles) {
      console.warn('[extractParagraphStyles] No ParagraphStyle found. Checked paths: stylesData.RootParagraphStyleGroup, stylesData.idPkg_Styles.RootParagraphStyleGroup, stylesData.Styles.RootParagraphStyleGroup');
      return paragraphStyles;
    }
    
    const paraStylesArray = Array.isArray(rootParaStyles) ? rootParaStyles : [rootParaStyles];
    
    for (const paraStyle of paraStylesArray) {
      const self = paraStyle['@_Self'];
      const name = paraStyle['@_Name'];
      
      if (!self) continue;
      
      const props = paraStyle?.Properties || {};
      
      // Text align (justification)
      let textAlign = 'left';
      let textAlignLast = undefined;
      const justification = props['@_Justification'];
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
      
      // Spacing
      const marginTop = parseFloat(props['@_SpaceBefore']) || 0;
      const marginBottom = parseFloat(props['@_SpaceAfter']) || 0;
      const textIndent = parseFloat(props['@_FirstLineIndent']) || 0;
      
      // Font properties (ParagraphStyle can have font properties when no CharacterStyle is used)
      const fontFamily = paraStyle['@_AppliedFont'] || props['@_AppliedFont'] || undefined;
      const fontSize = parseFloat(paraStyle['@_PointSize'] || props['@_PointSize']) || undefined;
      const fontStyleName = (paraStyle['@_FontStyle'] || props['@_FontStyle'] || '').toLowerCase();
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
      
      if (fontFamily) {
        console.log(`[extractParagraphStyles] Style ${self} (${name}) has font: ${fontFamily}`);
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
        fontStyle
      };
      
      // Also store by name
      if (name && name !== '[None]') {
        paragraphStyles[name] = paragraphStyles[self];
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting paragraph styles:', e);
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
    
    return {
      storyId,
      content: extracted.content,
      variables,
      appliedCharStyle: extracted.appliedCharStyle,
      appliedParaStyle: extracted.appliedParaStyle,
      localParaProperties: extracted.localParaProperties
    };
  } catch (e) {
    console.error('[extractStoryContent] Error:', e);
    return null;
  }
}

/**
 * Extract text content from ParagraphStyleRange structure
 */
function extractTextFromParagraphRanges(
  paraRanges: any,
  frameId: string,
  frameName: string
): { content: string; appliedCharStyle: string; appliedParaStyle: string; localParaProperties?: any } {
  let fullContent = '';
  let appliedCharStyle = '';
  let appliedParaStyle = '';
  let localParaProperties: any = null;
  
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
      console.log(`[extractTextFromParagraphRanges] Found Justification attribute for ${frameId}: ${paraRange['@_Justification']}`);
    }
    
    if (Object.keys(localParaProperties).length > 0) {
      console.log(`[extractTextFromParagraphRanges] Local properties for ${frameId}:`, localParaProperties);
    }
    
    // Extract character ranges
    const charRanges = paraRange?.CharacterStyleRange;
    if (charRanges) {
      const charArray = Array.isArray(charRanges) ? charRanges : [charRanges];
      
      for (const charRange of charArray) {
        appliedCharStyle = charRange['@_AppliedCharacterStyle'] || appliedCharStyle;
        
        // Get text content - try multiple properties
        const content = charRange?.Content || charRange?.['#text'] || '';
        if (content) {
          fullContent += content;
        }
        
        // Handle Br (line breaks)
        if (charRange?.Br) {
          fullContent += '\n';
        }
      }
    }
    
    // Add paragraph break
    fullContent += '\n';
  }
  
  return {
    content: fullContent.trim(),
    appliedCharStyle,
    appliedParaStyle,
    localParaProperties
  };
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
      console.warn('[idml-parser] No outer Story element found in story data');
      return textFrames;
    }
    
    const story = outerStory?.Story;
    if (!story) {
      console.warn('[idml-parser] No inner Story element found in story data');
      console.warn('[idml-parser] Outer Story keys:', Object.keys(outerStory));
      return textFrames;
    }
    
    const storyId = story['@_Self'] || 'unknown';
    console.log(`[idml-parser] Processing story ${storyId}`);
    
    // Case 1: Text in TextFrame elements
    const textFrameElements = story?.TextFrame;
    if (textFrameElements) {
      const textFrameArray = Array.isArray(textFrameElements) ? textFrameElements : [textFrameElements];
      console.log(`[idml-parser] Found ${textFrameArray.length} TextFrame elements`);
      
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
          localParaProperties: extracted.localParaProperties
        });
        
        console.log(`[idml-parser] Extracted text from TextFrame ${frameId}: "${extracted.content.substring(0, 50)}..."`);
      }
    }
    
    // Case 2: Text directly in Story (no TextFrame wrapper) - MOST COMMON CASE
    // This happens when text is directly in the Story element
    if (story?.ParagraphStyleRange) {
      console.log('[idml-parser] Found ParagraphStyleRange directly in Story');
      
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
          localParaProperties: extracted.localParaProperties
        });
        
        console.log(`[idml-parser] Extracted text from Story directly: "${extracted.content.substring(0, 50)}..."`);
      }
    }
    
    if (textFrames.length === 0) {
      console.warn('[idml-parser] No text content found in story', storyId);
      console.warn('[idml-parser] Story keys:', Object.keys(story));
    }
  } catch (e) {
    console.error('[idml-parser] Error extracting text frames:', e);
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
          
          console.log(`[idml-parser] Page ${pageIndex}: ${width.toFixed(1)}x${height.toFixed(1)} at x=${transformX.toFixed(1)}`);
        }
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting page dimensions:', e);
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
        console.warn(`[extractTextFramesFromSpread] No story content found for TextFrame ${textFrameId} (ParentStory: ${parentStory})`);
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
      textFrames.push({
        id: textFrameId,
        name: textFrameId,
        pageIndex,
        content: storyData.content,
        variables: storyData.variables,
        appliedCharacterStyle: storyData.appliedCharacterStyle,
        appliedParagraphStyle: storyData.appliedParagraphStyle,
        localParaProperties: storyData.localParaProperties,
        position: { x, y, width, height },
        layoutOrder,
        parentStory
      });
      
      console.log(`[extractTextFramesFromSpread] TextFrame ${textFrameId} (order ${layoutOrder}): page ${pageIndex}, content="${storyData.content.substring(0, 40)}..."`);
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
    console.warn('[idml-parser] Error extracting text frame positions:', e);
  }
  
  return positions;
}
