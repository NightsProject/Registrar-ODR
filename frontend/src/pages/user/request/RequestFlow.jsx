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

  // the request id is obtained through session

  // State to hold data from each step for final submission
  const [uploadedFiles, setUploadedFiles] = useState({}); // e.g. { req_id: File }
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
    setSelectedDocs(updatedDocs);
    goNextStep();
  };

  return (
    <>
      {step === "documents" && (
        <Documents
          selectedDocs={selectedDocs}
          setSelectedDocs={setSelectedDocs}
          onNext={handleDocumentsNext}
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
