import React, { useState } from "react";
import "./Request.css";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";

function Summary({
  selectedDocs = [],
  uploadedFiles = {},
  preferredContactInfo = {},
  contactInfo = {},
  onNext = () => {},
  onBack = () => {},
}) {
  const [completing, setCompleting] = useState(false);

  // Calculate total price
  const totalPrice = selectedDocs.reduce((sum, doc) => sum + (doc.cost * doc.quantity || 0), 0);

  const handleComplete = () => {
    setCompleting(true);
    onNext(totalPrice);
  };

  return (
    <>
      {completing && <LoadingSpinner message="Completing request..." />}
      <ContentBox className="summary-box">
        <h2 className="title">Review Your Documents</h2>
        <div className="summary-row">
          <label className="selected-documents-label">Selected Documents</label>
          <hr />
          <div className="summary-info-box">
            {selectedDocs.length === 0 ? (
              <p>No documents selected</p>
            ) : (
              selectedDocs.map((doc, idx) => (
                <div key={idx} className="summary-item">
                  {doc.doc_name} {doc.quantity}x
                </div>
              ))
            )}
          </div>
        </div>

        <div className="summary-row">
          <label className="summary-label">Uploaded Files</label>
          <hr />
          <div className="summary-info-box">
            {Object.keys(uploadedFiles).length === 0 ? (
              <p>No files uploaded</p>
            ) : (
              Object.entries(uploadedFiles).map(([req_id, file]) => (
                <div key={req_id} className="summary-item">
                  {file
                    ? file instanceof File
                      ? file.name
                      : file.split("/").pop() // show the filename from the server path
                    : "No file"}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="summary-row">
          <label className="summary-label">Preferred Contact</label>
          <hr />
          <div className="summary-info-box">
            {preferredContactInfo.method ? (
              <div className="contact-info-item">
                <p className="contact-type-info">{preferredContactInfo.method}</p>
                {preferredContactInfo.method === "Email" && contactInfo.email && (
                  <div className="summary-item">{contactInfo.email}</div>
                )}
                {preferredContactInfo.method === "SMS" && contactInfo.contact_number && (
                  <div className="summary-item">{contactInfo.contact_number}</div>
                )}
                {(preferredContactInfo.method === "WhatsApp" || preferredContactInfo.method === "Telegram") && (
                  <div className="summary-item">Contact via {preferredContactInfo.method}</div>
                )}
              </div>
            ) : (
              "Not set"
            )}
          </div>
        </div>

        <div className="summary-row">
          <label className="summary-label">Price</label>
          <hr />
          <div className="price-item">
            <p className="total-text">Total Php:</p>
            <div className="price-amount">{totalPrice.toFixed(2)}</div>
          </div>
        </div>

        <div className="action-buttons">
          <ButtonLink
            placeholder="Back"
            onClick={onBack}
            variant="secondary"
            disabled={completing}
          />
          <ButtonLink
            placeholder={completing ? "Completing..." : "Complete"}
            onClick={handleComplete}
            variant="primary"
            disabled={completing}
          />
        </div>
      </ContentBox>
    </>
  );
}

export default Summary;
