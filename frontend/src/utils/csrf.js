export function getCSRFToken() {
  const match = document.cookie.match(new RegExp('(^| )csrf_access_token=([^;]+)'));
  if (match) return match[2];
  return null;
}

// Helper function to make authenticated requests with CSRF token
export async function authenticatedFetch(url, options = {}) {
  const csrfToken = getCSRFToken();
  
  const config = {
    credentials: 'include', // Include cookies for session
    headers: {
      ...options.headers,
    },
    ...options,
  };

  config.headers['X-CSRFToken'] = csrfToken;
  
  const response = await fetch(url, config);
  
  // Return response with status for error handling
  return response;
}
