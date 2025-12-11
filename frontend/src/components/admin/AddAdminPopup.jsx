import { useState, useEffect } from "react";
import ButtonLink from "../common/ButtonLink";
import "./AddAdminPopup.css";

function AddAdminPopup({ onClose, onSave }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) {
      setError("Email cannot be empty");
      setShake(true);
      return;
    }

    try {
      if (onSave) await onSave(email, role);
      setEmail("");
      setRole("admin");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add admin");
      setShake(true);
    }
  };

  // Reset shake after animation
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  return (
    <div className="add-admin-overlay">
      <div className="add-admin-popup">
        <h3 className="title">Add New Admin</h3>

        <div className="input-section">
          <input
            type="email"
            placeholder="Email..."
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className="box-input"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="box-input"
          >
            <option value="admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Auditor">Auditor</option>
            <option value="none">None</option>
          </select>
          {error && (
            <div className={`popup-error-section ${shake ? "shake" : ""}`}>
              <p className="error-text">{error}</p>
            </div>
          )}
        </div>

        <div className="action-section">
          <div className="button-section">
            <ButtonLink
              onClick={onClose}
              placeholder="Cancel"
              className="cancel-button"
              variant="secondary"
            />
            <ButtonLink
              onClick={handleSave}
              placeholder="Add Admin"
              className="proceed-button"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddAdminPopup;
