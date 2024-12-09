const GitHubIntegration = require("../models/GithubIntegration");

class GitHubDataController {
  async fetchOrganizationsAndRepos(req, res) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const githubIntegration = await GitHubIntegration.findOne({
        githubUserId: req.user.githubUserId,
      });

      if (!githubIntegration) {
        return res.status(403).json({ error: "GitHub integration not found" });
      }

      const octokit = new Octokit({
        auth: githubIntegration.accessToken,
      });

      // Fetch Organizations
      const { data: organizations } =
        await octokit.orgs.listForAuthenticatedUser({
          per_page: 100,
        });

      const processedOrgs = await Promise.all(
        organizations.map(async (org) => {
          // Fetch Repositories for each organization
          const { data: orgRepos } = await octokit.repos.listForOrg({
            org: org.login,
            per_page: 100,
          });

          const processedRepos = orgRepos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            included: false, // Default to false, can be updated by frontend
            organization: org.login,
          }));

          return {
            id: org.id,
            login: org.login,
            name: org.name,
            repositories: processedRepos,
          };
        })
      );

      res.json(processedOrgs);
    } catch (error) {
      console.error("Error fetching organizations and repositories:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch organizations and repositories" });
    }
  }

  async fetchRepositoryDetails(req, res) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const { repoName, org } = req.body;
      const githubIntegration = await GitHubIntegration.findOne({
        githubUserId: req.user.githubUserId,
      });

      if (!githubIntegration) {
        return res.status(403).json({ error: "GitHub integration not found" });
      }

      const octokit = new Octokit({
        auth: githubIntegration.accessToken,
      });

      // Fetch Commits
      const { data: commits } = await octokit.repos.listCommits({
        owner: org,
        repo: repoName,
        per_page: 100,
      });

      // Fetch Pull Requests
      const { data: pullRequests } = await octokit.pulls.list({
        owner: org,
        repo: repoName,
        state: "all",
        per_page: 100,
      });

      // Fetch Issues
      const { data: issues } = await octokit.issues.listForRepo({
        owner: org,
        repo: repoName,
        state: "all",
        per_page: 100,
      });

      // Process and group data by user
      const userStats = {};

      commits.forEach((commit) => {
        const username = commit.author?.login || "Unknown";
        if (!userStats[username]) {
          userStats[username] = {
            totalCommits: 0,
            totalPullRequests: 0,
            totalIssues: 0,
          };
        }
        userStats[username].totalCommits++;
      });

      pullRequests.forEach((pr) => {
        const username = pr.user?.login || "Unknown";
        if (!userStats[username]) {
          userStats[username] = {
            totalCommits: 0,
            totalPullRequests: 0,
            totalIssues: 0,
          };
        }
        userStats[username].totalPullRequests++;
      });

      issues.forEach((issue) => {
        const username = issue.user?.login || "Unknown";
        if (!userStats[username]) {
          userStats[username] = {
            totalCommits: 0,
            totalPullRequests: 0,
            totalIssues: 0,
          };
        }
        userStats[username].totalIssues++;
      });

      // Convert userStats to array for AG Grid
      const userStatsArray = Object.entries(userStats).map(([user, stats]) => ({
        user,
        ...stats,
      }));

      res.json({
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.author?.login,
          date: c.commit.author.date,
        })),
        pullRequests: pullRequests.map((pr) => ({
          title: pr.title,
          number: pr.number,
          state: pr.state,
          author: pr.user?.login,
          createdAt: pr.created_at,
        })),
        issues: issues.map((issue) => ({
          title: issue.title,
          number: issue.number,
          state: issue.state,
          author: issue.user?.login,
          createdAt: issue.created_at,
        })),
        userStats: userStatsArray,
        repoName: req.body.repoName
      });
    } catch (error) {
      console.error("Error fetching repository details:", error);
      res.status(500).json({ error: "Failed to fetch repository details" });
    }
  }
}

module.exports = new GitHubDataController();
