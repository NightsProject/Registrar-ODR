import "./FileCard.css";
import ButtonLink from "./ButtonLink";

function FileCard({
  document,
  onClick,
  onEdit,
  onDelete,
  isAdmin = false,
  selectable = false,
  isSelected = false
}) {
  const { doc_name, description, requirements = [], cost, logo_link } = document;

  return (
    <div className="card-container">
    <div
      className={`file-card ${selectable ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
      onClick={selectable ? () => onClick(document) : undefined}
    >
      {/* <div className="logo-section">
        {logo_link && <img src={logo_link} alt="Logo" className="card-logo" />}
      </div> */}

      <div className="name-and-description-section">
        <h2 className="document-name">{doc_name}</h2>
        <p className="subtext">{description}</p>
      </div>

      <div className="requirements-section">
        <p className="requirements-title">Requirements:</p>
        <ul className="subtext">
          {requirements.map((req, index) => (
            <li key={index}>{req}</li>
          ))}
        </ul>
      </div>

      <div className="price-and-action-section">
        <div className="card-price-section">
          <p className="price-amount">Php{Number(cost).toFixed(2)}</p>
          <p className="card-price-text">per copy</p>
        </div>

        {isAdmin && (
          <div className="card-action-section">
            <ButtonLink
              text="Edit"
              placeholder="Edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(document);
              }}
            />
            <button
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(document);
              }}
            >
              <img src="/assets/TrashWhite.svg" alt="Delete" />
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default FileCard;
