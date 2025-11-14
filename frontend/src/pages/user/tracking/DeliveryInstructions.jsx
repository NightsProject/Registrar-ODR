import React, { useState } from "react";
import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";
import { getCSRFToken } from "../../../utils/csrf";

function DeliveryInstructions({ onBack, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState("");

    const handleConfirmDelivery = async () => {
        setLoading(true);
        setNotification("");
        try {
            const csrfToken = getCSRFToken();
            const response = await fetch('/api/set-order-type', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ order_type: 'DELIVERY' }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setNotification("Delivery confirmed successfully.");
                // Optionally, navigate back or to another view
                setTimeout(() => {
                    if (onConfirm) onConfirm();
                    else onBack();
                }, 2000);
            } else {
                setNotification(data.notification || "Failed to confirm delivery.");
            }
        } catch (error) {
            console.error("Error confirming delivery:", error);
            setNotification("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
            <div className="text-section">
                <h3 className="status-title">LBC Delivery</h3>
                <p className="subtext-long">
                    You have chosen to receive your document via LBC Express. You will be redirected to the official LBC website to complete the delivery request.
                </p>
                <div className="instructions-section">
                    <div className="instructions-title">Instructions Before Redirecting:</div>
                    <div className="instructions-body">
                        <div className="instructions-intro"> Please prepare the following information to enter on the LBC form:</div>
                        <ol className="instructions-list">
                            <li><strong>Recipient Name</strong> - Must match the valid ID.</li>
                            <li><strong>Complete Delivery Address</strong> - Include house number, street, barangay, city/municipality, and province.</li>
                            <li><strong>Contact Number</strong> - Mobile number for LBC updates.</li>
                            <li><strong>Request ID</strong> - [REQ-12345] (for reference).</li>
                            <li><strong>Preferred Delivery Option</strong> - Standard (3-5 business days) or Express (if available).</li>
                        </ol>
                    </div>
                </div>
            </div>
            {notification && (
                <div className="notification-section">
                    <p className={`notification ${notification.includes("successfully") ? "success" : "error"}`}>
                        {notification}
                    </p>
                </div>
            )}
            <div className="action-section">
                <div className="button-section">
                    <ButtonLink onClick={onBack} placeholder="Return" variant="secondary" />
                    <ButtonLink
                        onClick={handleConfirmDelivery}
                        placeholder={loading ? "Confirming..." : "Proceed"}
                        variant="primary"
                        disabled={loading}
                    />
                </div>
            </div>
            <div className="support-section">
                <p className="subtext">Need help? Contact the </p>
                <a href="mailto:support@example.com" className="support-email">support.</a>
            </div>
        </>
    );
}

export default DeliveryInstructions;
