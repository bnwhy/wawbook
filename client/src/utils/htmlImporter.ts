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

export const parseZipFile = async (file: File, defaultWidth = 800, defaultHeight = 600): Promise<{ texts: TextElement[], images: ImageElement[] }> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Find images and create Blob URLs
    const imageMap: ImageMap = {};
    const imagePromises: Promise<void>[] = [];
    
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath))) {
            const promise = zipEntry.async('blob').then(blob => {
                const url = URL.createObjectURL(blob);
                // Store with just the filename, and maybe relative path? 
                // Usually HTML exports might reference "images/foo.jpg" or just "foo.jpg".
                // We'll store both full relative path and just filename to be safe.
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
    // We look for index.html or the first html file we find
    let htmlFile: JSZip.JSZipObject | null = null;
    
    // Check for index.html first
    const files = Object.keys(contents.files);
    const indexHtml = files.find(f => f.match(/index\.html?$/i));
    if (indexHtml) {
        htmlFile = contents.files[indexHtml];
    } else {
        // Fallback to first html file
        const anyHtml = files.find(f => f.match(/\.html?$/i));
        if (anyHtml) {
            htmlFile = contents.files[anyHtml];
        }
    }
    
    if (!htmlFile) {
        throw new Error("No HTML file found in ZIP");
    }
    
    const htmlContent = await htmlFile.async('string');
    return parseHtmlContent(htmlContent, defaultWidth, defaultHeight, imageMap, file.name);
};

export const parseHtmlFile = async (file: File, defaultWidth = 800, defaultHeight = 600): Promise<{ texts: TextElement[], images: ImageElement[] }> => {
  const text = await file.text();
  return parseHtmlContent(text, defaultWidth, defaultHeight, {}, file.name);
};

const parseHtmlContent = (htmlText: string, defaultWidth: number, defaultHeight: number, imageMap: ImageMap, sourceName: string): { texts: TextElement[], images: ImageElement[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const texts: TextElement[] = [];
  const images: ImageElement[] = [];

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

    // Determine dimensions of this page
    let pageWidth = defaultWidth;
    let pageHeight = defaultHeight;
    
    // Attempt to calculate page dimensions from content if not explicit
    const calculateBounds = (container: Element): { width: number, height: number } | null => {
        const children = Array.from(container.querySelectorAll('*'));
        let maxX = 0;
        let maxY = 0;
        let found = false;

        children.forEach(el => {
            if (!(el instanceof HTMLElement)) return;
            const style = el.style;
            const left = parseFloat(style.left || '0');
            const top = parseFloat(style.top || '0');
            const width = parseFloat(style.width || '0');
            const height = parseFloat(style.height || '0');
            
            if (left || top) {
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
        const styleWidth = pageEl.style.width;
        const styleHeight = pageEl.style.height;
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
        const style = el.style;
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

        // Heuristic: Must have left/top OR transform to be considered a positioned element worth importing
        if ((!leftStr && !transformX) || (!topStr && !transformY)) return;

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
        if (el.tagName.toLowerCase() === 'img') {
            const imgEl = el as HTMLImageElement;
            let src = imgEl.getAttribute('src') || '';

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
                 }
            }
        }
        // IS IT TEXT?
        // We look for headings, paragraphs, spans, divs that contain direct text
        else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV'].includes(el.tagName)) {
             const textContent = el.innerText.trim();
             if (textContent.length > 0 && el.children.length === 0) {
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
             }
        }
    });

  });

  return { texts, images };
};
