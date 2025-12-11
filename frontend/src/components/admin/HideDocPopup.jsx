import "./DeletePopup.css";
import ButtonLink from "../common/ButtonLink";

function HideDocPopup({ onClose, onToggle, document, action = "hide" }) {
  const handleConfirm = () => {
    if (typeof onToggle === "function") {
      onToggle(document.doc_id); // call handler with doc_id
    }
    onClose(); // close the popup after action
  };

  const isHide = action === "hide";

  return (
    <div className="overlay">
      <div className="delete-popup">
        <h3 className="title">{isHide ? "Hide Document" : "Unhide Document"}</h3>
        <p className="subtext">
          {isHide
            ? `Hide "${document?.doc_name}"? It will no longer appear to users, and you can only restore it manually.`
            : `Unhide "${document?.doc_name}"? It will be visible to users again.`}
        </p>
        <div className="delete-popup-actions">
          <ButtonLink onClick={onClose} placeholder="Cancel" variant="secondary" />
          <ButtonLink
            onClick={handleConfirm}
            placeholder={isHide ? "Hide" : "Unhide"}
            variant={isHide ? "destructive" : "primary"}
          />
        </div>
      </div>
    </div>
  );
}

export default HideDocPopup;
