import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import * as Y from "yjs";
import boardModel from "./models/board.model.js";

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

const activeDocs = new Map();
app.set("activeDocs", activeDocs);
app.set("io", io);

async function getOrCreateYDoc(boardId) {
  if (activeDocs.has(boardId)) {
    return activeDocs.get(boardId).doc;
  }

  const doc = new Y.Doc();
  activeDocs.set(boardId, { doc, saveTimeout: null });

  try {
    const board = await boardModel.findById(boardId);
    if (board) {
      if (board.yjsState) {
        Y.applyUpdate(doc, new Uint8Array(board.yjsState));
      } else {
        doc.transact(() => {
          const canvasMap = doc.getMap("canvas");
          let legacyElements = [];
          if (board.boardSnapshot && board.boardSnapshot.length > 0) {
            const sortedSnaps = [...board.boardSnapshot].sort(
              (a, b) => b.version - a.version,
            );
            legacyElements = sortedSnaps[0].canvasJson || [];
          }
          legacyElements.forEach((el) => {
            if (el && el.id) {
              canvasMap.set(el.id, el);
            }
          });

          const notesText = doc.getText("notes");
          notesText.insert(0, board.meetingNotes || "");
        });
      }
    }
  } catch (err) {
    console.error("Error loading board Yjs state:", err);
  }

  return doc;
}

function queueSave(boardId, doc) {
  const active = activeDocs.get(boardId);
  if (!active) return;

  if (active.saveTimeout) {
    clearTimeout(active.saveTimeout);
  }

  active.saveTimeout = setTimeout(async () => {
    try {
      const stateUpdate = Y.encodeStateAsUpdate(doc);
      const canvasMap = doc.getMap("canvas");
      const elements = Array.from(canvasMap.values());
      const notesText = doc.getText("notes");
      const meetingNotesText = notesText.toString();

      const board = await boardModel.findById(boardId);
      if (board) {
        board.yjsState = Buffer.from(stateUpdate);
        board.meetingNotes = meetingNotesText;

        const newSnapshot = {
          version: Date.now(),
          canvasJson: elements,
          createdAt: new Date(),
        };

        if (!board.boardSnapshot) {
          board.boardSnapshot = [];
        }

        const oneMinuteAgo = Date.now() - 60000;
        const recentSnapshot = board.boardSnapshot.find(
          (s) => s.version > oneMinuteAgo,
        );

        if (recentSnapshot) {
          recentSnapshot.canvasJson = elements;
        } else {
          board.boardSnapshot.push(newSnapshot);
          if (board.boardSnapshot.length > 5) {
            board.boardSnapshot.sort((a, b) => b.version - a.version);
            board.boardSnapshot = board.boardSnapshot.slice(0, 5);
          }
        }

        await board.save();
        console.log(`Saved Yjs state for board ${boardId} successfully.`);
      }
    } catch (err) {
      console.error("Error saving board Yjs state:", err);
    }
  }, 2000);
}

io.on("connection", (socket) => {
  console.log("A user connected to WebSocket:", socket.id);

  socket.on("join-board", async ({ boardId, userId, username }) => {
    if (!boardId) return;

    socket.join(`board_${boardId}`);
    socket.userId = userId;
    socket.username = username;
    socket.boardId = boardId;

    console.log(`User ${username} (${userId}) joined room board_${boardId}`);

    socket.to(`board_${boardId}`).emit("user-joined", { userId, username });

    const doc = await getOrCreateYDoc(boardId);
    socket.emit("yjs-sync", Buffer.from(Y.encodeStateAsUpdate(doc)));
  });

  socket.on("yjs-update", async ({ boardId, update }) => {
    if (!boardId || !update) return;

    const doc = await getOrCreateYDoc(boardId);
    Y.applyUpdate(doc, new Uint8Array(update));

    socket.to(`board_${boardId}`).emit("yjs-update", update);

    queueSave(boardId, doc);
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
