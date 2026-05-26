import React from "react";
import {
  History,
  Clock,
  Plus,
  X,
  Bold,
  Italic,
  Underline,
  List,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import apiRequest from "../../utils/apiRequest";

const NotesPanel = ({
  isNotesOpen,
  toggleNotes,
  activeRightTab,
  setActiveRightTab,
  fetchSnapshots,
  workspace,
  currentUser,
  collaborators,
  isReadOnly,
  editorRef,
  agendaText,
  setAgendaText,
  handleSaveNotes,
  handleNotesBlur,
  handleNotesTyping,
  handleFormatCommand,
  typingCollaborators,
  comments,
  newComment,
  setNewComment,
  socketRef,
  board,
  setComments,
  snapshots,
  setIsSnapshotModalOpen,
  previewSnapshot,
  setPreviewSnapshot,
  handleRestoreSnapshot,
  handleExportPNG,
  handleExportPDF,
}) => {
  if (!isNotesOpen) return null;

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== agendaText) {
      editorRef.current.innerHTML = agendaText || "";
    }
  }, [isNotesOpen, board?._id]);

  const handleCommentSubmit = (e) => {
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
  };

  return (
    <section
      className={`bg-surface-container-lowest border-l border-outline-variant flex flex-col sidebar-transition z-30 w-[380px] opacity-100`}
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

                  const isOnline =
                    (currentUser?._id &&
                      (member.user?._id === currentUser?._id ||
                        member.user === currentUser?._id)) ||
                    collaborators.some(
                      (collab) =>
                        collab.userId === member.user?._id ||
                        (member.user && collab.userId === member.user),
                    );

                  const typingCollab = collaborators.find(
                    (collab) =>
                      collab.userId === member.user?._id ||
                      (member.user && collab.userId === member.user),
                  );
                  const isTyping = typingCollab?.isTypingNotes;

                  return (
                    <div
                      key={member._id || mIdx}
                      className={`w-8 h-8 rounded-full ring-2 ${ringColorClass} bg-surface-variant flex items-center justify-center font-bold text-[10px] relative transition-transform duration-200 ${isTyping ? "animate-bounce shadow-md" : ""}`}
                      title={`${username} ${isOnline ? "(Online)" : "(Offline)"} ${isTyping ? "- Typing notes..." : ""}`}
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

                {collaborators
                  .filter(
                    (collab) =>
                      collab.userId !== currentUser?._id &&
                      !(workspace?.members || []).some(
                        (m) =>
                          m.user?._id === collab.userId ||
                          m.user === collab.userId,
                      ),
                  )
                  .map((collab, gIdx) => {
                    const initials = (collab.username || "Guest")
                      .slice(0, 2)
                      .toUpperCase();
                    const isGuestTyping = collab.isTypingNotes;
                    return (
                      <div
                        key={collab.userId || gIdx}
                        className={`w-8 h-8 rounded-full ring-2 ring-dashed ring-outline bg-surface-container flex items-center justify-center font-bold text-[10px] relative text-outline transition-transform duration-200 ${isGuestTyping ? "animate-bounce shadow-md" : ""}`}
                        title={`${collab.username || "Guest"} (Guest - Online) ${isGuestTyping ? "- Typing notes..." : ""}`}
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

                {(workspace?.members || []).length === 0 &&
                  collaborators.length === 0 && (
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
                      onClick={() => handleFormatCommand("insertUnorderedList")}
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
                  onFocus={handleNotesTyping}
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
                  suppressContentEditableWarning={true}
                />

                {typingCollaborators.length > 0 && (
                  <div className="flex items-center gap-2 text-primary bg-primary/5 border border-primary/10 rounded-xl px-3.5 py-2 animate-pulse mt-2 select-none self-start">
                    <div className="flex gap-1 items-center">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                    <span className="text-[11px] font-bold tracking-wide">
                      {typingCollaborators
                        .map((c) => c.username || "Collaborator")
                        .join(", ")}{" "}
                      {typingCollaborators.length === 1
                        ? "is typing notes..."
                        : "are typing notes..."}
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
                          ? new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
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
                    Automatic version snapshots are taken periodically during
                    edits.
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
              onSubmit={handleCommentSubmit}
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
  );
};

export default NotesPanel;
