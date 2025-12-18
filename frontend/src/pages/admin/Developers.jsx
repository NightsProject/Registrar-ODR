import React, { useState, useEffect } from "react";
import { getCSRFToken } from "../../utils/csrf";
import "./Developers.css";

const Developers = () => {
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Fetch test mode setting
  const fetchTestMode = async () => {
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/test-mode', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestMode(data.test_mode);
      }
    } catch (error) {
      console.error('Error fetching test mode:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update test mode setting
  const updateTestMode = async (newTestMode) => {
    setSaving(true);
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/test-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ test_mode: newTestMode }),
      });
      
      if (response.ok) {
        setTestMode(newTestMode);
        // If turning on test mode, also fetch feedback
        if (newTestMode) {
          fetchFeedback();
        }
      } else {
        console.error('Failed to update test mode');
        // Revert the toggle if update failed
        setTestMode(!newTestMode);
      }
    } catch (error) {
      console.error('Error updating test mode:', error);
      // Revert the toggle if update failed
      setTestMode(!newTestMode);
    } finally {
      setSaving(false);
    }
  };

  // Fetch feedback
  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/feedback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeedbackList(data.feedback || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Update feedback status
  const updateFeedbackStatus = async (feedbackId, status) => {
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch(`/api/developers/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        // Update local state
        setFeedbackList(prev => 
          prev.map(feedback => 
            feedback.feedback_id === feedbackId 
              ? { ...feedback, status }
              : feedback
          )
        );
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  // Delete feedback
  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const csrfToken = getCSRFToken();
      const response = await fetch(`/api/developers/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        // Remove from local state
        setFeedbackList(prev => 
          prev.filter(feedback => feedback.feedback_id !== feedbackId)
        );
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  useEffect(() => {
    fetchTestMode();
  }, []);

  useEffect(() => {
    if (testMode) {
      fetchFeedback();
    }
  }, [testMode]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'bg-red-100 text-red-800';
      case 'IN PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="developers-container">
        <div className="loading-state">
          <p>Loading developers settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="developers-container">
      <div className="developers-header">
        <h1>Developers Panel</h1>
        <p>Manage test mode and view feedback from test users</p>
      </div>

      {/* Test Mode Toggle */}
      <div className="developers-section">
        <div className="section-header">
          <h2>Test Mode Settings</h2>
          <p>Enable test mode to allow user registration and feedback collection</p>
        </div>
        
        <div className="test-mode-toggle">
          <div className="toggle-info">
            <h3>Test Mode</h3>
            <p>
              {testMode 
                ? "Test mode is enabled. Users can register and submit feedback."
                : "Test mode is disabled. User registration and feedback are not available."
              }
            </p>
          </div>
          
          <div className="toggle-switch">
            <label className="switch">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => updateTestMode(e.target.checked)}
                disabled={saving}
              />
              <span className="slider"></span>
            </label>
            {saving && <span className="saving-indicator">Saving...</span>}
          </div>
        </div>
      </div>

      {/* Feedback Section - Only show when test mode is enabled */}
      {testMode && (
        <div className="developers-section">
          <div className="section-header">
            <h2>User Feedback</h2>
            <p>View and manage feedback submitted by test users</p>
          </div>

          {loadingFeedback ? (
            <div className="loading-state">
              <p>Loading feedback...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="empty-state">
              <p>No feedback submissions yet.</p>
            </div>
          ) : (
            <div className="feedback-list">
              {feedbackList.map((feedback) => (
                <div key={feedback.feedback_id} className="feedback-item">
                  <div className="feedback-header">
                    <div className="feedback-meta">
                      <h4>{feedback.name}</h4>
                      <span className="feedback-email">{feedback.email}</span>
                      <span className={`feedback-type ${feedback.feedback_type.toLowerCase().replace(' ', '-')}`}>
                        {feedback.feedback_type}
                      </span>
                    </div>
                    <div className="feedback-status">
                      <select
                        value={feedback.status}
                        onChange={(e) => updateFeedbackStatus(feedback.feedback_id, e.target.value)}
                        className={`status-select ${getStatusColor(feedback.status)}`}
                      >
                        <option value="NEW">New</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <button
                        onClick={() => deleteFeedback(feedback.feedback_id)}
                        className="delete-btn"
                        title="Delete feedback"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="feedback-content">
                    <p className="feedback-description">{feedback.description}</p>
                    {feedback.steps_to_reproduce && (
                      <div className="steps-section">
                        <h5>Steps to Reproduce:</h5>
                        <p>{feedback.steps_to_reproduce}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="feedback-footer">
                    <span className="feedback-date">
                      Submitted: {new Date(feedback.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Developers;
