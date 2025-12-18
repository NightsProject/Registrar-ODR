import React, { useState } from "react";
import { getCSRFToken } from "../../utils/csrf";
import "./TestModePopup.css";

const TestModePopup = ({ isOpen, onClose, onRegistrationSuccess }) => {
  const [currentStep, setCurrentStep] = useState('role-selection');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Form states
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    firstname: '',
    lastname: '',
    contact_number: '',
    email: '',
    college_code: ''
  });
  
  const [adminForm, setAdminForm] = useState({
    email: '',
    role: 'staff'
  });
  
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    feedback_type: 'General Feedback',
    description: '',
    steps_to_reproduce: ''
  });

  // Reset forms when closing
  const handleClose = () => {
    setCurrentStep('role-selection');
    setUserRole('');
    setShowFeedbackForm(false);
    setFeedbackSubmitted(false);
    setStudentForm({
      student_id: '',
      firstname: '',
      lastname: '',
      contact_number: '',
      email: '',
      college_code: ''
    });
    setAdminForm({
      email: '',
      role: 'staff'
    });
    setFeedbackForm({
      name: '',
      email: '',
      feedback_type: 'General Feedback',
      description: '',
      steps_to_reproduce: ''
    });
    onClose();
  };

  // Student registration
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/test-registration/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(studentForm),
      });
      
      if (response.ok) {
        setCurrentStep('success');
        setShowFeedbackForm(true);
        onRegistrationSuccess?.('student', studentForm);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Registration failed'}`);
      }
    } catch (error) {
      console.error('Student registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Admin registration
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/test-registration/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(adminForm),
      });
      
      if (response.ok) {
        setCurrentStep('success');
        setShowFeedbackForm(true);
        onRegistrationSuccess?.('admin', adminForm);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Registration failed'}`);
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/developers/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(feedbackForm),
      });
      
      if (response.ok) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Feedback submission failed'}`);
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert('Feedback submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (formType, field, value) => {
    if (formType === 'student') {
      setStudentForm(prev => ({ ...prev, [field]: value }));
    } else if (formType === 'admin') {
      setAdminForm(prev => ({ ...prev, [field]: value }));
    } else if (formType === 'feedback') {
      setFeedbackForm(prev => ({ ...prev, [field]: value }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="test-mode-overlay">
      <div className="test-mode-popup">
        <div className="popup-header">
          <h2>Test Mode Registration</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="popup-content">
          {currentStep === 'role-selection' && (
            <div className="role-selection">
              <p className="role-description">
                Welcome! Please select your role for test mode registration.
              </p>
              
              <div className="role-options">
                <div 
                  className="role-card"
                  onClick={() => {
                    setUserRole('student');
                    setCurrentStep('student-form');
                  }}
                >
                  <div className="role-icon">👨‍🎓</div>
                  <h3>Student</h3>
                  <p>Register as a student to test the document request system</p>
                </div>
                
                <div 
                  className="role-card"
                  onClick={() => {
                    setUserRole('admin');
                    setCurrentStep('admin-form');
                  }}
                >
                  <div className="role-icon">👨‍💼</div>
                  <h3>Administrator</h3>
                  <p>Register as an admin to test the management system</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'student-form' && (
            <div className="form-section">
              <h3>Student Registration</h3>
              <form onSubmit={handleStudentSubmit} className="registration-form">
                <div className="form-group">
                  <label>Student ID *</label>
                  <input
                    type="text"
                    value={studentForm.student_id}
                    onChange={(e) => handleInputChange('student', 'student_id', e.target.value)}
                    placeholder="e.g., 2025-1011"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={studentForm.firstname}
                      onChange={(e) => handleInputChange('student', 'firstname', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={studentForm.lastname}
                      onChange={(e) => handleInputChange('student', 'lastname', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Contact Number * (639xxxxxxxxx)</label>
                  <input
                    type="tel"
                    value={studentForm.contact_number}
                    onChange={(e) => handleInputChange('student', 'contact_number', e.target.value)}
                    placeholder="639123456789"
                    pattern="639[0-9]{9}"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => handleInputChange('student', 'email', e.target.value)}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>College Code *</label>
                  <select
                    value={studentForm.college_code}
                    onChange={(e) => handleInputChange('student', 'college_code', e.target.value)}
                    required
                  >
                    <option value="">Select College</option>
                    <option value="CCS">College of Computer Studies</option>
                    <option value="COE">College of Engineering</option>
                    <option value="CAS">College of Arts and Sciences</option>
                    <option value="CBA">College of Business Administration</option>
                    <option value="CON">College of Nursing</option>
                    <option value="COED">College of Education</option>
                  </select>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setCurrentStep('role-selection')}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 'admin-form' && (
            <div className="form-section">
              <h3>Administrator Registration</h3>
              <form onSubmit={handleAdminSubmit} className="registration-form">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => handleInputChange('admin', 'email', e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={adminForm.role}
                    onChange={(e) => handleInputChange('admin', 'role', e.target.value)}
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="auditor">Auditor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>
                
                <div className="admin-info">
                  <p><strong>Note:</strong> This is for test mode only. For production access, contact the system administrator.</p>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setCurrentStep('role-selection')}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Admin'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="success-section">
              <div className="success-icon">✅</div>
              <h3>Registration Successful!</h3>
              <p>Your test account has been created. You can now proceed to use the system.</p>
            </div>
          )}

          {showFeedbackForm && !feedbackSubmitted && (
            <div className="feedback-section">
              <h3>We Value Your Feedback</h3>
              <p>Help us improve by sharing your experience.</p>
              <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={feedbackForm.name}
                      onChange={(e) => handleInputChange('feedback', 'name', e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={feedbackForm.email}
                      onChange={(e) => handleInputChange('feedback', 'email', e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Feedback Type *</label>
                  <select
                    value={feedbackForm.feedback_type}
                    onChange={(e) => handleInputChange('feedback', 'feedback_type', e.target.value)}
                    required
                  >
                    <option value="General Feedback">General Feedback</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={feedbackForm.description}
                    onChange={(e) => handleInputChange('feedback', 'description', e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows="4"
                    required
                  />
                </div>
                
                {feedbackForm.feedback_type === 'Bug Report' && (
                  <div className="form-group">
                    <label>Steps to Reproduce *</label>
                    <textarea
                      value={feedbackForm.steps_to_reproduce}
                      onChange={(e) => handleInputChange('feedback', 'steps_to_reproduce', e.target.value)}
                      placeholder="1. Go to... 2. Click on... 3. See error..."
                      rows="3"
                      required
                    />
                  </div>
                )}
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {feedbackSubmitted && (
            <div className="feedback-success">
              <div className="success-icon">🎉</div>
              <h3>Thank You!</h3>
              <p>Your feedback has been submitted successfully. This popup will close automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestModePopup;
