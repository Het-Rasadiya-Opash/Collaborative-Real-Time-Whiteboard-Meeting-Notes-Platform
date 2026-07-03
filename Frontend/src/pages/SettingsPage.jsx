import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import apiRequest from "../utils/apiRequest";
import { setCurrentUser } from "../features/usersSlice";

const SettingsPage = () => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.users);

  const [activeTab, setActiveTab] = useState("profile"); // profile, password, preferences
  const [username, setUsername] = useState(currentUser?.username || "");
  const [email] = useState(currentUser?.email || "");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.classList.contains("dark") ? "dark" : "light");

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
    }
  }, [currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest.put("/users/profile", { username }, { skipSuccessToast: true });
      if (res.data?.success) {
        dispatch(setCurrentUser(res.data.data));
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest.put("/users/profile", {
        currentPassword,
        newPassword,
      }, { skipSuccessToast: true });
      if (res.data?.success) {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = (newTheme) => {
    const html = document.documentElement;
    if (newTheme === "dark") {
      html.classList.remove("light");
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      html.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode!`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight font-sans">
          Profile Settings
        </h1>
        <p className="mt-2 text-sm sm:text-base text-on-surface-variant/80">
          Manage your profile details, password, and application preferences.
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[500px]">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-surface-container-lowest border-r border-outline-variant/50 p-6 flex flex-col gap-2">
          {/* User Preview */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-outline-variant/40">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary font-bold text-lg shadow-inner">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-on-surface truncate">
                {currentUser?.username}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/10 text-primary mt-1 border border-primary/10">
                {currentUser?.role || "USER"}
              </span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-primary text-on-primary shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            Edit Profile
          </button>

          <button
            onClick={() => setActiveTab("password")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "password"
                ? "bg-primary text-on-primary shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Change Password
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "preferences"
                ? "bg-primary text-on-primary shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">palette</span>
            Preferences
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-6 sm:p-8 bg-surface-container-low flex flex-col justify-between">
          <div className="max-w-xl">
            {/* Tab: Edit Profile */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1">
                    Profile Information
                  </h3>
                  <p className="text-xs text-on-surface-variant/70">
                    Update your account details and display username.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      Email Address (Read-only)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className="w-full bg-surface-container-lowest/50 border border-outline-variant/40 rounded-xl px-4 py-3 text-xs text-on-surface-variant/60 font-medium cursor-not-allowed"
                        value={email}
                        readOnly
                      />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant/40">
                        lock
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      Workspace Role (Read-only)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface-container-lowest/50 border border-outline-variant/40 rounded-xl px-4 py-3 text-xs text-on-surface-variant/60 font-medium cursor-not-allowed"
                      value={currentUser?.role || "USER"}
                      readOnly
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-55"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </form>
            )}

            {/* Tab: Change Password */}
            {activeTab === "password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1">
                    Change Password
                  </h3>
                  <p className="text-xs text-on-surface-variant/70">
                    Ensure your account is secure by using a strong password.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-55"
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            )}

            {/* Tab: Preferences */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1">
                    System Preferences
                  </h3>
                  <p className="text-xs text-on-surface-variant/70">
                    Customize your experience and workspace theme.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-3">
                      Display Theme
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Light Option */}
                      <button
                        onClick={() => changeTheme("light")}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all cursor-pointer ${
                          theme === "light"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-outline-variant/60 bg-surface-container-lowest hover:border-outline-variant"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="material-symbols-outlined text-[20px] text-amber-500">
                            light_mode
                          </span>
                          {theme === "light" && (
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              check_circle
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface">Light Mode</div>
                          <div className="text-[10px] text-on-surface-variant/70 mt-0.5">Classic clean interface</div>
                        </div>
                      </button>

                      {/* Dark Option */}
                      <button
                        onClick={() => changeTheme("dark")}
                        className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all cursor-pointer ${
                          theme === "dark"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-outline-variant/60 bg-surface-container-lowest hover:border-outline-variant"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="material-symbols-outlined text-[20px] text-primary">
                            dark_mode
                          </span>
                          {theme === "dark" && (
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              check_circle
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface">Dark Mode</div>
                          <div className="text-[10px] text-on-surface-variant/70 mt-0.5">Easy on the eyes at night</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
