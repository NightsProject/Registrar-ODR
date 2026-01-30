
import React, { useState, useEffect, useMemo } from "react";
import "./Request.css";
import ContentBox from "../../../components/user/ContentBox";
import ButtonLink from "../../../components/common/ButtonLink";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { getCSRFToken } from "../../../utils/csrf";



function PaymentGateway({
  selectedDocs = [],
  contactInfo = {},
  onFinalizeRequest = () => {},
  onSkipPayment = () => {}
}) {
  const [processing, setProcessing] = useState(false);
  const [completingRequest, setCompletingRequest] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // success | failed | null
  const [paymentId, setPaymentId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  /* ----------------------------------------------------
   RESTORE PAYMENT STATE AFTER MAYA REDIRECT (CRITICAL)
  ---------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const tracking = params.get("tracking");

    if (!payment || !tracking) return;

    const storedPayment = sessionStorage.getItem("immediate_payment_info");
    if (!storedPayment) return;

    if (payment === "success") {
      console.log("[MAYA] Payment restored successfully");

      setPaymentStatus("success");
      setPaymentId(tracking);

      sessionStorage.setItem("payment_completed", "true");

    } else if (payment === "failure") {
      setPaymentStatus("failed");
      setErrorMessage("Payment failed. Please try again.");
    

    } else if (payment === "cancel") {
      console.log("[MAYA] Payment canceled, preserving essential data");
      

      // Preserve critical data (request ID, amount, document IDs)
      const preservedData = sessionStorage.getItem("payment_preserved_data");
      if (preservedData) {
        console.log("[MAYA] Essential payment data preserved");
        // Set the payment ID from preserved data for display
        try {
          const parsedPreserved = JSON.parse(preservedData);
          setPaymentId(parsedPreserved.requestId);
          console.log("[MAYA] Payment ID set to:", parsedPreserved.requestId);
        } catch (error) {
          console.error("[MAYA] Error parsing preserved data for display:", error);
        }
      }
      
      // Clear URL parameters and reset state
      window.history.replaceState({}, "", "/user/request");
      
      // Reset to initial state but keep payment info for retry
      setPaymentStatus(null);
      setErrorMessage("");
      
    }

  }, []);

  /* ----------------------------------------------------
   GET PRESERVED PAYMENT DATA
  ---------------------------------------------------- */
  const getPreservedPaymentData = () => {
    const preservedData = sessionStorage.getItem("payment_preserved_data");
    if (preservedData) {
      try {
        return JSON.parse(preservedData);
      } catch (error) {
        console.error("[MAYA] Error parsing preserved payment data:", error);
      }
    }
    return null;
  };



  /* ----------------------------------------------------
   PAYMENT CALCULATION
  ---------------------------------------------------- */
  // Get preserved payment data if available
  const preservedData = getPreservedPaymentData();
  

  // Use preserved data if available, otherwise fall back to props
  const immediatePaymentDocs = preservedData ? 
    preservedData.documents || [] :
    selectedDocs.filter((doc) => doc.requires_payment_first);


  const immediatePaymentPrice = preservedData ? 
    preservedData.amount :
    immediatePaymentDocs.reduce((sum, doc) => {
      const cost = doc.cost || 0;
      const quantity = doc.quantity || 1;
      return sum + cost * quantity;
    }, 0);


  /* ----------------------------------------------------
   PAYMENT COMPLETED CHECK (RELOAD SAFE)
  ---------------------------------------------------- */
  const isPaymentCompleted =
    paymentStatus === "success" ||
    sessionStorage.getItem("payment_completed") === "true";


  /* ----------------------------------------------------
   MAYA PAYMENT HANDLER
  ---------------------------------------------------- */
  const MAYA_PUBLIC_KEY =
    "pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah";

  /* ----------------------------------------------------
   COMPLETE REQUEST HANDLER (WITH PAYMENT STATUS UPDATE)
  ---------------------------------------------------- */
  const handleCompleteRequest = async () => {
    setCompletingRequest(true);
    setErrorMessage("");

    try {
      // Get preserved payment data to extract document IDs
      const preservedData = getPreservedPaymentData();
      if (!preservedData) {
        throw new Error("Payment data not found");
      }

      // Extract document IDs from preserved documents
      const docIds = preservedData.documents.map(doc => doc.doc_id || doc.id);
      
      if (docIds.length === 0) {
        throw new Error("No document IDs found");
      }


      // Call mark-document-paid endpoint
      const response = await fetch("/api/mark-document-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken()
        },
        credentials: "include",
        body: JSON.stringify({
          trackingNumber: preservedData.requestId,
          amount: preservedData.amount,
          studentId: contactInfo.student_id || contactInfo.email || "unknown",
          docIds: docIds
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to mark documents as paid");
      }

      console.log("[MAYA] Documents marked as paid successfully");
      
      // Proceed to finalize request only after successful payment status update
      onFinalizeRequest(preservedData.requestId);

    } catch (error) {
      console.error("[MAYA] Error marking documents as paid:", error);
      setErrorMessage(error.message || "Failed to complete request. Please try again.");
    } finally {
      setCompletingRequest(false);
    }
  };


  const handlePayment = async () => {
    setProcessing(true);
    setErrorMessage("");


    try {
      // Save essential payment data before initiating payment
      const currentRequestId = sessionStorage.getItem("current_request_id");
      

      const paymentDataToPreserve = {
        requestId: currentRequestId,
        amount: immediatePaymentPrice,
        documents: immediatePaymentDocs.map(doc => ({
          doc_id: doc.doc_id || doc.id,
          doc_name: doc.doc_name,
          cost: doc.cost || 0,
          quantity: doc.quantity || 1,
          requires_payment_first: true
        })),
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem("payment_preserved_data", JSON.stringify(paymentDataToPreserve));
      console.log("[MAYA] Essential payment data preserved:", paymentDataToPreserve);


      if (!currentRequestId) {
        setErrorMessage("Request ID not found. Please go back.");
        setProcessing(false);
        return;
      }

      const response = await fetch(
        "https://pg-sandbox.paymaya.com/checkout/v1/checkouts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + btoa(MAYA_PUBLIC_KEY + ":")
          },
          body: JSON.stringify({
            totalAmount: {
              value: immediatePaymentPrice,
              currency: "PHP"
            },
            requestReferenceNumber: currentRequestId,
            metadata: {
              trackingNumber: currentRequestId,
              studentId:
                contactInfo.student_id ||
                contactInfo.email ||
                "unknown"
            },
            redirectUrl: {
              success: `${window.location.origin}/user/request?payment=success&tracking=${currentRequestId}`,
              failure: `${window.location.origin}/user/request?payment=failure&tracking=${currentRequestId}`,
              cancel: `${window.location.origin}/user/request?payment=cancel&tracking=${currentRequestId}`
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create Maya checkout");
      }

      const checkout = await response.json();

      sessionStorage.setItem(
        "immediate_payment_info",
        JSON.stringify({
          checkoutId: checkout.id,
          request_id: currentRequestId,
          amount: immediatePaymentPrice,
          documents: immediatePaymentDocs,
          status: "pending",
          timestamp: new Date().toISOString()
        })
      );

      window.location.href = checkout.redirectUrl;
    } catch (err) {
      console.error(err);
      setPaymentStatus("failed");
      setErrorMessage("Payment error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  /* ----------------------------------------------------
   PAYMENT SUCCESS SCREEN
  ---------------------------------------------------- */
  if (isPaymentCompleted) {
    const paymentData = JSON.parse(
      sessionStorage.getItem("immediate_payment_info") || "{}"
    );

    return (
      <ContentBox className="payment-gateway-box">
        <div className="payment-success-container">
          <img
            src="/assets/UserCheckIcon.svg"
            alt="Success"
            className="success-icon-img"
          />


          <h2>Payment Successful</h2>

          {completingRequest && (
            <LoadingSpinner message="Finalizing request..." />
          )}

          <p>
            Amount Paid:{" "}
            <strong>Php {paymentData.amount?.toFixed(2)}</strong>
          </p>


          <p>
            Tracking ID: <strong>{paymentId}</strong>
          </p>

          {errorMessage && (
            <p className="error-message">{errorMessage}</p>
          )}

          <ButtonLink
            placeholder={completingRequest ? "Processing..." : "Complete Request"}
            variant="primary"
            onClick={() => {
              window.history.replaceState({}, "", "/user/request");
              handleCompleteRequest();
            }}
            disabled={completingRequest}
          />

        </div>
      </ContentBox>
    );
  }

  /* ----------------------------------------------------
   PAYMENT PAGE
  ---------------------------------------------------- */
  return (
    <ContentBox className="payment-gateway-box">
      <h2>Payment Gateway</h2>

      {processing && (
        <LoadingSpinner message="Processing payment..." />
      )}

      <div className="payment-summary">
        {immediatePaymentDocs.map((doc, idx) => (
          <div key={idx} className="payment-doc-item">
            <span>{doc.doc_name}</span>
            <span>
              Php {(doc.cost * (doc.quantity || 1)).toFixed(2)}
            </span>
          </div>
        ))}

        <hr />

        <strong>
          Total: Php {immediatePaymentPrice.toFixed(2)}
        </strong>
      </div>

      {errorMessage && (
        <p className="error-message">{errorMessage}</p>
      )}

      <div className="payment-actions">
        <ButtonLink
          placeholder={
            processing ? "Processing..." : "Pay Now"
          }
          variant="primary"
          onClick={handlePayment}
          disabled={processing}
        />
      </div>
    </ContentBox>
  );
}

export default PaymentGateway;
