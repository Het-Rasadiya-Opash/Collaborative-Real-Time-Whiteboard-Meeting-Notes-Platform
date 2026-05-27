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
  return (
    <div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
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
