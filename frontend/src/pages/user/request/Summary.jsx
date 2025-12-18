

import React, { useState } from "react";
import "./Request.css";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";
import { getCSRFToken } from "../../../utils/csrf";




function Summary({
  selectedDocs = [],
  uploadedFiles = {},
  preferredContactInfo = {},
  contactInfo = {},
  paymentCompleted = false,
  adminFee = 0,
  onNext = () => {},
  onBack = () => {},q, 
  showToast
}) {
  const [completing, setCompleting] = useState(false);

  // Check for authorization letter data
  const authLetterData = React.useMemo(() => {
    try {
      const stored = sessionStorage.getItem("authLetterData");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Handle view file function
  const handleViewFile = (file, filename) => {
    if (file instanceof File) {
      // Create a blob URL for local files
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (typeof file === 'string' && file) {
      // For server files, open the URL directly
      window.open(file, '_blank');
    }
  };

  // Handle view authorization letter
  const handleViewAuthLetter = () => {
    if (authLetterData && authLetterData.fileData) {
      try {
        // Convert base64 to blob and open
        const byteCharacters = atob(authLetterData.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: authLetterData.fileType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.error('Error viewing authorization letter:', error);
        showToast('Error opening authorization letter');
      }
    }
  };



  // Calculate total price - ensure doc.cost is used correctly
  const totalPrice = selectedDocs.reduce((sum, doc) => {
    const cost = doc.cost || 0;
    const quantity = doc.quantity || 1;
    return sum + (cost * quantity);
  }, 0);

  // Ensure adminFee is a number
  const numericAdminFee = Number(adminFee) || 0;

  // Calculate price for documents requiring immediate payment
  const immediatePaymentDocs = selectedDocs.filter(doc => doc.requires_payment_first);
  const immediatePaymentPrice = immediatePaymentDocs.reduce((sum, doc) => {
    const cost = doc.cost || 0;
    const quantity = doc.quantity || 1;
    return sum + (cost * quantity);
  }, 0);


  // Check if any documents require immediate payment
  const hasImmediatePayment = immediatePaymentDocs.length > 0;


  // Check if payment completion is required before allowing submission
  const isPaymentRequired = hasImmediatePayment;
  
  // Check if submission is allowed based on payment status
  const canSubmit = !isPaymentRequired || paymentCompleted;



  const handleComplete = async () => {
    setCompleting(true);
    
    try {
      // If payment is required, first create the request to get tracking ID
      if (isPaymentRequired) {
        await createRequestAndProceedToPayment();
      } else {
        // No payment required, proceed directly to final submission
        onNext();
      }
    } catch (error) {
      console.error('Error completing request:', error);
      setCompleting(false);
      showToast('Error completing request. Please try again.', 'error');
    }
  };

  const createRequestAndProceedToPayment = async () => {
    try {
      // Convert File objects to base64 for submission
      const requirements = Object.entries(uploadedFiles).map(([req_id, file]) => {
        if (file instanceof File) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              const base64 = result.split(',')[1];
              resolve({
                requirement_id: req_id,
                filename: file.name,
                content_type: file.type,
                alreadyUploaded: false,
                file_data: base64
              });
            };
            reader.readAsDataURL(file);
          });
        } else if (typeof file === "string" && file) {
          return {
            requirement_id: req_id,
            filename: file.split("/").pop(),
            content_type: "application/octet-stream",
            alreadyUploaded: true,
            file_data: file
          };
        } else {
          return {
            requirement_id: req_id,
            filename: "",
            content_type: "application/octet-stream",
            alreadyUploaded: false,
            file_data: null
          };
        }
      });

      const requirementsData = await Promise.all(requirements);

      const submissionData = {
        student_info: contactInfo,
        documents: selectedDocs.map(doc => ({
          doc_id: doc.doc_id,
          quantity: doc.quantity || 1,
          doc_name: doc.doc_name || "",
          description: doc.description || "",
          cost: doc.cost || 0,
          isCustom: doc.isCustom || false
        })),
        requirements: requirementsData,
        total_price: totalPrice,
        preferred_contact: preferredContactInfo.method || "SMS",
        payment_status: false, // Will be updated after payment
        remarks: "Request submitted, pending payment"
      };

      const response = await fetch("/api/complete-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();
      
      if (data.success) {
        // Request created successfully, now proceed to payment
        console.log("Request created with ID:", data.request_id);
        // Store tracking ID in sessionStorage for payment processing
        sessionStorage.setItem('current_request_id', data.request_id);
        
        // Proceed to payment gateway
        onNext('payNow');
      } else {
        throw new Error(data.notification || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  };

  const handlePayNow = () => {
    setCompleting(true);
    // Navigate to payment gateway
    onNext('payNow');
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
                <div key={idx} className={`summary-item ${doc.isCustom ? 'custom-doc-item' : ''}`}>
                  <div className="doc-name">
                    {doc.doc_name} {doc.quantity && doc.quantity > 1 ? `${doc.quantity}x` : ''}
                  </div>
                  {doc.isCustom && doc.description && (
                    <div className="custom-doc-description">
                      {doc.description}
                    </div>
                  )}
                  {doc.isCustom && (
                    <div className="custom-doc-badge">Custom Document</div>
                  )}
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
              Object.entries(uploadedFiles).map(([req_id, file]) => {
                const fileName = file
                  ? file instanceof File
                    ? file.name
                    : file.split("/").pop() // show the filename from the server path
                  : "No file";
                
                return (
                  <div key={req_id} className="uploaded-file-item">
                    <div className="file-info">
                      <span className="file-name">{fileName}</span>
                      {file && (
                        <button 
                          className="view-file-btn"
                          onClick={() => handleViewFile(file, fileName)}
                          title="View file"
                        >
                          <img src="/assets/EyeIcon.svg" alt="View" className="view-icon" />
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>


        {authLetterData && (
          <div className="summary-row">
            <label className="summary-label">Authorization Letter</label>
            <hr />
            <div className="summary-info-box">
              <div className="auth-info">
                <div className="auth-details">
                  <div className="summary-item">
                    <strong>Requester:</strong> {authLetterData.requesterName} 
                  </div>
                  <div className="summary-item">
                    <strong>Requesting For:</strong> {authLetterData.firstname} {authLetterData.lastname} 
                  </div>
                  <div className="summary-item">
                    <strong>Contact Number:</strong> {authLetterData.number}
                  </div>
                </div>
                <button 
                  className="view-file-btn auth-view-btn"
                  onClick={handleViewAuthLetter}
                  title="View authorization letter"
                >
                  <img src="/assets/EyeIcon.svg" alt="View" className="view-icon" />
                  View Authorization Letter
                </button>
              </div>
            </div>
          </div>
        )}

        {hasImmediatePayment && (
          <div className="summary-row">
            <label className="summary-label">Immediate Payment Required</label>
            <hr />
            <div className="summary-info-box">
              <div className="immediate-payment-notice">
                <div className="payment-notice-header">
                  <img src="/assets/UnpaidIcon.svg" alt="Payment Required" className="payment-icon" />
                  <span className="payment-notice-title">Payment Required for Processing</span>
                </div>
                <div className="payment-notice-content">
                  <p>The following documents require immediate payment before processing can begin:</p>
                  <div className="payment-docs-list">
                    {immediatePaymentDocs.map((doc, idx) => (
                      <div key={idx} className="payment-doc-item">
                        <span className="payment-doc-name">{doc.doc_name}</span>
                        <span className="payment-doc-price">Php {(doc.cost * (doc.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="payment-total">
                    <strong>Immediate Payment Total: Php {immediatePaymentPrice.toFixed(2)}</strong>
                  </div>
                </div>


                <div className="payment-action-buttons">
                  <span className="payment-note">Click "Complete Request" below to proceed to payment</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="price-breakdown">
            <div className="price-item">
              <p className="price-text">Document Costs:</p>
              <div className="price-amount">Php {totalPrice.toFixed(2)}</div>
            </div>
            <div className="price-item">
              <p className="price-text">Admin Fee:</p>
              <div className="price-amount">Php {numericAdminFee.toFixed(2)}</div>
            </div>
            <hr className="price-divider" />
            <div className="price-item total-price-item">
              <p className="total-text">Total Php:</p>
              <div className="price-amount total-amount">{(totalPrice + numericAdminFee).toFixed(2)}</div>
            </div>
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
            placeholder={completing ? "Completing..." : isPaymentRequired ? "Complete Request & Pay" : "Complete Request"}
            onClick={handleComplete}
            variant="primary"
            disabled={completing}
          />
          {isPaymentRequired && (
            <div className="payment-info-message">
              You will be redirected to complete payment after request creation
            </div>
          )}
        </div>
      </ContentBox>
    </>
  );
}

export default Summary;

