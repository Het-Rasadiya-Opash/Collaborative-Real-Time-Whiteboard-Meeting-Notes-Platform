import crypto from "crypto";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import workSpaceModel from "../models/workspace.model.js";
import userModel from "../models/users.model.js";

export const createWorkSpace = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Workspace name is required");
  }

  const workspace = await workSpaceModel.create({
    name: name.trim(),
    owner: req.user._id,
    members: [
      {
        user: req.user._id,
        role: "OWNER",
      },
    ],
  });

  if (!workspace) {
    throw new ApiError(
      500,
      "Something went wrong while creating the workspace",
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, workspace, "Workspace created successfully"));
});

export const listWorkspace = asyncHandler(async (req, res) => {
  const workspaces = await workSpaceModel
    .find({
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    })
    .populate("owner", "username email role")
    .populate("members.user", "username role email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, workspaces, "Workspaces retrieved successfully"),
    );
});

export const addMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const workspaceId = req.params.id;

  if (!email || email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }

  const workspace = await workSpaceModel.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (workspace.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to add members to this workspace",
    );
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new ApiError(404, "Registered user with this email not found");
  }

  const isAlreadyMember = workspace.members.some(
    (member) => member.user.toString() === user._id.toString(),
  );
  if (isAlreadyMember) {
    throw new ApiError(400, "User is already a member of this workspace");
  }

  workspace.members.push({
    user: user._id,
    role: role || "VIEWER",
  });

  await workspace.save();

  const populatedWorkspace = await workSpaceModel
    .findById(workspaceId)
    .populate("owner", "username email role")
    .populate("members.user", "username role email");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        populatedWorkspace,
        "Member added successfully to the workspace",
      ),
    );
});

export const removeMember = asyncHandler(async (req, res) => {
  const { id: workspaceId, userId } = req.params;

  const workspace = await workSpaceModel.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (workspace.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to remove members from this workspace",
    );
  }

  const memberIndex = workspace.members.findIndex(
    (member) => member.user.toString() === userId,
  );

  if (memberIndex === -1) {
    throw new ApiError(404, "User is not a member of this workspace");
  }

  if (
    workspace.members[memberIndex].role === "OWNER" ||
    workspace.owner.toString() === userId
  ) {
    throw new ApiError(
      400,
      "The workspace owner cannot be removed from the members list",
    );
  }

  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  const populatedWorkspace = await workSpaceModel
    .findById(workspaceId)
    .populate("owner", "username email role")
    .populate("members.user", "username role email");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        populatedWorkspace,
        "Member removed successfully from the workspace",
      ),
    );
});

export const getWorkspaceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const workspace = await workSpaceModel
    .findById(id)
    .populate("owner", "username email role")
    .populate("members.user", "username role email");

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const isOwner = workspace.owner._id.toString() === req.user._id.toString();
  const isMember = workspace.members.some(
    (member) => member.user && member.user._id.toString() === req.user._id.toString()
  );

  if (!isOwner && !isMember) {
    throw new ApiError(403, "You are not authorized to access this workspace");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, workspace, "Workspace retrieved successfully"));
});

