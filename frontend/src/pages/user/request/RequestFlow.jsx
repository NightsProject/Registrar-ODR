
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import Documents from "./Documents";
import RequestList from "./RequestList";
import UploadRequirements from "./UploadRequirements";
import PreferredContact from "./PreferredContact";
import PendingRequests from "./PendingRequests";
import Summary from "./Summary.jsx";
import PaymentGateway from "./PaymentGateway.jsx";
import SubmitRequest from "./SubmitRequest.jsx";

import ConfirmModal from "../../../components/user/ConfirmModal";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import Toast from "../../../components/common/Toast";
import { getCSRFToken } from "../../../utils/csrf";


function RequestFlow() {
  const [searchParams] = useSearchParams();

  /* ----------------------------------------------------
     PAYMENT RETURN DETECTION (FIRST & GLOBAL)
  ---------------------------------------------------- */
  const isPaymentReturn =
    searchParams.has("payment") && searchParams.has("tracking");

  /* ----------------------------------------------------
     STEP STATE (RESTORED FIRST)
  ---------------------------------------------------- */
  const [step, setStep] = useState(() => {
    if (isPaymentReturn) return "paymentGateway";
    return sessionStorage.getItem("request_step") || "documents";
  });

  const [trackingId, setTrackingId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [userType, setUserType] = useState(null);

  const [paymentCompleted, setPaymentCompleted] = useState(
    sessionStorage.getItem("payment_completed") === "true"
  );
  const [paymentInfo, setPaymentInfo] = useState(null);

  const [hasActiveRequests, setHasActiveRequests] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "info" });
  const showToast = (message, variant = "info") => {
    setToast({ show: true, message, variant });
  };
  



  /* ----------------------------------------------------
     SAVE STEP (EXCEPT PAYMENT RETURN)
  ---------------------------------------------------- */
  useEffect(() => {
    if (!isPaymentReturn && step) {
      sessionStorage.setItem("request_step", step);
    }
  }, [step, isPaymentReturn]);

  /* ----------------------------------------------------
     USER TYPE
  ---------------------------------------------------- */
  useEffect(() => {
    const type =
      localStorage.getItem("user_type") ||
      sessionStorage.getItem("user_type") ||
      "student";
    setUserType(type);
  }, []);



  /* ----------------------------------------------------
     HANDLE MAYA RETURN (ONCE)
  ---------------------------------------------------- */
  useEffect(() => {
    if (!isPaymentReturn) return;

    const paymentStatus = searchParams.get("payment");
    const tracking = searchParams.get("tracking");
    const stored = sessionStorage.getItem("immediate_payment_info");

    if (!stored) return;

    const payment = JSON.parse(stored);
    if (payment.request_id !== tracking) return;

    if (paymentStatus === "success") {
      setPaymentCompleted(true);
      setPaymentInfo({
        paymentStatus: "success",
        paymentId: tracking,
        amount: payment.amount
      });

      sessionStorage.setItem("payment_completed", "true");
      setStep("paymentGateway");
    }

    if (paymentStatus === "failure") {
      showToast("Payment failed. Please try again.", "error");
      setStep("paymentGateway");
    }

    if (paymentStatus === "cancel") {
      showToast("Payment cancelled.", "info");
      setStep("paymentGateway");
    }

    window.history.replaceState({}, "", "/user/request");
  }, [isPaymentReturn, searchParams]);


  // Centralized state for all request data
  const [requestData, setRequestData] = useState({
    documents: [], // {doc_id, doc_name, cost, quantity}
    requirements: {}, // {req_id: File | string | null}
    studentInfo: {
      full_name: "",
      contact_number: "",
      email: "",
      college_code: ""
    },
    preferredContact: "",
    totalPrice: 0,
    adminFee: 0,
    paymentStatus: false,
    remarks: "Request submitted successfully"
  });

  // Progress indicator steps - exclude payment from progress bar
  const getProgressSteps = () => {
    return [
      { key: "documents", label: "Select Documents" },
      { key: "requestList", label: "Review Request" },
      { key: "uploadRequirements", label: "Upload Files" },
      { key: "preferredContact", label: "Contact Method" },
      { key: "summary", label: "Review & Submit" },
      { key: "submitRequest", label: "Complete" }
    ];
  };

  // Get current steps based on selected documents
  const currentSteps = getProgressSteps();
  const currentStepIndex = currentSteps.findIndex(s => s.key === step);

  // Update progress steps when documents change
  useEffect(() => {
    // This ensures the progress bar updates when documents are selected/changed
    // Payment is now excluded from progress steps, so no redirection needed
  }, [requestData.documents, step]);

  // Safe update function that ensures data types
  const updateRequestData = useCallback((updates) => {
    setRequestData(prev => {
      const updated = { ...prev, ...updates };
      
      // Ensure documents is always an array
      if (updates.documents !== undefined) {
        updated.documents = Array.isArray(updates.documents) ? updates.documents : [];
      }
      
      return updated;
    });
  }, []);

  // Safe setter specifically for documents - always ensures array
  const setDocuments = useCallback((docsOrUpdater) => {
    // First determine the new documents array
    let newDocs;
    if (typeof docsOrUpdater === 'function') {
      // Get current documents safely
      const currentDocs = Array.isArray(requestData.documents) ? requestData.documents : [];
      newDocs = docsOrUpdater(currentDocs);
    } else {
      newDocs = docsOrUpdater;
    }
    
    // Ensure the result is always an array
    const safeDocs = Array.isArray(newDocs) ? newDocs : [];
    
    // Update state with new documents only - preserve requirements
    setRequestData(prev => ({
      ...prev,
      documents: safeDocs
    }));
  }, [requestData.documents]);

  // Always get safe documents array
  const getDocuments = useCallback(() => {
    return Array.isArray(requestData.documents) ? requestData.documents : [];
  }, [requestData.documents]);

  // Load student data and documents on component mount
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await fetch("/api/request", {
          method: "GET",
          headers: {
            "X-CSRF-TOKEN": getCSRFToken(),
          },
          credentials: "include",
        });
        const data = await response.json();



        if (data.status === "success" && data.student_data) {
          setRequestData(prev => ({
            ...prev,
            studentInfo: {
              student_id: data.student_data.student_id || "",
              full_name: data.student_data.student_name || "",
              contact_number: data.student_data.student_contact || "",
              email: data.student_data.email || "",
              college_code: data.student_data.college_code || ""
            },
            adminFee: data.admin_fee || 0
          }));
        }
        
        // Store available documents for Documents component
        if (data.documents) {
          setAvailableDocuments(data.documents);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
    };

    fetchStudentData();
  }, []);

  // Initialize requirements state when documents change
  useEffect(() => {
    if (requestData.documents.length > 0 && Object.keys(requestData.requirements).length === 0) {
      // Initialize requirements with null values for each document's requirements
      // This will be populated by the UploadRequirements component when it fetches the requirements
      setRequestData(prev => ({
        ...prev,
        requirements: {}
      }));
    }
  }, [requestData.documents.length]); // Only depend on documents length, not the whole requirements object


  /* ----------------------------------------------------
     ACTIVE REQUEST CHECK (SKIPPED ON PAYMENT RETURN)
  ---------------------------------------------------- */
  useEffect(() => {
    if (isPaymentReturn) return;

    const checkActiveRequests = async () => {
      try {
        const res = await fetch("/api/check-active-requests", {
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include"
        });
        const data = await res.json();

        if (data.status === "success" && data.active_requests?.length) {
          setHasActiveRequests(true);
          setStep("pendingRequests");
        } else {
          setStep("documents");
        }
      } catch {
        setStep("documents");
      }
    };

    if (userType === "student") checkActiveRequests();
    else setStep("documents");
  }, [userType, isPaymentReturn]);


  /* ----------------------------------------------------
     STEP NAVIGATION
  ---------------------------------------------------- */
  const goNextStep = useCallback((type = null) => {
    const map = {
      documents: "requestList",
      requestList: "uploadRequirements",
      uploadRequirements: "preferredContact",
      preferredContact: "summary",
      summary: type === "payNow" ? "paymentGateway" : "submitRequest",
      paymentGateway: "submitRequest"
    };
    setStep(map[step] || step);
  }, [step]);


  /* ----------------------------------------------------
     PAYMENT HANDLERS
  ---------------------------------------------------- */
  const handleFinalizeRequest = (paymentId) => {

  setTrackingId(paymentId);

  //cleanup
  sessionStorage.removeItem("request_step");
  sessionStorage.removeItem("payment_completed");
  sessionStorage.removeItem("immediate_payment_info");

  // go to next step
  setStep("submitRequest");
};

  // Handler for when user wants to proceed to new request from pending requests
  const handleProceedToNewRequest = useCallback(() => {
    setStep("documents");
  }, []);

  // Handler for when user wants to go back to login
  const handleBackToLogin = useCallback(async () => {
    try {
      await fetch("/api/clear-session", {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
      });
      // Redirect to login page or reload the page
      window.location.reload();
    } catch (error) {
      // Force reload even if logout fails
      window.location.reload();
    }
  }, []);

  const goBackStep = useCallback(() => {
    // If modal is showing, don't proceed with navigation
    if (showConfirmModal) {
      return;
    }

    switch (step) {
      case "pendingRequests":
        // From pending requests, go back to check active requests (which will redirect appropriately)
        setStep("checkActiveRequests");
        break;
      case "requestList":
        // Check if there are any uploaded files that would be lost
        const hasUploadedFiles = Object.values(requestData.requirements).some(
          file => file instanceof File || (typeof file === "string" && file.trim() !== "")
        );
        
        if (hasUploadedFiles) {
          // Show modal to confirm - DO NOT change step immediately
          setShowConfirmModal(true);
          // Store the navigation action
          setPendingNavigation({
            action: "navigateToDocuments",
            clearFiles: true
          });
          // Return without changing step - wait for user confirmation
          return;
        } else {
          // No uploaded files, navigate directly without modal
          setStep("documents");
          return;
        }
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
      case "paymentGateway":
        setStep("summary");
        break;
      default:
        break;
    }
  }, [step, showConfirmModal, requestData.requirements]);

  const handleConfirmEdit = () => {
    if (pendingNavigation && pendingNavigation.action === "navigateToDocuments") {
      // Clear all uploaded files
      setRequestData(prev => ({
        ...prev,
        requirements: {}
      }));
      // Now change the step
      setStep("documents");
    }
    setShowConfirmModal(false);
    setPendingNavigation(null);
  };

  const handleCancelEdit = () => {
    setShowConfirmModal(false);
    setPendingNavigation(null);
  };

  // Handle Next from Documents
  const handleDocumentsNext = (docs) => {
    // Update request data with documents
    updateRequestData({ documents: docs });
    
    // Store request ID in sessionStorage for payment processing
    let currentRequestId = sessionStorage.getItem('current_request_id');
    if (!currentRequestId) {
      currentRequestId = `R${Date.now()}`;
      sessionStorage.setItem('current_request_id', currentRequestId);
    }
    
    goNextStep();
  };

  // Handle Next from RequestList with updated docs (including quantity)
  const handleRequestListProceed = useCallback((updatedDocs, updatedQuantities) => {
    try {
      // Validate input data
      if (!updatedDocs || !Array.isArray(updatedDocs) || updatedDocs.length === 0) {
        throw new Error("No documents selected");
      }
      
      if (!updatedQuantities || typeof updatedQuantities !== 'object') {
        throw new Error("Invalid quantities data");
      }
      
      // Calculate total price with validation
      const totalPrice = updatedDocs.reduce((sum, doc) => {
        const cost = doc.cost || 0;
        const quantity = Math.max(1, Math.min(100, updatedQuantities[doc.doc_id] || 1));
        return sum + (cost * quantity);
      }, 0);
      
      // Update request data with documents and total price
      const documentsWithQuantities = updatedDocs.map(doc => ({
        ...doc,
        quantity: Math.max(1, Math.min(100, updatedQuantities[doc.doc_id] || 1))
      }));
      
      updateRequestData({
        documents: documentsWithQuantities,
        totalPrice
      });
      
      goNextStep();
    } catch (error) {
      showToast("Error processing your request. Please try again.", "error");
    }
  }, [updateRequestData, goNextStep]);

  // Handle requirements upload state changes
  const handleRequirementsUpload = (uploadedFiles) => {
    updateRequestData({ requirements: uploadedFiles });
  };

  // Handle file selection for requirements
  const handleFileSelect = (req_id, file) => {
    setRequestData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [String(req_id)]: file
      }
    }));
  };

  // Handle file removal for requirements
  const handleFileRemove = (req_id) => {
    setRequestData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [String(req_id)]: null
      }
    }));
  };

  // Handle requirements upload and proceed to next step
  const handleRequirementsUploadAndProceed = (uploadedFiles) => {
    handleRequirementsUpload(uploadedFiles);
    goNextStep();
  };

  // Handle preferred contact update
  const handlePreferredContactUpdate = (preferredContact, contactInfo) => {
    updateRequestData({
      preferredContact,
      studentInfo: {
        ...requestData.studentInfo,
        ...contactInfo
      }
    });
    goNextStep();
  };






  // Handle payment completion
  const handlePaymentComplete = useCallback((paymentData) => {
    setPaymentCompleted(true);
    setPaymentInfo(paymentData);
    // Always go to payment gateway to show completed state first
    setStep("paymentGateway");
  }, []);

  // Handle payment gateway back navigation
  const handlePaymentGatewayBack = useCallback(() => {
    setStep("summary");
  }, []);

  // Handle skip payment (for testing)
  const handleSkipPayment = useCallback(() => {
    setPaymentCompleted(false);
    setStep("submitRequest");
  }, []);

  // Handle final submission
  const handleFinalSubmission = async () => {
    await createRequestAndFinalize();
  };

  // Helper function to create request and finalize (for non-payment cases)
  const createRequestAndFinalize = async () => {
    try {
      // Convert File objects to base64 for submission
      const requirements = Object.entries(requestData.requirements).map(([req_id, file]) => {
        if (file instanceof File) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              const base64 = result.split(',')[1];
              resolve({
                requirement_id: req_id,
                filename: file.name,
                content_type: file.type,
                alreadyUploaded: false,
                file_data: base64
              });
            };
            reader.readAsDataURL(file);
          });
        } else if (typeof file === "string" && file) {
          return {
            requirement_id: req_id,
            filename: file.split("/").pop(),
            content_type: "application/octet-stream",
            alreadyUploaded: true,
            file_data: file
          };
        } else {
          return {
            requirement_id: req_id,
            filename: "",
            content_type: "application/octet-stream",
            alreadyUploaded: false,
            file_data: null
          };
        }
      });

      const requirementsData = await Promise.all(requirements);


      const submissionData = {
        student_info: requestData.studentInfo,
        documents: requestData.documents.map(doc => ({
          doc_id: doc.doc_id,
          quantity: doc.quantity || 1,
          doc_name: doc.doc_name || "",
          description: doc.description || "",
          cost: doc.cost || 0,
          isCustom: doc.isCustom || false
        })),
        requirements: requirementsData,
        total_price: requestData.totalPrice,
        admin_fee: requestData.adminFee,
        preferred_contact: requestData.preferredContact || "SMS",
        payment_status: requestData.paymentStatus,
        remarks: requestData.remarks
      };

      const response = await fetch("/api/complete-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(submissionData),
      });


      const data = await response.json();
      if (data.success) {
        const requestId = data.request_id;
        setTrackingId(requestId);

        // Clear saved state since request is completed
        sessionStorage.removeItem('current_request_step');
        sessionStorage.removeItem('current_request_id');
        console.log("[MAYA][BROWSER] Cleared saved state after request completion");

        // Upload auth letter if it exists (for outsider users)
        const authLetterData = sessionStorage.getItem("authLetterData");
        if (authLetterData) {
          try {
            const parsedAuthData = JSON.parse(authLetterData);
            
            // Convert base64 to blob for upload
            const byteCharacters = atob(parsedAuthData.fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: parsedAuthData.fileType });

            const formData = new FormData();
            formData.append("file", blob, parsedAuthData.fileName);
            formData.append("firstname", parsedAuthData.firstname);
            formData.append("lastname", parsedAuthData.lastname);
            formData.append("number", parsedAuthData.number);
            formData.append("requester_name", parsedAuthData.requesterName);
            formData.append("request_id", requestId);

            const authUploadResponse = await fetch("/user/upload-authletter", {
              method: "POST",
              body: formData
            });

            const authUploadData = await authUploadResponse.json();
            
            if (authUploadResponse.ok && authUploadData.success) {
              console.log("Auth letter uploaded successfully with request ID:", requestId);
              // Clear stored auth letter data after successful upload
              sessionStorage.removeItem("authLetterData");
            } else {
              console.warn("Auth letter upload failed:", authUploadData.notification);
            }
          } catch (authError) {
            console.error("Error uploading auth letter:", authError);
          }
        }

        const hasImmediatePayment = requestData.documents.some(doc => doc.requires_payment_first);
        if (hasImmediatePayment) {
          setIsRedirecting(true);
          const studentId = requestData.studentInfo.student_id;
          window.location.href = `/user/track?tracking=${requestId}&student_id=${studentId}`;
        } else {
          goNextStep();
        }
      } else {
        showToast(`Error: ${data.notification}`, "error");
      }
    } catch (error) {
      showToast("An error occurred while completing the request.", "error");
    }
  };

  return (
    <>
      {(step === "checkActiveRequests" || isRedirecting) && (
        <LoadingSpinner message={isRedirecting ? "Redirecting to tracking..." : "Checking for active requests..."} />
      )}

            <Toast
              show={toast.show}
              message={toast.message}
              variant={toast.variant}
              onClose={() => setToast({ ...toast, show: false })}
            />
      
      {step === "pendingRequests" && (
        <PendingRequests
          onProceedToNewRequest={handleProceedToNewRequest}
          onBackToLogin={handleBackToLogin}
        />
      )}

      {/* Progress Indicator - only for non-documents, non-checkActiveRequests, non-pendingRequests, and non-paymentGateway steps */}
      {step !== "documents" && step !== "checkActiveRequests" && step !== "pendingRequests" && step !== "paymentGateway" && !isRedirecting && (
        <div className="request-progress-container">
          <div className="request-progress-bar">
            {currentSteps.map((stepInfo, index) => (
              <div
                key={stepInfo.key}
                className={`progress-step ${index <= currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
              >
                <div className="step-circle">
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                <div className="step-label">{stepInfo.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "documents" && (
        <Documents
          availableDocuments={availableDocuments}
          selectedDocs={getDocuments()}
          setSelectedDocs={setDocuments}
          onNext={handleDocumentsNext}
          steps={currentSteps}
          currentStepIndex={currentStepIndex}
        />
      )}

      {step === "requestList" && (
        <RequestList
          selectedDocs={getDocuments()}
          setSelectedDocs={setDocuments}
          quantities={getDocuments().reduce((acc, doc) => {
            acc[doc.doc_id] = doc.quantity || 1;
            return acc;
          }, {})}

          setQuantities={(quantitiesUpdater) => {
            // Handle both direct object updates and functional updates
            let newQuantities;
            if (typeof quantitiesUpdater === 'function') {
              // Get current quantities from documents
              const currentQuantities = getDocuments().reduce((acc, doc) => {
                acc[doc.doc_id] = doc.quantity || 1;
                return acc;
              }, {});
              newQuantities = quantitiesUpdater(currentQuantities);
            } else {
              newQuantities = quantitiesUpdater;
            }
            
            // Update documents with new quantities
            const documentsWithQuantities = getDocuments().map(doc => ({
              ...doc,
              quantity: newQuantities[doc.doc_id] || 1
            }));
            updateRequestData({ documents: documentsWithQuantities });
          }}
          onBack={goBackStep}
          onProceed={handleRequestListProceed}
        />
      )}

      {step === "uploadRequirements" && (
        <UploadRequirements
          selectedDocs={requestData.documents}
          uploadedFiles={requestData.requirements}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          onNext={handleRequirementsUploadAndProceed}
          onBack={goBackStep}
          showToast={showToast}
        />
      )}

      {step === "preferredContact" && (
        <PreferredContact
          preferredContactInfo={{ method: requestData.preferredContact }}
          contactInfo={requestData.studentInfo}
          onMethodChange={(method) => updateRequestData({ preferredContact: method })}
          onNext={(method) => handlePreferredContactUpdate(method, requestData.studentInfo)}
          onBack={goBackStep}
          showToast={showToast}
        />
      )}

      {step === "summary" && !isRedirecting && (
        <Summary
          selectedDocs={requestData.documents}
          uploadedFiles={requestData.requirements}
          preferredContactInfo={{ method: requestData.preferredContact }}
          contactInfo={requestData.studentInfo}
          paymentCompleted={paymentCompleted}
          adminFee={requestData.adminFee}
          onNext={(navigationType) => {
            handleFinalSubmission();
          }}
          onBack={goBackStep}
          showToast={showToast}
        />
      )}



      {step === "paymentGateway" && (
        <PaymentGateway
          selectedDocs={requestData.documents}
          contactInfo={requestData.studentInfo}
          onPaymentComplete={handlePaymentComplete}
          onFinalizeRequest={handleFinalizeRequest}
          onBack={handlePaymentGatewayBack}
          onSkipPayment={handleSkipPayment}
          paymentCompleted={paymentCompleted}
          paymentInfo={paymentInfo}
          showToast={showToast}
        />
      )}

      {step === "submitRequest" && trackingId && (
        <SubmitRequest
          trackingId={trackingId}
          onBack={goBackStep}
          showToast={showToast}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelEdit}
        onConfirm={handleConfirmEdit}
        title="Confirm Edit Request"
        message="Warning: Editing your request will clear all uploaded requirement files. Are you sure you want to continue?"
      />
    </>
  );
}

export default RequestFlow;
