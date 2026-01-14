import { BookProduct, ContentConfiguration, ImageElement, TextElement, ImageVariant, ImageCondition } from '../types/admin';
import { BookConfig } from '../types';

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
    
    console.log(`[matchesImageConditions] Checking condition: variantId="${cond.variantId}", optionId="${cond.optionId}"`);
    
    // Strategy 1: For characteristic-based wizards, tabId often equals variantId
    // Try direct lookup: selections[variantId][variantId] = optionId
    const directTabSelections = selections[cond.variantId];
    if (directTabSelections) {
      console.log(`[matchesImageConditions] Strategy 1: Found direct tab selections for "${cond.variantId}":`, directTabSelections);
      // Check exact match
      if (directTabSelections[cond.variantId] === cond.optionId) {
        console.log(`[matchesImageConditions] ✓ Strategy 1: Exact match found`);
        return true;
      }
      // Check normalized match
      const selectedValue = directTabSelections[cond.variantId];
      if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
        console.log(`[matchesImageConditions] ✓ Strategy 1: Normalized match found (${selectedValue} === ${cond.optionId})`);
        return true;
      }
    }
    
    // Strategy 2: Search through all tabs to find where this variant exists
    // This handles cases like tabId="father", variantId="haircolor"
    for (const [tabId, tabSelections] of Object.entries(selections)) {
      console.log(`[matchesImageConditions] Strategy 2: Checking tab "${tabId}" with selections:`, tabSelections);
      // Check exact variant ID match in this tab's selections
      if (tabSelections[cond.variantId] === cond.optionId) {
        console.log(`[matchesImageConditions] ✓ Strategy 2: Exact match in tab "${tabId}" (${tabSelections[cond.variantId]} === ${cond.optionId})`);
        return true;
      }
      // Check normalized match
      const selectedValue = tabSelections[cond.variantId];
      if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
        console.log(`[matchesImageConditions] ✓ Strategy 2: Normalized match in tab "${tabId}" (${selectedValue} === ${cond.optionId})`);
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
      console.log(`[matchesImageConditions] Strategy 3: Searching in ${book.wizardConfig.tabs.length} tabs`);
      for (const tab of book.wizardConfig.tabs) {
        if (tab.type === 'character' && tab.variants) {
          for (const variant of tab.variants) {
            // Check if variant ID matches (exact or normalized)
            const variantIdMatches = variant.id === cond.variantId || 
                                    variant.id.toLowerCase().trim() === normalizedVariantId;
            
            if (variantIdMatches) {
              console.log(`[matchesImageConditions] Strategy 3: Found matching variant "${variant.id}" in tab "${tab.id}"`);
              // Found the tab containing this variant
              const tabSelections = selections[tab.id] || {};
              console.log(`[matchesImageConditions] Strategy 3: Tab "${tab.id}" selections:`, tabSelections);
              
              // Check exact match
              if (tabSelections[cond.variantId] === cond.optionId) {
                console.log(`[matchesImageConditions] ✓ Strategy 3: Exact match in tab "${tab.id}"`);
                return true;
              }
              
              // Check normalized match
              const selectedValue = tabSelections[cond.variantId];
              if (selectedValue && String(selectedValue).toLowerCase().trim() === normalizedOptionId) {
                console.log(`[matchesImageConditions] ✓ Strategy 3: Normalized match in tab "${tab.id}" (${selectedValue} === ${cond.optionId})`);
                return true;
              }
              
              // Also check if variant.id is in tabSelections (for characteristic-based)
              if (tabSelections[variant.id] === cond.optionId) {
                console.log(`[matchesImageConditions] ✓ Strategy 3: Match via variant.id in tab "${tab.id}"`);
                return true;
              }
              const variantSelectedValue = tabSelections[variant.id];
              if (variantSelectedValue && String(variantSelectedValue).toLowerCase().trim() === normalizedOptionId) {
                console.log(`[matchesImageConditions] ✓ Strategy 3: Normalized match via variant.id in tab "${tab.id}"`);
                return true;
              }
            }
          }
        }
      }
    }
    
    console.log(`[matchesImageConditions] ✗ No match found for variantId="${cond.variantId}", optionId="${cond.optionId}"`);
    // #region agent log
    setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:127',message:'Condition not matched',data:{variantId:cond.variantId,optionId:cond.optionId,selections},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}),0);
    // #endregion
    return false; // Condition not satisfied
  });
  // #region agent log
  setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:129',message:'matchesImageConditions result',data:{conditions,result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}),0);
  // #endregion
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
              if (v.type === 'options') {
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
 * Simulates backend generation of book pages as JPGs.
 * Returns a map of pageIndex -> Data URL (base64 encoded JPG).
 */
export const generateBookPages = async (
  book: BookProduct, 
  config: BookConfig, 
  combinationKey: string = 'default'
): Promise<Record<number, string>> => {
  
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
      
      // 1. Handle {{variable}} style (Admin Dashboard standard)
      content = content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const k = key.trim();
          if (k === 'childName') return config.childName || 'Enfant';
          if (k === 'age') return config.age?.toString() || '';
          if (k === 'dedication') return config.dedication || '';
          if (k === 'heroName') return config.childName || 'Héros';
          if (k === 'city') return config.city || '';
          if (k === 'gender') return config.gender === 'girl' ? 'Fille' : 'Garçon';
          
          // Try to find in custom characters config if it matches a variant ID
          // Structure: config.characters[tabId] = selectedValue (for options) or value (for text)
          // But here we only have the variant ID (k). We'd need to know which tab it belongs to.
          // For now, let's assume standard variables are the main use case.
          
          return match;
      });

      // 2. Handle legacy [variable] style
      content = content.replace(/\[childName\]/gi, config.childName || 'Enfant');
      content = content.replace(/\[age\]/gi, config.age?.toString() || '');
      content = content.replace(/\[dedication\]/gi, config.dedication || '');
      
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
      // #region agent log
      const allPageImages = book.contentConfig?.imageElements?.filter(el => el.position.pageIndex === pageIndex) || [];
      setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:280',message:'All images for page before filter',data:{pageIndex,count:allPageImages.length,images:allPageImages.map(i=>({id:i.id,label:i.label,url:i.url?.substring(0,50),combinationKey:i.combinationKey,conditions:i.conditions,position:i.position}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{}),0);
      // #endregion
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
            // #region agent log
            setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:292',message:'Image filter evaluation',data:{pageIndex,imageId:el.id,label:el.label,url:el.url?.substring(0,50),hasConditions:!!(el.conditions&&el.conditions.length>0),conditions:el.conditions,combinationKey:el.combinationKey,keyMatches,conditionsMatch,willInclude:el.conditions&&el.conditions.length>0?conditionsMatch:keyMatches},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}),0);
            // #endregion
            
            // Image is included if either:
            // - No conditions AND key matches, OR
            // - Conditions exist AND all are satisfied (key check is secondary)
            if (el.conditions && el.conditions.length > 0) {
              return conditionsMatch; // Conditions take precedence
            }
            
            return keyMatches; // Fall back to key matching if no conditions
          }
      ) || [];
      // #region agent log
      setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:303',message:'Filtered images after evaluation',data:{pageIndex,count:imageLayers.length,images:imageLayers.map(i=>({id:i.id,label:i.label,url:i.url?.substring(0,50),layer:i.position.layer,conditions:i.conditions}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{}),0);
      // #endregion
      
      // Sort by layer if available
       imageLayers.sort((a, b) => (a.position.layer || 0) - (b.position.layer || 0));
      // #region agent log
      setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:306',message:'Images sorted by layer',data:{pageIndex,layers:imageLayers.map(i=>({id:i.id,label:i.label,layer:i.position.layer,url:i.url?.substring(0,50)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{}),0);
      // #endregion
      
      for (const layer of imageLayers) {
          if (layer.url) {
             // #region agent log
             setTimeout(()=>fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'imageGenerator.ts:309',message:'Drawing image layer',data:{pageIndex,imageId:layer.id,label:layer.label,url:layer.url?.substring(0,50),x:layer.position.x,y:layer.position.y,width:layer.position.width,height:layer.position.height,layer:layer.position.layer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{}),0);
             // #endregion
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
