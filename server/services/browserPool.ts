import { chromium, Browser, Page, BrowserContext } from 'playwright-core';
import PQueue from 'p-queue';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

class BrowserPool {
  private browser: Browser | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private queue: PQueue;
  private maxConcurrency: number;

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
    this.queue = new PQueue({ concurrency: maxConcurrency });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    console.log('[BrowserPool] Launching persistent Chromium instance...');
    this.browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--single-process',
      ],
    });
    this.isInitialized = true;
    console.log('[BrowserPool] Chromium ready for rendering');
  }

  async renderPage(options: {
    html: string;
    width: number;
    height: number;
    format?: 'jpeg' | 'png';
    quality?: number;
  }): Promise<Buffer> {
    await this.initialize();

    return this.queue.add(async () => {
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const context = await this.browser.newContext({
        viewport: { width: options.width, height: options.height },
        deviceScaleFactor: 2,
      });

      const page = await context.newPage();

      try {
        await page.setContent(options.html, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // Wait for custom fonts loaded via FontFace API (from generateFontPreloadScript)
        const fontsLoaded = await page.evaluate(async () => {
          // First wait for any custom font promises
          if ((window as any).__fontsLoaded) {
            try {
              await (window as any).__fontsLoaded;
            } catch (e) {
              console.error('[BrowserPool] Custom fonts failed:', e);
            }
          }
          // Then wait for document.fonts.ready
          await document.fonts.ready;
          
          // Return font loading status for debugging
          const loadedFonts: string[] = [];
          document.fonts.forEach((font) => {
            if (font.status === 'loaded') {
              loadedFonts.push(`${font.family} ${font.weight} ${font.style}`);
            }
          });
          return { count: loadedFonts.length, fonts: loadedFonts.slice(0, 10) };
        }).catch((e) => {
          console.error('[BrowserPool] Font loading error:', e);
          return { count: 0, fonts: [] };
        });
        
        if (fontsLoaded.count > 0) {
          console.log(`[BrowserPool] Loaded ${fontsLoaded.count} fonts:`, fontsLoaded.fonts);
        }

        // Small delay to ensure fonts are fully applied to text
        await page.waitForTimeout(100);

        await page.waitForFunction(() => {
          const images = document.querySelectorAll('img');
          return Array.from(images).every(img => img.complete && img.naturalWidth > 0);
        }, { timeout: 15000 }).catch(() => {});

        const screenshot = await page.screenshot({
          type: options.format || 'jpeg',
          quality: options.format === 'png' ? undefined : (options.quality || 85),
          clip: { x: 0, y: 0, width: options.width, height: options.height },
        });

        return Buffer.from(screenshot);
      } finally {
        await page.close();
        await context.close();
      }
    }) as Promise<Buffer>;
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      console.log('[BrowserPool] Shutting down Chromium...');
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  getQueueStats() {
    return {
      pending: this.queue.pending,
      size: this.queue.size,
      concurrency: this.maxConcurrency,
    };
  }
}

export const browserPool = new BrowserPool(3);
