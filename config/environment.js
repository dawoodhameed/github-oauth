const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(
    process.cwd(),
    `.env`
  ),
});

const config = {
  environment: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,

  database: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 30000,
    },
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    maxSize: "20m", // 20MB per log file
    maxFiles: 10, // Keep 10 log files
  },

  corsOrigin: ['http://localhost:4200']
};

// Validate critical configurations
const validateConfig = () => {
  const requiredFields = [
    "database.uri",
    "github.clientId",
    "github.clientSecret",
    "jwt.secret",
  ];

  requiredFields.forEach((field) => {
    const value = field.split(".").reduce((obj, key) => obj[key], config);
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  });
};

validateConfig();

module.exports = config;
