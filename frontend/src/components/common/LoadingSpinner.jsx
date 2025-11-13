import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
