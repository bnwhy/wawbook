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

// Helper to resolve variables
const resolveVariables = (text: string, orderItem: OrderItem, book: BookProduct) => {
  if (!text) return "";
  
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    if (key === 'childName') return orderItem.configuration.childName || "L'enfant";
    
    // Handle {tabId.variantId} - e.g. {123.456}
    const [tabId, variantId] = key.split('.');
    if (tabId && variantId && orderItem.configuration.characters?.[tabId]) {
         const selectedOptionId = orderItem.configuration.characters[tabId][variantId];
         // We might need to map this ID back to a label if the variable expects text
         // But usually variables in text are simple strings.
         // If the variable represents a character option, we might return the option label?
         // For now, let's assume simple text replacement isn't fully supported for complex character traits in this PDF generator yet,
         // or return the value from config if it exists.
         return orderItem.configuration.characters[tabId][variantId] || match;
    }
    return match;
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

const renderPageContent = async (doc: jsPDF, book: BookProduct, pageIndex: number, orderItem: OrderItem, widthMm: number, heightMm: number) => {
    // 1. Background
    // Find background image for this page
    // We need to determine the "combination key" from the order item configuration
    // This is a bit complex as we need to match the logic in BookPreview.tsx
    // For now, let's default to finding ANY background for this page, or 'default'
    // TODO: Implement proper combination key resolution based on orderItem.configuration
    
    const bgImage = book.contentConfig.images.find(
        img => img.pageIndex === pageIndex && (img.combinationKey === 'default' || !img.combinationKey)
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
             // Logic to resolve variable image from avatar mappings would go here
             // For this mockup, we might skip or use placeholder
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
  // Assuming all items in order use the same page size (A4 default)
  const doc = new jsPDF({
    orientation: "landscape", // Spread usually needs landscape if we put both covers? Or we generate separate files/pages?
    // Request says "Fichier Couverture (PDF)". Often covers are sent as a single spread (Back + Spine + Front)
    // For simplicity, let's create a 2-page PDF: Back Cover (p999) then Front Cover (p0), or a single spread page.
    // Let's do a single page spread: width * 2 + spine.
    // Or just 2 separate pages for now to match the "Spread" view?
    // Let's stick to: Page 1 = Back Cover, Page 2 = Front Cover. Or strictly configured.
    // Actually, printers often want a single wide PDF. 
    // Let's go with Page 1 = Back Cover, Page 2 = Front Cover for simplicity of implementation here.
    unit: "mm",
    format: "a4", // Should be based on book dimensions
  });

  // Default A4 dimensions
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const book = books.find(b => b.id === item.bookId);
      
      if (!book) continue; // Skip if book not found (shouldn't happen)

      if (i > 0) doc.addPage();

      // PAGE 1: BACK COVER (Page 999)
      // doc.text(`Back Cover - ${item.bookTitle}`, 10, 10);
      await renderPageContent(doc, book, 999, item, PAGE_WIDTH, PAGE_HEIGHT);

      doc.addPage();

      // PAGE 2: FRONT COVER (Page 0)
      await renderPageContent(doc, book, 0, item, PAGE_WIDTH, PAGE_HEIGHT);
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

