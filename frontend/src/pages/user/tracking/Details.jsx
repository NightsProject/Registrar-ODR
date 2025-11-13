import React, { useState, useEffect } from "react";
import "./Tracking.css";
import ButtonLink from "../../../components/common/ButtonLink";
import LoadingSpinner from "../../../components/common/LoadingSpinner";


// request details
function Details({ trackData, onTrackAnoter, onBack }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (trackData && trackData.trackingNumber) {
            fetchDocuments();
        }
    }, [trackData]);


    const fetchDocuments = async () => {
        try {
            const response = await fetch(`/api/track/document/${trackData.trackingNumber}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch documents');
            }
            console.log("Fetched documents data:", data);
            setDocuments(data.documents || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-section">
            {loading && <LoadingSpinner message="Loading documents..." />}
            <h3 className="status-title">My Request</h3>
            <div className="status-body">
                <div className="documents-list">
                    <div className="document-item document-header">
                        <h4 className="document-name">Name</h4>
                        <span className="quantity-number">Quantity</span>
                    </div>
                    {loading ? (
                        <div className="document-item">
                            <span>Loading documents...</span>
                        </div>
                    ) : error ? (
                        <div className="document-item">
                            <span>Error: {error}</span>
                        </div>
                    ) : (
                        documents.map((doc, index) => (
                            <div key={index} className="document-item">
                                <h4 className="document-name">{doc.name}</h4>
                                <span className="quantity-number">&nbsp;{doc.quantity}</span>
                            </div>
                        ))
                    )}
                </div>


                <div className="action-section">
                    <div className="button-section">
                        <ButtonLink onClick={onTrackAnoter} placeholder="Track Another" variant="secondary" disabled={loading} />
                        <ButtonLink onClick={onBack} placeholder="Back to Status" variant="primary" disabled={loading} />
                    </div>
                </div>
                <div className="support-section">
                    <p className="subtext">Need help? Contact the </p>
                    <a href="mailto:support@example.com" className="support-email">support.</a>
                </div>
            </div>
        </div>
    );
}


export default Details;