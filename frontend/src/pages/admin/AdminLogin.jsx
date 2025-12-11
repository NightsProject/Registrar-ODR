import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import bgImage from "./assets/Motif.png";
import logo from "./assets/MSUIITLogo.png";
import myIITLogo from "./assets/myiit.gif"; 

function AdminLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  const onSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    const idToken = credentialResponse.credential;

    try {
      const response = await fetch("/api/admin/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: idToken }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.redirect) {
          navigate(data.redirect);
        } else {
          navigate("/admin/dashboard");
        }
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const onFailure = (res) => {
    console.error("Google login failed:", res);
    setError("Google login failed. Please try again.");
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-primary)" }}>
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[600px]">
            <div
              className="flex-1 relative bg-cover bg-center p-12 flex flex-col justify-between text-white"
              style={{
                backgroundImage: `url(${bgImage})`,
              }}
            >
              <div className="flex-1 flex flex-col justify-center mt-12">
                <div className="leading-tight space-y-2">
                  <h1 className="text-5xl font-bold mb-0">Hello,</h1>
                  <h1 className="text-5xl font-bold mb-0">Welcome!</h1>
                </div>
                <p className="text-lg text-white/90 max-w-md leading-relaxed mt-6">
                  Manage document requests, maintain official documents, and track activity logs securely and efficiently.
                </p>
              </div>

              <div className="mt-8">
                <div className="inline-flex items-center gap-2">
                  <img src={logo} alt="IIT Logo" className="w-20 h-20 object-contain" />
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-base text-yellow-400">Online</span>
                    <span className="font-bold text-base">Document</span>
                    <span className="font-bold text-base">Request</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white p-12 flex flex-col justify-center">
              <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
                  <p className="text-gray-600">
                    Sign in with your myIIT account to continue
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Custom myIIT Login Button*/}
                <div className="flex flex-col items-center">
                  <div className="w-full relative">
                    <button
                      onClick={() => {
                        // Trigger the hidden Google button
                        document.getElementById('google-login-button')?.querySelector('div[role="button"]')?.click();
                      }}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B81D23'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="font-semibold text-base text-gray-700" style={{ fontFamily: "'Inter', sans-serif" }}>Signing in...</span>
                        </>
                      ) : (
                        <>
                          
                          <span className="font-semibold text-base text-gray-700" style={{ fontFamily: "'Inter', sans-serif" }}>Continue with</span>
                          <img src={myIITLogo} alt="myIIT" className="w-15 h-15 object-contain" />
                        </>
                      )}
                    </button>

                    <div id="google-login-button" className="absolute opacity-0 pointer-events-none">
                      <GoogleLogin onSuccess={onSuccess} onError={onFailure} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-6 mb-6">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Secure authentication with Google</span>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default AdminLogin;