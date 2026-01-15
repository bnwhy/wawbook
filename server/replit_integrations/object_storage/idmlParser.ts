import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

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
  lineHeight: string;
  whiteSpace: string;
  marginTop: number;
  marginBottom: number;
  textIndent: number;
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
  // Position from IDML Spreads (if available)
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
      const stylesXml = await stylesFile.async('string');
      const stylesData = parser.parse(stylesXml);
      
      result.characterStyles = extractCharacterStyles(stylesData, result.colors);
      result.paragraphStyles = extractParagraphStyles(stylesData);
    }
  } catch (e) {
    console.warn('[idml-parser] Could not parse Styles.xml:', e);
  }
  
  // 3. Extract text frames from Stories
  console.log('[idml-parser] Looking for Story files...');
  const allFiles = Object.keys(zip.files);
  console.log(`[idml-parser] Total files in IDML: ${allFiles.length}`);
  
  // List all XML files for debugging
  const xmlFiles = allFiles.filter(f => f.toLowerCase().endsWith('.xml'));
  console.log(`[idml-parser] XML files found:`, xmlFiles);
  
  const storyFiles = allFiles.filter(f => f.match(/^Stories\/Story_.*\.xml$/i));
  console.log(`[idml-parser] Story files found: ${storyFiles.length}`, storyFiles);
  
  if (storyFiles.length === 0) {
    console.warn('[idml-parser] No Story files found! Checking for alternative locations...');
    // Try alternative patterns
    const altStoryFiles = allFiles.filter(f => 
      f.toLowerCase().includes('story') && f.toLowerCase().endsWith('.xml')
    );
    console.log(`[idml-parser] Alternative story files:`, altStoryFiles);
  }
  
  for (const storyPath of storyFiles) {
    try {
      console.log(`[idml-parser] Parsing ${storyPath}...`);
      const storyFile = zip.file(storyPath);
      if (storyFile) {
        const storyXml = await storyFile.async('string');
        console.log(`[idml-parser] Story XML length: ${storyXml.length} characters`);
        const storyData = parser.parse(storyXml);
        
        const textFrames = extractTextFrames(storyData, result.characterStyles, result.paragraphStyles);
        console.log(`[idml-parser] Extracted ${textFrames.length} text frames from ${storyPath}`);
        result.textFrames.push(...textFrames);
      }
    } catch (e) {
      console.error(`[idml-parser] Error parsing ${storyPath}:`, e);
    }
  }
  
  // 4. Extract page dimensions and text frame positions from Spreads
  try {
    const spreadFiles = Object.keys(zip.files).filter(f => f.match(/^Spreads\/Spread_.*\.xml$/i));
    
    for (const spreadPath of spreadFiles) {
      const spreadFile = zip.file(spreadPath);
      if (spreadFile) {
        const spreadXml = await spreadFile.async('string');
        const spreadData = parser.parse(spreadXml);
        
        const pageDims = extractPageDimensions(spreadData);
        Object.assign(result.pageDimensions, pageDims);
        
        // Extract text frame positions from spreads
        const textFramePositions = extractTextFramePositions(spreadData);
        
        // Match positions with text frames by ParentStory reference
        for (const tfPos of textFramePositions) {
          const matchingFrame = result.textFrames.find(tf => tf.id === tfPos.parentStory);
          if (matchingFrame) {
            matchingFrame.position = tfPos.position;
            matchingFrame.pageIndex = tfPos.pageIndex;
            console.log(`[idml-parser] Matched position for story ${tfPos.parentStory}: (${tfPos.position.x}, ${tfPos.position.y})`);
          }
        }
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

/**
 * Convert IDML color value to hex
 */
function convertColorToHex(space: string, colorValue: string): string {
  if (!colorValue) return '#000000';
  
  const values = colorValue.split(' ').map(v => parseFloat(v));
  
  if (space === 'RGB') {
    const r = Math.round(values[0] || 0);
    const g = Math.round(values[1] || 0);
    const b = Math.round(values[2] || 0);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } else if (space === 'CMYK') {
    const c = values[0] / 100;
    const m = values[1] / 100;
    const y = values[2] / 100;
    const k = values[3] / 100;
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  return '#000000';
}

/**
 * Extract Character Styles from Styles.xml
 */
export function extractCharacterStyles(
  stylesData: any,
  colors: Record<string, string>
): Record<string, CharacterStyleProperties> {
  const characterStyles: Record<string, CharacterStyleProperties> = {};
  
  try {
    const rootCharStyles = stylesData?.RootCharacterStyleGroup?.CharacterStyle;
    if (!rootCharStyles) return characterStyles;
    
    const charStylesArray = Array.isArray(rootCharStyles) ? rootCharStyles : [rootCharStyles];
    
    for (const charStyle of charStylesArray) {
      const self = charStyle['@_Self'];
      const name = charStyle['@_Name'];
      
      if (!self) continue;
      
      const props = charStyle?.Properties || {};
      
      // Extract font properties
      const fontFamily = props['@_AppliedFont'] || props['@_FontFamily'] || 'serif';
      const fontSize = parseFloat(props['@_PointSize']) || 12;
      
      // Font style and weight from font style name
      const fontStyleName = (props['@_FontStyle'] || '').toLowerCase();
      let fontWeight = 'normal';
      let fontStyle = 'normal';
      
      if (fontStyleName.includes('bold') || fontStyleName.includes('black')) {
        fontWeight = 'bold';
      }
      if (fontStyleName.includes('italic') || fontStyleName.includes('oblique')) {
        fontStyle = 'italic';
      }
      
      // Color
      const fillColorRef = props['@_FillColor'];
      const color = fillColorRef && colors[fillColorRef] ? colors[fillColorRef] : '#000000';
      
      // Letter spacing (tracking in 1/1000 em)
      const tracking = parseFloat(props['@_Tracking']) || 0;
      const letterSpacing = tracking / 1000;
      
      // Baseline shift
      const baselineShift = parseFloat(props['@_BaselineShift']) || 0;
      
      // Text decoration
      let textDecoration = 'none';
      if (props['@_Underline'] === 'true') {
        textDecoration = 'underline';
      } else if (props['@_StrikeThru'] === 'true') {
        textDecoration = 'line-through';
      }
      
      // Text transform
      let textTransform = 'none';
      const capitalization = props['@_Capitalization'];
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
    const rootParaStyles = stylesData?.RootParagraphStyleGroup?.ParagraphStyle;
    if (!rootParaStyles) return paragraphStyles;
    
    const paraStylesArray = Array.isArray(rootParaStyles) ? rootParaStyles : [rootParaStyles];
    
    for (const paraStyle of paraStylesArray) {
      const self = paraStyle['@_Self'];
      const name = paraStyle['@_Name'];
      
      if (!self) continue;
      
      const props = paraStyle?.Properties || {};
      
      // Text align (justification)
      let textAlign = 'left';
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
        case 'FullyJustified':
        case 'Justify':
          textAlign = 'justify';
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
      
      paragraphStyles[self] = {
        textAlign,
        lineHeight,
        whiteSpace,
        marginTop,
        marginBottom,
        textIndent
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
 * Extract text content from ParagraphStyleRange structure
 */
function extractTextFromParagraphRanges(
  paraRanges: any,
  frameId: string,
  frameName: string
): { content: string; appliedCharStyle: string; appliedParaStyle: string } {
  let fullContent = '';
  let appliedCharStyle = '';
  let appliedParaStyle = '';
  
  if (!paraRanges) {
    return { content: '', appliedCharStyle: '', appliedParaStyle: '' };
  }
  
  const paraArray = Array.isArray(paraRanges) ? paraRanges : [paraRanges];
  
  for (const paraRange of paraArray) {
    appliedParaStyle = paraRange['@_AppliedParagraphStyle'] || appliedParaStyle;
    
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
    appliedParaStyle
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
          appliedParagraphStyle: extracted.appliedParaStyle
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
          appliedParagraphStyle: extracted.appliedParaStyle
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
 * Extract page dimensions from Spreads
 */
function extractPageDimensions(spreadData: any): Record<number, { width: number; height: number }> {
  const dimensions: Record<number, { width: number; height: number }> = {};
  
  try {
    const spread = spreadData?.Spread;
    if (!spread) return dimensions;
    
    const pages = spread?.Page;
    if (!pages) return dimensions;
    
    const pageArray = Array.isArray(pages) ? pages : [pages];
    
    for (const page of pageArray) {
      const geometricBounds = page['@_GeometricBounds'];
      if (geometricBounds) {
        // Format: "top left bottom right"
        const bounds = geometricBounds.split(' ').map((v: string) => parseFloat(v));
        if (bounds.length === 4) {
          const width = bounds[3] - bounds[1];
          const height = bounds[2] - bounds[0];
          
          // Page index (1-based)
          const pageIndex = parseInt(page['@_PageIndex']) || 1;
          dimensions[pageIndex] = { width, height };
        }
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting page dimensions:', e);
  }
  
  return dimensions;
}

/**
 * Extract text frame positions from Spreads
 */
function extractTextFramePositions(spreadData: any): Array<{
  parentStory: string;
  pageIndex: number;
  position: { x: number; y: number; width: number; height: number };
}> {
  const positions: Array<any> = [];
  
  try {
    const spread = spreadData?.Spread;
    if (!spread) return positions;
    
    const pages = spread?.Page;
    if (!pages) return positions;
    
    const pageArray = Array.isArray(pages) ? pages : [pages];
    
    for (const page of pageArray) {
      const pageIndex = parseInt(page['@_PageIndex']) || 1;
      
      // Find TextFrames on this page
      const textFrames = page?.TextFrame;
      if (!textFrames) continue;
      
      const textFrameArray = Array.isArray(textFrames) ? textFrames : [textFrames];
      
      for (const tf of textFrameArray) {
        const parentStory = tf['@_ParentStory'];
        const geometricBounds = tf['@_GeometricBounds'];
        
        if (parentStory && geometricBounds) {
          // Format: "top left bottom right"
          const bounds = geometricBounds.split(' ').map((v: string) => parseFloat(v));
          if (bounds.length === 4) {
            const top = bounds[0];
            const left = bounds[1];
            const bottom = bounds[2];
            const right = bounds[3];
            
            positions.push({
              parentStory,
              pageIndex,
              position: {
                x: left,
                y: top,
                width: right - left,
                height: bottom - top
              }
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('[idml-parser] Error extracting text frame positions:', e);
  }
  
  return positions;
}
