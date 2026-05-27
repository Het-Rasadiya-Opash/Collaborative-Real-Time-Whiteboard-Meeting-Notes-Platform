import mongoose from "mongoose";

const notesSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      unique: true,
      index: true,
    },
    yjsDocState: {
      type: Buffer,
    },
    textContent: {
      type: String,
    },
    actionItems: [
      {
        task: {
          type: String,
          required: true,
        },
        assignee: {
          type: String,
          default: "Unassigned",
        },
        dueDate: {
          type: String,
        },
        status: {
          type: String,
          enum: ["Pending", "Completed"],
          default: "Pending",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const notesModel = mongoose.model("Notes", notesSchema);

export default notesModel;
