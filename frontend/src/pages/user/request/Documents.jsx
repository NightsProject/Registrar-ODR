import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Request.css";
import FileCard from "../../../components/common/FileCard";
import RequestPopup from "../../../components/user/RequestPopup";
import CustomDocumentModal from "../../../components/user/CustomDocumentModal";
import SearchBar from "../../../components/common/SearchBar";

function Documents({ availableDocuments = [], selectedDocs, setSelectedDocs, onNext, steps: parentSteps, currentStepIndex: parentStepIndex }) {
  const [showPopup, setShowPopup] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Use documents passed from parent instead of fetching them
  const documents = availableDocuments || [];

  const handleAddCustomDocument = (customDoc) => {
    setSelectedDocs((prevSelected) => {
      const currentSelected = Array.isArray(prevSelected) ? prevSelected : [];
      
      // Check if this custom document is already selected
      if (currentSelected.find((d) => d.doc_id === customDoc.doc_id)) {
        return currentSelected.filter((d) => d.doc_id !== customDoc.doc_id);
      } else {
        return [...currentSelected, customDoc];
      }
    });
  };


  const handleSelect = (doc) => {
    setSelectedDocs((prevSelected) => {
      // Ensure prevSelected is always an array
      const currentSelected = Array.isArray(prevSelected) ? prevSelected : [];
      
      if (currentSelected.find((d) => d.doc_id === doc.doc_id)) {
        return currentSelected.filter((d) => d.doc_id !== doc.doc_id);
      } else {
        return [...currentSelected, doc];
      }
    });
  };

  const handleNextStep = () => {
    if (selectedDocs.length === 0) {
      setShowPopup(true);
      return;
    }
    onNext(selectedDocs);
  };



  const filteredDocuments = documents.filter(
    (doc) =>
      doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <>
      <div className="select-documents-page">
        <div className="bottom-section" id="documents-section">
          <h1 className="title">Select Your Documents</h1>

          {/* Progress Indicator for Documents page - only show first 2 steps */}
          <div className="request-progress-container">
            <div className="request-progress-bar">
              {parentSteps.map((stepInfo, index) => (
                <div
                  key={stepInfo.key}
                  className={`progress-step ${index <= parentStepIndex ? 'active' : ''} ${index < parentStepIndex ? 'completed' : ''}`}
                >
                  <div className="step-circle">{index + 1}</div>
                  <div className="step-label">{stepInfo.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="user-searchbar-container">
            <SearchBar onChange={setSearchTerm} />
          </div>

          <div className="documents-grid">
            {filteredDocuments.map((doc) => (
              <FileCard
                key={doc.doc_id}
                document={doc}
                selectable
                isSelected={selectedDocs.some((d) => d.doc_id === doc.doc_id)}
                onClick={handleSelect}
                isAdmin={false}
                className="document-card"
              />
            ))}
            
            {/* Others button for custom documents */}
            <div className="others-doc-card" onClick={() => setShowCustomModal(true)}>
              <div className="others-card-content">
                <h3>Others</h3>
                <p>Request a custom document</p>
                <span className="plus-icon">+</span>
              </div>
            </div>
            
            <button className="submit-btn" onClick={handleNextStep}>
              My Requests
              {selectedDocs.length > 0 && (
                <span className="request-counter">{selectedDocs.length}</span>
              )}
            </button>
          </div>
        </div>

      </div>
      {showPopup && <RequestPopup onClose={() => setShowPopup(false)} />}
      <CustomDocumentModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={handleAddCustomDocument}
      />
    </>
  );
}

export default Documents;
