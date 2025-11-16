import React, { useState, useEffect, useMemo } from "react";
import "./Request.css";
import { getCSRFToken } from "../../../utils/csrf";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";

function UploadRequirements({ selectedDocs = [], uploadedFiles = {}, setUploadedFiles, onNext, onBack }) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch requirements from backend
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const res = await fetch("/api/list-requirements", {
          method: "GET",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) setRequirements(data.requirements);
      } catch (err) {
        console.error("Error fetching requirements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequirements();
  }, []);

  // Fetch previously uploaded files
  useEffect(() => {
    const fetchUploadedFiles = async () => {
      try {
        const res = await fetch("/api/get-uploaded-files", {
          method: "GET",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) setUploadedFiles(prev => {
          const updated = { ...prev };
          for (const [req_id, path] of Object.entries(data.uploaded_files)) {
            if (!(req_id in updated) || !(updated[req_id] instanceof File)) {
              updated[req_id] = path;
            }
          }
          return updated;
        });
      } catch (err) {
        console.error("Error fetching uploaded files:", err);
      }
    };
    fetchUploadedFiles();
  }, []);

  // Build unique requirements list
  const requirementsList = useMemo(() => {
    const uniqueReqs = new Map();
    selectedDocs.forEach(({ requirements: docReqs }) => {
      docReqs.forEach(reqText => {
        const req = requirements.find(r => r.requirement_name === reqText);
        if (req && !uniqueReqs.has(req.req_id)) {
          uniqueReqs.set(req.req_id, { req_id: req.req_id, reqText });
        }
      });
    });
    return Array.from(uniqueReqs.values());
  }, [selectedDocs, requirements]);

  // Compute deselected uploads: requirements that are uploaded but no longer in current list
  const deselectedUploads = useMemo(() => {
    const currentReqIds = new Set(requirementsList.map(r => r.req_id));
    return Object.keys(uploadedFiles).filter(req_id => !currentReqIds.has(req_id) && typeof uploadedFiles[req_id] === 'string').map(req_id => ({ req_id }));
  }, [requirementsList, uploadedFiles]);

  // Sync uploaded files with current requirements
  useEffect(() => {
    const validReqIds = new Set(requirementsList.map(r => r.req_id));

    // Keep existing valid uploads and add new ones, remove deselected
    const updatedUploads = {};
    Object.keys(uploadedFiles).forEach(req_id => {
      if (validReqIds.has(req_id)) {
        updatedUploads[req_id] = uploadedFiles[req_id];
      }
    });
    requirementsList.forEach(({ req_id }) => {
      if (!(req_id in updatedUploads)) updatedUploads[req_id] = null;
    });

    setUploadedFiles(updatedUploads);
  }, [requirementsList, selectedDocs]);

  // Handle file selection
  const handleFileChange = (req_id, e) => {
    const file = e.target.files[0] || null;
    setUploadedFiles(prev => ({ ...prev, [req_id]: file }));
  };

  // Handle file deletion
  const handleDeleteFile = async (req_id) => {
    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    const file = uploadedFiles[req_id];
    if (typeof file === "string") {
      // File is already uploaded on server, call API to delete
      try {
        const res = await fetch(`/api/delete-file/${req_id}`, {
          method: "DELETE",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) setUploadedFiles(prev => ({ ...prev, [req_id]: null }));
        else alert(data.notification);
      } catch (err) {
        console.error("Failed to delete file:", err);
        alert("Failed to delete file.");
      }
    } else {
      // File is local (File object), just remove locally
      setUploadedFiles(prev => ({ ...prev, [req_id]: null }));
    }
  };



  // Check if all required files are uploaded
  const allRequiredUploaded = requirementsList.every(
    ({ req_id }) => uploadedFiles[req_id] instanceof File || typeof uploadedFiles[req_id] === "string"
  );

  // Handle proceed
  const handleProceedClick = async () => {
    if (!allRequiredUploaded) {
      alert("Please upload all required files before proceeding.");
      return;
    }

    setUploading(true);
    const formData = new FormData();

    // Include alreadyUploaded flag for each requirement
    const reqs = requirementsList.map(({ req_id }) => ({
      requirement_id: req_id,
      alreadyUploaded: typeof uploadedFiles[req_id] === "string" // true if already uploaded
    }));
    formData.append("requirements", JSON.stringify(reqs));

    // Include deselected requirement IDs for deletion
    const deselectedReqIds = deselectedUploads.map(({ req_id }) => req_id);
    formData.append("deselected_requirements", JSON.stringify(deselectedReqIds));

    // Only append new files (File instances) to FormData
    requirementsList.forEach(({ req_id }) => {
      const file = uploadedFiles[req_id];
      if (file instanceof File) formData.append(`file_${req_id}`, file);
    });

    try {
      const res = await fetch("/api/save-file-supabase", {
        method: "POST",
        headers: { "X-CSRF-TOKEN": getCSRFToken() },
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.success) onNext();
      else alert(`Error: ${data.notification}`);
    } catch (err) {
      console.error("Error uploading files:", err);
      alert("An error occurred while uploading files. Please try again.");
    } finally {
      setUploading(false);
    }
  };


  if (loading) return <LoadingSpinner message="Loading requirements..." />;

  return (
    <>
      {uploading && <LoadingSpinner message="Uploading files..." />}
      <ContentBox className="upload-requirements-box">
        <div className="upload-request-title-container">
          <h2 className="title">Upload Requirements</h2>
          <p className="subtext">Please upload the required documents. Note that all submissions are subject
            <br />
            to verification before approval.
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
              requirementsList.map(({ req_id, reqText }) => (
                <div
                  key={req_id}
                  className="requirement-item"
                  onClick={() => {
                    if (!uploading && !uploadedFiles[req_id]) {
                      document.getElementById(`upload-${req_id}`).click();
                    }
                  }}
                  style={{ cursor: uploading || uploadedFiles[req_id] ? "pointer" : "pointer" }}
                >
                  <div className="file-upload-info">
                    <span className="requirement-text">{reqText}</span>
                    <label htmlFor={`upload-${req_id}`} style={{ display: "none" }}>
                      {reqText}
                    </label>
                    <input
                      type="file"
                      id={`upload-${req_id}`}
                      onChange={(e) => handleFileChange(req_id, e)}
                      disabled={uploading}
                      style={{ display: "none" }} // hide the native input
                    />
                    {uploadedFiles[req_id] ? (
                      <>
                        <div className="requirement-item-action">
                          <span className="file-name">
                            {uploadedFiles[req_id] instanceof File
                              ? uploadedFiles[req_id].name
                              : uploadedFiles[req_id].split("/").pop()}
                          </span>
                          <img
                            src="/Assets/Trash.svg"
                            alt="Remove Icon"
                            style={{ cursor: "pointer" }}
                            className="remove-icon"
                            onClick={() => handleDeleteFile(req_id)}
                          />
                          </div>
                         </>
                    ) : (
                      <p className="file-name">Select file</p>
                    )}
                  </div>
                  <hr />
                </div>
              ))
            )}
          </div>
        </div>



        <div className="action-section">
          {!allRequiredUploaded && (
            <p className="error-text">All required fields are required*</p>
          )}

          <div className="action-buttons">
            <ButtonLink
              placeholder="Edit Request"
              onClick={onBack}
              variant="secondary"
              disabled={uploading}
            />
            <ButtonLink
              placeholder={uploading ? "Uploading..." : "Proceed"}
              onClick={handleProceedClick}
              variant="primary"
              disabled={!allRequiredUploaded || uploading}
            />
          </div>
        </div>
      </ContentBox>
    </>
  );
}

export default UploadRequirements;
