import React from "react";
import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";

function PickupInstructions({ onBack }) {
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
            <div className="action-section">
                <div className="button-section">
                    <ButtonLink onClick={onBack} placeholder="Return" variant="secondary" />
                    <ButtonLink onClick={onBack} placeholder="Confirm Pickup" variant="primary" />
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
