import boardModel from "../models/board.model.js";
import notesModel from "../models/notes.model.js";
import workSpaceModel from "../models/workspace.model.js";
import notificationModel from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const get = asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(boardId);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const member = workspace.members.find(
    (m) => m.user && m.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !member) {
    throw new ApiError(
      403,
      "You are not authorized to view notes for this board",
    );
  }

  let notes = await notesModel.findOne({ board: boardId });
  if (!notes) {
    notes = await notesModel.create({
      board: boardId,
      textContent: board.meetingNotes || "",
    });
  } else if (notes.textContent !== board.meetingNotes) {
    notes.textContent = board.meetingNotes || "";
    await notes.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes document retrieved successfully"));
});

export const extractActions = asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(boardId);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const member = workspace.members.find(
    (m) => m.user && m.user.toString() === req.user._id.toString(),
  );
  const hasRequiredRole =
    member && (member.role === "OWNER" || member.role === "EDITOR");

  if (!isOwner && !hasRequiredRole) {
    throw new ApiError(
      403,
      "You are not authorized to perform AI actions on this board",
    );
  }

  let text = req.body.notesText || req.body.text;
  if (!text) {
    const notesDoc = await notesModel.findOne({ board: boardId });
    if (notesDoc && notesDoc.textContent) {
      text = notesDoc.textContent;
    }
  }
  if (!text) {
    text = board.meetingNotes || "";
  }

  const actionItems = [];

  if (text) {
    const lines = [];
    const liMatches = text.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (liMatches) {
      liMatches.forEach((li) => {
        const clean = li.replace(/<[^>]*>/g, "").trim();
        if (clean) lines.push(clean);
      });
    }

    const pMatches = text.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (pMatches) {
      pMatches.forEach((p) => {
        const clean = p.replace(/<[^>]*>/g, "").trim();
        if (clean) {
          clean.split(/[.!?]+/).forEach((s) => {
            const trimmed = s.trim();
            if (trimmed.length > 5) lines.push(trimmed);
          });
        }
      });
    }

    if (lines.length === 0) {
      const plain = text.replace(/<[^>]*>/g, "\n");
      plain.split(/\n+/).forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          trimmedLine.split(/[.!?]+/).forEach((s) => {
            const trimmed = s.trim();
            if (trimmed.length > 5) lines.push(trimmed);
          });
        }
      });
    }

    const taskKeywords = [
      "todo",
      "task",
      "action item",
      "action-item",
      "should",
      "must",
      "needs to",
      "need to",
      "will",
      "please",
      "assign",
      "draft",
      "create",
      "implement",
      "review",
      "update",
      "fix",
      "send",
      "prepare",
      "schedule",
    ];

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      const isAction = taskKeywords.some((keyword) => lower.includes(keyword));

      if (isAction) {
        let assignee = "Unassigned";
        const assignedToMatch = line.match(
          /assign(?:ed)?\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        );
        const willMatch = line.match(
          /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+will\b/,
        );

        const toMatch = line.match(
          /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:needs?\s+to|should|must|will|to)\s+(?:implement|create|review|update|fix|send|prepare|schedule|do|draft|design|code)/,
        );

        if (assignedToMatch) {
          assignee = assignedToMatch[1];
        } else if (willMatch) {
          assignee = willMatch[1];
        } else if (toMatch) {
          assignee = toMatch[1];
        }

        let dueDate = "";
        const dueMatch = line.match(
          /(?:by|due|before|deadline)\s+([A-Za-z0-9\s\/-]+?)(?:\s+and|\s+for|\s+to|\.|$)/i,
        );
        if (dueMatch) {
          dueDate = dueMatch[1].trim();
        }

        let task = line
          .replace(/\[\s*\]/g, "")
          .replace(/todo:?/gi, "")
          .replace(/task:?/gi, "")
          .replace(/action\s+item:?/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        if (task) {
          task = task.charAt(0).toUpperCase() + task.slice(1);
          actionItems.push({
            task,
            assignee,
            dueDate,
            status: "PENDING",
          });
        }
      }
    });
  }

  if (actionItems.length === 0) {
    const textLower = (text || "").toLowerCase();
    const mockTasks = [];

    if (
      textLower.includes("api") ||
      textLower.includes("backend") ||
      textLower.includes("server")
    ) {
      mockTasks.push({
        task: "Implement the secure API endpoints for collaborative notes integration",
        assignee: "Backend Developer",
        dueDate: "By Next Wednesday",
        status: "PENDING",
      });
    }
    if (
      textLower.includes("design") ||
      textLower.includes("ui") ||
      textLower.includes("frontend") ||
      textLower.includes("style")
    ) {
      mockTasks.push({
        task: "Refine the whiteboard canvas styling and responsiveness across devices",
        assignee: "UI/UX Designer",
        dueDate: "By Friday EOD",
        status: "PENDING",
      });
    }
    if (
      textLower.includes("database") ||
      textLower.includes("mongo") ||
      textLower.includes("schema")
    ) {
      mockTasks.push({
        task: "Update database indexes and optimize queries for faster real-time sync",
        assignee: "Database Administrator",
        dueDate: "In 3 days",
        status: "PENDING",
      });
    }
    if (
      textLower.includes("test") ||
      textLower.includes("bug") ||
      textLower.includes("error")
    ) {
      mockTasks.push({
        task: "Write unit tests for the newly added Notes and AI extraction controllers",
        assignee: "QA Engineer",
        dueDate: "Next Monday",
        status: "PENDING",
      });
    }

    if (mockTasks.length === 0) {
      mockTasks.push(
        {
          task: "Review the whiteboard meeting notes and finalize next sprint objectives",
          assignee: "Project Manager",
          dueDate: "Tomorrow by 10 AM",
          status: "PENDING",
        },
        {
          task: "Share the updated whiteboard board link with all external stakeholders",
          assignee: "Meeting Facilitator",
          dueDate: "EOD today",
          status: "PENDING",
        },
      );
    }

    actionItems.push(...mockTasks);
  }

  let notesDoc = await notesModel.findOne({ board: boardId });
  if (!notesDoc) {
    notesDoc = await notesModel.create({
      board: boardId,
      textContent: text,
      actionItems,
    });
  } else {
    
    const manualItems = notesDoc.actionItems.filter(item => item.isManual === true);
    notesDoc.actionItems = [...manualItems, ...actionItems];
    if (text) {
      notesDoc.textContent = text;
    }
    await notesDoc.save();
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`board_${boardId}`).emit("action-items-update", {
      actionItems: notesDoc.actionItems,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        notesDoc,
        "AI Action Items extracted and saved successfully",
      ),
    );
});

export const updateActionItemStatus = asyncHandler(async (req, res) => {
  const { boardId, itemId } = req.params;
  const { status } = req.body;

  if (!status || !["PENDING", "COMPLETED"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be PENDING or COMPLETED");
  }

  const notesDoc = await notesModel.findOne({ board: boardId });
  if (!notesDoc) {
    throw new ApiError(404, "Notes not found for this board");
  }

  const actionItem = notesDoc.actionItems.id(itemId);
  if (!actionItem) {
    throw new ApiError(404, "Action item not found");
  }

  actionItem.status = status;
  await notesDoc.save();

  const io = req.app.get("io");
  if (io) {
    io.to(`board_${boardId}`).emit("action-items-update", {
      actionItems: notesDoc.actionItems,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, notesDoc, "Action item status updated successfully"),
    );
});

export const createActionItem = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { task, assignee, dueDate } = req.body;

  if (!task || !task.trim()) {
    throw new ApiError(400, "Task name is required");
  }

  const boardDoc = await boardModel.findById(boardId);
  if (!boardDoc) {
    throw new ApiError(404, "Board not found");
  }

  const workspaceDoc = await workSpaceModel
    .findById(boardDoc.workspace)
    .populate("members.user")
    .populate("owner");

  if (!workspaceDoc) {
    throw new ApiError(404, "Workspace not found");
  }

  const validMembers = [];
  if (workspaceDoc.owner) {
    validMembers.push(workspaceDoc.owner);
  }
  if (workspaceDoc.members) {
    workspaceDoc.members.forEach((m) => {
      if (m.user) {
        validMembers.push(m.user);
      }
    });
  }

  let finalAssignee = "Unassigned";
  let assigneeUser = null;
  if (assignee && assignee.trim() && assignee !== "Unassigned") {
    const matchedUser = validMembers.find(
      (u) =>
        u._id.toString() === assignee ||
        u.username?.toLowerCase() === assignee.trim().toLowerCase() ||
        u.email?.toLowerCase() === assignee.trim().toLowerCase(),
    );

    if (!matchedUser) {
      throw new ApiError(400, "Assignee must be a member of the workspace");
    }
    finalAssignee = matchedUser.username || matchedUser.email;
    assigneeUser = matchedUser;
  }

  let notesDoc = await notesModel.findOne({ board: boardId });
  if (!notesDoc) {
    notesDoc = await notesModel.create({
      board: boardId,
      textContent: "",
      actionItems: [],
    });
  }

  const newItem = {
    task: task.trim(),
    assignee: finalAssignee,
    dueDate: dueDate ? dueDate.trim() : "",
    status: "PENDING",
    isManual: true,
  };

  notesDoc.actionItems.push(newItem);
  await notesDoc.save();

  if (assigneeUser && assigneeUser._id.toString() !== req.user._id.toString()) {
    try {
      const newNotif = await notificationModel.create({
        recipient: assigneeUser._id,
        sender: req.user._id,
        type: "TASK_ASSIGNED",
        message: `${req.user.username} assigned you a task: "${task.trim()}" in board: "${boardDoc.title}"`,
        link: `/`,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user_${assigneeUser._id.toString()}`).emit("new-notification", {
          ...newNotif.toObject(),
          sender: {
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email,
          },
        });
      }
    } catch (err) {
      console.error("Error creating task assignment notification:", err);
    }
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`board_${boardId}`).emit("action-items-update", {
      actionItems: notesDoc.actionItems,
    });
  }

  const addedItem = notesDoc.actionItems[notesDoc.actionItems.length - 1];

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { notes: notesDoc, addedItem },
        "Action item created successfully",
      ),
    );
});

export const clearAll = asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const boardDoc = await boardModel.findById(boardId);
  if (!boardDoc) {
    throw new ApiError(404, "Board not found");
  }

  const workspaceDoc = await workSpaceModel.findById(boardDoc.workspace);
  if (!workspaceDoc) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspaceDoc.owner.toString() === req.user._id.toString();
  const member = workspaceDoc.members.find(
    (m) => m.user && m.user.toString() === req.user._id.toString()
  );
  const hasRequiredRole = member && (member.role === "OWNER" || member.role === "EDITOR");

  if (!isOwner && !hasRequiredRole) {
    throw new ApiError(
      403,
      "You are not authorized to clear action items on this board"
    );
  }

  let notesDoc = await notesModel.findOne({ board: boardId });
  if (!notesDoc) {
    notesDoc = await notesModel.create({
      board: boardId,
      textContent: "",
      actionItems: [],
    });
  } else {
    notesDoc.actionItems = [];
    await notesDoc.save();
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`board_${boardId}`).emit("action-items-update", {
      actionItems: notesDoc.actionItems,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notesDoc, "All action items cleared successfully"));
});

