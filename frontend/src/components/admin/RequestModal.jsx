import React from 'react';
import './RequestModal.css';

const RequestModal = ({ request, onClose, onDelete }) => {
  if (!request) return null;

  return (
    <div className="request-modal-overlay">
      <div className="request-modal-popup">
        <h3 className="request-modal-title">Request Details</h3>

        {/* Basic Info Section */}
        <section className="request-modal-section">
          <h4 className="request-modal-section-title">Basic Information</h4>
          <div className="request-modal-two-columns">
            <div>
              <p><strong>Request ID:</strong> {request.request_id}</p>
              <p><strong>Student ID:</strong> {request.student_id}</p>
              <p><strong>Full Name:</strong> {request.full_name}</p>
            </div>
            <div>
              <p><strong>Contact Number:</strong> {request.contact_number}</p>
              <p><strong>Email:</strong> {request.email}</p>
              <p><strong>Preferred Contact:</strong> {request.preferred_contact}</p>
            </div>
          </div>
        </section>

        {/* Status Section */}
        <section className="request-modal-section">
          <h4 className="request-modal-section-title">Status & Timing</h4>
          <div className="request-modal-two-columns">
            <div>
              <p><strong>Status:</strong> {request.status}</p>
              <p><strong>Requested At:</strong> {request.requested_at}</p>
            </div>
            <div>
              <p><strong>Completed At:</strong> {request.completed_at || "N/A"}</p>
              <p><strong>Remarks:</strong> {request.remarks || "N/A"}</p>
            </div>
          </div>
        </section>

        {/* Billing Section */}
        <section className="request-modal-section">
          <h4 className="request-modal-section-title">Billing & Payment</h4>
          <div className="request-modal-two-columns">
            <div>
              <p><strong>Payment Status:</strong> {request.payment_status ? "Paid" : "Unpaid"}</p>
            </div>
            <div>
              <p><strong>Total Cost:</strong> {request.total_cost ? `₱${request.total_cost}` : "N/A"}</p>
            </div>
          </div>
          {request.documents && request.documents.length > 0 ? (
            <table className="request-modal-data-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Quantity</th>
                  <th>Cost per Unit</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {request.documents.map((doc, index) => (
                  <tr key={index}>
                    <td>{doc.name}</td>
                    <td>{doc.quantity}</td>
                    <td>₱{doc.cost}</td>
                    <td>₱{(doc.cost * doc.quantity).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>₱{request.total_cost}</strong></td>
                </tr>
              </tbody>
            </table>
          ) : <p>N/A</p>}
        </section>

        {/* Requirements Section */}
        <section className="request-modal-section">
          <h4 className="request-modal-section-title">Requirements</h4>
          {request.requirements && request.requirements.length > 0 ? (
            <table className="request-modal-data-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {request.requirements.map((req, index) => {
                  const uploaded = request.uploaded_files?.some(f => f.requirement === req);
                  return (
                    <tr key={index}>
                      <td>{req}</td>
                      <td className={`request-modal-upload-status ${uploaded ? 'uploaded' : 'not-uploaded'}`}>
                        {uploaded ? '✓' : '✗'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p>N/A</p>}
        </section>

        {/* Uploaded Files Section */}
        {request.uploaded_files && request.uploaded_files.length > 0 && (
          <section className="request-modal-section">
            <h4 className="request-modal-section-title">Uploaded Files</h4>
            <table className="request-modal-data-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>File Path</th>
                </tr>
              </thead>
              <tbody>
                {request.uploaded_files.map((file, index) => (
                  <tr key={index}>
                    <td>{file.requirement}</td>
                    <td>{file.file_path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recent Activity Section */}
        {request.recent_log && (
          <section className="request-modal-section">
            <h4 className="request-modal-section-title">Recent Activity</h4>
            <div className="request-modal-activity-item">
              <p><strong>Action:</strong> {request.recent_log.action}</p>
              <p><strong>Details:</strong> {request.recent_log.details}</p>
              <p><strong>Timestamp:</strong> {request.recent_log.timestamp}</p>
              <p><strong>Admin ID:</strong> {request.recent_log.admin_id}</p>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="request-modal-action-section">
          <button onClick={onClose} className="request-modal-close-button">Close</button>
          <button onClick={() => {
            if (window.confirm(`Are you sure you want to delete request ${request.request_id}? This action cannot be undone.`)) {
              onDelete(request.request_id);
            }
          }} className="request-modal-delete-button">Delete Request</button>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;
