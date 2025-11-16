import React from 'react';
import './StatusChangeConfirmModal.css';

const StatusChangeConfirmModal = ({ request, newStatus, onConfirm, onCancel }) => {
  if (!request) return null;

  return (
    <div className="overlay">
      <div className="popup">
        <h3 className="title">Confirm Status Change</h3>
        <p className="message">
          Are you sure you want to change the status of <strong>{request.request_id}</strong> ({request.full_name}) from <strong>{request.status}</strong> to <strong>{newStatus}</strong>?
        </p>
        <div className="action-section">
          <button onClick={onCancel} className="cancel-button">No</button>
          <button onClick={onConfirm} className="confirm-button">Yes</button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeConfirmModal;
