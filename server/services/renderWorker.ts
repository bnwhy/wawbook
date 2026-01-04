import { jobQueue } from './jobQueue';
import { templateEngine } from './templateEngine';
import { browserPool } from './browserPool';
import { storage } from '../storage';
import type { RenderJob } from '@shared/schema';

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5000';

async function processRenderJob(job: RenderJob): Promise<void> {
  console.log(`[RenderWorker] Processing job ${job.id} for book ${job.bookId}`);
  
  try {
    const book = await storage.getBook(job.bookId);
    if (!book) {
      throw new Error(`Book not found: ${job.bookId}`);
    }

    const contentConfig = book.contentConfig as {
      rawHtmlPages?: Array<{ html: string; width: number; height: number; pageIndex: number }>;
      cssContent?: string;
      pageImages?: Array<{ pageIndex: number; imageUrl: string }>;
    };

    if (!contentConfig?.rawHtmlPages || contentConfig.rawHtmlPages.length === 0) {
      throw new Error('No raw HTML pages to render');
    }

    const totalPages = contentConfig.rawHtmlPages.length;
    await jobQueue.updateJobProgress(job.id, 0, totalPages);

    const variables = job.variables || {};
    const pages: Array<{ pageIndex: number; imageUrl: string }> = [];

    for (let i = 0; i < contentConfig.rawHtmlPages.length; i++) {
      const page = contentConfig.rawHtmlPages[i];
      
      const rendered = await templateEngine.renderSinglePage({
        html: page.html,
        css: contentConfig.cssContent || '',
        width: page.width,
        height: page.height,
        variables,
        baseUrl: BASE_URL,
      });

      pages.push({
        pageIndex: page.pageIndex || i + 1,
        imageUrl: rendered.imageUrl,
      });

      await jobQueue.updateJobProgress(job.id, i + 1, totalPages);
    }

    await jobQueue.completeJob(job.id, { pages });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await jobQueue.failJob(job.id, message);
    throw error;
  }
}

export function startRenderWorker(): void {
  jobQueue.setProcessor(processRenderJob);
  jobQueue.start();
  console.log('[RenderWorker] Worker started');
}

export function stopRenderWorker(): void {
  jobQueue.stop();
  console.log('[RenderWorker] Worker stopped');
}

export { jobQueue };
