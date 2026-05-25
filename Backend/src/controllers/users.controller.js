import crypto from "crypto";
import userModel from "../models/users.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendVerificationEmail } from "../services/mail.service.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await userModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token",
    );
  }
};

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  if (
    [username, email, password].some((field) => !field || field.trim() === "")
  ) {
    throw new ApiError(
      400,
      "All fields (username, email, and password) are required",
    );
  }

  const existedUser = await userModel.findOne({
    email: email.trim().toLowerCase(),
  });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpires = Date.now() + 24 * 3600000;

  const user = await userModel.create({
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    verificationToken,
    verificationTokenExpires,
  });

  const createdUser = await userModel
    .findById(user._id)
    .select(
      "-password -refreshToken -verificationToken -verificationTokenExpires",
    );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const verificationUrl = `${req.protocol}://${req.get("host")}/api/users/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(
    createdUser.email,
    createdUser.username,
    verificationUrl,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdUser,
        "Registration successful! Please check your email to verify your account.",
      ),
    );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await userModel.findOne({
    email: email.trim().toLowerCase(),
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isVerified) {
    throw new ApiError(
      403,
      "Please verify your email address before logging in",
    );
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");
  if (!loggedInUser) {
    throw new ApiError(500, "Something went wrong while logging in the user");
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await userModel
    .findById(req.user._id)
    .select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile retrieved successfully"));
});

export const logout = asyncHandler(async (req, res) => {
  await userModel.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  );

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  const user = await userModel.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully"));
});
