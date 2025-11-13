import React from 'react';
import './RequestModal.css';

const RequestModal = ({ request, onClose }) => {
  if (!request) return null;

  return (
    <div className="overlay">
      <div className="popup">
        <h3 className="title">Request Details</h3>

        {/* Basic Info Section */}
        <section className="section">
          <h4 className="section-title">Basic Information</h4>
          <div className="two-columns">
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
        <section className="section">
          <h4 className="section-title">Status & Timing</h4>
          <div className="two-columns">
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
        <section className="section">
          <h4 className="section-title">Billing & Payment</h4>
          <div className="two-columns">
            <div>
              <p><strong>Payment Status:</strong> {request.payment_status ? "Paid" : "Unpaid"}</p>
            </div>
            <div>
              <p><strong>Total Cost:</strong> {request.total_cost ? `₱${request.total_cost}` : "N/A"}</p>
            </div>
          </div>
          {request.documents && request.documents.length > 0 ? (
            <table className="data-table">
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
        <section className="section">
          <h4 className="section-title">Requirements</h4>
          {request.requirements && request.requirements.length > 0 ? (
            <table className="data-table">
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
                      <td className={`upload-status ${uploaded ? 'uploaded' : 'not-uploaded'}`}>
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
          <section className="section">
            <h4 className="section-title">Uploaded Files</h4>
            <table className="data-table">
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

        {/* Action Buttons */}
        <div className="action-section">
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;
