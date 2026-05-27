import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/authRole.middleware.js";
import { get, extractActions, updateActionItemStatus, createActionItem } from "../controllers/notes.controller.js";

const router = express.Router();

router.get(
  "/:boardId",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR", "VIEWER"),
  get,
);

router.post(
  "/:boardId/ai-action-items",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  extractActions,
);

router.post(
  "/:boardId/action-items",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  createActionItem,
);

router.patch(
  "/:boardId/ai-action-items/:itemId",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  updateActionItemStatus,
);

export default router;
