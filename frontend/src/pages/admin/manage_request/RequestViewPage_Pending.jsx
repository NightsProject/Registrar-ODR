
// Updated React component structure based on provided UI layout


import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCSRFToken } from "../../../utils/csrf";
import { useAuth } from "../../../contexts/AuthContext";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import Toast from "../../../components/common/Toast";
import "./RequestViewPage.css";


const RequestViewPage_Pending = ({ request, onRefresh, showToast }) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  // Modal state management
  const [showProcessDocumentModal, setShowProcessDocumentModal] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  // Request Changes state
  const [wrongRequirements, setWrongRequirements] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [submittingChanges, setSubmittingChanges] = useState(false);
  
  // Changes state
  const [changes, setChanges] = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  // Fetch admins for assignment
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/admins-progress', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken()
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
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

  // Handle view change
  const handleViewChange = (change) => {
    if (change.file_link) {
      window.open(change.file_link, '_blank', 'noopener,noreferrer');
    }
  };


  // Handle process document button click
  const handleProcessDocument = () => {
    fetchAdmins();
    setShowProcessDocumentModal(true);
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


  // Handle assignment confirmation
  const handleAssignRequest = async (adminId) => {
    try {
      setLoading(true);
      
      // First, assign the request to the admin
      const assignResponse = await fetch('/api/admin/manual-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify({
          request_ids: [request.request_id],
          admin_id: adminId
        })
      });

      const assignData = await assignResponse.json();
      
      if (!assignResponse.ok) {
        showToast(assignData.error || 'Failed to assign request', "error", "error");
        return;
      }

      // Then, update the status to IN-PROGRESS
      const statusResponse = await fetch(`/api/admin/requests/${request.request_id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'IN-PROGRESS'
        })
      });

      const statusData = await statusResponse.json();
      
      if (statusResponse.ok) {
        setShowProcessDocumentModal(false);
        if (onRefresh) onRefresh();
        showToast(`Request ${request.request_id} assigned successfully to ${adminId} and status updated to IN-PROGRESS`, "success");
      } else {
        // Assignment succeeded but status update failed
        setShowProcessDocumentModal(false);
        if (onRefresh) onRefresh();
        showToast(`Request ${request.request_id} assigned to ${adminId} but failed to update status: ${statusData.error}`, "error");
      }
    } catch (error) {
      console.error('Error assigning request:', error);
      showToast('Failed to assign request', "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch changes data when component mounts
  useEffect(() => {
    if (request && request.request_id) {
      fetchChanges();
    }
  }, [request?.request_id]);

  if (!request) return <div className="p-8 text-red-500 text-center">No request data provided</div>;

  return (
    <div className="request-view-wrapper">
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
                <span>{doc.name} {doc.quantity}x</span>
              </div>
            ))
          ) : (
            <p className="null-text">No selected documents</p>
          )}
        </section>


        {/* Uploaded Files */}
        <section className="section-block">
          <h2>Uploaded Files</h2>
          <hr />
          {request.uploaded_files?.length ? (
            request.uploaded_files.map((file, index) => (
              <p key={index} className="uploaded-file-name">{file.requirement}</p>
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
                  <span className="document-name">{doc.name}</span>
                  {doc.description && (
                    <span className="document-description">{doc.description}</span>
                  )}
                </div>
                <div className="document-timestamp">
                  <small>Created: {doc.created_at}</small>
                </div>
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
            <p>No changes recorded for this request</p>
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
          <p className="preferred-contact">{request.preferred_contact}</p>
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
            <span>Status</span>
            <span>{request.status}</span>
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
            <span>Date Requested</span>
            <span>{request.requested_at}</span>
          </div>

          {/* <div className="details-item">
            <span>Payment Date</span>
            <span>{request.payment_date || "Unconfirmed"} </span>
          </div> */}

          {/* <div className="details-item">
            <span>Payment Option</span>
            <span>{request.payment_option || "Unconfirmed"}</span>
          </div> */}

          {/* <div className="details-item">
            <span>Pickup Option</span>
            <span>{request.pickup_option || "Unconfirmed"}</span>
          </div> */}

          {/* <div className="details-item">
            <span>Date Released</span>
            <span>{request.date_released || "Unconfirmed"}</span>
          </div> */}
          
        </div>






        {/* Only show action buttons for non-auditors */}
        {role !== 'auditor' && (
          <div className="details-buttons">
            <button className="btn-warning" onClick={handleRequestChanges}>Request Changes</button>
            <button className="btn-primary" onClick={handleProcessDocument}>Process Document</button>
          </div>
        )}

      </div>

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

      {/* Process Document Modal */}
      {showProcessDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Assign Request</h2>
            <p className="mb-4 text-gray-600">Select an admin to assign request {request.request_id} ({request.full_name}) to:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {admins.map((admin) => {
                const isAtCapacity = admin.total >= admin.max_requests;
                return (

                  <div
                    key={admin.admin_id}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedAdmin === admin.admin_id
                        ? 'border-blue-500 bg-blue-50'
                        : isAtCapacity
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !isAtCapacity && setSelectedAdmin(admin.admin_id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {admin.profile_picture ? (
                          <img 
                            src={admin.profile_picture} 
                            alt={`${admin.admin_id} profile`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium ${
                            admin.profile_picture ? 'hidden' : 'flex'
                          }`}
                        >
                          {admin.admin_id.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">{admin.admin_id}</div>
                        <div className="text-sm text-gray-600">
                          {admin.completed} / {admin.total} requests completed
                        </div>
                        <div className="text-xs text-gray-500">
                          Capacity: {admin.total} / {admin.max_requests}
                        </div>
                      </div>
                      {isAtCapacity && (
                        <span className="text-xs text-red-600 font-medium">At Capacity</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowProcessDocumentModal(false);
                  setSelectedAdmin(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => selectedAdmin && handleAssignRequest(selectedAdmin)}
                disabled={!selectedAdmin || loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestViewPage_Pending;
