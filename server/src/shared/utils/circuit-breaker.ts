// Circuit Breaker Pattern - Prevents cascading failures

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
  minimumRequests: number;     // Minimum requests before considering failure rate
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Next retry at: ${new Date(this.lastFailureTime + this.config.recoveryTimeout).toISOString()}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.resetCounters();
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.requestCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      return;
    }

    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
    }
  }

  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    
    // Reset window if monitoring period has passed
    if (now - this.windowStart > this.config.monitoringPeriod) {
      this.resetCounters();
      this.windowStart = now;
      return false;
    }

    // Check if we have enough requests and failure rate exceeds threshold
    return this.requestCount >= this.config.minimumRequests &&
           this.failureCount >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private resetCounters(): void {
    this.failureCount = 0;
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      nextRetryTime: this.state === CircuitState.OPEN ? 
        new Date(this.lastFailureTime + this.config.recoveryTimeout) : null
    };
  }
}
