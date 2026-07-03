import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import errorHandler from "./middlewares/error.middleware.js";
export const app = express();

// Database auto-connection for serverless functions
import connectDB from "./db/db.js";
let isConnected = false;
app.use(async (req, res, next) => {
  if (!isConnected && process.env.DB) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error("Serverless DB connection failed:", err);
    }
  }
  next();
});

// Chained dummy socket object to prevent route crashes in serverless mode
const dummyIo = {
  to: () => dummyIo,
  in: () => dummyIo,
  emit: () => dummyIo,
  except: () => dummyIo,
  sockets: { emit: () => {} }
};
app.set("io", dummyIo);

import boardRoutes from "./routes/board.route.js";
import notesRoutes from "./routes/notes.route.js";
import userRoutes from "./routes/users.route.js";
import workspaceRoutes from "./routes/workspace.route.js";
import notificationRoutes from "./routes/notification.route.js";

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/notifications", notificationRoutes);

//error handler
app.use(errorHandler);

export default app;
