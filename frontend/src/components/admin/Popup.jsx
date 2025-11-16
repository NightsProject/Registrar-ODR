import { useState, useEffect } from "react";
import "./Popup.css";
import ButtonLink from "../common/ButtonLink";
import RequirementsPopup from "./RequirementsPopup";

function Popup({ onClose, onSuccess, document }) {
  const isEditMode = !!document;
  const [docName, setDocName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

// Keep both states:
const [requirements, setRequirements] = useState([]); // names for the document
const [selectedRequirements, setSelectedRequirements] = useState([]); // IDs from popup
const [allRequirements, setAllRequirements] = useState([]); // fetched from DB



  const [showRequirementsPopup, setShowRequirementsPopup] = useState(false);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState({
    docName: "",
    description: "",
    price: "",
    addRequirements: "",
    requirementsItem: [],
  });

  useEffect(() => {
  fetch("/admin/get-requirements")
    .then((res) => res.json())
    .then((data) => {
      setAllRequirements(data);
      // If editing, mark selected IDs
      if (isEditMode && document.requirements) {
        const selectedIds = data
          .filter((r) => document.requirements.includes(r.requirement_name))
          .map((r) => r.req_id);
        setSelectedRequirements(selectedIds);
      }
    });
}, [isEditMode, document]);


  useEffect(() => {
  const selectedNames = allRequirements
    .filter((r) => selectedRequirements.includes(r.req_id))
    .map((r) => r.requirement_name);
  setRequirements(selectedNames);
}, [selectedRequirements, allRequirements]);


  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  useEffect(() => {
    if (isEditMode) {
      setDocName(document.doc_name || "");
      setDescription(document.description || "");
      setPrice(document.cost?.toString() || "");
      setRequirements(document.requirements || []);
    }
  }, [document, isEditMode]);

  const handleAddRequirement = () => {
    setRequirements([...requirements, ""]);
  };

  const handleRequirementChange = (index, value) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

const handleRemoveRequirement = (index) => {
  // Remove the name
  const updatedNames = requirements.filter((_, i) => i !== index);
  setRequirements(updatedNames);

  // Remove the corresponding ID from selectedRequirements
  const removedRequirementName = requirements[index];
  const removedRequirement = allRequirements.find(
    (r) => r.requirement_name === removedRequirementName
  );
  if (removedRequirement) {
    setSelectedRequirements(
      selectedRequirements.filter((id) => id !== removedRequirement.req_id)
    );
  }
};


  const handleSubmit = async () => {
    const newErrors = { 
      docName: "", 
      description: "", 
      price: "", 
      addRequirements: "", 
      requirementsItem: [] 
    };
    let hasError = false;

    if (!docName.trim()) {
      newErrors.docName = "Document name cannot be empty.";
      hasError = true;
    }

    if (!description.trim()) {
      newErrors.description = "Description is required.";
      hasError = true;
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      newErrors.price = "Price must be a valid number greater than 0.";
      hasError = true;
    }

    if (requirements.length === 0) {
      newErrors.addRequirements = "At least one requirement must be added.";
      hasError = true;
    }

    const reqErrors = requirements.map(r => 
      (!r.trim() ? "Each requirement must have a name." : "")
    );
    if (reqErrors.some(msg => msg)) {
      newErrors.requirementsItem = reqErrors;
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      setShake(true);
      return;
    }

    const data = {
      doc_name: docName,
      description,
      cost: parseFloat(price) || 0,
      requirements,
    };

    const url = isEditMode
      ? `http://127.0.0.1:8000/admin/edit-document/${document.doc_id}`
      : "http://127.0.0.1:8000/admin/add-documents";

    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok)
        throw new Error(isEditMode ? "Failed to edit document" : "Failed to add document");

      const result = await res.json();
      console.log(isEditMode ? "Document updated:" : "Document added:", result);

      if (typeof onSuccess === "function") onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting document:", error);
    }
  };

  return (
    <div className="overlay">
      <div className="popup">
        <h3 className="title">{isEditMode ? "Edit Document" : "Add Document"}</h3>

        <div className="name-and-description-wrapper">
          <div className="name-section">
            <input
              className="document-name-field"
              type="text"
              placeholder="Document Name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <hr />
            <div className={`popup-error-section ${shake ? "shake" : ""}`}>
              {errors.docName && (    
                  <p className="error-text">{errors.docName}</p>
              )}
            </div>
          </div>
          <div className="description-section">
            <input
              className="document-description-field"
              type="text"
              placeholder="Document Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <hr />
            <div className={`popup-error-section ${shake ? "shake" : ""}`}>
              {errors.description && (            
                  <p className="error-text">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="requirements-wrapper">
          <p className="subtext">Requirements</p>
          <div className="requirements-section">
            <div className="add-requirement-section">
              <div
                className="add-requirement"
                onClick={() => setShowRequirementsPopup(true)}
                style={{ cursor: "pointer" }}
              >
                <p className="subtext">Select Requirement</p>
                <img src="/assets/AddIcon.svg" alt="Add Icon" />
              </div>
              <hr />
              <div className={`popup-error-section ${shake ? "shake" : ""}`}>
                {errors.addRequirements && (
                    <p className="error-text">{errors.addRequirements}</p>
                )}
              </div>
            </div>
              <div className="requirement-item-wrapper">
                {requirements.map((req, index) => (
                  <div className="requirement-item" key={index}>
                    <div className="requirement-action-section">
                      <input
                        className="requirement-name-field"
                        type="text"
                        placeholder="Untitled Requirement"
                        value={req}
                        onChange={(e) => handleRequirementChange(index, e.target.value)}
                      />
                      <img
                        src="/assets/XIcon.svg"
                        alt="Remove Icon"
                        style={{ cursor: "pointer" }}
                        className="remove-icon"
                        onClick={() => handleRemoveRequirement(index)}
                      />
                    </div>
                    <hr />
                    <div className={`popup-error-section ${shake ? "shake" : ""}`}>
                      {errors.requirementsItem[index] && (
                          <p className="error-text">{errors.requirementsItem[index]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </div>

        <div className="price-section">
          <div className="price-wrapper">
            <p className="price-text">Price Php:</p>
            <input
              className="document-price-field"
              type="number"
              placeholder="0000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <hr />
          <div className={`popup-error-section ${shake ? "shake" : ""}`}>
            {errors.price && (
              <p className="error-text">{errors.price}</p>
            )}
          </div>
        </div>

        <div className="action-section">
          <div className="button-section">
            <div className="cancel-button-wrapper">
              <ButtonLink
                onClick={onClose}
                placeholder="Cancel"
                className="cancel-button"
                variant="secondary"
              />
            </div>
            <div className="proceed-button-wrapper">
              <ButtonLink
                onClick={handleSubmit}
                placeholder={isEditMode ? "Save" : "Add"}
                className="proceed-button"
                variant="primary"
              />
            </div>
          </div>
        </div>
        {showRequirementsPopup && (
  <RequirementsPopup
  onClose={() => setShowRequirementsPopup(false)}
  selected={selectedRequirements}
  setSelected={setSelectedRequirements}
  onAddRequirement={(newReq) => setAllRequirements(prev => [newReq, ...prev])}
/>
)}

      </div>
    </div>
    
  );
  
}

export default Popup;
