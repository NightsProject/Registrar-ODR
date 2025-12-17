

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./Request.css";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";
import ConfirmModal from "../../../components/user/ConfirmModal";
import { getCSRFToken } from "../../../utils/csrf";




function UploadRequirements({
  selectedDocs = [],
  uploadedFiles = {},
  onFileSelect,
  onFileRemove,
  onNext = () => {},
  onBack = () => {},
  showToast
}) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFileToDelete, setPendingFileToDelete] = useState(null);
  const inputRefs = useRef({});
  const [requirementsList, setRequirementsList] = useState([]);
  
  // Cache requirements to prevent unnecessary API calls
  const requirementsCache = useRef(new Map());

  // Memoize document IDs to prevent unnecessary re-fetches
  const documentIds = useMemo(() => {
    return selectedDocs.map((doc) => doc.doc_id).sort();
  }, [selectedDocs]);

  const cacheKey = useMemo(() => {
    return documentIds.join(',');
  }, [documentIds]);

  // Fetch requirements from API with caching
  useEffect(() => {
    const fetchRequirements = async () => {
      // Check cache first
      if (requirementsCache.current.has(cacheKey)) {
        setRequirementsList(requirementsCache.current.get(cacheKey));
        setLoading(false);
        return;
      }

      if (!selectedDocs || selectedDocs.length === 0) {
        setRequirementsList([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/list-requirements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCSRFToken(),
          },
          credentials: "include",
          body: JSON.stringify({ document_ids: documentIds }),
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error(data.notification || "Fetch failed");

        const requirements = data.requirements || [];
        setRequirementsList(requirements);
        
        // Cache the results
        requirementsCache.current.set(cacheKey, requirements);
      } catch (err) {
        console.error("Error fetching requirements:", err);
        setError(err.message || "Failed to load requirements");
        setRequirementsList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [cacheKey, documentIds]);






  // Display file name helper
  const displayFileName = (entry) => {
    if (!entry) return "";
    if (entry instanceof File) return entry.name;
    if (typeof entry === "string") {
      const parts = entry.split("/");
      return parts.pop() || entry;
    }
    return "";
  };


  // Handle file selection
  const handleFileChange = (req_id, e) => {
    const file = e.target.files?.[0] || null;
    const key = String(req_id);

    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

      if (file.size > maxSize) {
        showToast("File must be less than 10MB.", "warning");
        if (inputRefs.current[key]) inputRefs.current[key].value = "";
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        showToast("Only PDF, JPG, JPEG, PNG allowed.", "warning");
        if (inputRefs.current[key]) inputRefs.current[key].value = "";
        return;
      }
    }

    onFileSelect && onFileSelect(req_id, file);
  };


  // Delete file
  const handleDeleteFile = (req_id) => {
    const key = String(req_id);
    setPendingFileToDelete(req_id);
    setShowConfirmModal(true);
  };

  const confirmDeleteFile = () => {
    if (pendingFileToDelete !== null) {
      const key = String(pendingFileToDelete);
      onFileRemove && onFileRemove(pendingFileToDelete);
      if (inputRefs.current[key]) inputRefs.current[key].value = "";
    }
    setShowConfirmModal(false);
    setPendingFileToDelete(null);
  };

  const cancelDeleteFile = () => {
    setShowConfirmModal(false);
    setPendingFileToDelete(null);
  };




  // Check all required files uploaded
  const allRequiredUploaded = useMemo(() => {
    if (!requirementsList || requirementsList.length === 0) return true;
    
    return requirementsList.every(({ req_id }) => {
      const entry = uploadedFiles[String(req_id)];
      return entry instanceof File || (typeof entry === "string" && entry.trim() !== "");
    });
  }, [requirementsList.length, uploadedFiles]);


  // Proceed
  const handleProceedClick = async () => {
    if (requirementsList.length > 0 && !allRequiredUploaded) {
      showToast("Please upload all required files.", "warning");
      return;
    }


    setUploading(true);
    onNext(uploadedFiles);
    setUploading(false);
  };

  if (loading) return <LoadingSpinner message="Loading requirements..." />;

  return (
    <>
      {uploading && <LoadingSpinner message="Processing files..." />}
      <ContentBox className="upload-requirements-box">
        <div className="upload-request-title-container">
          <h2 className="title">Upload Requirements</h2>
          <p className="subtext">
            Please upload the required documents. Verification occurs before approval.
          </p>
        </div>

        <div className="requirements-container">
          <div className="requirements-header">
            <span className="requirements-label">Requirements</span>
            <hr />
          </div>

          <div className="requirement-item-container">
            {requirementsList.length === 0 ? (
              <p>No requirements to upload.</p>
            ) : (
              requirementsList.map(({ req_id, requirement_name, doc_names }) => {
                const key = String(req_id);
                const entry = uploadedFiles[key];

                const handleClick = () => {
                  if (!uploading && inputRefs.current[key]) {
                    inputRefs.current[key].click();
                  }
                };

                return (
                  <div
                    key={key}
                    className="requirement-item"
                    onClick={handleClick}
                    style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                  >
                    <div className="file-upload-info">
                      <div>
                        <span className="requirement-text">{requirement_name}</span>
                      </div>

                      <input
                        ref={(el) => (inputRefs.current[key] = el)}
                        type="file"
                        onChange={(e) => handleFileChange(req_id, e)}
                        style={{ display: "none" }}
                        disabled={uploading}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />

                      {entry ? (
                        <div className="requirement-item-action">
                          <span className="file-name">{displayFileName(entry)}</span>
                          <img
                            src="/assets/Trash.svg"
                            alt="Remove"
                            className="remove-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!uploading) handleDeleteFile(req_id);
                            }}
                          />
                        </div>
                      ) : (
                        <p className="file-name">Select file</p>
                      )}
                    </div>
                    <hr />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="action-section">
          {!allRequiredUploaded && (
            <p className="error-text">All required files must be uploaded*</p>
          )}

          <div className="action-buttons">
            <ButtonLink
              placeholder="Edit Request"
              onClick={onBack}
              variant="secondary"
              disabled={uploading}
            />
            <ButtonLink
              placeholder={uploading ? "Processing..." : "Proceed"}
              onClick={handleProceedClick}
              variant="primary"
              disabled={!allRequiredUploaded || uploading}
            />

          </div>
        </div>
      </ContentBox>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteFile}
        onConfirm={confirmDeleteFile}
        title="Delete File"
        message="Are you sure you want to delete this file?"
      />
    </>
  );
}

export default UploadRequirements;
