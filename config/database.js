const mongoose = require('mongoose');
const logger = require('./logger');
const config = require('./environment');

class DatabaseConnection {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      await mongoose.connect(config.database.uri, config.database.options);
      logger.info('MongoDB connected successfully');
      
      // Optional: Add connection event listeners
      mongoose.connection.on('disconnected', this.handleDisconnect.bind(this));
      mongoose.connection.on('error', this.handleError.bind(this));
    } catch (error) {
      this.handleConnectionFailure(error);
    }
  }

  handleDisconnect() {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
    this.connect();
  }

  handleError(error) {
    logger.error('MongoDB connection error', { error: error.message });
  }

  handleConnectionFailure(error) {
    logger.error('Failed to connect to MongoDB', { 
      error: error.message,
      retryCount: this.retryCount
    });

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const retryDelay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
      
      logger.info(`Retrying connection in ${retryDelay/1000} seconds`);
      
      setTimeout(() => {
        this.connect();
      }, retryDelay);
    } else {
      logger.error('Max retry attempts reached. Exiting process.');
      process.exit(1);
    }
  }
}

module.exports = new DatabaseConnection();