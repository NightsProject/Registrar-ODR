import "./RequestPopup.css";
import ButtonLink from "../common/ButtonLink";

function RequestPopup({ onClose, message = "Your request is empty. Select a document first." }) {
  return (
    <div className="overlay">
      <div className="request-popup">
        <h3 className="title">Oops!</h3>
        <p className="subtext">{message}</p>
        <div className="request-popup-actions">
          <ButtonLink onClick={onClose} placeholder="Return" variant="primary" />
        </div>
      </div>
    </div>
  );
}

export default RequestPopup;
