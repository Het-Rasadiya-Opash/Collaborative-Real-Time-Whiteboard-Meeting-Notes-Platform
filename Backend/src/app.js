import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import errorHandler from "./middlewares/error.middleware.js";
export const app = express();

import boardRoutes from "./routes/board.route.js";
import notesRoutes from "./routes/notes.route.js";
import userRoutes from "./routes/users.route.js";
import workspaceRoutes from "./routes/workspace.route.js";

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

//error handler
app.use(errorHandler);
