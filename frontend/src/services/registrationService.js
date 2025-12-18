import { getCSRFToken } from '../utils/csrf';

// Test Mode Settings API
export const testModeService = {
  getTestMode: async () => {
    const response = await getCSRFToken('/api/developers/test-mode', {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  updateTestMode: async (testMode) => {
    const response = await getCSRFToken('/api/developers/test-mode', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test_mode: testMode }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// Student Registration API
export const studentRegistrationService = {
  registerStudent: async (studentData) => {
    const response = await getCSRFToken('/api/developers/test-registration/student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register student');
    }
    
    return response.json();
  },

  getStudent: async (studentId) => {
    const response = await getCSRFToken(`/api/developers/test-registration/student/${studentId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// Admin Registration API
export const adminRegistrationService = {
  registerAdmin: async (adminData) => {
    const response = await getCSRFToken('/api/developers/test-registration/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register admin');
    }
    
    return response.json();
  },

  getAdmin: async (email) => {
    const response = await getCSRFToken(`/api/developers/test-registration/admin/${email}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// Feedback API
export const feedbackService = {
  submitFeedback: async (feedbackData) => {
    const response = await fetch('/api/developers/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit feedback');
    }
    
    return response.json();
  },

  getFeedback: async () => {
    const response = await getCSRFToken('/api/developers/feedback', {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  updateFeedbackStatus: async (feedbackId, status) => {
    const response = await getCSRFToken(`/api/developers/feedback/${feedbackId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update feedback status');
    }
    
    return response.json();
  },

  deleteFeedback: async (feedbackId) => {
    const response = await getCSRFToken(`/api/developers/feedback/${feedbackId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete feedback');
    }
    
    return response.json();
  },
};

// Validation utilities
export const validationService = {
  validateStudentData: (data) => {
    const errors = {};
    
    if (!data.student_id || data.student_id.trim() === '') {
      errors.student_id = 'Student ID is required';
    }
    
    if (!data.firstname || data.firstname.trim() === '') {
      errors.firstname = 'First name is required';
    }
    
    if (!data.lastname || data.lastname.trim() === '') {
      errors.lastname = 'Last name is required';
    }
    
    if (!data.contact_number || data.contact_number.trim() === '') {
      errors.contact_number = 'Contact number is required';
    } else {
      const phonePattern = /^639\d{9}$/;
      if (!phonePattern.test(data.contact_number)) {
        errors.contact_number = 'Contact number must be in format 639xxxxxxxxx';
      }
    }
    
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(data.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    if (!data.college_code || data.college_code.trim() === '') {
      errors.college_code = 'College code is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  validateAdminData: (data) => {
    const errors = {};
    
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(data.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    if (!data.role || data.role.trim() === '') {
      errors.role = 'Role is required';
    } else {
      const validRoles = ['admin', 'manager', 'auditor', 'staff', 'developer'];
      if (!validRoles.includes(data.role)) {
        errors.role = 'Invalid role selected';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  validateFeedbackData: (data) => {
    const errors = {};
    
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(data.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    if (!data.feedback_type || data.feedback_type.trim() === '') {
      errors.feedback_type = 'Feedback type is required';
    } else {
      const validTypes = ['Bug Report', 'Feature Request', 'General Feedback'];
      if (!validTypes.includes(data.feedback_type)) {
        errors.feedback_type = 'Invalid feedback type';
      }
    }
    
    if (!data.description || data.description.trim() === '') {
      errors.description = 'Description is required';
    }
    
    if (data.feedback_type === 'Bug Report') {
      if (!data.steps_to_reproduce || data.steps_to_reproduce.trim() === '') {
        errors.steps_to_reproduce = 'Steps to reproduce are required for bug reports';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};

