import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import "./RegistrarMasterLayout.css";

function RegistrarMasterLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    role,
    isLoading,
    logout,
    canAccessRoute,
    getDefaultPath,
    initialAuthCheckComplete,
  } = useAuth();

  // Show loading spinner while the initial auth check is in flight
  if (isLoading && !initialAuthCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // If the user has somehow landed on a route their role can't access,
  // redirect them to the first page they're allowed to see.
  if (!canAccessRoute(location.pathname)) {
    navigate(getDefaultPath(), { replace: true });
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getDisplayName = () => {
    if (user?.email) {
      const emailName = user.email.split("@")[0];
      return emailName
        .split(".")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
        .join(" ");
    }
    return "Administrator";
  };

  return (
    <div className="registrar-master-layout">
      <Sidebar />
      <main className="registrar-content-area">
        <div className="registrar-header-container">
          <Header
            title={`Welcome, ${getDisplayName()}`}
            userRole={role}
            onLogout={handleLogout}
            notifications={[]}
          />
        </div>
        <div className="registrar-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default RegistrarMasterLayout;


