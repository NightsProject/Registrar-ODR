
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getCSRFToken } from "../../../utils/csrf";
import { useAuth } from "../../../contexts/AuthContext";


import StatusChangeConfirmModal from "../../../components/admin/StatusChangeConfirmModal";
import RestrictionPopup from "../../../components/admin/RestrictionPopup";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ReqSearchbar from "../../../components/admin/ReqSearchbar";
import AssignDropdown from "../../../components/admin/AssignDropdown";
import ButtonLink from "../../../components/common/ButtonLink";
import Toast from "../../../components/common/Toast";
import "./Requests.css";


// =======================================
// STATUS MAPPING 
// =======================================
const STATUS_MAP = {
  Pending: "PENDING",
  Processing: "IN-PROGRESS",
  Unpaid: "DOC-READY", // the processing of documents is done but its unpaid
  Ready: "DOC-READY", // the documents is ready for release
  Done: "RELEASED", // the documents is released
  Change: "REJECTED" //documents is subject for change
};


const UI_STATUSES = Object.keys(STATUS_MAP);

// =======================================
// ALLOWED TRANSITIONS
// =======================================
const ALLOWED_TRANSITIONS = {
  Pending: ["Processing", "Change"],
  Processing: ["Unpaid", "Pending", "Change"],
  Unpaid: ["Ready", "Processing"],
  Ready: ["Done", "Unpaid"],
  Done: ["Ready"],
  Change: ["Pending"]
};

// =======================================
// Helper to get UI Status from Request
// =======================================
const getCurrentUiStatus = (request) => {
  if (request.status === "PENDING") return "Pending";
  if (request.status === "IN-PROGRESS") return "Processing";
  if (request.status === "DOC-READY") {
    return request.paymentStatus ? "Ready" : "Unpaid";
  }
  if (request.status === "RELEASED") return "Done";
  if (request.status === "REJECTED") return "Change";
  return null;
};

// =======================================
// Card Component
// =======================================

const RequestCard = ({ request, onClick, onAssign }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "REQUEST",
    item: { id: request.request_id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const date = request.requested_at || "Aug 23, 2025"; // placeholder fallback

  return (
    <div
      ref={drag}
      onClick={() => !isAssigning && onClick(request)}
      className={`column-item ${isAssigning ? 'cursor-not-allowed' : 'cursor-pointer'} transition
      ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <div className="text-gray-900 font-medium">
        {request.full_name || "Lastname, Firstname"}
      </div>

      <div className="text-gray-400 text-sm">{date}</div>

      <div className="flex justify-end mt-2">
        <AssignDropdown 
          requestId={request.request_id} 
          onAssign={onAssign} 
          onToggleOpen={setIsAssigning}
          assignedAdminId={request.assigned_admin_id}
          assignedAdminProfilePicture={request.assigned_admin_profile_picture}
        />
      </div>
    </div>
  );
};

// =======================================
// Column Component
// =======================================
const StatusColumn = ({ title, requests, onDropRequest, uiLabel, onCardClick, onAssign }) => {
  const [, drop] = useDrop({
    accept: "REQUEST",
    drop: (item) => onDropRequest(item.id, uiLabel),
  });

  return (
    <div
      ref={drop}
      className="box-columns"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-gray-800 flex items-center gap-2">
          {title}
        </div>
        <div className="text-sm bg-gray-200 px-2 py-1 rounded-full text-gray-600">
          {requests.length}
        </div>
      </div>

      <div className="column-items">
        {requests.map((r) => (
          <RequestCard key={r.request_id} request={r} onClick={onCardClick} onAssign={onAssign} />
        ))}

        {requests.length === 0 && (
          <div className="text-gray-400 text-center py-4">No requests</div>
        )}
      </div>
    </div>
  );
};


// =======================================
// MAIN COMPONENT
// =======================================
export default function AdminRequestsDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  const [newStatus, setNewStatus] = useState(null);
  const [restrictionData, setRestrictionData] = useState({ isOpen: false, currentStatus: '', targetStatus: '', allowedTransitions: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'
  const [collegeCodeFilter, setCollegeCodeFilter] = useState('');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState('');
  const [hasOthersDocsFilter, setHasOthersDocsFilter] = useState('');
  const [availableCollegeCodes, setAvailableCollegeCodes] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "" });
  const limit = 20;

    const showToast = (message, variant = "info") => {
      setToast({ show: true, message, variant });
    };



  useEffect(() => {
    // Set initial view mode and fetch data based on role
    const initialMode = role === 'staff' ? 'my' : 'all';
    setViewMode(initialMode);
    fetchRequests(1, '', initialMode);
    fetchAvailableFilters();
  }, [role]);

  const fetchAvailableFilters = async () => {
    try {
      const res = await fetch('/api/admin/requests/filters', {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableCollegeCodes(data.college_codes || []);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchRequests = async (page, search, mode) => {
    setLoading(true);
    try {
      let endpoint = mode === 'my' ? '/api/admin/my-requests' : '/api/admin/requests';
      let params = [`page=${page}`, `limit=${limit}`];
      
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (collegeCodeFilter) params.push(`college_code=${encodeURIComponent(collegeCodeFilter)}`);
      if (requesterTypeFilter) params.push(`requester_type=${encodeURIComponent(requesterTypeFilter)}`);
      if (hasOthersDocsFilter) params.push(`has_others_docs=${encodeURIComponent(hasOthersDocsFilter)}`);

      const res = await fetch(`${endpoint}?${params.join('&')}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Fetched data:', data);
      setRequests(data.requests.map(req => ({ ...req, paymentStatus: req.payment_status })));
      setTotalRequests(data.total);
      setTotalPages(Math.ceil(data.total / limit));
      console.log('Total pages:', Math.ceil(data.total / limit));
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };


  const handleDropRequest = (id, uiLabel) => {
    const request = requests.find((r) => r.request_id === id);
    if (!request) return;


const currentUiStatus = getCurrentUiStatus(request);
    
    // Check restrictions
    if (currentUiStatus !== uiLabel) { // Only check if moving to a different column
      const allowedTargets = ALLOWED_TRANSITIONS[currentUiStatus] || [];
      if (!allowedTargets.includes(uiLabel)) {
        setRestrictionData({
          isOpen: true,
          currentStatus: currentUiStatus,
          targetStatus: uiLabel,
          allowedTransitions: allowedTargets
        });
        return;
      }
    }

    const backendCode = STATUS_MAP[uiLabel];

    // Adjust payment status for Unpaid and Ready columns only
    const paymentStatus =
      uiLabel === "Unpaid" ? false : uiLabel === "Ready" ? true : request.paymentStatus;

    if (request && (request.status !== backendCode || request.paymentStatus !== paymentStatus)) {
      setStatusChangeRequest(request);
      setNewStatus({ status: backendCode, payment_status: paymentStatus });
    }
  };


  const confirmStatusChange = async () => {
    if (!statusChangeRequest) return;

    await fetch(`/api/admin/requests/${statusChangeRequest.request_id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCSRFToken(),
      },
      credentials: "include",
      body: JSON.stringify(newStatus),
    });

    fetchRequests(currentPage, searchQuery, viewMode);
    setStatusChangeRequest(null);
    setNewStatus(null);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRequests(1, searchQuery, viewMode);
  };

  const clearFilters = () => {
    setCollegeCodeFilter('');
    setRequesterTypeFilter('');
    setHasOthersDocsFilter('');
    setSearchQuery('');
    setCurrentPage(1);
    fetchRequests(1, '', viewMode);
  };

  const handleCardClick = (request) => {
    navigate(`/admin/Requests/${request.request_id}`);
  };

  const handleAssignRequest = async (requestId, adminId) => {
    try {
      const res = await fetch("/api/admin/manual-assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify({ request_ids: [requestId], admin_id: adminId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        fetchRequests(currentPage, searchQuery, viewMode);
      } else {
        showToast(data.error, "error");
      }
    } catch (err) {
      console.error("Error assigning request:", err);
      showToast("Error assigning request", "error");
    }
  };

  if (loading) return <LoadingSpinner message="Loading requests..." />;

  if (error)
    return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  // Group requests by backend status
  const grouped = {};
  UI_STATUSES.forEach((label) => {
    const backendCode = STATUS_MAP[label];
    if (label === "Unpaid") {
      grouped[label] = requests.filter(
        (r) => r.status === backendCode && r.paymentStatus === false
      );
    } else if (label === "Ready") {
      grouped[label] = requests.filter(
        (r) => r.status === backendCode && r.paymentStatus === true
      );
    } else {
      grouped[label] = requests.filter((r) => r.status === backendCode);
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
        <Toast
          show={toast.show}
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ ...toast, show: false })}
        />

      <div className="requests-page">
        <h1 className="title">Manage Requests</h1>
        {/* Role-based notice for staff users */}
        {role === 'staff' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">You are viewing your assigned tasks only</span>
            </div>
          </div>
        )}

        {/* Filter buttons */}
        <div className="request-toolbar">

          <ReqSearchbar onSearch={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
            fetchRequests(1, value, viewMode);
          }} />

          {/* Only show "All View" button for non-staff users */}
          {role !== 'staff' && (
            <button
              onClick={() => {
                if (role !== 'staff') { // Double-check role before switching
                  setViewMode('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                  fetchRequests(1, '', 'all');
                }
              }}
              className={`square-button ${viewMode === 'all' ? 'selected' : ''}`}
            >
              <img src={ viewMode === 'all' ? "/assets/GlobeWhite.svg": "/assets/GlobeBlack.svg"} alt=" Globe Icon"/>
              <p>All</p>
            </button>
          )}
            <button
              onClick={() => {
                setViewMode('my');
                setSearchQuery('');
                setCurrentPage(1);
                fetchRequests(1, '', 'my');
              }}
              className={`square-button ${viewMode === 'my' ? 'selected' : ''}`}
            >
              <img src={ viewMode === 'my' ? "/assets/UserWhite.svg": "/assets/UserBlack.svg"} alt="User Icon"/>
              <p>Mine</p>
            </button>
          {/* Only show "Assign Requests" button for non-staff users */}
          {role !== 'staff' && (
            <button
              onClick={() => navigate('/admin/AssignRequests')}
              className="square-button"
              id="assign-requests-button"
            >
              <img src="/assets/Tag.svg" alt="Tag Icon" />
              <p>Assign</p>
            </button>
          )}


        </div>
        {/* Filter Controls */}
        <div className="filter-controls">
            {/* College Code Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">College Code</label>
              <select
                value={collegeCodeFilter}
                onChange={(e) => setCollegeCodeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Colleges</option>
                {availableCollegeCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            {/* Requester Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Requester Type</label>
              <select
                value={requesterTypeFilter}
                onChange={(e) => setRequesterTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Requesters</option>
                <option value="student">Student</option>
                <option value="outsider">Outsider</option>
              </select>
            </div>

            {/* Others Documents Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Others Documents</label>
              <select
                value={hasOthersDocsFilter}
                onChange={(e) => setHasOthersDocsFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Requests</option>
                <option value="true">Has Others Documents</option>
                <option value="false">No Others Documents</option>
              </select>
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="square-button"
                id="filter-button-apply"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="square-button"
                id="filter-button-clear"
              >
                Clear
              </button>
            </div>
        </div>

        {/* Columns */}
        <div className="box-columns-container">
          {UI_STATUSES.map((label) => (
            <StatusColumn
              key={label}
              title={label}
              requests={grouped[label]}
              uiLabel={label}
              onDropRequest={handleDropRequest}
              onCardClick={handleCardClick}
              onAssign={handleAssignRequest}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-4">
            <button
              onClick={() => {
                const newPage = Math.max(currentPage - 1, 1);
                setCurrentPage(newPage);
                fetchRequests(newPage, searchQuery, viewMode);
              }}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-700">
              Page {currentPage} of {totalPages} ({totalRequests} total requests)
            </span>
            <button
              onClick={() => {
                const newPage = Math.min(currentPage + 1, totalPages);
                setCurrentPage(newPage);
                fetchRequests(newPage, searchQuery, viewMode);
              }}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>






      {statusChangeRequest && (
        <StatusChangeConfirmModal
          request={statusChangeRequest}
          newStatus={newStatus}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusChangeRequest(null)}
        />
      )}

      <RestrictionPopup
        isOpen={restrictionData.isOpen}
        onClose={() => setRestrictionData({ ...restrictionData, isOpen: false })}
        currentStatus={restrictionData.currentStatus}
        targetStatus={restrictionData.targetStatus}
        allowedTransitions={restrictionData.allowedTransitions}
      />
    </DndProvider>
  );
}
