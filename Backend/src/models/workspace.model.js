import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["OWNER", "EDITOR", "VIEWER"],
          default: "VIEWER",
        },
      },
    ],
  },
  { timestamps: true },
);

const workSpaceModel = mongoose.model("Workspace", workspaceSchema);

export default workSpaceModel;
