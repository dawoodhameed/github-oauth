const passport = require("passport");
const { Strategy: GitHubStrategy } = require("passport-github2");
const GitHubIntegration = require("../models/GithubIntegration");

class GitHubAuthController {
  constructor() {
    this.configurePassport();
  }

  configurePassport() {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: "http://localhost:3000/auth/github/callback",
          scope: ["user:email", "repo", "admin:org"],
        },
        this.verifyCallback
      )
    );

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(this.deserializeUser);
  }

  deserializeUser = async (id, done) => {
    try {
      const user = await GitHubIntegration.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  };

  verifyCallback = async (accessToken, refreshToken, profile, done) => {
    try {
      const existingIntegration = await GitHubIntegration.findOneAndUpdate(
        { githubUserId: profile.id },
        {
          username: profile.username,
          accessToken,
          profileUrl: profile.profileUrl,
          githubProfileData: profile._json,
          integrationDate: new Date(),
        },
        { upsert: true, new: true }
      );

      return done(null, existingIntegration);
    } catch (error) {
      return done(error);
    }
  };

  initiateGitHubAuth() {
    return passport.authenticate("github", {
      scope: ["user:email", "repo", "admin:org"],
    });
  }

  handleGitHubCallback() {
    return passport.authenticate("github", {
      successRedirect: "http://localhost:4200/",
      failureRedirect: "http://localhost:4200/",
    });
  }

  async removeIntegration(req, res) {
    try {
      await GitHubIntegration.findOneAndDelete({
        githubUserId: req.user.githubUserId,
      });
      res.status(200).json({ message: "GitHub integration removed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove integration" });
    }
  }

  async getPublicRepositories(req, res) {
    try {
      const githubIntegration = await GitHubIntegration.findOne({
        githubUserId: req.user.githubUserId,
      });

      if (!githubIntegration) {
        return res.status(403).json({ error: "GitHub integration not found" });
      }

      // Use Octokit for GitHub API interactions
      const { Octokit } = require("@octokit/rest");
      const octokit = new Octokit({
        auth: githubIntegration.accessToken,
      });

      const { data } = await octokit.repos.listForAuthenticatedUser({
        visibility: "public",
        per_page: 100,
      });

      res.json(
        data.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          stargazers_count: repo.stargazers_count,
          language: repo.language,
          private: repo.private,
        }))
      );
    } catch (error) {
      console.error("Error fetching repositories:", error);
      res.status(500).json({ error: "Failed to fetch repositories" });
    }
  }
}

module.exports = new GitHubAuthController();
