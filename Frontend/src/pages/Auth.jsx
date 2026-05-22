import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import {
  clearError,
  setCurrentUser,
  setError,
  setLoading,
} from "../features/usersSlice";
import apiRequest from "../utils/apiRequest";

const Auth = ({ defaultMode = "login" }) => {
  const [mode, setMode] = useState(defaultMode);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [isRegistered, setIsRegistered] = useState(false);

  const { loading, error } = useSelector((state) => state.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      const moveX = (e.clientX - window.innerWidth / 2) / 100;
      const moveY = (e.clientY - window.innerHeight / 2) / 100;
      cardRef.current.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${-2 + moveX / 5}deg)`;
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
        await apiRequest.post("/users/register", formData);
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

  const handleReset = () => {
    setIsRegistered(false);
    setMode("login");
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "user",
    });
    dispatch(clearError());
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      <div className="fixed inset-0 canvas-grid opacity-40 pointer-events-none"></div>

      <main className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row bg-surface rounded-xl shadow-lg border border-outline-variant overflow-hidden">
        <div className="hidden md:flex flex-1 bg-surface-container-low p-12 flex-col justify-between relative overflow-hidden border-r border-outline-variant/30">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <span
                  className="material-symbols-outlined text-on-primary text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bubble_chart
                </span>
              </div>
              <span className="font-headline-md text-xl font-bold text-primary tracking-tight">
                CollabFlow
              </span>
            </div>
            <h1 className="font-headline-lg text-3xl font-extrabold text-on-surface mb-4 leading-tight">
              Where ideas find their structure.
            </h1>
            <p className="text-on-surface-variant font-body-md max-w-sm">
              Join the ecosystem built for high-velocity collaboration and
              precision engineering.
            </p>
          </div>

          <div className="relative mt-8 group">
            <div className="absolute -inset-4 bg-brand-50 rounded-xl scale-95 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              ref={cardRef}
              alt="Collaborative Whiteboard"
              className="rounded-xl shadow-xl border border-outline-variant relative z-10 transform -rotate-2 group-hover:rotate-0 transition-all duration-500 w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAv767oxgZ_C19ItYUgolEvsRKnyjafK7noDAUpVQ0dXgpABflEkpTMY-wJEdyCxuP1HNSNnL_D6x4RFyxjjYgXbGkEAq8HJJvMSvnueGo90nK17hHaourYwaYu7uvBBfYvfp4CGFS6XZtFiv4Uvyvjq34fdV2BxRwz7QVTwWbTcUHZkjyBz5f8Txz2Lu0WgtO7S2PoRIn2zv5PCz_II23JkYCw9Uu8ZRfHjqPj0kq3ohAFXkvPPucZTF46DNl0RtkBm-casR-VQ3cz"
              style={{ transition: "transform 0.1s ease-out" }}
            />
            <div className="absolute -bottom-6 -right-6 glass-panel p-4 rounded-lg shadow-xl border border-outline-variant z-20 flex items-center gap-3 animate-bounce-slow">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-status-online"></div>
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-status-away"></div>
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-status-offline"></div>
              </div>
              <span className="font-label-md text-sm text-on-surface font-semibold">
                3 Active Editors
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-surface p-8 md:p-16 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">
              bubble_chart
            </span>
            <span className="font-headline-md text-2xl font-bold text-primary">
              CollabFlow
            </span>
          </div>

          {!isRegistered ? (
            <div id="auth-container">
              <div className="flex bg-surface-container p-1 rounded-lg mb-8 w-fit mx-auto md:mx-0">
                <button
                  type="button"
                  className={`px-6 py-2 rounded-md font-label-md text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    mode === "login"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                  onClick={() => handleToggle("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`px-6 py-2 rounded-md font-label-md text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    mode === "signup"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                  onClick={() => handleToggle("signup")}
                >
                  Sign Up
                </button>
              </div>

              <div className="mb-8 text-center md:text-left">
                <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-2">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="text-on-surface-variant font-body-md text-sm">
                  {mode === "login"
                    ? "Enter your credentials to access your workspace."
                    : "Start collaborating with your team in seconds."}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container border-l-4 border-error rounded text-on-error-container text-sm flex gap-2 items-center">
                  <span className="material-symbols-outlined text-xl">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <label
                      className="block font-label-md text-sm font-semibold text-on-surface"
                      htmlFor="username"
                    >
                      Username
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 font-body-md text-sm"
                      id="username"
                      name="username"
                      type="text"
                      placeholder="alex_dev"
                      required
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    className="block font-label-md text-sm font-semibold text-on-surface"
                    htmlFor="email"
                  >
                    Work Email
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 font-body-md text-sm"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      className="block font-label-md text-sm font-semibold text-on-surface"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    {mode === "login" && (
                      <a
                        href="#"
                        className="text-primary font-label-sm text-xs font-semibold hover:underline"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <input
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 font-body-md text-sm"
                    id="password"
                    name="password"
                    type="password"
                    placeholder="********"
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label
                      className="block font-label-md text-sm font-semibold text-on-surface"
                      htmlFor="role"
                    >
                      Workspace Role
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 font-body-md text-sm cursor-pointer"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="VIEWER">VIEWER</option>
                      <option value="EDITOR">EDITOR</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-on-primary py-3 px-6 rounded-lg font-label-md text-sm font-bold shadow-md hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-xl">
                      progress_activity
                    </span>
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Workspace Account"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center" id="verification-view">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mark_email_read
                </span>
              </div>
              <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-2">
                Check your email
              </h2>
              <p className="text-on-surface-variant font-body-md text-sm mb-8 leading-relaxed">
                We've sent a magic link to{" "}
                <span className="font-bold text-on-surface">
                  {formData.email}
                </span>
                . Please click the verification link in that email to activate
                your workspace.
              </p>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() =>
                    window.open("https://mail.google.com", "_blank")
                  }
                  className="w-full bg-primary text-on-primary py-3 px-6 rounded-lg font-label-md text-sm font-bold hover:bg-brand-700 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  Open Mail App
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-primary font-label-md text-sm font-semibold hover:underline cursor-pointer block mx-auto"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-on-surface-variant text-xs">
            By continuing, you agree to our{" "}
            <a className="underline hover:text-primary" href="#">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="underline hover:text-primary" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>

      <div className="fixed top-20 left-10 opacity-10 animate-pulse pointer-events-none">
        <svg height="100" viewBox="0 0 100 100" width="100">
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="40"
            stroke="currentColor"
            strokeWidth="2"
          ></circle>
          <path
            d="M50 10 L50 90 M10 50 L90 50"
            stroke="currentColor"
            strokeWidth="1"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default Auth;
