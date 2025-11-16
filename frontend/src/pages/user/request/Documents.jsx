import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Request.css";
import { getCSRFToken } from "../../../utils/csrf";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import FileCard from "../../../components/common/FileCard";
import RequestPopup from "../../../components/user/RequestPopup";
import SearchBar from "../../../components/common/SearchBar";

function Documents({ selectedDocs, setSelectedDocs, onNext }) {
  const [documents, setDocuments] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestInfo, setRequestInfo] = useState({
    status: "",
    request_id: "",
    student_name: "",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/request", {
      method: "GET",
      headers: {
        "X-CSRF-TOKEN": getCSRFToken(),
      },
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          // Redirect unauthorized users
          navigate("/user/login");
          return;
        }

        const data = await res.json();
        setDocuments(data.documents || []);
        setRequestInfo({
          status: data.status,
          request_id: data.request_id,
          student_name: data.student_name,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching documents:", err);
        setLoading(false);
      });
  }, [navigate]);

  const handleSelect = (doc) => {
    setSelectedDocs((prevSelected) => {
      if (prevSelected.find((d) => d.doc_id === doc.doc_id)) {
        return prevSelected.filter((d) => d.doc_id !== doc.doc_id);
      } else {
        return [...prevSelected, doc];
      }
    });
  };

  const handleNextStep = () => {
    if (selectedDocs.length === 0) {
      setShowPopup(true);
      return;
    }
    onNext(selectedDocs);
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {loading && <LoadingSpinner message="Loading documents..." />}
      {!loading && (
        <div className="select-documents-page">
          <div className="hero-section">
            <img src="/assets/HeroImage.png" alt="Request" className="hero-image" />
            <div className="welcome-text">
              <h1>Welcome to the Online Document Request System</h1>
              <p className="subtext">
                Select the documents you need below and follow the steps to complete your request.
                <br />
                Make sure to review each document’s requirements before proceeding.
              </p>
            </div>
            <a href="#documents-section" className="view-documents-btn">
              Get Started
            </a>
          </div>

          <div className="bottom-section" id="documents-section">
            <h1 className="title">Select Your Documents</h1>
            <div className="user-searchbar-container">
              <SearchBar onChange={setSearchTerm} />
            </div>
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <FileCard
                  key={doc.doc_id}
                  document={doc}
                  selectable
                  isSelected={selectedDocs.some((d) => d.doc_id === doc.doc_id)}
                  onClick={handleSelect}
                  isAdmin={false}
                  className="document-card"
                />
              ))}
              <button className="submit-btn" onClick={handleNextStep} disabled={loading}>
                My Requests
                {selectedDocs.length > 0 && (
                  <span className="request-counter">{selectedDocs.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPopup && <RequestPopup onClose={() => setShowPopup(false)} />}
    </>
  );
}

export default Documents;
