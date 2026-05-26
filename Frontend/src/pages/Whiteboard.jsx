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
} from "lucide-react";
import toast from "react-hot-toast";
import apiRequest from "../utils/apiRequest";
import { io } from "socket.io-client";

const COLOR_PALETTE = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Emerald", hex: "#166534" },
  { name: "Amber", hex: "#b45309" },
  { name: "Red", hex: "#b91c1c" },
  { name: "White", hex: "#ffffff" },
];

const Whiteboard = ({ board, onClose, workspace }) => {
  const { currentUser } = useSelector((state) => state.users);

  const myMember = workspace?.members?.find(
    (m) => (m.user?._id || m.user) === currentUser?._id,
  );
  const myRole =
    workspace?.owner?._id === currentUser?._id ||
    workspace?.owner === currentUser?._id
      ? "OWNER"
      : myMember?.role || "VIEWER";
  const isReadOnly = myRole === "VIEWER";

  const [boardTitle, setBoardTitle] = useState(board.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [elements, setElements] = useState([]);
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
  const isTypingCommentsRef = useRef(false);

  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const isCanvasBusy =
    isDragging || currentDrawingElement !== null || editingStickyId !== null;

  useEffect(() => {
    const apiEndpoint =
      import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000/api";
    const socketUrl = apiEndpoint.replace("/api", "");

    console.log("Connecting to socket server at:", socketUrl);
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

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
      if (!isTypingCommentsRef.current) {
        setComments(comments || []);
      }
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

    socket.on("user-joined", ({ userId, username }) => {
      toast.success(`${username} joined the board!`);
    });

    socket.on("user-left", ({ userId, username }) => {
      if (username) {
        toast.success(`${username} left the board.`);
      }
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    });

    return () => {
      socket.disconnect();
    };
  }, [board._id, currentUser]);

  useEffect(() => {
    let isMounted = true;
    apiRequest
      .get(`/boards/${board._id}`)
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

    return () => {
      isMounted = false;
    };
  }, [board._id]);

  useEffect(() => {
    let isMounted = true;
    const pollInterval = setInterval(() => {
      if (!isMounted) return;

      if (isSocketConnected) return;

      apiRequest
        .get(`/boards/${board._id}`)
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
              !isTypingCommentsRef.current &&
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
  }, [board._id, isCanvasBusy, isEditingTitle, isSocketConnected]);

  const triggerAutoSave = (updatedElements) => {
    setSaveStatus("unsaved");
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      apiRequest
        .put(`/boards/${board._id}`, {
          snapshot: updatedElements,
        })
        .then(() => {
          setSaveStatus("saved");
        })
        .catch(() => {
          setSaveStatus("unsaved");
        });
    }, 1500);
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

  const handleShareBoard = async () => {
    try {
      const response = await apiRequest.post(
        `/boards/${board._id}/share-link`,
        {
          expiresIn: 24,
        },
      );
      const shareUrl = response.data?.data?.shareUrl;
      if (shareUrl) {
        const cleanToken = response.data?.data?.shareToken;
        const frontendShareUrl = `${window.location.protocol}//${window.location.host}/board/shared/${cleanToken}`;

        await navigator.clipboard.writeText(frontendShareUrl);
        toast.success("Collaborative link copied to clipboard!");
      }
    } catch {}
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

  const handleMouseDown = (e) => {
    if (isReadOnly) return;
    if (editingStickyId) {
      finishStickyEditing();
      return;
    }

    const { x, y } = getMouseCoords(e);

    if (selectedTool === "select") {
      const targetId = e.target.getAttribute("data-element-id");
      if (targetId) {
        setSelectedElementId(targetId);
        const element = elements.find((el) => el.id === targetId);
        if (element) {
          setIsDragging(true);
          if (element.type === "rectangle" || element.type === "sticky") {
            setDragOffset({ x: x - element.x, y: y - element.y });
          } else if (element.type === "circle") {
            setDragOffset({ x: x - element.cx, y: y - element.cy });
          } else if (element.type === "stroke") {
            setDragOffset({ x, y });
          }
        }
      } else {
        setSelectedElementId(null);
      }
      return;
    }

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
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getMouseCoords(e);

    if (socketRef.current?.connected) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40) {
        socketRef.current.emit("cursor-move", {
          boardId: board._id,
          x,
          y,
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

    if (selectedTool === "select" && selectedElementId) {
      setElements((prevElements) => {
        const updated = prevElements.map((el) => {
          if (el.id !== selectedElementId) return el;
          if (el.type === "rectangle" || el.type === "sticky") {
            return { ...el, x: x - dragOffset.x, y: y - dragOffset.y };
          } else if (el.type === "circle") {
            return { ...el, cx: x - dragOffset.x, cy: y - dragOffset.y };
          } else if (el.type === "stroke") {
            const dx = x - dragOffset.x;
            const dy = y - dragOffset.y;
            const newPoints = el.points.map((pt) => ({
              x: pt.x + dx,
              y: pt.y + dy,
            }));
            setDragOffset({ x, y });
            return { ...el, points: newPoints };
          }
          return el;
        });
        triggerAutoSave(updated);

        if (socketRef.current?.connected) {
          socketRef.current.emit("canvas-change", {
            boardId: board._id,
            elements: updated,
          });
        }

        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (currentDrawingElement) {
      const newElements = [...elements, currentDrawingElement];
      updateElementsAndHistory(newElements);
      setCurrentDrawingElement(null);
    }
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

  const handleExportPNG = () => {
    toast.success("Preparing whiteboard image export...");
    if (!canvasRef.current) return;
    try {
      const svgString = new XMLSerializer().serializeToString(
        canvasRef.current,
      );
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvasRef.current.clientWidth || 1920;
        canvas.height = canvasRef.current.clientHeight || 1080;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f8f9ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = png;
        downloadLink.download = `${boardTitle}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        DOMURL.revokeObjectURL(png);
        toast.success("Exported PNG successfully!");
      };
      img.src = url;
    } catch (e) {
      toast.error("Failed to export PNG. Exporting SVG instead.");
      const svgString = new XMLSerializer().serializeToString(
        canvasRef.current,
      );
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${boardTitle}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleExportPDF = () => {
    toast.success("Preparing PDF document...");
    window.print();
  };

  const handleSaveNotes = (text) => {
    if (isReadOnly) return;
    setSaveStatus("unsaved");
    if (socketRef.current?.connected) {
      socketRef.current.emit("notes-change", {
        boardId: board._id,
        meetingNotes: text,
      });
    }
    apiRequest
      .put(`/boards/${board._id}`, {
        meetingNotes: text,
      })
      .then(() => {
        setSaveStatus("saved");
      })
      .catch(() => {
        setSaveStatus("unsaved");
      });
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
                  onClick={() => setIsEditingTitle(true)}
                  className="cursor-pointer hover:underline decoration-dashed decoration-primary decoration-2 underline-offset-4"
                  title="Click to rename board"
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
              <button
                onClick={handleShareBoard}
                className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all text-xs font-bold text-primary active:scale-95 cursor-pointer"
              >
                <Share2 size={16} />
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Share
                </span>
              </button>
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all text-xs font-bold text-on-surface-variant active:scale-95 cursor-pointer"
              >
                <Download size={16} />
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Export
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="mt-16 flex-1 bg-surface-bright relative canvas-dot-grid overflow-hidden flex">
          <div className="flex-1 relative cursor-crosshair">
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

            <svg
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full cursor-crosshair"
            >
              <g
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "0 0",
                }}
              >
                {elements.map((el) => {
                  const isSelected = el.id === selectedElementId;
                  const selectProps =
                    selectedTool === "select"
                      ? {
                          "data-element-id": el.id,
                        }
                      : {};

                  if (el.type === "stroke") {
                    const pathData = el.points
                      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                      .join(" ");
                    return (
                      <g key={el.id}>
                        {isSelected && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#712ae2"
                            strokeWidth={
                              el.strokeWidth ? el.strokeWidth + 4 : 8
                            }
                            strokeOpacity={0.25}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={el.color}
                          strokeWidth={el.strokeWidth || 4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={
                            selectedTool === "select"
                              ? "cursor-move hover:stroke-primary/40"
                              : ""
                          }
                          {...selectProps}
                        />
                      </g>
                    );
                  }

                  if (el.type === "rectangle") {
                    return (
                      <g key={el.id}>
                        {isSelected && (
                          <rect
                            x={el.x - 3}
                            y={el.y - 3}
                            width={el.width + 6}
                            height={el.height + 6}
                            fill="none"
                            stroke="#712ae2"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />
                        )}
                        <rect
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          fill="transparent"
                          stroke={el.color}
                          strokeWidth={3}
                          className={
                            selectedTool === "select"
                              ? "cursor-move hover:stroke-primary/40"
                              : ""
                          }
                          {...selectProps}
                        />
                      </g>
                    );
                  }

                  if (el.type === "circle") {
                    return (
                      <g key={el.id}>
                        {isSelected && (
                          <circle
                            cx={el.cx}
                            cy={el.cy}
                            r={el.r + 3}
                            fill="none"
                            stroke="#712ae2"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />
                        )}
                        <circle
                          cx={el.cx}
                          cy={el.cy}
                          r={el.r}
                          fill="transparent"
                          stroke={el.color}
                          strokeWidth={3}
                          className={
                            selectedTool === "select"
                              ? "cursor-move hover:stroke-primary/40"
                              : ""
                          }
                          {...selectProps}
                        />
                      </g>
                    );
                  }

                  if (el.type === "sticky") {
                    const isStickyEditing = el.id === editingStickyId;
                    return (
                      <g key={el.id}>
                        <foreignObject
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          style={{ pointerEvents: "all" }}
                        >
                          <div
                            onDoubleClick={(e) =>
                              handleDoubleClickSticky(e, el)
                            }
                            className={`w-full h-full p-4 rounded-xl flex flex-col justify-between shadow-md transition-all cursor-move select-none glass-card ${
                              isSelected
                                ? "ring-2 ring-primary border-primary"
                                : "border-outline-variant"
                            }`}
                            style={{
                              backgroundColor: el.color,
                              transform: isSelected ? "scale(1.02)" : "none",
                              zIndex: isSelected ? 50 : 10,
                            }}
                            {...selectProps}
                          >
                            <div className="flex justify-between items-center select-none pointer-events-none mb-1">
                              <span className="text-[10px] font-bold tracking-wider opacity-60 uppercase text-on-surface">
                                {el.color === "#fef08a" ||
                                el.color === "#eff4ff"
                                  ? "STICKY NOTE"
                                  : "IDEA"}
                              </span>
                              <span className="material-symbols-outlined text-outline text-[16px]">
                                push_pin
                              </span>
                            </div>

                            <div className="flex-1 w-full h-full flex items-center justify-center text-center overflow-hidden text-sm font-semibold leading-relaxed text-on-surface">
                              {isStickyEditing ? (
                                <textarea
                                  value={editingStickyText}
                                  onChange={(e) =>
                                    setEditingStickyText(e.target.value)
                                  }
                                  onBlur={finishStickyEditing}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      finishStickyEditing();
                                    }
                                  }}
                                  className="w-full h-full bg-black/5 text-[#0b1c30] border-none outline-none resize-none text-center focus:ring-0 p-0 text-sm font-semibold placeholder-[#0b1c30]/40"
                                  placeholder="Type something..."
                                  autoFocus
                                />
                              ) : (
                                <div className="w-full break-words max-h-full overflow-hidden text-ellipsis px-1 select-text">
                                  {el.text}
                                </div>
                              )}
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }

                  return null;
                })}

                {currentDrawingElement && (
                  <g>
                    {currentDrawingElement.type === "stroke" && (
                      <path
                        d={currentDrawingElement.points
                          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                          .join(" ")}
                        fill="none"
                        stroke={currentDrawingElement.color}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.8}
                      />
                    )}
                    {currentDrawingElement.type === "rectangle" && (
                      <rect
                        x={currentDrawingElement.x}
                        y={currentDrawingElement.y}
                        width={currentDrawingElement.width}
                        height={currentDrawingElement.height}
                        fill="transparent"
                        stroke={currentDrawingElement.color}
                        strokeWidth={3}
                        strokeDasharray="5 3"
                        opacity={0.8}
                      />
                    )}
                    {currentDrawingElement.type === "circle" && (
                      <circle
                        cx={currentDrawingElement.cx}
                        cy={currentDrawingElement.cy}
                        r={currentDrawingElement.r}
                        fill="transparent"
                        stroke={currentDrawingElement.color}
                        strokeWidth={3}
                        strokeDasharray="5 3"
                        opacity={0.8}
                      />
                    )}
                  </g>
                )}
              </g>
            </svg>

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
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  description
                </span>
                <h2 className="font-headline-md text-lg font-bold text-on-surface">
                  Meeting Notes
                </h2>
              </div>
              <button
                onClick={toggleNotes}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined block">
                  keyboard_double_arrow_right
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                    Active Editors
                  </span>
                </div>
                <div className="flex gap-2">
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
                    return (
                      <div
                        key={member._id || mIdx}
                        className={`w-8 h-8 rounded-full ring-2 ${ringColorClass} bg-surface-variant flex items-center justify-center font-bold text-[10px]`}
                        title={username}
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {(workspace?.members || []).length === 0 && (
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
                    onBlur={() => {
                      isTypingNotesRef.current = false;
                      if (editorRef.current) {
                        handleSaveNotes(editorRef.current.innerHTML);
                      }
                    }}
                    onInput={(e) => {
                      const html = e.currentTarget.innerHTML;
                      setAgendaText(html);
                      handleSaveNotes(html);
                    }}
                    className="w-full flex-1 bg-transparent text-on-surface-variant leading-relaxed outline-none overflow-y-auto text-xs rich-text-editor font-sans"
                    placeholder={
                      isReadOnly
                        ? "Notes are read-only for viewer role..."
                        : "Type meeting agenda or collaborate on notes here..."
                    }
                  />
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
                            ? new Date(comment.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-on-surface-variant">{comment.text}</p>
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
            </div>

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

                    const updatedComments = [...comments, freshComment];
                    setComments(updatedComments);
                    setNewComment("");

                    apiRequest
                      .put(`/boards/${board._id}`, {
                        comments: updatedComments,
                      })
                      .then(() => {
                        if (socketRef.current?.connected) {
                          socketRef.current.emit("comments-change", {
                            boardId: board._id,
                            comments: updatedComments,
                          });
                        }
                      })
                      .catch(() => {
                        toast.error("Failed to post comment");
                      });
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
                    onFocus={() => {
                      isTypingCommentsRef.current = true;
                    }}
                    onBlur={() => {
                      isTypingCommentsRef.current = false;
                    }}
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
    </div>
  );
};

export default Whiteboard;
