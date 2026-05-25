import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected to WebSocket:", socket.id);

  socket.on("join-board", ({ boardId, userId, username }) => {
    if (!boardId) return;

    socket.join(`board_${boardId}`);
    socket.userId = userId;
    socket.username = username;
    socket.boardId = boardId;

    console.log(`User ${username} (${userId}) joined room board_${boardId}`);

    socket.to(`board_${boardId}`).emit("user-joined", { userId, username });
  });

  socket.on("canvas-change", ({ boardId, elements }) => {
    if (!boardId) return;
    socket.to(`board_${boardId}`).emit("canvas-update", elements);
  });

  socket.on("cursor-move", ({ boardId, x, y, username, userId }) => {
    if (!boardId) return;
    socket.to(`board_${boardId}`).emit("cursor-update", {
      userId,
      username,
      cursorX: x,
      cursorY: y,
    });
  });

  socket.on("notes-change", ({ boardId, meetingNotes }) => {
    if (!boardId) return;
    socket.to(`board_${boardId}`).emit("notes-update", { meetingNotes });
  });

  socket.on("comments-change", ({ boardId, comments }) => {
    if (!boardId) return;
    socket.to(`board_${boardId}`).emit("comments-update", { comments });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from WebSocket:", socket.id);
    if (socket.boardId && socket.userId) {
      socket.to(`board_${socket.boardId}`).emit("user-left", {
        userId: socket.userId,
        username: socket.username,
      });
    }
  });
});

connectDB()
  .then(() => {
    server.listen(process.env.PORT || 8000, () => {
      console.log(`Server is Running on ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("DB Connection Failed..!", err);
  });
