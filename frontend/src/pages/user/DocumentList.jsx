import React, { useEffect, useState } from "react";
import "./DocumentList.css";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FileCard from "../../components/common/FileCard";
import SearchBar from "../../components/common/SearchBar";

function ViewDocuments() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/view-documents", {
      method: "GET",
    })
      .then(async (res) => {
        const data = await res.json();
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching documents:", err);
        setLoading(false);
      });
  }, []);

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
          <div className="bottom-section" id="documents-section">
            <h1 className="title">Available Documents</h1>
            <div className="user-searchbar-container">
              <SearchBar onChange={setSearchTerm} />
            </div>
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <FileCard
                  key={doc.doc_id}
                  document={doc}
                  selectable={false}
                  isSelected={false}
                  onClick={() => {}}
                  isAdmin={false}
                  className="document-card"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ViewDocuments;
