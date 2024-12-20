const mongoose = require("mongoose");

const PullRequestSchema = new mongoose.Schema(
  {
    pr_id: { type: String, required: true, unique: true },
    repo_id: { type: String, required: true },
  },
  {
    timestamps: true,
    strict: false, // Allow dynamic fields
  }
);

PullRequestSchema.index({ "$**": "text" }); // Make all fields text searchable

module.exports = mongoose.model("PullRequest", PullRequestSchema);
