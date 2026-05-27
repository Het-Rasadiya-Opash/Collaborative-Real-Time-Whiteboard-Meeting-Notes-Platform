import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";
import {
  Briefcase,
  ArrowLeft,
  Search,
  PenTool,
  Clock,
  FileText,
  CheckCircle,
  Copy,
  ExternalLink,
  Lock,
  Calendar,
  User,
  Sparkles,
  Loader2,
  ListTodo,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";

const NotesPage = ({ workspace, onSelectWorkspace, onOpenBoard }) => {
  const [boards, setBoards] = useState([]);
  const [notesData, setNotesData] = useState({});
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' or 'actions'
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  const { currentUser } = useSelector((state) => state.users);

  const myMember = workspace?.members?.find(
    (m) => (m.user?._id || m.user) === currentUser?._id,
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

        if (boardList.length > 0) {
          setSelectedBoardId(boardList[0]._id);
        }

        const notePromises = boardList.map((b) =>
          apiRequest
            .get(`/notes/${b._id}`)
            .then((r) => ({ boardId: b._id, note: r.data?.data }))
            .catch(() => ({ boardId: b._id, note: null })),
        );

        const notesResults = await Promise.all(notePromises);
        if (!isMounted) return;

        const notesMap = {};
        notesResults.forEach((item) => {
          if (item.note) {
            notesMap[item.boardId] = item.note;
          }
        });
        setNotesData(notesMap);
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Failed to load workspace boards.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBoards(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspace]);

  const handleToggleActionItem = async (boardId, idx, itemId) => {
    const boardNotes = notesData[boardId];
    if (!boardNotes) return;

    const actionItem = boardNotes.actionItems[idx];
    const newStatus =
      actionItem.status === "Completed" ? "Pending" : "Completed";

    const updatedActionItems = [...boardNotes.actionItems];
    updatedActionItems[idx] = { ...actionItem, status: newStatus };

    setNotesData((prev) => ({
      ...prev,
      [boardId]: {
        ...boardNotes,
        actionItems: updatedActionItems,
      },
    }));

    if (itemId) {
      try {
        await apiRequest.patch(`/notes/${boardId}/ai-action-items/${itemId}`, {
          status: newStatus,
        });
      } catch (err) {
        toast.error("Failed to update status on server.");
        const rolledBackItems = [...boardNotes.actionItems];
        rolledBackItems[idx] = actionItem;
        setNotesData((prev) => ({
          ...prev,
          [boardId]: {
            ...boardNotes,
            actionItems: rolledBackItems,
          },
        }));
      }
    }
  };

  const handleExtractActions = async (boardId) => {
    if (isLoadingActions) return;
    const boardNotes = notesData[boardId];
    const boardObj = boards.find((b) => b._id === boardId);
    if (!boardObj) return;

    const textContent = boardNotes?.textContent || boardObj.meetingNotes || "";
    if (!textContent.trim()) {
      toast.error(
        "Notes are empty. Write some notes in the whiteboard editor first!",
      );
      return;
    }

    setIsLoadingActions(true);
    try {
      const response = await apiRequest.post(
        `/notes/${boardId}/ai-action-items`,
        { notesText: textContent },
      );
      const updatedNotes = response.data?.data;
      if (updatedNotes) {
        setNotesData((prev) => ({
          ...prev,
          [boardId]: updatedNotes,
        }));
        toast.success("AI Action Items extracted successfully!");
      }
    } catch (err) {
      toast.error("Failed to extract action items.");
    } finally {
      setIsLoadingActions(false);
    }
  };

  const handleCopyMarkdown = (boardId) => {
    const boardNotes = notesData[boardId];
    if (!boardNotes || !boardNotes.actionItems?.length) return;

    const markdown = boardNotes.actionItems
      .map(
        (item) =>
          `- [${item.status === "Completed" ? "x" : " "}] ${item.task} (Assignee: ${item.assignee || "Unassigned"}, Due: ${item.dueDate || "N/A"})`,
      )
      .join("\n");

    navigator.clipboard.writeText(markdown);
    toast.success("Action items copied to clipboard as Markdown!");
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (!workspace) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 animate-in fade-in duration-300">
        <div className="bg-surface border border-outline-variant/60 rounded-2xl p-10 text-center shadow-lg space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-50 border border-brand-100 text-primary rounded-2xl flex items-center justify-center shadow-inner">
            <Briefcase size={32} className="select-none" />
          </div>
          <h2 className="text-2xl font-black text-on-surface">
            No Workspace Selected
          </h2>
          <p className="text-on-surface-variant/80 text-sm max-w-sm">
            Launch a collaborative workspace from your dashboard to view,
            manage, and collaborate on meeting notes and task action items.
          </p>
          <button
            onClick={onSelectWorkspace}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer text-sm"
          >
            <ArrowLeft size={16} className="select-none" />
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  const filteredBoards = boards.filter((board) => {
    const titleMatch = board.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const noteContent = notesData[board._id]?.textContent || "";
    const noteMatch = noteContent
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return titleMatch || noteMatch;
  });

  const selectedBoard = boards.find((b) => b._id === selectedBoardId);
  const selectedNotes = selectedBoardId ? notesData[selectedBoardId] : null;

  const getActionItemStats = (boardId) => {
    const note = notesData[boardId];
    if (!note || !note.actionItems?.length)
      return { total: 0, completed: 0, percent: 0 };
    const total = note.actionItems.length;
    const completed = note.actionItems.filter(
      (item) => item.status === "Completed",
    ).length;
    const percent = Math.round((completed / total) * 100);
    return { total, completed, percent };
  };

  const selectedStats = selectedBoardId
    ? getActionItemStats(selectedBoardId)
    : { total: 0, completed: 0, percent: 0 };

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-on-surface mb-2">
            {workspace.name} Notes & Action Items
          </h2>
          <p className="text-base text-on-surface-variant">
            Track agendas, meeting reviews, and centralized AI tasks in
            real-time.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSelectWorkspace}
            className="px-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-semibold text-sm hover:bg-surface-container-low active:scale-98 transition-all flex items-center gap-2 cursor-pointer text-on-surface shadow-sm"
          >
            <ArrowLeft size={15} />
            Switch Workspace
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-outline select-none" size={18} />
          </span>
          <input
            type="text"
            placeholder="Search notes or boards by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-on-surface shadow-sm"
          />
        </div>
      </div>

      {isLoadingBoards ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-surface-variant/70 text-sm font-semibold animate-pulse">
            Retrieving notes database...
          </p>
        </div>
      ) : boards.length === 0 ? (
        <div className="bg-surface/30 border border-outline-variant/50 rounded-2xl py-20 text-center flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary/80 mb-1 shadow-inner">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-bold text-on-surface">
            No Boards Created
          </h3>
          <p className="text-xs text-on-surface-variant max-w-[280px] leading-relaxed">
            Create a whiteboard room from the Boards dashboard first to start
            editing meeting notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-outline px-2">
              Whiteboard Sessions ({filteredBoards.length})
            </h3>
            <div className="space-y-3">
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
                    className={`p-4 rounded-xl border cursor-pointer text-left transition-all duration-200 select-none ${
                      isSelected
                        ? "bg-surface-container-high border-primary shadow-sm"
                        : "bg-surface/50 border-outline-variant hover:bg-surface-container-low hover:border-outline"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-bold text-sm text-on-surface line-clamp-1">
                        {board.title}
                      </h4>
                      <span className="text-[10px] text-outline whitespace-nowrap">
                        {formatTimeAgo(board.updatedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant/80 line-clamp-2 mb-3 leading-relaxed">
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
                            className="bg-primary rounded-full h-1 transition-all duration-300"
                            style={{ width: `${stats.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBoards.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant/60 text-xs">
                  No matching boards found.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedBoard ? (
              <div className="glass-card bg-surface/50 border border-outline-variant/60 rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-300">
                <div className="p-6 bg-surface-container-low border-b border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-on-surface mb-1">
                      {selectedBoard.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Clock size={12} />
                      <span>
                        Last updated {formatTimeAgo(selectedBoard.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenBoard(selectedBoard)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:brightness-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    <PenTool size={14} />
                    Open Whiteboard
                    <ExternalLink size={12} />
                  </button>
                </div>

                <div className="flex border-b border-outline-variant/50 px-6 bg-surface-container-lowest select-none">
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                      activeTab === "notes"
                        ? "text-primary border-primary"
                        : "text-on-surface-variant/80 hover:text-on-surface border-transparent"
                    }`}
                  >
                    <FileText size={14} />
                    Meeting Notes
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ml-6 ${
                      activeTab === "actions"
                        ? "text-primary border-primary"
                        : "text-on-surface-variant/80 hover:text-on-surface border-transparent"
                    }`}
                  >
                    <ListTodo size={14} />
                    AI Action Items
                    {selectedStats.total > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {selectedStats.completed}/{selectedStats.total}
                      </span>
                    )}
                  </button>
                </div>

                <div className="p-6 min-h-[380px] flex flex-col justify-between">
                  <div>
                    {activeTab === "notes" && (
                      <div className="space-y-4">
                        {selectedNotes?.textContent ||
                        selectedBoard.meetingNotes ? (
                          <div className="bg-surface-bright border border-outline-variant/50 p-6 rounded-xl shadow-sm text-left">
                            <article
                              className="text-xs text-on-surface-variant leading-relaxed max-w-none rich-text-display font-sans"
                              dangerouslySetInnerHTML={{
                                __html:
                                  selectedNotes?.textContent ||
                                  selectedBoard.meetingNotes,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-16 bg-surface-bright border border-dashed border-outline-variant/80 rounded-xl">
                            <FileText
                              className="mx-auto text-outline/50 mb-3 opacity-60"
                              size={32}
                            />
                            <p className="text-xs text-on-surface-variant font-medium">
                              No notes exist for this board.
                            </p>
                            <p className="text-[10px] text-outline/80 mt-1">
                              Open the board workspace to begin writing
                              collaborative notes.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "actions" && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/40 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="font-bold text-xs uppercase tracking-wider text-outline">
                              Centralized Task Checklist ({selectedStats.total})
                            </span>
                          </div>

                          {!canModify ? (
                            <div className="bg-surface-container border border-outline-variant py-1.5 px-3 rounded-lg text-[10px] text-on-surface-variant font-bold flex items-center gap-1.5">
                              <Lock size={12} />
                              <span>Viewer Mode (Read-Only)</span>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {selectedStats.total > 0 && (
                                <button
                                  onClick={() =>
                                    handleCopyMarkdown(selectedBoardId)
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-outline-variant hover:bg-surface-container rounded-lg text-[11px] font-bold text-on-surface transition-colors cursor-pointer"
                                >
                                  <Copy size={12} />
                                  Copy Markdown
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleExtractActions(selectedBoardId)
                                }
                                disabled={isLoadingActions}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-[11px] hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isLoadingActions ? (
                                  <>
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                    Analyzing Notes...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} />
                                    Sync AI Tasks
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {selectedNotes?.actionItems &&
                        selectedNotes.actionItems.length > 0 ? (
                          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {selectedNotes.actionItems.map((item, idx) => {
                              const isCompleted = item.status === "Completed";
                              return (
                                <div
                                  key={item._id || idx}
                                  className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 bg-surface-bright shadow-sm ${
                                    isCompleted
                                      ? "border-outline-variant/30 opacity-70"
                                      : "border-outline-variant/60"
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 text-left">
                                    <input
                                      type="checkbox"
                                      checked={isCompleted}
                                      disabled={!canModify}
                                      onChange={() =>
                                        handleToggleActionItem(
                                          selectedBoardId,
                                          idx,
                                          item._id,
                                        )
                                      }
                                      className="mt-0.5 h-4 w-4 rounded text-primary border-outline-variant focus:ring-primary/20 cursor-pointer disabled:pointer-events-none"
                                    />
                                    <span
                                      className={`text-xs text-on-surface font-medium leading-relaxed font-sans ${
                                        isCompleted
                                          ? "line-through text-on-surface-variant opacity-60"
                                          : ""
                                      }`}
                                    >
                                      {item.task}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {item.assignee && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/5">
                                        <User size={10} />
                                        {item.assignee}
                                      </span>
                                    )}
                                    {item.dueDate && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/5">
                                        <Calendar size={10} />
                                        {item.dueDate}
                                      </span>
                                    )}
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isCompleted
                                          ? "bg-green-500/10 text-green-600 border border-green-500/5"
                                          : "bg-amber-500/10 text-amber-600 border border-amber-500/5"
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-16 bg-surface-bright border border-dashed border-outline-variant/80 rounded-xl">
                            <CheckSquare
                              className="mx-auto text-outline/50 mb-3 opacity-60"
                              size={32}
                            />
                            <p className="text-xs text-on-surface-variant font-medium">
                              No action items created yet.
                            </p>
                            {canModify ? (
                              <p className="text-[10px] text-outline/80 mt-1">
                                Click "Sync AI Tasks" above to extract
                                actionable items using AI!
                              </p>
                            ) : (
                              <p className="text-[10px] text-outline/80 mt-1">
                                No items have been extracted for this whiteboard
                                room yet.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedStats.total > 0 && (
                    <div className="border-t border-outline-variant/40 pt-6 mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-left">
                        <h4 className="font-bold text-xs text-on-surface mb-0.5">
                          Workspace Session Progress
                        </h4>
                        <p className="text-[11px] text-on-surface-variant">
                          Completed {selectedStats.completed} of{" "}
                          {selectedStats.total} total extracted tasks.
                        </p>
                      </div>
                      <div className="w-full sm:w-1/2 flex items-center gap-3">
                        <div className="flex-1 bg-outline-variant/45 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all duration-300"
                            style={{ width: `${selectedStats.percent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black text-primary min-w-[36px] text-right">
                          {selectedStats.percent}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-surface/30 border border-outline-variant/50 rounded-2xl">
                <FileText className="text-outline/40 mb-3" size={32} />
                <p className="text-xs text-on-surface-variant">
                  Select a session from the left sidebar directory to display
                  its details.
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
