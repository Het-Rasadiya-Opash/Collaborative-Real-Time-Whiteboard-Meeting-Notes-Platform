import {
  Bold,
  Calendar,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  Italic,
  List,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Underline,
  User,
  Wand2,
  X
} from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import apiRequest from "../../utils/apiRequest";
import { enqueueOperation } from "../../utils/offlineQueue";

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
  const [actionItems, setActionItems] = React.useState([]);
  const [isLoadingActions, setIsLoadingActions] = React.useState(false);

  React.useEffect(() => {
    if (board?._id) {
      apiRequest
        .get(`/notes/${board._id}`)
        .then((response) => {
          const items = response.data?.data?.actionItems || [];
          setActionItems(items);
        })
        .catch((error) => {
          console.error("Failed to fetch notes action items:", error);
        });
    }
  }, [board?._id]);

  React.useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    const socket = socketRef.current;

    const handleActionItemsUpdate = ({ actionItems }) => {
      setActionItems(actionItems || []);
    };

    socket.on("action-items-update", handleActionItemsUpdate);

    return () => {
      socket.off("action-items-update", handleActionItemsUpdate);
    };
  }, [socketRef, socketRef.current]);

  const handleExtractActions = async () => {
    if (isLoadingActions) return;
    setIsLoadingActions(true);

    try {
      const currentText = editorRef.current?.innerHTML || agendaText || "";
      const response = await apiRequest.post(
        `/notes/${board._id}/ai-action-items`,
        {
          notesText: currentText,
        },
      );

      const extracted = response.data?.data?.actionItems || [];
      setActionItems(extracted);
    } catch (error) {
      console.error("Failed to extract action items:", error);
    } finally {
      setIsLoadingActions(false);
    }
  };

  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [newTaskText, setNewTaskText] = React.useState("");
  const [newAssigneeText, setNewAssigneeText] = React.useState("Unassigned");
  const [newDueDateText, setNewDueDateText] = React.useState("");
  const [isSubmittingItem, setIsSubmittingItem] = React.useState(false);

  const workspaceMembers = React.useMemo(() => {
    const list = [];
    if (workspace?.owner) {
      list.push(workspace.owner);
    }
    if (workspace?.members) {
      workspace.members.forEach((m) => {
        if (m.user) {
          list.push(m.user);
        }
      });
    }
    const seen = new Set();
    return list.filter((m) => {
      const id = m._id || m.id || m;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [workspace]);

  const handleCreateManualActionItem = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) {
      toast.error("Task description is required");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const response = await apiRequest.post(
        `/notes/${board._id}/action-items`,
        {
          task: newTaskText.trim(),
          assignee: newAssigneeText,
          dueDate: newDueDateText.trim(),
        },
      );

      const updatedNotes = response.data?.data?.notes || {};
      setActionItems(updatedNotes.actionItems || []);
      toast.success("Action item created successfully");
      setNewTaskText("");
      setNewAssigneeText("Unassigned");
      setNewDueDateText("");
      setIsAddingItem(false);
    } catch (error) {
      console.error("Failed to create manual action item:", error);
      const errMsg =
        error.response?.data?.message || "Failed to create action item";
      toast.error(errMsg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleToggleActionItem = async (idx, itemId) => {
    const item = actionItems[idx];
    const newStatus = item.status === "COMPLETED" ? "PENDING" : "COMPLETED";

    const updated = [...actionItems];
    updated[idx] = { ...item, status: newStatus };
    setActionItems(updated);

    if (itemId) {
      try {
        await apiRequest.patch(
          `/notes/${board._id}/ai-action-items/${itemId}`,
          {
            status: newStatus,
          },
        );
      } catch (error) {
        console.error("Failed to update action item status:", error);
        const rollbacked = [...actionItems];
        rollbacked[idx] = item;
        setActionItems(rollbacked);
      }
    }
  };

  const handleClearAllActionItems = async () => {
    if (isReadOnly) {
      toast.error("You are not authorized to clear action items.");
      return;
    }
    const confirmClear = window.confirm("Are you sure you want to clear all action items?");
    if (!confirmClear) return;

    try {
      await apiRequest.delete(`/notes/${board._id}/action-items`);
      setActionItems([]);
      toast.success("Action items cleared successfully");
    } catch (error) {
      console.error("Failed to clear action items:", error);
      toast.error("Failed to clear action items");
    }
  };


  React.useEffect(() => {
    if (
      isNotesOpen &&
      editorRef.current &&
      editorRef.current.innerHTML !== agendaText
    ) {
      editorRef.current.innerHTML = agendaText || "";
    }
  }, [isNotesOpen, board?._id]);

  if (!isNotesOpen) return null;

  const handleSaveAsNote = () => {
    const textToSave = editorRef.current?.innerText?.trim();
    if (!textToSave) {
      toast.error("Note cannot be empty");
      return;
    }

    const freshComment = {
      author: currentUser?.username || "Guest",
      text: textToSave,
      commentType: "note",
      createdAt: new Date().toISOString(),
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit("add-comment", {
        boardId: board._id,
        comment: freshComment,
      });
    } else {
      const updatedComments = [...comments, freshComment];
      setComments(updatedComments);

      enqueueOperation({
        type: "add-comment",
        payload: {
          boardId: board._id,
          comment: freshComment,
        },
      });
      toast("Note saved offline.", { icon: "🔌" });

      apiRequest
        .put(`/boards/${board._id}`, {
          comments: updatedComments,
        })
        .catch(() => {});
    }

    toast.success("Saved to All Notes");
    
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setAgendaText("");
    handleSaveNotes("");
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const freshComment = {
      author: currentUser?.username || "Guest",
      text: newComment.trim(),
      commentType: "comment",
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

      enqueueOperation({
        type: "add-comment",
        payload: {
          boardId: board._id,
          comment: freshComment,
        },
      });
      toast("Note saved offline.", { icon: "🔌" });

      apiRequest
        .put(`/boards/${board._id}`, {
          comments: updatedComments,
        })
        .catch(() => {});
    }
  };

  return (
    <aside
      className="fixed right-0 top-14 h-[calc(100%-56px)] w-[360px] bg-surface border-l border-outline-variant z-40 flex flex-col sidebar-transition shadow-float"
      id="notes-panel"
    >
      <div className="p-6 flex items-center justify-between border-b border-outline-variant">
        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Board Workspace
        </h3>
        <button
          onClick={toggleNotes}
          className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
          title="Collapse Panel"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex px-4 pt-4 relative bg-surface border-b border-outline-variant">
        <button
          onClick={() => setActiveRightTab("notes")}
          className={`flex-1 flex items-center justify-center space-x-2 pb-4 text-label-md font-bold transition-all relative cursor-pointer ${
            activeRightTab === "notes"
              ? "text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
          <span>Notes</span>
          {activeRightTab === "notes" && <div className="active-tab-indicator" />}
        </button>
        <button
          onClick={() => setActiveRightTab("ai")}
          className={`flex-1 flex items-center justify-center space-x-2 pb-4 text-label-md font-bold transition-all relative cursor-pointer ${
            activeRightTab === "ai"
              ? "text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">bolt</span>
          <span>AI</span>
          {activeRightTab === "ai" && <div className="active-tab-indicator" />}
        </button>
        <button
          onClick={() => {
            setActiveRightTab("history");
            fetchSnapshots();
          }}
          className={`flex-1 flex items-center justify-center space-x-2 pb-4 text-label-md font-bold transition-all relative cursor-pointer ${
            activeRightTab === "history"
              ? "text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          <span>History</span>
          {activeRightTab === "history" && <div className="active-tab-indicator" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {activeRightTab === "notes" && (
          <>
            <section>
              <h4 className="text-label-md text-outline uppercase tracking-wider mb-4">Active Editors</h4>
              <div className="flex space-x-4 flex-wrap gap-y-3">
                {(workspace?.members || []).map((member, mIdx) => {
                  const username = member.user?.username || "?";
                  const initials = username.slice(0, 2).toUpperCase();
                  const bgClasses = [
                    "bg-blue-100 text-blue-700 border-blue-300",
                    "bg-purple-100 text-purple-700 border-purple-300",
                    "bg-emerald-100 text-emerald-700 border-emerald-300",
                    "bg-amber-100 text-amber-700 border-amber-300",
                  ];
                  const colorClass = bgClasses[mIdx % bgClasses.length];

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
                  const isMe = String(member.user?._id || member.user) === String(currentUser?._id);

                  return (
                    <div key={member._id || mIdx} className={`flex flex-col items-center space-y-1 ${isOnline ? "" : "opacity-70"}`}>
                      <div className={`w-12 h-12 rounded-full border-2 p-[2px] transition-all ${isMe ? "border-primary" : "border-transparent"} ${isTyping ? "animate-bounce shadow-md" : ""}`}>
                        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs ${colorClass}`}>
                          {initials}
                        </div>
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {isMe ? "Me" : username.split(" ")[0]}
                      </span>
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
                    return (
                      <div key={collab.userId || gIdx} className="flex flex-col items-center space-y-1">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-outline-variant p-[2px]">
                          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-on-surface-variant">
                            {initials}
                          </div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {collab.username || "Guest"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-body-md font-semibold text-primary">Collaborative Notes</h4>
                {!isReadOnly && (
                  <div className="flex space-x-2 text-on-surface-variant">
                    <button
                      onClick={() => handleFormatCommand("bold")}
                      className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"
                      title="Bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">format_bold</span>
                    </button>
                    <button
                      onClick={() => handleFormatCommand("italic")}
                      className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"
                      title="Italic"
                    >
                      <span className="material-symbols-outlined text-[18px]">format_italic</span>
                    </button>
                    <button
                      onClick={() => handleFormatCommand("underline")}
                      className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"
                      title="Underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">format_underlined</span>
                    </button>
                    <button
                      onClick={() => handleFormatCommand("insertUnorderedList")}
                      className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer"
                      title="Bullet List"
                    >
                      <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="relative group w-full bg-surface rounded-xl border border-outline-variant focus-within:border-primary transition-all p-4 pb-14 min-h-[160px] flex flex-col">
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
                  className="w-full flex-1 outline-none text-body-sm text-on-surface-variant leading-relaxed min-h-[100px] overflow-y-auto"
                  placeholder={
                    isReadOnly
                      ? "Notes are read-only for viewer role..."
                      : "Start typing shared notes..."
                  }
                  suppressContentEditableWarning={true}
                />

                {typingCollaborators.length > 0 && (
                  <div className="flex items-center gap-1.5 text-primary bg-primary/5 border border-primary/10 rounded-lg px-2 py-1 animate-pulse select-none absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold">
                      {typingCollaborators
                        .map((c) => c.username || "Collaborator")
                        .join(", ")}{" "}
                      is typing...
                    </span>
                  </div>
                )}

                {!isReadOnly && (
                  <button
                    onClick={handleSaveAsNote}
                    className="absolute bottom-3 right-3 flex items-center space-x-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-bold shadow-soft hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Note</span>
                  </button>
                )}
              </div>
            </section>

            <section>
              <h4 className="text-label-md text-outline uppercase tracking-wider mb-4">All Notes</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {comments.filter((c) => c.commentType === "note").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes saved yet.</p>
                ) : (
                  comments
                    .filter((c) => c.commentType === "note")
                    .map((note, index) => {
                      const timeStr = note.createdAt
                        ? new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now";
                      const dateStr = note.createdAt
                        ? new Date(note.createdAt).toLocaleDateString()
                        : "";
                      
                      const bulletColors = ["bg-primary", "bg-tertiary-container", "bg-error"];
                      const bulletBg = bulletColors[index % bulletColors.length];

                      return (
                        <div
                          key={note._id || note.id || index}
                          className="p-4 bg-surface-container-low border border-outline-variant rounded-xl hover:shadow-soft transition-all cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${bulletBg}`}></span>
                            <h5 className="text-body-sm font-semibold text-on-surface truncate">
                              {note.text.split("\n")[0] || "Note"}
                            </h5>
                          </div>
                          <p className="text-[12px] text-on-surface-variant line-clamp-2 whitespace-pre-wrap">
                            {note.text}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-[10px] text-outline font-medium">
                              {timeStr} {dateStr && `• ${dateStr}`} • {note.author}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-outline hover:text-primary">
                              arrow_forward
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>

            <section>
              <h4 className="text-label-md text-outline uppercase tracking-wider mb-4">
                Recent Comments
              </h4>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {comments.filter((c) => c.commentType !== "note").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                ) : (
                  comments
                    .filter((c) => c.commentType !== "note")
                    .map((comment, index) => {
                      const timeStr = comment.createdAt
                        ? new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now";
                      
                      return (
                        <div
                          key={comment._id || comment.id || index}
                          className="p-3 bg-surface border border-outline-variant/30 rounded-xl flex gap-3 shadow-soft"
                        >
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-primary">
                            {comment.author.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm text-on-surface font-medium whitespace-pre-wrap">
                              {comment.text}
                            </p>
                            <span className="text-[9px] text-slate-400">
                              {timeStr} • {comment.author}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>
          </>
        )}

        {activeRightTab === "ai" && (
          <div className="space-y-6 flex flex-col h-full overflow-hidden">
            {!isReadOnly ? (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleExtractActions}
                  disabled={isLoadingActions}
                  className="w-full bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isLoadingActions ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      Extracting Action Items...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      Extract Action Items
                    </>
                  )}
                </button>
                {!isAddingItem ? (
                  <button
                    onClick={() => setIsAddingItem(true)}
                    className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer border border-outline-variant"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Manual Task
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateManualActionItem}
                    className="bg-surface-container-low p-4 border border-outline-variant rounded-2xl space-y-3.5 animate-in slide-in-from-top-3 duration-200"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        New Action Item
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-wider">
                        Task Description
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Implement payment integration"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-outline uppercase tracking-wider">
                          Assignee
                        </label>
                        <select
                          value={newAssigneeText}
                          onChange={(e) => setNewAssigneeText(e.target.value)}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                        >
                          <option value="Unassigned">Unassigned</option>
                          {workspaceMembers.map((m) => {
                            const name =
                              m.username || m.email || "Unknown User";
                            return (
                              <option key={m._id} value={m._id}>
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-outline uppercase tracking-wider">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={newDueDateText}
                          onChange={(e) => setNewDueDateText(e.target.value)}
                          className="w-full text-xs bg-surface border border-outline-variant rounded-lg p-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="px-3 py-1.5 border border-outline-variant hover:bg-surface-container text-[11px] font-bold rounded-lg text-on-surface-variant transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingItem}
                        className="px-3 py-1.5 bg-primary text-on-primary text-[11px] font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingItem ? (
                          <>
                            <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[12px]">add</span>
                            <span>Add Item</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-surface-container border border-outline-variant py-2.5 px-4 rounded-xl shadow-inner font-bold text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Viewer mode cannot trigger AI action extraction.</span>
              </div>
            )}

            {isLoadingActions ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-surface-container-low border border-dashed border-outline-variant rounded-2xl animate-pulse">
                <span className="material-symbols-outlined text-[36px] text-primary mb-3 animate-spin">sync</span>
                <p className="text-xs text-on-surface-variant font-bold">
                  Scanning meeting notes...
                </p>
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-surface-container-low border border-dashed border-outline-variant rounded-2xl">
                <span className="material-symbols-outlined text-[32px] text-outline mb-3">assignment_turned_in</span>
                <p className="text-xs text-on-surface-variant font-medium">
                  No action items extracted yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                    Extracted Tasks ({actionItems.length})
                  </span>
                  {!isReadOnly && actionItems.length > 0 && (
                    <button
                      onClick={handleClearAllActionItems}
                      className="text-[10px] text-outline hover:text-error font-bold transition-colors cursor-pointer"
                    >
                      Clear List
                    </button>
                  )}
                </div>

                <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {actionItems.map((item, idx) => {
                    const isCompleted = item.status === "COMPLETED";
                    return (
                      <div
                        key={item._id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 bg-surface shadow-sm hover:shadow-md ${
                          isCompleted
                            ? "border-outline-variant/30 opacity-70"
                            : "border-outline-variant"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() =>
                              handleToggleActionItem(idx, item._id)
                            }
                            className="mt-0.5 h-3.5 w-3.5 rounded text-primary border-outline-variant focus:ring-primary/20 cursor-pointer"
                          />
                          <span
                            className={`text-xs text-on-surface leading-relaxed font-sans font-medium flex-1 ${isCompleted ? "line-through text-on-surface-variant opacity-60" : ""}`}
                          >
                            {item.task}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.assignee && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/10 text-primary border border-primary/5">
                              <span className="material-symbols-outlined text-[10px]">person</span>
                              {item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/10 text-secondary border border-secondary/5">
                              <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                              {item.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeRightTab === "history" && (
          <div className="space-y-4 flex flex-col h-full overflow-hidden">
            {!isReadOnly && (
              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="w-full bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Save Current Version
              </button>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-label-md text-xs text-outline uppercase font-bold tracking-wider">
                  Saved Versions ({snapshots.length})
                </span>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-center py-12 px-4 bg-surface-container-low border border-dashed border-outline-variant rounded-2xl">
                  <span className="material-symbols-outlined text-[32px] text-outline mb-3">history</span>
                  <p className="text-xs text-on-surface-variant font-medium">
                    No snapshots saved yet.
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
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col gap-3.5 bg-surface shadow-sm hover:shadow-md ${
                        isCurrentlyPreviewed
                          ? "border-amber-400 bg-amber-50/10 shadow-amber-100/20"
                          : "border-outline-variant"
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <h4 className="text-xs font-bold text-on-surface line-clamp-2">
                          {snap.label ||
                            `Revision - ${new Date(snap.createdAt || snap.version).toLocaleDateString()}`}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-on-surface-variant opacity-75">
                          <span className="material-symbols-outlined text-[11px]">schedule</span>
                          <span>{dateStr}</span>
                        </div>
                        <div className="text-[10px] text-primary/80 font-bold mt-1">
                          by {creatorName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full mt-1 border-t border-outline-variant pt-2.5">
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
                            className="py-1.5 px-3 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all bg-primary-container/10 hover:bg-primary-container/20 text-primary active:scale-95 cursor-pointer text-center flex items-center gap-1 justify-center"
                          >
                            <span className="material-symbols-outlined text-[12px]">restore</span>
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
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
          {!isReadOnly ? (
            <form onSubmit={handleCommentSubmit} className="relative">
              <input
                className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-10 pr-12 text-body-sm focus:ring-1 focus:ring-primary outline-none"
                placeholder="Write a comment..."
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                chat_bubble_outline
              </span>
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold text-label-md hover:underline cursor-pointer"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant/70 bg-surface-container-low border border-outline-variant py-2.5 rounded-xl shadow-inner font-bold text-center">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Viewer mode is read-only.</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default NotesPanel;
