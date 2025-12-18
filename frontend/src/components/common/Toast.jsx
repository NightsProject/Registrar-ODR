import React, { useEffect, useState } from "react";
import "./Toast.css";

const VARIANT_TITLES = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
};

export default function Toast({ show, message, variant = "info", duration = 4000, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    if (show) {
      // Mount offscreen first, then trigger animation
      setVisible(false);
      requestAnimationFrame(() => setVisible(true)); // <-- triggers transition
      timer = setTimeout(() => setVisible(false), duration);
    }
    return () => clearTimeout(timer);
  }, [show, duration]);

  const handleTransitionEnd = () => {
    if (!visible && onClose) onClose();
  };

  return (
    <div
      className={`toast toast-${variant} ${visible ? "show" : "hide"}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="toast-status-indicator"></div>
      <div className="toast-text-section">
        <h4 className="toast-title">{VARIANT_TITLES[variant] || "Notice"}</h4>
        <p className="subtext">{message}</p>
      </div>
    </div>
  );
}
