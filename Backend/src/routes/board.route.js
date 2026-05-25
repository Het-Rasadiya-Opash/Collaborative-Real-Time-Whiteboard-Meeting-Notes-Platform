import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createBoard,
  list,
  get,
  toggleStar,
  generateShareLink,
  getPublicBoard,
  restore,
  snapShotList,
  updateBoard,
} from "../controllers/board.controller.js";
import { authorizeRole } from "../middlewares/authRole.middleware.js";

const router = express.Router();

router.post(
  "/:workspaceId/create",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  createBoard,
);
router.get("/workspace/:workspaceId", authMiddleware, list);
router.get("/:id", authMiddleware, get);
router.put("/:id", authMiddleware, updateBoard);
router.post("/:id/star", authMiddleware, toggleStar);
router.post(
  "/:id/share-link",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  generateShareLink,
);
router.get("/share/:token", getPublicBoard);
router.get("/:id/snapshots", authMiddleware, snapShotList);
router.post(
  "/:id/snapshots/:snapId/restore",
  authMiddleware,
  authorizeRole("OWNER", "EDITOR"),
  restore,
);

export default router;
