import { jsPDF } from "jspdf";
import { Order } from "../types/ecommerce";

export const generateCoverPDF = (order: Order): Blob => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  order.items.forEach((item, index) => {
    if (index > 0) doc.addPage();

    // Background color (simulated cover)
    doc.setFillColor(255, 240, 245); // Light pinkish
    doc.rect(0, 0, 210, 297, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(50, 50, 50);
    doc.text(item.bookTitle, 105, 80, { align: "center" });

    // Subtitle / Dedication
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.text("Une histoire unique pour", 105, 100, { align: "center" });

    // Child Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(255, 100, 100); // Brand coral-ish
    doc.text(item.configuration.childName || "L'enfant", 105, 120, { align: "center" });

    // Order Info footer
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Commande #${order.id} - Item ${index + 1}/${order.items.length}`, 105, 280, { align: "center" });
    doc.text(`Généré le ${new Date().toLocaleDateString()}`, 105, 285, { align: "center" });
  });

  return doc.output("blob");
};

export const generateInteriorPDF = (order: Order): Blob => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  order.items.forEach((item, index) => {
    if (index > 0) doc.addPage();

    // Title Page of Interior
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text(item.bookTitle, 105, 50, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text("Ce livre appartient à :", 105, 70, { align: "center" });
    doc.setFontSize(16);
    doc.text(item.configuration.childName || "L'enfant", 105, 80, { align: "center" });

    // Story Pages (Mock content based on configuration)
    const storyText = [
      `Il était une fois, un enfant nommé ${item.configuration.childName}.`,
      `C'était un(e) ${item.configuration.gender === 'boy' ? 'garçon' : 'fille'} très courageux(se).`,
      `Un jour, ${item.configuration.childName} partit à l'aventure...`,
      // Add more dynamic text based on other config if available
    ];

    let yPos = 120;
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    
    storyText.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 10;
    });

    // Add specific character info if available
    if (item.configuration.characters) {
        yPos += 20;
        doc.setFont("times", "italic");
        doc.text("Avec la participation de :", 20, yPos);
        yPos += 10;
        Object.entries(item.configuration.characters).forEach(([key, char]: [string, any]) => {
            if (char.name) {
                doc.text(`- ${char.name} (${char.role || key})`, 25, yPos);
                yPos += 7;
            }
        });
    }

    // Page number
    doc.setFontSize(10);
    doc.text("Page 1", 105, 290, { align: "center" });
  });

  return doc.output("blob");
};
