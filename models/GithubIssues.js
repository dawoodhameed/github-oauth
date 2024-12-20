const mongoose = require("mongoose");

const IssueSchema = new mongoose.Schema(
  {
    issue_id: { type: String, required: true, unique: true },
    repo_id: { type: String, required: true },
  },
  {
    timestamps: true,
    strict: false, // Allow dynamic fields
  }
);

IssueSchema.index({ "$**": "text" }); // Make all fields text searchable

module.exports = mongoose.model("Issue", IssueSchema);
