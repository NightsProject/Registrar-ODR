import { useState, useEffect, useRef} from "react";
import "./Login.css";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

function RequestInBehalf({ onNext, onBack, maskedPhone, setMaskedPhone, goBackToOptions}) {
    const [Firstname, setFirstname] = useState("");
    const [Lastname, setLastname] = useState("");
    const [WhatsappNo, setWhatsappNo] = useState("");
    const [whatsappError, setWhatsappError] = useState("");
    const [requesterName, setRequesterName] = useState("");
    const [requesterNameError, setRequesterNameError] = useState("");
    const [firstnameError, setFirstnameError] = useState("");
    const [lastnameError, setLastnameError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const whatsappPattern = /^\+?[0-9\s()-]{7,15}$/;
    

    const handleWhatsappChange = (e) => {
        let value = e.target.value;

        // Only allow numbers, +, spaces, (, ), and -
        value = value.replace(/[^\d+\s()-]/g, "");

        setWhatsappNo(value);
    };

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

    const openFileDialog = () => {
        if (!loading) {
        fileInputRef.current.click();
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
        // You can also upload it immediately here if you want
        console.log("Selected file:", e.target.files[0]);
        }
    };
        
    const handleSubmit = async () => {
        let hasError = false;

        // Validate requester name
        if (!requesterName) {
            setRequesterNameError("Please fill in Name (Person or Organization).");
            hasError = true;
        } else {
            setRequesterNameError("");
        }

        // Validate WhatsApp number
        if (!WhatsappNo) {
            setWhatsappError("Please fill in WhatsApp No.");
            hasError = true;
        } else if (!whatsappPattern.test(WhatsappNo)) {
            setWhatsappError("Enter a valid WhatsApp number.");
            hasError = true;
        } else {
            setWhatsappError("");
        }

        // Validate firstname
        if (!Firstname) {
            setFirstnameError("Please fill in Firstname.");
            hasError = true;
        } else {
            setFirstnameError("");
        }

        // Validate lastname
        if (!Lastname) {
            setLastnameError("Please fill in Lastname.");
            hasError = true;
        } else {
            setLastnameError("");
        }

        // Validate file selection
        if (!selectedFile) {
            setUploadError("Please attach an authorization letter.");
            hasError = true;
        } else {
            setUploadError("");
        }

        if (hasError) {
            triggerShake();
            return;
        }


        setLoading(true);

        try {
            // 1. Verify the student first
            const verifyResponse = await fetch("/api/check-name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstname: Firstname, lastname: Lastname, requester_name: requesterName, whatsapp_number: WhatsappNo })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                if (verifyData.message.toLowerCase().includes("firstname")) setFirstnameError(verifyData.message);
                else if (verifyData.message.toLowerCase().includes("lastname") || verifyData.message.toLowerCase().includes("name mismatch")) setLastnameError(verifyData.message);
                else setFirstnameError(verifyData.message);

                triggerShake();
                setLoading(false);
                return;
            }

            // if (verifyData.status === "has_liability") {
            //     onNext("liability");
            //     setLoading(false);
            //     return;
            // }

            // 2. Store auth letter data for later upload
            // Convert file to base64 for storage
            const fileToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const fileReader = new FileReader();
                    fileReader.readAsDataURL(file);
                    fileReader.onload = () => {
                        resolve(fileReader.result.split(',')[1]); // Remove data:mime;base64, prefix
                    };
                    fileReader.onerror = error => reject(error);
                });
            };

            const fileData = await fileToBase64(selectedFile);
            const authLetterData = {
                fileName: selectedFile.name,
                fileType: selectedFile.type,
                fileData: fileData,
                firstname: Firstname,
                lastname: Lastname,
                number: WhatsappNo,
                requesterName: requesterName
            };
            
            // Store in sessionStorage for use in request flow
            sessionStorage.setItem("authLetterData", JSON.stringify(authLetterData));
            console.log("Auth letter data stored for later upload");

            // 3. Set user type and proceed to OTP
            sessionStorage.setItem("user_type", "outsider");
            localStorage.setItem("user_type", "outsider");
            setMaskedPhone(verifyData.masked_phone);
            onNext(); // proceed to OTP

        } catch (error) {
            setError("An error occurred. Please try again.");
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
                        <h5>Requester Details</h5>
                        <div className="input-wrapper">
                            <p className="subtext">Name (Person or Organization)</p>
                            <input
                                id="requester-name"
                                type="text"
                                className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
                                placeholder="e.g. Juan Dela Cruz or ABC Corporation"
                                value={requesterName}
                                onChange={e => setRequesterName(e.target.value)}
                                disabled={loading}
                            />
                            <div className="error-section">
                                 {requesterNameError && <p className="error-text">{requesterNameError}</p>}
                            </div>
                        </div>
                        <div className="input-wrapper">
                            <p className="subtext">Whatsapp No.</p>
                            <input
                                id="Whatsapp-no"
                                type="text"
                                className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
                                placeholder="e.g., +639171234567"
                                value={WhatsappNo}
                                onChange={handleWhatsappChange}
                                disabled={loading}
                            />
                            <div className="error-section">
                                {whatsappError && <p className="error-text">{whatsappError}</p>}
                            </div>
                        </div>
                        
                        <h5>Student Information</h5>
                        <div className="input-wrapper">
                            <p className="subtext">Firstname</p>
                            <input
                                id="student-id"
                                type="text"
                                className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
                                placeholder="e.g. John"
                                value={Firstname}
                                onChange={e => setFirstname(e.target.value)}
                                disabled={loading}
                            />
                            <div className="error-section">
                                 {firstnameError && <p className="error-text">{firstnameError}</p>}
                            </div>
                        </div>

                        <div className="input-wrapper">
                        <p className="subtext">Lastname</p>
                        <input
                            id="student-id"
                            type="text"
                            className={`box-input ${error ? "input-error" : ""} ${shake ? "shake" : ""}`}
                            placeholder="e.g. Doe"
                            value={Lastname}
                            onChange={e => setLastname(e.target.value)}
                            disabled={loading}
                        />
                        <div className="error-section">
                            {lastnameError && <p className="error-text">{lastnameError}</p>}
                        </div>
                        </div>
                    </div>
                    <div className="upload-section">
                        <hr />
                        <p className="subtext">
                            Attach an authorization letter signed by the student.<br />
                            Requests without it may be declined.
                        </p>
                        
                        <ButtonLink
                            placeholder= {!selectedFile ? "Attach Authorization Letter" : "Change File"}
                            className="upload-button"
                            variant= {!selectedFile ? "primary" : "success"}
                            onClick={openFileDialog} // triggers hidden input
                        />

                        {/* Hidden file input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileSelect}
                            accept=".pdf,.jpg,.jpeg,.png" // optional, restrict file types
                        />
                            <div className="error-section">
                                {uploadError && <p className="error-text">{uploadError}</p>}
                                {selectedFile && (
                                    <p className="subtext">Selected file: {selectedFile.name}</p>
                                )}
                            </div>

                        {/* Show selected file */}

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
                            <a onClick={goBackToOptions} className="forgot-id-link">Try Another Way</a>
                        </div>
                        </div>
                </ContentBox>
            </div>
        </>
    );
}

export default RequestInBehalf;