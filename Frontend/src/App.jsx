import React, { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { Route, Routes, useLocation } from "react-router";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { useDispatch } from "react-redux";
import apiRequest from "./utils/apiRequest";
import { setCheckingAuth, setCurrentUser } from "./features/usersSlice";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  const location = useLocation();

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
      } catch (err) {
        dispatch(setCheckingAuth(false));
      }
    };
    checkAuth();
  }, [dispatch]);
  return (
    <div>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route path="/login" element={<Auth />} />
      </Routes>
    </div>
  );
};

export default App;
