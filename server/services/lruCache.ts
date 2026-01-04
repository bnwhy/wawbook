interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;
  lastAccessed: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private currentSize = 0;
  private maxAge: number;

  constructor(options: { maxSizeMB?: number; maxAgeMs?: number } = {}) {
    this.maxSize = (options.maxSizeMB || 100) * 1024 * 1024; // Default 100MB
    this.maxAge = options.maxAgeMs || 30 * 60 * 1000; // Default 30 minutes
  }

  set(key: string, value: T, sizeMB: number = 1): void {
    const sizeBytes = sizeMB * 1024 * 1024;
    
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
      this.cache.delete(key);
    }

    while (this.currentSize + sizeBytes > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    if (sizeBytes > this.maxSize) {
      console.warn(`[LRUCache] Item ${key} (${sizeMB}MB) exceeds max cache size`);
      return;
    }

    this.cache.set(key, {
      key,
      value,
      size: sizeBytes,
      lastAccessed: Date.now(),
    });
    this.currentSize += sizeBytes;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.lastAccessed > this.maxAge) {
      this.delete(key);
      return undefined;
    }

    entry.lastAccessed = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.lastAccessed > this.maxAge) {
      this.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        console.log(`[LRUCache] Evicting ${oldestKey} (${(entry.size / 1024 / 1024).toFixed(1)}MB)`);
        this.currentSize -= entry.size;
        this.cache.delete(oldestKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  getStats(): { entries: number; sizeMB: number; maxSizeMB: number } {
    return {
      entries: this.cache.size,
      sizeMB: this.currentSize / 1024 / 1024,
      maxSizeMB: this.maxSize / 1024 / 1024,
    };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
