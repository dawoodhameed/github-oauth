const mongoose = require("mongoose");

const CommitSchema = new mongoose.Schema(
  {
    commit_hash: { type: String, required: true, unique: true },
    repo_id: { type: String, required: true },
  },
  {
    timestamps: true,
    strict: false, // Allow dynamic fields
  }
);

CommitSchema.index({ "$**": "text" }); // Make all fields text searchable

module.exports = mongoose.model("Commit", CommitSchema);
