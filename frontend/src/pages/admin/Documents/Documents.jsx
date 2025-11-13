import React, { useEffect, useState } from "react";
import "./Documents.css";
import FileCard from "../../../components/common/FileCard";
import AddCard from "../../../components/common/AddCard";
import Popup from "../../../components/admin/Popup";
import DeletePopup from "../../../components/admin/DeletePopup";
import SearchBar from "../../../components/common/SearchBar";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [documentsWithRequirements, setDocumentsWithRequirements] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleOpenDelete = (doc) => {
    setSelectedDoc(doc);
    setShowDeletePopup(true);
  };

  const handleCloseDelete = () => {
    setSelectedDoc(null);
    setShowDeletePopup(false);
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`/admin/delete-document/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      fetchDocuments(); // refresh list
    } catch (err) {
      console.error(err);
    }
  };

  // Open the add/edit popup
  const handleEdit = (doc) => {
    setSelectedDoc(doc);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedDoc(null);
  };

  const handleOpen = () => setShowPopup(true);

  // Fetch documents, requirements, and joined data
  const fetchDocuments = () => {
    fetch("/admin/get-documents")
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch((err) => console.error("Error fetching documents:", err));

    fetch("/admin/get-document-requirements")
      .then((res) => res.json())
      .then((data) => setRequirements(data))
      .catch((err) => console.error("Error fetching requirements:", err));

    fetch("/admin/get-documents-with-requirements")
      .then((res) => res.json())
      .then((data) => setDocumentsWithRequirements(data))
      .catch((err) => console.error("Error fetching joined documents:", err));
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

  useEffect(() => {
    if (documents.length > 0 && requirements.length > 0) {
      const docsWithReqs = documents.map((doc) => {
        const reqsForDoc = requirements
          .filter((r) => r.doc_id === doc.doc_id)
          .map((r) => r.requirement_name);
        return { ...doc, requirements: reqsForDoc };
      });
      setDocumentsWithRequirements(docsWithReqs);
    }
  }, [documents, requirements]);

  const sortedDocuments = [...documentsWithRequirements].sort((a, b) =>
    b.doc_id.localeCompare(a.doc_id)
  );

  const filteredDocuments = sortedDocuments.filter(doc =>
    doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="toolbar">
        <h1 className="title">Manage Documents</h1>
        <SearchBar onChange={setSearchTerm} />
      </div>
      
      <div className="file-cards-container">
        {searchTerm.trim() === "" && <AddCard onClick={handleOpen} />}
        {filteredDocuments.map((doc) => (
          <FileCard
            key={doc.doc_id}
            document={doc}
            onEdit={handleEdit}
            onDelete={handleOpenDelete}
            onClick={() => console.log("Clicked", doc.doc_id)}
            isAdmin={true}
          />
        ))}
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
    </div>
  );
}

export default Documents;
