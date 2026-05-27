import {
  Briefcase,
  Lock,
  Plus,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Brush,
  FileText,
  Terminal,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import GetWorkSpace from "../components/GetWorkSpace";
import apiRequest from "../utils/apiRequest";

const Workspace = ({ onLaunchWorkspace }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);

  const { currentUser } = useSelector((state) => state.users);
  const isOwner = currentUser?.role === "OWNER";

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsCreating(true);
    try {
      await apiRequest.post("/workspaces/create", {
        name: newWorkspaceName.trim(),
      });
      setNewWorkspaceName("");
      setIsModalOpen(false);
      setWorkspaceRefreshKey((key) => key + 1);
    } catch {
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 md:pb-8 mb-6 md:mb-8 border-b border-outline-variant/60">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">
            Workspaces
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Manage and collaborate across your organization's digital
            ecosystems.
          </p>
        </div>

        {isOwner ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-95 cursor-pointer text-sm w-full sm:w-auto"
          >
            <PlusCircle size={20} />
            Create Workspace
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs bg-surface-container-high border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-xl">
            <Lock size={16} className="text-outline" />
            <span>Only Owners can create new workspaces</span>
          </div>
        )}
      </div>

      <GetWorkSpace
        onCreateWorkspace={() => setIsModalOpen(true)}
        refreshKey={workspaceRefreshKey}
        onLaunchWorkspace={onLaunchWorkspace}
      />

      <section className="mt-12 sm:mt-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-on-surface font-headline-md">
            Recent Boards
          </h3>
          <button
            onClick={() => toast.success("Select and launch a workspace to manage its active boards!")}
            className="text-primary font-bold text-xs hover:underline cursor-pointer"
          >
            View all boards
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => toast.success("Launch a workspace to open the 'Design Sprint' board!")}
            className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-note-purple flex items-center justify-center text-purple-600">
              <Brush size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface">Design Sprint</p>
              <p className="text-[10px] text-on-surface-variant">Edited 2h ago</p>
            </div>
          </div>

          <div
            onClick={() => toast.success("Launch a workspace to open the 'Q4 Roadmap' board!")}
            className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-note-yellow flex items-center justify-center text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface">Q4 Roadmap</p>
              <p className="text-[10px] text-on-surface-variant">Edited yesterday</p>
            </div>
          </div>

          <div
            onClick={() => toast.success("Launch a workspace to open the 'API Documentation' board!")}
            className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-note-blue flex items-center justify-center text-blue-600">
              <Terminal size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface">API Documentation</p>
              <p className="text-[10px] text-on-surface-variant">Edited 3d ago</p>
            </div>
          </div>

          <div
            onClick={() => toast.success("Launch a workspace to open the 'Growth Metrics' board!")}
            className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-note-green flex items-center justify-center text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface">Growth Metrics</p>
              <p className="text-[10px] text-on-surface-variant">Edited Oct 12</p>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Briefcase size={20} className="text-primary" />
                Create Workspace
              </h3>
              <button
                onClick={() => {
                  setNewWorkspaceName("");
                  setIsModalOpen(false);
                }}
                className="text-outline hover:text-on-surface w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-bold text-on-surface-variant/90"
                  htmlFor="workspaceName"
                >
                  Workspace Name
                </label>
                <input
                  id="workspaceName"
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-surface-container-low/40 border border-outline-variant/70 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface"
                  placeholder="e.g. Design Team Sprint, Project Alpha"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => {
                    setNewWorkspaceName("");
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
                    <span>Create Workspace</span>
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

export default Workspace;
