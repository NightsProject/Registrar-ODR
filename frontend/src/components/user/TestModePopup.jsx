

import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/csrf";
import { validationService } from "../../services/registrationService";
import "./TestModePopup.css";


const TestModePopup = ({ isOpen, onClose, onRegistrationSuccess }) => {

  const [currentStep, setCurrentStep] = useState('role-selection');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState('user');
  
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
    setFeedbackSubmitted(false);
    setValidationErrors({});
    setGuideActiveTab('user');
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



  // Student registration with enhanced validation
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsValidating(true);
    
    try {
      // First, validate the form data locally
      const validation = validationService.validateStudentData(studentForm);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setLoading(false);
        setIsValidating(false);
        return;
      }

      // Then validate uniqueness across tables
      const uniquenessCheck = await validationService.validateStudentUniqueness(
        studentForm.student_id, 
        studentForm.email
      );

      if (!uniquenessCheck.isValid) {
        setValidationErrors({ 
          general: uniquenessCheck.error || 'Student ID or email already exists' 
        });
        setLoading(false);
        setIsValidating(false);
        return;
      }

      // Clear any previous validation errors
      setValidationErrors({});
      
      // Proceed with registration
      const response = await authenticatedFetch('/api/developers/test-registration/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentForm),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentStep('success');
        onRegistrationSuccess?.('student', { ...studentForm, message: result.message });
      } else {
        const error = await response.json();
        setValidationErrors({ 
          general: error.error || 'Registration failed' 
        });
      }
    } catch (error) {
      console.error('Student registration error:', error);
      setValidationErrors({ 
        general: 'Registration failed. Please try again.' 
      });
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  };



  // Admin registration with enhanced validation
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsValidating(true);
    
    try {
      // First, validate the form data locally
      const validation = validationService.validateAdminData(adminForm);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setLoading(false);
        setIsValidating(false);
        return;
      }

      // Then validate email uniqueness across tables
      const uniquenessCheck = await validationService.validateAdminUniqueness(adminForm.email);

      if (!uniquenessCheck.isValid) {
        setValidationErrors({ 
          general: uniquenessCheck.error || 'Email already exists' 
        });
        setLoading(false);
        setIsValidating(false);
        return;
      }

      // Clear any previous validation errors
      setValidationErrors({});
      
      // Proceed with registration
      const response = await authenticatedFetch('/api/developers/test-registration/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminForm),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentStep('success');
        onRegistrationSuccess?.('admin', { ...adminForm, message: result.message });
      } else {
        const error = await response.json();
        setValidationErrors({ 
          general: error.error || 'Registration failed' 
        });
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      setValidationErrors({ 
        general: 'Registration failed. Please try again.' 
      });
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  };


  // Feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authenticatedFetch('/api/developers/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          <h2>Test Mode turned ON</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>


        <div className="popup-content">
          {currentStep === 'role-selection' && (
            <div className="role-selection">
              <p className="role-description">
                Welcome! Please select your role for registration.
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
                  <p>Register as a student to test the document request and tracking system</p>
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
                
                <div 
                  className="role-card"
                  onClick={() => {
                    setUserRole('feedback');
                    setCurrentStep('feedback-form');
                  }}
                >
                  <div className="role-icon">💬</div>
                  <h3>Feedback</h3>
                  <p>Submit feedback about the test experience</p>
                </div>
                
                <div 
                  className="role-card guide-card"
                  onClick={() => {
                    setCurrentStep('guide');
                  }}
                >
                  <div className="role-icon">📖</div>
                  <h3>View Guide</h3>
                  <p>Comprehensive walkthrough of the system for users and administrators</p>
                </div>
              </div>
            </div>
          )}


          {currentStep === 'guide' && (
            <div className="guide-section">
              <h3>📖 System Walkthrough Guide</h3>
              <p className="guide-description">
                Complete guide to understanding and using the Online Document Request system
              </p>
              
              <div className="guide-tabs">
                <div className="tab-navigation">
                  <button 
                    className={`tab-btn ${guideActiveTab === 'user' ? 'active' : ''}`}
                    onClick={() => setGuideActiveTab('user')}
                  >
                    👨‍🎓 User Guide
                  </button>
                  <button 
                    className={`tab-btn ${guideActiveTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setGuideActiveTab('admin')}
                  >
                    👨‍💼 Admin Guide
                  </button>
                  <button 
                    className={`tab-btn ${guideActiveTab === 'system' ? 'active' : ''}`}
                    onClick={() => setGuideActiveTab('system')}
                  >
                    ℹ️ System Info
                  </button>
                </div>

                <div className="tab-content">
                  {guideActiveTab === 'user' && (
                    <div className="guide-content">
                      <h4>🎯 User Walkthrough</h4>
                      
                      <div className="guide-steps">
                        <div className="guide-step">
                          <h5>1. Student Registration (FOR TESTING)</h5>
                          <p><strong>What:</strong> Create your student account in the system</p>
                          <p><strong>How:</strong> Fill out the registration form with your student ID, personal details, and college information</p>
                          <p><strong>Important:</strong> Ensure your WhatsApp number is active for OTP verification</p>
                        </div>

                        <div className="guide-step">
                          <h5>2. OTP Verification</h5>
                          <p><strong>What:</strong> Secure authentication via WhatsApp</p>
                          <p><strong>How:</strong> Receive OTP code on WhatsApp and enter it in the verification field</p>
                          <p><strong>Note:</strong> Make sure WhatsApp is installed and active on your registered number</p>
                        </div>

                        <div className="guide-step">
                          <h5>3. Complete Document Request Process</h5>
                          <p><strong>Step-by-Step Implementation Flow:</strong></p>
                          <p><strong>Step 1:</strong> Log in to your student account with verified OTP from WhatsApp</p>
                          <p><strong>Step 2:</strong> Upload authorization letter if requesting for someone else</p>
                          <p><strong>Step 3:</strong> System checks for any active/pending requests automatically</p>
                          <p><strong>Step 4:</strong> If no active requests, proceed to "Select Documents" section</p>
                          <p><strong>Step 5:</strong> Browse through available document types with descriptions and fees</p>
                          <p><strong>Step 6:</strong> Select documents by clicking the document</p>
                          <p><strong>Step 7:</strong> Review your selected documents in the request list</p>
                          <p><strong>Step 8:</strong> Set quantities for each document type (default: 1, max: 100)</p>
                          <p><strong>Step 9:</strong> System calculates total cost including admin fees automatically</p>
                          <p><strong>Step 10:</strong> Upload requirements: Files needed for each selected document</p>
                          <p><strong>Step 11:</strong> Choose preferred contact method (SMS, WhatsApp, Email)</p>
                          <p><strong>Step 12:</strong> Review complete summary: documents, costs, requirements, contact info</p>
                          <p><strong>Step 13:</strong> For immediate payment documents: proceed to Maya payment gateway</p>
                          <p><strong>Step 14:</strong> Complete payment using test card (4123450131001381) or mobile (639900100900)</p>
                          <p><strong>Step 15:</strong> Wait for payment confirmation and return to system</p>
                          <p><strong>Step 16:</strong> Submit final request with all data integrated</p>
                          <p><strong>Step 17:</strong> Receive unique tracking ID </p>
                          <p><strong>Step 18:</strong> Get confirmation with tracking ID and next steps</p>
                          <p><strong>Step 19:</strong> Redirect to tracking page or completion screen</p>
                          <p><strong>Step 20:</strong> Save tracking ID and wait for WhatsApp status updates</p>
                          <p><strong>Important:</strong> Session data is automatically saved at each step for security</p>
                        </div>

                        <div className="guide-step">
                          <h5>4. Payment Processing</h5>
                          <p><strong>What:</strong> Secure payment through Maya payment gateway</p>
                          <p><strong>How:</strong> Complete payment using various payment methods (cards, e-wallets, bank transfer)</p>
                          <p><strong>Security:</strong> All payments are processed securely through encrypted connections</p>
                          
                          <div className="test-payment-info">
                            <h6>🧪 Testing Payment (Development Only)</h6>
                            <p><strong>Credit Card Testing:</strong></p>
                            <p>• Card Number: 4123450131001381</p>
                            <p>• Expiry: 12/30 | CVV: 123 | password: mctest1</p>
                            <p><strong>Mobile Number Testing:</strong></p>
                            <p>• Success Test: 639900100900 / Password@1 / OTP: 123456</p>
                            <p>• Failed Test: 639900100916 / Password@1 / OTP: 123456</p>
                          </div>
                        </div>

                        <div className="guide-step">
                          <h5>5. Request Tracking & Status Updates</h5>
                          <p><strong>Complete Tracking Implementation Flow:</strong></p>
                          <p><strong>Step 1:</strong> After submitting request, receive unique tracking ID </p>
                          <p><strong>Step 2:</strong> Navigate to tracking page and enter tracking number</p>
                          <p><strong>Step 3:</strong> If not authenticated, receive WhatsApp OTP for verification</p>
                          <p><strong>Step 4:</strong> System validates tracking number and retrieves request data</p>
                          <p><strong>Step 5:</strong> View comprehensive tracking information including status, costs, documents (x)</p>
                          
                          <p><strong>Complete Status Flow with Actions:</strong></p>
                          <p>🔄 <strong>PENDING:</strong> Request submitted, awaiting admin review and payment confirmation</p>
                          <p>⏳ <strong>IN PROGRESS:</strong> Admin is processing your request, preparing documents</p>
                          <p>📋 <strong>DOC READY:</strong> Documents completed, ready for release/pickup</p>
                          <p>❌ <strong>CHANGES:</strong> Issues found, can upload corrected files and resubmit</p>
                          <p>✅ <strong>RELEASED:</strong> Documents delivered via LBC or ready for pickup</p>
                          
                          <p><strong>Additional Tracking Features:</strong></p>
                          <p>📋 <strong>Document Details:</strong> View all requested documents with quantities and costs</p>
                          <p>📁 <strong>Change Requests:</strong> See admin feedback and required file corrections</p>
                          <p>📤 <strong>File Upload:</strong> Upload corrected files for rejected requests (PDF, JPG, PNG only)</p>
                          <p>🚚 <strong>Order Type:</strong> Choose pickup or delivery method</p>
                          <p>💳 <strong>Payment Tracking:</strong> Monitor payment status and outstanding amounts</p>
                          
                          <p><strong>Step 6:</strong> Set delivery preference (pickup or LBC delivery)</p>
                          <p><strong>Step 7:</strong> For Need Changes requests: upload required files and auto-resubmit</p>
                          <p><strong>Step 8:</strong> Receive WhatsApp notifications for all status changes</p>
                          <p><strong>Step 10:</strong> Save tracking ID and monitor until completion</p>
                          
                          <p><strong>Important:</strong> JWT authentication maintained for security; files auto-uploaded to cloud storage</p>
                        </div>

                        <div className="guide-step">
                          <h5>6. Document Collection & Delivery</h5>
                          <p><strong>Step-by-Step Collection Process:</strong></p>
                          <p><strong>Step 1:</strong> Wait for "Doc Ready" status notification via WhatsApp</p>
                          <p><strong>Step 2:</strong> Log in to your dashboard and check request details</p>
                          
                          <p><strong>Delivery Options:</strong></p>
                          <p>📦 <strong>LBC Delivery:</strong> Provide complete delivery address and contact details (X)</p>
                          <p>🏢 <strong>Pickup:</strong> Visit registrar office during operating hours</p>
                          
                          <p><strong>Step 3:</strong> For LBC delivery, confirm shipping address and pay delivery fee (X)</p>
                          <p><strong>Step 4:</strong> For pickup, note office hours and bring valid ID</p>
                          <p><strong>Step 5:</strong> Track delivery status through provided LBC tracking number</p>
                          
                          <p><strong>Important:</strong> Keep delivery receipts and reference numbers for follow-up</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideActiveTab === 'admin' && (
                    <div className="guide-content">
                      <h4>🛠️ Administrator Walkthrough</h4>
                      
                      <div className="guide-steps">
                        <div className="guide-step">
                          <h5>1. Admin Authentication</h5>
                          <p><strong>Login:</strong> Use Google OAuth</p>
                          <p><strong>Access:</strong> Admin panel at /admin/login</p>
                          <p><strong>Security:</strong> Domain-restricted access for authorized personnel only </p>
                        </div>

                        <div className="guide-step">
                          <h5>2. Dashboard Overview</h5>
                          <p><strong>Statistics:</strong> View total requests, pending tasks, unpaid amounts</p>
                          <p><strong>Notifications:</strong> Real-time alerts for new requests and system events</p>
                          <p><strong>Trends:</strong> Performance analytics and comparison with previous periods</p>
                        </div>

                        <div className="guide-step">
                          <h5>3. Request Management</h5>
                          <p><strong>View Requests:</strong> See all student requests with filtering and search</p>
                          <p><strong>Assign Tasks:</strong> Manual or automatic assignment to admin staff</p>
                          <p><strong>Status Updates:</strong> Change request status through the workflow</p>
                          <p><strong>Communication:</strong> Update students via WhatsApp notifications</p>
                        </div>

                        <div className="guide-step">
                          <h5>4. Document Management</h5>
                          <p><strong>Create Documents:</strong> Add new document types with requirements and fees</p>
                          <p><strong>Manage Requirements:</strong> Set up document requirements and templates</p>
                          <p><strong>Edit/Delete:</strong> Update document information or remove unused documents</p>
                        </div>

                        <div className="guide-step">
                          <h5>5. User Management</h5>
                          <p><strong>Admin Accounts:</strong> Create and manage admin user accounts</p>
                          <p><strong>Role Assignment:</strong> Set roles (staff, auditor, manager, admin)</p>
                          <p><strong>Permissions:</strong> Control access levels and system capabilities</p>
                        </div>

                        <div className="guide-step">
                          <h5>6. System Settings</h5>
                          <p><strong>Operating Hours:</strong> Set allowed request times and days</p>
                          <p><strong>Fees Management:</strong> Configure admin fees and document costs</p>
                          <p><strong>Date Restrictions:</strong> Block specific dates for maintenance or holidays</p>
                        </div>

                        <div className="guide-step">
                          <h5>7. Transaction Monitoring</h5>
                          <p><strong>Financial Reports:</strong> Track payments and revenue</p>
                          <p><strong>Payment History:</strong> Monitor all transaction records</p>
                          <p><strong>Analytics:</strong> Financial performance and reporting</p>
                        </div>

                        <div className="guide-step">
                          <h5>8. Activity Logging</h5>
                          <p><strong>Audit Trail:</strong> Complete log of all administrative actions</p>
                          <p><strong>Monitoring:</strong> Track system activities and admin behavior</p>
                          <p><strong>Compliance:</strong> Maintain records for regulatory requirements</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideActiveTab === 'system' && (
                    <div className="guide-content">
                      <h4>ℹ️ System Information</h4>
                      
                      <div className="guide-steps">
                        <div className="guide-step">
                          <h5>What is ODR?</h5>
                          <p><strong>Online Document Request System</strong> - A comprehensive web-based platform that digitizes the academic document request process for educational institutions.</p>
                          <p><strong>Purpose:</strong> Streamline communication between students and registrar staff while providing transparent, efficient document processing.</p>
                        </div>

                        <div className="guide-step">
                          <h5>Key Benefits</h5>
                          <p>✅ <strong>Digitized Process:</strong> No more paper forms and manual tracking</p>
                          <p>✅ <strong>Real-time Tracking:</strong> Live status updates and notifications</p>
                          <p>✅ <strong>Secure Payments:</strong> Integrated payment processing with multiple options</p>
                          <p>✅ <strong>Mobile Responsive:</strong> Works seamlessly on all devices</p>
                          <p>✅ <strong>Comprehensive Admin Tools:</strong> Complete management dashboard</p>
                        </div>

                        <div className="guide-step">
                          <h5>User Roles</h5>
                          <p><strong>Students/External Requesters:</strong> Can register, request documents, make payments, and track status</p>
                          <p><strong>Administrators:</strong> Can manage requests, documents, users, and system settings</p>
                          <p><strong>System Roles:</strong> Staff, Auditor, Manager, Admin with different permission levels</p>
                        </div>

                        <div className="guide-step">
                          <h5>Technology Stack</h5>
                          <p><strong>Frontend:</strong> React with modern hooks and Tailwind CSS</p>
                          <p><strong>Backend:</strong> Python Flask with RESTful API architecture</p>
                          <p><strong>Database:</strong> PostgreSQL with optimized performance</p>
                          <p><strong>Integrations:</strong> Google OAuth, WhatsApp API, Maya Payments, Supabase Storage</p>
                        </div>

                        <div className="guide-step">
                          <h5>Security Features</h5>
                          <p>🔒 <strong>JWT Authentication:</strong> Secure, stateless session management</p>
                          <p>🔒 <strong>CSRF Protection:</strong> Cross-site request forgery prevention</p>
                          <p>🔒 <strong>Domain Restrictions:</strong> Admin access limited to authorized domains</p>
                          <p>🔒 <strong>Audit Logging:</strong> Complete activity tracking for compliance</p>
                        </div>

                        <div className="guide-step">
                          <h5>Support & Contact</h5>
                          <p><strong>System Issues:</strong> Contact your system administrator</p>
                          <p><strong>Technical Support:</strong> Submit feedback through the test mode</p>
                          <p><strong>Documentation:</strong> Refer to admin documentation for detailed guides</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setCurrentStep('role-selection')}
                >
                  ← Back to Options
                </button>
              </div>
            </div>
          )}

          {currentStep === 'student-form' && (
            <div className="form-section">
              <h3>Student Registration</h3>
              
              <div className="student-form-instructions">
                <div className="instruction-note">
                  <div className="note-icon">⚠️</div>
                  <div className="note-content">
                    <h4>Important: WhatsApp Requirement</h4>
                    <p>The OTP code will be sent as a "Reference Number" to your WhatsApp. Make sure you have WhatsApp installed and active on the provided number.</p>
                  </div>
                </div>
              </div>
              

              <form onSubmit={handleStudentSubmit} className="registration-form">
                {validationErrors.general && (
                  <div className="validation-error general-error">
                    ⚠️ {validationErrors.general}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Student ID *</label>
                  <input
                    type="text"
                    value={studentForm.student_id}
                    onChange={(e) => handleInputChange('student', 'student_id', e.target.value)}
                    placeholder="e.g., 2025-1011"
                    required
                  />
                  {validationErrors.student_id && (
                    <span className="field-error">{validationErrors.student_id}</span>
                  )}
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
                    {validationErrors.firstname && (
                      <span className="field-error">{validationErrors.firstname}</span>
                    )}
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
                    {validationErrors.lastname && (
                      <span className="field-error">{validationErrors.lastname}</span>
                    )}
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
                  {validationErrors.contact_number && (
                    <span className="field-error">{validationErrors.contact_number}</span>
                  )}
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
                  {validationErrors.email && (
                    <span className="field-error">{validationErrors.email}</span>
                  )}
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
                  {validationErrors.college_code && (
                    <span className="field-error">{validationErrors.college_code}</span>
                  )}
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
                {validationErrors.general && (
                  <div className="validation-error general-error">
                    ⚠️ {validationErrors.general}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => handleInputChange('admin', 'email', e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                  {validationErrors.email && (
                    <span className="field-error">{validationErrors.email}</span>
                  )}
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
                  </select>
                  {validationErrors.role && (
                    <span className="field-error">{validationErrors.role}</span>
                  )}
                </div>
                
                <div className="admin-info">
                  <p><strong>Note:</strong> For Admin Login, https://registrar-odr.onrender.com/admin/login</p>
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
              <button 
                className="btn-primary" 
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          )}

          {currentStep === 'feedback-form' && !feedbackSubmitted && (
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
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setCurrentStep('role-selection')}
                  >
                    Back
                  </button>
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
