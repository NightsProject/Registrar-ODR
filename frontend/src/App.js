import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/admin/AdminLogin";
import Index from "./pages/Index";
import Landing from "./pages/user/Landing";
import UserMasterLayout from "./pages/layouts/UserMasterLayout";
import LoginFlow from "./pages/user/login/LoginFlow";
import Tracking from "./pages/user/tracking/TrackingFlow";
import DocumentList from "./pages/user/DocumentList";
import RegistrarMasterLayout from "./pages/layouts/RegistrarMasterLayout";
import Dashboard from "./pages/admin/Dashboard";
import Documents from "./pages/admin/Documents/Documents";
import Requests from "./pages/admin/Requests";
import Logs from "./pages/admin/Logs";
import RequestFlow from "./pages/user/request/RequestFlow";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={< Index />} />

        <Route path="/user" element={<UserMasterLayout />}>
          <Route path="Landing" element={< Landing />} />
          <Route path="login" element={< LoginFlow />}/>
          <Route path="Request" element={< RequestFlow />} />
          <Route path="documents" element={< DocumentList />} />
          <Route path="Track" element={< Tracking />} />
        </Route>
        
        <Route path="/admin/login" element={< AdminLogin />} />
        <Route path="/admin" element={<RegistrarMasterLayout />}>
          <Route path="Dashboard" element={<Dashboard />} />
          <Route path="Requests" element={<Requests />} />
          <Route path ="Document" element = {<Documents />} />
          <Route path ="Logs" element = {<Logs />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

// Todo: protect the routes through role in jwt token except for the login and landing pages
export default App;
