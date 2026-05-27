import React from "react";
import {
  Share2,
  Download,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Menu,
} from "lucide-react";

export const WhiteboardHeader = ({
  isEditingTitle,
  boardTitle,
  setBoardTitle,
  handleSaveTitle,
  setIsEditingTitle,
  isReadOnly,
  workspace,
  saveStatus,
  publicShareToken,
  setIsShareModalOpen,
  isExportDropdownOpen,
  setIsExportDropdownOpen,
  handleExportPNG,
  handleExportPDF,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <header className={`fixed top-0 right-0 ${isSidebarOpen ? "lg:left-[280px]" : "left-0"} z-50 flex justify-between items-center h-14 px-6 bg-white border-b border-outline-variant/30 shadow-sm shadow-primary/5 transition-all duration-300`}>
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer mr-1"
            title="Expand Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="font-headline-sm text-sm font-bold text-slate-800 flex items-center gap-2 select-text">
          {isEditingTitle ? (
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              className="bg-surface-container-low border border-primary/40 rounded-lg px-2.5 py-0.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px]"
              autoFocus
            />
          ) : (
            <span
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              className={
                !isReadOnly
                  ? "cursor-pointer hover:underline decoration-dashed decoration-primary decoration-2 underline-offset-4"
                  : ""
              }
              title={!isReadOnly ? "Click to rename board" : ""}
            >
              Board: {boardTitle}
            </span>
          )}
        </h2>

        <div className="flex items-center -space-x-2">
          {(workspace?.members || []).slice(0, 4).map((member, mIdx) => {
            const username = member.user?.username || "?";
            const firstChar = username.charAt(0).toUpperCase();
            const palettes = [
              { bg: "#dbeafe", text: "#1d4ed8" }, // blue
              { bg: "#ede9fe", text: "#7c3aed" }, // purple
              { bg: "#d1fae5", text: "#065f46" }, // green
              { bg: "#fef3c7", text: "#92400e" }, // amber
            ];
            const palette = palettes[mIdx % palettes.length];
            return (
              <div
                key={member._id || mIdx}
                style={{ backgroundColor: palette.bg, color: palette.text }}
                className="w-8 h-8 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0 select-none"
                title={username}
              >
                {firstChar}
              </div>
            );
          })}
          {(workspace?.members || []).length > 4 && (
            <div
              className="w-8 h-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm flex-shrink-0"
              title={`+${(workspace?.members || []).length - 4} more`}
            >
              +{(workspace?.members || []).length - 4}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
              <CheckCircle size={15} />
              Saved
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-primary font-semibold text-xs animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
              <AlertTriangle size={15} />
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 border-l border-outline-variant/40 pl-6">
          {!publicShareToken && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 border border-primary text-primary font-bold rounded-lg hover:bg-primary-fixed-dim transition-all cursor-pointer text-xs"
            >
              <Share2 size={15} />
              SHARE
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all cursor-pointer text-xs"
            >
              <Download size={15} />
              EXPORT
              <ChevronDown size={14} />
            </button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-outline-variant/60 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                  <div className="w-8 h-8 rounded-lg bg-note-blue flex items-center justify-center text-primary">
                    <Download size={18} />
                  </div>
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
                  <div className="w-8 h-8 rounded-lg bg-note-purple flex items-center justify-center text-purple-600">
                    <Download size={18} />
                  </div>
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
  );
};
