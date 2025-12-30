import { TextElement, ImageElement } from '../types/admin';
import JSZip from 'jszip';

interface ParsedPage {
  pageIndex: number;
  width: number;
  height: number;
  texts: TextElement[];
  images: ImageElement[];
}

// Map of filename -> Blob URL
type ImageMap = Record<string, string>;

export const parseZipFile = async (file: File, defaultWidth = 800, defaultHeight = 600): Promise<{ texts: TextElement[], images: ImageElement[], htmlContent: string }> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Find images and create Blob URLs
    const imageMap: ImageMap = {};
    const imagePromises: Promise<void>[] = [];
    
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath))) {
            const promise = zipEntry.async('blob').then(blob => {
                const url = URL.createObjectURL(blob);
                imageMap[relativePath] = url;
                const parts = relativePath.split('/');
                const filename = parts[parts.length - 1];
                imageMap[filename] = url;
            });
            imagePromises.push(promise);
        }
    });
    
    await Promise.all(imagePromises);

    // Find HTML file
    let htmlFile: JSZip.JSZipObject | null = null;
    const files = Object.keys(contents.files);
    const indexHtml = files.find(f => f.match(/index\.html?$/i));
    if (indexHtml) {
        htmlFile = contents.files[indexHtml];
    } else {
        const anyHtml = files.find(f => f.match(/\.html?$/i));
        if (anyHtml) {
            htmlFile = contents.files[anyHtml];
        }
    }
    
    if (!htmlFile) {
        throw new Error("No HTML file found in ZIP");
    }
    
    const rawHtmlContent = await htmlFile.async('string');
    
    // Extract CSS files content
    let cssContent = '';
    const cssPromises: Promise<void>[] = [];
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.endsWith('.css')) {
            const promise = zipEntry.async('string').then(content => {
                cssContent += content + '\n';
            });
            cssPromises.push(promise);
        }
    });
    await Promise.all(cssPromises);
    
    const parsed = parseHtmlContent(rawHtmlContent, defaultWidth, defaultHeight, imageMap, file.name, cssContent);
    
    // Use the cleaned HTML from parseHtmlContent as the base for the preview
    let previewHtml = parsed.cleanedHtml;
    
    // 1. Inject CSS
    if (cssContent) {
        if (previewHtml.includes('</head>')) {
            previewHtml = previewHtml.replace('</head>', `<style>\n${cssContent}\n</style></head>`);
        } else {
            previewHtml = `<style>\n${cssContent}\n</style>` + previewHtml;
        }
    }
    
    // 2. Replace Images using DOM manipulation
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        
        // Helper to find image in map
        const findImage = (src: string) => {
            if (!src) return null;
            if (imageMap[src]) return imageMap[src];
            try {
                const decoded = decodeURIComponent(src);
                if (imageMap[decoded]) return imageMap[decoded];
            } catch (e) {}
            const cleanSrc = src.replace(/^\.\//, '');
            if (imageMap[cleanSrc]) return imageMap[cleanSrc];
            const parts = src.split('/');
            const filename = parts[parts.length - 1];
            if (imageMap[filename]) return imageMap[filename];
            try {
                const decodedFilename = decodeURIComponent(filename);
                if (imageMap[decodedFilename]) return imageMap[decodedFilename];
            } catch (e) {}
            return null;
        };
        
        // Replace images
        const imgElements = doc.querySelectorAll('img');
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                const replacement = findImage(src);
                if (replacement) {
                    img.setAttribute('src', replacement);
                }
            }
        });
        
        // Replace background images
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
            if (el instanceof HTMLElement) {
                const style = el.getAttribute('style');
                if (style && style.includes('url(')) {
                    const urlMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                    if (urlMatch && urlMatch[1]) {
                        const originalUrl = urlMatch[1];
                        const replacement = findImage(originalUrl);
                        if (replacement) {
                            const newStyle = style.replace(originalUrl, replacement);
                            el.setAttribute('style', newStyle);
                        }
                    }
                }
            }
        });

        previewHtml = doc.documentElement.outerHTML;
    } catch (e) {
        console.warn("Failed to process preview HTML images", e);
    }
    
    return { ...parsed, htmlContent: previewHtml };
};

export const parseHtmlFile = async (file: File, defaultWidth = 800, defaultHeight = 600): Promise<{ texts: TextElement[], images: ImageElement[], htmlContent: string }> => {
  const text = await file.text();
  const parsed = parseHtmlContent(text, defaultWidth, defaultHeight, {}, file.name);
  return { ...parsed, htmlContent: parsed.cleanedHtml };
};

const parseHtmlContent = (htmlText: string, defaultWidth: number, defaultHeight: number, imageMap: ImageMap, sourceName: string, cssContent: string = ''): { texts: TextElement[], images: ImageElement[], cleanedHtml: string } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const texts: TextElement[] = [];
  const images: ImageElement[] = [];
  const keepSet = new Set<Element>();

  const markKeep = (el: Element) => {
      let current: Element | null = el;
      while (current && !keepSet.has(current)) {
          keepSet.add(current);
          current = current.parentElement;
      }
  };
  
  // Always keep body, head, html
  markKeep(doc.body);
  if (doc.head) markKeep(doc.head);
  if (doc.documentElement) markKeep(doc.documentElement);

  // ... (rest of extraction logic)

  // 1. Attempt to identify "Pages"
  // in5 often uses <ul id="slider"><li>...</li></ul> or similar structures, or just a flat list of divs.
  // We'll look for top-level containers that might be pages.
  // If no clear page structure, we assume single page (Page 1).

  // Strategy: Find all elements that look like "containers" (large divs) or treat the body as one page.
  // For simplicity in this v1, let's try to find elements with class "page" or "spread", or fall back to analyzing all absolute positioned elements.

  // Let's assume the user exports "Current Page" or a specific spread, or we treat the whole HTML as one "Page 1" context if explicit pages aren't found.
  
  // IN5 Specifics: usually puts content in <div class="page">
  const pageElements = Array.from(doc.querySelectorAll('.page'));
  
  // If no .page class, maybe it's a simple export, let's treat body as the container
  const pagesToProcess = pageElements.length > 0 ? pageElements : [doc.body];

  pagesToProcess.forEach((pageEl, index) => {
    // Determine page index. If we found .page, use index+1. If not, default to 1.
    // However, if the file name contains "cover", we might default to 0.
    let pageIndex = index + 1; // Default to starting at Page 1
    
    // Check for "Cover" in filename or ID
    if (sourceName.toLowerCase().includes('cover') || pageEl.id.toLowerCase().includes('cover')) {
        pageIndex = 0;
    } else {
        // Try to extract from ID (e.g., "page12")
        const match = pageEl.id.match(/page[-_]?(\d+)/i);
        if (match) {
            pageIndex = parseInt(match[1], 10);
        }
    }

    // 0. Extract CSS styles if present in the ZIP
    // We expect cssContent to be a concatenated string of all CSS files or a map.
    // For simplicity, let's assume we pass a combined CSS string or try to parse <style> blocks or <link> tags if we can't get external CSS easily here yet.
    // Ideally, parseZipFile should have passed the CSS content.
    // Let's modify the signature of parseHtmlContent to accept cssMap (filename -> content) or just cssContent.
    
    // Simple CSS Parser to map selectors to styles
    const cssRules: Record<string, any> = {};
    if (cssContent) {
        // Very basic parser: selector { property: value; }
        // Remove comments
        const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
        const ruleRegex = /([^{]+)\{([^}]+)\}/g;
        let match;
        while ((match = ruleRegex.exec(cleanCss)) !== null) {
            const selectors = match[1].split(',').map(s => s.trim());
            const declarations = match[2].split(';').map(d => d.trim()).filter(Boolean);
            const styleObj: any = {};
            declarations.forEach(decl => {
                const [prop, val] = decl.split(':').map(s => s.trim());
                if (prop && val) styleObj[prop] = val;
            });
            
            selectors.forEach(sel => {
                cssRules[sel] = { ...cssRules[sel], ...styleObj };
            });
        }
    }

    // Helper to get computed style from inline + matched CSS rules
    const getComputedStyleMock = (el: Element): any => {
        const style: any = { ...(el as HTMLElement).style }; // Inline styles have priority? Actually inline > ID > Class > Tag
        // But for this simple importer, we'll merge: CSS Rules first, then Inline overrides.
        
        // 1. Tag name
        const tag = el.tagName.toLowerCase();
        if (cssRules[tag]) Object.assign(style, cssRules[tag]);
        
        // 2. Classes
        if (el.classList && el.classList.length > 0) {
            el.classList.forEach(cls => {
                if (cssRules[`.${cls}`]) Object.assign(style, cssRules[`.${cls}`]);
            });
        }
        
        // 3. ID
        if (el.id) {
            if (cssRules[`#${el.id}`]) Object.assign(style, cssRules[`#${el.id}`]);
        }
        
        // 4. Inline (already in style object if we iterated it, but let's explicity overwrite)
        const inlineStyle = (el as HTMLElement).style;
        for (let i = 0; i < inlineStyle.length; i++) {
            const prop = inlineStyle[i];
            style[prop] = inlineStyle.getPropertyValue(prop);
        }
        
        // Also map standard properties that might be on the style object directly (like .left, .top)
        // If they were set via CSS string "left: 10px", they are in style['left'] now.
        
        return style;
    };
    

    // Determine dimensions of this page
    let pageWidth = defaultWidth;
    let pageHeight = defaultHeight;

    const calculateBounds = (container: Element): { width: number, height: number } | null => {
        const children = Array.from(container.querySelectorAll('*'));
        let maxX = 0;
        let maxY = 0;
        let found = false;

        children.forEach(el => {
            if (!(el instanceof HTMLElement)) return;
            const style = getComputedStyleMock(el);
            let left = parseFloat(style.left || '0');
            let top = parseFloat(style.top || '0');
            const width = parseFloat(style.width || '0');
            const height = parseFloat(style.height || '0');

            // Check transforms
            if (style.transform) {
                const translateMatch = style.transform.match(/translate\(([^,]+)(?:,\s*([^)]+))?\)/);
                if (translateMatch) {
                    const tx = parseFloat(translateMatch[1]) || 0;
                    const ty = parseFloat(translateMatch[2]) || 0;
                    left += tx;
                    top += ty;
                }
                const matrixMatch = style.transform.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/);
                if (matrixMatch) {
                     const tx = parseFloat(matrixMatch[1]) || 0;
                     const ty = parseFloat(matrixMatch[2]) || 0;
                     left += tx;
                     top += ty;
                }
            }
            
            if (left || top || width || height) {
                maxX = Math.max(maxX, left + width);
                maxY = Math.max(maxY, top + height);
                found = true;
            }
        });
        
        return found ? { width: maxX, height: maxY } : null;
    };

    if (pageEl instanceof HTMLElement) {
        // We can't use getBoundingClientRect on a detached DOM node easily without rendering it.
        // We have to parse inline styles or attributes.
        const pageStyle = getComputedStyleMock(pageEl);
        const styleWidth = pageStyle.width;
        const styleHeight = pageStyle.height;
        if (styleWidth && styleHeight) {
            pageWidth = parseFloat(styleWidth);
            pageHeight = parseFloat(styleHeight);
        } else {
            // Try attributes
             const attrW = pageEl.getAttribute('width');
             const attrH = pageEl.getAttribute('height');
             if (attrW && attrH) {
                 pageWidth = parseFloat(attrW);
                 pageHeight = parseFloat(attrH);
             } else {
                 // Try to guess from content bounds
                 const bounds = calculateBounds(pageEl);
                 if (bounds) {
                     pageWidth = Math.max(defaultWidth, bounds.width);
                     pageHeight = Math.max(defaultHeight, bounds.height);
                 }
             }
        }
    }

    // Now find all absolute elements inside this page
    const elements = Array.from(pageEl.querySelectorAll('*'));
    
    elements.forEach(el => {
        if (!(el instanceof HTMLElement)) return;
        
        // Check if it has positioning (inline style usually for exports)
        // We are looking for "left" and "top", OR "transform: translate"
        const style = getComputedStyleMock(el);
        let leftStr = style.left;
        let topStr = style.top;
        
        // Handle transform: translate(x, y) or matrix
        let transformX = 0;
        let transformY = 0;
        if (style.transform) {
             const translateMatch = style.transform.match(/translate\(([^,]+)(?:,\s*([^)]+))?\)/);
             if (translateMatch) {
                 transformX = parseFloat(translateMatch[1]) || 0;
                 transformY = parseFloat(translateMatch[2]) || 0;
             }
             // Simple matrix support: matrix(1, 0, 0, 1, x, y)
             const matrixMatch = style.transform.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/);
             if (matrixMatch) {
                 transformX = parseFloat(matrixMatch[1]) || 0;
                 transformY = parseFloat(matrixMatch[2]) || 0;
             }
        }

        // Convert bottom/right to top/left if needed
        if (!leftStr && style.right) {
             // We need parent width, assume page width for direct children
             // This is an approximation
             const right = parseFloat(style.right);
             const width = parseFloat(style.width) || 0;
             leftStr = `${pageWidth - right - width}px`;
        }
        
        if (!topStr && style.bottom) {
             const bottom = parseFloat(style.bottom);
             const height = parseFloat(style.height) || 0;
             topStr = `${pageHeight - bottom - height}px`;
        }

        // Heuristic: Removed strict positioning check to support flow-based HTML
        // if ((!leftStr && !transformX) || (!topStr && !transformY)) return;

        const xPx = (parseFloat(leftStr || '0') + transformX);
        const yPx = (parseFloat(topStr || '0') + transformY);
        const wPx = parseFloat(style.width) || 100; // Default width if missing
        const hPx = parseFloat(style.height) || 50; // Default height if missing

        // Convert to Percentages
        const x = (xPx / pageWidth) * 100;
        const y = (yPx / pageHeight) * 100;
        const w = (wPx / pageWidth) * 100;
        const h = (hPx / pageHeight) * 100;

        // Clean label
        const cleanLabel = (el.id || el.className || el.tagName).substring(0, 20);

        // IS IT AN IMAGE?
        // Also check background-image on DIVs
        const bgImage = style.backgroundImage;
        if (el.tagName.toLowerCase() === 'img' || (el.tagName.toLowerCase() === 'div' && bgImage && bgImage !== 'none')) {
            let src = '';
            let isBg = false;

            if (el.tagName.toLowerCase() === 'img') {
                src = (el as HTMLImageElement).getAttribute('src') || '';
            } else if (bgImage) {
                // Extract url(...)
                const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) {
                    src = match[1];
                    isBg = true;
                }
            }

            // Try to resolve from imageMap
            // 1. Exact match
            if (imageMap[src]) {
                src = imageMap[src];
            } else {
                // 2. Decode URI component (spaces etc)
                const decoded = decodeURIComponent(src);
                if (imageMap[decoded]) {
                    src = imageMap[decoded];
                } else {
                   // 3. Just filename
                   const parts = src.split('/');
                   const filename = parts[parts.length - 1];
                   if (imageMap[filename]) {
                       src = imageMap[filename];
                   }
                }
            }

            if (src) {
                 // Note: If src is relative, it might be broken. Ideally user drops a self-contained HTML or we can't fetch resources.
                 // But assuming Data URI or absolute URL for now.
                 // If it's a file path reference, we can't really read it unless it's a Data URI.
                 // We'll skip images that aren't data URIs or http links.
                 if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) {
                    images.push({
                        id: `img-html-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        label: cleanLabel,
                        type: 'static',
                        url: src,
                        combinationKey: 'default',
                        position: {
                            pageIndex,
                            x, y, width: w, height: h,
                            rotation: 0
                        }
                    });
                    markKeep(el);
                 }
            }
        }
        // IS IT TEXT?
        // We look for headings, paragraphs, spans, divs that contain direct text
        else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV'].includes(el.tagName)) {
             // Use textContent to check for non-empty text, even if nested
             const textContent = el.textContent?.trim() || '';
             
             // Check if it has direct text nodes that are not empty, or if it's a leaf node with text
             // Relaxed condition: if it has meaningful text content, we might want to keep it
             if (textContent.length > 0) {
                 // To avoid duplicates (parent div + child span), we prefer leaf nodes OR nodes with direct text content
                 
                 // Check for direct text nodes
                 const hasDirectText = Array.from(el.childNodes).some(node => 
                     node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length || 0) > 0
                 );

                 // Keep if it has direct text or if it has children but they are inline elements (formatting)
                 // This is a heuristic.
                 const isContentBlock = hasDirectText || el.children.length === 0 || 
                     Array.from(el.children).every(child => ['B', 'I', 'U', 'STRONG', 'EM', 'SPAN', 'BR'].includes(child.tagName));

                 if (isContentBlock) {
                     // Basic style extraction
                     const fontSizeStr = style.fontSize;
                     const colorStr = style.color;
                     const fontFamilyStr = style.fontFamily;
                     const textAlignStr = style.textAlign;
                     
                     texts.push({
                          id: `text-html-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                          label: cleanLabel,
                          type: 'fixed',
                          content: textContent,
                          combinationKey: 'default',
                          style: {
                              color: colorStr || '#000000',
                              fontSize: fontSizeStr || '16px',
                              fontFamily: fontFamilyStr?.replace(/['"]/g, '') || 'serif',
                              textAlign: (textAlignStr as any) || 'left'
                          },
                          position: {
                              pageIndex,
                              zoneId: 'body',
                              x, y, width: w,
                              rotation: 0
                          }
                     });
                     markKeep(el);
                 }
             }
        }
    });

  });

  // Filter DOM to remove non-kept elements
  const allNodes = Array.from(doc.querySelectorAll('body *'));
  allNodes.forEach(node => {
      // Keep style tags
      if (node.tagName === 'STYLE' || (node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet')) {
          return; 
      }
      
      if (!keepSet.has(node)) {
          // Check if it's already removed (parent removed)
          if (node.parentNode) {
              node.remove();
          }
      }
  });

  return { texts, images, cleanedHtml: doc.documentElement.outerHTML };
};
