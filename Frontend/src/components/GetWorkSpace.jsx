import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  Mail,
  Plus,
  Rocket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";

const GetWorkSpace = () => {
  const { currentUser } = useSelector((state) => state.users);
  const isOwner = currentUser?.role === "OWNER";
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest.get("/workspaces");
      const data = response.data?.data || [];
      setWorkspaces(data);
    } catch (err) {
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => {
              const userRoleInWorkspace =
                workspace.members?.find((m) => m.user?._id === currentUser?._id)
                  ?.role || "MEMBER";

              const isOwnerCard = userRoleInWorkspace === "OWNER";

              return (
                <div
                  key={workspace._id}
                  onClick={() =>
                    toast.success(`Entering workspace: ${workspace.name}`)
                  }
                  className="group relative bg-white border border-outline-variant/70 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col justify-between min-h-[220px] cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      {isOwnerCard ? (
                        <div className="w-12 h-12 bg-blue-50/60 border border-blue-100 text-primary rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                          <Briefcase size={22} className="stroke-[2px]" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-sky-50/60 border border-sky-100 text-[#0053db] rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                          <Rocket size={22} className="stroke-[2px]" />
                        </div>
                      )}

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isOwnerCard
                            ? "bg-primary-container text-on-primary shadow-sm"
                            : "bg-secondary-container text-on-surface-variant/90 border border-outline-variant/40"
                        }`}
                      >
                        {userRoleInWorkspace}
                      </span>
                    </div>

                    <h3
                      className={`text-lg font-bold transition-colors group-hover:text-primary ${
                        isOwnerCard ? "text-on-surface" : "text-primary"
                      }`}
                    >
                      {workspace.name}
                    </h3>

                    <div className="mt-4 space-y-2 text-sm text-on-surface-variant/80">
                      <div className="flex items-center gap-2.5">
                        <Mail size={15} className="text-outline/70" />
                        <span className="truncate">
                          {workspace.owner?.email || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Users size={15} className="text-outline/70" />
                        <span>{workspace.members?.length || 0} Members</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-end text-xs text-primary-container font-bold">
                    {isOwnerCard ? (
                      <span className="flex items-center gap-1 transition-all group-hover:underline">
                        View Details
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 transition-all group-hover:underline">
                        Launch Space
                        <ExternalLink
                          size={14}
                          className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
                        />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div
              onClick={() => {
                if (isOwner) {
                  setIsModalOpen(true);
                } else {
                  toast.error("Only Owners can create new workspaces");
                }
              }}
              className="group border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center p-6 bg-transparent hover:bg-surface-container/10 hover:border-primary/40 transition-all duration-300 min-h-[220px] cursor-pointer text-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50/50 border border-blue-100/80 flex items-center justify-center text-outline/80 mb-3 group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-primary transition-all duration-300">
                <Plus size={20} className="stroke-[2.5px]" />
              </div>
              <h4 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                New Workspace
              </h4>
              <p className="text-xs text-on-surface-variant/70 mt-1 max-w-[200px]">
                Create a new collaborative zone
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GetWorkSpace;
