import "./DeleteReqPopup.css";
import ButtonLink from "../common/ButtonLink";

function DeleteReqPopup({ onClose, onConfirm }) {
  return (
    <div className="delete-req-overlay">
      <div className="delete-popup">
        <div className="text-section">
          <h3 className="title">Confirm Delete</h3>
          <p className="delete-text">
            Deleting this requirement will remove it from every document that uses it. This change cannot be undone.
          </p>
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
              onClick={onConfirm}
              placeholder="Confirm Delete"
              className="proceed-button"
              variant="destructive"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteReqPopup;
