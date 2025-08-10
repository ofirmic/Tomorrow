/**
 * Advanced API Handling Patterns
 * Demonstrates enterprise-grade patterns for scalable systems
 */

import { EventEmitter } from 'events';

/**
 * Request Deduplication Service
 * Prevents duplicate API calls for the same data
 */
export class RequestDeduplicationService {
  private pendingRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly ttl: number;

  constructor(ttlMs: number = 30000) { // 30 seconds default
    this.ttl = ttlMs;
  }

  /**
   * Deduplicate concurrent requests for the same resource
   * If multiple clients request the same data, only one API call is made
   */
  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`🔄 Request deduplication: reusing pending request for ${key}`);
      return pending;
    }

    // Make new request
    console.log(`🚀 Request deduplication: making new request for ${key}`);
    const promise = fetcher()
      .then(data => {
        // Cache the result
        this.cache.set(key, {
          data,
          expiresAt: Date.now() + this.ttl,
        });
        return data;
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedEntries: this.cache.size,
    };
  }
}

/**
 * API Rate Limiter with Token Bucket Algorithm
 * More sophisticated than simple time-window limiting
 */
export class TokenBucketRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(capacity: number = 10, refillRate: number = 1, refillIntervalMs: number = 1000) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillIntervalMs;

    // Start refill process
    setInterval(() => this.refillBuckets(), refillIntervalMs);
  }

  /**
   * Check if request is allowed for given key (e.g., user ID, IP)
   */
  isAllowed(key: string, tokens: number = 1): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.capacity);
      this.buckets.set(key, bucket);
    }

    return bucket.consume(tokens);
  }

  /**
   * Get remaining tokens for a key
   */
  getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket ? bucket.tokens : this.capacity;
  }

  private refillBuckets(): void {
    for (const bucket of this.buckets.values()) {
      bucket.refill(this.refillRate, this.capacity);
    }
  }

  getStats() {
    return {
      activeBuckets: this.buckets.size,
      capacity: this.capacity,
      refillRate: this.refillRate,
    };
  }
}

class TokenBucket {
  public tokens: number;
  private lastRefill: number;

  constructor(capacity: number, initialTokens: number) {
    this.tokens = initialTokens;
    this.lastRefill = Date.now();
  }

  consume(tokens: number): boolean {
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  refill(rate: number, capacity: number): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * rate);
    
    this.tokens = Math.min(capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Request Batching Service
 * Batches multiple individual requests into efficient bulk operations
 */
export class RequestBatchingService extends EventEmitter {
  private batches = new Map<string, BatchCollector>();
  private readonly maxBatchSize: number;
  private readonly maxWaitTime: number;

  constructor(maxBatchSize: number = 10, maxWaitTimeMs: number = 100) {
    super();
    this.maxBatchSize = maxBatchSize;
    this.maxWaitTime = maxWaitTimeMs;
  }

  /**
   * Add request to batch and return promise that resolves when batch is processed
   */
  async batchRequest<T>(batchKey: string, itemKey: string, item: any): Promise<T> {
    let batch = this.batches.get(batchKey);
    if (!batch) {
      batch = new BatchCollector(this.maxBatchSize, this.maxWaitTime);
      this.batches.set(batchKey, batch);

      // Set up batch processing
      batch.on('ready', (items) => {
        this.emit('batchReady', batchKey, items);
        this.batches.delete(batchKey);
      });
    }

    return batch.addItem(itemKey, item);
  }

  /**
   * Process a batch and resolve all pending promises
   */
  resolveBatch<T>(batchKey: string, results: Map<string, T>): void {
    const batch = this.batches.get(batchKey);
    if (batch) {
      batch.resolveAll(results);
      this.batches.delete(batchKey);
    }
  }

  /**
   * Reject a batch and reject all pending promises
   */
  rejectBatch(batchKey: string, error: Error): void {
    const batch = this.batches.get(batchKey);
    if (batch) {
      batch.rejectAll(error);
      this.batches.delete(batchKey);
    }
  }

  getStats() {
    return {
      activeBatches: this.batches.size,
      maxBatchSize: this.maxBatchSize,
      maxWaitTime: this.maxWaitTime,
    };
  }
}

class BatchCollector extends EventEmitter {
  private items = new Map<string, any>();
  private promises = new Map<string, { resolve: Function; reject: Function }>();
  private timer?: NodeJS.Timeout | undefined;

  constructor(private maxSize: number, private maxWaitTime: number) {
    super();
  }

  addItem<T>(key: string, item: any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.items.set(key, item);
      this.promises.set(key, { resolve, reject });

      // Start timer on first item
      if (this.items.size === 1) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitTime);
      }

      // Flush if batch is full
      if (this.items.size >= this.maxSize) {
        this.flush();
      }
    });
  }

  private flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.items.size > 0) {
      const items = new Map(this.items);
      this.emit('ready', items);
    }
  }

  resolveAll<T>(results: Map<string, T>): void {
    for (const [key, promise] of this.promises.entries()) {
      const result = results.get(key);
      if (result !== undefined) {
        promise.resolve(result);
      } else {
        promise.reject(new Error(`No result for key: ${key}`));
      }
    }
    this.cleanup();
  }

  rejectAll(error: Error): void {
    for (const promise of this.promises.values()) {
      promise.reject(error);
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.items.clear();
    this.promises.clear();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

/**
 * Adaptive API Client
 * Automatically adjusts behavior based on API performance and errors
 */
export class AdaptiveApiClient {
  private errorCounts = new Map<string, number>();
  private responseTimesMs = new Map<string, number[]>();
  private readonly maxResponseTimes = 10; // Keep last 10 response times
  private backoffMultiplier = 1;
  private readonly maxBackoffMultiplier = 8;

  /**
   * Make API call with adaptive behavior
   */
  async makeRequest<T>(
    endpoint: string, 
    fetcher: () => Promise<T>,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<T> {
    const { timeout = 5000, retries = 3 } = options;
    const startTime = Date.now();

    try {
      // Apply adaptive timeout based on recent performance
      const adaptiveTimeout = this.getAdaptiveTimeout(endpoint, timeout);
      
      // Add artificial delay if we're backing off
      if (this.backoffMultiplier > 1) {
        const delay = Math.min(1000 * this.backoffMultiplier, 5000);
        console.log(`⏳ Adaptive delay: ${delay}ms for ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await Promise.race([
        fetcher(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Adaptive timeout')), adaptiveTimeout)
        ),
      ]);

      // Record successful response time
      this.recordResponseTime(endpoint, Date.now() - startTime);
      this.recordSuccess(endpoint);

      return result;
    } catch (error) {
      this.recordError(endpoint);
      
      if (retries > 0) {
        console.log(`🔄 Adaptive retry: ${retries} attempts remaining for ${endpoint}`);
        return this.makeRequest(endpoint, fetcher, { timeout, retries: retries - 1 });
      }
      
      throw error;
    }
  }

  private getAdaptiveTimeout(endpoint: string, baseTimeout: number): number {
    const responseTimes = this.responseTimesMs.get(endpoint) || [];
    if (responseTimes.length === 0) return baseTimeout;

    // Use 95th percentile + buffer
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Time = sorted[p95Index] || sorted[sorted.length - 1] || baseTimeout;
    
    return Math.max(baseTimeout, p95Time * 2);
  }

  private recordResponseTime(endpoint: string, timeMs: number): void {
    let times = this.responseTimesMs.get(endpoint) || [];
    times.push(timeMs);
    
    if (times.length > this.maxResponseTimes) {
      times = times.slice(-this.maxResponseTimes);
    }
    
    this.responseTimesMs.set(endpoint, times);
  }

  private recordError(endpoint: string): void {
    const count = this.errorCounts.get(endpoint) || 0;
    this.errorCounts.set(endpoint, count + 1);
    
    // Increase backoff on consecutive errors
    if (count >= 2) {
      this.backoffMultiplier = Math.min(
        this.backoffMultiplier * 2, 
        this.maxBackoffMultiplier
      );
    }
  }

  private recordSuccess(endpoint: string): void {
    this.errorCounts.set(endpoint, 0);
    // Gradually reduce backoff on success
    this.backoffMultiplier = Math.max(1, this.backoffMultiplier * 0.5);
  }

  getStats() {
    const endpointStats = new Map<string, any>();
    
    for (const [endpoint, responseTimes] of this.responseTimesMs.entries()) {
      const errors = this.errorCounts.get(endpoint) || 0;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      endpointStats.set(endpoint, {
        avgResponseTimeMs: Math.round(avgResponseTime),
        recentErrors: errors,
        sampleSize: responseTimes.length,
      });
    }

    return {
      endpoints: Object.fromEntries(endpointStats),
      globalBackoffMultiplier: this.backoffMultiplier,
    };
  }
}
