import {
  FileText,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  PenTool,
  User,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { logout } from "../features/usersSlice";
import apiRequest from "../utils/apiRequest";

const Sidebar = ({ activeNav, setActiveNav, isOpen, setIsOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
    <aside className={`fixed left-0 top-0 h-screen w-sidebar-width flex flex-col py-6 border-r border-outline-variant z-40 bg-surface transition-transform duration-300 lg:translate-x-0 ${
      isOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      <div className="px-6 py-4 mb-8 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/10">
            <Layers size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-base text-primary tracking-tight font-headline-md leading-tight">
              Workspace
            </h1>
            <p className="text-[10px] text-on-surface-variant/70 font-semibold select-none">
              Collaborative Canvas
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 text-on-surface-variant hover:bg-surface-container rounded-xl cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "boards", label: "Boards", icon: PenTool },
          { id: "notes", label: "Notes", icon: FileText },
          { id: "settings", label: "Profile Settings", icon: User },
        ].map((item) => {
          const isActive = activeNav === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 py-2.5 px-4 transition-all duration-150 active:scale-95 cursor-pointer rounded-xl border-l-4 ${
                isActive
                  ? "bg-surface-container text-primary font-bold border-primary shadow-sm"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:translate-x-1"
              }`}
            >
              <IconComponent size={20} className="select-none" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 space-y-4">
        <button
          onClick={() =>
            toast.success(
              "Click 'Create Workspace' on the dashboard panel to add a workspace!",
            )
          }
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-outline text-primary font-bold text-xs hover:bg-primary/5 transition-colors cursor-pointer"
        >
          New Workspace
        </button>
        <div className="pt-4 border-t border-outline-variant space-y-1">
          <a
            className="flex items-center gap-3 text-on-surface-variant py-2 px-4 hover:bg-surface-container-low rounded-lg transition-all"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.success("Help Center is always here to assist you.");
            }}
          >
            <HelpCircle size={18} className="select-none" />
            <span className="text-xs font-semibold">Help Center</span>
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-on-surface-variant py-2 px-4 hover:bg-error-container/20 hover:text-error rounded-lg transition-all cursor-pointer"
          >
            <LogOut size={18} className="select-none" />
            <span className="text-xs font-semibold">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
