import React from 'react';
import { useNavigate } from 'react-router-dom';
import bgImage from "./assets/Motif.png";
import logo from "./assets/MSUIITLogo.png";
import myIITLogo from "./assets/myiit.gif";

const AdminWaiting = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear any session data if needed
        navigate('/admin/login');
    };

    return (
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
                                <h1 className="text-5xl font-bold mb-0">Account</h1>
                                <h1 className="text-5xl font-bold mb-0">Pending</h1>
                            </div>
                            <p className="text-lg text-white/90 max-w-md leading-relaxed mt-6">
                                Your account is being reviewed. Please wait for an admin to assign you a role.
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
                                <h2 className="text-3xl font-bold text-gray-900">Waiting for Approval</h2>
                                <p className="text-gray-600">
                                    Your account has been created but requires admin approval to assign a role.
                                </p>
                            </div>

                            <div className="text-center space-y-4">
                                <p className="text-sm text-gray-500">
                                    Please contact an administrator if you need assistance or have questions.
                                </p>
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminWaiting;
