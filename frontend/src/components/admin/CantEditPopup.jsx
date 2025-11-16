import "./CantEditPopup.css";
import ButtonLink from "../common/ButtonLink";

function CantEditPopup({ onClose}) {
  return (
    <div className="cant-edit-overlay">
      <div className="delete-popup">
        <div className="text-section">
          <h3 className="title">Opps!</h3>
          <p className="delete-text">
            can't edit this requirement because it is currently used in one or more requests.
          </p>
        </div>

        <div className="action-section">
          <div className="button-section">
            <ButtonLink
              onClick={onClose}
              placeholder="Close"
              className="proceed-button"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CantEditPopup;
