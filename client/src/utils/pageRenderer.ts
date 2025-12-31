import html2canvas from 'html2canvas';
import { RawHtmlPage } from '../types/admin';
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

const resolveVariables = (html: string, config: BookConfig, characters?: Record<string, Record<string, string>>): string => {
  let content = html;

  content = content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const k = key.trim();
    if (k === 'childName' || k === 'name') return config.childName || "l'enfant";
    if (k === 'age') return config.age?.toString() || '';
    if (k === 'dedication') return config.dedication || '';
    if (k === 'heroName') return config.childName || 'Héros';
    if (k === 'gender') return config.gender === Gender.Girl ? 'Fille' : 'Garçon';

    if (characters) {
      for (const tabId of Object.keys(characters)) {
        if (characters[tabId]?.[k]) return characters[tabId][k];
      }
    }
    return match;
  });

  content = content.replace(/\{([^}]+)\}/g, (match, key) => {
    const k = key.trim();
    if (k === 'childName' || k === 'nom_enfant') return config.childName || "l'enfant";
    if (k === 'age') return config.age?.toString() || '';
    
    if (characters) {
      const parts = k.split('.');
      if (parts.length === 2) {
        const [tabId, variantId] = parts;
        if (characters[tabId]?.[variantId]) return characters[tabId][variantId];
      }
      for (const tabId of Object.keys(characters)) {
        if (characters[tabId][k]) return characters[tabId][k];
      }
    }
    return match;
  });

  return content;
};

export const renderHtmlPageToImage = async (
  rawPage: RawHtmlPage,
  cssContent: string,
  config: BookConfig,
  characters?: Record<string, Record<string, string>>,
  imageMap?: Record<string, string>
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
  html = resolveVariables(html, config, characters);

  if (imageMap) {
    for (const [key, url] of Object.entries(imageMap)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`src=["']${escapedKey}["']`, 'g'), `src="${url}"`);
      html = html.replace(new RegExp(`src=["'][^"']*/${escapedKey}["']`, 'g'), `src="${url}"`);
    }
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${rawPage.width}px; height: ${rawPage.height}px; overflow: hidden; background: white; }
          ${cssContent || ''}
        </style>
      </head>
      <body style="width:${rawPage.width}px;height:${rawPage.height}px;">
        ${html}
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

        await new Promise(r => setTimeout(r, 100));

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
  onProgress?: (current: number, total: number) => void
): Promise<Record<number, string>> => {
  const result: Record<number, string> = {};

  const sortedPages = [...rawPages].sort((a, b) => a.pageIndex - b.pageIndex);

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    try {
      const dataUrl = await renderHtmlPageToImage(page, cssContent, config, characters, imageMap);
      result[page.pageIndex] = dataUrl;
      onProgress?.(i + 1, sortedPages.length);
    } catch (error) {
      console.error(`Failed to render page ${page.pageIndex}:`, error);
    }
  }

  return result;
};
