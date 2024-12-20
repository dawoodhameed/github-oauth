const Commit = require("../models/GithubCommit");
const PullRequest = require("../models/GithubPullRequest");
const Issue = require("../models/GithubIssues");
const Repo = require("../models/GithubRepo");
const Users = require("../models/GithubUsers");
const GitHubIntegration = require("../models/GithubIntegration");
const mongoose = require("mongoose");

class GitHubDataController {
  // Get all collections
  static async getCollections(req, res) {
    try {
      const collections = await mongoose.connection.db.collections();
      const githubCollections = collections
        .filter(
          (collection) => collection.collectionName !== "githubintegrations"
        )
        .map((collection) => {
          return {
            name: collection.collectionName,
          };
        });

      res.json(githubCollections);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Add more robust search and filtering capabilities
  static async getCollectionData(req, res) {
    try {
      const {
        collectionName,
        page = 1,
        pageSize = 100,
        searchTerm = "",
        filters = {},
        dateRange = null,
      } = req.body;

      // Select the appropriate model
      let Model;
      switch (collectionName) {
        case "commits":
          Model = Commit;
          break;
        case "issues":
          Model = Issue;
          break;
        case "pullrequests":
          Model = PullRequest;
          break;
        case "users":
          Model = Users;
          break;
        case "repos":
          Model = Repo;
          break;
        default:
          return res.status(400).json({ error: "Invalid collection name" });
      }

      // Build dynamic search and filter query
      const query = GitHubDataController.buildDynamicQuery(
        searchTerm,
        filters,
        dateRange,
        Model
      );

      // Fetch total count for pagination
      const totalCount = await Model.countDocuments(query);

      // Fetch paginated and sorted data
      const data = await Model.find(query)
        .sort({ created_at: -1 }) // Default sorting by creation date
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      // Get all unique facets for filtering
      const facets = await GitHubDataController.getFacets(
        Model,
        searchTerm,
        filters
      );

      res.json({
        data,
        total: totalCount,
        page,
        pageSize,
        facets,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }

  // Dynamic query builder
  static buildDynamicQuery(searchTerm, filters, dateRange, Model) {
    const query = {};

    // Text search across multiple fields
    if (searchTerm) {
      query.$or = [
        { message: { $regex: searchTerm, $options: "i" } },
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { author: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Apply specific filters
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        query[key] = filters[key];
      }
    });

    // Date range filtering
    if (dateRange && dateRange.start && dateRange.end) {
      query.timestamp = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end),
      };
    }

    return query;
  }

  static getAllFieldPaths(obj, parentKey = "") {
    return Object.keys(obj).reduce((fields, key) => {
      if (["_id", "__v", "createdAt", "updatedAt"].includes(key)) {
        return fields;
      }
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        fields.push(...this.getAllFieldPaths(obj[key], fullKey));
      } else {
        fields.push(fullKey);
      }

      return fields;
    }, []);
  }

  // Generate facets for filtering
  static async getFacets(Model, searchTerm, currentFilters) {
    const facets = {};
    const searchQuery = searchTerm ? { $text: { $search: searchTerm } } : {};

    //get one document for the model
    const document = await Model.find({}).limit(1);

    const allFields = this.getAllFieldPaths(document[0].toObject());

    for (const field of allFields) {
      const facet = await Model.aggregate([
        { $match: searchQuery },
        {
          $group: {
            _id: `$${field}`,
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      facets[field] = facet.map((item) => ({
        _id: item._id,
        count: item.count,
      }));
    }
    return facets;
  }

  // Get detailed relationships for a specific item
  async getItemRelationships(req, res) {
    try {
      const { collectionName, itemId } = req.params;

      let Model;
      switch (collectionName) {
        case "commits":
          Model = Commit;
          break;
        case "issues":
          Model = Issue;
          break;
        case "pullrequests":
          Model = PullRequest;
          break;
      }

      // Find the main item
      const mainItem = await Model.findById(itemId);

      // Find related items based on common attributes
      const relatedData = {
        relatedCommits: await Commit.find({
          repo_id: mainItem.repo_id,
          created_at: { $gte: new Date(mainItem.created_at) },
        }).limit(5),
        relatedPRs: await PullRequest.find({
          repo_id: mainItem.repo_id,
          created_at: { $gte: new Date(mainItem.created_at) },
        }).limit(5),
        relatedIssues: await Issue.find({
          repo_id: mainItem.repo_id,
          created_at: { $gte: new Date(mainItem.created_at) },
        }).limit(5),
      };

      res.json({ mainItem, relatedData });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }

  // Relationship builder method
  static async getRelatedData(req, res) {
    try {
      const { repoId } = req.query;

      // Aggregation pipeline to join related data
      const relatedData = await Repo.aggregate([
        {
          $match: { repo_id: repoId },
        },
        {
          $lookup: {
            from: "commits",
            localField: "repo_id",
            foreignField: "repo_id",
            as: "commits",
          },
        },
        {
          $lookup: {
            from: "pullrequests",
            localField: "repo_id",
            foreignField: "repo_id",
            as: "pullRequests",
          },
        },
        {
          $lookup: {
            from: "issues",
            localField: "repo_id",
            foreignField: "repo_id",
            as: "issues",
          },
        },
      ]);

      res.json(relatedData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async searchAcrossCollections(req, res) {
    try {
      const { keyword } = req.query;
      if (!keyword) {
        return res.status(400).json({ error: "Keyword is required" });
      }

      const collections = await mongoose.connection.db.collections();
      const collectionModels = {
        commits: Commit,
        issues: Issue,
        pullrequests: PullRequest,
        users: Users,
        repos: Repo,
      };

      const searchResults = {};

      for (const collection of collections) {
        const collectionName = collection.collectionName;
        const model = collectionModels[collectionName];
        if (!model) continue;

        const document = await model.findOne();
        if (!document) continue;

        const allFields = GitHubDataController.getAllFieldPaths(
          document.toObject()
        );

        const query = {
          $or: allFields.map((field) => ({
            [field]: { $regex: keyword, $options: "i" },
          })),
        };

        const results = await model.find(query).limit(10);
        if (results.length > 0) {
          searchResults[collectionName] = results;
        }
      }

      res.json(searchResults);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async searchByUserId(req, res) {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const collections = await mongoose.connection.db.collections();
      const collectionModels = {
        commits: Commit,
        issues: Issue,
        pullrequests: PullRequest,
        users: Users,
        repos: Repo,
      };

      const searchResults = [];
      const allFieldsSet = new Set();

      for (const collection of collections) {
        const collectionName = collection.collectionName;
        const model = collectionModels[collectionName];
        if (!model) continue;

        const document = await model.findOne();
        if (!document) continue;

        const allFields = GitHubDataController.getAllFieldPaths(
          document.toObject()
        );
        allFields.forEach((field) => allFieldsSet.add(field));

        const query = {
          $or: allFields.map((field) => ({
            [field]: { $regex: userId, $options: "i" },
          })),
        };

        const results = await model.find(query);
        if (results.length > 0) {
          results.forEach((result) => {
            searchResults.push({ ...result.toObject(), type: collectionName });
          });
        }
      }

      const allFieldsArray = Array.from(allFieldsSet);
      allFieldsArray.push("type");

      res.json({ results: searchResults, allFields: allFieldsArray });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getIssueData(req, res) {
    try {
      const { Octokit } = await import("@octokit/rest");
      const { owner, repo, issueNumber } = req.body;

      if (!owner || !repo || !issueNumber) {
        return res
          .status(400)
          .json({ error: "Owner, repo, and issue number are required" });
      }

      const githubIntegration = await GitHubIntegration.findOne({
        githubUserId: req.user.githubUserId,
      });

      if (!githubIntegration) {
        return res.status(403).json({ error: "GitHub integration not found" });
      }

      const octokit = new Octokit({
        auth: githubIntegration.accessToken,
      });

      // Fetch Issue Details
      const issueDetails = await octokit.rest.issues
        .get({
          owner,
          repo,
          issue_number: issueNumber,
        })
        .catch((error) => {
          throw new Error(`Error fetching issue details: ${error.message}`);
        });

      // Fetch Issue Comments
      const issueComments = await octokit.rest.issues
        .listComments({
          owner,
          repo,
          issue_number: issueNumber,
        })
        .catch((error) => {
          throw new Error(`Error fetching issue comments: ${error.message}`);
        });

      // Fetch Issue Events (history)
      const issueEvents = await octokit.rest.issues
        .listEvents({
          owner,
          repo,
          issue_number: issueNumber,
        })
        .catch((error) => {
          throw new Error(`Error fetching issue events: ${error.message}`);
        });

      const issueTimelines = await octokit.rest.issues
        .listEventsForTimeline({
          owner,
          repo,
          issue_number: issueNumber,
          mediaType: {
            previews: ["mockingbird"], // Required for timeline API
          },
        })
        .catch((error) => {
          throw new Error(`Error fetching issue timelines: ${error.message}`);
        });

      // Fetch related PRs
      const relatedPRs = await octokit.rest.pulls
        .list({
          owner,
          repo,
          state: "all",
          per_page: 100,
        })
        .catch((error) => {
          throw new Error(`Error fetching related PRs: ${error.message}`);
        });

      const relatedPRsForIssue = relatedPRs.data.filter(
        (pr) => pr.body && pr.body.includes(`#${issueNumber}`)
      );

      // Structure the response
      const responseData = {
        issueDetails: issueDetails.data,
        issueComments: issueComments.data,
        issueEvents: issueEvents.data,
        issueTimelines: issueTimelines.data,
        relatedPRs: relatedPRsForIssue,
      };

      // Send response to frontend
      res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching issue data:", error.message);
      res.status(500).json({ error: "Failed to fetch issue data" });
    }
  }
}

module.exports = GitHubDataController;
