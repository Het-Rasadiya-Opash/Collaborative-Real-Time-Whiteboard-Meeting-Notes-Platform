import { createCanvas } from "canvas";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import * as Y from "yjs";
import boardModel from "../models/board.model.js";
import notesModel from "../models/notes.model.js";
import userModel from "../models/users.model.js";
import workSpaceModel from "../models/workspace.model.js";
import notificationModel from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createBoard = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title } = req.body;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const workspace = await workSpaceModel.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
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
      "You are not authorized to create a board in this workspace",
    );
  }

  const sanitizedTitle =
    title && title.trim() !== "" ? title.trim() : "Untitled Board";

  const boardData = {
    title: sanitizedTitle,
    workspace: workspaceId,
    owner: req.user._id,
    boardSnapshot: [],
    boardOps: [],
    activeVersion: 0,
  };

  if (req.body.snapshot) {
    let canvasJson = [];
    let version = 1;
    let yjsStateVector = null;

    if (Array.isArray(req.body.snapshot)) {
      canvasJson = req.body.snapshot;
    } else if (
      typeof req.body.snapshot === "object" &&
      req.body.snapshot !== null
    ) {
      canvasJson = req.body.snapshot.canvasJson || [];
      version =
        typeof req.body.snapshot.version === "number"
          ? req.body.snapshot.version
          : 1;
      if (req.body.snapshot.yjsStateVector) {
        if (typeof req.body.snapshot.yjsStateVector === "string") {
          yjsStateVector = Buffer.from(
            req.body.snapshot.yjsStateVector,
            "base64",
          );
        } else if (Buffer.isBuffer(req.body.snapshot.yjsStateVector)) {
          yjsStateVector = req.body.snapshot.yjsStateVector;
        }
      }
    }

    if (canvasJson.length === 0 && Array.isArray(req.body.canvasJson)) {
      canvasJson = req.body.canvasJson;
    }

    boardData.boardSnapshot.push({
      version,
      canvasJson,
      yjsStateVector,
      createdBy: req.user._id,
    });
  }

  const rawOps =
    req.body.operations ||
    req.body.optionData ||
    req.body.ops ||
    req.body.option;
  if (rawOps) {
    const opsArray = Array.isArray(rawOps) ? rawOps : [rawOps];
    const VALID_OP_TYPES = [
      "STROKE_ADD",
      "SHAPE_ADD",
      "SHAPE_MODIFY",
      "SHAPE_DELETE",
      "STICKY_ADD",
      "STICKY_MODIFY",
    ];

    for (const item of opsArray) {
      if (!item) continue;

      let opVersion = item.version || 1;
      let opDetail = item.op;

      if (!opDetail && (item.type || item.id || item.data)) {
        opDetail = {
          type: item.type,
          id: item.id,
          data: item.data,
        };
      }

      if (opDetail && opDetail.type) {
        const normalizedType = opDetail.type.toUpperCase();
        if (VALID_OP_TYPES.includes(normalizedType)) {
          opDetail.type = normalizedType;
          boardData.boardOps.push({
            version: opVersion,
            op: opDetail,
            createdBy: req.user._id,
          });
        }
      }
    }
  }

  let maxVersion = 0;
  for (const snap of boardData.boardSnapshot) {
    if (snap.version > maxVersion) {
      maxVersion = snap.version;
    }
  }
  for (const op of boardData.boardOps) {
    if (op.version > maxVersion) {
      maxVersion = op.version;
    }
  }
  boardData.activeVersion = maxVersion;

  const board = await boardModel.create(boardData);

  if (!board) {
    throw new ApiError(500, "Something went wrong while creating the board");
  }

  try {
    const membersToNotify = [];
    if (workspace.owner && workspace.owner.toString() !== req.user._id.toString()) {
      membersToNotify.push(workspace.owner);
    }
    if (workspace.members) {
      workspace.members.forEach((m) => {
        if (m.user && m.user.toString() !== req.user._id.toString()) {
          membersToNotify.push(m.user);
        }
      });
    }

    const io = req.app.get("io");

    await Promise.all(
      membersToNotify.map(async (recipientId) => {
        const newNotif = await notificationModel.create({
          recipient: recipientId,
          sender: req.user._id,
          type: "BOARD_ADDED",
          message: `${req.user.username} created a new board: "${sanitizedTitle}" in workspace: "${workspace.name}"`,
          link: `/`,
        });

        if (io) {
          io.to(`user_${recipientId.toString()}`).emit("new-notification", {
            ...newNotif.toObject(),
            sender: {
              _id: req.user._id,
              username: req.user.username,
              email: req.user.email,
            },
          });
        }
      })
    );
  } catch (err) {
    console.error("Error creating BOARD_ADDED notifications:", err);
  }

  const populatedBoard = await boardModel
    .findById(board._id)
    .populate("boardSnapshot.createdBy", "username email")
    .populate("boardOps.createdBy", "username email");

  const createdSnapshot =
    (populatedBoard.boardSnapshot && populatedBoard.boardSnapshot[0]) || null;
  const createdOps = populatedBoard.boardOps || [];

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        board: populatedBoard,
        snapshot: createdSnapshot,
        operations: createdOps,
      },
      "Board created successfully",
    ),
  );
});

export const getAllBoards = asyncHandler(async (req, res) => {
  const boards = await boardModel.find({})
    .populate("owner", "username email")
    .populate("workspace", "name");
  return res.status(200).json(new ApiResponse(200, boards, "fetch All boards"));
});

export const list = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { search, starred } = req.query;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const workspace = await workSpaceModel
    .findById(workspaceId)
    .populate("owner", "username email");
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const isOwner =
    workspace.owner &&
    workspace.owner._id.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(
      403,
      "You are not authorized to view boards in this workspace",
    );
  }

  const query = { workspace: workspaceId };

  if (search && search.trim() !== "") {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingUsers = await userModel.find({ username: searchRegex });
    const ownerIds = matchingUsers.map((u) => u._id);

    query.$or = [{ title: searchRegex }, { owner: { $in: ownerIds } }];
  }

  if (starred === "true") {
    query.starredBy = req.user._id;
  }

  const boards = await boardModel
    .find(query)
    .populate("owner", "username email")
    .populate("lastOpenedBy.user", "username email")
    .sort({ updatedAt: -1 });

  const formattedBoards = boards.map((board) => {
    const boardObj = board.toObject();
    const ownerInfo = board.owner || {
      _id: workspace.owner?._id || workspace.owner,
      username: workspace.owner?.username || "Workspace Owner",
      email: workspace.owner?.email || "",
    };

    let lastOpenedUser = null;
    let lastOpenedAt = null;
    if (board.lastOpenedBy && board.lastOpenedBy.length > 0) {
      const sortedVisits = [...board.lastOpenedBy].sort(
        (a, b) => new Date(b.openedAt) - new Date(a.openedAt),
      );
      const absoluteLastOpened = sortedVisits[0];
      lastOpenedUser = absoluteLastOpened.user || null;
      lastOpenedAt = absoluteLastOpened.openedAt || null;
    }

    const myLastOpened = board.lastOpenedBy?.find(
      (item) =>
        item.user &&
        (item.user._id || item.user).toString() === req.user._id.toString(),
    );

    return {
      ...boardObj,
      owner: ownerInfo,
      lastOpenedUser,
      lastOpenedAt,
      myLastOpenedAt: myLastOpened ? myLastOpened.openedAt : null,
      isStarred: board.starredBy
        ? board.starredBy.some(
            (id) => id.toString() === req.user._id.toString(),
          )
        : false,
      starredCount: board.starredBy ? board.starredBy.length : 0,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, formattedBoards, "Boards retrieved successfully"),
    );
});

export const get = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel
    .findById(board.workspace)
    .populate("owner", "username email");
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner =
    workspace.owner &&
    workspace.owner._id.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(403, "You are not authorized to view this board");
  }

  if (!board.lastOpenedBy) {
    board.lastOpenedBy = [];
  }
  const userIdStr = req.user._id.toString();
  const lastOpenedIndex = board.lastOpenedBy.findIndex(
    (item) => item.user && item.user.toString() === userIdStr,
  );
  if (lastOpenedIndex !== -1) {
    board.lastOpenedBy[lastOpenedIndex].openedAt = new Date();
  } else {
    board.lastOpenedBy.push({
      user: req.user._id,
      openedAt: new Date(),
    });
  }
  await board.save();

  const populatedBoardDoc = await boardModel
    .findById(id)
    .populate("owner", "username email")
    .populate("lastOpenedBy.user", "username email")
    .populate("boardSnapshot.createdBy", "username email")
    .populate("boardOps.createdBy", "username email");

  let latestSnapshot = null;
  if (
    populatedBoardDoc.boardSnapshot &&
    populatedBoardDoc.boardSnapshot.length > 0
  ) {
    latestSnapshot = [...populatedBoardDoc.boardSnapshot].sort(
      (a, b) => b.version - a.version,
    )[0];
  }

  let operations = populatedBoardDoc.boardOps || [];
  if (latestSnapshot) {
    operations = operations.filter((op) => op.version > latestSnapshot.version);
  }
  operations = [...operations].sort((a, b) => a.version - b.version);

  const boardObj = populatedBoardDoc.toObject();
  const ownerInfo = boardObj.owner || {
    _id: workspace.owner?._id || workspace.owner,
    username: workspace.owner?.username || "Workspace Owner",
    email: workspace.owner?.email || "",
  };

  let lastOpenedUser = null;
  let lastOpenedAt = null;
  if (
    populatedBoardDoc.lastOpenedBy &&
    populatedBoardDoc.lastOpenedBy.length > 0
  ) {
    const sortedVisits = [...populatedBoardDoc.lastOpenedBy].sort(
      (a, b) => new Date(b.openedAt) - new Date(a.openedAt),
    );
    const absoluteLastOpened = sortedVisits[0];
    lastOpenedUser = absoluteLastOpened.user || null;
    lastOpenedAt = absoluteLastOpened.openedAt || null;
  }

  const formattedBoard = {
    ...boardObj,
    owner: ownerInfo,
    lastOpenedUser,
    lastOpenedAt,
    isStarred: populatedBoardDoc.starredBy
      ? populatedBoardDoc.starredBy.some(
          (starredId) => starredId.toString() === req.user._id.toString(),
        )
      : false,
    starredCount: populatedBoardDoc.starredBy
      ? populatedBoardDoc.starredBy.length
      : 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        board: formattedBoard,
        snapshot: latestSnapshot,
        operations,
      },
      "Board details retrieved and collated successfully",
    ),
  );
});

export const toggleStar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(403, "You are not authorized to star/unstar this board");
  }

  if (!board.starredBy) {
    board.starredBy = [];
  }

  const userIdStr = req.user._id.toString();
  const index = board.starredBy.findIndex(
    (starredId) => starredId.toString() === userIdStr,
  );

  let isStarred = false;
  if (index === -1) {
    board.starredBy.push(req.user._id);
    isStarred = true;
  } else {
    board.starredBy.splice(index, 1);
  }

  await board.save();

  const boardObj = board.toObject();
  const formattedBoard = {
    ...boardObj,
    isStarred,
    starredCount: board.starredBy.length,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedBoard,
        isStarred
          ? "Board starred successfully"
          : "Board unstarred successfully",
      ),
    );
});

export const generateShareLink = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
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
      "You are not authorized to generate a share link for this board",
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresInHours =
    req.body.expiresIn !== undefined ? Number(req.body.expiresIn) : 24;
  const expiresAt =
    expiresInHours === -1
      ? null
      : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const role = req.body.role || "VIEWER";

  board.isPublic = true;
  board.publicShareToken = token;
  board.publicShareExpires = expiresAt;
  board.publicShareRole = role;

  await board.save();

  const shareUrl = `${req.protocol}://${req.get("host")}/api/boards/share/${token}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shareToken: token,
        expiresAt,
        shareUrl,
        publicShareRole: role,
        board,
      },
      "Share link generated successfully",
    ),
  );
});

export const revokeShareLink = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
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
      "You are not authorized to revoke the share link for this board",
    );
  }

  board.isPublic = false;
  board.publicShareToken = undefined;
  board.publicShareExpires = undefined;

  await board.save();

  return res
    .status(200)
    .json(new ApiResponse(200, board, "Share link revoked successfully"));
});

export const getPublicBoard = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Share token is required");
  }

  const board = await boardModel
    .findOne({ publicShareToken: token })
    .populate("owner", "username email")
    .populate("boardSnapshot.createdBy", "username email")
    .populate("boardOps.createdBy", "username email");

  if (
    !board ||
    !board.isPublic ||
    (board.publicShareExpires && board.publicShareExpires < new Date())
  ) {
    throw new ApiError(404, "Public board not found or token has expired");
  }

  let latestSnapshot = null;
  if (board.boardSnapshot && board.boardSnapshot.length > 0) {
    latestSnapshot = [...board.boardSnapshot].sort(
      (a, b) => b.version - a.version,
    )[0];
  }

  let operations = board.boardOps || [];
  if (latestSnapshot) {
    operations = operations.filter((op) => op.version > latestSnapshot.version);
  }
  operations = [...operations].sort((a, b) => a.version - b.version);

  const boardObj = board.toObject();
  const formattedBoard = {
    ...boardObj,
    isStarred: false,
    starredCount: board.starredBy ? board.starredBy.length : 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        board: formattedBoard,
        snapshot: latestSnapshot,
        operations,
        isReadOnly: board.publicShareRole === "VIEWER",
      },
      "Public board details retrieved successfully",
    ),
  );
});

export const snapShotList = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel
    .findById(id)
    .populate("boardSnapshot.createdBy", "username email");
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(
      403,
      "You are not authorized to view snapshots for this board",
    );
  }

  const snapshots = board.boardSnapshot || [];
  const sortedSnapshots = [...snapshots].sort((a, b) => b.version - a.version);

  return res
    .status(200)
    .json(
      new ApiResponse(200, sortedSnapshots, "Snapshots retrieved successfully"),
    );
});

export const restore = asyncHandler(async (req, res) => {
  const { id, snapId } = req.params;

  if (!id || !snapId) {
    throw new ApiError(400, "Board ID and Snapshot ID are required");
  }

  const board = await boardModel.findById(id);
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
      "You are not authorized to restore snapshots for this board",
    );
  }

  const snapshot = board.boardSnapshot.id(snapId);
  if (!snapshot) {
    throw new ApiError(404, "Snapshot not found");
  }

  board.boardOps = board.boardOps.filter(
    (op) => op.version <= snapshot.version,
  );

  board.boardSnapshot = board.boardSnapshot.filter(
    (snap) => snap.version <= snapshot.version,
  );

  board.activeVersion = snapshot.version;

  const tempDoc = new Y.Doc();
  const canvasMap = tempDoc.getMap("canvas");
  const notesText = tempDoc.getText("notes");

  if (Array.isArray(snapshot.canvasJson)) {
    snapshot.canvasJson.forEach((el) => {
      if (el && el.id) {
        canvasMap.set(el.id, el);
      }
    });
  }
  notesText.insert(0, board.meetingNotes || "");

  const stateUpdate = Y.encodeStateAsUpdate(tempDoc);
  board.yjsState = Buffer.from(stateUpdate);

  await board.save();

  const activeDocs = req.app.get("activeDocs");
  if (activeDocs && activeDocs.has(id)) {
    const active = activeDocs.get(id);
    if (active.saveTimeout) {
      clearTimeout(active.saveTimeout);
    }
    activeDocs.delete(id);
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`board_${id}`).emit("board-restored", {
      elements: snapshot.canvasJson,
      meetingNotes: board.meetingNotes,
      syncData: Array.from(stateUpdate),
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        board,
        restoredToSnapshot: snapshot,
      },
      "Board restored to snapshot successfully",
    ),
  );
});

export const createSnapshot = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
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
      "You are not authorized to create snapshots for this board",
    );
  }

  const activeDocs = req.app.get("activeDocs");
  let elements = [];
  if (activeDocs && activeDocs.has(id)) {
    const doc = activeDocs.get(id).doc;
    const canvasMap = doc.getMap("canvas");
    elements = Array.from(canvasMap.values());
  } else {
    const sortedSnaps =
      board.boardSnapshot && board.boardSnapshot.length > 0
        ? [...board.boardSnapshot].sort((a, b) => b.version - a.version)
        : [];
    elements = sortedSnaps.length > 0 ? sortedSnaps[0].canvasJson : [];
  }

  const version = Date.now();
  const newSnapshot = {
    version,
    label: label || `Snapshot - ${new Date().toLocaleString()}`,
    canvasJson: elements,
    createdBy: req.user._id,
  };

  if (!board.boardSnapshot) {
    board.boardSnapshot = [];
  }
  board.boardSnapshot.push(newSnapshot);
  board.activeVersion = version;

  await board.save();

  const populatedBoard = await boardModel
    .findById(board._id)
    .populate("boardSnapshot.createdBy", "username email");

  const createdSnap = populatedBoard.boardSnapshot.find(
    (s) => s.version === version,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdSnap, "Snapshot created successfully"));
});

export const updateBoard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, snapshot, operations, meetingNotes, comments } = req.body;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
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
    throw new ApiError(403, "You are not authorized to update this board");
  }

  if (title && title.trim() !== "") {
    board.title = title.trim();
  }

  if (meetingNotes !== undefined) {
    board.meetingNotes = meetingNotes;
  }

  if (comments !== undefined && Array.isArray(comments)) {
    board.comments = comments;
  }

  if (snapshot) {
    let canvasJson = [];
    let version = board.activeVersion + 1;
    let yjsStateVector = null;

    if (Array.isArray(snapshot)) {
      canvasJson = snapshot;
    } else if (typeof snapshot === "object" && snapshot !== null) {
      canvasJson = snapshot.canvasJson || [];
      version =
        typeof snapshot.version === "number"
          ? snapshot.version
          : board.activeVersion + 1;
      if (snapshot.yjsStateVector) {
        if (typeof snapshot.yjsStateVector === "string") {
          yjsStateVector = Buffer.from(snapshot.yjsStateVector, "base64");
        } else if (Buffer.isBuffer(snapshot.yjsStateVector)) {
          yjsStateVector = snapshot.yjsStateVector;
        }
      }
    }

    board.boardSnapshot.push({
      version,
      canvasJson,
      yjsStateVector,
      createdBy: req.user._id,
    });
    board.activeVersion = version;
  }

  if (operations) {
    const opsArray = Array.isArray(operations) ? operations : [operations];
    for (const item of opsArray) {
      if (!item) continue;
      let opVersion = item.version || board.activeVersion + 1;
      let opDetail = item.op || item;

      board.boardOps.push({
        version: opVersion,
        op: opDetail,
        createdBy: req.user._id,
      });
      if (opVersion > board.activeVersion) {
        board.activeVersion = opVersion;
      }
    }
  }

  await board.save();

  const populatedBoard = await boardModel
    .findById(board._id)
    .populate("boardSnapshot.createdBy", "username email")
    .populate("boardOps.createdBy", "username email");

  return res
    .status(200)
    .json(new ApiResponse(200, populatedBoard, "Board updated successfully"));
});

const drawElementsOnCanvas = (elements) => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((el) => {
    if (!el) return;
    if (el.type === "stroke" && Array.isArray(el.points)) {
      el.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    } else if (el.type === "rectangle" || el.type === "sticky" || el.type === "text") {
      const w = el.width || (el.type === "text" ? 120 : 160);
      const h = el.height || (el.type === "text" ? 30 : 160);
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + w > maxX) maxX = el.x + w;
      if (el.y + h > maxY) maxY = el.y + h;
    } else if (el.type === "circle") {
      if (el.cx - el.r < minX) minX = el.cx - el.r;
      if (el.cy - el.r < minY) minY = el.cy - el.r;
      if (el.cx + el.r > maxX) maxX = el.cx + el.r;
      if (el.cy + el.r > maxY) maxY = el.cy + el.r;
    } else if (el.type === "arrow" && Array.isArray(el.points) && el.points.length >= 4) {
      const x1 = el.points[0];
      const y1 = el.points[1];
      const x2 = el.points[2];
      const y2 = el.points[3];
      if (x1 < minX) minX = x1;
      if (x2 < minX) minX = x2;
      if (y1 < minY) minY = y1;
      if (y2 < minY) minY = y2;
      if (x1 > maxX) maxX = x1;
      if (x2 > maxX) maxX = x2;
      if (y1 > maxY) maxY = y1;
      if (y2 > maxY) maxY = y2;
    }
  });

  const padding = 50;
  let width = 1920;
  let height = 1080;
  let offsetX = 0;
  let offsetY = 0;

  if (minX !== Infinity && minY !== Infinity) {
    width = maxX - minX + padding * 2;
    height = maxY - minY + padding * 2;
    offsetX = -minX + padding;
    offsetY = -minY + padding;
    if (width < 300) width = 300;
    if (height < 300) height = 300;
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  ctx.translate(offsetX, offsetY);

  elements.forEach((el) => {
    if (!el) return;
    if (
      el.type === "stroke" &&
      Array.isArray(el.points) &&
      el.points.length > 0
    ) {
      ctx.beginPath();
      ctx.strokeStyle = el.color || "#2563eb";
      ctx.lineWidth = el.strokeWidth || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === "rectangle") {
      ctx.beginPath();
      ctx.strokeStyle = el.color || "#2563eb";
      ctx.lineWidth = 3;
      ctx.rect(el.x, el.y, el.width, el.height);
      ctx.stroke();
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.arc(el.cx, el.cy, el.r, 0, 2 * Math.PI);
      ctx.strokeStyle = el.color || "#2563eb";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (el.type === "arrow" && Array.isArray(el.points) && el.points.length >= 4) {
      ctx.beginPath();
      ctx.strokeStyle = el.color || "#2563eb";
      ctx.lineWidth = el.strokeWidth || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const startX = el.points[0];
      const startY = el.points[1];
      const endX = el.points[2];
      const endY = el.points[3];
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - 12 * Math.cos(angle - Math.PI / 6),
        endY - 12 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - 12 * Math.cos(angle + Math.PI / 6),
        endY - 12 * Math.sin(angle + Math.PI / 6)
      );
      ctx.fillStyle = el.color || "#2563eb";
      ctx.fill();
    } else if (el.type === "text") {
      ctx.fillStyle = el.color || "#1e293b";
      ctx.font = `bold ${el.fontSize || 20}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(el.text || "", el.x, el.y);
    } else if (el.type === "sticky") {
      const rx = el.x;
      const ry = el.y;
      const rw = el.width || 160;
      const rh = el.height || 160;
      const radius = 12;

      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh - radius);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();

      ctx.fillStyle = el.color || "#fef08a";
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rx + rw - 15, ry + 15, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = el.text || "";
      const words = text.split(" ");
      let line = "";
      const lines = [];
      const maxWidth = rw - 24;
      const lineHeight = 16;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const totalTextHeight = lines.length * lineHeight;
      let startY = ry + (rh - totalTextHeight) / 2 + lineHeight / 2;

      lines.forEach((l) => {
        ctx.fillText(l.trim(), rx + rw / 2, startY);
        startY += lineHeight;
      });
    }
  });

  return canvas.toBuffer("image/png");
};

export const exportPNG = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(403, "You are not authorized to export this board");
  }

  const activeDocs = req.app.get("activeDocs");
  let elements = [];
  if (activeDocs && activeDocs.has(id)) {
    const doc = activeDocs.get(id).doc;
    const canvasMap = doc.getMap("canvas");
    elements = Array.from(canvasMap.values());
  } else {
    const sortedSnaps =
      board.boardSnapshot && board.boardSnapshot.length > 0
        ? [...board.boardSnapshot].sort((a, b) => b.version - a.version)
        : [];
    elements = sortedSnaps.length > 0 ? sortedSnaps[0].canvasJson : [];
  }

  const pngBuffer = drawElementsOnCanvas(elements);

  res.setHeader("Content-Type", "image/png");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${board.title.replace(/\s+/g, "_")}.png"`,
  );
  return res.send(pngBuffer);
});

export const exportPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) =>
      member.user && member.user.toString() === req.user._id.toString(),
  );

  if (!isOwner && !isMember) {
    throw new ApiError(403, "You are not authorized to export this board");
  }

  const activeDocs = req.app.get("activeDocs");
  let elements = [];
  let meetingNotesText = board.meetingNotes || "";

  if (activeDocs && activeDocs.has(id)) {
    const active = activeDocs.get(id);
    const doc = active.doc;
    const canvasMap = doc.getMap("canvas");
    elements = Array.from(canvasMap.values());
    const notesText = doc.getText("notes");
    meetingNotesText = notesText.toString();
  } else {
    const sortedSnaps =
      board.boardSnapshot && board.boardSnapshot.length > 0
        ? [...board.boardSnapshot].sort((a, b) => b.version - a.version)
        : [];
    elements = sortedSnaps.length > 0 ? sortedSnaps[0].canvasJson : [];
  }

  const pngBuffer = drawElementsOnCanvas(elements);
  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${board.title.replace(/\s+/g, "_")}_meeting_summary.pdf"`,
  );

  doc.pipe(res);

  doc.rect(0, 0, 595, 80).fill("#1e293b");
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(board.title, 50, 22, { width: 495, ellipsis: true });
  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Workspace: ${workspace.name || "Default Workspace"}  |  Generated on ${new Date().toLocaleString()}`,
      50,
      48,
    );

  doc.y = 110;

  doc
    .fillColor("#2563eb")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("WHITEBOARD CANVAS SNAPSHOT", 50, doc.y);
  doc.moveDown(0.5);

  try {
    doc.image(pngBuffer, {
      fit: [495, 260],
      align: "center",
      valign: "center",
    });
    doc.y = 400;
  } catch (err) {
    console.error("Error embedding PNG in PDF:", err);
    doc
      .fillColor("#ef4444")
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text("[Could not render whiteboard snapshot]");
    doc.moveDown(2);
  }

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .stroke();
  doc.moveDown(1.5);

  doc
    .fillColor("#7c3aed")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("MEETING NOTES & SUMMARY", 50, doc.y);
  doc.moveDown(0.8);

  if (!meetingNotesText || meetingNotesText.trim() === "") {
    doc
      .fillColor("#64748b")
      .font("Helvetica-Oblique")
      .fontSize(11)
      .text("No notes captured during this whiteboard session.");
  } else {
    let cleanHtml = meetingNotesText
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h1>/gi, "\n\n")
      .replace(/<\/h2>/gi, "\n\n")
      .replace(/<\/h3>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n");

    const lines = cleanHtml.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const stripTags = (txt) => {
        return txt
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
      };

      if (line.startsWith("<h1")) {
        doc.moveDown(0.6);
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(16)
          .text(stripTags(line));
        doc.moveDown(0.3);
      } else if (line.startsWith("<h2")) {
        doc.moveDown(0.5);
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text(stripTags(line));
        doc.moveDown(0.2);
      } else if (line.startsWith("<h3")) {
        doc.moveDown(0.4);
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(stripTags(line));
        doc.moveDown(0.2);
      } else if (line.startsWith("<li")) {
        doc
          .fillColor("#334155")
          .font("Helvetica")
          .fontSize(10)
          .text(`  •  ${stripTags(line)}`, { indent: 15 });
      } else {
        doc
          .fillColor("#334155")
          .font("Helvetica")
          .fontSize(10)
          .text(stripTags(line), { paragraphGap: 6, lineGap: 2 });
      }
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor("#94a3b8")
      .font("Helvetica")
      .fontSize(8)
      .text(`Page ${i + 1} of ${range.count}`, 50, doc.page.height - 35, {
        align: "center",
        width: doc.page.width - 100,
      });
  }

  doc.end();
});

export const deleteBoard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await boardModel.findById(id);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const workspace = await workSpaceModel.findById(board.workspace);
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isWorkspaceOwner = workspace.owner.toString() === req.user._id.toString();
  const member = workspace.members.find(
    (m) => m.user && m.user.toString() === req.user._id.toString(),
  );

  const hasWorkspacePower = isWorkspaceOwner || (member && (member.role === "OWNER" || member.role === "EDITOR"));

  if (!hasWorkspacePower) {
    throw new ApiError(
      403,
      "You are not authorized to delete this board. Only workspace Owners and Editors can delete boards."
    );
  }

  // Remove the board from Yjs active documents map in memory
  const activeDocs = req.app.get("activeDocs");
  if (activeDocs && activeDocs.has(id)) {
    const active = activeDocs.get(id);
    if (active.saveTimeout) {
      clearTimeout(active.saveTimeout);
    }
    activeDocs.delete(id);
  }

  // Delete associated notes document
  await notesModel.deleteMany({ board: id });

  // Delete the board document
  await boardModel.findByIdAndDelete(id);

  // Notify any active socket connections in this board
  const io = req.app.get("io");
  if (io) {
    io.to(`board_${id}`).emit("board-deleted");
  }

  // Send BOARD_DELETED notifications to other workspace members
  try {
    const membersToNotify = [];
    if (workspace.owner && workspace.owner.toString() !== req.user._id.toString()) {
      membersToNotify.push(workspace.owner);
    }
    if (workspace.members) {
      workspace.members.forEach((m) => {
        if (m.user && m.user.toString() !== req.user._id.toString()) {
          membersToNotify.push(m.user);
        }
      });
    }

    await Promise.all(
      membersToNotify.map(async (recipientId) => {
        const newNotif = await notificationModel.create({
          recipient: recipientId,
          sender: req.user._id,
          type: "BOARD_DELETED",
          message: `${req.user.username} deleted the board: "${board.title}" in workspace: "${workspace.name}"`,
          link: `/`,
        });

        if (io) {
          io.to(`user_${recipientId.toString()}`).emit("new-notification", {
            ...newNotif.toObject(),
            sender: {
              _id: req.user._id,
              username: req.user.username,
              email: req.user.email,
            },
          });
        }
      })
    );
  } catch (err) {
    console.error("Error creating BOARD_DELETED notifications:", err);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Board deleted successfully"));
});
