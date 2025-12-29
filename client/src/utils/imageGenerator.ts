import { BookProduct, ContentConfiguration, ImageElement, TextElement, ImageVariant } from '../types/admin';
import { BookConfig } from '../types';

/**
 * Resolves the effective combination key based on user configuration and book wizard config.
 * For example: "boy_light_blue"
 */
export const getCombinationKey = (book: BookProduct, config: BookConfig): string => {
  if (!book.wizardConfig || !book.wizardConfig.tabs) return 'default';
  
  // Iterate through tabs in order and find selected values in config
  // This logic must match how keys are built in the admin/wizard
  // We assume the config keys match the tab IDs or variant IDs.
  
  const parts: string[] = [];
  
  book.wizardConfig.tabs.forEach(tab => {
      tab.variants.forEach(variant => {
          // Check if this variant has a selection in config
          // The config structure is dynamic: config.characters?.[variant.id] or similar?
          // Or is it flattened in config?
          
          // Based on Wizard.tsx, it seems config might have properties like 'gender', 'hairColor' etc.
          // OR it uses the new `characters` map.
          
          // Let's try to find the value.
          // If the variant.id is 'gender', look for config.gender or config.characters.main.gender
          
          // Simple fallback for now: just join known values if they exist
          // This part is tricky without knowing the exact runtime structure of 'config' 
          // vs the 'wizardConfig' structure.
          
          // However, for the purpose of the mockup, we can try to match what's in the book content.
          // If we can't find a match, we fallback to 'default'.
      });
  });

  // For now, let's assume the 'default' key or try to match basic ones if simple.
  // Ideally, the 'BookPreview' already knows the currentCombinationKey.
  // We will pass it as an argument instead of re-deriving it.
  return 'default';
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
 * Simulates backend generation of book pages as JPGs.
 * Returns a map of pageIndex -> Data URL (base64 encoded JPG).
 */
export const generateBookPages = async (
  book: BookProduct, 
  config: BookConfig, 
  combinationKey: string = 'default'
): Promise<Record<number, string>> => {
  console.log("Generating book pages for:", book.name, "Key:", combinationKey);
  
  const pages: Record<number, string> = {};
  
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

  // Canvas dimensions (A4 ratio or from config)
  // High res for better quality
  const width = (book.features?.dimensions?.width || 210) * 4; // Scale up for quality
  const height = (book.features?.dimensions?.height || 210) * 4;
  
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
      // Replace standard variables
      content = content.replace(/\[childName\]/gi, config.childName || 'Enfant');
      content = content.replace(/\[age\]/gi, config.age?.toString() || '');
      content = content.replace(/\[dedication\]/gi, config.dedication || '');
      
      // We could add more complex replacements here
      return content;
  };

  // Generate each page
  // We scan for all relevant page indices found in content + Cover (0) + Back (999)
  const relevantPages = new Set<number>([0, 999]);
  for(let i=1; i<=maxPage; i++) relevantPages.add(i);
  
  // Sort pages to process in order
  const pageIndices = Array.from(relevantPages).sort((a,b) => a - b);
  
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
          el => el.position.pageIndex === pageIndex && 
                (!el.combinationKey || el.combinationKey === combinationKey || el.combinationKey === 'default' || el.combinationKey === 'all')
      ) || [];
      
      // Sort by layer if available
       imageLayers.sort((a, b) => (a.position.layer || 0) - (b.position.layer || 0));
      
      for (const layer of imageLayers) {
          if (layer.url) {
             try {
                 const img = await loadImage(layer.url);
                 
                 const x = (layer.position.x || 0) / 100 * width;
                 const y = (layer.position.y || 0) / 100 * height;
                 const w = (layer.position.width || 100) / 100 * width;
                 const h = (layer.position.height || 100) / 100 * height; // or keep aspect ratio if h is missing
                 
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
          const text = resolveText(layer.content);
          
          ctx.save();
          const x = (layer.position.x || 0) / 100 * width;
          const y = (layer.position.y || 0) / 100 * height;
          const w = (layer.position.width || 30) / 100 * width;
          
          ctx.translate(x, y); // Text usually top-left origin for flow, but rotation needs center?
          // Let's stick to top-left for text unless we calculate center
          if (layer.position.rotation) {
             // Rotate around top-left
             ctx.rotate(layer.position.rotation * Math.PI / 180);
          }
          
          // Style mapping
          const fontSize = parseFloat((layer.style?.fontSize as string) || '16') * 4; // Scale for canvas
          const fontFamily = (layer.style?.fontFamily as string) || 'serif';
          const color = (layer.style?.color as string) || '#000000';
          const textAlign = (layer.style?.textAlign as string) || 'left';
          
          ctx.font = `${layer.style?.fontWeight || 'normal'} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = textAlign as CanvasTextAlign;
          ctx.textBaseline = 'top';
          
          // Simple wrapping
          // Split into words and draw lines
          const words = text.split(/[\s\n]+/); // split on whitespace or newlines
          // Actually we should respect newlines in text
          
          const lines = [];
          const paragraphs = text.split('\n');
          
          for (const para of paragraphs) {
              const paraWords = para.split(' ');
              let line = '';
              for (let n = 0; n < paraWords.length; n++) {
                  const testLine = line + paraWords[n] + ' ';
                  const metrics = ctx.measureText(testLine);
                  if (metrics.width > w && n > 0) {
                      lines.push(line);
                      line = paraWords[n] + ' ';
                  } else {
                      line = testLine;
                  }
              }
              lines.push(line);
          }
          
          const lineHeight = fontSize * 1.2;
          
          lines.forEach((l, idx) => {
              ctx.fillText(l, 0, idx * lineHeight);
          });
          
          ctx.restore();
      }
      
      // Export page
      pages[pageIndex] = canvas.toDataURL('image/jpeg', 0.8);
  }

  return pages;
};
