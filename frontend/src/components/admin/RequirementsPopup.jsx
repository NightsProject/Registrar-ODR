import ButtonLink from "../common/ButtonLink";
import "./RequirementsPopup.css";
import { useState, useEffect } from "react";
import ReqSearchbar from "./ReqSearchbar";
import AddReqPopup from "./AddReqPopup";
import DeleteReqPopup from "./DeleteReqPopup";
import CantDeletePopup from "./CantDeletePopup";
import EditReqPopup from "./EditReqPopup";
import CantEditPopup from "./CantEditPopup";
import LoadingSpinner from "../../components/common/LoadingSpinner";




function RequirementsPopup({ onClose, selected = [], setSelected, onAddRequirement, selectionMode = true}) {
 const [requirements, setRequirements] = useState([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [filteredRequirements, setFilteredRequirements] = useState([]);
 const [showAddPopup, setShowAddPopup] = useState(false);
 const [showDeletePopup, setShowDeletePopup] = useState(false);
 const [deleteId, setDeleteId] = useState(null);
 const [showCantDeletePopup, setShowCantDeletePopup] = useState(false);
 const [editRequirement, setEditRequirement] = useState(null);
 const [showCantEditPopup, setShowCantEditPopup] = useState(false);
 const [loading, setLoading] = useState(false);
 const [initialSelected, setInitialSelected] = useState([]);


 useEffect(() => {
   setInitialSelected([...selected]);
 }, []);




 useEffect(() => {
   const fetchRequirements = async () => {
     try {
       setLoading(true);
       const res = await fetch("/admin/get-requirements");
       if (!res.ok) throw new Error("Failed to fetch requirements");
       const data = await res.json();
       setRequirements(data);
     } catch (err) {
       console.error(err);
     } finally {
       setLoading(false);
     }
   };


   fetchRequirements();
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
   if (!selectionMode) return;
   if (selected.includes(req_id)) {
     setSelected(selected.filter((id) => id !== req_id));
   } else {
     setSelected([...selected, req_id]);
   }
 };


 const handleSaveNewRequirement = async (name) => {
   try {
     const res = await fetch("/admin/add-requirement", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ requirement_name: name }),
     });


     const data = await res.json();


     if (!res.ok) throw new Error(data.error || "Failed to add requirement");


     const newReq = { req_id: data.req_id, requirement_name: name };
     setRequirements([newReq, ...requirements]);
     if (selectionMode && setSelected) setSelected([...selected, newReq.req_id]);
     if (onAddRequirement) onAddRequirement(newReq);


   } catch (err) {
     throw err; // propagate to popup to display in error section
   }
 };


 const handleAddNewRequirement = () => {
   setShowAddPopup(true);
 };


 const confirmDeleteRequirement = async () => {


   try {
     const res = await fetch(`/admin/delete-requirement/${deleteId}`, { method: "DELETE" });
     const data = await res.json();


     if (!res.ok) {
       return;
     }


     // Successfully deleted
     setRequirements(requirements.filter((r) => r.req_id !== deleteId));
     if (selectionMode) setSelected(selected.filter((id) => id !== deleteId));
     setShowDeletePopup(false);
     setDeleteId(null);


   } catch (err) {
     console.error(err);
   }
 };


 const checkRequirement = async (req_id) => {
   try {
     const res = await fetch(`/admin/check-req/${req_id}`);
     const data = await res.json();


     if (!res.ok) throw new Error(data.error || "Error checking requirement");


     // return true if it exists in either requests or documents
     return data.in_requests.exists || data.in_documents.exists;
   } catch (err) {
     console.error(err);
     return true; // safe fallback: assume it exists
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
     const data = await res.json();


     if (!res.ok) throw new Error(data.error || "Failed to update requirement");


     setRequirements(requirements.map(r => r.req_id === req_id ? { ...r, requirement_name: newName } : r));
   } catch (err) {
     throw err;
   }
 };


 return (
   <div className="requirements-overlay">
     {loading && <LoadingSpinner message="Loading Requirements..." />}
     <div className="requirements-popup">
       {selectionMode ? <h3 className="title">Select Requirements</h3> : <h2 className="title">Manage Requirements</h2>}


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
                 {selectionMode && (
                   <input
                     type="checkbox"
                     checked={selected.includes(req.req_id)}
                     onChange={() => handleToggle(req.req_id)}
                   />
                 )}
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
                         setShowCantEditPopup(true);
                       } else {
                         setEditRequirement(req);
                       }
                     } catch (err) {
                       console.error(err);
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
                       const exists = await checkRequirement(req.req_id);
                     if (exists) {
                       setShowCantDeletePopup(true);
                     } else {
                       setDeleteId(req.req_id);
                       setShowDeletePopup(true);
                     }
                     } catch (err) {
                       console.error(err);
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
             <ButtonLink
               onClick={() => {
                 if (selectionMode && setSelected) setSelected(initialSelected); // restore original selection
                 onClose();
               }}
               placeholder="Cancel"
               className="cancel-button"
               variant="secondary"
             />
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


     </div>
   </div>
 );
}


export default RequirementsPopup;





