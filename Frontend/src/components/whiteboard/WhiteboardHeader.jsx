import React from "react";
import { Share2, Download, AlertTriangle } from "lucide-react";

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
}) => {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-14 bg-surface-glass backdrop-blur-md border-b border-outline-variant z-40 flex justify-between items-center px-5">
      <div className="flex items-center gap-3">
        <h1 className="font-headline-md text-sm font-bold text-primary flex items-center gap-2 select-text">
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
        </h1>
        <div className="flex -space-x-1.5 ml-2">
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
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${colorClass}`}
                title={username}
              >
                {firstChar}
              </div>
            );
          })}
          {(workspace?.members || []).length > 3 && (
            <div className="w-6 h-6 rounded-full border border-white bg-surface-container flex items-center justify-center text-[9px] font-bold text-primary">
              +{(workspace?.members || []).length - 3}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-success-emerald bg-success-emerald/10 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <span className="material-symbols-outlined text-[12px]">
                check_circle
              </span>
              Saved
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse">
              <svg
                className="animate-spin h-3 w-3 text-primary"
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
            <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <AlertTriangle size={11} />
              Unsaved
            </span>
          )}
        </div>
        <div className="h-6 w-[1px] bg-outline-variant mx-0.5"></div>
        <div className="flex items-center gap-1.5">
          {!publicShareToken && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant rounded-md hover:bg-surface-container-low transition-all text-[10px] font-bold text-primary active:scale-95 cursor-pointer"
            >
              <Share2 size={13} />
              <span className="uppercase tracking-wider">
                Share
              </span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant rounded-md hover:bg-surface-container-low transition-all text-[10px] font-bold text-on-surface-variant active:scale-95 cursor-pointer"
            >
              <Download size={13} />
              <span className="uppercase tracking-wider">
                Export
              </span>
              <span className="material-symbols-outlined text-[13px] font-bold">
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
  );
};
