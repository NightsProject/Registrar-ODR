import "./CantDeletePopup.css";
import ButtonLink from "../common/ButtonLink";

function CantDeletePopup({onClose}) {
  return (
    <div className="cant-delete-overlay">
      <div className="cant-delete-popup">
        <div className="text-section">
          <h3 className="title">Opps!</h3>
          <p className="delete-text">
            can't delete this requirement because it is currently used in one or more requests.
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

export default CantDeletePopup;
