import { useState, useEffect } from "react";
import ButtonLink from "../common/ButtonLink";
import "./AddReqPopup.css";

function AddReqPopup({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Requirement name cannot be empty");
      setShake(true);
      return;
    }

    if (onSave) onSave(name);
    setName(""); // clear input after save
  };

  // Reset shake after animation
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  return (
    <div className="add-req-overlay">
      <div className="add-req-popup">
        <h3 className="title">Add Requirement</h3>

        <div className="input-section">
          <input
            type="text"
            placeholder="Requirement name..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(""); // clear error while typing
            }}
            className="box-input"
          />
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
              placeholder="Save"
              className="proceed-button"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddReqPopup;
