
import { ContentConfiguration, PageDefinition, TextElement, ImageElement } from '../types/admin';

/**
 * Parses a Scribus (.sla) file content and converts it into the application's internal ContentConfiguration format.
 * This is a prototype importer that handles basic Text Frames and Image Frames.
 */
export const parseSlaFile = (xmlContent: string): Partial<ContentConfiguration> | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

        const documentElement = xmlDoc.getElementsByTagName('DOCUMENT')[0];
        if (!documentElement) {
            console.error("Invalid Scribus file: No DOCUMENT tag found");
            return null;
        }

        // Get Page Dimensions (Scribus usually uses Points as internal unit, regardless of display unit)
        // 1 pt = 1/72 inch. 
        const pageWidth = parseFloat(documentElement.getAttribute('PAGEWIDTH') || '0');
        const pageHeight = parseFloat(documentElement.getAttribute('PAGEHEIGHT') || '0');

        if (pageWidth === 0 || pageHeight === 0) {
            console.error("Invalid Page Dimensions in Scribus file");
            return null;
        }

        const pages: PageDefinition[] = [];
        const texts: TextElement[] = [];
        const imageElements: ImageElement[] = [];

        // 1. Parse Pages
        // <PAGE ... NUM="0" ... />
        const pageNodes = xmlDoc.getElementsByTagName('PAGE');
        for (let i = 0; i < pageNodes.length; i++) {
            const pageNode = pageNodes[i];
            const pageNum = parseInt(pageNode.getAttribute('NUM') || '0', 10);
            
            pages.push({
                id: `page-${pageNum}`,
                pageNumber: pageNum + 1, // Scribus 0-indexed -> App 1-indexed (usually)
                label: `Page ${pageNum + 1}`,
                description: 'Imported from Scribus'
            });
        }

        // 2. Parse Page Objects (Frames)
        // <PAGEOBJECT ... PTYPE="4" ... /> (Text)
        // <PAGEOBJECT ... PTYPE="2" ... /> (Image)
        const objects = xmlDoc.getElementsByTagName('PAGEOBJECT');

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            const pType = parseInt(obj.getAttribute('PTYPE') || '-1', 10);
            const ownPage = parseInt(obj.getAttribute('OwnPage') || '-1', 10);
            
            // Skip objects not assigned to a specific page (e.g. scratchpad)
            if (ownPage === -1) continue;

            const xPos = parseFloat(obj.getAttribute('XPOS') || '0');
            const yPos = parseFloat(obj.getAttribute('YPOS') || '0');
            const width = parseFloat(obj.getAttribute('WIDTH') || '0');
            const height = parseFloat(obj.getAttribute('HEIGHT') || '0');
            const rotation = parseFloat(obj.getAttribute('ROT') || '0');

            // Convert to Percentages
            const xPercent = (xPos / pageWidth) * 100;
            const yPercent = (yPos / pageHeight) * 100;
            const wPercent = (width / pageWidth) * 100;
            const hPercent = (height / pageHeight) * 100;

            // Handle Text Frames (PTYPE=4)
            if (pType === 4) {
                // Extract text content
                // Scribus stores text in <ITEXT CH="..."/> tags or legacy <STORYTEXT>
                let textContent = "";
                const itexts = obj.getElementsByTagName('ITEXT');
                for (let j = 0; j < itexts.length; j++) {
                    textContent += itexts[j].getAttribute('CH') || "";
                }

                // If no ITEXT, might be empty or legacy
                if (!textContent) textContent = "Texte importé";

                // Map styling (basic)
                // We could extract FONT, FONTSIZE etc. from <PARA/> or <TRAIL/> tags if needed
                // For now, use defaults

                texts.push({
                    id: `imported-text-${i}`,
                    label: `Text Page ${ownPage + 1}`,
                    type: 'fixed',
                    content: textContent,
                    combinationKey: 'default',
                    position: {
                        pageIndex: ownPage + 1, // Mapping 0-index from Scribus to 1-index logic if that's what we use? 
                        // Wait, previous code used 0 for cover, 1 for intro...
                        // Let's assume straight mapping for now and user can adjust.
                        // Actually, looking at BookPreview, pageIndex 0 is Cover.
                        // Scribus usually starts content at Page 1.
                        // Let's map Scribus Page 0 -> App Page 0 (Cover) if it's the first one?
                        // Or just use the raw number. Let's use raw number + 1 to align with "Page 1" usually being first interior page?
                        // Actually, let's keep it simple: ownPage (which is 0-indexed in Scribus) maps to pageIndex
                        // If the user designs cover in Scribus page 1, it will be index 0.
                        // Let's just use ownPage for now.
                        pageIndex: ownPage, 
                        zoneId: 'body',
                        x: xPercent,
                        y: yPercent,
                        width: wPercent,
                        height: hPercent,
                        rotation: rotation * -1 // Scribus rotation might be counter-clockwise?
                    },
                    style: {
                        fontSize: 12, // Default, hard to exact match pts to px without density assumptions
                        color: '#000000',
                        textAlign: 'left'
                    }
                });
            }

            // Handle Image Frames (PTYPE=2)
            if (pType === 2) {
                // Image path is usually in PFILE attribute
                const pFile = obj.getAttribute('PFILE') || "";
                const fileName = pFile.split('/').pop() || "image.jpg";

                imageElements.push({
                    id: `imported-image-${i}`,
                    label: `Image Page ${ownPage + 1}`,
                    type: 'static',
                    url: '', // We can't actually import the file binary from XML, just the placeholder
                    variableKey: fileName, // Use filename as hint
                    combinationKey: 'default',
                    position: {
                        pageIndex: ownPage,
                        x: xPercent,
                        y: yPercent,
                        width: wPercent,
                        height: hPercent,
                        rotation: rotation * -1
                    }
                });
            }
        }

        return {
            pages,
            texts,
            imageElements,
            images: [] // Backgrounds not handled yet
        };

    } catch (e) {
        console.error("Error parsing Scribus file:", e);
        return null;
    }
};
