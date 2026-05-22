import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/authRole.middleware.js";
import {
  addMember,
  createWorkSpace,
  listWorkspace,
  removeMember,
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.post("/create", authMiddleware, authorizeRole("OWNER"), createWorkSpace);

router.get("/", authMiddleware, listWorkspace);

router.post("/:id/add", authMiddleware, authorizeRole("OWNER"), addMember);

router.delete(
  "/:id/member/:userId",
  authMiddleware,
  authorizeRole("OWNER"),
  removeMember,
);

export default router;
