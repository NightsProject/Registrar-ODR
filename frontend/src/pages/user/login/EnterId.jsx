import { useState, useEffect} from "react";
import "./Login.css";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";
import LoadingSpinner from "../../../components/common/LoadingSpinner";


function EnterId({ onNext, onBack, maskedPhone, setMaskedPhone, goBackToOptions, setOtp }) {
    const [studentId, setStudentId] = useState("");
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.removeItem("jwtToken");
        sessionStorage.clear();

        document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "access_token_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }, []);

    const handleInputChange = (e) => {
    let value = e.target.value;

    value = value.replace(/[^0-9-]/g, "");

    if (value.includes("-")) {
        const dashIndex = value.indexOf("-");
        if (dashIndex !== 4) {
        value = value.replace("-", "");
        }
        value = value.slice(0, 5) + value.slice(5).replace(/-/g, "");
    }

    if (value.length > 4 && value[4] !== "-") {
        value = value.slice(0, 4) + "-" + value.slice(4);
    }

    if (value.length > 9) value = value.slice(0, 9);

    setStudentId(value);
    };

    const handleSubmit = async () => {
        if (studentId.length === 0) {
            triggerError("Please fill in the Student ID.");
            return;
        } else if (studentId.length < 9) {
            triggerError("Please enter a valid Student ID.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/user/check-id", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ student_id: studentId })
            });

            const data = await response.json();

            if (response.status === 404) {
                triggerError(data.message);
                setLoading(false);
                return;
            }

          if (data.status === "has_liability") {
              onNext("liability");
              setLoading(false);
              return;
          }

            setMaskedPhone(data.masked_phone);
            setError("");
            // Pass OTP to parent for flashing in OTP verification step
            if (data.otp) {
                setOtp(data.otp);
            }
            onNext();
        } catch (error) {
            triggerError("An error occurred. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

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
            {loading && <LoadingSpinner message="Verifying student ID..." />}
            <div className="Login-page">
                <ContentBox>
                    <div className="text-section">
                        <h3 className="title">Enter Student ID</h3>
                    </div>

                    <div className="input-section">
                        <p className="subtext">ID Number</p>
                        <div className="input-wrapper">
                            <div className="id-input-wrapper">
                                <input
                                    id="student-id"
                                    type="text"
                                    className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
                                    placeholder="0000-0000"
                                    value={studentId}
                                    onChange={handleInputChange}
                                    maxLength={9}
                                    disabled={loading}
                                />
                            </div>
                            <div className="error-section">
                                {error && <p className={`error-text ${shake ? "shake" : ""}`}>{error}</p>}
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
                            <p className="subtext">Forgot ID Number?</p>
                            <a onClick={goBackToOptions} className="forgot-id-link">Try Another Way</a>
                        </div>
                        </div>
                </ContentBox>
            </div>
        </>
    );
}

export default EnterId;