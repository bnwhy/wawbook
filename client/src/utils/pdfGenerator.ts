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
  // Use book dimensions if available, otherwise A4 default
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 210; // Square format default often used for children books, but let's check book dimensions

  const doc = new jsPDF({
    orientation: "landscape", // Spread usually needs landscape if we put both covers? Or we generate separate files/pages?
    unit: "mm",
    format: [PAGE_WIDTH * 2 + 10, PAGE_HEIGHT], // Double width + spine
  });

  for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const book = books.find(b => b.id === item.bookId);
      
      if (!book) continue; // Skip if book not found (shouldn't happen)

      const dim = book.features?.dimensions || { width: 210, height: 210 };
      const widthMm = dim.width;
      const heightMm = dim.height;
      const spineMm = 10; // Calculated based on page count usually

      if (i > 0) doc.addPage([widthMm * 2 + spineMm, heightMm]);
      else {
          // Re-init with correct format if first page differs (jsPDF constructor sets first page)
          // But here we might just assume standard size. 
          // Ideally we set page size per book.
          // For MVP, let's just stick to A4 or Square.
      }

      // PAGE 1: BACK COVER (Page 999)
      // doc.text(`Back Cover - ${item.bookTitle}`, 10, 10);
      await renderPageContent(doc, book, 999, item, widthMm, heightMm);

      doc.addPage();

      // PAGE 2: FRONT COVER (Page 0)
      await renderPageContent(doc, book, 0, item, widthMm, heightMm);
  }
  
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
        .filter(p => p.pageIndex > 0 && p.pageIndex < 900)
        .sort((a, b) => a.pageIndex - b.pageIndex);
        
      for (let j = 0; j < pages.length; j++) {
          const page = pages[j];
          if (j > 0) doc.addPage();
          
          await renderPageContent(doc, book, page.pageIndex, item, PAGE_WIDTH, PAGE_HEIGHT);
          
          // Add page number at bottom if interior
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`${page.pageIndex}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: "center" });
      }
      
      if (pages.length === 0) {
          // Fallback if no pages configured
          doc.text("No pages configured for this book.", 20, 20);
      }
  }

  return doc.output("blob");
};

