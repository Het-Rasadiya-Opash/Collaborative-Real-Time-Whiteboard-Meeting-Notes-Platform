import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import apiRequest from "../utils/apiRequest";
import { logout } from "../features/usersSlice";
import { X, User, LogOut, Search, Bell } from "lucide-react";
import toast from "react-hot-toast";

const Header = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { currentUser } = useSelector((state) => state.users);
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
    <header className="fixed top-0 right-0 left-[280px] h-toolbar-height z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant shadow-sm flex justify-between items-center px-6">
      <div className="flex items-center w-1/3 min-w-[240px]">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline select-none" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface"
            placeholder="Search workspace..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 pr-4 border-r border-outline-variant">
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="p-2 hover:bg-primary-container/10 text-on-surface-variant hover:text-primary rounded-full transition-all cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="select-none" size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-11 w-80 bg-surface rounded-xl shadow-xl border border-outline-variant p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="pb-2 border-b border-outline-variant flex justify-between items-center">
                  <h4 className="font-bold text-sm text-on-surface">
                    Notifications
                  </h4>
                  <button
                    onClick={() =>
                      toast.success("Notifications marked as read!")
                    }
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                </div>
                <div className="py-4 text-center text-xs text-on-surface-variant/80">
                  You are all caught up!
                </div>
              </div>
            )}
          </div>
        </div>

        <div ref={profileRef} className="flex items-center gap-3 ml-2 relative">
          <div
            className="text-right hidden sm:block cursor-pointer select-none"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <p className="font-bold text-xs text-on-surface leading-tight">
              {currentUser?.username || "Guest User"}
            </p>
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider mt-0.5">
              {currentUser?.role || "MEMBER"} Lead
            </p>
          </div>

          <img
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            alt="User avatar"
            className="w-10 h-10 rounded-full border-2 border-primary-container shadow-sm object-cover cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            src="https://cdn-icons-png.magnific.com/256/11136/11136505.png?semt=ais_white_label"
          />

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-surface rounded-xl shadow-xl border border-outline-variant p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="pb-3 border-b border-outline-variant">
                <p className="font-bold text-on-surface text-sm leading-tight">
                  {currentUser?.username}
                </p>
                <p className="text-xs text-on-surface-variant/80 mt-0.5">
                  {currentUser?.email}
                </p>
                <span className="inline-block mt-2 text-[10px] font-semibold badge-info px-2.5 py-0.5 rounded uppercase font-black tracking-wider">
                  {currentUser?.role}
                </span>
              </div>
              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.success("Profile details page is coming soon!");
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-surface-container transition-colors text-on-surface flex items-center gap-2 cursor-pointer"
                >
                  <User size={16} />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-error-container/20 text-error hover:text-error transition-colors flex items-center gap-2 cursor-pointer font-bold"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
