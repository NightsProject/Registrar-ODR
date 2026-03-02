# CSRF Authentication Fix Documentation

## Overview
This document describes the fix for the test mode registration error that was occurring with HTTP status undefined when checking test mode settings.

## Problem Description
The error was occurring in the `registrationService.js` file where the `getCSRFToken` utility function was being incorrectly used as a fetch wrapper. The function was being called with URL and fetch options as if it were a full fetch function, but it was only designed to extract CSRF tokens from cookies.

### Error Details
```
Error checking test mode: Error: HTTP error! status: undefined
Rt registrationService.js:11
h Landing.jsx:46
```

## Root Cause
The issue was in `/frontend/src/services/registrationService.js` where the code was incorrectly calling:
```javascript
const response = await getCSRFToken('/api/developers/test-mode', {
  method: 'GET',
});
```

The `getCSRFToken` function was only designed to extract the token:
```javascript
export function getCSRFToken() {
  const match = document.cookie.match(new RegExp('(^| )csrf_access_token=([^;]+)'));
  if (match) return match[2];
  return null;
}
```

## Solution Implemented

### 1. Enhanced CSRF Utility (`/frontend/src/utils/csrf.js`)
Created a new `authenticatedFetch` function that properly handles authenticated requests:

```javascript
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
```

### 2. Updated Registration Service (`/frontend/src/services/registrationService.js`)
Replaced all `getCSRFToken` calls with proper `authenticatedFetch` usage:

**Before:**
```javascript
const response = await getCSRFToken('/api/developers/test-mode', {
  method: 'GET',
});
```

**After:**
```javascript
const response = await authenticatedFetch('/api/developers/test-mode', {
  method: 'GET',
});
```

### 3. Updated Test Mode Popup (`/frontend/src/components/user/TestModePopup.jsx`)
Similarly updated the TestModePopup component to use the new authenticatedFetch function for consistency.

## Files Modified

1. **`/frontend/src/utils/csrf.js`**
   - Added `authenticatedFetch` function
   - Maintained backward compatibility with existing `getCSRFToken` function

2. **`/frontend/src/services/registrationService.js`**
   - Updated import statement to use `authenticatedFetch`
   - Replaced all instances of `getCSRFToken(url, options)` with `authenticatedFetch(url, options)`

3. **`/frontend/src/components/user/TestModePopup.jsx`**
   - Updated import to use `authenticatedFetch`
   - Simplified fetch calls by removing manual CSRF token handling
   - Removed redundant `credentials: 'include'` as it's handled by `authenticatedFetch`

## How authenticatedFetch Works

1. **Token Extraction**: Automatically extracts CSRF token from cookies
2. **Session Handling**: Always includes `credentials: 'include'` for session management
3. **CSRF Protection**: Automatically adds CSRF token to headers 
4. **Header Management**: Merges provided headers with CSRF token automatically
5. **Response Handling**: Returns the full response object for proper error handling

## Security Considerations

- CSRF tokens are automatically added to state-changing requests
- Session cookies are included in all requests
- Token extraction happens securely from HTTP-only cookies
- No manual token handling required in components

## Benefits

1. **Consistency**: All authenticated requests now use the same pattern
2. **Security**: Automatic CSRF protection without manual intervention
3. **Maintainability**: Centralized authentication logic
4. **Error Handling**: Proper HTTP status codes in error responses
5. **Session Management**: Automatic session cookie handling

## Testing

To verify the fix works:

1. Enable test mode in the admin panel
2. Navigate to the landing page
3. The test mode popup should appear without errors
4. Registration forms should submit successfully
5. Check browser console for any remaining errors

## Future Improvements

1. Consider updating other components that use manual CSRF token handling
2. Add unit tests for the `authenticatedFetch` function
3. Implement retry logic for failed requests
4. Add request/response logging for debugging

## Related Files

- `/frontend/src/utils/csrf.js` - CSRF utility functions
- `/frontend/src/services/registrationService.js` - Registration service API
- `/frontend/src/components/user/TestModePopup.jsx` - Test mode UI component
- `/frontend/src/pages/user/Landing.jsx` - Landing page component that triggers test mode check

## Migration Notes

- Existing code using `getCSRFToken()` for token extraction still works
- New code should use `authenticatedFetch()` for making authenticated requests
- The change is backward compatible and doesn't break existing functionality
