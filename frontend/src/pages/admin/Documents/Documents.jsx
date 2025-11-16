import React, { useEffect, useState } from "react";
import "./Documents.css";
import FileCard from "../../../components/common/FileCard";
import AddCard from "../../../components/common/AddCard";
import Popup from "../../../components/admin/Popup";
import DeletePopup from "../../../components/admin/DeletePopup";
import SearchBar from "../../../components/common/SearchBar";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [documentsWithRequirements, setDocumentsWithRequirements] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      const res = await fetch(`/admin/delete-document/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");

      await fetchDocuments();  // refresh list

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
