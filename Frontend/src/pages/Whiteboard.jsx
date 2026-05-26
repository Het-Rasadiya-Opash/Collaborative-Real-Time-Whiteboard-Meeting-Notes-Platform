import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Pencil,
  MousePointer,
  StickyNote,
  Square,
  Circle,
  Trash2,
  Eraser,
  Share2,
  Download,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  List,
  History,
  Clock,
  Plus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import apiRequest from "../utils/apiRequest";
import { io } from "socket.io-client";
import * as Y from "yjs";
import { Stage, Layer, Rect, Circle as KonvaCircle, Line, Group, Text, Transformer } from "react-konva";

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

const COLOR_PALETTE = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Emerald", hex: "#166534" },
  { name: "Amber", hex: "#b45309" },
  { name: "Red", hex: "#b91c1c" },
  { name: "White", hex: "#ffffff" },
];

const Whiteboard = ({ board, onClose, workspace, isReadOnly: propIsReadOnly, publicShareToken }) => {
  const { currentUser } = useSelector((state) => state.users);

  const myMember = workspace?.members?.find(
    (m) => currentUser?._id && (m.user?._id || m.user) === currentUser?._id,
  );
  const myRole =
    currentUser?._id && (workspace?.owner?._id === currentUser?._id ||
    workspace?.owner === currentUser?._id)
      ? "OWNER"
      : myMember?.role || "VIEWER";
  const isReadOnly = propIsReadOnly !== undefined ? propIsReadOnly : (myRole === "VIEWER");

  const [boardTitle, setBoardTitle] = useState(board.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [elements, setElements] = useState([]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("24");
  const [shareRole, setShareRole] = useState("VIEWER");
  const [activeShareToken, setActiveShareToken] = useState(board.publicShareToken || "");
  const [activeShareExpires, setActiveShareExpires] = useState(board.publicShareExpires || null);
  const [activeShareRole, setActiveShareRole] = useState(board.publicShareRole || "VIEWER");
  const [isPublicLinkActive, setIsPublicLinkActive] = useState(board.isPublic || false);
  const [selectedTool, setSelectedTool] = useState("pencil");
  const [currentColor, setCurrentColor] = useState("#2563eb");
  const [saveStatus, setSaveStatus] = useState("saved");

  const [selectedElementId, setSelectedElementId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [currentDrawingElement, setCurrentDrawingElement] = useState(null);

  const [editingStickyId, setEditingStickyId] = useState(null);
  const [editingStickyText, setEditingStickyText] = useState("");

  const [zoom, setZoom] = useState(85);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [agendaText, setAgendaText] = useState("");

  const [collaborators, setCollaborators] = useState([]);
  const clientCursorRef = useRef({ x: 0, y: 0 });

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const lastCursorEmitRef = useRef(0);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const isTypingNotesRef = useRef(false);
  const notesTypingTimeoutRef = useRef(null);
  const myTypingStatusRef = useRef(false);

  const [snapshots, setSnapshots] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState("notes");
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const fetchSnapshots = () => {
    apiRequest
      .get(`/boards/${board._id}/snapshots`)
      .then((response) => {
        const snaps = response.data?.data || [];
        setSnapshots(snaps);
      })
      .catch(() => {});
  };

  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    if (isCreatingSnapshot) return;
    setIsCreatingSnapshot(true);
    apiRequest
      .post(`/boards/${board._id}/snapshots`, { label: snapshotLabel.trim() })
      .then((response) => {
        const newSnap = response.data?.data;
        if (newSnap) {
          setSnapshots((prev) => [newSnap, ...prev]);
        }
        setIsSnapshotModalOpen(false);
        setSnapshotLabel("");
      })
      .catch(() => {
        toast.error("Failed to create snapshot");
      })
      .finally(() => {
        setIsCreatingSnapshot(false);
      });
  };

  const handleRestoreSnapshot = (snap) => {
    if (isReadOnly) return;
    if (
      window.confirm(
        `Are you sure you want to restore the whiteboard to "${snap.label || "this version"}"? This will modify the board for all active users.`,
      )
    ) {
      apiRequest
        .post(
          `/boards/${board._id}/snapshots/${snap._id}/restore`,
          {},
          { skipSuccessToast: true }
        )
        .then(() => {
          setElements(snap.canvasJson || []);
          setPreviewSnapshot(null);
          fetchSnapshots();
        })
        .catch(() => {
          toast.error("Failed to restore board");
        });
    }
  };

  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const ydocRef = useRef(null);
  const canvasMapRef = useRef(null);
  const notesTextRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const transformerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (selectedElementId && selectedTool === "select" && transformerRef.current) {
      const stage = transformerRef.current.getStage();
      const selectedNode = stage.findOne("#" + selectedElementId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedElementId, selectedTool, elements]);

  const isCanvasBusy =
    isDragging || currentDrawingElement !== null || editingStickyId !== null;

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

    notesText.observe(() => {
      const newHtml = notesText.toString();
      setAgendaText(newHtml);
      if (editorRef.current) {
        if (document.activeElement === editorRef.current) {
          const caretOffset = getCaretCharacterOffsetWithin(editorRef.current);
          editorRef.current.innerHTML = newHtml || "";
          setCaretPosition(editorRef.current, caretOffset);
        } else {
          editorRef.current.innerHTML = newHtml || "";
        }
      }
    });

    ydoc.on("update", (update, origin) => {
      if (origin !== "server" && socket.connected) {
        socket.emit("yjs-update", {
          boardId: board._id,
          update: Array.from(update),
        });
      }
    });

    socket.on("connect", () => {
      console.log("Socket connected successfully!");
      setIsSocketConnected(true);

      socket.emit("join-board", {
        boardId: board._id,
        userId:
          currentUser?._id ||
          `guest_${Math.random().toString(36).substring(2, 6)}`,
        username: currentUser?.username || "Guest Collaborator",
      });
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

    socket.on("notes-typing-update", ({ userId, username, isTyping }) => {
      setCollaborators((prev) => {
        const index = prev.findIndex((c) => c.userId === userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], isTypingNotes: isTyping, username };
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
        setPreviewSnapshot(null);
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
    const fetchUrl = publicShareToken ? `/boards/share/${publicShareToken}` : `/boards/${board._id}`;
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

      const fetchUrl = publicShareToken ? `/boards/share/${publicShareToken}` : `/boards/${board._id}`;
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
            if (!isCanvasBusy) {
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
  }, [board._id, isCanvasBusy, isEditingTitle, isSocketConnected, publicShareToken]);

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
          {
            snapshot: updatedElements,
          },
          {
            skipSuccessToast: true,
          }
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
        {
          snapshot: updatedElements,
        },
        {
          skipSuccessToast: true,
        }
      );
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (!boardTitle.trim() || boardTitle.trim() === board.title) {
      return;
    }

    apiRequest
      .put(`/boards/${board._id}`, { title: boardTitle.trim() })
      .then(() => {})
      .catch(() => {
        setBoardTitle(board.title);
      });
  };

  const handleGenerateShareLink = async () => {
    try {
      const response = await apiRequest.post(
        `/boards/${board._id}/share-link`,
        {
          expiresIn: Number(shareExpiry),
          role: shareRole,
        },
        {
          skipSuccessToast: true,
        }
      );
      
      const data = response.data?.data;
      if (data) {
        setActiveShareToken(data.shareToken);
        setActiveShareExpires(data.expiresAt);
        setActiveShareRole(data.publicShareRole);
        setIsPublicLinkActive(true);
        
        const frontendShareUrl = `${window.location.protocol}//${window.location.host}/board/shared/${data.shareToken}`;
        await navigator.clipboard.writeText(frontendShareUrl);
        toast.success("Share link generated and copied to clipboard!");
      }
    } catch {
      toast.error("Failed to generate share link");
    }
  };

  const handleRevokeShareLink = async () => {
    try {
      await apiRequest.post(
        `/boards/${board._id}/revoke-share`,
        {},
        {
          skipSuccessToast: true,
        }
      );
      setIsPublicLinkActive(false);
      setActiveShareToken("");
      setActiveShareExpires(null);
      toast.success("Public share link revoked successfully");
    } catch {
      toast.error("Failed to revoke share link");
    }
  };

  const getMouseCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const updateElementsAndHistory = (newElements) => {
    setHistory((prev) => [...prev, elements]);
    setRedoStack([]);
    setElements(newElements);
    triggerAutoSave(newElements);

    if (canvasMapRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const currentKeys = new Set(canvasMapRef.current.keys());
        const newIds = new Set(newElements.map((el) => el.id));

        for (const key of currentKeys) {
          if (!newIds.has(key)) {
            canvasMapRef.current.delete(key);
          }
        }

        newElements.forEach((el) => {
          if (el && el.id) {
            const existing = canvasMapRef.current.get(el.id);
            if (JSON.stringify(existing) !== JSON.stringify(el)) {
              canvasMapRef.current.set(el.id, el);
            }
          }
        });
      });
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("canvas-change", {
        boardId: board._id,
        elements: newElements,
      });
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, elements]);
    setElements(previous);
    triggerAutoSave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, elements]);
    setElements(next);
    triggerAutoSave(next);
  };

  const getStageMouseCoords = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const scale = zoom / 100;
    return {
      x: pos.x / scale,
      y: pos.y / scale,
    };
  };

  const handleStageMouseDown = (e) => {
    if (isReadOnly || previewSnapshot) return;
    if (editingStickyId) {
      finishStickyEditing();
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage() || e.target.id() === "stage-background";
    if (clickedOnEmpty) {
      setSelectedElementId(null);
    }

    if (selectedTool !== "select") {
      const { x, y } = getStageMouseCoords(e);
      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      if (selectedTool === "pencil") {
        const newStroke = {
          id,
          type: "stroke",
          points: [{ x, y }],
          color: currentColor,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newStroke);
      } else if (selectedTool === "rectangle") {
        const newRect = {
          id,
          type: "rectangle",
          x,
          y,
          width: 0,
          height: 0,
          color: currentColor,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newRect);
      } else if (selectedTool === "circle") {
        const newCircle = {
          id,
          type: "circle",
          cx: x,
          cy: y,
          r: 0,
          color: currentColor,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newCircle);
      } else if (selectedTool === "sticky") {
        const newSticky = {
          id,
          type: "sticky",
          x: x - 80,
          y: y - 80,
          width: 160,
          height: 160,
          text: "Double-click to edit note",
          color: currentColor === "#eff4ff" ? "#fef08a" : currentColor,
        };
        const newElements = [...elements, newSticky];
        updateElementsAndHistory(newElements);
        setSelectedTool("select");
        setSelectedElementId(id);
        setIsDragging(false);
      }
    }
  };

  const handleStageMouseMove = (e) => {
    if (previewSnapshot) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (pos && socketRef.current?.connected) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40) {
        const scale = zoom / 100;
        socketRef.current.emit("cursor-move", {
          boardId: board._id,
          x: pos.x / scale,
          y: pos.y / scale,
          userId:
            currentUser?._id ||
            `guest_${Math.random().toString(36).substring(2, 6)}`,
          username: currentUser?.username || "Guest Collaborator",
        });
        lastCursorEmitRef.current = now;
      }
    }

    if (!isDragging) return;

    if (currentDrawingElement) {
      const { x, y } = getStageMouseCoords(e);
      const updated = { ...currentDrawingElement };
      if (updated.type === "stroke") {
        updated.points = [...updated.points, { x, y }];
      } else if (updated.type === "rectangle") {
        updated.width = Math.max(0, x - updated.x);
        updated.height = Math.max(0, y - updated.y);
      } else if (updated.type === "circle") {
        const dx = x - updated.cx;
        const dy = y - updated.cy;
        updated.r = Math.sqrt(dx * dx + dy * dy);
      }
      setCurrentDrawingElement(updated);
    }
  };

  const handleStageMouseUp = () => {
    if (previewSnapshot) return;
    setIsDragging(false);

    if (currentDrawingElement) {
      const newElements = [...elements, currentDrawingElement];
      updateElementsAndHistory(newElements);
      setCurrentDrawingElement(null);
    }
  };

  const handleShapeSelect = (e, id) => {
    if (selectedTool !== "select" || isReadOnly || previewSnapshot) return;
    e.cancelBubble = true;
    setSelectedElementId(id);
  };

  const handleTransformEnd = (e) => {
    if (isReadOnly || previewSnapshot) return;
    const node = e.target;
    const id = node.id();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const updated = elements.map((el) => {
      if (el.id === id) {
        if (el.type === "rectangle" || el.type === "sticky") {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, el.width * scaleX),
            height: Math.max(5, el.height * scaleY),
          };
        } else if (el.type === "circle") {
          return {
            ...el,
            cx: node.x(),
            cy: node.y(),
            r: Math.max(5, el.r * Math.max(scaleX, scaleY)),
          };
        }
      }
      return el;
    });

    updateElementsAndHistory(updated);
  };

  const handleDragMove = (e) => {
    if (isReadOnly || previewSnapshot) return;
    const node = e.target;
    const id = node.id();

    setElements((prevElements) => {
      let movedEl = null;
      const updated = prevElements.map((el) => {
        if (el.id !== id) return el;
        if (el.type === "rectangle" || el.type === "sticky") {
          movedEl = { ...el, x: node.x(), y: node.y() };
          return movedEl;
        } else if (el.type === "circle") {
          movedEl = { ...el, cx: node.x(), cy: node.y() };
          return movedEl;
        } else if (el.type === "stroke") {
          const dx = node.x();
          const dy = node.y();
          node.x(0);
          node.y(0);
          const newPoints = el.points.map((pt) => ({
            x: pt.x + dx,
            y: pt.y + dy,
          }));
          movedEl = { ...el, points: newPoints };
          return movedEl;
        }
        return el;
      });

      if (movedEl && canvasMapRef.current) {
        canvasMapRef.current.set(movedEl.id, movedEl);
      }

      triggerAutoSave(updated);

      if (socketRef.current?.connected) {
        socketRef.current.emit("canvas-change", {
          boardId: board._id,
          elements: updated,
        });
      }

      return updated;
    });
  };

  const handleDoubleClickSticky = (e, element) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (element.type === "sticky") {
      setEditingStickyId(element.id);
      setEditingStickyText(
        element.text === "Double-click to edit note" ? "" : element.text,
      );
    }
  };

  const finishStickyEditing = () => {
    if (!editingStickyId) return;

    const updated = elements.map((el) => {
      if (el.id === editingStickyId) {
        return {
          ...el,
          text: editingStickyText.trim() || "Sticky note text",
        };
      }
      return el;
    });

    updateElementsAndHistory(updated);
    setEditingStickyId(null);
    setEditingStickyText("");
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter((el) => el.id !== selectedElementId);
    updateElementsAndHistory(updated);
    setSelectedElementId(null);
    toast.success("Element deleted");
  };

  const handleClearCanvas = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire whiteboard canvas?",
      )
    ) {
      updateElementsAndHistory([]);
      setSelectedElementId(null);
      toast.success("Canvas cleared");
    }
  };

  const handleExportPNG = async () => {
    if (saveStatus !== "saved") {
      try {
        await forceSaveCanvas(elements);
      } catch (err) {
        console.warn("Failed to auto-save before export:", err);
      }
    }
    const loadingToast = toast.loading("Generating board PNG on the server...");
    try {
      const response = await apiRequest.get(`/boards/${board._id}/export/png`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${boardTitle.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("Board exported as PNG successfully!");
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export board as PNG.");
    }
  };

  const handleExportPDF = async () => {
    if (saveStatus !== "saved") {
      try {
        await forceSaveCanvas(elements);
      } catch (err) {
        console.warn("Failed to auto-save before export:", err);
      }
    }
    const loadingToast = toast.loading(
      "Generating meeting summary PDF on the server...",
    );
    try {
      const response = await apiRequest.get(`/boards/${board._id}/export/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${boardTitle.replace(/\s+/g, "_")}_meeting_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("Meeting summary exported as PDF successfully!");
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export meeting summary as PDF.");
    }
  };

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
            {
              meetingNotes: text,
            },
            {
              skipSuccessToast: true,
            }
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

  const handleFormatCommand = (command, value = null) => {
    if (isReadOnly) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setAgendaText(html);
      handleSaveNotes(html);
    }
  };

  const toggleNotes = () => {
    setIsNotesOpen(!isNotesOpen);
  };

  const displayedElements = previewSnapshot
    ? previewSnapshot.canvasJson || []
    : elements;

  const typingCollaborators = collaborators.filter(
    (c) => c.isTypingNotes && c.userId !== currentUser?._id
  );

  return (
    <div className="fixed inset-0 w-full h-full flex z-50 bg-background text-on-background font-sans overflow-hidden select-none animate-in fade-in duration-200 whiteboard-root">
      <style>{`
        .whiteboard-root {
          --color-primary: #2563eb;
          --color-on-primary: #ffffff;
          --color-primary-container: #2563eb;
          --color-background: #f8fafc;
          --color-on-background: #1e293b;
          --color-surface: #ffffff;
          --color-surface-bright: #ffffff;
          --color-surface-dim: #e2e8f0;
          --color-surface-container-lowest: #ffffff;
          --color-surface-container-low: #f8fafc;
          --color-surface-container: #f1f5f9;
          --color-surface-container-high: #e2e8f0;
          --color-surface-container-highest: #cbd5e1;
          --color-surface-glass: rgba(255, 255, 255, 0.85);
          --color-outline: #94a3b8;
          --color-outline-variant: #e2e8f0;
          --color-on-surface: #1e293b;
          --color-on-surface-variant: #475569;
          --color-secondary: #7c3aed;
          --color-secondary-container: #f1f5f9;
          --color-on-secondary-container: #1e293b;
          --color-success-emerald: #166534;
          --color-active-indicator: #2563eb;
          --color-primary-fixed: #dbeafe;
          --color-on-primary-fixed: #1e3a8a;
        }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .canvas-dot-grid {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .cursor-smooth {
          transition: all 0.15s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .sidebar-transition {
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rich-text-editor:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          opacity: 0.65;
          pointer-events: none;
        }
        .rich-text-editor ul {
          list-style-type: disc !important;
          padding-left: 1.25rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
        }
        .rich-text-editor ol {
          list-style-type: decimal !important;
          padding-left: 1.25rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
        }
        .rich-text-editor p {
          margin-bottom: 0.25rem !important;
        }
      `}</style>

      <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest border-r border-outline-variant shadow-sm z-50 flex flex-col py-8">
        <div className="px-6 mb-8 flex flex-col gap-1">
          <span className="font-headline-md text-xl font-bold text-primary">
            Workspace
          </span>
          <span className="text-xs text-on-surface-variant opacity-70">
            Enterprise Plan
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <a
            onClick={onClose}
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md">Dashboards</span>
          </a>
          <a className="flex items-center gap-3 bg-surface-container text-primary border-l-4 border-active-indicator py-3 px-4 rounded-r-lg cursor-pointer">
            <span className="material-symbols-outlined">draw</span>
            <span className="font-body-md font-semibold">Boards</span>
          </a>
          <a
            onClick={onClose}
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-body-md">Notes</span>
          </a>
          <a
            onClick={onClose}
            className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md">Settings</span>
          </a>
        </nav>
        <div className="px-4 mt-auto">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-4 rounded-xl shadow-md hover:bg-primary-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-body-md">Close Board</span>
          </button>
        </div>
      </aside>

      <main className="ml-[260px] flex-1 flex flex-col relative overflow-hidden">
        <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-surface-glass backdrop-blur-md border-b border-outline-variant z-40 flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <h1 className="font-headline-md text-lg font-black text-primary flex items-center gap-2 select-text">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  className="bg-surface-container-low border border-primary/40 rounded-lg px-3 py-1 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[240px]"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => !isReadOnly && setIsEditingTitle(true)}
                  className={!isReadOnly ? "cursor-pointer hover:underline decoration-dashed decoration-primary decoration-2 underline-offset-4" : ""}
                  title={!isReadOnly ? "Click to rename board" : ""}
                >
                  Board: {boardTitle}
                </span>
              )}
            </h1>
            <div className="flex -space-x-2 ml-4">
              {(workspace?.members || []).slice(0, 3).map((member, mIdx) => {
                const username = member.user?.username || "?";
                const firstChar = username.charAt(0).toUpperCase();
                const colors = [
                  "bg-brand-100 text-primary border-white",
                  "bg-purple-100 text-purple-700 border-white",
                  "bg-amber-100 text-amber-700 border-white",
                  "bg-emerald-100 text-emerald-700 border-white",
                ];
                const colorClass = colors[mIdx % colors.length];
                return (
                  <div
                    key={member._id || mIdx}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${colorClass}`}
                    title={username}
                  >
                    {firstChar}
                  </div>
                );
              })}
              {(workspace?.members || []).length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary">
                  +{(workspace?.members || []).length - 3}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-success-emerald bg-success-emerald/10 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <span className="material-symbols-outlined text-[14px]">
                    check_circle
                  </span>
                  Saved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <AlertTriangle size={14} />
                  Unsaved
                </span>
              )}
            </div>
            <div className="h-8 w-[1px] bg-outline-variant mx-1"></div>
            <div className="flex items-center gap-2">
              {!publicShareToken && (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all text-xs font-bold text-primary active:scale-95 cursor-pointer"
                >
                  <Share2 size={16} />
                  <span className="font-label-md text-label-md uppercase tracking-wider">
                    Share
                  </span>
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all text-xs font-bold text-on-surface-variant active:scale-95 cursor-pointer"
                >
                  <Download size={16} />
                  <span className="font-label-md text-label-md uppercase tracking-wider">
                    Export
                  </span>
                  <span className="material-symbols-outlined text-[16px]">
                    keyboard_arrow_down
                  </span>
                </button>
                {isExportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant/40 mb-1">
                      Export Options
                    </div>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportPNG();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        image
                      </span>
                      <div className="flex flex-col">
                        <span>Export Board (PNG)</span>
                        <span className="text-[9px] text-outline font-medium normal-case">
                          Server-rendered whiteboard image
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportPDF();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        picture_as_pdf
                      </span>
                      <div className="flex flex-col">
                        <span>Export Notes (PDF)</span>
                        <span className="text-[9px] text-outline font-medium normal-case">
                          Server-generated meeting summary
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-16 flex-1 bg-surface-bright relative canvas-dot-grid overflow-hidden flex">
          <div className="flex-1 relative cursor-crosshair">
            {previewSnapshot && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-white font-sans px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-6 animate-in slide-in-from-top duration-300 backdrop-blur-md border border-amber-400/40">
                <div className="flex items-center gap-2.5">
                  <Clock size={20} className="animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                      Previewing Past Version
                    </span>
                    <span className="text-sm font-black truncate max-w-[280px]">
                      {previewSnapshot.label ||
                        `Version - ${new Date(previewSnapshot.createdAt || previewSnapshot.version).toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRestoreSnapshot(previewSnapshot)}
                      className="bg-white text-amber-700 hover:bg-amber-50 transition-all font-bold text-xs px-4 py-2 rounded-xl active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-200"
                    >
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        restore
                      </span>
                      Restore This Version
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewSnapshot(null)}
                    className="bg-white/10 hover:bg-white/20 transition-all font-bold text-xs px-4 py-2 rounded-xl active:scale-95 cursor-pointer flex items-center gap-1.5 border border-white/20"
                  >
                    Exit Preview
                  </button>
                </div>
              </div>
            )}
            {!isReadOnly ? (
              <div className="absolute left-6 top-1/2 -translate-y-1/2 glass-card border border-outline-variant rounded-2xl p-2 shadow-lg flex flex-col gap-2 z-30 animate-in slide-in-from-left duration-300">
                <button
                  onClick={() => {
                    setSelectedTool("pencil");
                    setSelectedElementId(null);
                  }}
                  className={`p-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                    selectedTool === "pencil"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title="Pen Tool"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={() => {
                    setSelectedTool("select");
                  }}
                  className={`p-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                    selectedTool === "select"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title="Select"
                >
                  <MousePointer size={20} />
                </button>
                <button
                  onClick={() => {
                    setSelectedTool("sticky");
                    setSelectedElementId(null);
                  }}
                  className={`p-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                    selectedTool === "sticky"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title="Sticky Note"
                >
                  <StickyNote size={20} />
                </button>
                <button
                  onClick={() => {
                    setSelectedTool("rectangle");
                    setSelectedElementId(null);
                  }}
                  className={`p-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                    selectedTool === "rectangle"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title="Rectangle Shape"
                >
                  <Square size={20} />
                </button>
                <button
                  onClick={() => {
                    setSelectedTool("circle");
                    setSelectedElementId(null);
                  }}
                  className={`p-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                    selectedTool === "circle"
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                  title="Circle Shape"
                >
                  <Circle size={20} />
                </button>

                <div className="h-[1px] bg-outline-variant mx-1 my-1"></div>

                <div className="grid grid-cols-2 gap-1.5 justify-items-center py-1">
                  {COLOR_PALETTE.map((color) => {
                    const isSelected = currentColor === color.hex;
                    return (
                      <button
                        key={color.hex}
                        onClick={() => setCurrentColor(color.hex)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
                          isSelected
                            ? "scale-110 border-primary shadow-md ring-2 ring-primary/20"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={`${color.name} Color`}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="h-[1px] bg-outline-variant mx-1 my-1"></div>

                <button
                  onClick={handleDeleteSelected}
                  disabled={!selectedElementId}
                  className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                    selectedElementId
                      ? "text-rose-500 hover:bg-rose-500/10 hover:scale-105 active:scale-95 cursor-pointer"
                      : "text-on-surface-variant/30 cursor-not-allowed"
                  }`}
                  title="Delete Selected"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={handleClearCanvas}
                  className="p-3 text-on-surface-variant hover:bg-rose-500/10 hover:scale-105 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  title="Clear Canvas"
                >
                  <Eraser size={20} />
                </button>
              </div>
            ) : (
              <div className="absolute left-6 top-6 glass-card border border-outline-variant/60 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 z-30 animate-in slide-in-from-left duration-300 text-xs font-bold text-on-surface-variant bg-surface-container-high/90">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  lock
                </span>
                <span>Viewer (Read-Only)</span>
              </div>
            )}

            <div ref={canvasRef} className="w-full h-full relative overflow-hidden" style={{ pointerEvents: "all" }}>
              <Stage
                width={dimensions.width}
                height={dimensions.height}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onMouseLeave={handleStageMouseUp}
                onTouchStart={handleStageMouseDown}
                onTouchMove={handleStageMouseMove}
                onTouchEnd={handleStageMouseUp}
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
              >
                <Layer>
                  <Rect
                    id="stage-background"
                    x={0}
                    y={0}
                    width={dimensions.width * 4}
                    height={dimensions.height * 4}
                    fill="transparent"
                  />
                </Layer>
                <Layer scaleX={zoom / 100} scaleY={zoom / 100}>
                  {displayedElements.map((el) => {
                    const isSelected = el.id === selectedElementId;

                    if (el.type === "stroke") {
                      return (
                        <Line
                          key={el.id}
                          id={el.id}
                          points={el.points.flatMap((p) => [p.x, p.y])}
                          stroke={el.color}
                          strokeWidth={el.strokeWidth || 4}
                          lineCap="round"
                          lineJoin="round"
                          opacity={0.8}
                          draggable={selectedTool === "select" && !isReadOnly}
                          onClick={(e) => handleShapeSelect(e, el.id)}
                          onTap={(e) => handleShapeSelect(e, el.id)}
                          onDragMove={handleDragMove}
                        />
                      );
                    }

                    if (el.type === "rectangle") {
                      return (
                        <Rect
                          key={el.id}
                          id={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          fill="transparent"
                          stroke={el.color}
                          strokeWidth={3}
                          draggable={selectedTool === "select" && !isReadOnly}
                          onClick={(e) => handleShapeSelect(e, el.id)}
                          onTap={(e) => handleShapeSelect(e, el.id)}
                          onDragMove={handleDragMove}
                          onTransformEnd={handleTransformEnd}
                        />
                      );
                    }

                    if (el.type === "circle") {
                      return (
                        <KonvaCircle
                          key={el.id}
                          id={el.id}
                          x={el.cx}
                          y={el.cy}
                          radius={el.r}
                          fill="transparent"
                          stroke={el.color}
                          strokeWidth={3}
                          draggable={selectedTool === "select" && !isReadOnly}
                          onClick={(e) => handleShapeSelect(e, el.id)}
                          onTap={(e) => handleShapeSelect(e, el.id)}
                          onDragMove={handleDragMove}
                          onTransformEnd={handleTransformEnd}
                        />
                      );
                    }

                    if (el.type === "sticky") {
                      return (
                        <Group
                          key={el.id}
                          id={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          draggable={selectedTool === "select" && !isReadOnly}
                          onClick={(e) => handleShapeSelect(e, el.id)}
                          onTap={(e) => handleShapeSelect(e, el.id)}
                          onDblClick={(e) => handleDoubleClickSticky(e, el)}
                          onDblTap={(e) => handleDoubleClickSticky(e, el)}
                          onDragMove={handleDragMove}
                          onTransformEnd={handleTransformEnd}
                        >
                          <Rect
                            width={el.width}
                            height={el.height}
                            fill={el.color === "#eff4ff" ? "#fef08a" : el.color}
                            stroke={isSelected ? "#2563eb" : "#e2e8f0"}
                            strokeWidth={isSelected ? 2 : 1}
                            cornerRadius={12}
                            shadowColor="#0f172a"
                            shadowBlur={10}
                            shadowOpacity={0.15}
                            shadowOffset={{ x: 0, y: 4 }}
                          />
                          <Text
                            x={12}
                            y={12}
                            text={el.color === "#fef08a" || el.color === "#eff4ff" ? "STICKY NOTE" : "IDEA"}
                            fontSize={9}
                            fontFamily="sans-serif"
                            fontWeight="bold"
                            fill="#64748b"
                            letterSpacing={0.5}
                          />
                          {editingStickyId !== el.id && (
                            <Text
                              x={12}
                              y={28}
                              width={el.width - 24}
                              height={el.height - 40}
                              text={el.text}
                              fontSize={13}
                              fontFamily="sans-serif"
                              fontWeight="bold"
                              fill="#1e293b"
                              align="center"
                              verticalAlign="middle"
                              wrap="char"
                            />
                          )}
                        </Group>
                      );
                    }

                    return null;
                  })}

                  {currentDrawingElement && (
                    <Group>
                      {currentDrawingElement.type === "stroke" && (
                        <Line
                          points={currentDrawingElement.points.flatMap((p) => [p.x, p.y])}
                          stroke={currentDrawingElement.color}
                          strokeWidth={4}
                          lineCap="round"
                          lineJoin="round"
                          opacity={0.8}
                        />
                      )}
                      {currentDrawingElement.type === "rectangle" && (
                        <Rect
                          x={currentDrawingElement.x}
                          y={currentDrawingElement.y}
                          width={currentDrawingElement.width}
                          height={currentDrawingElement.height}
                          fill="transparent"
                          stroke={currentDrawingElement.color}
                          strokeWidth={3}
                          dash={[5, 3]}
                          opacity={0.8}
                        />
                      )}
                      {currentDrawingElement.type === "circle" && (
                        <KonvaCircle
                          x={currentDrawingElement.cx}
                          y={currentDrawingElement.cy}
                          radius={currentDrawingElement.r}
                          fill="transparent"
                          stroke={currentDrawingElement.color}
                          strokeWidth={3}
                          dash={[5, 3]}
                          opacity={0.8}
                        />
                      )}
                    </Group>
                  )}

                  {selectedTool === "select" && !isReadOnly && (
                    <Transformer
                      ref={transformerRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                          return oldBox;
                        }
                        return newBox;
                      }}
                      rotateEnabled={false}
                    />
                  )}
                </Layer>
              </Stage>

              {editingStickyId && (
                (() => {
                  const el = elements.find(item => item.id === editingStickyId);
                  if (!el) return null;
                  const scale = zoom / 100;
                  return (
                    <textarea
                      value={editingStickyText}
                      onChange={(e) => setEditingStickyText(e.target.value)}
                      onBlur={finishStickyEditing}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          finishStickyEditing();
                        }
                      }}
                      style={{
                        position: "absolute",
                        left: `${el.x * scale}px`,
                        top: `${el.y * scale}px`,
                        width: `${el.width * scale}px`,
                        height: `${el.height * scale}px`,
                        backgroundColor: el.color === "#eff4ff" ? "#fef08a" : el.color,
                        fontSize: `${13 * scale}px`,
                        zIndex: 100,
                        border: "2px solid #2563eb",
                        borderRadius: "12px",
                        resize: "none",
                        padding: `${16 * scale}px`,
                        boxSizing: "border-box",
                        outline: "none",
                        textAlign: "center",
                        fontFamily: "sans-serif",
                        fontWeight: "bold",
                        color: "#1e293b",
                        overflow: "hidden"
                      }}
                      autoFocus
                    />
                  );
                })()
              )}
            </div>

            {collaborators.map((collab, index) => {
              const colors = [
                "#7c3aed",
                "#166534",
                "#b45309",
                "#b91c1c",
                "#2563eb",
              ];
              const cursorColor = colors[index % colors.length];
              const scale = zoom / 100;
              const leftPos = collab.cursorX * scale;
              const topPos = collab.cursorY * scale;
              return (
                <div
                  key={collab.userId || index}
                  style={{ left: `${leftPos}px`, top: `${topPos}px` }}
                  className="absolute cursor-smooth pointer-events-none flex items-center gap-2 z-40"
                >
                  <svg
                    fill="none"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.65376 12.3822L17.7026 21.6111L14.7735 5.5186L5.65376 12.3822Z"
                      fill={cursorColor}
                      stroke="white"
                      strokeWidth="2"
                    ></path>
                  </svg>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap text-white"
                    style={{ backgroundColor: cursorColor }}
                  >
                    {collab.username || "Collaborator"}
                    {collab.isTyping ? " is typing..." : ""}
                  </span>
                </div>
              );
            })}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-card border border-outline-variant rounded-full px-4 py-2 shadow-md flex items-center gap-4 z-30 animate-in fade-in slide-in-from-bottom duration-300">
              <button
                onClick={() => setZoom(Math.max(25, zoom - 10))}
                className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="font-body-md font-bold text-on-surface-variant w-12 text-center select-none text-xs">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>

              <div className="w-[1px] h-4 bg-outline-variant"></div>

              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`p-1 transition-all flex items-center justify-center ${
                  history.length > 0
                    ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
                    : "text-outline/35 cursor-not-allowed"
                }`}
                title="Undo"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`p-1 transition-all flex items-center justify-center ${
                  redoStack.length > 0
                    ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
                    : "text-outline/35 cursor-not-allowed"
                }`}
                title="Redo"
              >
                <Redo2 size={18} />
              </button>
            </div>
          </div>

          <section
            className={`bg-surface-container-lowest border-l border-outline-variant flex flex-col sidebar-transition z-30 ${
              isNotesOpen
                ? "w-[380px] opacity-100"
                : "w-0 opacity-0 overflow-hidden pointer-events-none"
            }`}
            id="notes-panel"
          >
            <div className="border-b border-outline-variant flex flex-col">
              <div className="p-4 px-6 flex justify-between items-center border-b border-outline-variant/40">
                <h2 className="font-headline-md text-lg font-black text-on-surface tracking-tight">
                  Board Workspace
                </h2>
                <button
                  onClick={toggleNotes}
                  className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined block text-[20px]">
                    keyboard_double_arrow_right
                  </span>
                </button>
              </div>
              <div className="flex w-full bg-surface-container-low p-1">
                <button
                  onClick={() => setActiveRightTab("notes")}
                  className={`flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
                    activeRightTab === "notes"
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-white/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    description
                  </span>
                  Notes
                </button>
                <button
                  onClick={() => {
                    setActiveRightTab("history");
                    fetchSnapshots();
                  }}
                  className={`flex-1 py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
                    activeRightTab === "history"
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-white/40"
                  }`}
                >
                  <History size={16} />
                  History
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeRightTab === "notes" ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                        Active Editors
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(workspace?.members || []).map((member, mIdx) => {
                        const username = member.user?.username || "?";
                        const initials = username.slice(0, 2).toUpperCase();
                        const colors = [
                          "ring-primary text-primary",
                          "ring-secondary text-secondary",
                          "ring-success-emerald text-success-emerald",
                          "ring-amber-500 text-amber-500",
                        ];
                        const ringColorClass = colors[mIdx % colors.length];

                        const isOnline = (currentUser?._id && (member.user?._id === currentUser?._id || member.user === currentUser?._id)) ||
                          collaborators.some(
                            (collab) => collab.userId === member.user?._id || (member.user && collab.userId === member.user)
                          );

                        const typingCollab = collaborators.find(
                          (collab) => collab.userId === member.user?._id || (member.user && collab.userId === member.user)
                        );
                        const isTyping = typingCollab?.isTypingNotes;

                        return (
                          <div
                            key={member._id || mIdx}
                            className={`w-8 h-8 rounded-full ring-2 ${ringColorClass} bg-surface-variant flex items-center justify-center font-bold text-[10px] relative transition-transform duration-200 ${isTyping ? 'animate-bounce shadow-md' : ''}`}
                            title={`${username} ${isOnline ? '(Online)' : '(Offline)'} ${isTyping ? '- Typing notes...' : ''}`}
                          >
                            {initials}
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-green-500" />
                            )}
                            {isTyping && (
                              <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm animate-pulse">
                                <Pencil size={8} />
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {collaborators.filter(
                        (collab) =>
                          collab.userId !== currentUser?._id &&
                          !(workspace?.members || []).some(
                            (m) => m.user?._id === collab.userId || m.user === collab.userId
                          )
                      ).map((collab, gIdx) => {
                        const initials = (collab.username || "Guest").slice(0, 2).toUpperCase();
                        const isGuestTyping = collab.isTypingNotes;
                        return (
                          <div
                            key={collab.userId || gIdx}
                            className={`w-8 h-8 rounded-full ring-2 ring-dashed ring-outline bg-surface-container flex items-center justify-center font-bold text-[10px] relative text-outline transition-transform duration-200 ${isGuestTyping ? 'animate-bounce shadow-md' : ''}`}
                            title={`${collab.username || "Guest"} (Guest - Online) ${isGuestTyping ? '- Typing notes...' : ''}`}
                          >
                            {initials}
                            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-green-500" />
                            {isGuestTyping && (
                              <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm animate-pulse">
                                <Pencil size={8} />
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {(workspace?.members || []).length === 0 && collaborators.length === 0 && (
                        <div className="text-xs text-on-surface-variant opacity-60">
                          No active editors
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface-bright rounded-xl border border-outline-variant p-4 min-h-[360px] shadow-sm relative flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline-md text-primary font-bold text-sm">
                        Collaborative Notes
                      </h3>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1 bg-surface-container/60 p-1 rounded-lg border border-outline-variant/50">
                          <button
                            onClick={() => handleFormatCommand("bold")}
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-on-surface-variant transition-colors cursor-pointer"
                            title="Bold"
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            onClick={() => handleFormatCommand("italic")}
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-on-surface-variant transition-colors cursor-pointer"
                            title="Italic"
                          >
                            <Italic size={14} />
                          </button>
                          <button
                            onClick={() => handleFormatCommand("underline")}
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-on-surface-variant transition-colors cursor-pointer"
                            title="Underline"
                          >
                            <Underline size={14} />
                          </button>
                          <div className="w-[1px] h-3 bg-outline-variant/60 mx-0.5"></div>
                          <button
                            onClick={() =>
                              handleFormatCommand("insertUnorderedList")
                            }
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-on-surface-variant transition-colors cursor-pointer"
                            title="Bullet List"
                          >
                            <List size={14} />
                          </button>
                          <button
                            onClick={() => handleFormatCommand("removeFormat")}
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-on-surface-variant transition-colors cursor-pointer"
                            title="Clear Formatting"
                          >
                            <span className="material-symbols-outlined text-[14px] font-bold block">
                              format_clear
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden min-h-[220px]">
                      <div
                        ref={editorRef}
                        contentEditable={!isReadOnly}
                        onFocus={() => {
                          isTypingNotesRef.current = true;
                        }}
                        onBlur={handleNotesBlur}
                        onInput={(e) => {
                          const html = e.currentTarget.innerHTML;
                          setAgendaText(html);
                          handleSaveNotes(html);
                          handleNotesTyping();
                        }}
                        className="w-full flex-1 bg-transparent text-on-surface-variant leading-relaxed outline-none overflow-y-auto text-xs rich-text-editor font-sans"
                        placeholder={
                          isReadOnly
                            ? "Notes are read-only for viewer role..."
                            : "Type meeting agenda or collaborate on notes here..."
                        }
                      />
                      
                      {typingCollaborators.length > 0 && (
                        <div className="flex items-center gap-2 text-primary bg-primary/5 border border-primary/10 rounded-xl px-3.5 py-2 animate-pulse mt-2 select-none self-start">
                          <div className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce animate-duration-1000" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce animate-duration-1000" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce animate-duration-1000" style={{ animationDelay: '300ms' }}></span>
                          </div>
                          <span className="text-[11px] font-bold tracking-wide">
                            {typingCollaborators.map((c) => c.username || "Collaborator").join(", ")}{" "}
                            {typingCollaborators.length === 1 ? "is typing notes..." : "are typing notes..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                        Recent Comments
                      </span>
                    </div>
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {comments.map((comment, index) => (
                        <div
                          key={comment._id || comment.id || index}
                          className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30 text-xs"
                        >
                          <div className="flex justify-between items-center mb-1 font-bold text-primary">
                            <span>{comment.author}</span>
                            <span className="text-[10px] font-normal text-on-surface-variant opacity-60 font-sans">
                              {comment.createdAt
                                ? new Date(
                                    comment.createdAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Just now"}
                            </span>
                          </div>
                          <p className="text-on-surface-variant">
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card border border-outline-variant rounded-xl p-4">
                    <h4 className="font-label-md text-xs font-bold text-outline mb-3 uppercase tracking-wider">
                      Export Options
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleExportPNG}
                        className="flex items-center justify-center gap-2 p-2 bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors text-xs font-bold text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          image
                        </span>
                        <span className="font-body-md">PNG</span>
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center justify-center gap-2 p-2 bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors text-xs font-bold text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          picture_as_pdf
                        </span>
                        <span className="font-body-md">PDF</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 flex flex-col h-full overflow-hidden">
                  {!isReadOnly && (
                    <button
                      onClick={() => setIsSnapshotModalOpen(true)}
                      className="w-full bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md"
                    >
                      <Plus size={16} />
                      Save Current Version
                    </button>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                        Saved Versions ({snapshots.length})
                      </span>
                    </div>

                    {snapshots.length === 0 ? (
                      <div className="text-center py-12 px-4 bg-surface-container/30 border border-dashed border-outline-variant/80 rounded-2xl">
                        <History
                          className="mx-auto text-outline/50 mb-3 opacity-70"
                          size={32}
                        />
                        <p className="text-xs text-on-surface-variant font-medium">
                          No snapshots saved yet.
                        </p>
                        <p className="text-[10px] text-outline/80 mt-1">
                          Automatic version snapshots are taken periodically
                          during edits.
                        </p>
                      </div>
                    ) : (
                      snapshots.map((snap) => {
                        const dateStr = new Date(
                          snap.createdAt || snap.version,
                        ).toLocaleString();
                        const creatorName =
                          snap.createdBy?.username || "System Auto-save";
                        const isCurrentlyPreviewed =
                          previewSnapshot && previewSnapshot._id === snap._id;

                        return (
                          <div
                            key={snap._id || snap.version}
                            className={`p-4 rounded-2xl border transition-all relative flex flex-col gap-3.5 bg-surface-bright shadow-sm hover:shadow-md ${
                              isCurrentlyPreviewed
                                ? "border-amber-400 bg-amber-50/10 shadow-amber-100/20"
                                : "border-outline-variant/60"
                            }`}
                          >
                            <div className="flex flex-col text-left">
                              <h4 className="text-xs font-bold text-on-surface line-clamp-2">
                                {snap.label ||
                                  `Revision - ${new Date(snap.createdAt || snap.version).toLocaleDateString()}`}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-on-surface-variant opacity-75">
                                <Clock size={11} />
                                <span>{dateStr}</span>
                              </div>
                              <div className="text-[10px] text-primary/80 font-bold mt-1">
                                by {creatorName}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full mt-1 border-t border-outline-variant/30 pt-2.5">
                              <button
                                onClick={() =>
                                  setPreviewSnapshot(
                                    isCurrentlyPreviewed ? null : snap,
                                  )
                                }
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all active:scale-95 cursor-pointer text-center ${
                                  isCurrentlyPreviewed
                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                {isCurrentlyPreviewed
                                  ? "Viewing Preview"
                                  : "Preview Version"}
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleRestoreSnapshot(snap)}
                                  className="py-1.5 px-3 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all bg-primary/10 hover:bg-primary/20 text-primary active:scale-95 cursor-pointer text-center flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[12px] font-bold">
                                    restore
                                  </span>
                                  Restore
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeRightTab === "notes" && (
              <div className="p-4 border-t border-outline-variant bg-surface-container-low">
                {!isReadOnly ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newComment.trim()) return;

                      const freshComment = {
                        author: currentUser?.username || "Guest",
                        text: newComment.trim(),
                        createdAt: new Date().toISOString(),
                      };

                      if (socketRef.current?.connected) {
                        socketRef.current.emit("add-comment", {
                          boardId: board._id,
                          comment: freshComment,
                        });
                        setNewComment("");
                      } else {
                        const updatedComments = [...comments, freshComment];
                        setComments(updatedComments);
                        setNewComment("");

                        apiRequest
                          .put(`/boards/${board._id}`, {
                            comments: updatedComments,
                          })
                          .catch(() => {
                            toast.error("Failed to post comment");
                          });
                      }
                    }}
                    className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-outline text-[16px]">
                      add_comment
                    </span>
                    <input
                      className="bg-transparent border-none focus:ring-0 w-full text-xs text-on-surface outline-none font-sans"
                      placeholder="Write a comment..."
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="text-primary font-bold text-xs hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant/70 bg-surface-container-high border border-outline-variant/65 py-2.5 rounded-full shadow-inner font-bold text-center">
                    <span className="material-symbols-outlined text-[14px]">
                      lock
                    </span>
                    <span>Viewer mode is read-only.</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {!isNotesOpen && (
            <button
              onClick={toggleNotes}
              className="absolute right-6 top-6 glass-card border border-outline-variant rounded-xl p-3 shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary z-30 transition-all active:scale-95 cursor-pointer"
              title="Open Meeting Notes"
            >
              <span className="material-symbols-outlined block">
                description
              </span>
            </button>
          )}
        </div>
      </main>

      {isSnapshotModalOpen && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-surface-bright border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History
                  className="text-primary animate-in spin-in-12 duration-500"
                  size={20}
                />
                <h3 className="font-headline-md text-base font-black text-on-surface">
                  Save Custom Version
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsSnapshotModalOpen(false);
                  setSnapshotLabel("");
                }}
                className="text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateSnapshot}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
                  Version Label / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Initial Draft, Sprint 1 Done"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSnapshotModalOpen(false);
                    setSnapshotLabel("");
                  }}
                  className="px-4 py-2 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors text-xs font-bold text-on-surface-variant cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!snapshotLabel.trim() || isCreatingSnapshot}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all text-xs font-bold text-on-primary cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
                >
                  {isCreatingSnapshot ? "Saving..." : "Save Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-md w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                  <Share2 size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="text-slate-850 text-base font-extrabold leading-tight">
                    Share Whiteboard
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                    Manage public access settings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {isPublicLinkActive ? (
              <div className="flex flex-col gap-4 text-left">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Public Sharing Active</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider">
                      Access Link ({activeShareRole === "VIEWER" ? "Viewer Only" : "Editor/Collaborative"})
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.protocol}//${window.location.host}/board/shared/${activeShareToken}`}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
                      />
                      <button
                        onClick={async () => {
                          const url = `${window.location.protocol}//${window.location.host}/board/shared/${activeShareToken}`;
                          await navigator.clipboard.writeText(url);
                          toast.success("Link copied to clipboard!");
                        }}
                        className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                        title="Copy Link"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2.5 mt-1">
                    <span className="font-semibold">Expires:</span>
                    <span className="font-extrabold text-emerald-700">
                      {activeShareExpires 
                        ? new Date(activeShareExpires).toLocaleString() 
                        : "Never (No Expiry)"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRevokeShareLink}
                  className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">link_off</span>
                  Revoke Share Link
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Link Expiration
                  </label>
                  <select
                    value={shareExpiry}
                    onChange={(e) => setShareExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                  >
                    <option value="1">1 Hour</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="168">7 Days (1 Week)</option>
                    <option value="-1">Never (No Expiry)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Access Permission
                  </label>
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                  >
                    <option value="VIEWER">Viewer (View-Only Access)</option>
                    <option value="EDITOR">Editor (Collaborative Draw & Chat)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateShareLink}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md mt-2"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Generate Public Share Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
