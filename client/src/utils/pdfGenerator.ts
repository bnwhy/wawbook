import { jsPDF } from "jspdf";
import { Order, OrderItem } from "../types/ecommerce";
import { BookProduct, TextElement, ImageElement } from "../types/admin";
import { STORY_TEMPLATES, ACTIVITY_INTROS, THEME_IMAGES } from "../services/geminiService";
import { Theme, Activity } from "../types";

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

      // Check if we have configured content for covers
      const hasCustomFront = book.contentConfig.texts.some(t => t.position.pageIndex === 0) || 
                             (book.contentConfig.imageElements || []).some(el => el.position.pageIndex === 0) ||
                             book.contentConfig.images.some(img => img.pageIndex === 0);

      const hasCustomBack = book.contentConfig.texts.some(t => t.position.pageIndex === 999) || 
                            (book.contentConfig.imageElements || []).some(el => el.position.pageIndex === 999) ||
                            book.contentConfig.images.some(img => img.pageIndex === 999);

      // PAGE 1: BACK COVER (Page 999)
      if (hasCustomBack) {
           await renderPageContent(doc, book, 999, item, PAGE_WIDTH, PAGE_HEIGHT);
      } else {
           // Fallback Back Cover
           doc.setFillColor(79, 70, 229); // Indigo 600 default
           doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
           doc.setFontSize(24);
           doc.setTextColor(255, 255, 255);
           doc.text("Fin", PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: "center" });
           
           doc.setFontSize(12);
           doc.text("Merci d'avoir lu cette histoire !", PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 15, { align: "center" });
      }

      doc.addPage();

      // PAGE 2: FRONT COVER (Page 0)
      if (hasCustomFront) {
          await renderPageContent(doc, book, 0, item, PAGE_WIDTH, PAGE_HEIGHT);
      } else {
          // Fallback Front Cover
          if (book.coverImage) {
              try {
                  const img = await loadImage(book.coverImage);
                  doc.addImage(img, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
                  
                  // Add overlay for text readability
                  doc.setFillColor(0, 0, 0);
                  doc.setGState(new doc.GState({ opacity: 0.3 }));
                  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
                  doc.setGState(new doc.GState({ opacity: 1 }));
              } catch (e) {
                   doc.setFillColor(79, 70, 229); 
                   doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
              }
          } else {
               doc.setFillColor(79, 70, 229); 
               doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
          }
          
          doc.setFontSize(32);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(item.bookTitle, PAGE_WIDTH / 2, PAGE_HEIGHT / 3, { align: "center", maxWidth: PAGE_WIDTH - 40 });
          
          doc.setFontSize(18);
          doc.setFont("helvetica", "normal");
          doc.text(`Une aventure de ${item.configuration.childName || "L'enfant"}`, PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: "center" });
      }
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
        
      if (pages.length > 0) {
          for (let j = 0; j < pages.length; j++) {
              const page = pages[j];
              if (j > 0) doc.addPage();
              
              await renderPageContent(doc, book, page.pageNumber, item, PAGE_WIDTH, PAGE_HEIGHT);
              
              // Add page number at bottom if interior
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(`${page.pageNumber}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: "center" });
          }
      } else {
          // Fallback: Use Template Story
          const template = STORY_TEMPLATES[book.theme];
          if (template) {
              const activityIntro = ACTIVITY_INTROS[item.configuration.appearance?.activity as Activity] || ACTIVITY_INTROS['Aucune'];
              const childName = item.configuration.childName || "L'enfant";
              
              for (let j = 0; j < template.pages.length; j++) {
                  if (j > 0) doc.addPage();
                  const page = template.pages[j];
                  
                  // Render Image
                  const themeImages = THEME_IMAGES[book.theme];
                  if (themeImages && themeImages[j % themeImages.length]) {
                      try {
                          const imgUrl = themeImages[j % themeImages.length];
                          const img = await loadImage(imgUrl);
                          // Render image at top half
                          const imgHeight = (PAGE_HEIGHT * 0.6); // 60% height
                          // Center image
                          const imgRatio = img.width / img.height;
                          let drawW = PAGE_WIDTH;
                          let drawH = PAGE_WIDTH / imgRatio;
                          
                          if (drawH > imgHeight) {
                              drawH = imgHeight;
                              drawW = imgHeight * imgRatio;
                          }
                          
                          const imgX = (PAGE_WIDTH - drawW) / 2;
                          doc.addImage(img, 'JPEG', imgX, 20, drawW, drawH);
                      } catch (e) {
                          console.error("Failed to load template image", e);
                      }
                  }
                  
                  // Render Text
                  const text = page.text.replace(/{name}/g, childName).replace(/{activityIntro}/g, activityIntro);
                  doc.setFontSize(14);
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(0, 0, 0);
                  
                  // Text Area
                  const textY = (PAGE_HEIGHT * 0.65);
                  doc.text(text, 20, textY, { maxWidth: PAGE_WIDTH - 40, align: "center" });
                  
                  // Page Number
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);
                  doc.text(`${j + 1}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: "center" });
              }
          } else {
              doc.text("Configuration manquante et aucun modèle disponible.", 20, 20);
          }
      }
  }

  return doc.output("blob");
};

