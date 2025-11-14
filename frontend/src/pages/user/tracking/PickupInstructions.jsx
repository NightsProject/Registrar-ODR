import React, { useState } from "react";
import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";
import { getCSRFToken } from "../../../utils/csrf";

function PickupInstructions({ onBack, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState("");

    const handleConfirmPickup = async () => {
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
                body: JSON.stringify({ order_type: 'PICKUP' }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setNotification("Pickup confirmed successfully.");
                // Optionally, navigate back or to another view
                setTimeout(() => {
                    if (onConfirm) onConfirm();
                    else onBack();
                }, 2000);
            } else {
                setNotification(data.notification || "Failed to confirm pickup.");
            }
        } catch (error) {
            console.error("Error confirming pickup:", error);
            setNotification("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
            <div className="text-section">
                <h3 className="status-title">Pickup at Registrar</h3>
                <p className="subtext-long">
                    You have chosen to pick up your document at the Registrar's Office. Please follow the instructions below to complete the pickup process.
                </p>
                <div className="instructions-section">
                    <div className="instructions-title">Pickup Instructions:</div>
                    <div className="instructions-body">
                        <div className="instructions-intro">Please prepare the following and visit the Registrar's Office:</div>
                        <ol className="instructions-list">
                            <li><strong>Valid ID</strong> - Bring a government-issued ID for verification.</li>
                            <li><strong>Tracking Number</strong> - Have your tracking number ready for reference.</li>
                            <li><strong>Payment Receipt</strong> - If applicable, bring proof of payment.</li>
                            <li><strong>Office Hours</strong> - Visit during office hours: Monday to Friday, 8:00 AM to 5:00 PM.</li>
                            <li><strong>Location</strong> - Registrar's Office, MSU-IIT Campus.</li>
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
                        onClick={handleConfirmPickup}
                        placeholder={loading ? "Confirming..." : "Confirm Pickup"}
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

export default PickupInstructions;
