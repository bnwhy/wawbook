import { eq, and, sql, asc, desc, lt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { renderJobs, type RenderJob, type InsertRenderJob } from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

const WORKER_HOST = process.env.REPL_SLUG || `worker_${process.pid}`;
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for stuck jobs
const CLEANUP_AFTER_HOURS = 24;

export interface JobQueueConfig {
  pollIntervalMs?: number;
  maxConcurrent?: number;
}

export class JobQueue {
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeJobs = 0;
  private maxConcurrent: number;
  private pollIntervalMs: number;
  private jobProcessor: ((job: RenderJob) => Promise<void>) | null = null;

  constructor(config: JobQueueConfig = {}) {
    this.pollIntervalMs = config.pollIntervalMs || 2000;
    this.maxConcurrent = config.maxConcurrent || 2;
  }

  async enqueue(job: Omit<InsertRenderJob, 'id'>): Promise<RenderJob> {
    const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    const expiresAt = new Date(Date.now() + CLEANUP_AFTER_HOURS * 60 * 60 * 1000);
    
    const [created] = await db.insert(renderJobs).values({
      ...job,
      id,
      status: 'pending',
      expiresAt,
    } as any).returning();
    
    console.log(`[JobQueue] Enqueued job ${id} for book ${job.bookId}`);
    return created;
  }

  async getJob(jobId: string): Promise<RenderJob | undefined> {
    const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, jobId));
    return job;
  }

  async updateJobProgress(jobId: string, renderedPages: number, totalPages: number): Promise<void> {
    const progress = Math.round((renderedPages / totalPages) * 100);
    await db.update(renderJobs)
      .set({ renderedPages, progress })
      .where(eq(renderJobs.id, jobId));
  }

  async completeJob(jobId: string, result: RenderJob['result']): Promise<void> {
    await db.update(renderJobs)
      .set({
        status: 'completed',
        result,
        progress: 100,
        completedAt: new Date(),
      })
      .where(eq(renderJobs.id, jobId));
    console.log(`[JobQueue] Job ${jobId} completed`);
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await db.update(renderJobs)
      .set({
        status: 'failed',
        result: { error },
        completedAt: new Date(),
      })
      .where(eq(renderJobs.id, jobId));
    console.log(`[JobQueue] Job ${jobId} failed: ${error}`);
  }

  private async claimNextJob(): Promise<RenderJob | null> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - JOB_TIMEOUT_MS);

    const result = await db.execute(sql`
      UPDATE render_jobs 
      SET status = 'processing', 
          worker_host = ${WORKER_HOST},
          started_at = ${now}
      WHERE id = (
        SELECT id FROM render_jobs 
        WHERE (status = 'pending' 
               OR (status = 'processing' AND started_at < ${staleThreshold}))
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        id: row.id,
        bookId: row.book_id,
        orderId: row.order_id,
        status: row.status,
        priority: row.priority,
        variables: row.variables,
        result: row.result,
        progress: row.progress,
        totalPages: row.total_pages,
        renderedPages: row.rendered_pages,
        workerHost: row.worker_host,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    }
    return null;
  }

  async cleanupExpiredJobs(): Promise<number> {
    const now = new Date();
    const result = await db.delete(renderJobs)
      .where(
        and(
          lt(renderJobs.expiresAt, now),
          or(
            eq(renderJobs.status, 'completed'),
            eq(renderJobs.status, 'failed')
          )
        )
      )
      .returning();
    
    if (result.length > 0) {
      console.log(`[JobQueue] Cleaned up ${result.length} expired jobs`);
    }
    return result.length;
  }

  async getPendingJobsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(renderJobs)
      .where(eq(renderJobs.status, 'pending'));
    return Number(result[0]?.count || 0);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const result = await db.execute(sql`
      SELECT status, COUNT(*) as count 
      FROM render_jobs 
      GROUP BY status
    `);
    
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of result.rows as any[]) {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats] = Number(row.count);
      }
    }
    return stats;
  }

  setProcessor(processor: (job: RenderJob) => Promise<void>): void {
    this.jobProcessor = processor;
  }

  start(): void {
    if (this.pollInterval) return;
    
    console.log(`[JobQueue] Starting worker ${WORKER_HOST} (max ${this.maxConcurrent} concurrent)`);
    
    this.pollInterval = setInterval(async () => {
      if (!this.jobProcessor) return;
      if (this.activeJobs >= this.maxConcurrent) return;
      
      try {
        const job = await this.claimNextJob();
        if (job) {
          this.activeJobs++;
          this.jobProcessor(job)
            .catch(err => {
              console.error(`[JobQueue] Unhandled error in job ${job.id}:`, err);
              return this.failJob(job.id, err.message || 'Unknown error');
            })
            .finally(() => {
              this.activeJobs--;
            });
        }
      } catch (err) {
        console.error('[JobQueue] Error polling for jobs:', err);
      }
    }, this.pollIntervalMs);

    setInterval(() => this.cleanupExpiredJobs(), 60 * 60 * 1000);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log(`[JobQueue] Worker ${WORKER_HOST} stopped`);
  }
}

export const jobQueue = new JobQueue({ maxConcurrent: 2 });
