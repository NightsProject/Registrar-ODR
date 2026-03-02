
import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { useAuth } from "../../contexts/AuthContext";
import { getDefaultPathForRole } from "../../utils/roleUtils";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import "./RegistrarMasterLayout.css";

function RegistrarMasterLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isLoading, logout, canAccessRoute, initialAuthCheckComplete } = useAuth();

  // Show loading spinner while checking authentication
  // Only stop showing loading after initial auth check is complete
  if (isLoading && !initialAuthCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Additional route access check at layout level
  const currentPath = location.pathname;
  if (!canAccessRoute(currentPath)) {
    // Redirect to the first accessible page for the user's role
    const defaultPath = getDefaultPathForRole(role);
    navigate(defaultPath, { replace: true });
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

      const parts = emailName.split(".");

      const capitalizedParts = parts.map((part) => {
        if (!part) return "";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      });
      return capitalizedParts.join(" ");
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
