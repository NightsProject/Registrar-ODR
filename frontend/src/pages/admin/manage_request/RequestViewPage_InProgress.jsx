
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCSRFToken } from "../../../utils/csrf";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import "./RequestViewPage.css";
import Toast from "../../../components/common/Toast";



const RequestViewPage_InProgress = ({ request, onRefresh, showToast }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [togglingDocuments, setTogglingDocuments] = useState({});
  const [togglingOthersDocuments, setTogglingOthersDocuments] = useState({});
  const [assigneeInfo, setAssigneeInfo] = useState(null);
  

  // Modal state management
  const [showDocReadyModal, setShowDocReadyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Request Changes state
  const [wrongRequirements, setWrongRequirements] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [submittingChanges, setSubmittingChanges] = useState(false);

  // Payment state
  const [paymentReference, setPaymentReference] = useState("");
  
  // Changes state
  const [changes, setChanges] = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  useEffect(() => {
    // Add null check inside useEffect to prevent errors
    if (!request) return;


    // Fetch assignee information if needed
    const fetchAssigneeInfo = async () => {
      try {
        const response = await fetch(`/api/admin/request-admin/${request.request_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCSRFToken()
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setAssigneeInfo({ 
            admin_id: data.admin_id,
          });
        } else {
          // Handle case where request is not assigned
          setAssigneeInfo({ admin_id: "Not Assigned" });
        }
      } catch (error) {
        console.error("Error fetching assignee info:", error);
        setAssigneeInfo({ admin_id: "Unknown Admin" });
      }
    };

    // Fetch changes data
    const fetchChanges = async () => {
      try {
        setLoadingChanges(true);
        const response = await fetch(`/api/admin/requests/${request.request_id}/changes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCSRFToken()
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setChanges(data.changes || []);
        } else {
          console.error('Failed to fetch changes');
        }
      } catch (error) {
        console.error('Error fetching changes:', error);
      } finally {
        setLoadingChanges(false);
      }
    };

    fetchAssigneeInfo();
    fetchChanges();
  }, [request?.request_id]); // Use optional chaining for safe dependency checking

  // Check if all documents are completed
  const areAllDocumentsCompleted = () => {
    if (!request) return false;
    
    // Check selected documents
    const selectedDocs = request.documents || [];
    const selectedDocsCompleted = selectedDocs.length === 0 || selectedDocs.every(doc => doc.is_done);
    
    // Check others documents
    const othersDocs = request.others_documents || [];
    const othersDocsCompleted = othersDocs.length === 0 || othersDocs.every(doc => doc.is_done);
    
    return selectedDocsCompleted && othersDocsCompleted;
  };

  // Get button state and handler
  const getButtonState = () => {
    const allCompleted = areAllDocumentsCompleted();

    if (request.status === "REJECTED" || request.status === "RELEASED" ) {
      return {
        showRequestChanges: false,
        showPaymentButton: false
      };
    }
    
    if (request.status === "DOC-READY" && !request.payment_status) {
      return {
        showRequestChanges: true,
        showPaymentButton: true,
        paymentButtonText: "Paid",
        paymentButtonHandler: () => setShowPaymentModal(true),
        paymentButtonDisabled: false,
        paymentButtonClassName: "btn-primary"
      };
    }
    
    if (request.payment_status === true && request.status === "DOC-READY") {
      return {
        showRequestChanges: false,
        showPaymentButton: true,
        paymentButtonText: "RELEASE",
        paymentButtonHandler: () => setShowReleaseModal(true),
        paymentButtonDisabled: false,
        paymentButtonClassName: "btn-success"
      };
    }
    
    if (allCompleted) {
      return {
        showRequestChanges: true,
        showPaymentButton: true,
        paymentButtonText: "All Done",
        paymentButtonHandler: () => setShowDocReadyModal(true),
        paymentButtonDisabled: false,
        paymentButtonClassName: "btn-primary"
      };
    }

    
    if (!allCompleted) {
      return {
        showRequestChanges: true,
        showPaymentButton: true,
        paymentButtonText: "All Done",
        paymentButtonHandler: () => setShowDocReadyModal(true),
        paymentButtonDisabled: true,
        paymentButtonClassName: "btn-primary"
      };
    }

    

    // Default case - no buttons should show
    return {
      showRequestChanges: false,
      showPaymentButton: false
    };
  };



  // Handle status updates
  const updateRequestStatus = async (newStatus, paymentStatus = null, paymentReferenceValue = "", paymentTypeValue = null) => {
    try {
      setLoading(true);
      
      const csrfToken = getCSRFToken();
      const response = await fetch(`/api/admin/requests/${request.request_id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          payment_status: paymentStatus,
          payment_reference: paymentReferenceValue,
          payment_type: paymentTypeValue !== null ? paymentTypeValue : (paymentStatus ? "IN-PERSON" : null)
        })
      });

      if (response.ok) {
        if (onRefresh) onRefresh();
        setShowDocReadyModal(false);
        setShowPaymentModal(false);
        setShowReleaseModal(false);
        setPaymentReference(""); // Clear payment reference after successful update
      } else {
        const errorData = await response.json();
        showToast('Failed to update status: ' + (errorData.error || 'Unknown error'), "error");
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDocReadyConfirm = () => {
    updateRequestStatus("DOC-READY");
  };




  const handlePaymentConfirm = () => {
    if (!paymentReference.trim()) {
      alert('Please enter a reference number before confirming payment.');
      return;
    }
    updateRequestStatus("DOC-READY", true, paymentReference, "IN-PERSON");
  };


  const handleReleaseConfirm = () => {
    updateRequestStatus("RELEASED");
  };

  // Handle request changes button click
  const handleRequestChanges = () => {
    setWrongRequirements([]);
    setRemarks("");
    setShowRequestChangesModal(true);
  };

  // Toggle requirement selection
  const toggleWrongRequirement = (reqId) => {
    setWrongRequirements(prev => {
      if (prev.includes(reqId)) {
        return prev.filter(id => id !== reqId);
      } else {
        return [...prev, reqId];
      }
    });
  };


  // Submit changes
  const handleSubmitChanges = async () => {
    try {
      setSubmittingChanges(true);
      const response = await fetch(`/api/admin/requests/${request.request_id}/changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify({
          wrong_requirements: wrongRequirements,
          remarks: remarks
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowRequestChangesModal(false);
        if (onRefresh) onRefresh();
        showToast("Changes requested and request rejected successfully.", "success");
        
        // Refresh changes data
        const changesResponse = await fetch(`/api/admin/requests/${request.request_id}/changes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCSRFToken()
          },
          credentials: 'include'
        });

        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          setChanges(changesData.changes || []);
        }
      } else {
        showToast(data.error || "Failed to submit changes", "error");
      }
    } catch (error) {
      console.error('Error submitting changes:', error);
      showToast('Error submitting changes', "error");
    } finally {
      setSubmittingChanges(false);
    }
  };


  // Handle view change
  const handleViewChange = (change) => {
    if (change.file_link) {
      window.open(change.file_link, '_blank', 'noopener,noreferrer');
    }
  };

  if (!request) return <div className="p-8 text-red-500 text-center">No request data provided</div>;



  const toggleDocumentCompletion = async (docId, docName) => {
    try {
      setTogglingDocuments(prev => ({ ...prev, [docId]: true }));
      

      const csrfToken = getCSRFToken();
      const response = await fetch(`/api/admin/requests/${request.request_id}/documents/${docId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        credentials: 'include'
      });


      if (response.ok) {
        const data = await response.json();
        // Update the local state
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to toggle document status:', errorData.error);
        showToast('Failed to toggle document status: ' + (errorData.error || 'Unknown error'), "error");
      }
    } catch (error) {
      console.error('Error toggling document status:', error);
    } finally {
      setTogglingDocuments(prev => ({ ...prev, [docId]: false }));
    }
  };

  const toggleOthersDocumentCompletion = async (docId, docName) => {
    try {
      setTogglingOthersDocuments(prev => ({ ...prev, [docId]: true }));
      

      const csrfToken = getCSRFToken();
      const response = await fetch(`/api/admin/requests/${request.request_id}/others_documents/${docId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        },
        credentials: 'include'
      });


      if (response.ok) {
        const data = await response.json();
        // Update the local state
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to toggle others document status:', errorData.error);
        showToast('Failed to toggle others document status: ' + (errorData.error || 'Unknown error'), "error");
      }
    } catch (error) {
      console.error('Error toggling others document status:', error);
    } finally {
      setTogglingOthersDocuments(prev => ({ ...prev, [docId]: false }));
    }
  };

  return (
    <div className="request-view-wrapper">
      {/* LEFT PANEL */}
      <div className="left-panel-card">
        <div className="student-info-section">
          <h1 className="request-username">{request.full_name}</h1>
          <p className="student-id">{request.student_id || "N/A"}</p>
        </div>



        {/* Selected Documents */}
        <section className="section-block">
          <h2>Selected Documents</h2>
          <hr />
          {request.documents?.length ? (
            request.documents.map((doc, index) => (
              <div key={index} className="document-row">
                <div className="document-info">
                  <input 
                    type="checkbox"
                    checked={doc.is_done || false}
                    onChange={() => toggleDocumentCompletion(doc.doc_id, doc.name)}
                    disabled={togglingDocuments[doc.doc_id]}
                    className="document-checkbox"
                  />
                  <span className={`document-name ${doc.is_done ? 'completed' : ''}`}>
                    {doc.name} {doc.quantity}x
                  </span>
                </div>
                {togglingDocuments[doc.doc_id] && (
                  <div className="loading-spinner-small">⟳</div>
                )}
              </div>
            ))
          ) : (
            <p>No selected documents</p>
          )}
        </section>



        {/* Uploaded Files */}
        <section className="section-block">
          <h2>Uploaded Files</h2>
          <hr />
          {request.uploaded_files?.length ? (
            request.uploaded_files.map((file, index) => (
              <div key={index} className="uploaded-file-row">
                <span className="uploaded-file-name">{file.requirement || file.requirement_name}</span>
                <button className="view-btn" onClick={() => window.open(file.file_path || file.url)}>View</button>
              </div>
            ))
          ) : (
            <p className="null-text">No uploaded files</p>
          )}
        </section>



        {/* Others Documents */}
        <section className="section-block">
          <h2>Others Documents</h2>
          <hr />
          {request.others_documents?.length ? (
            request.others_documents.map((doc, index) => (
              <div key={index} className="others-document-row">
                <div className="document-info">
                  <input 
                    type="checkbox"
                    checked={doc.is_done || false}
                    onChange={() => toggleOthersDocumentCompletion(doc.id, doc.name)}
                    disabled={togglingOthersDocuments[doc.id]}
                    className="document-checkbox"
                  />
                  <span className={`document-name ${doc.is_done ? 'completed' : ''}`}>
                    {doc.name}
                  </span>
                  {doc.description && (
                    <span className="document-description">{doc.description}</span>
                  )}
                </div>
                <div className="document-timestamp">
                  <small>Created: {doc.created_at}</small>
                </div>
                {togglingOthersDocuments[doc.id] && (
                  <div className="loading-spinner-small">⟳</div>
                )}
              </div>
            ))
          ) : (
            <p className="null-text">No other documents</p>
          )}
        </section>

        {/* Changes History */}
        <section className="section-block">
          <h2>Changes History</h2>
          <hr />
          {loadingChanges ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
              <span className="ml-2">Loading changes...</span>
            </div>
          ) : changes.length > 0 ? (
            <div className="changes-table">
              <div className="changes-header">
                <div className="change-requirement">Requirement</div>
                <div className="change-status">Status</div>
                <div className="change-date">Date</div>
                <div className="change-action">Action</div>
              </div>

              {changes.map((change, index) => (
                <div key={index} className="changes-row">
                  <div className="change-requirement">{change.requirement_name}</div>
                  <div className="change-status">
                    <span className={`status-badge ${change.status}`}>{change.status}</span>
                  </div>
                  <div className="change-date">{change.created_at}</div>
                  <div className="change-action">
                    <button 
                      className={`view-change-btn ${!change.file_link ? 'disabled' : ''}`}
                      onClick={() => handleViewChange(change)}
                      disabled={!change.file_link}
                      title={!change.file_link ? 'No file available' : 'View file'}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="null-text">No changes recorded for this request</p>
          )}
        </section>

        {/* Authorization Letter for Outsiders */}
        {request.requester_type === 'Outsider' && request.authorization_letter && (
          <section className="section-block">
            <h2>Authorization Letter</h2>
            <hr />
            <div className="auth-letter-info">
              <p><strong>Requested by:</strong> {request.authorization_letter.requester_name}</p>
              <button 
                className="view-auth-letter-btn"
                onClick={() => window.open(request.authorization_letter.file_url, '_blank')}
              >
                View Authorization Letter
              </button>
            </div>
          </section>
        )}

        {/* Preferred Contact */}
        <section className="section-block">
          <h2>Preferred Contact</h2>
          <hr />
          <p className="null-text">{request.preferred_contact}</p>
        </section>

        {/* Price */}
        <section className="section-block">
          <h2>Price</h2>
          <hr />
          <div className="price-row">
            <span>Total Php:</span>
            <span className="price-value">{request.total_cost}</span>
          </div>
        </section>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel-card">
        <h2 className="details-header">Details</h2>

        <div className="details-grid">


          <div className="details-item">
            <span>Assignee</span>
            <span className="assignee-tag">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                  {assigneeInfo?.admin_id ? assigneeInfo.admin_id.charAt(0).toUpperCase() : '?'}
                </div>
                <span>{assigneeInfo?.admin_id?.split("@")[0] || "Loading..."}</span>
              </div>
            </span>
          </div>

          <div className="details-item">
            <span>Request ID</span>
            <span>{request.request_id}</span>
          </div>

          <div className="details-item">
            <span>College Code</span>
            <span>{request.college_code || "N/A"}</span>
          </div>


          <div className="details-item">
            <span>Requester</span>
            <span className={`requester-type ${request.requester_type === 'Outsider' ? 'outsider' : 'student'}`}>
              {request.requester_type || "Student"}
            </span>
          </div>


          <div className="details-item">
            <span>Payment</span>
            <span className={`payment-status ${request.payment_status ? 'paid' : 'unpaid'}`}>
              {request.payment_status ? "Paid" : "Unpaid"}
            </span>
          </div>


          <div className="details-item">
            <span>Payment Date</span>
            <span>{request.payment_date || "Unconfirmed"}</span>
          </div>

          <div className="details-item">
            <span>Payment Reference</span>
            <span>{request.payment_reference || "N/A"}</span>
          </div>

          <div className="details-item">
            <span>Payment Type</span>
            <span>{request.payment_type || "N/A"}</span>
          </div>

          {/* <div className="details-item">
            <span>Payment Option</span>
            <span>{request.payment_option || "Unconfirmed"}</span>
          </div> */}

          <div className="details-item">
            <span>Pickup Option</span>
            <span>{request.pickup_option || "Unconfirmed"}</span>
          </div>

          {/* <div className="details-item">
            <span>Date Released</span>
            <span>{request.date_released || "Unconfirmed"}</span>
          </div> */}
        </div>






        {/* Only show action buttons for non-auditors */}
        {role !== 'auditor' && (
          <div className="details-buttons">
            {(() => {
              const buttonState = getButtonState();
              return (
                <>

                  {buttonState.showRequestChanges && (
                    <button 
                      className={`btn-warning ${areAllDocumentsCompleted() ? 'disabled' : ''}`}
                      disabled={areAllDocumentsCompleted()}
                      onClick={handleRequestChanges}
                    >
                      Request Changes
                    </button>
                  )}
                  {buttonState.showPaymentButton && (
                    <button 
                      className={buttonState.paymentButtonClassName}
                      onClick={buttonState.paymentButtonHandler}
                      disabled={buttonState.paymentButtonDisabled || loading}
                    >
                      {loading ? "Processing..." : buttonState.paymentButtonText}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}

      </div>


      {/* Doc Ready Confirmation Modal */}
      {showDocReadyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Document Ready</h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to mark this request as DOC-READY? This will change the request status from IN-PROGRESS to DOC-READY.
            </p>
            
            {/* Admin Fee Information */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Admin Fee Information</h3>
              <p className="text-sm text-blue-700">
                <strong>Admin Fee Amount:</strong> ₱{request.admin_fee_amount || '0.00'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                The admin fee has been included in the total cost for this request.
              </p>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowDocReadyModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDocReadyConfirm}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Payment Confirmation</h2>
            <p className="mb-4 text-gray-600">
              This is only for request paid in the cashier. Provide the reference number below.
            </p>
            

            <div className="mb-4">
              <label className="block font-semibold mb-2">Reference Number: <span className="text-red-500">*</span></label>
              <input 
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reference number"
                required
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentReference(""); // Clear reference when canceling
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentConfirm}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Release Confirmation Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Release</h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to release this request? This will change the request status to RELEASED.
            </p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowReleaseModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleReleaseConfirm}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? "Processing..." : "Confirm Release"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Request Changes</h2>
            <p className="mb-4 text-gray-600">Select requirements with wrong uploads and provide remarks.</p>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Requirements:</h3>
              <div className="max-h-40 overflow-y-auto border p-2 rounded">
                {request.all_requirements?.length > 0 ? (
                  request.all_requirements.map(req => (
                    <div key={req.req_id} className="flex items-center mb-2">
                      <input 
                        type="checkbox" 
                        id={`req-${req.req_id}`}
                        checked={wrongRequirements.includes(req.req_id)}
                        onChange={() => toggleWrongRequirement(req.req_id)}
                        className="mr-2"
                      />
                      <label htmlFor={`req-${req.req_id}`} className="text-sm cursor-pointer">{req.name}</label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No specific requirements listed.</p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block font-semibold mb-2">Remarks:</label>
              <textarea 
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Enter remarks here..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRequestChangesModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={submittingChanges}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChanges}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300"
                disabled={submittingChanges || (!wrongRequirements.length && !remarks.trim())}
              >
                {submittingChanges ? "Confirming..." : "Confirm & Reject"}
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
};


export default RequestViewPage_InProgress;
