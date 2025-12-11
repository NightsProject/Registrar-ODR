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

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [documentsWithRequirements, setDocumentsWithRequirements] = useState([]);
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
      setShowCantDeletePopup(true); // cannot delete
    } else {
      setShowDeletePopup(true); // safe to delete
    }
  };

  const handleCloseDelete = () => {
    setSelectedDoc(null);
    setShowDeletePopup(false);
  };

  const checkDocumentExists = async (doc_id) => {
    try {
      const res = await fetch(`/admin/check-doc-exist/${doc_id}`);
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
      const res = await fetch(`/admin/delete-document/${docId}`, { method: "DELETE" });
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
      const res = await fetch(`/admin/toggle-hide-document/${docId}`, { method: "PATCH" });
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
    setLoading(true);

    const [docsRes, reqRes, joinRes] = await Promise.all([
      fetch("/admin/get-documents"),
      fetch("/admin/get-document-requirements"),
      fetch("/admin/get-documents-with-requirements")
    ]);

    const docsData = await docsRes.json();
    const reqData = await reqRes.json();
    const joinData = await joinRes.json();

    setDocuments(docsData);
    setRequirements(reqData);
    setDocumentsWithRequirements(joinData);

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
    <div>
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
            onClose={() => setShowDocRequirementsPopup(false)}
            selectionMode={false}
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
