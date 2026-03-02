import React, { useEffect, useState } from "react";
import "./Documents.css";
import FileCard from "../../../components/common/FileCard";
import AddCard from "../../../components/common/AddCard";
import Popup from "../../../components/admin/Popup";
import DeletePopup from "../../../components/admin/DeletePopup";
import SearchBar from "../../../components/common/SearchBar";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import RequirementsPopup from "../../../components/admin/RequirementsPopup";
import HidePopup from "../../../components/admin/HideDocPopup";
import CantDeleteDocPopup from "../../../components/admin/CantDeleteDocPopup";
import { getCSRFToken } from "../../../utils/csrf";

const CACHE_KEY = "documents_data_cache";

const getStoredState = (key, defaultValue) => {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn("Failed to parse session storage", error)
      return defaultValue;
    }
}

function Documents() {

  const cachedData = getStoredState(CACHE_KEY, null);
  const [documents, setDocuments] = useState(cachedData?.documents || []);
  const [requirements, setRequirements] = useState(cachedData?.requirements || []);
  const [documentsWithRequirements, setDocumentsWithRequirements] = useState(cachedData?.documentsWithRequirements || []);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDocRequirementsPopup, setShowDocRequirementsPopup] = useState(false);
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [showCantDeletePopup, setShowCantDeletePopup] = useState(false);

  const handleOpenDelete = async (doc) => {
    setSelectedDoc(doc);
    const exists = await checkDocumentExists(doc.doc_id);

    if (exists) {
      setShowCantDeletePopup(true); 
    } else {
      setShowDeletePopup(true); 
    }
  };

  const handleCloseDelete = () => {
    setSelectedDoc(null);
    setShowDeletePopup(false);
  };


  const checkDocumentExists = async (doc_id) => {
    try {
      const res = await fetch(`/api/check-doc-exist/${doc_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error checking document");

      return data.exists; // boolean
    } catch (err) {
      console.error(err);
      return true; // safest fallback: treat it as existing
    }
  };


  const handleDelete = async (docId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/delete-document/${docId}`, { 
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to delete document");

      await fetchDocuments();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doc) => {
    setSelectedDoc(doc);
    setShowPopup(true);
  };


  const handleHide = async (docId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/toggle-hide-document/${docId}`, { 
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to toggle hide");

      await fetchDocuments(); // refresh to get updated hidden status
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePopup = async () => {
  setShowPopup(false);
  setSelectedDoc(null);  // <-- already here, good
  await fetchDocuments();
};

  const handleOpen = () => {
  setSelectedDoc(null);   // <-- fix
  setShowPopup(true);
};

  const handleOpenHide = (doc) => {
    setSelectedDoc(doc);
    setShowHidePopup(true);
  };

  const fetchDocuments = async () => {
  try {
    if (!cachedData) setLoading(true);


    const csrfToken = getCSRFToken();
    const [docsRes, reqRes, joinRes] = await Promise.all([
      fetch("/api/get-documents", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
      }),
      fetch("/api/get-document-requirements", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
      }),
      fetch("/api/get-documents-with-requirements", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
      })
    ]);

    const documentsData = await docsRes.json();
    const requestsData = await reqRes.json();
    const documentsWithRequirements = await joinRes.json();

    setDocuments(documentsData);
    setRequirements(requestsData);
    setDocumentsWithRequirements(documentsWithRequirements);

    const documentDataToCache = {
      documents: documentsData,
      requirements: requestsData,
      documentsWithRequirements: documentsWithRequirements
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(documentDataToCache))

  } catch (err) {
    console.error("Error fetching:", err);
  } finally {
    setLoading(false);
  }
  };

  useEffect(() => {
  const delay = setTimeout(() => {
    setSearchTerm(searchTerm.trim());
  }, 200);
  return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const sortedDocuments = [...documentsWithRequirements].sort((a, b) =>
    b.doc_id.localeCompare(a.doc_id)
  );

  const filteredDocuments = sortedDocuments.filter(doc =>
    doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="manage-documents-page">
      {loading && <LoadingSpinner message="Loading documents..." />}
      <div className="toolbar">
        <h1 className="title">Manage Documents</h1>
        <div className="toolbar-actions">
          <SearchBar onChange={setSearchTerm} />
          <button 
            className="manage-requirements-button" 
            onClick={() => setShowDocRequirementsPopup(true)}
            >
              Requirements
            </button>
        </div>
      </div>
      
      <div className="file-cards-container">
        {searchTerm.trim() === "" && <AddCard onClick={handleOpen} />}
        {filteredDocuments.map((doc) => {
          console.log(doc.doc_name, doc.hidden); 
          return (
            <FileCard
              key={doc.doc_id}
              document={doc}
              onEdit={handleEdit}
              onDelete={handleOpenDelete}
              onHide={handleOpenHide}
              onClick={() => console.log("Clicked", doc.doc_id)}
              isAdmin={true}
            />
          );
        })}
      </div>

      {showPopup && (
        <Popup
          onClose={handleClosePopup}
          onDelete={handleOpenDelete}
          document={selectedDoc}
          onSuccess={fetchDocuments} 
        />
      )}

      {showDeletePopup && (
        <DeletePopup
          document={selectedDoc}
          onClose={handleCloseDelete}
          onDelete={handleDelete}
        />
      )}
      {showDocRequirementsPopup && (
        <RequirementsPopup
          onClose={() => {
            setShowDocRequirementsPopup(false);
            fetchDocuments(); // <-- refresh documents after done
          }}
          selectionMode={false}
          onAddRequirement={(newReq) => {
            fetchDocuments();
          }}
        />
      )}
      {showHidePopup && (
        <HidePopup
          document={selectedDoc}
          onClose={() => setShowHidePopup(false)}
          onToggle={handleHide} // the existing toggle function
          action={selectedDoc?.hidden ? "unhide" : "hide"} // dynamically choose hide/unhide
        />
      )}

      {showCantDeletePopup && (
        <CantDeleteDocPopup
          onClose={() => setShowCantDeletePopup(false)}
        />
      )}
    </div>
  );
}

export default Documents;
