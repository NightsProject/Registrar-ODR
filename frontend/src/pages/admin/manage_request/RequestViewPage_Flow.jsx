
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCSRFToken } from "../../../utils/csrf";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import RequestViewPage_Pending from "./RequestViewPage_Pending";
import RequestViewPage_InProgress from "./RequestViewPage_InProgress";
import Toast from "../../../components/common/Toast";
import "./RequestViewPage.css";

const RequestViewPage_Flow = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", variant: "info" });
  const showToast = (message, variant = "info") => {
    setToast({ show: true, message, variant });
  };

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/admin/requests/${requestId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCSRFToken(),
          },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        setRequest(data);
        setStatus(data.status || "");
      } catch (err) {
        console.error("Error fetching request:", err);
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);
  
  // Status mapping - determine which component to load based on status
  const getStatusComponent = (status, requestData, refreshFunction) => {
    const normalizedStatus = status;
    
    switch (normalizedStatus) {
      case "PENDING":
        return <RequestViewPage_Pending request={requestData} onRefresh={refreshFunction} showToast={showToast} />;
      
      case "IN-PROGRESS":
        return <RequestViewPage_InProgress request={requestData} onRefresh={refreshFunction} showToast={showToast} />;

      default:
        // Default to pending component if status is unknown
        return <RequestViewPage_InProgress request={requestData} onRefresh={refreshFunction} showToast={showToast} />; // Can use same component with different styling

    }
  };

  // Function to refresh the request data
  const refreshRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setRequest(data);
      setStatus(data.status || "");
    } catch (err) {
      console.error("Error refreshing request:", err);
      setError("Failed to refresh request");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading request..." />;
  if (error) return <div className="p-8 text-red-500 text-center">Error: {error}</div>;
  if (!request) return <h2>No Request Found</h2>;

  return (
    <div className="request-flow-container">
      <Toast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* Dynamic component loading based on status */}
      <div className="request-content">
        {getStatusComponent(status, request, refreshRequest)}
      </div>
    </div>
  );
};

export default RequestViewPage_Flow;
