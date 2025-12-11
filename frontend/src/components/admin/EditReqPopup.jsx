import "./EditReqPopup.css";
import ButtonLink from "../common/ButtonLink";
import { useState, useEffect } from "react";

function EditReqPopup({ onClose, onSave, requirement }) {
  const [name, setName] = useState(requirement.requirement_name);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Requirement name cannot be empty");
      setShake(true);
      return;
    }
    try {
      // Call parent onSave and await for result if it's async
      await onSave(requirement.req_id, name.trim());
      // If save succeeds, close popup
      onClose();
    } catch (err) {
      // If backend returns duplicate name
      setError(err.message || "Requirement name already exists");
      setShake(true);
    }
  };


  return (
    <div className="delete-req-overlay">
      <div className="edit-popup">
        <h3>Edit Requirement</h3>
        <div className="input-section">
          <input
            type="text"
            className="box-input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(""); // clear error while typing
            }}
            placeholder="Requirement Name"
          />
          {error && (
            <div className={`popup-error-section ${shake ? "shake" : ""}`}>
              <p className="error-text">{error}</p>
            </div>
          )}
        </div>
        <div className="button-section">
          <ButtonLink
            onClick={onClose}
            placeholder="Cancel"
            variant="secondary"
          />
          <ButtonLink
            onClick={handleSave}
            placeholder="Save"
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}

export default EditReqPopup;
