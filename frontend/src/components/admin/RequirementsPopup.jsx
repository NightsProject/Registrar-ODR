import ButtonLink from "../common/ButtonLink";
import "./RequirementsPopup.css";
import { useState, useEffect } from "react";
import ReqSearchbar from "./ReqSearchbar";
import AddReqPopup from "./AddReqPopup";
import DeleteReqPopup from "./DeleteReqPopup";
import CantDeletePopup from "./CantDeletePopup";
import EditReqPopup from "./EditReqPopup";
import CantEditPopup from "./CantEditPopup";

function RequirementsPopup({ onClose, selected, setSelected, onAddRequirement }) {
  const [requirements, setRequirements] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // track search input
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showCantDeletePopup, setShowCantDeletePopup] = useState(false);
  const [editRequirement, setEditRequirement] = useState(null);
  const [showCantEditPopup, setShowCantEditPopup] = useState(false);

  useEffect(() => {
    fetch("/admin/get-requirements")
      .then((res) => res.json())
      .then((data) => {
        setRequirements(data);
      })
      .catch((err) => console.error(err));
  }, []);
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRequirements(requirements);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredRequirements(
        requirements.filter((r) => r.requirement_name.toLowerCase().includes(term))
      );
    }
  }, [searchTerm, requirements]);

  const handleToggle = (req_id) => {
    if (selected.includes(req_id)) {
      setSelected(selected.filter((id) => id !== req_id));
    } else {
      setSelected([...selected, req_id]);
    }
  };

  const handleAddNewRequirement = () => {
  setShowAddPopup(true);
  };

  const handleSaveNewRequirement = async (name) => {
  try {
    const res = await fetch("/admin/add-requirement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirement_name: name }),
    });
    if (!res.ok) throw new Error("Failed to add requirement");

    const result = await res.json();
    const newReq = {
      req_id: result.req_id,
      requirement_name: name,
    };

    setRequirements([newReq, ...requirements]);
    setSelected([...selected, newReq.req_id]);
    if (onAddRequirement) onAddRequirement(newReq);

    setShowAddPopup(false); // close the add popup
  } catch (err) {
    console.error(err);
    alert("Failed to add requirement. Try again.");
  }
};

  const confirmDeleteRequirement = async () => {
  try {
    const res = await fetch(`/admin/delete-requirement/${deleteId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      // If backend returns 400 because requirement is in use
      alert(data.error || "Cannot delete this requirement because it is in use in one or more requests.");
      return;
    }

    // Successfully deleted
    setRequirements(requirements.filter((r) => r.req_id !== deleteId));
    setSelected(selected.filter((id) => id !== deleteId));
    setShowDeletePopup(false);
    setDeleteId(null);

  } catch (err) {
    console.error(err);
    alert("Failed to delete requirement. Try again.");
  }
};

  const checkRequirementExists = async (req_id) => {
  try {
    const res = await fetch(`/admin/check-req-exist/${req_id}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error checking requirement");

    return data.exists; // boolean
  } catch (err) {
    console.error(err);
    return true; // be safe, assume it exists
  }
};


const handleSaveEdit = async (req_id, newName) => {
  try {
    const res = await fetch(`/admin/edit-requirement/${req_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirement_name: newName }),
    });
    if (!res.ok) throw new Error("Failed to update requirement");

    setRequirements(requirements.map(r => r.req_id === req_id ? { ...r, requirement_name: newName } : r));
    setEditRequirement(null);
  } catch (err) {
    console.error(err);
    alert("Failed to save requirement. Try again.");
  }
};


  return (
    <div className="requirements-overlay">
      <div className="requirements-popup">
        <h3 className="title">Edit Requirements</h3>

        <div className="search-section">
          <ReqSearchbar
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            placeholder="Search requirements..."
          />
        </div>

        <div className="requirements-section">
          <div className="add-requirement-section">
            <div className="add-requirement" onClick={handleAddNewRequirement}>
              <p className="subtext">Add Requirement</p>
              <img src="/assets/AddIcon.svg" alt="Add Icon" />
            </div>
            <hr />
          </div>

          <div className="requirement-item-wrapper">
            {filteredRequirements.map((req) => (
              <div className="requirement-item" key={req.req_id}>
                <div className="requirement-action-section">
                  <input
                    type="checkbox"
                    checked={selected.includes(req.req_id)}
                    onChange={() => handleToggle(req.req_id)}
                  />
                  <input
                      type="text"
                      className="requirement-name-field"
                      value={req.requirement_name}
                      placeholder="Untitled Requirement"
                      readOnly
                    />
                  <img 
                    src="/assets/EditIcon.svg" 
                    alt="Edit Icon" 
                    className="edit-icon" 
                    style={{ cursor: "pointer" }}
                    onClick={async () => {
                      try {
                        const exists = await checkRequirementExists(req.req_id);
                        if (exists) {
                          setShowCantEditPopup(true); // show cant edit popup
                        } else {
                          setEditRequirement(req); // show edit popup
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Failed to check requirement. Try again.");
                      }
                    }}
                  />
                  <img
                      src="/assets/Trash.svg"
                      alt="Remove Icon"
                      className="remove-icon"
                      style={{ cursor: "pointer" }}
                      onClick={async () => {
                        try {
                          const exists = await checkRequirementExists(req.req_id);
                          if (exists) {
                            setShowCantDeletePopup(true); // show cant delete popup
                          } else {
                            setDeleteId(req.req_id);
                            setShowDeletePopup(true);
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Failed to check requirement. Try again.");
                        }
                      }}
                    />
                  
                </div>
                <hr />
              </div>
            ))}
            {filteredRequirements.length === 0 && (
              <p style={{ textAlign: "center", color: "#888" }}>No matching requirements</p>
            )}
          </div>
        </div>

        <div className="action-section">
          <div className="button-section">
            <div className="cancel-button-wrapper">
              <ButtonLink onClick={onClose} placeholder="Cancel" className="cancel-button" variant="secondary" />
            </div>
            <div className="proceed-button-wrapper">
              <ButtonLink onClick={onClose} placeholder="Done" className="proceed-button" variant="primary" />
            </div>
          </div>
        </div>

        {showAddPopup && (
          <AddReqPopup
            onClose={() => setShowAddPopup(false)}
            onSave={handleSaveNewRequirement}
          />
        )}

        {showDeletePopup && (
          <DeleteReqPopup
            onClose={() => setShowDeletePopup(false)}
            onConfirm={confirmDeleteRequirement}
          />
        )}
        
        {showCantDeletePopup && (
          <CantDeletePopup
            onClose={() => setShowCantDeletePopup(false)}
          />
        )}

        {showCantEditPopup && (
          <CantEditPopup
            onClose={() => setShowCantEditPopup(false)}
          />
        )}

       {editRequirement && (
          <EditReqPopup
            onClose={() => setEditRequirement(null)}
            onSave={handleSaveEdit}
            requirement={editRequirement}
          />
        )}

        {showCantEditPopup && (
          <CantEditPopup
            onClose={() => setShowCantEditPopup(false)}
          />
        )}

      </div>
    </div>
  );
}

export default RequirementsPopup;
