// routes/githubAuthRoutes.js
const express = require("express");
const router = express.Router();
const GitHubDataController = require("./../controllers/githubDataController");
const isAuthenticated = require("./../middlewares/authentication");

router.get("/collections", GitHubDataController.getCollections);

// Call the static method directly on the class
router.post("/collection-data", GitHubDataController.getCollectionData);

router.get("/related-data", GitHubDataController.getRelatedData);

router.get("/search", GitHubDataController.searchAcrossCollections);

router.get("/related-data-user", GitHubDataController.searchByUserId);

router.post("/issue-details", GitHubDataController.getIssueData);

module.exports = router;
