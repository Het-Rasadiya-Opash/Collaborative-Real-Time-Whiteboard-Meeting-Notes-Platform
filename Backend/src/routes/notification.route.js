import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  markAllAsRead,
  clearAllNotifications,
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", authMiddleware, getNotifications);
router.put("/read", authMiddleware, markAllAsRead);
router.delete("/", authMiddleware, clearAllNotifications);

export default router;
