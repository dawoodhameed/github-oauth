const mongoose = require("mongoose");

const UsersSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: false
  }
);

UsersSchema.index({ "$**": "text" }); // Make all fields text searchable

module.exports = mongoose.model("Users", UsersSchema);
