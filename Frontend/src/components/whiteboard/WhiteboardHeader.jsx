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
  isVideoCallActive,
  setIsVideoCallActive,
}) => {
  return (
    <header
      className={`fixed top-0 right-0 ${isSidebarOpen ? "lg:left-[280px]" : "left-0"} z-50 flex justify-between items-center h-14 px-6 bg-background border-b border-outline-variant shrink-0 transition-all duration-300`}
    >
      <div className="flex items-center space-x-4">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant cursor-pointer"
            title="Expand Sidebar"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <h1 className="text-title-md sm:text-headline-sm font-semibold text-on-background truncate max-w-[120px] sm:max-w-none">
          {isEditingTitle ? (
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              className="bg-surface border border-primary rounded-lg px-2 py-0.5 text-xs text-on-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary max-w-[100px] sm:max-w-[200px]"
              autoFocus
            />
          ) : (
            <span
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              className={!isReadOnly ? "cursor-pointer hover:underline truncate" : "truncate"}
            >
              Board: {boardTitle}
            </span>
          )}
        </h1>
        <div className="flex -space-x-2">
          {(workspace?.members || []).slice(0, 3).map((member, mIdx) => {
            const username = member.user?.username || "?";
            const firstChar = username.charAt(0).toUpperCase();
            const bgClasses = ["bg-blue-100 text-blue-600", "bg-purple-100 text-purple-600", "bg-emerald-100 text-emerald-600"];
            const colorClass = bgClasses[mIdx % bgClasses.length];
            return (
              <div
                key={member._id || mIdx}
                className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold ${colorClass}`}
                title={username}
              >
                {firstChar}
              </div>
            );
          })}
          {(workspace?.members || []).length > 3 && (
            <div
              className="w-8 h-8 rounded-full border-2 border-background bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-on-surface-variant"
              title={`+${(workspace?.members || []).length - 3} more`}
            >
              +{(workspace?.members || []).length - 3}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 font-label-md">
          {saveStatus === "saved" && (
            <span className="flex items-center space-x-1 text-tertiary">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="hidden md:inline">Saved</span>
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center space-x-1 text-primary animate-pulse">
              <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              <span className="hidden md:inline">Saving...</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="flex items-center space-x-1 text-error">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span className="hidden md:inline">Unsaved</span>
            </span>
          )}
        </div>
        <div className="h-6 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center space-x-2 relative">
          <button
            onClick={() => setIsVideoCallActive(!isVideoCallActive)}
            className={`flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 py-2 rounded-lg text-label-md font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer ${
              isVideoCallActive
                ? "bg-error text-on-error"
                : "bg-primary-container text-on-primary-container"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{isVideoCallActive ? "videocam_off" : "videocam"}</span>
            <span className="hidden sm:inline">{isVideoCallActive ? "LEAVE MEET" : "VIDEO MEET"}</span>
          </button>
          {!publicShareToken && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 py-2 border border-primary text-primary rounded-lg text-label-md font-bold hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span className="hidden sm:inline">SHARE</span>
            </button>
          )}
          
          <button
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">export_notes</span>
          </button>
          {isExportDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-outline-variant rounded-xl shadow-float p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant mb-1">
                Export Options
              </div>
              <button
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  handleExportPNG();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-fixed-dim flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">image</span>
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
                <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
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
    </header>
  );
};
