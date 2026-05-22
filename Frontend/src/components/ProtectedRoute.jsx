import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = ({ allowedRoles }) => {
  const { currentUser, isCheckingAuth } = useSelector((state) => state.users);

  if (isCheckingAuth) {
    return <div>checking access</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
