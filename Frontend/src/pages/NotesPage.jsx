import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";
import {
  Briefcase, ArrowLeft, Search, PenTool, Clock, FileText,
  CheckCircle, Copy, ExternalLink, Lock, Calendar, User,
  Sparkles, Loader2, ListTodo, CheckSquare, LayoutDashboard,
  PinIcon, ClipboardList, Users, Settings, PlusCircle,
  HelpCircle, LogOut, Bell, History, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const NotesPage = ({ workspace, onSelectWorkspace, onOpenBoard }) => {
  const [boards, setBoards] = useState([]);
  const [notesData, setNotesData] = useState({});
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("notes");
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  const { currentUser } = useSelector((state) => state.users);

  const myMember = workspace?.members?.find(
    (m) => (m.user?._id || m.user) === currentUser?._id
  );
  const myRole =
    workspace?.owner?._id === currentUser?._id ||
    workspace?.owner === currentUser?._id
      ? "OWNER"
      : myMember?.role || "VIEWER";
  const canModify = myRole === "OWNER" || myRole === "EDITOR";

  useEffect(() => {
    if (!workspace) return;
    let isMounted = true;
    setIsLoadingBoards(true);

    apiRequest
      .get(`/boards/workspace/${workspace._id}`)
      .then(async (response) => {
        if (!isMounted) return;
        const boardList = response.data?.data || [];
        setBoards(boardList);
        if (boardList.length > 0) setSelectedBoardId(boardList[0]._id);

        const notePromises = boardList.map((b) =>
          apiRequest
            .get(`/notes/${b._id}`)
            .then((r) => ({ boardId: b._id, note: r.data?.data }))
            .catch(() => ({ boardId: b._id, note: null }))
        );
        const notesResults = await Promise.all(notePromises);
        if (!isMounted) return;
        const notesMap = {};
        notesResults.forEach((item) => {
          if (item.note) notesMap[item.boardId] = item.note;
        });
        setNotesData(notesMap);
      })
      .catch(() => { if (isMounted) toast.error("Failed to load workspace boards."); })
      .finally(() => { if (isMounted) setIsLoadingBoards(false); });

    return () => { isMounted = false; };
  }, [workspace]);

  const handleToggleActionItem = async (boardId, idx, itemId) => {
    const boardNotes = notesData[boardId];
    if (!boardNotes) return;
    const actionItem = boardNotes.actionItems[idx];
    const newStatus = actionItem.status === "Completed" ? "Pending" : "Completed";
    const updatedActionItems = [...boardNotes.actionItems];
    updatedActionItems[idx] = { ...actionItem, status: newStatus };
    setNotesData((prev) => ({ ...prev, [boardId]: { ...boardNotes, actionItems: updatedActionItems } }));
    if (itemId) {
      try {
        await apiRequest.patch(`/notes/${boardId}/ai-action-items/${itemId}`, { status: newStatus });
      } catch {
        toast.error("Failed to update status on server.");
        const rolledBack = [...boardNotes.actionItems];
        rolledBack[idx] = actionItem;
        setNotesData((prev) => ({ ...prev, [boardId]: { ...boardNotes, actionItems: rolledBack } }));
      }
    }
  };

  const handleExtractActions = async (boardId) => {
    if (isLoadingActions) return;
    const boardNotes = notesData[boardId];
    const boardObj = boards.find((b) => b._id === boardId);
    if (!boardObj) return;
    const textContent = boardNotes?.textContent || boardObj.meetingNotes || "";
    if (!textContent.trim()) { toast.error("Notes are empty. Write some notes first!"); return; }
    setIsLoadingActions(true);
    try {
      const response = await apiRequest.post(`/notes/${boardId}/ai-action-items`, { notesText: textContent });
      const updatedNotes = response.data?.data;
      if (updatedNotes) {
        setNotesData((prev) => ({ ...prev, [boardId]: updatedNotes }));
        toast.success("AI Action Items extracted successfully!");
      }
    } catch { toast.error("Failed to extract action items."); }
    finally { setIsLoadingActions(false); }
  };

  const handleCopyMarkdown = (boardId) => {
    const boardNotes = notesData[boardId];
    if (!boardNotes?.actionItems?.length) return;
    const markdown = boardNotes.actionItems
      .map((item) => `- [${item.status === "Completed" ? "x" : " "}] ${item.task} (Assignee: ${item.assignee || "Unassigned"}, Due: ${item.dueDate || "N/A"})`)
      .join("\n");
    navigator.clipboard.writeText(markdown);
    toast.success("Copied to clipboard as Markdown!");
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const diffMins = Math.floor((new Date() - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getActionItemStats = (boardId) => {
    const note = notesData[boardId];
    if (!note?.actionItems?.length) return { total: 0, completed: 0, percent: 0 };
    const total = note.actionItems.length;
    const completed = note.actionItems.filter((i) => i.status === "Completed").length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  };

  /* ── No workspace selected ── */
  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="glass-card rounded-2xl p-12 text-center space-y-6 flex flex-col items-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-primary rounded-2xl flex items-center justify-center shadow-inner">
            <Briefcase size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-on-surface mb-2">No Workspace Selected</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Launch a collaborative workspace to view meeting notes and action items.
            </p>
          </div>
          <button
            onClick={onSelectWorkspace}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2 text-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  const filteredBoards = boards.filter((board) => {
    const titleMatch = board.title.toLowerCase().includes(searchQuery.toLowerCase());
    const noteMatch = (notesData[board._id]?.textContent || "").toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || noteMatch;
  });

  const selectedBoard = boards.find((b) => b._id === selectedBoardId);
  const selectedNotes = selectedBoardId ? notesData[selectedBoardId] : null;
  const selectedStats = selectedBoardId ? getActionItemStats(selectedBoardId) : { total: 0, completed: 0, percent: 0 };

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-8 space-y-6 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface mb-1">
            {workspace.name} Notes &amp; Action Items
          </h1>
          <p className="text-sm text-on-surface-variant">
            Track agendas, meeting reviews, and centralized AI tasks in real-time.
          </p>
        </div>
        <button
          onClick={onSelectWorkspace}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-outline-variant rounded-xl text-on-surface font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={15} />
          Switch Workspace
        </button>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
        <input
          type="text"
          placeholder="Search notes or boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface shadow-sm"
        />
      </div>

      {isLoadingBoards ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant animate-pulse font-semibold">Retrieving notes database...</p>
        </div>
      ) : boards.length === 0 ? (
        <div className="glass-card rounded-2xl py-20 text-center flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary/70">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-on-surface">No Boards Created</h3>
          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
            Create a whiteboard room from the Boards dashboard first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">
              Whiteboard Sessions ({filteredBoards.length})
            </h3>

            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filteredBoards.map((board) => {
                const isSelected = board._id === selectedBoardId;
                const stats = getActionItemStats(board._id);
                const note = notesData[board._id];
                const previewText = note?.textContent
                  ? note.textContent.replace(/<[^>]*>/g, " ").trim()
                  : "No notes written yet.";

                return (
                  <div
                    key={board._id}
                    onClick={() => setSelectedBoardId(board._id)}
                    className={`glass-card p-4 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? "ring-1 ring-primary/20 border-primary/30 bg-blue-50/60"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ transform: "none" }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-bold text-sm line-clamp-1 ${isSelected ? "text-primary" : "text-on-surface"}`}>
                        {board.title}
                      </h4>
                      <span className="text-[10px] text-on-surface-variant whitespace-nowrap ml-2">
                        {formatTimeAgo(board.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
                      {previewText}
                    </p>
                    {stats.total > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-primary">AI Action Items</span>
                          <span className="text-on-surface-variant">
                            {stats.completed}/{stats.total} ({stats.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-outline-variant/40 rounded-full h-1">
                          <div
                            className="bg-primary rounded-full h-1 transition-all duration-500"
                            style={{ width: `${stats.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBoards.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant text-xs">
                  No matching boards found.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedBoard ? (
              <div className="glass-card rounded-2xl overflow-hidden" style={{ transform: "none" }}>
                <div className="p-6 border-b border-outline-variant bg-white/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-black text-on-surface">{selectedBoard.title}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1">
                      <Clock size={13} />
                      <span>Last updated {formatTimeAgo(selectedBoard.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenBoard(selectedBoard)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    <PenTool size={14} />
                    Open Whiteboard
                    <ExternalLink size={12} />
                  </button>
                </div>

                <div className="flex gap-8 px-6 border-b border-outline-variant bg-white/40">
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`py-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === "notes"
                        ? "text-primary border-primary"
                        : "text-on-surface-variant border-transparent hover:text-on-surface"
                    }`}
                  >
                    <FileText size={15} />
                    Meeting Notes
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`py-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === "actions"
                        ? "text-primary border-primary"
                        : "text-on-surface-variant border-transparent hover:text-on-surface"
                    }`}
                  >
                    <ListTodo size={15} />
                    AI Action Items
                    {selectedStats.total > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {selectedStats.completed}/{selectedStats.total}
                      </span>
                    )}
                  </button>
                </div>

                <div className="p-6 min-h-[380px] flex flex-col justify-between space-y-6">
                  <div>
                    {activeTab === "notes" && (
                      <div>
                        {selectedNotes?.textContent || selectedBoard.meetingNotes ? (
                          <div className="bg-white border border-outline-variant/50 p-6 rounded-xl shadow-sm">
                            <article
                              className="text-xs text-on-surface-variant leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: selectedNotes?.textContent || selectedBoard.meetingNotes,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-16 border border-dashed border-outline-variant rounded-xl bg-white/50">
                            <FileText className="mx-auto text-outline/50 mb-3" size={32} />
                            <p className="text-xs text-on-surface-variant font-medium">No notes for this board.</p>
                            <p className="text-[10px] text-outline mt-1">Open the whiteboard to start writing.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "actions" && (
                      <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-outline-variant/40">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                              Centralized Task Checklist ({selectedStats.total})
                            </span>
                          </div>
                          {!canModify ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface-variant">
                              <Lock size={12} />
                              Viewer Mode (Read-Only)
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {selectedStats.total > 0 && (
                                <button
                                  onClick={() => handleCopyMarkdown(selectedBoardId)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-outline-variant hover:bg-surface-container rounded-lg text-[11px] font-bold text-on-surface transition-colors cursor-pointer"
                                >
                                  <Copy size={12} />
                                  Copy Markdown
                                </button>
                              )}
                              <button
                                onClick={() => handleExtractActions(selectedBoardId)}
                                disabled={isLoadingActions}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-[11px] hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isLoadingActions ? (
                                  <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
                                ) : (
                                  <><Sparkles size={12} /> Sync AI Tasks</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {selectedNotes?.actionItems?.length > 0 ? (
                          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {selectedNotes.actionItems.map((item, idx) => {
                              const isCompleted = item.status === "Completed";
                              return (
                                <div
                                  key={item._id || idx}
                                  className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${
                                    isCompleted ? "border-outline-variant/30 opacity-60" : "border-outline-variant hover:border-blue-200"
                                  }`}
                                >
                                  <div className="flex gap-3 items-start">
                                    <input
                                      type="checkbox"
                                      checked={isCompleted}
                                      disabled={!canModify}
                                      onChange={() => handleToggleActionItem(selectedBoardId, idx, item._id)}
                                      className="mt-0.5 h-4 w-4 rounded text-primary border-outline-variant focus:ring-primary/20 cursor-pointer disabled:pointer-events-none"
                                    />
                                    <div className="flex-1 space-y-2.5">
                                      <p className={`text-xs font-medium text-on-surface leading-relaxed ${isCompleted ? "line-through opacity-60" : ""}`}>
                                        {item.task}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {item.assignee && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/10">
                                            <User size={10} />{item.assignee}
                                          </span>
                                        )}
                                        {item.dueDate && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant">
                                            <Calendar size={10} />{item.dueDate}
                                          </span>
                                        )}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          isCompleted
                                            ? "bg-green-500/10 text-green-600 border border-green-500/10"
                                            : "bg-amber-500/10 text-amber-600 border border-amber-500/10"
                                        }`}>
                                          {item.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-16 border border-dashed border-outline-variant rounded-xl bg-white/50">
                            <CheckSquare className="mx-auto text-outline/50 mb-3" size={32} />
                            <p className="text-xs text-on-surface-variant font-medium">No action items yet.</p>
                            {canModify ? (
                              <p className="text-[10px] text-outline mt-1">Click "Sync AI Tasks" to extract items using AI!</p>
                            ) : (
                              <p className="text-[10px] text-outline mt-1">No items extracted for this board yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedStats.total > 0 && (
                    <div className="border-t border-outline-variant/40 pt-5 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-xs font-bold text-on-surface">Workspace Session Progress</p>
                          <p className="text-[11px] text-on-surface-variant">
                            Completed {selectedStats.completed} of {selectedStats.total} total extracted tasks.
                          </p>
                        </div>
                        <span className="text-sm font-black text-primary">{selectedStats.percent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-outline-variant/30 rounded-full overflow-hidden border border-outline-variant/20">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700 relative overflow-hidden"
                          style={{ width: `${selectedStats.percent}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24" style={{ transform: "none" }}>
                <FileText className="text-outline/40 mb-3" size={32} />
                <p className="text-xs text-on-surface-variant">
                  Select a session from the left to display its details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
