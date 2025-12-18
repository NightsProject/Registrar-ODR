import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminWaiting from "./pages/admin/AdminWaiting";
import Index from "./pages/Index";
import Landing from "./pages/user/Landing";
import UserMasterLayout from "./pages/layouts/UserMasterLayout";
import LoginFlow from "./pages/user/login/LoginFlow";
import Tracking from "./pages/user/tracking/TrackingFlow";
import DocumentList from "./pages/user/DocumentList";
import RegistrarMasterLayout from "./pages/layouts/RegistrarMasterLayout";
import Dashboard from "./pages/admin/Dashboard";
import Documents from "./pages/admin/Documents/Documents";
import Requests from "./pages/admin/manage_request/Requests";
import AssignRequests from "./pages/admin/manage_request/AssignRequests";
import Logs from "./pages/admin/Logs";
import Transactions from "./pages/admin/transactions/Transactions";
import Settings from "./pages/admin/Settings";
import RequestFlow from "./pages/user/request/RequestFlow";
import RequestViewPage_Flow from "./pages/admin/manage_request/RequestViewPage_Flow";
import ProtectedRoute, { AccessDenied } from "./components/admin/ProtectedRoute";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <Routes>
          <Route path="/" element={<Navigate to="user/Landing" replace />} />

          {/* User routes with redirect and layout */}
          <Route path="/user" element={<UserMasterLayout />}>
            <Route index element={<Navigate to="Landing" replace />} />
            <Route path="Landing" element={<Landing />} />
            <Route path="login" element={<LoginFlow />} />
            <Route path="Request" element={<RequestFlow />} />
            <Route path="documents" element={<DocumentList />} />
            <Route path="Track" element={<Tracking />} />
          </Route>
          



          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/waiting" element={<AdminWaiting />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <RegistrarMasterLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard - Accessible to all authenticated users */}
            <Route path="Dashboard" element={
              <ProtectedRoute requiredPermissions={['dashboard']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Requests Management - Accessible to manager, admin, staff */}
            <Route path="Requests" element={
              <ProtectedRoute requiredPermissions={['requests']}>
                <Requests />
              </ProtectedRoute>
            } />
            

            {/* Request Details - Accessible via transactions or requests permission */}
            <Route path="Requests/:requestId" element={
              <ProtectedRoute requiredPermissions={['requests', 'view_request_details']}>
                <RequestViewPage_Flow />
              </ProtectedRoute>
            } />
            
            {/* Assign Requests - Accessible to manager, admin, staff */}
            <Route path="AssignRequests" element={
              <ProtectedRoute requiredPermissions={['requests']}>
                <AssignRequests />
              </ProtectedRoute>
            } />
            
            {/* Documents - Accessible to manager, admin, staff */}
            <Route path="Document" element={
              <ProtectedRoute requiredPermissions={['documents']}>
                <Documents />
              </ProtectedRoute>
            } />
            
            {/* Transactions - Admin and staff only */}
            <Route path="Transactions" element={
              <ProtectedRoute requiredPermissions={['transactions']}>
                <Transactions />
              </ProtectedRoute>
            } />
            
            {/* Logs - Admin only */}
            <Route path="Logs" element={
              <ProtectedRoute requiredPermissions={['logs']}>
                <Logs />
              </ProtectedRoute>
            } />
            
            {/* Settings - Admin only */}
            <Route path="settings" element={
              <ProtectedRoute requiredPermissions={['settings']}>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
