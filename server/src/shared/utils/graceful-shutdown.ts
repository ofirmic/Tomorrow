import type { Server } from 'http';

export interface GracefulShutdownConfig {
  timeout: number; // Max time to wait for shutdown
  signals: string[]; // Signals to listen for
}

export class GracefulShutdown {
  private isShuttingDown = false;
  private connections = new Set<any>();
  private server?: Server;

  constructor(
    private config: GracefulShutdownConfig = {
      timeout: 30000, // 30 seconds
      signals: ['SIGTERM', 'SIGINT', 'SIGUSR2']
    }
  ) {}

  public setup(server: Server): void {
    this.server = server;

    // Track connections
    server.on('connection', (connection) => {
      this.connections.add(connection);
      connection.on('close', () => {
        this.connections.delete(connection);
      });
    });

    // Listen for shutdown signals
    this.config.signals.forEach((signal) => {
      process.on(signal, () => {
        console.log(`📡 Received ${signal}, starting graceful shutdown...`);
        this.shutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      this.shutdown(1);
    });
  }

  private async shutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('🔄 Starting graceful shutdown sequence...');

    const shutdownTimer = setTimeout(() => {
      console.error('⏰ Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.config.timeout);

    try {
      // 1. Stop accepting new requests
      console.log('🚫 Stopping server from accepting new connections...');
      if (this.server) {
        this.server.close();
      }

      // 2. Close existing connections
      console.log(`🔌 Closing ${this.connections.size} existing connections...`);
      for (const connection of this.connections) {
        connection.end();
      }

      // 3. Wait for connections to close
      while (this.connections.size > 0) {
        console.log(`⏳ Waiting for ${this.connections.size} connections to close...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 4. Close database connections (if using Prisma)
      console.log('🗄️ Closing database connections...');
      // Note: In a real app, you'd call prisma.$disconnect() here
      
      clearTimeout(shutdownTimer);
      console.log('✅ Graceful shutdown completed');
      process.exit(exitCode);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  public isShutdown(): boolean {
    return this.isShuttingDown;
  }
}
