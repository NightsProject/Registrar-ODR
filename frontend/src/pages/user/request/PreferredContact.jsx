import React, { useState, useEffect } from "react";
import "./Request.css"
import { getCSRFToken } from "../../../utils/csrf";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";

function PreferredContact({ preferredContactInfo = {}, setPreferredContactInfo, contactInfo, setContactInfo, onNext, onBack }) {
  /*
    props:
    - preferredContactInfo: object like { method: "Email" | "SMS" | "WhatsApp" | "Telegram" }
    - setPreferredContactInfo: function to update preferredContactInfo in parent
    - contactInfo: object with email and contact_number
    - setContactInfo: function to update contactInfo in parent
    - onNext: function to call to go next step
    - onBack: function to call to go previous step
  */

  const [selectedMethod, setSelectedMethod] = useState(preferredContactInfo.method || "");
  const [loadingContact, setLoadingContact] = useState(true);
  const [savingContact, setSavingContact] = useState(false);

  // Fetch contact info on component mount
  useEffect(() => {
    fetch("/api/get-contact", {
      method: "GET",
      headers: {
        "X-CSRF-TOKEN": getCSRFToken(),
      },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setContactInfo(data.contact_info);
        } else {
          console.error("Failed to fetch contact info:", data.notification);
        }
        setLoadingContact(false);
      })
      .catch((error) => {
        console.error("Error fetching contact info:", error);
        setLoadingContact(false);
      });
  }, [setContactInfo]);

  // Update parent state on selection change
  useEffect(() => {
    setPreferredContactInfo({ method: selectedMethod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod]);

  // Enable Next only if a method is selected
  const canProceed = selectedMethod !== "";

  const handleNextClick = () => {
    if (!canProceed) {
      alert("Please select a preferred contact method.");
      return;
    }
    setSavingContact(true);
    // Send the selected method to the backend
    fetch("/api/set-preferred-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCSRFToken(),
      },
      credentials: "include",
      body: JSON.stringify({ preferred_contact: selectedMethod }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          onNext();
        } else {
          alert(`Error: ${data.notification}`);
        }
        setSavingContact(false);
      })
      .catch((error) => {
        console.error("Error setting preferred contact:", error);
        alert("An error occurred while setting the preferred contact method.");
        setSavingContact(false);
      });
  };

  return (
    <>
      {(loadingContact || savingContact) && (
        <LoadingSpinner message={loadingContact ? "Loading contact info..." : "Saving contact preference..."} />
      )}

      <ContentBox className="preferred-contact-box">
        <h2>Preferred Contact</h2>

        <form>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="Email"
                checked={selectedMethod === "Email"}
                onChange={() => setSelectedMethod("Email")}
                disabled={loadingContact || savingContact}
              />
              Email <em className="contact-detail">{contactInfo.email || "Not provided"}</em>
            </label>
          </div>

          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="SMS"
                checked={selectedMethod === "SMS"}
                onChange={() => setSelectedMethod("SMS")}
                disabled={loadingContact || savingContact}
              />
              SMS <em className="contact-detail">{contactInfo.contact_number || "Not provided"}</em>
            </label>
          </div>

          <div className="contact-row">
            <label className="radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="WhatsApp"
                checked={selectedMethod === "WhatsApp"}
                onChange={() => setSelectedMethod("WhatsApp")}
                disabled={loadingContact || savingContact}
              />
              WhatsApp
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="contactMethod"
                value="Telegram"
                checked={selectedMethod === "Telegram"}
                onChange={() => setSelectedMethod("Telegram")}
                disabled={loadingContact || savingContact}
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
          disabled={loadingContact || savingContact}
        />
        <ButtonLink
          placeholder={savingContact ? "Saving..." : "Next"}
          onClick={handleNextClick}
          variant="primary"
          disabled={!canProceed || loadingContact || savingContact}
        />
      </div>

      </ContentBox>
    </>
  );
}

export default PreferredContact;