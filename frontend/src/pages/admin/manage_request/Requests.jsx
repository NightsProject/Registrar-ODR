import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getCSRFToken } from "../../../utils/csrf";
import RequestModal from "../../../components/admin/RequestModal";
import StatusChangeConfirmModal from "../../../components/admin/StatusChangeConfirmModal";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

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
// Card Component 
// =======================================
const RequestCard = ({ request, onClick }) => {
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
      onClick={() => onClick(request)}
      className={`bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200 cursor-pointer transition 
      ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <div className="text-gray-900 font-medium">
        {request.full_name || "Lastname, Firstname"}
      </div>

      <div className="text-gray-400 text-sm">{date}</div>

      <div className="flex justify-end mt-2">
        <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

// =======================================
// Column Component 
// =======================================
const StatusColumn = ({ title, requests, onDropRequest, uiLabel, onCardClick }) => {
  const [, drop] = useDrop({
    accept: "REQUEST",
    drop: (item) => onDropRequest(item.id, uiLabel),
  });

  return (
    <div
      ref={drop}
      className="w-64 bg-white rounded-2xl shadow-sm p-4 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-gray-800 flex items-center gap-2">
          {title}
        </div>
        <div className="text-sm bg-gray-200 px-2 py-1 rounded-full text-gray-600">
          {requests.length}
        </div>
      </div>

      <div className="flex flex-col">
        {requests.map((r) => (
          <RequestCard key={r.request_id} request={r} onClick={onCardClick} />
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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  const [newStatus, setNewStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchRequests(currentPage);
  }, [currentPage]);

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests?page=${page}&limit=${limit}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCSRFToken(),
        },
        credentials: "include",
      });

      const data = await res.json();
      console.log('Fetched data:', data);
      setRequests(data.requests.map(req => ({ ...req, paymentStatus: req.payment_status })));
      setTotalRequests(data.total);
      setTotalPages(Math.ceil(data.total / limit));
      console.log('Total pages:', Math.ceil(data.total / limit));
    } catch (err) {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleDropRequest = (id, uiLabel) => {
    const request = requests.find((r) => r.request_id === id);
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

    fetchRequests(currentPage);
    setStatusChangeRequest(null);
    setNewStatus(null);
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
      <div className="p-8 bg-gray-100 min-h-screen">
        {/* Top title + search */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Manage Request</h1>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search Request"
            className="w-full p-4 rounded-full shadow-sm border border-gray-200 bg-white text-gray-700"
          />
        </div>

        {/* Columns */}
        <div className="flex gap-6 overflow-x-auto">
          {UI_STATUSES.map((label) => (
            <StatusColumn
              key={label}
              title={label}
              requests={grouped[label]}
              uiLabel={label}
              onDropRequest={handleDropRequest}
              onCardClick={setSelectedRequest}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-700">
              Page {currentPage} of {totalPages} ({totalRequests} total requests)
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedRequest && (
        <RequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleDropRequest}
        />
      )}

      {statusChangeRequest && (
        <StatusChangeConfirmModal
          request={statusChangeRequest}
          newStatus={newStatus}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusChangeRequest(null)}
        />
      )}
    </DndProvider>
  );
}
