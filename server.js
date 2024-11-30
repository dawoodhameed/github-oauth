const http = require('http');
const logger = require('./config/logger');
const config = require('./config/environment');
const app = require('./app');
const DatabaseConnection = require('./config/database');

class Server {
  constructor() {
    this.httpServer = http.createServer(app);
  }

  async start() {
    try {
      // Connect to database
      await DatabaseConnection.connect();

      // Start HTTP server
      this.httpServer.listen(config.port, () => {
        logger.info(`Server running in ${config.environment} mode`, {
          port: config.port,
          pid: process.pid
        });
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully');
      
      this.httpServer.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connection
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });
    });
  }
}

// Start the server
const server = new Server();
server.start();