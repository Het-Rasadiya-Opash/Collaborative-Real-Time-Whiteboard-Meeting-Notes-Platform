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
      className="fixed right-0 top-14 h-[calc(100%-56px)] w-[360px] bg-white border-l border-outline-variant z-40 flex flex-col sidebar-transition"
      id="notes-panel"
    >
      <div className="p-6 flex items-center justify-between border-b border-outline-variant">
        <h3 className="font-headline-sm text-headline-sm font-bold text-on-background">
          Board Workspace
        </h3>
        <button
          onClick={toggleNotes}
          className="text-secondary hover:text-on-background transition-colors cursor-pointer flex items-center justify-center"
          title="Collapse Panel"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-2 flex bg-slate-50 border-b border-outline-variant gap-1.5">
        <button
          onClick={() => setActiveRightTab("notes")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeRightTab === "notes"
              ? "bg-white text-primary shadow-sm"
              : "text-secondary hover:bg-white/50"
          }`}
        >
          <FileText size={16} />
          Notes
        </button>
        <button
          onClick={() => setActiveRightTab("ai")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeRightTab === "ai"
              ? "bg-white text-primary shadow-sm"
              : "text-secondary hover:bg-white/50"
          }`}
        >
          <Sparkles size={16} />
          AI
        </button>
        <button
          onClick={() => {
            setActiveRightTab("history");
            fetchSnapshots();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeRightTab === "history"
              ? "bg-white text-primary shadow-sm"
              : "text-secondary hover:bg-white/50"
          }`}
        >
          <History size={16} />
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {activeRightTab === "notes" && (
          <>
            <div>
              <h4 className="text-label-md font-bold uppercase text-slate-400 tracking-widest mb-4">
                Active Editors
              </h4>
              <div className="flex flex-wrap gap-3">
                {(workspace?.members || []).map((member, mIdx) => {
                  const username = member.user?.username || "?";
                  const initials = username.slice(0, 2).toUpperCase();
                  const colors = [
                    "bg-note-blue text-primary border-primary",
                    "bg-note-purple text-purple-700 border-purple-300",
                    "bg-note-green text-emerald-700 border-emerald-300",
                    "bg-note-yellow text-amber-700 border-amber-300",
                  ];
                  const colorClass = colors[mIdx % colors.length];

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
                    <div key={member._id || mIdx} className="relative">
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs ${colorClass} ${isTyping ? "animate-bounce shadow-md" : ""}`}
                        title={`${username} ${isOnline ? "(Online)" : "(Offline)"}`}
                      >
                        {initials}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online border-2 border-white rounded-full"></div>
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
                    return (
                      <div key={collab.userId || gIdx} className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center font-bold text-xs text-secondary">
                          {initials}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online border-2 border-white rounded-full"></div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-primary font-headline-sm">
                  Collaborative Notes
                </h4>
                {!isReadOnly && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => handleFormatCommand("bold")}
                      className="p-1 hover:bg-white rounded transition-all text-secondary"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      onClick={() => handleFormatCommand("italic")}
                      className="p-1 hover:bg-white rounded transition-all text-secondary"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      onClick={() => handleFormatCommand("underline")}
                      className="p-1 hover:bg-white rounded transition-all text-secondary"
                      title="Underline"
                    >
                      <Underline size={14} />
                    </button>
                    <div className="w-[1px] h-4 bg-outline-variant mx-1"></div>
                    <button
                      onClick={() => handleFormatCommand("insertUnorderedList")}
                      className="p-1 hover:bg-white rounded transition-all text-secondary"
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button
                      onClick={() => handleFormatCommand("removeFormat")}
                      className="p-1 hover:bg-white rounded transition-all text-secondary"
                      title="Clear Formatting"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 border border-outline-variant rounded-xl p-4 text-secondary font-body-md bg-slate-50/30 overflow-y-auto relative flex flex-col">
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
                  className="w-full flex-1 outline-none text-xs text-on-surface-variant leading-relaxed"
                  placeholder={
                    isReadOnly
                      ? "Notes are read-only for viewer role..."
                      : "Type meeting agenda or collaborate on notes here..."
                  }
                  suppressContentEditableWarning={true}
                />

                {typingCollaborators.length > 0 && (
                  <div className="flex items-center gap-1.5 text-primary bg-primary/5 border border-primary/10 rounded-lg px-2 py-1.5 animate-pulse mt-2 select-none self-start">
                    <span className="text-[10px] font-bold">
                      {typingCollaborators
                        .map((c) => c.username || "Collaborator")
                        .join(", ")}{" "}
                      is typing...
                    </span>
                  </div>
                )}
                
                {!isReadOnly && (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSaveAsNote}
                      className="bg-primary hover:bg-primary/95 text-white font-bold text-[11px] py-1.5 px-4 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                      Save Note
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-label-md font-bold uppercase text-slate-400 tracking-widest mb-4">
                All Notes
              </h4>
              <div className="space-y-4 max-h-[150px] overflow-y-auto pr-1">
                {comments.filter(c => c.commentType === "note").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes saved yet.</p>
                ) : (
                  comments.filter(c => c.commentType === "note").map((note, index) => (
                    <div
                      key={note._id || note.id || index}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-note-blue flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-700">
                        {note.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex-1">
                        <p className="text-body-sm mb-1 text-on-surface font-semibold">
                          {note.text}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {note.createdAt
                            ? new Date(note.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-outline-variant/50">
              <h4 className="text-label-md font-bold uppercase text-slate-400 tracking-widest mb-4">
                Recent Comments
              </h4>
              <div className="space-y-4 max-h-[150px] overflow-y-auto pr-1">
                {comments.filter(c => c.commentType !== "note").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                ) : (
                  comments.filter(c => c.commentType !== "note").map((comment, index) => (
                    <div
                      key={comment._id || comment.id || index}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-note-purple flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-purple-700">
                        {comment.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-outline-variant/30 flex-1">
                        <p className="text-body-sm mb-1 text-on-surface font-semibold">
                          {comment.text}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
                      <Loader2 size={16} className="animate-spin" />
                      Extracting Action Items...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      Extract Action Items
                    </>
                  )}
                </button>
                {!isAddingItem ? (
                  <button
                    onClick={() => setIsAddingItem(true)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer border border-slate-200"
                  >
                    <Plus size={14} />
                    Add Manual Task
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateManualActionItem}
                    className="bg-slate-50 p-4 border border-outline-variant/60 rounded-2xl space-y-3.5 animate-in slide-in-from-top-3 duration-200"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        New Action Item
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="text-secondary hover:text-on-background"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Task Description
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Implement payment integration"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Assignee
                        </label>
                        <select
                          value={newAssigneeText}
                          onChange={(e) => setNewAssigneeText(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800 cursor-pointer"
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
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={newDueDateText}
                          onChange={(e) => setNewDueDateText(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold rounded-lg text-slate-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingItem}
                        className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingItem ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span>Add Item</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-surface-container-high border border-outline-variant/65 py-2.5 px-4 rounded-xl shadow-inner font-bold text-center text-xs text-on-surface-variant/70 flex items-center justify-center gap-2">
                <Lock size={14} />
                <span>Viewer mode cannot trigger AI action extraction.</span>
              </div>
            )}

            {isLoadingActions ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-surface-container/30 border border-dashed border-outline-variant/80 rounded-2xl animate-pulse">
                <Loader2
                  className="mx-auto text-primary mb-3 animate-spin"
                  size={36}
                />
                <p className="text-xs text-on-surface-variant font-bold">
                  Scanning meeting notes...
                </p>
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-center py-12 px-4 bg-surface-container/30 border border-dashed border-outline-variant/80 rounded-2xl">
                <ClipboardCheck
                  className="mx-auto text-outline/50 mb-3 opacity-75"
                  size={32}
                />
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
                      className="text-[10px] text-outline hover:text-red-500 font-bold transition-colors cursor-pointer"
                    >
                      Clear List
                    </button>
                  )}
                </div>

                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {actionItems.map((item, idx) => {
                    const isCompleted = item.status === "COMPLETED";
                    return (
                      <div
                        key={item._id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 bg-white shadow-sm hover:shadow-md ${
                          isCompleted
                            ? "border-outline-variant/30 opacity-70"
                            : "border-outline-variant/60"
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/5">
                              <User size={10} />
                              {item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/5">
                              <Calendar size={10} />
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
                <Plus size={16} />
                Save Current Version
              </button>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center gap-2 mb-2">
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
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col gap-3.5 bg-white shadow-sm hover:shadow-md ${
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
                              : "bg-slate-100 hover:bg-slate-200 text-on-surface-variant"
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
                            <RotateCcw size={12} />
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
        <div className="p-4 border-t border-outline-variant bg-slate-50">
          {!isReadOnly ? (
            <form onSubmit={handleCommentSubmit} className="relative">
              <input
                className="w-full pl-10 pr-16 py-3 border border-outline-variant rounded-xl focus:ring-primary focus:border-primary font-body-sm bg-white"
                placeholder="Write a comment..."
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <MessageSquare size={16} />
              </span>
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-label-md hover:underline font-bold"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant/70 bg-surface-container-high border border-outline-variant/65 py-2.5 rounded-full shadow-inner font-bold text-center">
              <Lock size={14} />
              <span>Viewer mode is read-only.</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default NotesPanel;
