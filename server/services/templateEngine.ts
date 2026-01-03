import * as cheerio from 'cheerio';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

interface TemplateAsset {
  originalPath: string;
  storagePath: string;
  type: 'image' | 'font';
}

interface TemplatePage {
  pageIndex: number;
  html: string;
  width: number;
  height: number;
}

export class TemplateEngine {
  private static instance: TemplateEngine;
  private pages: TemplatePage[] = [];
  private cssContent: string = '';
  private assetMap: Record<string, string> = {};
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  public async loadFromEpub(buffer: Buffer, bookId: string) {
    console.log(`[TemplateEngine] Loading template for book: ${bookId}`);
    const zip = await JSZip.loadAsync(buffer);
    
    const imageMap: Record<string, string> = {};
    const fontMap: Record<string, string> = {};
    const htmlFiles: { path: string; content: string }[] = [];
    const cssFiles: string[] = [];

    // Local assets directory
    const assetsBaseDir = path.join(process.cwd(), 'server', 'assets', 'books', bookId);
    await fs.mkdir(path.join(assetsBaseDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(assetsBaseDir, 'fonts'), { recursive: true });

    for (const [relativePath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      
      const fileName = relativePath.split('/').pop() || relativePath;
      
      if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(relativePath)) {
        const content = await entry.async('nodebuffer');
        const localPath = path.join(assetsBaseDir, 'images', fileName);
        await fs.writeFile(localPath, content);
        const url = `/assets/books/${bookId}/images/${fileName}`;
        imageMap[relativePath] = url;
        imageMap[fileName] = url;
      } else if (/\.(ttf|otf|woff2?|eot)$/i.test(relativePath)) {
        const content = await entry.async('nodebuffer');
        const localPath = path.join(assetsBaseDir, 'fonts', fileName);
        await fs.writeFile(localPath, content);
        const url = `/assets/books/${bookId}/fonts/${fileName}`;
        fontMap[relativePath] = url;
        fontMap[fileName] = url;
      } else if (/\.(html?|xhtml)$/i.test(relativePath)) {
        const content = await entry.async('string');
        htmlFiles.push({ path: relativePath, content });
      } else if (/\.css$/i.test(relativePath)) {
        const content = await entry.async('string');
        cssFiles.push(content);
      }
    }

    // Combine CSS and update font paths
    let combinedCss = cssFiles.join('\n');
    combinedCss = combinedCss.replace(
      /url\(["']?([^"')]+)["']?\)/gi,
      (match, fontPath) => {
        const cleanPath = fontPath.replace(/^["']|["']$/g, '').replace(/^\.\.\//, '').replace(/^\.\//, '');
        const justFilename = cleanPath.split('/').pop() || cleanPath;
        const storedPath = fontMap[cleanPath] || fontMap[justFilename];
        return storedPath ? `url("${storedPath}")` : match;
      }
    );

    // Process HTML pages
    const contentPages = htmlFiles.filter(f => 
      !f.path.toLowerCase().includes('toc') && 
      !f.path.toLowerCase().includes('nav') &&
      !f.path.toLowerCase().includes('cover')
    );

    this.pages = contentPages.map((f, i) => {
      const $ = cheerio.load(f.content);
      const viewport = $('meta[name="viewport"]').attr('content');
      let width = 595, height = 842;
      
      if (viewport) {
        const wMatch = viewport.match(/width=(\d+)/);
        const hMatch = viewport.match(/height=(\d+)/);
        if (wMatch) width = parseInt(wMatch[1]);
        if (hMatch) height = parseInt(hMatch[1]);
      }

      // Pre-map images in HTML
      $('img').each((_, img) => {
        const src = $(img).attr('src');
        if (src) {
          const cleanSrc = src.replace(/^\.\.\//, '').replace(/^\.\//, '');
          const justFilename = cleanSrc.split('/').pop() || cleanSrc;
          const mapped = imageMap[cleanSrc] || imageMap[justFilename];
          if (mapped) $(img).attr('src', mapped);
        }
      });

      return {
        pageIndex: i + 1,
        html: $('body').html() || f.content,
        width,
        height
      };
    });

    this.cssContent = combinedCss;
    this.assetMap = { ...imageMap, ...fontMap };
    this.isLoaded = true;
    console.log(`[TemplateEngine] Loaded ${this.pages.length} pages.`);
  }

  public getTemplate() {
    if (!this.isLoaded) throw new Error('Template not loaded');
    return {
      pages: this.pages,
      css: this.cssContent,
      assetMap: this.assetMap
    };
  }
}

export const templateEngine = TemplateEngine.getInstance();
