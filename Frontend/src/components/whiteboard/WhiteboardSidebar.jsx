import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { logout } from "../../features/usersSlice";
import apiRequest from "../../utils/apiRequest";

export const WhiteboardSidebar = ({ onClose, isOpen, setIsOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.users.currentUser);

  const handleLogout = async () => {
    try {
      await apiRequest.post("/users/logout");
      dispatch(logout());
      navigate("/login");
    } catch {
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <aside className={`fixed left-0 top-0 h-full w-[280px] py-6 px-4 bg-surface-container-low border-r border-outline-variant z-[60] flex flex-col justify-between transition-all duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div>
        <div className="flex items-center justify-between mb-10 px-2 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard_customize</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-headline-sm font-bold text-primary">Workspace</h2>
              <p className="text-label-md font-label-md text-on-surface-variant">Collaborative Canvas</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors cursor-pointer flex items-center justify-center lg:hidden"
            title="Collapse Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            onClick={() => onClose("dashboard")}
            className="flex items-center space-x-3 px-3 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span className="font-body-md">Dashboard</span>
          </a>
          <a className="flex items-center space-x-3 px-3 py-3 rounded-lg bg-secondary-fixed text-on-secondary-fixed border-l-4 border-primary font-semibold shadow-soft scale-[0.98] transition-transform duration-150 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-body-md">Boards</span>
          </a>
          <a
            onClick={() => onClose("notes")}
            className="flex items-center space-x-3 px-3 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-body-md">Notes</span>
          </a>
          <a
            onClick={() => onClose("settings")}
            className="flex items-center space-x-3 px-3 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md">Settings</span>
          </a>
        </nav>
      </div>

      <div className="mt-auto space-y-6">
        <button
          onClick={() => onClose()}
          className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer bg-transparent"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
          <span className="font-label-md">Close Board</span>
        </button>
        <div className="space-y-1">
          <a
            onClick={() => {
              onClose();
              toast.success("Help Center is always here to assist you.");
            }}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md">Help Center</span>
          </a>
          {currentUser ? (
            <a
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-label-md">Sign Out</span>
            </a>
          ) : (
            <a
              onClick={() => navigate("/login")}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">login</span>
              <span className="font-label-md">Sign In</span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};
