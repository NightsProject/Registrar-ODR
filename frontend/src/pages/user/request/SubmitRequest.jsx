import React, { useState } from "react";
import "./Request.css";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";
import { getCSRFToken } from "../../../utils/csrf";

function SubmitRequest({ trackingId }) {
  const [loading, setLoading] = useState(false);

  // Logs out (clears JWT + session) and redirects
  const handleLogoutAndRedirect = async (redirectPath) => {
    setLoading(true);
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-TOKEN": getCSRFToken(),
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear any local or session storage (if used)
      localStorage.removeItem("jwtToken");
      sessionStorage.clear();

      // Redirect smoothly after logout
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 400);
    }
  };

  return (
    <div className="upload-requirements-page">
      <ContentBox className="submit-request-box">
        <div className="text-section">
          <h2 className="title">Your request has been submitted</h2>
          <p className="subtext">
            Your chosen contact will receive the confirmation and tracking details.
            <br />
            Keep this tracking number for future reference.
          </p>
        </div>

        <div className="tracking-id-section">
          <div className="tracking-id-label">Tracking ID:</div>
          <div className="tracking-id">{trackingId}</div>
        </div>

        <div className="action-buttons">
          <ButtonLink
            placeholder={loading ? "Please wait..." : "Return to Home"}
            onClick={() => handleLogoutAndRedirect("/user/Landing")}
            variant="secondary"
            disabled={loading}
          />
          <ButtonLink
            placeholder={loading ? "Please wait..." : "Track Request"}
            onClick={() => handleLogoutAndRedirect("/user/Track")}
            variant="primary"
            disabled={loading}
          />
        </div>
      </ContentBox>
    </div>
  );
}

export default SubmitRequest;
