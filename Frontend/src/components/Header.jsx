import { Bell, LogOut, Menu, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import { logout } from "../features/usersSlice";
import apiRequest from "../utils/apiRequest";

const Header = ({ onToggleSidebar }) => {
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const socketRef = useRef(null);

  const { currentUser } = useSelector((state) => state.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?._id) return;

    apiRequest
      .get("/notifications")
      .then((res) => {
        const list = res.data?.data || [];
        setNotifications(list);
      })
      .catch(() => {});

    const apiEndpoint =
      import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000/api";
    const socketUrl = apiEndpoint.replace("/api", "");

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-notifications", { userId: currentUser._id });
    });

    socket.on("new-notification", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      toast(newNotif.message, {
        icon: "🔔",
        id: newNotif._id,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await apiRequest.put("/notifications/read");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      await apiRequest.delete("/notifications");
      setNotifications([]);
      toast.success("Notifications cleared!");
    } catch (err) {
      console.error(err);
    }
  };

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
    <header className="fixed top-0 right-0 left-0 lg:left-[280px] h-toolbar-height z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant shadow-sm flex justify-between items-center px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 text-on-surface-variant hover:bg-surface-container rounded-xl cursor-pointer transition-colors"
        >
          <Menu size={20} />
        </button>
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
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-error text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-surface animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-11 w-80 bg-surface rounded-xl shadow-xl border border-outline-variant p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="pb-2 border-b border-outline-variant flex justify-between items-center">
                  <h4 className="font-bold text-sm text-on-surface">
                    Notifications ({unreadCount})
                  </h4>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] text-error hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto mt-2 divide-y divide-outline-variant/30">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-on-surface-variant/80">
                      You are all caught up!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`py-2.5 px-1 hover:bg-surface-container/30 transition-colors flex items-start justify-between gap-2 ${!notif.isRead ? "bg-primary-container/5" : ""}`}
                      >
                        <div className="flex flex-col text-left">
                          <p className="text-xs text-on-surface font-medium leading-snug">
                            {notif.message}
                          </p>
                          <span className="text-[9px] text-outline mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="pt-2 border-t border-outline-variant/40 mt-1 flex justify-end">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
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
