// models/GitHubIntegration.js
const mongoose = require('mongoose');

const GitHubIntegrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  githubUserId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  profileUrl: {
    type: String
  },
  integrationDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  githubProfileData: {
    type: Object
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GitHubIntegration', GitHubIntegrationSchema);