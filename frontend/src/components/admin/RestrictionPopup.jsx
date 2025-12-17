import React from 'react';
import './RestrictionPopup.css';

const RestrictionPopup = ({ isOpen, onClose, currentStatus, targetStatus, allowedTransitions }) => {
  if (!isOpen) return null;

  return (
    <div className="restriction-popup-overlay" onClick={onClose}>
      <div className="restriction-popup-content" onClick={e => e.stopPropagation()}>
        <div className="restriction-popup-icon-container">
          <div className="restriction-popup-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h3 className="restriction-popup-title">Movement Restricted</h3>

        <div className="restriction-popup-message">
          You cannot move a request from <strong>{currentStatus}</strong> to <strong>{targetStatus}</strong>.
        </div>

        {allowedTransitions && allowedTransitions.length > 0 && (
          <div className="restriction-popup-allowed-list">
            <span className="restriction-popup-allowed-title">Allowed moves from {currentStatus}:</span>
            <div className="restriction-popup-allowed-items">
              {allowedTransitions.map((status) => (
                <span key={status} className="restriction-popup-badge">
                  {status}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="restriction-popup-button">
          Understood
        </button>
      </div>
    </div>
  );
};

export default RestrictionPopup;
