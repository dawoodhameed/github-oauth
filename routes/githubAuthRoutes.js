// routes/githubAuthRoutes.js
const express = require('express');
const router = express.Router();
const githubAuthController = require('../controllers/githubAuthController');
const GithubIntegration = require('./../models/GithubIntegration')

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Initiate GitHub OAuth
router.get('/auth/github', 
  githubAuthController.initiateGitHubAuth()
);

// GitHub OAuth Callback
router.get('/auth/github/callback', 
  githubAuthController.handleGitHubCallback()
);

// Get current integration status
router.get('/integration/status', isAuthenticated, async (req, res) => {
  try {
    const integration = await GithubIntegration.findOne({ 
      githubUserId: req.user.githubUserId 
    });
    
    res.json({
      connected: !!integration,
      integrationDate: integration ? integration.integrationDate : null,
      username: integration ? integration.username : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

// Remove GitHub integration
router.delete('/integration/remove', 
  isAuthenticated, 
  githubAuthController.removeIntegration
);

// Get Public Repositories
router.delete('/integration/public-repos', 
  isAuthenticated, 
  githubAuthController.getPublicRepositories
);

module.exports = router;