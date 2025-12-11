import { useState, useEffect } from "react";
import "./Login.css";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

function EnterName({ onNext, onBack, maskedPhone, setMaskedPhone, goBackToOptions }) {
    const [Firstname, setFirstname] = useState("");
    const [Lastname, setLastname] = useState("");
    const [firstnameError, setFirstnameError] = useState("");
    const [lastnameError, setLastnameError] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.removeItem("jwtToken");
        sessionStorage.clear();
        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "access_token_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 400);
    };

    const handleSubmit = async () => {
        let hasError = false;

        if (!Firstname) {
            setFirstnameError("Please fill in Firstname.");
            hasError = true;
        } else setFirstnameError("");

        if (!Lastname) {
            setLastnameError("Please fill in Lastname.");
            hasError = true;
        } else setLastnameError("");

        if (hasError) {
            triggerShake();
            return;
        }

        setLoading(true);
        setFirstnameError("");
        setLastnameError("");

        try {
            const response = await fetch("/user/check-name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstname: Firstname, lastname: Lastname})
            });

            const data = await response.json();

            if (!response.ok) {
                // Show API error below the correct input
                if (data.message.toLowerCase().includes("firstname")) setFirstnameError(data.message);
                else if (data.message.toLowerCase().includes("lastname") || data.message.toLowerCase().includes("name mismatch")) setLastnameError(data.message);
                else setFirstnameError(data.message); // fallback
                triggerShake();
                setLoading(false);
                return;
            }

            if (data.status === "has_liability") {
                onNext("liability");
                setLoading(false);
                return;
            }

            setMaskedPhone(data.masked_phone);
            onNext(); // proceed to OTP
        } catch (error) {
            setLastnameError("An error occurred. Please try again.");
            triggerShake();
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <LoadingSpinner message="Verifying student..." />}
            <div className="Login-page">
                <ContentBox>
                    <div className="text-section">
                        <h3 className="title">Verify Your Identity</h3>
                    </div>

                    <div className="input-section">
                        <div className="input-wrapper">
                            <p className="subtext">Firstname</p>
                            <input
                                type="text"
                                className={`box-input ${shake && firstnameError ? "input-error shake" : ""}`}
                                placeholder="John"
                                value={Firstname}
                                onChange={e => setFirstname(e.target.value)}
                                disabled={loading}
                            />
                            <div className="error-section">
                                {firstnameError && <p className="error-text">{firstnameError}</p>}
                            </div>
                        </div>

                        <div className="input-wrapper">
                            <p className="subtext">Lastname or Maiden name</p>
                            <input
                                type="text"
                                className={`box-input ${shake && lastnameError ? "input-error shake" : ""}`}
                                placeholder="Doe"
                                value={Lastname}
                                onChange={e => setLastname(e.target.value)}
                                disabled={loading}
                            />
                            <div className="error-section">
                                {lastnameError && <p className="error-text">{lastnameError}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="action-section">
                        <div className="button-section">
                            <ButtonLink
                                to={"/user/landing"}
                                placeholder="Return"
                                className="cancel-button"
                                variant="secondary"
                                disabled={loading}
                            />
                            <ButtonLink
                                onClick={handleSubmit}
                                placeholder={loading ? "Verifying..." : "Proceed"}
                                className="proceed-button"
                                variant="primary"
                                disabled={loading}
                            />
                        </div>
                        <div className="support-section">
                            <a onClick={goBackToOptions} className="forgot-id-link">
                                Try Another Way
                            </a>
                        </div>
                    </div>
                </ContentBox>
            </div>
        </>
    );
}

export default EnterName;
