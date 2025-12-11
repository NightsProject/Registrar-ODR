import React, { useState, useEffect } from "react";
import "./Request.css";
import { getCSRFToken } from "../../../utils/csrf";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";


function RequestList({ selectedDocs = [], setSelectedDocs, quantities = {}, setQuantities, onBack, onProceed}) {
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(true);

  // Fetch saved documents on mount and sync quantities
  useEffect(() => {
    let mounted = true;
    const fetchSavedDocuments = async () => {
      setSyncLoading(true);
      try {
        const res = await fetch("/api/get-saved-documents", {
          method: "GET",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (!mounted) return;
        if (data && data.success && Array.isArray(data.documents) && data.documents.length > 0) {
          // Sync saved quantities with current selection
          const savedQuantities = data.documents.reduce((acc, doc) => {
            acc[doc.doc_id] = doc.quantity || 1;
            return acc;
          }, {});
          setQuantities((prevQuantities) => ({ ...prevQuantities, ...savedQuantities }));
        } else {
          // No saved documents, initialize quantities from current selectedDocs if not already set
          if (Object.keys(quantities).length === 0) {
            const initialQuantities = selectedDocs.reduce((acc, doc) => {
              acc[doc.doc_id] = 1;
              return acc;
            }, {});
            setQuantities(initialQuantities);
          }
        }
      } catch (err) {
        console.error("Error fetching saved documents:", err);
        // On error, initialize quantities from current selectedDocs if not already set
        if (Object.keys(quantities).length === 0) {
          const initialQuantities = selectedDocs.reduce((acc, doc) => {
            acc[doc.doc_id] = 1;
            return acc;
          }, {});
          setQuantities(initialQuantities);
        }
      } finally {
        if (mounted) setSyncLoading(false);
      }
    };

    fetchSavedDocuments();
    return () => {
      mounted = false;
    };
  }, [setSelectedDocs, selectedDocs, setQuantities]);

  const increaseQuantity = (docId) => {
    setQuantities((prev) => ({
      ...prev,
      [docId]: prev[docId] + 1,
    }));
  };

  const decreaseQuantity = (docId) => {
    setQuantities((prev) => ({
      ...prev,
      [docId]: prev[docId] > 1 ? prev[docId] - 1 : 1,
    }));
  };

  // Function to save documents to backend
  const saveDocuments = async (updatedDocs) => {
    const payload = {
      document_ids: updatedDocs.map((doc) => doc.doc_id),
      quantity_list: updatedDocs.map((doc) => doc.quantity),
    };

    try {
      const response = await fetch("/api/save-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save documents");
      }

      const data = await response.json();
      if (data.success) {
        return true;
      } else {
        throw new Error(data.notification || "Save failed");
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      return false;
    }
  };

  // Handler for Proceed button click
  const handleProceed = async () => {
    setLoading(true);
    const updatedDocs = selectedDocs.map((doc) => ({
      ...doc,
      quantity: quantities[doc.doc_id],
    }));

    const success = await saveDocuments(updatedDocs);

    setLoading(false);
    if (success) {
      onProceed(updatedDocs, quantities);
    }
  };

  return (
    <>
      {(loading || syncLoading) && <LoadingSpinner message={syncLoading ? "Loading saved documents..." : "Saving documents..."} />}

      <ContentBox className="request-list">
        <div className="title-container">
          <h3 className="title">My Requests</h3>
          <hr />
        </div>

        <div className="request-item-container">
        {selectedDocs.length === 0 ? (
          <p>No documents selected. Please go back and select documents.</p>
        ) : (
          selectedDocs.map((doc) => (
            <div key={doc.doc_id} className="document-item">
              <div className="title-and-action-section">
                <h3 className="document-name">{doc.doc_name}</h3>

                <div className="quantity-controls">
                  <button
                    className="qty-btn"
                    onClick={() => decreaseQuantity(doc.doc_id)}
                    disabled={loading}
                  >
                    -
                  </button>
                  <span className="quantity-number">{quantities[doc.doc_id]}</span>
                  <button
                    className="qty-btn"
                    onClick={() => increaseQuantity(doc.doc_id)}
                    disabled={loading}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="requirements-header">
                <span className="requirements-label">Requirements</span>
                <hr />
              </div>

              {doc.requirements && doc.requirements.length > 0 ? (
                <ul className="requirements-list">
                  {doc.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              ) : (
                <p>No requirements listed for this document.</p>
              )}
              <hr />
            </div>
          ))
        )}
        </div>
        <div className="action-section">
          <ButtonLink
            placeholder="Back"
            onClick={onBack}
            variant="secondary"
            disabled={loading}
          />
          <ButtonLink
            placeholder={loading ? "Saving..." : "Proceed"}
            onClick={handleProceed}
            variant="primary"
            disabled={loading || syncLoading}
          />
        </div>

       
      </ContentBox>
    </>
  );
}

export default RequestList;
