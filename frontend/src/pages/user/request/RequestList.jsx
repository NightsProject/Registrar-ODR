
import React, { useState, useEffect, useCallback } from "react";
import "./Request.css";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";

function RequestList({ selectedDocs = [], setSelectedDocs, quantities = {}, setQuantities, onBack, onProceed, showToast }) {
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(true);
  const [error, setError] = useState("");

  // Quantity validation constants
  const MIN_QUANTITY = 1;
  const MAX_QUANTITY = 100;

  // Initialize quantities from selectedDocs on mount and updates
  useEffect(() => {
    try {
      if (selectedDocs.length > 0) {
        const initialQuantities = selectedDocs.reduce((acc, doc) => {
          // Ensure quantity is within valid bounds
          const quantity = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, doc.quantity || 1));
          acc[doc.doc_id] = quantity;
          return acc;
        }, {});
        
        // Only update if quantities have changed to prevent infinite loops
        const hasChanges = Object.keys(initialQuantities).some(docId => 
          quantities[docId] !== initialQuantities[docId]
        );
        
        if (hasChanges) {
          setQuantities(initialQuantities);
        }
      }
    } catch (err) {
      console.error("Error initializing quantities:", err);
      setError("Failed to initialize quantities. Please refresh the page.");
    } finally {
      setSyncLoading(false);
    }
  }, [selectedDocs, setQuantities, quantities]);

  // Validation function
  const validateQuantity = useCallback((quantity) => {
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      throw new Error("Quantity must be a valid number");
    }
    if (quantity < MIN_QUANTITY) {
      throw new Error(`Quantity cannot be less than ${MIN_QUANTITY}`);
    }
    if (quantity > MAX_QUANTITY) {
      throw new Error(`Quantity cannot be more than ${MAX_QUANTITY}`);
    }
    return true;
  }, []);

  // Error handling wrapper for quantity operations
  const handleQuantityOperation = useCallback((operation, docId) => {
    try {
      setError(""); // Clear any previous errors
      
      setQuantities((prev) => {
        const currentQuantity = prev[docId] || 1;
        let newQuantity;
        
        if (operation === 'increase') {
          newQuantity = currentQuantity + 1;
        } else if (operation === 'decrease') {
          newQuantity = currentQuantity - 1;
        } else {
          throw new Error("Invalid operation");
        }
        
        // Validate the new quantity
        validateQuantity(newQuantity);
        
        return {
          ...prev,
          [docId]: newQuantity
        };
      });
    } catch (err) {
      console.error("Error updating quantity:", err);
      setError(err.message || "Failed to update quantity");
      
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  }, [setQuantities, validateQuantity]);


  const increaseQuantity = useCallback((docId) => {
    handleQuantityOperation('increase', docId);
  }, [handleQuantityOperation]);

  const decreaseQuantity = useCallback((docId) => {
    handleQuantityOperation('decrease', docId);
  }, [handleQuantityOperation]);

  // Enhanced proceed handler with error handling
  const handleProceed = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      // Validate all quantities before proceeding
      const invalidQuantities = Object.entries(quantities).filter(([_, qty]) => {
        try {
          validateQuantity(qty);
          return false;
        } catch {
          return true;
        }
      });
      
      if (invalidQuantities.length > 0) {
        throw new Error("Some quantities are invalid. Please check your selections.");
      }
      
      const updatedDocs = selectedDocs.map((doc) => ({
        ...doc,
        quantity: quantities[doc.doc_id] || 1,
      }));

      // Call onProceed with validated data
      await onProceed(updatedDocs, quantities);
    } catch (err) {
      console.error("Error proceeding with request:", err);
      setError(err.message || "Failed to proceed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedDocs, quantities, onProceed, validateQuantity]);


  return (
    <>
      {loading && <LoadingSpinner message="Processing..." />}
      {syncLoading && <LoadingSpinner message="Loading..." />}
      
      <ContentBox className="request-list">
        <div className="title-container">
          <h3 className="title">My Requests</h3>
          <hr />
        </div>

        {error && (
          <div className="error-message" style={{ 
            backgroundColor: '#fee', 
            color: '#c33', 
            padding: '8px 12px', 
            borderRadius: '4px', 
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

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
                    disabled={loading || syncLoading}
                    title={`Decrease quantity (min: ${MIN_QUANTITY})`}
                  >
                    -
                  </button>
                  <span className="quantity-number">{quantities[doc.doc_id] || 1}</span>
                  <button
                    className="qty-btn"
                    onClick={() => increaseQuantity(doc.doc_id)}
                    disabled={loading || syncLoading}
                    title={`Increase quantity (max: ${MAX_QUANTITY})`}
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
            disabled={loading || syncLoading}
          />
          <ButtonLink
            placeholder={loading ? "Processing..." : "Proceed"}
            onClick={handleProceed}
            variant="primary"
            disabled={loading || syncLoading || selectedDocs.length === 0}
          />
        </div>
      </ContentBox>
    </>
  );
}

export default RequestList;
