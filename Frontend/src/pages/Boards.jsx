import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";
import {
  Briefcase,
  ArrowLeft,
  Filter,
  Plus,
  Search,
  Palette,
  Star,
  PenTool,
  Brush,
  Workflow,
  LayoutDashboard,
  MoreVertical,
  PlusCircle,
  X,
  Clock,
  Grid,
  Lock,
} from "lucide-react";

const Boards = ({ workspace, onSelectWorkspace, onOpenBoard }) => {
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [activeTab, setActiveTab] = useState("all");

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
    setIsLoading(true);

    apiRequest
      .get(`/boards/workspace/${workspace._id}`)
      .then((response) => {
        if (isMounted) {
          setBoards(response.data?.data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspace, refreshKey]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!workspace) return;

    setIsCreating(true);
    try {
      const title = newBoardTitle.trim() || "Untitled Board";
      const response = await apiRequest.post(
        `/boards/${workspace._id}/create`,
        {
          title,
        },
      );
      setNewBoardTitle("");
      setIsModalOpen(false);
      setRefreshKey((key) => key + 1);

      const newBoard = response.data?.data?.board;
      if (newBoard) {
        onOpenBoard(newBoard);
      }
    } catch {
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStar = async (e, boardId) => {
    e.stopPropagation();
    try {
      const response = await apiRequest.post(`/boards/${boardId}/star`);
      const updatedBoard = response.data?.data;
      if (updatedBoard) {
        setBoards((prevBoards) =>
          prevBoards.map((b) =>
            b._id === boardId
              ? {
                  ...b,
                  isStarred: updatedBoard.isStarred,
                  starredCount: updatedBoard.starredCount,
                }
              : b,
          ),
        );
      }
    } catch {}
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
            manage, and create whiteboard systems.
          </p>
          <button
            onClick={onSelectWorkspace}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer text-sm font-semibold"
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
    const ownerMatch =
      board.owner?.username &&
      board.owner.username.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || ownerMatch;
  });

  let tabBoards = [...filteredBoards];
  if (activeTab === "starred") {
    tabBoards = tabBoards.filter((board) => board.isStarred);
  } else if (activeTab === "recent") {
    tabBoards = tabBoards.filter((board) => board.myLastOpenedAt);
  }

  const sortedBoards = [...tabBoards].sort((a, b) => {
    if (activeTab === "recent") {
      return new Date(b.myLastOpenedAt) - new Date(a.myLastOpenedAt);
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const getBoardVisual = (title, index) => {
    const visuals = [
      {
        gradient: "from-blue-500/10 to-indigo-500/10",
        textGradient: "from-blue-600 to-indigo-600",
        icon: PenTool,
        accent: "text-blue-500",
      },
      {
        gradient: "from-emerald-500/10 to-teal-500/10",
        textGradient: "from-emerald-600 to-teal-600",
        icon: Brush,
        accent: "text-emerald-500",
      },
      {
        gradient: "from-purple-500/10 to-pink-500/10",
        textGradient: "from-purple-600 to-pink-600",
        icon: Workflow,
        accent: "text-purple-500",
      },
      {
        gradient: "from-amber-500/10 to-orange-500/10",
        textGradient: "from-amber-600 to-orange-600",
        icon: LayoutDashboard,
        accent: "text-amber-500",
      },
    ];
    return visuals[index % visuals.length];
  };

  const getInitials = (username) => {
    if (!username) return "M";
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarBg = (username) => {
    if (!username) return "bg-primary text-on-primary";
    const charCodeSum = username
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-brand-600 text-white shadow-sm shadow-brand-100",
      "bg-emerald-600 text-white shadow-sm shadow-emerald-100",
      "bg-amber-600 text-white shadow-sm shadow-amber-100",
      "bg-purple-600 text-white shadow-sm shadow-purple-100",
      "bg-cyan-600 text-white shadow-sm shadow-cyan-100",
    ];
    return colors[charCodeSum % colors.length];
  };

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-on-surface mb-2">
            {workspace.name} Boards
          </h2>
          <p className="text-base text-on-surface-variant">
            Visualize your ideas and collaborate in real-time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              setSortBy((prev) =>
                prev === "updatedAt" ? "title" : "updatedAt",
              )
            }
            className="px-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-semibold text-sm hover:bg-surface-container-low active:scale-98 transition-all flex items-center gap-2 cursor-pointer text-on-surface shadow-sm"
          >
            <Filter size={15} className="select-none" />
            Sort: {sortBy === "updatedAt" ? "Recent" : "Alphabetical"}
          </button>
          {canModify ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} className="select-none" />
              Create New Board
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-surface-container-high border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-lg shadow-sm">
              <Lock size={14} className="text-outline" />
              <span className="font-bold">Viewer Mode (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-outline select-none" size={18} />
          </span>
          <input
            type="text"
            placeholder="Search boards by title or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-on-surface shadow-sm"
          />
        </div>
      </div>

      <div className="flex border-b border-outline-variant/60 mb-8 gap-6 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-on-surface-variant/75 hover:text-on-surface"
          }`}
        >
          <Grid size={15} />
          All Boards
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "recent"
              ? "text-primary border-b-2 border-primary"
              : "text-on-surface-variant/75 hover:text-on-surface"
          }`}
        >
          <Clock size={15} />
          Last Opened
        </button>
        <button
          onClick={() => setActiveTab("starred")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "starred"
              ? "text-primary border-b-2 border-primary"
              : "text-on-surface-variant/75 hover:text-on-surface"
          }`}
        >
          <Star size={15} />
          Starred
          {boards.filter((b) => b.isStarred).length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {boards.filter((b) => b.isStarred).length}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-surface-variant/70 text-sm font-semibold animate-pulse">
            Loading whiteboard rooms...
          </p>
        </div>
      ) : sortedBoards.length === 0 ? (
        /* Empty State */
        <div className="bg-surface/30 border border-outline-variant/50 rounded-2xl py-20 text-center flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary/80 mb-1 shadow-inner">
            {activeTab === "starred" ? (
              <Star className="text-amber-500 fill-amber-500/20" size={24} />
            ) : activeTab === "recent" ? (
              <Clock className="text-primary/70" size={24} />
            ) : (
              <Palette size={24} />
            )}
          </div>
          <h3 className="text-lg font-bold text-on-surface">
            {activeTab === "starred"
              ? "No Starred Boards"
              : activeTab === "recent"
                ? "No Recently Opened Boards"
                : "No Boards Found"}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-[280px] leading-relaxed">
            {searchQuery
              ? "Try refining your search query."
              : activeTab === "starred"
                ? "Star your favorite boards to access them quickly here."
                : activeTab === "recent"
                  ? "Open a board to see it in your recently viewed list."
                  : "Establish a new whiteboard space to start visual notes collaborative drafting."}
          </p>
          {activeTab === "all" && !searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              Add Your First Board
            </button>
          )}
        </div>
      ) : (
        /* Board Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
          {sortedBoards.map((board, index) => {
            const visual = getBoardVisual(board.title, index);
            const VisualIcon = visual.icon;
            return (
              <div
                key={board._id}
                onClick={() => onOpenBoard(board)}
                className="glass-card bg-surface/50 border border-outline-variant/60 rounded-xl overflow-hidden group cursor-pointer flex flex-col justify-between h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative min-h-[260px]"
              >
                <div
                  className={`h-32 bg-gradient-to-br ${visual.gradient} flex items-center justify-center relative overflow-hidden border-b border-outline-variant/40`}
                >
                  <VisualIcon
                    className={`w-16 h-16 ${visual.accent} select-none transition-transform duration-500 group-hover:scale-110`}
                    size={64}
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => handleToggleStar(e, board._id)}
                      className="p-1.5 rounded-full bg-white/95 hover:bg-white shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer text-outline hover:text-amber-500"
                    >
                      <Star
                        className={
                          board.isStarred
                            ? "fill-amber-500 text-amber-500 select-none"
                            : "select-none text-outline"
                        }
                        size={16}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-bold text-base text-on-surface mb-2.5 truncate group-hover:text-primary transition-colors">
                      {board.title}
                    </h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${getAvatarBg(board.owner?.username)}`}
                      >
                        {getInitials(board.owner?.username)}
                      </div>
                      <span className="text-xs text-on-surface-variant font-semibold truncate max-w-[150px]">
                        {board.owner?.username || "Workspace Member"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-outline text-[11px] font-medium border-t border-outline-variant/35 pt-3">
                    <span className="truncate max-w-[200px]">
                      {board.lastOpenedAt ? (
                        <span className="flex items-center gap-1 text-primary font-semibold truncate">
                          <Clock size={11} className="flex-shrink-0" />
                          <span className="truncate">
                            {board.lastOpenedUser?._id === currentUser?._id ||
                            board.lastOpenedUser?.username ===
                              currentUser?.username
                              ? `Opened by you ${formatTimeAgo(board.lastOpenedAt)}`
                              : `Opened by ${board.lastOpenedUser?.username || "Member"} ${formatTimeAgo(board.lastOpenedAt)}`}
                          </span>
                        </span>
                      ) : (
                        `Edited ${formatTimeAgo(board.updatedAt)}`
                      )}
                    </span>
                    <MoreVertical
                      className="select-none text-outline-variant opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      size={16}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {activeTab === "all" && canModify && (
            <div
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-dashed border-outline-variant/80 rounded-xl flex flex-col items-center justify-center p-8 hover:bg-surface-container-low hover:border-primary/50 transition-all cursor-pointer group min-h-[260px] animate-in fade-in duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4 shadow-sm border border-outline-variant/30">
                <PlusCircle size={28} className="select-none" />
              </div>
              <p className="font-bold text-on-surface-variant text-base">
                New Board
              </p>
              <p className="text-xs text-outline text-center mt-1">
                Start a blank canvas or choose a template
              </p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/60 rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Palette size={20} className="text-primary select-none" />
                Create Whiteboard Room
              </h3>
              <button
                onClick={() => {
                  setNewBoardTitle("");
                  setIsModalOpen(false);
                }}
                className="text-outline hover:text-on-surface w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={20} className="select-none" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-bold text-on-surface-variant/90"
                  htmlFor="boardTitle"
                >
                  Board Title
                </label>
                <input
                  id="boardTitle"
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full bg-surface-container-low/40 border border-outline-variant/70 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface animate-in fade-in"
                  placeholder="e.g. Brainstorming Sprint, Architecture Layout"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => {
                    setNewBoardTitle("");
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container text-on-surface-variant text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Board</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Boards;
