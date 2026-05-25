import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MousePointer,
  Pencil,
  Square,
  Circle,
  FileText,
  Trash2,
  RotateCcw,
  Share2,
  Save,
  CheckCircle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import apiRequest from "../utils/apiRequest";

const COLOR_PALETTE = [
  { name: "Purple", hex: "#a855f7" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Green", hex: "#22c55e" },
  { name: "White", hex: "#f3f4f6" },
];

const Whiteboard = ({ board, onClose, workspace }) => {
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [elements, setElements] = useState([]);
  const [selectedTool, setSelectedTool] = useState("pencil");
  const [currentColor, setCurrentColor] = useState("#a855f7");
  const [saveStatus, setSaveStatus] = useState("saved");

  const [selectedElementId, setSelectedElementId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [currentDrawingElement, setCurrentDrawingElement] = useState(null);

  const [editingStickyId, setEditingStickyId] = useState(null);
  const [editingStickyText, setEditingStickyText] = useState("");

  const canvasRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    apiRequest
      .get(`/boards/${board._id}`)
      .then((response) => {
        if (!isMounted) return;
        const boardData = response.data?.data;
        if (boardData) {
          setBoardTitle(boardData.board?.title || board.title);
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
    } catch {
      // Handled globally
    }
  };

  const getMouseCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
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
        color: currentColor === "#f3f4f6" ? "#fef08a" : currentColor,
      };
      const newElements = [...elements, newSticky];
      setElements(newElements);
      triggerAutoSave(newElements);
      setSelectedTool("select");
      setSelectedElementId(id);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const { x, y } = getMouseCoords(e);

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
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (currentDrawingElement) {
      const newElements = [...elements, currentDrawingElement];
      setElements(newElements);
      triggerAutoSave(newElements);
      setCurrentDrawingElement(null);
    }
  };

  const handleDoubleClickSticky = (e, element) => {
    e.stopPropagation();
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

    setElements(updated);
    triggerAutoSave(updated);
    setEditingStickyId(null);
    setEditingStickyText("");
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter((el) => el.id !== selectedElementId);
    setElements(updated);
    triggerAutoSave(updated);
    setSelectedElementId(null);
    toast.success("Element deleted");
  };

  const handleClearCanvas = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire whiteboard canvas?",
      )
    ) {
      setElements([]);
      triggerAutoSave([]);
      setSelectedElementId(null);
      toast.success("Canvas cleared");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f0f11] text-[#e4e4e7] z-50 flex flex-col font-sans select-none animate-in fade-in duration-200">
      <style>{`
        .whiteboard-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}</style>

      <header className="h-[64px] border-b border-white/5 bg-[#121214]/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/5 text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
            title="Return to Workspace"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="h-4 w-[1px] bg-white/10 shrink-0"></div>

          <div className="min-w-0 flex items-center gap-2.5">
            {isEditingTitle ? (
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                className="bg-[#18181b] border border-primary/40 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[240px]"
                autoFocus
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-bold text-base hover:text-white cursor-pointer select-text truncate text-[#e4e4e7] hover:underline decoration-dashed decoration-primary decoration-2 underline-offset-4"
                title="Click to rename board"
              >
                {boardTitle}
              </h2>
            )}
            <span className="text-xs text-[#a1a1aa] bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              Board
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <CheckCircle size={13} />
                Saved
              </span>
            )}
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full animate-pulse">
                <Save size={13} className="animate-bounce" />
                Saving...
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <Save size={13} />
                Unsaved changes
              </span>
            )}
          </div>

          <button
            onClick={handleShareBoard}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Share2 size={14} />
            Share Board
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center bg-[#121214]/90 border border-white/5 rounded-2xl p-2.5 shadow-2xl z-20 space-y-4 backdrop-blur-md">
          <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
            {[
              { id: "select", icon: MousePointer, label: "Select Element" },
              { id: "pencil", icon: Pencil, label: "Brush Pencil" },
              { id: "rectangle", icon: Square, label: "Draw Rectangle" },
              { id: "circle", icon: Circle, label: "Draw Circle" },
              { id: "sticky", icon: FileText, label: "Add Sticky Note" },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = selectedTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(tool.id);
                    setSelectedElementId(null);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105"
                      : "text-[#a1a1aa] hover:bg-white/5 hover:text-white"
                  }`}
                  title={tool.label}
                >
                  <Icon
                    size={18}
                    className={isActive ? "stroke-[2.5px]" : "stroke-[2px]"}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 pb-3 border-b border-white/5">
            {COLOR_PALETTE.map((color) => {
              const isSelected = currentColor === color.hex;
              return (
                <button
                  key={color.hex}
                  onClick={() => setCurrentColor(color.hex)}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer relative flex items-center justify-center ${
                    isSelected
                      ? "scale-115 border-white shadow-md shadow-white/10"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} Color`}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#121214]"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedElementId}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                selectedElementId
                  ? "text-rose-500 hover:bg-rose-500/10"
                  : "text-[#a1a1aa]/30 cursor-not-allowed"
              }`}
              title="Delete Selected Element"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={handleClearCanvas}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#a1a1aa] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              title="Clear Whiteboard Canvas"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <svg
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full whiteboard-grid cursor-crosshair bg-[#0d0d0f]"
        >
          {elements.map((el) => {
            const isSelected = el.id === selectedElementId;
            const selectProps =
              selectedTool === "select"
                ? {
                    "data-element-id": el.id,
                    className: "cursor-move hover:stroke-primary/40",
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
                      stroke="#a855f7"
                      strokeWidth={el.strokeWidth ? el.strokeWidth + 4 : 8}
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
                      stroke="#a855f7"
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
                      stroke="#a855f7"
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
                    {...selectProps}
                  />
                </g>
              );
            }

            if (el.type === "sticky") {
              const isStickyEditing = el.id === editingStickyId;
              return (
                <g
                  key={el.id}
                  onDoubleClick={(e) => handleDoubleClickSticky(e, el)}
                >
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={12}
                    ry={12}
                    fill={el.color}
                    fillOpacity={0.9}
                    stroke={isSelected ? "#a855f7" : "rgba(255,255,255,0.06)"}
                    strokeWidth={isSelected ? 2.5 : 1}
                    className="shadow-2xl"
                    {...selectProps}
                  />

                  <foreignObject
                    x={el.x + 12}
                    y={el.y + 12}
                    width={el.width - 24}
                    height={el.height - 24}
                    style={{ pointerEvents: isStickyEditing ? "all" : "none" }}
                  >
                    <div className="w-full h-full flex items-center justify-center text-[#18181b] overflow-hidden select-text text-center text-sm font-semibold leading-relaxed">
                      {isStickyEditing ? (
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
                          className="w-full h-full bg-black/5 text-[#18181b] border-none outline-none resize-none text-center focus:ring-0 p-0 text-sm font-semibold placeholder-[#18181b]/40"
                          placeholder="Type something..."
                          autoFocus
                        />
                      ) : (
                        <div className="w-full break-words max-h-full overflow-hidden text-ellipsis px-1 select-text">
                          {el.text}
                        </div>
                      )}
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
        </svg>

        <div className="absolute right-6 bottom-6 bg-[#121214]/75 border border-white/5 p-3 rounded-xl flex items-center gap-2.5 shadow-xl text-xs text-[#a1a1aa] backdrop-blur-sm pointer-events-none">
          <Info size={14} className="text-primary" />
          <span>
            {selectedTool === "select"
              ? "Drag elements to arrange. Double-click stickies to write."
              : `Drawing Tool Active. Select colors and drag on the grid.`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
