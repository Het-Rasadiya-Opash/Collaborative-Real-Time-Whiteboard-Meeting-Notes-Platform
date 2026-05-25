import { Briefcase, Lock, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import GetWorkSpace from "../components/GetWorkSpace";
import apiRequest from "../utils/apiRequest";

const Workspace = () => {
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
      toast.success("Workspace created successfully");
      setNewWorkspaceName("");
      setIsModalOpen(false);
      setWorkspaceRefreshKey((key) => key + 1);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Failed to create workspace";
      toast.error(errMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-outline-variant/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">
            Workspaces
          </h1>
        </div>

        {isOwner ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start sm:self-center px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-brand-700 active:scale-98 transition-all flex items-center gap-2 shadow-md cursor-pointer text-sm"
          >
            <Plus size={18} />
            Create Workspace
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs bg-surface-container-high border border-outline-variant text-on-surface-variant px-3 py-2 rounded-xl">
            <Lock size={14} className="text-outline" />
            <span>Only Owners can create new workspaces</span>
          </div>
        )}
      </div>

      <GetWorkSpace
        onCreateWorkspace={() => setIsModalOpen(true)}
        refreshKey={workspaceRefreshKey}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/60 rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
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
