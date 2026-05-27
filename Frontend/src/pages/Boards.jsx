import {
  ArrowLeft,
  Briefcase,
  Brush,
  Clock,
  Filter,
  Grid,
  LayoutDashboard,
  Lock,
  Palette,
  PenTool,
  PlusCircle,
  PlusSquare,
  Search,
  Star,
  Workflow,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";

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
        bgClass: "bg-note-blue",
        icon: PenTool,
        accent: "text-primary",
      },
      {
        bgClass: "bg-note-green",
        icon: Brush,
        accent: "text-emerald-600",
      },
      {
        bgClass: "bg-note-purple",
        icon: Workflow,
        accent: "text-purple-600",
      },
      {
        bgClass: "bg-note-yellow",
        icon: LayoutDashboard,
        accent: "text-amber-600",
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
    <div className="max-w-7xl mx-auto py-6 md:py-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 md:pb-8 mb-6 md:mb-8 border-b border-outline-variant/60">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">
            {workspace.name} Boards
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Visualize your ideas and collaborate in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() =>
              setSortBy((prev) =>
                prev === "updatedAt" ? "title" : "updatedAt",
              )
            }
            className="flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-outline-variant/70 rounded-xl text-on-surface font-bold text-sm shadow-sm hover:shadow-md transition-all hover:bg-surface-container-low active:scale-[0.98] cursor-pointer"
          >
            <Filter size={20} className="select-none text-on-surface-variant" />
            Sort: {sortBy === "updatedAt" ? "Recent" : "Alphabetical"}
          </button>
          {canModify ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-95 cursor-pointer text-sm w-full sm:w-auto"
            >
              <PlusCircle size={20} className="select-none" />
              Create New Board
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-surface-container-high border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-xl shadow-sm">
              <Lock size={14} className="text-outline" />
              <span className="font-bold">Viewer Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="relative w-full mb-6">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
            <Search size={20} />
          </span>
          <input
            type="text"
            placeholder="Search boards by title or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface border border-outline-variant rounded-2xl text-body-md focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm text-on-surface"
          />
        </div>

        <div className="flex items-center gap-8 border-b border-outline-variant">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 pb-3 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "all"
                ? "text-primary border-primary"
                : "text-on-surface-variant hover:text-primary border-transparent"
            }`}
          >
            <Grid size={18} />
            All Boards
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex items-center gap-2 pb-3 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "recent"
                ? "text-primary border-primary"
                : "text-on-surface-variant hover:text-primary border-transparent"
            }`}
          >
            <Clock size={18} />
            Last Opened
          </button>
          <button
            onClick={() => setActiveTab("starred")}
            className={`flex items-center gap-2 pb-3 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === "starred"
                ? "text-primary border-primary"
                : "text-on-surface-variant hover:text-primary border-transparent"
            }`}
          >
            <Star size={18} />
            Starred
            {boards.filter((b) => b.isStarred).length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {boards.filter((b) => b.isStarred).length}
              </span>
            )}
          </button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {sortedBoards.map((board, index) => {
            const visual = getBoardVisual(board.title, index);
            const VisualIcon = visual.icon;
            
            const cardThemes = [
              { bg: "bg-brand-100/80 text-primary", icon: PenTool },
              { bg: "bg-purple-100/80 text-purple-700", icon: Brush },
              { bg: "bg-amber-100/80 text-amber-700", icon: Workflow },
              { bg: "bg-emerald-100/80 text-emerald-700", icon: LayoutDashboard },
            ];
            const theme = cardThemes[index % cardThemes.length];
            const ThemeIcon = theme.icon;

            return (
              <div
                key={board._id}
                onClick={() => onOpenBoard(board)}
                className="glass-card p-5 rounded-2xl relative group cursor-pointer flex flex-col justify-between min-h-[220px] animate-in fade-in duration-200 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${theme.bg}`}>
                      <ThemeIcon className="select-none" size={28} />
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(e, board._id)}
                      className="w-9 h-9 rounded-xl bg-surface border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:text-amber-500 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                      <Star
                        className={board.isStarred ? "fill-amber-500 text-amber-500" : "text-outline"}
                        size={18}
                      />
                    </button>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-on-surface mb-1.5 group-hover:text-primary transition-colors truncate">
                      {board.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant/75 truncate">
                      <span className="font-medium text-on-surface-variant/60">Owner: </span>
                      {board.owner?.username || "Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/40">
                  <div className="flex items-center gap-2 truncate">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shadow-inner shrink-0 ${getAvatarBg(board.owner?.username)}`}>
                      {getInitials(board.owner?.username)}
                    </div>
                    <span className="text-xs text-on-surface-variant font-semibold truncate max-w-[100px]">
                      {board.owner?.username || "Member"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-on-surface-variant text-[11px] font-bold shrink-0">
                    <Clock size={12} className="select-none text-outline" />
                    <span className="truncate">
                      {board.lastOpenedAt
                        ? `Opened ${formatTimeAgo(board.lastOpenedAt)}`
                        : `Edited ${formatTimeAgo(board.updatedAt)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {activeTab === "all" && canModify && (
            /* Card: New Board Placeholder matching Workspace Card */
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-dashed border-outline-variant rounded-2xl p-5 flex flex-col items-center justify-center text-outline hover:border-primary hover:text-primary hover:bg-primary-container/5 transition-all group min-h-[220px] cursor-pointer text-center hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
            >
              <PlusSquare className="mb-3 group-hover:scale-115 transition-transform text-outline group-hover:text-primary select-none" size={36} />
              <span className="font-bold text-base text-on-surface group-hover:text-primary transition-colors font-headline-md">
                New Board
              </span>
              <p className="text-xs text-on-surface-variant/70 mt-2 px-4 leading-relaxed max-w-[200px]">
                Start a blank canvas or select templates for your whiteboard session.
              </p>
            </button>
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
