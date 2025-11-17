import { useState } from "react";
import Documents from "./Documents";
import RequestList from "./RequestList";
import UploadRequirements from "./UploadRequirements";
import PreferredContact from "./PreferredContact";
import Summary from "./Summary.jsx";
import SubmitRequest from "./SubmitRequest.jsx";
import { getCSRFToken } from "../../../utils/csrf";

function RequestFlow() {
  const [step, setStep] = useState("documents");
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [trackingId, setTrackingId] = useState("");

  // Progress indicator steps
  const steps = [
    { key: "documents", label: "Select Documents" },
    { key: "requestList", label: "Review Request" },
    { key: "uploadRequirements", label: "Upload Files" },
    { key: "preferredContact", label: "Contact Method" },
    { key: "summary", label: "Review & Submit" },
    { key: "submitRequest", label: "Complete" }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  // the request id is obtained through session

  // State to hold data from each step for final submission
  const [uploadedFiles, setUploadedFiles] = useState({}); // e.g. { req_id: File | string (server path) | null }
  const [preferredContactInfo, setPreferredContactInfo] = useState({});
  const [contactInfo, setContactInfo] = useState({ email: "", contact_number: "" });

  // Step navigation handlers
  const goNextStep = () => {
    switch (step) {
      case "documents":
        setStep("requestList");
        break;
      case "requestList":
        setStep("uploadRequirements");
        break;
      case "uploadRequirements":
        setStep("preferredContact");
        break;
      case "preferredContact":
        setStep("summary");
        break;
      case "summary":
        setStep("submitRequest");
        break;
      default:
        break;
    }
  };

  const goBackStep = () => {
    switch (step) {
      case "requestList":
        setStep("documents");
        break;
      case "uploadRequirements":
        setStep("requestList");
        break;
      case "preferredContact":
        setStep("uploadRequirements");
        break;
      case "summary":
        setStep("preferredContact");
        break;
      case "submitRequest":
        setStep("summary");
        break;
      default:
        break;
    }
  };

  // Handle Next from Documents with requestId
  const handleDocumentsNext = (docs) => {
    setSelectedDocs(docs);
    goNextStep();
  };

  // Handle Next from RequestList with updated docs (including quantity)
  const handleRequestListProceed = (updatedDocs) => {
    // Compute deselected requirements based on previous selectedDocs
    const prevReqIds = new Set();
    selectedDocs.forEach(doc => {
      if (doc.requirements) {
        doc.requirements.forEach(reqName => {
          // We need to map reqName to req_id, but since we don't have requirements here, we'll compute later in UploadRequirements
          // For now, just track the change
        });
      }
    });
    // Actually, better to compute deselected in UploadRequirements based on current requirementsList vs uploadedFiles
    // So no need to compute here, just update selectedDocs
    setSelectedDocs(updatedDocs);
    goNextStep();
  };

  return (
    <>
      {/* Progress Indicator - only for non-documents steps */}
      {step !== "documents" && (
        <div className="request-progress-container">
          <div className="request-progress-bar">
            {steps.map((stepInfo, index) => (
              <div
                key={stepInfo.key}
                className={`progress-step ${index <= currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
              >
                <div className="step-circle">{index + 1}</div>
                <div className="step-label">{stepInfo.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "documents" && (
        <Documents
          selectedDocs={selectedDocs}
          setSelectedDocs={setSelectedDocs}
          onNext={handleDocumentsNext}
          steps={steps}
          currentStepIndex={currentStepIndex}
        />
      )}

      {step === "requestList" && (
        <RequestList
          selectedDocs={selectedDocs}
          onBack={goBackStep}
          onProceed={handleRequestListProceed}
        />
      )}

      {step === "uploadRequirements" && (
        <UploadRequirements
          selectedDocs={selectedDocs}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          onNext={goNextStep}
          onBack={goBackStep}
        />
      )}

      {step === "preferredContact" && (
        <PreferredContact
          preferredContactInfo={preferredContactInfo}
          setPreferredContactInfo={setPreferredContactInfo}
          contactInfo={contactInfo}
          setContactInfo={setContactInfo}
          onNext={goNextStep}
          onBack={goBackStep}
        />
      )}

      {step === "summary" && (
        <Summary
          selectedDocs={selectedDocs}
          uploadedFiles={uploadedFiles}
          preferredContactInfo={preferredContactInfo}
          contactInfo={contactInfo}
          onNext={(totalPrice) => {
            // Fetch complete request here
            fetch("/api/complete-request", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCSRFToken(),
              },
              credentials: "include",
              body: JSON.stringify({ total_price: totalPrice }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  setTrackingId(data.request_id);
                  goNextStep();
                } else {
                  alert(`Error: ${data.notification}`);
                }
              })
              .catch((error) => {
                console.error("Error completing request:", error);
                alert("An error occurred while completing the request.");
              });
          }}
          onBack={goBackStep}
        />
      )}

      {step === "submitRequest" && (
        <SubmitRequest
          selectedDocs={selectedDocs}
          uploadedFiles={uploadedFiles}
          preferredContactInfo={preferredContactInfo}
          contactInfo={contactInfo}
          trackingId={trackingId}
          onBack={goBackStep}
        />
      )}
    </>
  );
}

export default RequestFlow;
