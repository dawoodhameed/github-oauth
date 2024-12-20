const mongoose = require("mongoose");

const RepoSchema = new mongoose.Schema(
  {
    repo_id: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: false
  }
);

RepoSchema.index({ "$**": "text" }); // Make all fields text searchable

module.exports = mongoose.model("Repo", RepoSchema);
