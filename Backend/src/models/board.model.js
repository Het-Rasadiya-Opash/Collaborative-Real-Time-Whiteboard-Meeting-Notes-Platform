import mongoose from "mongoose";

const boardSnapshotSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
    },
    canvasJson: {
      type: Array,
      required: true,
    },
    yjsStateVector: {
      type: Buffer,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);
const boardOpsSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
  },
  op: {
    type: {
      type: String,
      enum: [
        "STROKE_ADD",
        "SHAPE_ADD",
        "SHAPE_MODIFY",
        "SHAPE_DELETE",
        "STICKY_ADD",
        "STICKY_MODIFY",
      ],
    },
    id: {
      type: String,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: "Untitled Board",
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastOpenedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        openedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicShareToken: {
      type: String,
      index: true,
    },
    publicShareExpires: {
      type: Date,
    },
    publicShareRole: {
      type: String,
      enum: ["VIEWER", "EDITOR"],
      default: "VIEWER",
    },
    activeVersion: {
      type: Number,
      default: 0,
    },
    meetingNotes: {
      type: String,
      default: "",
    },
    yjsState: {
      type: Buffer,
      default: null,
    },
    comments: [
      {
        author: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        commentType: {
          type: String,
          enum: ["comment", "note"],
          default: "comment",
        },
      },
    ],
    boardOps: [boardOpsSchema],
    boardSnapshot: [boardSnapshotSchema],
  },
  { timestamps: true },
);

const boardModel = mongoose.model("Board", boardSchema);

export default boardModel;
