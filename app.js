const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const passport = require('passport');
const session = require('express-session');
const logger = require('./config/logger');
const config = require('./config/environment');
const { errorHandler, notFoundHandler } = require('./helpers/error-handler');

class Application {
  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet());
    
    // Compression middleware
    this.app.use(compression());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.corsOrigin || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
      credentials: true
    }));

    // Parsing middleware
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(logger.requestLogger);

    this.app.use(session({
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
    }));

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  initializeRoutes() {
    // Import and use routes
    const githubRoutes = require('./routes/githubAuthRoutes');
    this.app.use('', githubRoutes);

    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Error handler
    this.app.use(errorHandler);
  }

  getExpressApp() {
    return this.app;
  }
}

// Create an instance of the Application class
const application = new Application();

// Get the Express app
const app = application.getExpressApp();

module.exports = app;