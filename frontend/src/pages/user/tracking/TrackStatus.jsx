import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";

/* track status component */
function TrackStatus({ trackData, onBack, onViewDetails, onViewDeliveryInstructions, onViewPaymentOptions, onPickup }) {

    // config for each status
    const statusConfig = {
        "DOC-READY": {
            className: "status-doc-ready",
            title: "Document Ready",
            description: (
                <div className="status-body">
                    <p className="subtext">Your document is now ready for release. Please choose how you would like to receive it:</p>
                </div>
            ),
            options: (
                <div className="claim-options">
                    <ButtonLink onClick={onPickup} placeholder="Pick up at Registrar" className="claim-button pickup-button" />
                    <ButtonLink onClick={onViewDeliveryInstructions} placeholder="Delivery" className="claim-button delivery-button" />
                </div>
            )
        },
        "IN-PROGRESS": {
            className: "status-processing",
            title: "In Progress",
            description: (  
                <div className="status-body">
                    <p className="subtext">Our staff is currently preparing your requested documents. This includes printing, verifying details, and ensuring everything is accurate before moving to the next step.</p>
                </div>
            )
        },
        "SUBMITTED": {
            className: "status-submitted",
            title: "Request Submitted",
            description: (
                <div className="status-body">
                    <p className="subtext">Your request has been received and will be processed soon.</p>
                </div>
            )
        },
        "PENDING": {
            className: "status-review",
            title: "Under Review",
            description: (  
                <div className="status-body">
                    <p className="subtext">Your request and submitted requirements are being carefully checked by the registrar's office to confirm that all details and documents are complete and valid.</p>
                </div>
            )
        },
        "Payment Pending": {
            className: "status-payment",
            title: "Payment Pending",
            description: (  
                <div className="status-body">
                    <p className="subtext">Your document is now ready. Please complete your payment using the button below. A confirmation will be sent once payment is received.</p>
                </div>
            ),
            actionSection: (
                <div className="action-section">
                    <div className="button-section">
                        <ButtonLink onClick={onBack} placeholder="Track Another" variant="secondary" />
                        <ButtonLink onClick={onViewPaymentOptions} placeholder="Pay Now" variant="primary" />
                    </div>
                </div>
            ),
        },
        "RELEASED": {
            className: "status-released",
            title: "Document Released",
            description: (
                <div className="status-body">
                    <p className="subtext">Your document has been successfully claimed or delivered. Thank you for using our service.</p>
                </div>
            )
        },
        "REJECTED": {
            className: "status-rejected",
            title: "Request Rejected",
            description: (
                <div className="status-body">
                    <p className="subtext">
                        We are unable to proceed with your request at this time. Please review the reason below.
                        If you have questions, please contact support.
                    </p>
                </div>
            )
        }
    };

    if (!trackData) {
        return (
            <div className="Track-page">
                <ContentBox>
                    <p>No tracking data available. Please go back and enter your details.</p>
                    <ButtonLink onClick={onBack} placeholder="Return" variant="primary" />
                </ContentBox>
            </div>
        );
    }

    // get the specific configuration for the current status
    // convert status to uppercase for case-insensitive matching
    let statusKey = trackData.status ? trackData.status.toUpperCase() : '';
    if (statusKey === 'DOC-READY' && !trackData.paymentStatus) {
        statusKey = 'Payment Pending';
    }

    const config = statusConfig[statusKey];

    // data not found case
    if (!config) {
        return (
            <div className="Track-page">
                <p>An unknown status was received. Please contact support.</p>
                <ButtonLink onClick={onBack} placeholder="Return" variant="primary" />
            </div>
        );
    }

    const showViewDetailsButton = !config.options;

    return (
        <>
            {/* Main Status Content */}
            <div className={`text-section ${config.className}`}>
                <h3 className="status-title">{config.title}</h3>
                {config.description}
                <div className="tracking-number-section">
                    <p>Tracking Number:</p>
                    <div className="number">
                        <p><strong>{trackData.trackingNumber}</strong></p>
                    </div>
                </div>
                {/* Display rejection remarks if the status is REJECTED */}
                {statusKey === 'REJECTED' && trackData.remarks && (
                    <div className="rejection-remarks-section">
                        <p className="remarks-title">Reason for Rejection:</p>
                        <p className="remarks-text">{trackData.remarks}</p>
                    </div>
                )}
            </div>
            {config.options}
            {config.actionSection ? (
                config.actionSection
            ) : (
                <div className="action-section">
                    <div className="button-section">
                        <ButtonLink onClick={onBack} placeholder="Track Another" variant="secondary" />
                        {/* Only show "View Request" if there are no main option buttons like "Pay Now" */}
                        {showViewDetailsButton &&
                            <ButtonLink onClick={onViewDetails} placeholder="View Request" variant="primary" />
                        }
                    </div>
                </div>
            )}
            <div className="support-section">
                <p className="subtext">Need help? Contact the </p>
                <a href="mailto:support@example.com" className="support-email">support.</a>
            </div>
        </>
    );
}

export default TrackStatus;