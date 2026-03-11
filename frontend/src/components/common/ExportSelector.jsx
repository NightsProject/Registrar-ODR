import React, { useState } from 'react';
import DownloadIcon from '../icons/DownloadIcon';
import './ExportSelector.css';

const ExportSelector = ({ actions = [] }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className="export-select-wrapper" 
      onClick={() => setShowMenu((prev) => !prev)}
      tabIndex={0}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShowMenu(false);
        }
      }}
    >
      <DownloadIcon className="export-icon" width="16" height="16" />
      <span className="export-select-text">Export</span>
      <svg 
        width="10" 
        height="10" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        className={`export-select-arrow ${showMenu ? 'rotate' : ''}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      
      {showMenu && (
        <div className="export-dropdown-menu">
          {actions.map((action, index) => (
            <div 
              key={index}
              className="export-option" 
              onClick={action.onClick}
            >
              {action.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportSelector;
