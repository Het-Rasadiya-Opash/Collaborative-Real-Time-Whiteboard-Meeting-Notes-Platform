import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import {
  User,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  ChevronDown,
  Loader2,
  MailCheck,
} from "lucide-react";
import {
  clearError,
  setCurrentUser,
  setError,
  setLoading,
} from "../features/usersSlice";
import apiRequest from "../utils/apiRequest";
import toast from "react-hot-toast";

const Auth = ({ defaultMode = "login" }) => {
  const [mode, setMode] = useState(defaultMode);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "OWNER",
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { loading, error } = useSelector((state) => state.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const blobContainerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast.success("Email verified successfully! You can now log in.", {
        id: "email-verified",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!blobContainerRef.current) return;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      const blobs = blobContainerRef.current.children;
      Array.from(blobs).forEach((blob, index) => {
        const speed = (index + 1) * 15;
        blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    dispatch(clearError());
  }, [mode, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggle = (selectedMode) => {
    setMode(selectedMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(setLoading(true));
    dispatch(clearError());

    try {
      if (mode === "login") {
        const loginData = {
          email: formData.email,
          password: formData.password,
        };
        const res = await apiRequest.post("/users/login", loginData);
        dispatch(setCurrentUser(res.data.data));
        navigate("/");
      } else {
        const res = await apiRequest.post("/users/register", formData);
        setRegisteredData(res.data?.data);
        setIsRegistered(true);
      }
    } catch (err) {
      const errorData =
        err.response?.data?.message ||
        "Authentication failed. Please check details.";
      dispatch(setError(errorData));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleVerifyInstantly = async () => {
    dispatch(setLoading(true));
    dispatch(clearError());

    try {
      await apiRequest.get(
        `/users/verify-email?token=${registeredData.verificationToken}&json=true`,
      );
      toast.success(
        "Account verified successfully! Redirecting in 1 second...",
      );

      setTimeout(async () => {
        try {
          const loginData = {
            email: formData.email,
            password: formData.password,
          };
          const res = await apiRequest.post("/users/login", loginData);
          dispatch(setCurrentUser(res.data.data));
          navigate("/");
        } catch (err) {
          const errorData =
            err.response?.data?.message ||
            "Auto-login failed. Please sign in manually.";
          dispatch(setError(errorData));
          setMode("login");
          setIsRegistered(false);
        } finally {
          dispatch(setLoading(false));
        }
      }, 1000);
    } catch (err) {
      try {
        const loginData = {
          email: formData.email,
          password: formData.password,
        };
        const res = await apiRequest.post("/users/login", loginData);
        toast.success("Account already verified! Redirecting...");
        dispatch(setCurrentUser(res.data.data));
        navigate("/");
      } catch (loginErr) {
        const errorData =
          err.response?.data?.message ||
          "Verification failed. Please try again.";
        dispatch(setError(errorData));
        dispatch(setLoading(false));
      }
    }
  };

  const handleReset = () => {
    setIsRegistered(false);
    setRegisteredData(null);
    setMode("login");
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "OWNER",
    });
    dispatch(clearError());
  };

  return (
    <div className="canvas-grid text-on-surface min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-primary/20 selection:text-primary font-sans">
      <div
        ref={blobContainerRef}
        className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none"
      >
        <div
          className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-transform duration-300 ease-out"
          style={{ backgroundColor: "rgba(219, 225, 255, 0.4)" }}
        ></div>
        <div
          className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full blur-[100px] transition-transform duration-300 ease-out"
          style={{ backgroundColor: "rgba(234, 221, 255, 0.3)" }}
        ></div>
      </div>

      <main className="w-full max-w-[440px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight font-sans">
              Workspace
            </h1>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 sm:p-8 border border-outline-variant/60 focus-within:border-primary transition-all duration-300">
          {!isRegistered ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-on-surface mb-1">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-error-container/85 border-l-4 border-error rounded-lg text-on-error-container text-sm flex gap-2 items-center animate-in fade-in duration-200">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div>
                    <label
                      className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2"
                      htmlFor="username"
                    >
                      Username
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User
                          size={20}
                          className="text-outline group-focus-within:text-primary transition-colors"
                        />
                      </div>
                      <input
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-sans"
                        id="username"
                        name="username"
                        placeholder="alex_dev"
                        required
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail
                        size={20}
                        className="text-outline group-focus-within:text-primary transition-colors"
                      />
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-sans"
                      id="email"
                      name="email"
                      placeholder="name@company.com"
                      required
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label
                      className="block text-xs font-semibold text-outline uppercase tracking-wider"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    {mode === "login" && (
                      <a
                        className="text-xs font-medium text-primary hover:underline transition-all"
                        href="#"
                      >
                        Forgot Password?
                      </a>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock
                        size={20}
                        className="text-outline group-focus-within:text-primary transition-colors"
                      />
                    </div>
                    <input
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-sans"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label
                      className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2"
                      htmlFor="role"
                    >
                      Workspace Role
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase
                          size={20}
                          className="text-outline group-focus-within:text-primary transition-colors"
                        />
                      </div>
                      <select
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-sans cursor-pointer appearance-none"
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="VIEWER">VIEWER</option>
                        <option value="EDITOR">EDITOR</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-outline">
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="w-full bg-primary text-on-primary py-3 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 font-sans"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Workspace Account"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4" id="verification-view">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5">
                <MailCheck size={32} />
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-2">
                Check your email
              </h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                We've sent a magic link to{" "}
                <span className="font-bold text-on-surface">
                  {formData.email}
                </span>
                . Please click the verification link in that email to activate
                your workspace.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    window.open("https://mail.google.com", "_blank")
                  }
                  className="w-full bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-md"
                >
                  Open Mail App
                </button>

                {registeredData?.verificationToken && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20 text-left animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                      Local Dev Assistant
                    </div>
                    <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                      Since this is a local development environment, you can
                      instantly verify this account bypassing configuration
                      restrictions.
                    </p>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyInstantly}
                      className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Verify Account Instantly"
                      )}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-primary text-sm font-semibold hover:underline cursor-pointer block mx-auto py-1 pt-2"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}
        </div>

        {!isRegistered && (
          <p className="text-center mt-6 text-sm text-on-surface-variant font-sans">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary font-semibold hover:underline transition-all cursor-pointer"
                  onClick={() => handleToggle("signup")}
                >
                  Sign up for free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary font-semibold hover:underline transition-all cursor-pointer"
                  onClick={() => handleToggle("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        )}
      </main>
    </div>
  );
};

export default Auth;
