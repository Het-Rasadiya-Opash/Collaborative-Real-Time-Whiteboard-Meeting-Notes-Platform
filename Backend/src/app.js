import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import errorHandler from "./middlewares/error.middleware.js";
export const app = express();

import userRoutes from "./routes/users.route.js";
import workspaceRoutes from "./routes/workspace.route.js";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);

//error handler
app.use(errorHandler);
