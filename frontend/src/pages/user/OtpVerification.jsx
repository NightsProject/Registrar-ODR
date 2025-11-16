import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login/Login.css";
import ButtonLink from "../../components/common/ButtonLink";
import ContentBox from "../../components/user/ContentBox";
import FlashMessage from "../../components/common/FlashMessage";

function OtpVerification({ onNext, onBack, studentId, maskedPhone, setMaskedPhone, isTracking = false, otp}) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [resending, setResending] = useState(false);
  const [counter, setCounter] = useState(0);
  const [flashMessage, setFlashMessage] = useState(null);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setOtpCode(value);
  };

  const handleSubmit = async () => {
    if (otpCode.length < 6) return triggerError("Please enter a valid 6-digit OTP.");

    try {
      const response = await fetch("/user/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({ student_id: studentId, otp: otpCode })
      });

      const data = await response.json();
      
      console.log("Verify OTP response:", data);
      
      if (!response.ok || data.valid === false) {
        return triggerError(data.message || "Invalid OTP code. Try again.");
      }

      // Success - navigate based on flow
      if (isTracking) {
        onNext();
      } else {
        navigate("/user/request");
      }
    } catch (err) {
      triggerError("Server error. Please try again.");
      console.error("Verify OTP error:", err);
    }
  };


  const handleResendOtp = async () => {
    if (resending || counter > 0) return;

    setResending(true);

    try {
      const response = await fetch("/user/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ student_id: studentId }),
      });

      const data = await response.json();

      if (data.status !== "resent") {
        throw new Error(data.message || "Failed to resend OTP.");
      }

      setMaskedPhone(data.masked_phone);
      setError("");
      console.log("New OTP sent to phone ending with", data.masked_phone);

      // Start countdown (e.g., 30 seconds)
      setCounter(30);
    } catch (err) {
      triggerError(err.message || "Failed to resend OTP. Please try again later.");
      console.error("Resend OTP error:", err);
    } finally {
      setResending(false);
    }
  };

  // Countdown effect
  useEffect(() => {
    let timer;
    if (counter > 0) {
      timer = setTimeout(() => setCounter(counter - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [counter]);

  // Show OTP flash message on mount if OTP is provided
  useEffect(() => {
    if (otp) {
      setFlashMessage(`Testing OTP: ${otp}`);
    }
  }, [otp]);

  const triggerError = (message) => {
    setError(message);
    setShake(true);
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  return (
    <>
      {flashMessage && (
        <FlashMessage
          message={flashMessage}
          type="info"
          onClose={() => setFlashMessage(null)}
        />
      )}
      <div className="Login-page">
        <ContentBox>
        <div className="text-section">
          <h3 className="title">Enter 6-Digit Code</h3>
          <div className="subtext">
            <p>We've sent an OTP to your registered mobile number</p>
            {maskedPhone &&
              <p>ending in **{maskedPhone}.</p>
            }
          </div>
        </div>

        <div className="input-section">
          <p className="subtext">6-Digit Code</p>
          <div className="input-wrapper">
          <input
            id="Code"
            type="numeric"
            className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
            placeholder="000000"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={handleInputChange}
            inputMode="numeric"
            maxLength={6}
          />
          </div>
          <div className="error-section">
            {error && <p className={`error-text ${shake ? "shake" : ""}`}>{error}</p>}
          </div>
        </div>

        <div className="action-section">
          <div className="button-section">
            <ButtonLink onClick={onBack} placeholder="Cancel" className="cancel-button" variant="secondary" />
            <ButtonLink onClick={handleSubmit} placeholder="Proceed" className="proceed-button" />
          </div>

          <div className="support-section">
            <p className="subtext">Didn't receive the code?</p>
            <button 
              className="forgot-id-link" 
              onClick={handleResendOtp} 
              disabled={resending || counter > 0}
            >
              {resending 
                ? "Resending..." 
                : counter > 0 
                  ? `Resend in ${counter}s` 
                  : "Resend OTP"}
            </button>
          </div>
        </div>
      </ContentBox>
    </div>
    </>
  );
}

export default OtpVerification;
