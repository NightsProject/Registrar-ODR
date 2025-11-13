import { useState } from "react";
import EnterTrackId from "./EnterTrackId";
import TrackStatus from "./TrackStatus";
import OtpVerification from "../OtpVerification";
import Details from "./Details";
import PaymentOptions from "./PaymentOptions";
import PaymentInstructions from "./PaymentInstructions";
import PaymentSuccess from "./PaymentSuccess";
import DeliveryInstructions from "./DeliveryInstructions";
import ContentBox from "../../../components/user/ContentBox";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import "./Tracking.css";

function TrackFlow() {
    const [currentView, setCurrentView] = useState("enter-id");
    const [trackData, setTrackData] = useState(null);
    const [maskedPhone, setMaskedPhone] = useState("");
    const [studentId, setStudentId] = useState("");
    const [loading, setLoading] = useState(false);

    // the 'data' parameter will hold the response from the tracking API
    const handleTrackIdSubmit = (data) => {
		console.log("Tracking data received:", data.trackData);
		setTrackData(data.trackData);
        setMaskedPhone(data.maskedPhone);
        setStudentId(data.studentId);
		setCurrentView("otp");
        setLoading(false);
    };

    const handleBack = () => {
		if (currentView === "status") {
			setCurrentView("enter-id");
			setTrackData(null); // clear data when going back to initial screen
		} else if (currentView === "otp") {
            setCurrentView("enter-id");
        } else if (currentView === "details" || currentView === "payment-options" || currentView === "payment-instructions" || currentView === "delivery-instructions") {
			setCurrentView("status"); // go back to main status view
		}
  	};

	const handleViewDetails = () => setCurrentView("details");
	const handleTrackAnother = () => setCurrentView("enter-id");
	const handleViewPaymentOptions = () => setCurrentView("payment-options");
	const handleViewPaymentInstructions = () => setCurrentView("payment-instructions");	
	const handleOtpSuccess = (data) => {
		setCurrentView("status");
        setLoading(false);
	};
	const handleViewDeliveryInstructions = () => setCurrentView("delivery-instructions");

	const handleSelectPaymentMethod = (method) => {
		if (method === "online") {
			// simulate successful online payment
			setCurrentView("payment-success");
		} else if (method === "in-person") {
			handleViewPaymentInstructions();
		}
	};
	
	const handlePaymentComplete = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/track/payment-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tracking_number: trackData.trackingNumber }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update payment status.');
            }

            // If API call is successful, update the local state
            setTrackData(prevData => ({
                ...prevData,
                status: "DOC-READY",
                paymentStatus: true
            }));
            setCurrentView("status");
        } catch (error) {
            console.error("Payment completion error:", error);
            // Optionally, show an error message to the user
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="Track-page">
            {loading && <LoadingSpinner message="Processing..." />}
            {currentView === "otp" ? (
                <OtpVerification
                    onNext={handleOtpSuccess}
                    onBack={handleBack}
                    studentId={studentId}
                    maskedPhone={maskedPhone}
                    isTracking={true}
                />
            ) : (
                <ContentBox key={currentView}> {/* animation on every view change */}
                    {currentView === "enter-id" && <EnterTrackId onNext={handleTrackIdSubmit} />}

                    {currentView === "status" && trackData && (
                        <TrackStatus
                            trackData={trackData}
                            onViewDetails={handleViewDetails}
                            onViewPaymentOptions={handleViewPaymentOptions}
                            onViewDeliveryInstructions={handleViewDeliveryInstructions}
                            onBack={handleBack} // pass handleBack for the "Track Another" button
                        />
                    )}

                    {currentView === "details" && (
                        <Details onTrackAnoter={handleTrackAnother} onBack={handleBack} trackData={trackData} />
                    )}

                    {currentView === "payment-options" && (
                        <PaymentOptions
                            trackData={trackData}
                            onSelectMethod={handleSelectPaymentMethod}
                            onBack={handleBack}
                            onViewDetails={handleViewDetails}
                        />
                    )}

                    {currentView === "payment-success" && (
                        <PaymentSuccess onPaymentComplete={handlePaymentComplete} />
                    )}

                    {currentView === "payment-instructions" && (
                        <PaymentInstructions onBack={handleBack} />
                    )}

                    {currentView === "delivery-instructions" && (
                        <DeliveryInstructions onBack={handleBack} />
                    )}
                </ContentBox>
            )}
		</div>
    );
}

export default TrackFlow;