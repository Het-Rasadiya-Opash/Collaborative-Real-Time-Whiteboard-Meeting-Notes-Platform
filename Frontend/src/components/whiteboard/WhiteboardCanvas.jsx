import React, { useRef, useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Undo2, Redo2 } from "lucide-react";

const getStickyLabel = (color) => {
  if (!color) return "IDEA";
  const hex = color.toLowerCase();
  if (hex === "#2563eb") return "IDEA";
  if (hex === "#7c3aed") return "NOTE";
  if (hex === "#166534") return "TODO";
  if (hex === "#b45309") return "DECISION";
  if (hex === "#b91c1c") return "IMPORTANT";
  return "IDEA";
};

const getSvgPathFromPoints = (points) => {
  if (!points || points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
};

const getStrokeBounds = (points) => {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX - 8,
    y: minY - 8,
    width: maxX - minX + 16,
    height: maxY - minY + 16,
  };
};

const StickyNoteEditor = ({ initialText, onSave }) => {
  const [text, setText] = useState(initialText === "Double-click to edit note" ? "" : initialText);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
      ref.current.selectionEnd = ref.current.value.length;
    }
  }, []);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onSave(initialText);
    }
  };

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text)}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
        resize: "none",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "bold",
        textAlign: "left",
        fontFamily: "sans-serif",
        cursor: "text",
        userSelect: "text",
        WebkitUserSelect: "text",
        padding: "8px",
        lineHeight: "1.4",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
      }}
    />
  );
};

const WhiteboardCanvas = ({
  canvasRef,
  zoom,
  setZoom,
  isReadOnly,
  selectedTool,
  selectedElementId,
  displayedElements,
  currentDrawingElement,
  editingStickyId,
  editingStickyText,
  setEditingStickyText,
  handleStageMouseDown,
  handleStageMouseMove,
  handleStageMouseUp,
  handleShapeSelect,
  handleDoubleClickSticky,
  finishStickyEditing,
  handleUndo,
  handleRedo,
  historyCount,
  redoCount,
  pan,
  setPan,
  isPanning,
}) => {
  const containerRef = useRef(null);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const newZoom = Math.min(200, Math.max(25, Math.round(zoom * zoomFactor)));
    setZoom(newZoom);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        el.removeEventListener("wheel", handleWheel);
      };
    }
  }, [zoom]);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (canvasRef) canvasRef.current = el;
      }}
      className="w-full h-full relative overflow-hidden select-none bg-slate-50 canvas-grid"
      style={{
        cursor: isPanning ? "grabbing" : selectedTool === "select" ? "default" : "crosshair",
        backgroundImage: `radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)`,
        backgroundSize: `${24 * (zoom / 100)}px ${24 * (zoom / 100)}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      onPointerDown={handleStageMouseDown}
      onPointerMove={handleStageMouseMove}
      onPointerUp={handleStageMouseUp}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          transformOrigin: "0 0",
        }}
      >
        <svg className="absolute inset-0 overflow-visible w-[5000px] h-[5000px]">
          {displayedElements.map((el) => {
            if (el.type === "stroke") {
              const isSelected = el.id === selectedElementId;
              return (
                <g key={el.id} className="pointer-events-auto cursor-pointer">
                  <path
                    d={getSvgPathFromPoints(el.points)}
                    fill="none"
                    stroke={el.color}
                    strokeWidth={el.strokeWidth || 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onPointerDown={(e) => handleShapeSelect(e, el.id)}
                  />
                  {isSelected && (() => {
                    const bounds = getStrokeBounds(el.points);
                    return (
                      <rect
                        x={bounds.x}
                        y={bounds.y}
                        width={bounds.width}
                        height={bounds.height}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4,4"
                      />
                    );
                  })()}
                </g>
              );
            }
            return null;
          })}

          {currentDrawingElement && currentDrawingElement.type === "stroke" && (
            <path
              d={getSvgPathFromPoints(currentDrawingElement.points)}
              fill="none"
              stroke={currentDrawingElement.color}
              strokeWidth={currentDrawingElement.strokeWidth || 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
        </svg>

        {displayedElements.map((el) => {
          const isSelected = el.id === selectedElementId;

          if (el.type === "rectangle") {
            return (
              <div
                key={el.id}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  border: `3px solid ${el.color}`,
                  outline: isSelected ? "3px dashed #ef4444" : "none",
                  outlineOffset: isSelected ? "4px" : "0px",
                }}
                className="pointer-events-auto cursor-pointer transition-shadow hover:shadow-md"
                onPointerDown={(e) => handleShapeSelect(e, el.id)}
              />
            );
          }

          if (el.type === "circle") {
            return (
              <div
                key={el.id}
                style={{
                  position: "absolute",
                  left: el.cx - el.r,
                  top: el.cy - el.r,
                  width: el.r * 2,
                  height: el.r * 2,
                  border: `3px solid ${el.color}`,
                  borderRadius: "50%",
                  outline: isSelected ? "3px dashed #ef4444" : "none",
                  outlineOffset: isSelected ? "4px" : "0px",
                }}
                className="pointer-events-auto cursor-pointer transition-shadow hover:shadow-md"
                onPointerDown={(e) => handleShapeSelect(e, el.id)}
              />
            );
          }

          if (el.type === "sticky") {
            const isEditing = editingStickyId === el.id;
            return (
              <div
                key={el.id}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  backgroundColor: el.color,
                  outline: isSelected ? "3px dashed #ef4444" : "none",
                  outlineOffset: isSelected ? "4px" : "0px",
                }}
                className="pointer-events-auto rounded-2xl p-4 shadow-lg flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 border border-white/20 select-text overflow-hidden"
                onPointerDown={(e) => handleShapeSelect(e, el.id)}
                onDoubleClick={(e) => handleDoubleClickSticky(e, el)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] tracking-wider uppercase font-black bg-white/20 px-2.5 py-0.5 rounded-full text-white/90">
                    {getStickyLabel(el.color)}
                  </span>
                </div>

                <div className="flex-1 w-full h-full min-h-0 overflow-hidden mt-1">
                  {!isEditing ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textAlign: "left",
                        fontFamily: "sans-serif",
                        padding: "8px",
                        lineHeight: "1.4",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                      className="select-none"
                    >
                      {el.text || "Double-click to edit note"}
                    </div>
                  ) : (
                    <StickyNoteEditor
                      initialText={el.text}
                      onSave={(newText) => {
                        finishStickyEditing(newText);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}

        {currentDrawingElement && (
          <>
            {currentDrawingElement.type === "rectangle" && (
              <div
                style={{
                  position: "absolute",
                  left: currentDrawingElement.x,
                  top: currentDrawingElement.y,
                  width: currentDrawingElement.width,
                  height: currentDrawingElement.height,
                  border: `3px dashed ${currentDrawingElement.color}`,
                  opacity: 0.8,
                }}
              />
            )}
            {currentDrawingElement.type === "circle" && (
              <div
                style={{
                  position: "absolute",
                  left: currentDrawingElement.cx - currentDrawingElement.r,
                  top: currentDrawingElement.cy - currentDrawingElement.r,
                  width: currentDrawingElement.r * 2,
                  height: currentDrawingElement.r * 2,
                  border: `3px dashed ${currentDrawingElement.color}`,
                  borderRadius: "50%",
                  opacity: 0.8,
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-card border border-outline-variant rounded-full px-4 py-2 shadow-md flex items-center gap-4 z-30 animate-in fade-in slide-in-from-bottom duration-300 pointer-events-auto">
        <button
          onClick={() => setZoom(Math.max(25, zoom - 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center text-on-surface-variant"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="font-body-md font-bold text-on-surface-variant w-12 text-center select-none text-xs">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center text-on-surface-variant"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>

        <div className="w-[1px] h-4 bg-outline-variant"></div>

        <button
          onClick={handleUndo}
          disabled={historyCount === 0}
          className={`p-1 transition-all flex items-center justify-center ${
            historyCount > 0
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
              : "text-outline/35 cursor-not-allowed"
          }`}
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoCount === 0}
          className={`p-1 transition-all flex items-center justify-center ${
            redoCount > 0
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
              : "text-outline/35 cursor-not-allowed"
          }`}
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
