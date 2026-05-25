import crypto from "crypto";
import boardModel from "../models/board.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import workSpaceModel from "../models/workspace.model.js";
import userModel from "../models/users.model.js";

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

export const list = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { search, starred } = req.query;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const workspace = await workSpaceModel.findById(workspaceId).populate("owner", "username email");
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const isOwner = workspace.owner && workspace.owner._id.toString() === req.user._id.toString();
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

    query.$or = [
      { title: searchRegex },
      { owner: { $in: ownerIds } }
    ];
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
        (a, b) => new Date(b.openedAt) - new Date(a.openedAt)
      );
      const absoluteLastOpened = sortedVisits[0];
      lastOpenedUser = absoluteLastOpened.user || null;
      lastOpenedAt = absoluteLastOpened.openedAt || null;
    }

    const myLastOpened = board.lastOpenedBy?.find(
      (item) => item.user && (item.user._id || item.user).toString() === req.user._id.toString()
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

  const workspace = await workSpaceModel.findById(board.workspace).populate("owner", "username email");
  if (!workspace) {
    throw new ApiError(404, "Workspace associated with this board not found");
  }

  const isOwner = workspace.owner && workspace.owner._id.toString() === req.user._id.toString();
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
    (item) => item.user && item.user.toString() === userIdStr
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
  if (populatedBoardDoc.boardSnapshot && populatedBoardDoc.boardSnapshot.length > 0) {
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
  if (populatedBoardDoc.lastOpenedBy && populatedBoardDoc.lastOpenedBy.length > 0) {
    const sortedVisits = [...populatedBoardDoc.lastOpenedBy].sort(
      (a, b) => new Date(b.openedAt) - new Date(a.openedAt)
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
    starredCount: populatedBoardDoc.starredBy ? populatedBoardDoc.starredBy.length : 0,
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
  const expiresInHours = Number(req.body.expiresIn) || 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  board.isPublic = true;
  board.publicShareToken = token;
  board.publicShareExpires = expiresAt;

  await board.save();

  const shareUrl = `${req.protocol}://${req.get("host")}/api/boards/shared/${token}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shareToken: token,
        expiresAt,
        shareUrl,
        board,
      },
      "Share link generated successfully",
    ),
  );
});

export const getPublicBoard = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Share token is required");
  }

  const board = await boardModel.findOne({ publicShareToken: token });

  if (
    !board ||
    !board.isPublic ||
    (board.publicShareExpires && board.publicShareExpires < new Date())
  ) {
    throw new ApiError(404, "Public board not found or token has expired");
  }

  const latestSnapshot = await boardSnapshotModel
    .findOne({ board: board._id })
    .sort({ version: -1 })
    .populate("createdBy", "username email");

  const opQuery = { board: board._id };
  if (latestSnapshot) {
    opQuery.version = { $gt: latestSnapshot.version };
  }
  const operations = await boardOpsModel
    .find(opQuery)
    .sort({ version: 1 })
    .populate("createdBy", "username email");

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
        isReadOnly: true,
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
  await board.save();

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
