import notificationModel from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationModel
    .find({ recipient: req.user._id })
    .populate("sender", "username email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, notifications, "Notifications retrieved successfully"));
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationModel.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All notifications marked as read"));
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
  await notificationModel.deleteMany({ recipient: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All notifications cleared successfully"));
});
