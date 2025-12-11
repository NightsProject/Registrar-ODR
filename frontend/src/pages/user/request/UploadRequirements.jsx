import React, { useState, useEffect, useMemo, useRef } from "react";
import "./Request.css";
import { getCSRFToken } from "../../../utils/csrf";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ButtonLink from "../../../components/common/ButtonLink";
import ContentBox from "../../../components/user/ContentBox";

/**
 * UploadRequirements
 *
 * Props:
 *  - selectedDocs: array of selected document objects. Each must contain a `requirements` array of requirement_name strings.
 *  - uploadedFiles: object mapping req_id -> File instance | uploaded file path string | null
 *  - setUploadedFiles: function to update uploadedFiles (setter provided by parent)
 *  - onNext: callback when proceeding
 *  - onBack: callback when going back/editing
 */
function UploadRequirements({
  selectedDocs = [],
  uploadedFiles = {},
  setUploadedFiles,
  onNext = () => {},
  onBack = () => {},
}) {
  const [requirements, setRequirements] = useState([]); // fetched from backend
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // map of req_id -> input ref so we can trigger click programmatically
  const inputRefs = useRef({});
  
  /* ---------- Fetch requirements ---------- */
  useEffect(() => {
    let mounted = true;
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/list-requirements", {
          method: "GET",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (!mounted) return;
        if (data && data.success && Array.isArray(data.requirements)) {
          setRequirements(data.requirements);
        } else {
          setRequirements([]);
          console.error("Unexpected response listing requirements:", data);
        }
      } catch (err) {
        console.error("Error fetching requirements:", err);
        setRequirements([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRequirements();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Build unique requirements list from selectedDocs ---------- */
  const requirementsList = useMemo(() => {
    const unique = new Map();
    if (!Array.isArray(selectedDocs) || selectedDocs.length === 0) return [];

    selectedDocs.forEach((doc) => {
      const docReqs = Array.isArray(doc.requirements) ? doc.requirements : [];
      docReqs.forEach((reqName) => {
        const reqObj = requirements.find((r) => r.requirement_name === reqName);
        if (reqObj && !unique.has(String(reqObj.req_id))) {
          unique.set(String(reqObj.req_id), {
            req_id: String(reqObj.req_id),
            requirement_name: reqObj.requirement_name,
          });
        }
      });
    });

    return Array.from(unique.values());
  }, [selectedDocs, requirements]);

  /* ---------- Fetch previously uploaded files (server-side) for current valid requirements ---------- */
  useEffect(() => {
    let mounted = true;
    const fetchUploadedFiles = async () => {
      try {
        const res = await fetch("/api/get-uploaded-files", {
          method: "GET",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (!mounted) return;

        if (data?.success && data.uploaded_files) {
          const serverFiles = data.uploaded_files;
          const validReqIds = new Set(requirementsList.map(r => String(r.req_id)));

          setUploadedFiles(prev => {
            const next = { ...prev };
            Object.entries(serverFiles).forEach(([req_id, path]) => {
              req_id = String(req_id);
              if (validReqIds.has(req_id) && !next[req_id]) {
                // Only add if parent state doesn't already have a value
                next[req_id] = path;
              }
            });

            // Ensure all current requirements have a key
            requirementsList.forEach(({ req_id }) => {
              const key = String(req_id);
              if (!(key in next)) next[key] = null;
            });

            return next;
          });
        }
      } catch (err) {
        console.error("Error fetching uploaded files:", err);
      }
    };

    if (requirementsList.length > 0) fetchUploadedFiles();
    return () => { mounted = false; };
  }, [requirementsList, setUploadedFiles]);


  /* ---------- Sync uploadedFiles shape to include all current requirements and remove deselected ---------- */
  useEffect(() => {
    setUploadedFiles((prev = {}) => {
      const next = { ...prev };
      const currentIds = new Set(requirementsList.map((r) => String(r.req_id)));

      // Identify keys to remove (they are no longer in current requirements)
      Object.keys(next).forEach((k) => {
        if (!currentIds.has(String(k))) {
          // Remove the entry locally (clear local File or server path)
          // Note: Server-side files will be cleaned up during upload process
          delete next[k];
        }
      });

      // Ensure every requirement has an entry (null if missing)
      requirementsList.forEach(({ req_id }) => {
        const key = String(req_id);
        if (!(key in next)) next[key] = null;
      });

      return next;
    });
  }, [requirementsList, setUploadedFiles]);

  /* ---------- Utility: get displayed file name ---------- */
  const displayFileName = (entry) => {
    if (!entry) return "";
    if (entry instanceof File) return entry.name;
    if (typeof entry === "string") {
      try {
        const parts = entry.split("/");
        return parts[parts.length - 1] || entry;
      } catch {
        return entry;
      }
    }
    return "";
  };



  /* ---------- File selection handler ---------- */
  const handleFileChange = (req_id, e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;

    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (file.size > maxSize) {
        window.alert("File size must be less than 10MB.");
        if (inputRefs.current[req_id]) inputRefs.current[req_id].value = "";
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        window.alert("Only PDF and image files (JPEG, PNG) are allowed.");
        if (inputRefs.current[req_id]) inputRefs.current[req_id].value = "";
        return;
      }
    }

    setUploadedFiles((prev = {}) => ({ ...prev, [String(req_id)]: file }));
  };

  /* ---------- Delete file handler (user clicks trash) ---------- */
  const handleDeleteFile = async (req_id) => {
    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    const entry = uploadedFiles && uploadedFiles[String(req_id)];

    if (typeof entry === "string") {
      // server-side file: call API to delete
      try {
        const res = await fetch(`/api/delete-file/${encodeURIComponent(req_id)}`, {
          method: "DELETE",
          headers: { "X-CSRF-TOKEN": getCSRFToken() },
          credentials: "include",
        });
        const data = await res.json();
        if (data && data.success) {
          setUploadedFiles((prev = {}) => ({ ...prev, [String(req_id)]: null }));
        } else {
          // still clear local entry so UI reflects deletion; notify user about server issue
          setUploadedFiles((prev = {}) => ({ ...prev, [String(req_id)]: null }));
          window.alert((data && data.notification) || "Failed to delete file on server.");
        }
      } catch (err) {
        setUploadedFiles((prev = {}) => ({ ...prev, [String(req_id)]: null }));
        console.error("Failed to delete file:", err);
        window.alert("Failed to delete file. Please try again.");
      }
    } else {
      // local File object or null: just remove locally
      setUploadedFiles((prev = {}) => ({ ...prev, [String(req_id)]: null }));
      if (inputRefs.current[req_id]) inputRefs.current[req_id].value = "";
    }
  };

  /* ---------- Check if all required uploaded ---------- */
  const allRequiredUploaded = useMemo(() => {
    if (requirementsList.length === 0) return false;
    return requirementsList.every(({ req_id }) => {
      const entry = uploadedFiles && uploadedFiles[String(req_id)];
      return entry instanceof File || typeof entry === "string";
    });
  }, [requirementsList, uploadedFiles]);

  /* ---------- Proceed action (upload new local files, delete deselected server files) ---------- */
  const handleProceedClick = async () => {
    if (!allRequiredUploaded) {
      window.alert("Please upload all required files before proceeding.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      const reqsMeta = requirementsList.map(({ req_id }) => ({
        requirement_id: String(req_id),
        alreadyUploaded: typeof (uploadedFiles && uploadedFiles[String(req_id)]) === "string",
      }));
      formData.append("requirements", JSON.stringify(reqsMeta));

      requirementsList.forEach(({ req_id }) => {
        const val = uploadedFiles && uploadedFiles[String(req_id)];
        if (val instanceof File) {
          formData.append(`file_${String(req_id)}`, val, val.name);
        }
      });

      const res = await fetch("/api/save-file-supabase", {
        method: "POST",
        headers: { "X-CSRF-TOKEN": getCSRFToken() },
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (data && data.success) {
        onNext();
      } else {
        window.alert((data && data.notification) || "An error occurred while uploading files.");
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      window.alert("An error occurred while uploading files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Render ---------- */
  if (loading) return <LoadingSpinner message="Loading requirements..." />;

  return (
    <>
      {uploading && <LoadingSpinner message="Uploading files..." />}
      <ContentBox className="upload-requirements-box">
        <div className="upload-request-title-container">
          <h2 className="title">Upload Requirements</h2>
          <p className="subtext">
            Please upload the required documents. Note that all submissions are subject
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
              requirementsList.map(({ req_id, requirement_name }) => {
                const key = String(req_id);
                if (!inputRefs.current[key]) inputRefs.current[key] = null;
                const entry = uploadedFiles && uploadedFiles[key];

                return (
                  <div
                    key={key}
                    className="requirement-item"
                    onClick={() => {
                      if (uploading) return;
                      if (inputRefs.current[key]) inputRefs.current[key].click();
                    }}
                    style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (!uploading && inputRefs.current[key]) inputRefs.current[key].click();
                      }
                    }}
                  >
                    <div className="file-upload-info">
                      <span className="requirement-text">{requirement_name}</span>

                      <input
                        ref={(el) => (inputRefs.current[key] = el)}
                        type="file"
                        id={`upload-${key}`}
                        onChange={(e) => handleFileChange(key, e)}
                        disabled={uploading}
                        style={{ display: "none" }}
                      />

                      {entry ? (
                        <div className="requirement-item-action">
                          <span className="file-name">{displayFileName(entry)}</span>
                          <img
                            src="/assets/Trash.svg"
                            alt="Remove Icon"
                            style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                            className="remove-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!uploading) handleDeleteFile(key);
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
