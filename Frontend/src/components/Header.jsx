import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import apiRequest from "../utils/apiRequest";
import { logout } from "../features/usersSlice";
import { Search, X, Plus, Bell, User, LogOut } from "lucide-react";
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
    <header className="fixed top-0 right-0 left-[280px] h-toolbar-height flex justify-between items-center px-gutter z-30 bg-surface border-b border-outline-variant shadow-sm">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md"
            placeholder="Search boards, files, or members..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => toast("Canvas creation is coming soon")}
          className="px-4 py-2 bg-primary text-on-primary font-label-md text-sm font-semibold rounded-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          New Canvas
        </button>

        <div ref={notificationRef} className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors rounded-full relative cursor-pointer"
          >
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full"></span>
          </button>
        </div>

        <div className="h-8 w-[1px] bg-outline-variant mx-1"></div>

        <div ref={profileRef} className="relative">
          <img
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            alt="User avatar"
            className="w-9 h-9 rounded-full object-cover border border-outline-variant cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvlUPR7_j1Ww20SndKhRhUMJbSIBEOWqlPS9FD062q6wHEJxjMgeMHmr7wkwRP-f52D3m05tBP_dLMYSHqTfef07pEAnb0OKNPfgUSv7RowTmK0XVCHtjhRVwY0mLjtD9RAyv2Oa9fZId_qB0Xi-KaDqDYX1EpIHJ8Wlxd4ZjajiV_YUFqzQhLd3teqrCRJSrgGpqtzA-zBHMGJ0wX1ylneSIkZgdtvS-98xc9LJ0UMznnu6cW61QDxlkpkajq1KdwIr3nUco1ynp8"
          />

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-surface rounded-xl shadow-xl border border-outline-variant p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="pb-3 border-b border-outline-variant">
                <p className="font-bold text-on-surface text-sm leading-tight">
                  {currentUser.username}
                </p>
                <p className="text-xs text-on-surface-variant/80 mt-0.5">
                  {currentUser.email}
                </p>
                <span className="inline-block mt-2 text-[10px] font-semibold badge-info px-2 py-0.5 rounded uppercase">
                  {currentUser.role}
                </span>
              </div>
              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-surface-container transition-colors text-on-surface flex items-center gap-2 cursor-pointer"
                >
                  <User size={18} />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-error-container/20 text-error hover:text-error transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <LogOut size={18} />
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
