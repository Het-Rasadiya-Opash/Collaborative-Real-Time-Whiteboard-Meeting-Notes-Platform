import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import * as Y from "yjs";
import apiRequest from "../utils/apiRequest";
import {
  clearOfflineQueue,
  enqueueOperation,
  getOfflineQueue,
} from "../utils/offlineQueue";

function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (typeof win.getSelection !== "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      const range = win.getSelection().getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  }
  return caretOffset;
}

function setCaretPosition(element, offset) {
  const range = document.createRange();
  const sel = window.getSelection();
  let currentOffset = 0;
  let node = null;

  function traverse(currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      if (currentOffset + currentNode.length >= offset) {
        node = currentNode;
        return true;
      }
      currentOffset += currentNode.length;
    } else {
      for (let i = 0; i < currentNode.childNodes.length; i++) {
        if (traverse(currentNode.childNodes[i])) return true;
      }
    }
    return false;
  }

  traverse(element);

  if (node) {
    try {
      range.setStart(node, offset - currentOffset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {}
  }
}

function syncContentEditableToYText(yText, newText) {
  const oldText = yText.toString();
  if (oldText === newText) return;

  let start = 0;
  while (
    start < oldText.length &&
    start < newText.length &&
    oldText[start] === newText[start]
  ) {
    start++;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  yText.doc.transact(() => {
    if (oldEnd > start) {
      yText.delete(start, oldEnd - start);
    }
    if (newEnd > start) {
      yText.insert(start, newText.slice(start, newEnd));
    }
  });
}

export const useWhiteboardSocket = ({
  board,
  currentUser,
  publicShareToken,
  isReadOnly,
  isEditingTitle,
  isCanvasBusy,
  isCanvasBusyRef,
  editorRef,
}) => {
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [elements, setElements] = useState([]);
  const [agendaText, setAgendaText] = useState("");
  const [comments, setComments] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [snapshots, setSnapshots] = useState([]);

  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const canvasMapRef = useRef(null);
  const notesTextRef = useRef(null);
  const lastCursorEmitRef = useRef(0);
  const autoSaveTimerRef = useRef(null);
  const isTypingNotesRef = useRef(false);
  const notesTypingTimeoutRef = useRef(null);
  const myTypingStatusRef = useRef(false);

  const fetchSnapshots = () => {
    if (publicShareToken) return;
    apiRequest
      .get(`/boards/${board._id}/snapshots`)
      .then((response) => {
        const snaps = response.data?.data || [];
        setSnapshots(snaps);
      })
      .catch(() => {});
  };

  const triggerAutoSave = (updatedElements) => {
    setSaveStatus("unsaved");
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      apiRequest
        .put(
          `/boards/${board._id}`,
          { snapshot: updatedElements },
          { skipSuccessToast: true },
        )
        .then(() => {
          setSaveStatus("saved");
        })
        .catch(() => {
          setSaveStatus("unsaved");
        });
    }, 1500);
  };

  const forceSaveCanvas = async (updatedElements = elements) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaveStatus("saving");
    try {
      await apiRequest.put(
        `/boards/${board._id}`,
        { snapshot: updatedElements },
        { skipSuccessToast: true },
      );
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  };

  useEffect(() => {
    const apiEndpoint =
      import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000/api";
    const socketUrl = apiEndpoint.replace("/api", "");

    const convertToUint8Array = (data) => {
      if (!data) return new Uint8Array(0);
      if (data.type === "Buffer" && Array.isArray(data.data)) {
        return new Uint8Array(data.data);
      }
      if (Array.isArray(data)) {
        return new Uint8Array(data);
      }
      return new Uint8Array(data);
    };

    console.log("Connecting to socket server at:", socketUrl);
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const canvasMap = ydoc.getMap("canvas");
    canvasMapRef.current = canvasMap;

    const notesText = ydoc.getText("notes");
    notesTextRef.current = notesText;

    canvasMap.observe(() => {
      setElements(Array.from(canvasMap.values()));
    });

    notesText.observe((event, transaction) => {
      const newHtml = notesText.toString();
      setAgendaText(newHtml);
      if (editorRef.current) {
        if (document.activeElement === editorRef.current) {
          if (transaction && transaction.local) {
            return;
          }
          const caretOffset = getCaretCharacterOffsetWithin(editorRef.current);
          editorRef.current.innerHTML = newHtml || "";
          setCaretPosition(editorRef.current, caretOffset);
        } else {
          editorRef.current.innerHTML = newHtml || "";
        }
      }
    });

    ydoc.on("update", (update, origin) => {
      if (origin !== "server") {
        if (socket.connected) {
          socket.emit("yjs-update", {
            boardId: board._id,
            update: Array.from(update),
          });
        } else {
          enqueueOperation({
            type: "yjs-update",
            payload: {
              boardId: board._id,
              update: Array.from(update),
            },
          });
        }
      }
    });

    socket.on("connect", async () => {
      console.log("Socket connected successfully!");
      setIsSocketConnected(true);

      socket.emit("join-board", {
        boardId: board._id,
        userId:
          currentUser?._id ||
          `guest_${Math.random().toString(36).substring(2, 6)}`,
        username: currentUser?.username || "Guest Collaborator",
      });

      const queue = await getOfflineQueue();
      if (queue.length > 0) {
        toast.success(`Syncing ${queue.length} offline operations...`);
        for (const op of queue) {
          if (op.type === "yjs-update") {
            socket.emit("yjs-update", op.payload);
          } else if (op.type === "canvas-change") {
            socket.emit("canvas-change", op.payload);
            apiRequest
              .put(
                `/boards/${op.payload.boardId}`,
                { snapshot: op.payload.elements },
                { skipSuccessToast: true },
              )
              .catch(() => {});
          } else if (op.type === "notes-change") {
            socket.emit("notes-change", op.payload);
            apiRequest
              .put(
                `/boards/${op.payload.boardId}`,
                { meetingNotes: op.payload.meetingNotes },
                { skipSuccessToast: true },
              )
              .catch(() => {});
          } else if (op.type === "add-comment") {
            socket.emit("add-comment", op.payload);
          }
        }
        await clearOfflineQueue();
        toast.success("Offline operations synced successfully!");
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected.");
      setIsSocketConnected(false);
    });

    socket.on("yjs-sync", (syncData) => {
      Y.applyUpdate(ydoc, convertToUint8Array(syncData), "server");
    });

    socket.on("yjs-update", (updateData) => {
      Y.applyUpdate(ydoc, convertToUint8Array(updateData), "server");
    });

    socket.on("canvas-update", (updatedElements) => {
      setElements(updatedElements);
    });

    socket.on("notes-update", ({ meetingNotes }) => {
      setAgendaText(meetingNotes || "");
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = meetingNotes || "";
      }
    });

    socket.on("comments-update", ({ comments }) => {
      setComments(comments || []);
    });

    socket.on("cursor-update", ({ userId, username, cursorX, cursorY }) => {
      setCollaborators((prev) => {
        const index = prev.findIndex((c) => c.userId === userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], cursorX, cursorY, username };
          return updated;
        } else {
          return [...prev, { userId, username, cursorX, cursorY }];
        }
      });
    });

    socket.on("selection-update", ({ userId, selectedElementId }) => {
      setCollaborators((prev) => {
        const index = prev.findIndex((c) => c.userId === userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], selectedElementId };
          return updated;
        } else {
          // It's possible we receive selection-update before cursor-update or other events, though unlikely.
          return [...prev, { userId, selectedElementId }];
        }
      });
    });

    socket.on("notes-typing-update", ({ userId, username, isTyping }) => {
      setCollaborators((prev) => {
        const index = prev.findIndex((c) => c.userId === userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            isTypingNotes: isTyping,
            username,
          };
          return updated;
        } else {
          return [...prev, { userId, username, isTypingNotes: isTyping }];
        }
      });
    });

    socket.on("user-joined", ({ userId, username }) => {
      toast.success(`${username} joined the board!`);
    });

    socket.on("user-left", ({ userId, username }) => {
      if (username) {
        toast.success(`${username} left the board.`);
      }
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    });

    socket.on(
      "board-restored",
      ({ elements: restoredElements, meetingNotes, syncData }) => {
        toast.success("The whiteboard was restored to a previous version!");
        setElements(restoredElements);
        if (meetingNotes !== undefined) {
          setAgendaText(meetingNotes || "");
          if (editorRef.current) {
            editorRef.current.innerHTML = meetingNotes || "";
          }
        }
        if (ydoc && syncData) {
          ydoc.transact(() => {
            if (canvasMap) {
              canvasMap.clear();
            }
            if (notesText) {
              notesText.delete(0, notesText.length);
            }
          });
          Y.applyUpdate(ydoc, new Uint8Array(syncData), "server");
        }
      },
    );

    return () => {
      socket.disconnect();
      ydoc.destroy();
    };
  }, [board._id, currentUser]);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = publicShareToken
      ? `/boards/share/${publicShareToken}`
      : `/boards/${board._id}`;
    apiRequest
      .get(fetchUrl)
      .then((response) => {
        if (!isMounted) return;
        const boardData = response.data?.data;
        if (boardData) {
          setBoardTitle(boardData.board?.title || board.title);
          if (boardData.board?.meetingNotes !== undefined) {
            setAgendaText(boardData.board.meetingNotes);
            if (editorRef.current) {
              editorRef.current.innerHTML = boardData.board.meetingNotes || "";
            }
          }
          if (
            boardData.board?.comments &&
            Array.isArray(boardData.board.comments)
          ) {
            setComments(boardData.board.comments);
          }
          const latestSnapshot = boardData.snapshot;
          if (latestSnapshot && Array.isArray(latestSnapshot.canvasJson)) {
            setElements(latestSnapshot.canvasJson);
          } else {
            setElements([]);
          }
        }
      })
      .catch(() => {});

    if (!publicShareToken) {
      fetchSnapshots();
    }

    return () => {
      isMounted = false;
    };
  }, [board._id, publicShareToken]);

  useEffect(() => {
    let isMounted = true;
    const pollInterval = setInterval(() => {
      if (!isMounted) return;
      if (isSocketConnected) return;

      const fetchUrl = publicShareToken
        ? `/boards/share/${publicShareToken}`
        : `/boards/${board._id}`;
      apiRequest
        .get(fetchUrl)
        .then((response) => {
          if (!isMounted) return;
          const boardData = response.data?.data;
          if (boardData) {
            if (!isEditingTitle) {
              setBoardTitle(boardData.board?.title || board.title);
            }
            if (
              !isTypingNotesRef.current &&
              boardData.board?.meetingNotes !== undefined
            ) {
              setAgendaText(boardData.board.meetingNotes);
              if (
                editorRef.current &&
                document.activeElement !== editorRef.current
              ) {
                editorRef.current.innerHTML =
                  boardData.board.meetingNotes || "";
              }
            }
            if (
              boardData.board?.comments &&
              Array.isArray(boardData.board.comments)
            ) {
              setComments(boardData.board.comments);
            }
            const canvasBusy = isCanvasBusyRef
              ? isCanvasBusyRef.current
              : isCanvasBusy;
            if (!canvasBusy) {
              const latestSnapshot = boardData.snapshot;
              if (latestSnapshot && Array.isArray(latestSnapshot.canvasJson)) {
                setElements(latestSnapshot.canvasJson);
              }
            }
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [
    board._id,
    isCanvasBusy,
    isEditingTitle,
    isSocketConnected,
    publicShareToken,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSaveNotes = (text) => {
    if (isReadOnly) return;
    setSaveStatus("saving");

    if (notesTextRef.current) {
      syncContentEditableToYText(notesTextRef.current, text);
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        apiRequest
          .put(
            `/boards/${board._id}`,
            { meetingNotes: text },
            { skipSuccessToast: true },
          )
          .then(() => {
            setSaveStatus("saved");
          })
          .catch(() => {
            setSaveStatus("unsaved");
          });
      } else {
        setSaveStatus("saved");
      }
    }, 1500);

    if (socketRef.current?.connected) {
      socketRef.current.emit("notes-change", {
        boardId: board._id,
        meetingNotes: text,
      });
    } else {
      enqueueOperation({
        type: "notes-change",
        payload: {
          boardId: board._id,
          meetingNotes: text,
        },
      });
      toast("Saved offline. Will sync when reconnected.", {
        icon: "🔌",
        id: "offline-notes-toast",
      });
    }
  };

  const handleNotesTyping = () => {
    if (isReadOnly || !socketRef.current?.connected) return;

    if (!myTypingStatusRef.current) {
      myTypingStatusRef.current = true;
      socketRef.current.emit("notes-typing", {
        boardId: board._id,
        userId: currentUser?._id || `guest_${socketRef.current.id}`,
        username: currentUser?.username || "Guest Collaborator",
        isTyping: true,
      });
    }

    if (notesTypingTimeoutRef.current) {
      clearTimeout(notesTypingTimeoutRef.current);
    }

    notesTypingTimeoutRef.current = setTimeout(() => {
      myTypingStatusRef.current = false;
      if (socketRef.current?.connected) {
        socketRef.current.emit("notes-typing", {
          boardId: board._id,
          userId: currentUser?._id || `guest_${socketRef.current.id}`,
          username: currentUser?.username || "Guest Collaborator",
          isTyping: false,
        });
      }
    }, 2000);
  };

  const handleNotesBlur = () => {
    isTypingNotesRef.current = false;
    if (editorRef.current) {
      handleSaveNotes(editorRef.current.innerHTML);
    }

    if (myTypingStatusRef.current) {
      myTypingStatusRef.current = false;
      if (notesTypingTimeoutRef.current) {
        clearTimeout(notesTypingTimeoutRef.current);
      }
      if (socketRef.current?.connected) {
        socketRef.current.emit("notes-typing", {
          boardId: board._id,
          userId: currentUser?._id || `guest_${socketRef.current.id}`,
          username: currentUser?.username || "Guest Collaborator",
          isTyping: false,
        });
      }
    }
  };

  return {
    boardTitle,
    setBoardTitle,
    elements,
    setElements,
    agendaText,
    setAgendaText,
    comments,
    setComments,
    collaborators,
    setCollaborators,
    isSocketConnected,
    saveStatus,
    setSaveStatus,
    snapshots,
    setSnapshots,
    fetchSnapshots,
    triggerAutoSave,
    forceSaveCanvas,
    handleSaveNotes,
    handleNotesTyping,
    handleNotesBlur,
    socketRef,
    ydocRef,
    canvasMapRef,
    notesTextRef,
    lastCursorEmitRef,
    isTypingNotesRef,
  };
};
