import { useState, useEffect } from 'react';
import './FlashMessage.css';

function FlashMessage({ message, type = 'info', duration = 10000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <div className={`flash-message flash-${type}`}>
      <div className="flash-content">
        <span>{message}</span>
        <button className="flash-close" onClick={handleClose}>×</button>
      </div>
    </div>
  );
}

export default FlashMessage;
