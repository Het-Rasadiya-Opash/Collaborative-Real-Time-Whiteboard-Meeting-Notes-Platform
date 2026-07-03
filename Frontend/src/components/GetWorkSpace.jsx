import {
  ArrowRight,
  Briefcase,
  Calendar,
  Mail,
  Megaphone,
  Palette,
  PlusSquare,
  Rocket,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import apiRequest from "../utils/apiRequest";

const roleBadgeClass = {
  OWNER: "badge-owner",
  EDITOR: "badge-editor",
  VIEWER: "badge-viewer",
  MEMBER: "badge-viewer",
};

const GetWorkSpace = ({
  onCreateWorkspace,
  refreshKey = 0,
  onLaunchWorkspace,
}) => {
  const { currentUser } = useSelector((state) => state.users);
  const isOwner = currentUser?.role === "OWNER";

  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState("VIEWER");

  useEffect(() => {
    let isMounted = true;

    apiRequest
      .get("/workspaces")
      .then((response) => {
        if (!isMounted) return;
        setWorkspaces(response.data?.data || []);
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
  }, [refreshKey]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const apiEndpoint =
      import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000/api";
    const socketUrl = apiEndpoint.replace("/api", "");

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join-notifications", { userId: currentUser._id });
    });

    socket.on("workspace-added", (newWorkspace) => {
      setWorkspaces((prev) => {
        if (prev.some((w) => w._id === newWorkspace._id)) return prev;
        return [newWorkspace, ...prev];
      });
    });

    socket.on("workspace-removed", ({ workspaceId }) => {
      setWorkspaces((prev) => prev.filter((w) => w._id !== workspaceId));
      if (selectedWorkspaceId === workspaceId) {
        setSelectedWorkspaceId(null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setActiveWorkspace(null);
      return;
    }

    let isMounted = true;
    setIsDetailsLoading(true);

    apiRequest
      .get(`/workspaces/${selectedWorkspaceId}`)
      .then((response) => {
        if (!isMounted) return;
        setActiveWorkspace(response.data?.data || null);
      })
      .catch(() => {
        if (isMounted) {
          setSelectedWorkspaceId(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsDetailsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsActionLoading(true);
    try {
      const response = await apiRequest.post(
        `/workspaces/${selectedWorkspaceId}/add`,
        {
          email: emailInput.trim(),
          role: roleInput,
        },
      );

      const updatedWorkspace = response.data?.data;
      if (updatedWorkspace) {
        setActiveWorkspace(updatedWorkspace);
        setWorkspaces((prev) =>
          prev.map((w) =>
            w._id === updatedWorkspace._id ? updatedWorkspace : w,
          ),
        );
        setEmailInput("");
        setRoleInput("VIEWER");
      }
    } catch (err) {
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId, username) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${username || "this member"} from the workspace?`,
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const response = await apiRequest.delete(
        `/workspaces/${selectedWorkspaceId}/member/${userId}`,
      );

      const updatedWorkspace = response.data?.data;
      if (updatedWorkspace) {
        setActiveWorkspace(updatedWorkspace);
        setWorkspaces((prev) =>
          prev.map((w) =>
            w._id === updatedWorkspace._id ? updatedWorkspace : w,
          ),
        );
      }
    } catch (err) {
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-surface-variant/70 text-sm">
            Loading workspaces...
          </p>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace, index) => {
              const userRoleInWorkspace =
                workspace.members?.find((m) => m.user?._id === currentUser?._id)
                  ?.role || "MEMBER";

              const isOwnerCard = userRoleInWorkspace === "OWNER";
              const members = workspace.members || [];
              
              const getCardTheme = (idx) => {
                const themes = [
                  {
                    bg: "bg-blue-500/10 text-blue-500",
                    icon: Rocket,
                  },
                  {
                    bg: "bg-purple-500/10 text-purple-500",
                    icon: Palette,
                  },
                  {
                    bg: "bg-amber-500/10 text-amber-500",
                    icon: Megaphone,
                  },
                  {
                    bg: "bg-emerald-500/10 text-emerald-500",
                    icon: Briefcase,
                  }
                ];
                return themes[idx % themes.length];
              };
              
              const theme = getCardTheme(index);
              const ThemeIcon = theme.icon;

              return (
                <div
                  key={workspace._id}
                  onClick={() => setSelectedWorkspaceId(workspace._id)}
                  className="glass-card p-5 rounded-2xl relative group cursor-pointer flex flex-col justify-between min-h-[220px] animate-in fade-in duration-200 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2.5 rounded-xl ${theme.bg}`}>
                        <ThemeIcon className="select-none" size={28} />
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 font-semibold text-xs rounded-full border border-emerald-500/20">
                        Active
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-bold text-lg text-on-surface mb-1.5 group-hover:text-primary transition-colors truncate">
                        {workspace.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant/75 truncate">
                        <span className="font-medium text-on-surface-variant/60">Owner: </span>
                        {workspace.owner?.username || workspace.owner?.email || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/40">
                    <div className="flex -space-x-2">
                      {members.slice(0, 3).map((member, mIdx) => {
                        const username = member.user?.username || "?";
                        const firstChar = username.charAt(0).toUpperCase();
                        const colors = [
                          "bg-blue-500/10 text-blue-500 border-surface",
                          "bg-purple-500/10 text-purple-500 border-surface",
                          "bg-amber-500/10 text-amber-500 border-surface",
                          "bg-emerald-500/10 text-emerald-500 border-surface",
                        ];
                        const colorClass = colors[mIdx % colors.length];
                        return (
                          <div
                            key={member._id || mIdx}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${colorClass}`}
                            title={username}
                          >
                            {firstChar}
                          </div>
                        );
                      })}
                      {members.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary">
                          +{members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold tracking-wide uppercase ${isOwnerCard ? "text-primary animate-none" : "text-on-surface-variant"}`}>
                      {userRoleInWorkspace}
                    </span>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => {
                if (isOwner) {
                  onCreateWorkspace?.();
                } else {
                  toast.error("Only Owners can create new workspaces");
                }
              }}
              className="border-2 border-dashed border-outline-variant rounded-2xl p-5 flex flex-col items-center justify-center text-outline hover:border-primary hover:text-primary hover:bg-primary-container/5 transition-all group min-h-[220px] cursor-pointer text-center hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300"
            >
              <PlusSquare className="mb-3 group-hover:scale-115 transition-transform text-outline group-hover:text-primary select-none" size={36} />
              <span className="font-bold text-base text-on-surface group-hover:text-primary transition-colors font-headline-md">
                New Workspace
              </span>
              <p className="text-xs text-on-surface-variant/70 mt-2 px-4 leading-relaxed max-w-[200px]">
                Initialize a new secure environment for your team's collaboration.
              </p>
            </button>

          
          </div>
        </div>
      )}

      {selectedWorkspaceId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-outline-variant/60 bg-surface-container-low/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center shadow-inner">
                  <Briefcase size={20} className="stroke-[2px]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">
                    {activeWorkspace
                      ? activeWorkspace.name
                      : "Workspace Details"}
                  </h3>
                  <p className="text-xs text-on-surface-variant/80">
                    Collaborative Workspace Management
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="text-outline hover:text-on-surface w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {isDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-on-surface-variant/70 text-sm">
                    Loading workspace details...
                  </p>
                </div>
              ) : activeWorkspace ? (
                <>
                  <div className="bg-surface-container-low/30 border border-outline-variant/50 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-outline">
                      Overview
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-on-surface-variant/90">
                      <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-outline-variant/40">
                        <Mail size={16} className="text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-outline uppercase">
                            Owner
                          </p>
                          <p className="font-semibold text-on-surface truncate">
                            {activeWorkspace.owner?.email || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-outline-variant/40">
                        <Calendar size={16} className="text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-outline uppercase">
                            Created At
                          </p>
                          <p className="font-semibold text-on-surface">
                            {new Date(
                              activeWorkspace.createdAt,
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-outline">
                        Members ({activeWorkspace.members?.length || 0})
                      </h4>
                    </div>

                    <div className="border border-outline-variant/50 rounded-xl divide-y divide-outline-variant/40 overflow-hidden bg-surface">
                      {activeWorkspace.members?.map((member) => {
                        const isMemberOwner =
                          member.role === "OWNER" ||
                          member.user?._id === activeWorkspace.owner?._id;
                        return (
                          <div
                            key={member._id || member.user?._id}
                            className="flex items-center justify-between p-3.5 hover:bg-surface-container-low/20 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-100 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                {member.user?.username?.charAt(0) || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-on-surface truncate flex items-center gap-1.5">
                                  {member.user?.username || "Unknown"}
                                  {member.user?._id === currentUser?._id && (
                                    <span className="text-[10px] bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded-full font-medium">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-on-surface-variant/75 truncate">
                                  {member.user?.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3.5 shrink-0">
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${roleBadgeClass[member.role] || "badge-viewer"}`}
                              >
                                {member.role}
                              </span>

                              {isOwner && !isMemberOwner && (
                                <button
                                  onClick={() =>
                                    handleRemoveMember(
                                      member.user?._id,
                                      member.user?.username,
                                    )
                                  }
                                  disabled={isActionLoading}
                                  className="p-1.5 text-error/80 hover:text-error hover:bg-error-container/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title="Remove Member"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="bg-surface border border-outline-variant/60 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-primary" />
                        <h4 className="text-sm font-bold text-on-surface">
                          Invite Collaborator
                        </h4>
                      </div>
                      <form
                        onSubmit={handleAddMember}
                        className="flex flex-col sm:flex-row gap-3"
                      >
                        <div className="relative flex-1">
                          <Mail
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline/80"
                          />
                          <input
                            type="email"
                            required
                            placeholder="colleague@example.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-surface-container-low/40 border border-outline-variant/70 rounded-xl py-2 pl-10 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface"
                          />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <select
                            value={roleInput}
                            onChange={(e) => setRoleInput(e.target.value)}
                            className="bg-surface border border-outline-variant/70 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-semibold flex-1 sm:flex-initial"
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="EDITOR">Editor</option>
                          </select>
                          <button
                            type="submit"
                            disabled={isActionLoading}
                            className="px-4 py-2 bg-primary hover:bg-brand-700 text-on-primary text-sm font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial"
                          >
                            {isActionLoading ? (
                              <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>Add</span>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-on-surface-variant">
                  <p>Failed to load workspace data.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant/60 bg-surface-container-low/40 flex justify-end gap-3">
              <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container text-on-surface-variant text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              {activeWorkspace && (
                <button
                  onClick={() => {
                    toast.success(
                      `Entering workspace: ${activeWorkspace.name}`,
                    );
                    setSelectedWorkspaceId(null);
                    onLaunchWorkspace?.(activeWorkspace);
                  }}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  Launch Workspace
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GetWorkSpace;
