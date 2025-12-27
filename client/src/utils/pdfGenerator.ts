import { jsPDF } from "jspdf";
import { Order, OrderItem } from "../types/ecommerce";
import { BookProduct, TextElement, ImageElement } from "../types/admin";

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Helper to determine combination key
const getCombinationKey = (book: BookProduct, configuration: any) => {
    if (!book.wizardConfig?.tabs || !configuration) return 'default';
    
    // configuration in OrderItem is the characters map itself (from createOrder: item.config.characters)
    // But we also support if it's passed with a 'characters' wrapper
    const characters = configuration.characters || configuration;

    const optionIds: string[] = [];
    
    book.wizardConfig.tabs.forEach(tab => {
        if (tab.type === 'character' && characters[tab.id]) {
            tab.variants.forEach(v => {
                if (v.type === 'options') {
                    const selectedOptId = characters[tab.id][v.id];
                    if (selectedOptId) optionIds.push(selectedOptId);
                }
            });
        }
    });
    
    if (optionIds.length === 0) return 'default';
    return optionIds.sort().join('_');
};

// Helper to resolve variables
const resolveVariables = (text: string, orderItem: OrderItem, book: BookProduct) => {
  if (!text) return "";
  
  const characters = orderItem.configuration.characters || orderItem.configuration;

  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    if (key === 'childName') return characters.childName || orderItem.configuration.childName || "L'enfant";
    
    // Handle {tabId.variantId} - e.g. {123.456}
    const [tabId, variantId] = key.split('.');
    if (tabId && variantId && characters[tabId]) {
         const selectedOptionId = characters[tabId][variantId];
         // We returns the ID. If we wanted the LABEL, we would need to look it up in book.wizardConfig
         // For now, returning the ID or Value stored.
         return selectedOptionId || match;
    }
    return match;
  });
};

const renderPageContent = async (doc: jsPDF, book: BookProduct, pageIndex: number, orderItem: OrderItem, widthMm: number, heightMm: number) => {
    const combinationKey = getCombinationKey(book, orderItem.configuration);
    const characters = orderItem.configuration.characters || orderItem.configuration;

    console.log(`Generating Page ${pageIndex} with key: ${combinationKey}`);

    // 1. Background
    // Find background image for this page with matching combination key
    const bgImage = book.contentConfig.images.find(
        img => img.pageIndex === pageIndex && (img.combinationKey === combinationKey || img.combinationKey === 'default')
    );

    if (bgImage && bgImage.imageUrl) {
        try {
            const img = await loadImage(bgImage.imageUrl);
            // Draw background filling the page
            doc.addImage(img, 'JPEG', 0, 0, widthMm, heightMm);
        } catch (e) {
            console.error("Failed to load background", e);
        }
    } else {
        // White background by default
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, widthMm, heightMm, 'F');
    }

    // 2. Images (Stickers)
    const images = (book.contentConfig.imageElements || []).filter(el => el.position.pageIndex === pageIndex);
    for (const el of images) {
        let url = el.url;
        
        // Resolve variable images
        if (el.type === 'variable' && el.variableKey) {
             const tabId = el.variableKey;
             const tab = book.wizardConfig?.tabs.find(t => t.id === tabId);
             
             if (tab && characters[tabId]) {
                  const optionIds: string[] = [];
                  tab.variants.forEach(v => {
                     if (v.type === 'options') {
                         const selectedOptId = characters[tabId][v.id];
                         if (selectedOptId) optionIds.push(selectedOptId);
                     }
                  });
                  
                  if (optionIds.length > 0) {
                      const key = optionIds.sort().join('_');
                      if (book.wizardConfig?.avatarMappings?.[key]) {
                          url = book.wizardConfig.avatarMappings[key];
                      }
                  }
             }
        }

        if (url) {
            try {
                const img = await loadImage(url);
                const x = ((el.position.x || 0) / 100) * widthMm;
                const y = ((el.position.y || 0) / 100) * heightMm;
                const w = ((el.position.width || 0) / 100) * widthMm;
                const h = el.position.height ? (el.position.height / 100) * heightMm : (w * (img.height / img.width));

                // Handle rotation if needed (jspdf supports it via context transformation or specialized calls, simpler to ignore for MVP or use advanced API)
                if (el.position.rotation) {
                     // Advanced rotation handling would go here
                     doc.addImage(img, 'PNG', x, y, w, h, undefined, 'FAST', el.position.rotation);
                } else {
                     doc.addImage(img, 'PNG', x, y, w, h);
                }
            } catch (e) {
                console.error("Failed to load element image", e);
            }
        }
    }


    // 3. Texts
    const texts = book.contentConfig.texts.filter(t => t.position.pageIndex === pageIndex);
    for (const text of texts) {
        const content = resolveVariables(text.content, orderItem, book);
        const x = ((text.position.x || 0) / 100) * widthMm;
        const y = ((text.position.y || 0) / 100) * heightMm;
        
        // Font settings
        const fontSize = text.style?.fontSize ? parseInt(text.style.fontSize as string) : 16;
        // Convert px to pt approx (1px = 0.75pt) or keep somewhat proportional
        const ptSize = fontSize * 0.75; 
        
        doc.setFontSize(ptSize);
        
        if (text.style?.fontWeight === 'bold') doc.setFont("helvetica", "bold");
        else if (text.style?.fontStyle === 'italic') doc.setFont("helvetica", "italic");
        else doc.setFont("helvetica", "normal");

        const color = hexToRgb(text.style?.color || '#000000');
        doc.setTextColor(color.r, color.g, color.b);

        // Calculate Max Width for word wrapping
        const maxWidth = text.position.width ? (text.position.width / 100) * widthMm : (widthMm - x - 10);
        
        doc.text(content, x, y + ptSize/3, { maxWidth: maxWidth }); // Adjust Y baseline approx
    }
};

export const generateCoverPDF = async (order: Order, books: BookProduct[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3", // Placeholder, will be managed per page
  });

  // Remove the initial default page eventually, or use it if it matches
  let isFirstPage = true;

  for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const book = books.find(b => b.id === item.bookId);
      
      if (!book) continue;

      const dim = book.features?.dimensions || { width: 210, height: 210 };
      const widthMm = dim.width;
      const heightMm = dim.height;
      
      const coverConfig = book.features?.printConfig?.cover;
      const bleedMm = coverConfig?.bleedMm || 0;
      const spineMm = coverConfig?.spineWidthMm || 10;
      
      // Calculate Full Spread Dimensions (Bleed + Back + Spine + Front + Bleed)
      const totalWidth = bleedMm + widthMm + spineMm + widthMm + bleedMm;
      const totalHeight = bleedMm + heightMm + bleedMm;

      if (isFirstPage) {
          // If we can't easily resize the first page cleanly in all jsPDF versions, 
          // we add a new one and delete the default one later.
          doc.addPage([totalWidth, totalHeight], totalWidth > totalHeight ? 'l' : 'p');
          isFirstPage = false;
      } else {
          doc.addPage([totalWidth, totalHeight], totalWidth > totalHeight ? 'l' : 'p');
      }

      // Render Page 0 (Cover Spread)
      // We interpret Page 0 as the full spread now.
      await renderPageContent(doc, book, 0, item, totalWidth, totalHeight);
  }
  
  // Delete the default first page (index 1 in jsPDF logic if 1-based, or we inserted after it)
  // Actually doc.addPage adds to end. So page 1 is the default A3.
  doc.deletePage(1);
  
  return doc.output("blob");
};

export const generateInteriorPDF = async (order: Order, books: BookProduct[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const book = books.find(b => b.id === item.bookId);
      
      if (!book) continue;

      if (i > 0) doc.addPage();

      // Iterate through all pages in config
      // Filter valid pages (exclude covers)
      const pages = book.contentConfig.pages
        .filter(p => p.pageNumber > 0 && p.pageNumber < 900)
        .sort((a, b) => a.pageNumber - b.pageNumber);
        
      for (let j = 0; j < pages.length; j++) {
          const page = pages[j];
          if (j > 0) doc.addPage();
          
          await renderPageContent(doc, book, page.pageNumber, item, PAGE_WIDTH, PAGE_HEIGHT);
          
          // Add page number at bottom if interior
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`${page.pageNumber}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: "center" });
      }
      
      if (pages.length === 0) {
          // Fallback if no pages configured
          doc.text("No pages configured for this book.", 20, 20);
      }
  }

  return doc.output("blob");
};

