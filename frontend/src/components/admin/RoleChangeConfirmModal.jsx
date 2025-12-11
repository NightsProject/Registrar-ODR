import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import './RoleChangeConfirmModal.css';

const RoleChangeConfirmModal = ({ admin, newRole, onConfirm, onCancel, isLoading = false }) => {
  if (!admin) return null;

  return (
    <div className="role-change-modal-overlay">
      <div className="role-change-modal-popup">
        <h3 className="role-change-modal-title">Confirm Role Change</h3>
        <p className="role-change-modal-message">
          Are you sure you want to change the role of <strong>{admin.email}</strong> from <strong>{admin.role}</strong> to <strong>{newRole}</strong>?
        </p>
        {isLoading && <LoadingSpinner message="Updating role..." />}
        <div className="role-change-modal-action-section">
          <button onClick={onCancel} className="role-change-modal-cancel-button" disabled={isLoading}>No</button>
          <button onClick={onConfirm} className="role-change-modal-confirm-button" disabled={isLoading}>Yes</button>
        </div>
      </div>
    </div>
  );
};

export default RoleChangeConfirmModal;
