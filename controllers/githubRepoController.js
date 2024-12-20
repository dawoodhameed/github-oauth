const GitHubIntegration = require("../models/GithubIntegration");
const Repo = require("../models/GithubRepo");
const Commit = require("../models/GithubCommit");
const PullRequest = require("../models/GithubPullRequest");
const Issue = require("../models/GithubIssues");
const User = require("../models/GithubUsers");
const fetchAllPages = require("../helpers/fetch-all-pages");

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
      const commits = await fetchAllPages(octokit.repos.listCommits, {
        owner: org,
        repo: repoName,
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
        repoName: req.body.repoName,
      });
    } catch (error) {
      console.error("Error fetching repository details:", error);
      res.status(500).json({ error: "Failed to fetch repository details" });
    }
  }

  async fetchRepositoryDetailsAsync(req, res) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const { repoName, org } = req.body;

      const githubIntegration = await GitHubIntegration.findOne({
        githubUserId: "58595132",
      });

      if (!githubIntegration) {
        return res.status(403).json({ error: "GitHub integration not found" });
      }

      const octokit = new Octokit({
        auth: githubIntegration.accessToken,
      });

      // Fetch Commits
      const commits = await fetchAllPages(octokit.repos.listCommits, {
        owner: org,
        repo: repoName,
      });

      // Fetch all pull requests
      const pullRequests = await fetchAllPages(octokit.pulls.list, {
        owner: org,
        repo: repoName,
        state: "all",
      });

      // Fetch all issues
      const issues = await fetchAllPages(octokit.issues.listForRepo, {
        owner: org,
        repo: repoName,
        state: "all",
      });

      // Fetch all users of the organization
      const { data: members } = await octokit.orgs.listMembers({
        org: org,
        per_page: 100,
      });

      // Fetch complete repository data
      const { data: repoDetails } = await octokit.repos.get({
        owner: org,
        repo: repoName,
      });

      // Save Repository Data
      const repoData = {
        repo_id: `${org}/${repoName}`,
        ...repoDetails,
      };

      let repo = await Repo.findOne({ repo_id: repoData.repo_id });
      if (!repo) {
        repo = new Repo(repoData);
        await repo.save();
      } else {
        await Repo.updateOne({ repo_id: repoData.repo_id }, repoData);
      }

      // Save Commits
      const commitDocuments = commits.map((commit) => ({
        commit_hash: commit.sha,
        repo_id: repoData.repo_id,
        ...commit, // Save all fields dynamically
      }));

      await Commit.insertMany(commitDocuments, { ordered: false }).catch(
        (err) => {
          console.warn("Some commits were already saved:", err.message);
        }
      );

      // Save Pull Requests
      const pullRequestDocuments = pullRequests.map((pr) => ({
        pr_id: pr.id.toString(),
        repo_id: repoData.repo_id,
        ...pr, // Save all fields dynamically
      }));

      await PullRequest.insertMany(pullRequestDocuments, {
        ordered: false,
      }).catch((err) => {
        console.warn("Some pull requests were already saved:", err.message);
      });

      // Save Issues
      const issueDocuments = issues.map((issue) => ({
        issue_id: issue.id.toString(),
        repo_id: repoData.repo_id,
        ...issue, // Save all fields dynamically
      }));

      await Issue.insertMany(issueDocuments, { ordered: false }).catch(
        (err) => {
          console.warn("Some issues were already saved:", err.message);
        }
      );

      // Save Users
      const userDocuments = members.map((member) => ({
        user_id: member.id.toString(),
        ...member,
      }));

      await User.insertMany(userDocuments, { ordered: false }).catch((err) => {
        console.warn("Some users were already saved:", err.message);
      });

      res.json({
        message: "Repository data saved successfully",
        repo: repoData,
        commits: commitDocuments.length,
        pullRequests: pullRequestDocuments.length,
        issues: issueDocuments.length,
        members: members.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch repository details" });
    }
  }
}

module.exports = new GitHubDataController();
