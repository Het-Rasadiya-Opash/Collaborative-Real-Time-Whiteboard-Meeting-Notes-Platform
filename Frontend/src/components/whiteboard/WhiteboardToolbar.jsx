import React from "react";
import {
  Pencil,
  MousePointer,
  StickyNote,
  Square,
  Circle,
  Trash2,
  Eraser,
} from "lucide-react";

const DEFAULT_COLOR_PALETTE = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Green", hex: "#166534" },
  { name: "Orange", hex: "#b45309" },
  { name: "Red", hex: "#b91c1c" },
];

const WhiteboardToolbar = ({
  selectedTool,
  setSelectedTool,
  setSelectedElementId,
  currentColor,
  setCurrentColor,
  colorPalette = DEFAULT_COLOR_PALETTE,
  selectedElementId,
  handleDeleteSelected,
  handleClearCanvas,
  isReadOnly,
}) => {
  return (
    <>
      {!isReadOnly ? (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 glass-card border border-outline-variant rounded-2xl p-2 shadow-lg flex flex-col gap-1.5 z-30 animate-in slide-in-from-left duration-300">
          <button
            onClick={() => {
              setSelectedTool("pencil");
              setSelectedElementId(null);
            }}
            className={`p-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
              selectedTool === "pencil"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Pen Tool"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedTool("select");
            }}
            className={`p-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
              selectedTool === "select"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Select"
          >
            <MousePointer size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedTool("sticky");
              setSelectedElementId(null);
            }}
            className={`p-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
              selectedTool === "sticky"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Sticky Note"
          >
            <StickyNote size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedTool("rectangle");
              setSelectedElementId(null);
            }}
            className={`p-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
              selectedTool === "rectangle"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Rectangle Shape"
          >
            <Square size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedTool("circle");
              setSelectedElementId(null);
            }}
            className={`p-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
              selectedTool === "circle"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Circle Shape"
          >
            <Circle size={18} />
          </button>
 
          <div className="h-[1px] bg-outline-variant mx-1 my-0.5"></div>
 
          <div className="grid grid-cols-2 gap-1.5 justify-items-center py-1">
            {colorPalette.map((color) => {
              const isSelected = currentColor === color.hex;
              return (
                <button
                  key={color.hex}
                  onClick={() => setCurrentColor(color.hex)}
                  className={`w-5.5 h-5.5 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
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
 
          <div className="h-[1px] bg-outline-variant mx-1 my-0.5"></div>
 
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedElementId}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
              selectedElementId
                ? "text-rose-500 hover:bg-rose-500/10 hover:scale-105 active:scale-95 cursor-pointer"
                : "text-on-surface-variant/30 cursor-not-allowed"
            }`}
            title="Delete Selected"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleClearCanvas}
            className="p-2.5 text-on-surface-variant hover:bg-rose-500/10 hover:scale-105 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="Clear Canvas"
          >
            <Eraser size={18} />
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
    </>
  );
};

export default WhiteboardToolbar;
