import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import EnterTrackId from "./EnterTrackId";
import TrackStatus from "./TrackStatus";
import OtpVerification from "../OtpVerification";
import Details from "./Details";
import PaymentOptions from "./PaymentOptions";
import PaymentInstructions from "./PaymentInstructions";
import PaymentSuccess from "./PaymentSuccess";
import DeliveryInstructions from "./DeliveryInstructions";
import PickupInstructions from "./PickupInstructions";
import ContentBox from "../../../components/user/ContentBox";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { getCSRFToken } from "../../../utils/csrf";
import "./Tracking.css";

function TrackFlow() {
    const [currentView, setCurrentView] = useState("enter-id");
    const [trackData, setTrackData] = useState(null);
    const [maskedPhone, setMaskedPhone] = useState("");
    const [studentId, setStudentId] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const MAYA_PUBLIC_KEY = 'pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah';
    const WEBSITE_LINK = "https://registrar-odr.onrender.com";

    // the 'data' parameter will hold the response from the tracking API
    const handleTrackIdSubmit = (data, skipOtp = false) => {
		console.log("Tracking data received:", data.trackData);
		setTrackData(data.trackData);
        setMaskedPhone(data.maskedPhone);
        setStudentId(data.studentId || data.student_id);
		setCurrentView(skipOtp ? "status" : "otp");
        setLoading(false);
    };

    const handleBack = () => {
		if (currentView === "status") {
			setCurrentView("enter-id");
			setTrackData(null); // clear data when going back to initial screen
		} else if (currentView === "otp") {
            setCurrentView("enter-id");
        } else if (currentView === "details" || currentView === "payment-options" || currentView === "payment-instructions" || currentView === "delivery-instructions" || currentView === "pickup-instructions") {
			setCurrentView("status"); // go back to main status view
		}
    };

	const handleViewDetails = () => setCurrentView("details");
	const handleTrackAnother = () => setCurrentView("enter-id");
	const handleViewPaymentOptions = () => setCurrentView("payment-options");
	const handleViewPaymentInstructions = () => setCurrentView("payment-instructions");	
    const handleViewPickupInstructions = () => setCurrentView("pickup-instructions");
	const handleOtpSuccess = (data) => {
		setCurrentView("status");
        setLoading(false);
	};
    const handleViewDeliveryInstructions = () => setCurrentView("delivery-instructions");

    const pollForPaymentStatus = (trackingNumber, currentStudentId) => {
        const maxAttempts = 10;
        let attempts = 0;

        const poll = setInterval(async () => {
            try {
                console.log(`[MAYA][POLL] Attempt ${attempts + 1}/${maxAttempts} for tracking ${trackingNumber}`);
                const response = await fetch('/api/track', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCSRFToken() 
                    },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        tracking_number: trackingNumber,
                        student_id: currentStudentId
                    })
                });

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        console.log("[MAYA][POLL] Response data:", data);
                        
                        // If payment status updated or minimum amount paid (partial success), refresh and go to status
                        if (data.track_data && (data.track_data.paymentStatus === true || data.track_data.minimumAmountDue === 0)) {
                            clearInterval(poll);
                            localStorage.removeItem('pendingPayment');
                            setTrackData(data.track_data);
                            setCurrentView('status');
                            return;
                        }
                    }
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                }
            } catch (error) {
                console.error('Polling error:', error);
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                }
            }
        }, 2000);
    };

    const handleRefreshStatus = async () => {
        if (!trackData?.trackingNumber) {
            setCurrentView('status');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    tracking_number: trackData.trackingNumber, 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.track_data) {
                    setTrackData(data.track_data);
                    setCurrentView('status');
                }
            } else {
                setCurrentView('status');
            }
        } catch (error) {
            console.error('Error refreshing status:', error);
            setCurrentView('status');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPaymentMethod = async (method) => {
        // Check which payment method was selected
        if (method.startsWith("online")) {
            setLoading(true);
            try {
                // Get studentId from trackData if available, otherwise use state
                const currentStudentId = trackData?.studentId || studentId;
                
                if (!currentStudentId) {
                    throw new Error('Student ID is required for payment');
                }

                // Determine amount based on method selection
                const amountToPay = method === "online_minimum" 
                    ? trackData.minimumAmountDue 
                    : trackData.amountDue;

                // Call Maya Checkout API to create a new checkout session
                console.log("[MAYA][CHECKOUT] Creating checkout with", {
                    amount: amountToPay,
                    trackingNumber: trackData.trackingNumber,
                    studentId: currentStudentId
                });
                const response = await fetch('https://pg-sandbox.paymaya.com/checkout/v1/checkouts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + btoa(MAYA_PUBLIC_KEY + ':')
                    },
                    body: JSON.stringify({
                        // Total cost
                        totalAmount: {
                            value: amountToPay,
                            currency: "PHP"
                        },
                        // Use tracking number as unique reference for identifying the transaction
                        requestReferenceNumber: trackData.trackingNumber,
                        // Include student_id in metadata so it's passed back in webhook
                        metadata: {
                            studentId: studentId,
                            trackingNumber: trackData.trackingNumber
                        },
                        // URLs where Maya will redirect after payment
                        redirectUrl: {
                            success: `${WEBSITE_LINK}/user/track?payment=success&tracking=${trackData.trackingNumber}`,
                            failure: `${WEBSITE_LINK}/user/track?payment=failure&tracking=${trackData.trackingNumber}`,
                            cancel: `${WEBSITE_LINK}/user/track?payment=cancel&tracking=${trackData.trackingNumber}`
                        }
                    })
                });

                if (!response.ok) {
                    const body = await response.text().catch(() => '');
                    console.error("[MAYA][CHECKOUT] Failed response", response.status, body);
                    throw new Error('Failed to create Maya checkout.');
                }

                const checkout = await response.json();
                console.log("[MAYA][CHECKOUT] Checkout created:", checkout);

                localStorage.setItem('pendingPayment', JSON.stringify({
                    checkoutId: checkout.id,
                    trackingNumber: trackData.trackingNumber,
                    amountDue: amountToPay,
                    studentId: currentStudentId,
                    trackData: trackData,
                    timestamp: Date.now()
                }));

                // Redirect to Maya payment page
                console.log("[MAYA][CHECKOUT] Redirecting to", checkout.redirectUrl);
                window.location.href = checkout.redirectUrl;
            }
            catch (error){
                console.error('[MAYA][CHECKOUT] Payment error: ', error)
                alert('Failed to initiate payment. Please try again.');
                setLoading(false);
            }
        // If method chosen was in person, show instructions
        } else if (method === "in-person") {
            handleViewPaymentInstructions();
        }
    };
    
    // Handle return from Maya
    useEffect(() => {
        const paymentStatus = searchParams.get("payment");
        const trackingNumber = searchParams.get("tracking");
        const urlStudentId = searchParams.get("student_id");

        if (paymentStatus && trackingNumber) {
            const pendingPayment = localStorage.getItem("pendingPayment");

            if (pendingPayment) {
                const payment = JSON.parse(pendingPayment);

                if (payment.trackingNumber === trackingNumber) {
                    // Restore trackData and studentId from localStorage
                    setTrackData(payment.trackData);
                    const studentId = payment.studentId || payment.trackData?.studentId;
                    if (studentId) {
                        setStudentId(studentId);
                    }

                    if (paymentStatus === 'success') {
                        // Attempt to mark paid via backend, then poll
                        const markPaid = async () => {
                            try {
                                console.log("[MAYA][BROWSER] Trying to mark paid via backend");
                                const resp = await fetch('/user/payment/mark-paid', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-TOKEN': getCSRFToken()
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        trackingNumber: payment.trackingNumber,
                                        amount: payment.amountDue,
                                        studentId: payment.studentId,
                                        paymentReference: payment.checkoutId
                                    })
                                });
                                const body = await resp.json().catch(() => ({}));
                                console.log("[MAYA][BROWSER] mark-paid response", resp.status, body);
                                if (!resp.ok) {
                                    console.error("[MAYA][BROWSER] mark-paid error message:", body.message);
                                }
                            } catch (err) {
                                console.error("[MAYA][BROWSER] mark-paid failed", err);
                            }
                        };
                        markPaid().finally(() => {
                            // Start polling for payment status update
                            pollForPaymentStatus(trackingNumber, studentId);
                            setCurrentView('payment-success');
                        });

                    } else if (paymentStatus === 'failure') {
                        alert('Payment failed. Please try again.');
                        setCurrentView('payment-options');
                        localStorage.removeItem('pendingPayment');
                    } else if (paymentStatus === 'cancel') {
                        alert('Payment cancelled.');
                        setCurrentView('payment-options');
                        localStorage.removeItem('pendingPayment');
                    }
                    
                    // Clean URL
                    window.history.replaceState({}, '', '/user/track');
                }
            }
        } else if (trackingNumber && urlStudentId && !trackData) {
            // Track logic for redirection from RequestFlow
            const autoTrack = async () => {
                setLoading(true);
                try {
                    const response = await fetch('/api/track', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': getCSRFToken(),
                        },
                        credentials: 'include',
                        body: JSON.stringify({ tracking_number: trackingNumber, student_id: urlStudentId }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.track_data) {
                            handleTrackIdSubmit({
                                trackData: data.track_data,
                                maskedPhone: data.masked_phone,
                                studentId: urlStudentId
                            }, data.require_otp === false);
                            // Clean URL to remove sensitive student_id
                            window.history.replaceState({}, '', '/user/track');
                        }
                    }
                } catch (error) {
                    console.error("Track failed:", error);
                } finally {
                    setLoading(false);
                }
            };
            autoTrack();
        }
    }, [searchParams]);


    const handleProceedWithLBC = async () => {
        setLoading(true);
        try {
            console.log("Track data:", trackData);
            console.log("Sending:", { 
                tracking_number: trackData.trackingNumber, 
                order_type: 'LBC' 
            });
            
            const csrfToken = getCSRFToken();
            const response = await fetch('/api/set-order-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                credentials: 'include',
                body: JSON.stringify({ tracking_number: trackData.trackingNumber, order_type: 'LBC' }),
            });

            console.log("Received response:", response);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to set order type.');
            }
            
            setCurrentView("status");

        } catch (error) {
            console.error("Error setting order type:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="track-page-container">
            {loading && <LoadingSpinner message="Processing..." />}
            {currentView === "otp" ? (
                <OtpVerification
                    onNext={handleOtpSuccess}
                    onBack={handleBack}
                    studentId={studentId}
                    setMaskedPhone={setMaskedPhone}
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
                            onViewPickupInstructions={handleViewPickupInstructions}
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
                        <PaymentSuccess 
                            onViewStatus={() => {
                                // Refresh tracking data and go to status
                                if (trackData?.trackingNumber && studentId) {
                                    handleRefreshStatus();
                                } else {
                                    setCurrentView('status');
                                }
                            }}
                            trackingNumber={trackData?.trackingNumber}
                        />
                    )}

                    {currentView === "payment-instructions" && (
                        <PaymentInstructions onBack={handleBack} />
                    )}

                    {currentView === "delivery-instructions" && (
                        <DeliveryInstructions 
                        onBack={handleBack}
                        onProceedWithLBC={handleProceedWithLBC}
                        />
                    )}
                    {currentView === "pickup-instructions" && (
                        <PickupInstructions 
                        onBack={handleBack} 
                        onViewDetails={handleViewDetails}
                        />
                    )}
                </ContentBox>
            )}
		</div>
    );
}

export default TrackFlow;