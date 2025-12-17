import React from "react";
import "./Request.css"
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";

function PreferredContact({ preferredContactInfo = {}, contactInfo, onNext, onBack, onMethodChange, showToast }) {
  /*
    props:
    - preferredContactInfo: object like { method: "Email" | "SMS" | "WhatsApp" | "Telegram" }
    - contactInfo: object with email and contact_number (from parent state)
    - onNext: function to call to go next step
    - onBack: function to call to go previous step
    - onMethodChange: callback function to notify parent of method selection changes
  */

  const selectedMethod = preferredContactInfo.method || "";

  // Enable Next only if a method is selected
  const canProceed = selectedMethod !== "";

  const handleMethodChange = (method) => {
    if (onMethodChange) {
      onMethodChange(method);
    }
  };

  const handleNextClick = () => {
    if (!canProceed) {
      showToast("Please select a preferred contact method.", "warning");
      return;
    }
    onNext(selectedMethod);
  };

  return (
    <ContentBox className="preferred-contact-box">
      <h2 className="title">Preferred Contact</h2>

      <form className="contact-options">
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="contactMethod"
              value="Email"
              checked={selectedMethod === "Email"}
              onChange={() => handleMethodChange("Email")}
            />
            Email <em className="contact-detail">{contactInfo?.email || "Not provided"}</em>
          </label>
        </div>

        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="contactMethod"
              value="SMS"
              checked={selectedMethod === "SMS"}
              onChange={() => handleMethodChange("SMS")}
            />
            SMS <em className="contact-detail">{contactInfo?.contact_number || "Not provided"}</em>
          </label>
        </div>

        <div className="contact-row">
          <label className="radio-label">
            <input
              type="radio"
              name="contactMethod"
              value="WhatsApp"
              checked={selectedMethod === "WhatsApp"}
              onChange={() => handleMethodChange("WhatsApp")}
            />
            WhatsApp
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="contactMethod"
              value="Telegram"
              checked={selectedMethod === "Telegram"}
              onChange={() => handleMethodChange("Telegram")}
            />
            Telegram
          </label>
        </div>
      </form>

     <div className="action-buttons">
      <ButtonLink
        placeholder="Back"
        onClick={onBack}
        variant="secondary"
      />
      <ButtonLink
        placeholder="Next"
        onClick={handleNextClick}
        variant="primary"
        disabled={!canProceed}
      />
    </div>

    </ContentBox>
  );
}

export default PreferredContact;

