import "./CantDeletePopup.css";
import "./CantDeleteDocPopup.css"
import ButtonLink from "../common/ButtonLink";

function CantDeleteDocPopup({onClose}) {
  return (
    <div className="cant-delete-overlay">
      <div className="cant-delete-popup">
        <div className="text-section">
          <h3 className="title">Opps!</h3>
          <p className="subtext">
            can't delete this document because it is currently used in one or more requests.
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

export default CantDeleteDocPopup;
