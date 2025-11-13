import { useState, useEffect } from "react";
import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

function EnterTrackId({ onNext }) {
    const [trackingNumber, setTrackingNumber] = useState("");
    const [studentId, setStudentId] = useState("");
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleStudentIdChange = (e) => {
        let value = e.target.value.replace(/[^0-9]/g, "");
        if (value.length > 4) value = value.slice(0, 4) + "-" + value.slice(4, 8);
        setStudentId(value);
    };

    const handleSubmit = async () => {
        if (!trackingNumber || !studentId) {
            triggerError("Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                tracking_number: trackingNumber,
                student_id: studentId
            };

            console.log("Sending payload:", payload);

            const response = await fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tracking_number: trackingNumber, student_id: studentId }),
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            const data = await response.json();
            console.log("Response data:", data);

            if (!response.ok) {
                // if response is not successful use the message from the backend
                triggerError(data.message || "An error occurred.");
                return;
            }

            setError("");
            onNext({
                trackData: data.track_data,
                maskedPhone: data.masked_phone,
                studentId: studentId
            }); // pass the data from the backend to the next step
        } catch (err) {
            console.error("Full error object:", err);
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
            triggerError("An error occurred. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="Track-page">
            {loading && <LoadingSpinner message="Tracking request..." />}
            <div className="text-section">
                <h3 className="title">Track your request</h3>
                <p className="subtext">Only verified students can access request status. Make sure you have your registered number ready.</p>
            </div>

            <div className="input-section">
                <div className="inputs-container">
                    <div className="input-wrapper">
                        <p className="subtext">Tracking Number</p>
                        <input
                            type="text"
                            className={`box-input ${error && !trackingNumber ? "input-error" : ""} ${shake ? "shake" : ""}`}
                            placeholder="e.g., DOC-2021-2134"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="input-wrapper">
                        <p className="subtext">ID Number</p>
                        <input
                            type="text"
                            className={`box-input ${error && !studentId ? "input-error" : ""} ${shake ? "shake" : ""}`}
                            placeholder="0000-0000"
                            value={studentId}
                            onChange={handleStudentIdChange}
                            maxLength={9}
                            disabled={loading}
                        />
                    </div>
                </div>
                <div className="error-section">
                    {error && <p className={`error-text ${shake ? "shake" : ""}`}>{error}</p>}
                </div>
            </div>

            <div className="action-section">
                <div className="button-section">
                    <ButtonLink to={"/user/landing"} placeholder="Return" className="cancel-button" variant="secondary" disabled={loading} />
                    <ButtonLink onClick={handleSubmit} placeholder={loading ? "Tracking..." : "Track"} className="proceed-button" variant="primary" disabled={loading} />
                </div>

                <div className="support-section">
                    <p className="subtext">Forgot ID Number or Tracking Number? Contact the </p>
                    <a href="mailto:support@example.com" className="forgot-id-link">support.</a>
                </div>
            </div>
        </div>
    );
}

export default EnterTrackId;
