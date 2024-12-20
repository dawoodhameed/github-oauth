// routes/githubAuthRoutes.js
const express = require("express");
const router = express.Router();
const githubRepoController = require("../controllers/githubRepoController");
const isAuthenticated = require("./../middlewares/authentication");

router.get(
  "/organizations",
  isAuthenticated,
  githubRepoController.fetchOrganizationsAndRepos
);

router.post(
  "/stats",
  isAuthenticated,
  githubRepoController.fetchRepositoryDetails
);

router.post(
  "/sync",
  githubRepoController.fetchRepositoryDetailsAsync
);

module.exports = router;
