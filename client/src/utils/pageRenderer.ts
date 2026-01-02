import html2canvas from 'html2canvas';
import { RawHtmlPage, ImageElement, ImageCondition } from '../types/admin';
import { BookConfig, Gender } from '../types';

export interface RenderedPage {
  pageIndex: number;
  dataUrl: string;
}

const decodeHtmlEntities = (html: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

// Check if an image's conditions match the user's selections
const checkImageConditions = (
  conditions: ImageCondition[] | undefined,
  characters: Record<string, Record<string, string>> | undefined
): boolean => {
  // No conditions means always show
  if (!conditions || conditions.length === 0) return true;
  
  // All conditions must match
  return conditions.every(cond => {
    if (!characters) return false;
    
    // Search in all tabs for the variant
    for (const tabId of Object.keys(characters)) {
      const tabSelections = characters[tabId];
      if (tabSelections[cond.variantId] !== undefined) {
        // For checkbox variants, the value is stored as string "true" or "false"
        const selectedValue = tabSelections[cond.variantId];
        return selectedValue === cond.optionId;
      }
    }
    
    return false; // Condition not found in selections
  });
};

const resolveVariables = (html: string, config: BookConfig, characters?: Record<string, Record<string, string>>): string => {
  let content = html;
  
  console.log('[pageRenderer] resolveVariables - config.childName:', config.childName);
  console.log('[pageRenderer] resolveVariables - characters:', JSON.stringify(characters));

  // Helper to find value from characters (searches all tabs for the variant id)
  const findInCharacters = (variantId: string): string | null => {
    if (!characters) return null;
    // Check if variantId contains a dot (tab.variant format)
    if (variantId.includes('.')) {
      const [tabId, vid] = variantId.split('.');
      if (characters[tabId]?.[vid]) return characters[tabId][vid];
    }
    // Search in all tabs for the variant id
    for (const tabId of Object.keys(characters)) {
      if (characters[tabId]?.[variantId]) {
        return characters[tabId][variantId];
      }
    }
    return null;
  };

  // Handle {{variable}} format (double braces)
  content = content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const k = key.trim();
    if (k === 'childName' || k === 'name') return config.childName || "l'enfant";
    if (k === 'age') return config.age?.toString() || '';
    if (k === 'dedication') return config.dedication || '';
    if (k === 'heroName') return config.childName || 'Héros';
    if (k === 'gender') return config.gender === Gender.Girl ? 'Fille' : 'Garçon';

    const found = findInCharacters(k);
    if (found) return found;
    
    return match;
  });

  // Handle {variable} format (single braces) - common in EPUB exports
  content = content.replace(/\{([^}]+)\}/g, (match, key) => {
    const k = key.trim();
    
    // Standard mappings
    if (k === 'childName') return config.childName || "l'enfant";
    if (k === 'age') return config.age?.toString() || '';
    
    // Special handling for nom_enfant - check characters first, then fallback to config.childName
    if (k === 'nom_enfant') {
      const found = findInCharacters('nom_enfant');
      console.log('[pageRenderer] Found nom_enfant in characters:', found);
      if (found) return found;
      return config.childName || "l'enfant";
    }
    
    // Search in characters for any other variable
    const found = findInCharacters(k);
    if (found) {
      console.log(`[pageRenderer] Resolved variable {${k}} to:`, found);
      return found;
    }
    
    console.log(`[pageRenderer] Variable {${k}} not found, keeping original`);
    return match;
  });

  return content;
};

export const renderHtmlPageToImage = async (
  rawPage: RawHtmlPage,
  cssContent: string,
  config: BookConfig,
  characters?: Record<string, Record<string, string>>,
  imageMap?: Record<string, string>,
  imageElements?: ImageElement[]
): Promise<string> => {
  console.log('[pageRenderer] Starting render for page', rawPage.pageIndex);
  console.log('[pageRenderer] Raw HTML (first 100 chars):', rawPage.html?.substring(0, 100));
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${rawPage.width}px`;
  container.style.height = `${rawPage.height}px`;
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';

  // Decode HTML entities first (server may encode < > as &lt; &gt;)
  let html = decodeHtmlEntities(rawPage.html);
  console.log('[pageRenderer] After decode (first 100 chars):', html?.substring(0, 100));
  
  // Extract body content from EPUB HTML (it contains full HTML structure)
  let bodyContent = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
    console.log('[pageRenderer] Extracted body content (first 200 chars):', bodyContent?.substring(0, 200));
  } else {
    console.log('[pageRenderer] No body tag found, using full HTML');
  }
  
  bodyContent = resolveVariables(bodyContent, config, characters);

  if (imageMap) {
    for (const [key, url] of Object.entries(imageMap)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      bodyContent = bodyContent.replace(new RegExp(`src=["']${escapedKey}["']`, 'g'), `src="${url}"`);
      bodyContent = bodyContent.replace(new RegExp(`src=["'][^"']*/${escapedKey}["']`, 'g'), `src="${url}"`);
    }
  }

  // Filter images based on conditions
  console.log('[pageRenderer] imageElements passed:', imageElements?.length, 'for page:', rawPage.pageIndex);
  console.log('[pageRenderer] characters:', JSON.stringify(characters));
  
  if (imageElements && imageElements.length > 0) {
    // Get images for this page that have conditions
    const pageImageElements = imageElements.filter(
      img => img.position.pageIndex === rawPage.pageIndex && img.conditions && img.conditions.length > 0
    );
    
    console.log('[pageRenderer] Page images with conditions:', pageImageElements.length);
    
    // For each image with conditions, check if it should be visible
    pageImageElements.forEach(imgEl => {
      const shouldShow = checkImageConditions(imgEl.conditions, characters);
      console.log(`[pageRenderer] Image ${imgEl.id} url:`, imgEl.url?.substring(0, 50));
      console.log(`[pageRenderer] Image ${imgEl.id} conditions:`, JSON.stringify(imgEl.conditions), 'shouldShow:', shouldShow);
      
      if (!shouldShow && imgEl.url) {
        // Hide images that don't match conditions by replacing with transparent placeholder
        const escapedUrl = imgEl.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log('[pageRenderer] Hiding image, searching for URL:', imgEl.url);
        // Replace img src with a 1px transparent gif
        const beforeReplace = bodyContent;
        bodyContent = bodyContent.replace(
          new RegExp(`src=["']${escapedUrl}["']`, 'g'),
          'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="opacity:0;visibility:hidden;"'
        );
        console.log('[pageRenderer] Replaced:', beforeReplace !== bodyContent);
      }
    });
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Quicksand:wght@400;500;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Quicksand:wght@400;500;600;700&family=Patrick+Hand&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${rawPage.width}px; height: ${rawPage.height}px; overflow: hidden; background: white; position: relative; font-family: 'Quicksand', 'Nunito', sans-serif; }
          ${cssContent || ''}
        </style>
      </head>
      <body style="width:${rawPage.width}px;height:${rawPage.height}px;position:relative;">
        ${bodyContent}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = `${rawPage.width}px`;
  iframe.style.height = `${rawPage.height}px`;
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document');
        }

        iframeDoc.open();
        iframeDoc.write(fullHtml);
        iframeDoc.close();

        // Wait for fonts to load - fonts need more time than 100ms
        await new Promise(r => setTimeout(r, 500));
        
        // Try to wait for fonts API if available
        if (iframeDoc.fonts && iframeDoc.fonts.ready) {
          try {
            await Promise.race([
              iframeDoc.fonts.ready,
              new Promise(r => setTimeout(r, 2000)) // Timeout after 2s
            ]);
          } catch (e) {
            console.log('[pageRenderer] Font loading check failed, continuing anyway');
          }
        }

        const canvas = await html2canvas(iframeDoc.body, {
          width: rawPage.width,
          height: rawPage.height,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        console.log('[pageRenderer] Generated dataUrl length:', dataUrl?.length, 'starts with:', dataUrl?.substring(0, 50));
        document.body.removeChild(iframe);
        resolve(dataUrl);
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error('Failed to load iframe'));
    };

    iframe.src = 'about:blank';
  });
};

export const renderAllPages = async (
  rawPages: RawHtmlPage[],
  cssContent: string,
  config: BookConfig,
  characters?: Record<string, Record<string, string>>,
  imageMap?: Record<string, string>,
  onProgress?: (current: number, total: number) => void,
  imageElements?: ImageElement[]
): Promise<Record<number, string>> => {
  const result: Record<number, string> = {};

  const sortedPages = [...rawPages].sort((a, b) => a.pageIndex - b.pageIndex);

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    try {
      const dataUrl = await renderHtmlPageToImage(page, cssContent, config, characters, imageMap, imageElements);
      result[page.pageIndex] = dataUrl;
      onProgress?.(i + 1, sortedPages.length);
    } catch (error) {
      console.error(`Failed to render page ${page.pageIndex}:`, error);
    }
  }

  return result;
};
