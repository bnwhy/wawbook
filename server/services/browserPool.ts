import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import PQueue from 'p-queue';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

export class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private queue: PQueue;

  private constructor() {
    this.queue = new PQueue({ concurrency: 5 }); // Limit concurrent renders
  }

  public static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  public async init() {
    if (this.browser) return;
    
    console.log('[BrowserPool] Initializing persistent Playwright browser...');
    this.browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    });
    console.log('[BrowserPool] Browser launched successfully.');
  }

  public async usePage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    return this.queue.add(async () => {
      if (!this.browser) await this.init();
      
      const context = await this.browser!.newContext({
        viewport: { width: 1200, height: 800 }, // Default, will be overridden
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      
      try {
        return await fn(page);
      } finally {
        await page.close();
        await context.close();
      }
    }) as Promise<T>;
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserPool = BrowserPool.getInstance();
