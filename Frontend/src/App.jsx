import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { Route, Routes } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import { setCheckingAuth, setCurrentUser } from "./features/usersSlice";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import PublicBoard from "./pages/PublicBoard";
import apiRequest from "./utils/apiRequest";

const App = () => {
  const dispatch = useDispatch();

  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      try {
        const response = await apiRequest.get("/users/me", { skipToast: true });
        const user = response.data.data;
        dispatch(setCurrentUser(user));
      } catch {
        dispatch(setCheckingAuth(false));
      }
    };
    checkAuth();
  }, [dispatch]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") || "light";
      const html = document.documentElement;
      if (savedTheme === "dark") {
        html.classList.remove("light");
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
        html.classList.add("light");
      }
    } catch {}
  }, []);
  return (
    <div>
      <Toaster
        position="top-right"
        reverseOrder={false}
        limit={1}
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--outline-variant)",
            color: "var(--on-surface)",
          },
        }}
      />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route path="/login" element={<Auth />} />
        <Route path="/board/shared/:token" element={<PublicBoard />} />
      </Routes>
    </div>
  );
};

export default App;
