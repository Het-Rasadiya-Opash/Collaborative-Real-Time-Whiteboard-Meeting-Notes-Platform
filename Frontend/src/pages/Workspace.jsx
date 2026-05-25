import { Briefcase, Lock, Plus, PlusCircle, TrendingUp, ShieldCheck } from "lucide-react";
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
      // Handled globally
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 mb-8 border-b border-outline-variant/60">
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
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-95 cursor-pointer text-sm"
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

      {/* <h2 className="font-bold text-xl text-on-surface mb-6 mt-12 flex items-center gap-2">
        <TrendingUp size={24} className="text-primary" />
        Workspace Insights
      </h2> */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Collaboration Velocity
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-primary">84%</span>
              <span className="text-success-emerald text-xs font-bold flex items-center bg-success-emerald/10 px-2.5 py-0.5 rounded-full border border-success-emerald/20">
                <TrendingUp size={14} className="mr-0.5" />
                +12.4%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 max-w-[240px] leading-relaxed">
              Active engagement across all boards this week.
            </p>
          </div>
          <div className="w-32 h-16 flex items-end gap-1.5 px-2">
            <div
              className="flex-1 bg-primary/10 rounded-t-sm h-[40%] transition-all duration-300 hover:bg-primary hover:h-[55%]"
              title="Monday"
            ></div>
            <div
              className="flex-1 bg-primary/20 rounded-t-sm h-[60%] transition-all duration-300 hover:bg-primary hover:h-[75%]"
              title="Tuesday"
            ></div>
            <div
              className="flex-1 bg-primary/30 rounded-t-sm h-[50%] transition-all duration-300 hover:bg-primary hover:h-[65%]"
              title="Wednesday"
            ></div>
            <div
              className="flex-1 bg-primary/50 rounded-t-sm h-[80%] transition-all duration-300 hover:bg-primary hover:h-[90%]"
              title="Thursday"
            ></div>
            <div
              className="flex-1 bg-primary rounded-t-sm h-[100%] transition-all duration-300 hover:brightness-110"
              title="Today"
            ></div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border-l-4 border-primary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <ShieldCheck size={20} />
                <span className="font-bold text-base">Enterprise Security</span>
              </div>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">
                All workspaces are currently compliant with ISO 27001 standards.
                Review access patterns for enhanced security.
              </p>
            </div>
            <button
              onClick={() =>
                toast.success("Security logs are up to date and fully audited.")
              }
              className="px-4 py-2 bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-bold text-xs rounded-xl transition-all duration-200 active:scale-95 shrink-0 cursor-pointer"
            >
              Audit Logs
            </button>
          </div>
        </div>
      </div> */}

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
