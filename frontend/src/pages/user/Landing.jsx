import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ButtonLink from "../../components/common/ButtonLink";
import ContentBox from "../../components/user/ContentBox";
import "../../components/common/index.css";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState(null);

  const handleRequestClick = async () => {
    try {
      const response = await fetch('/api/check-request-allowed', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.allowed) {
          navigate("/user/login");
        } else {
          // Fetch settings to display in modal
          fetchSettings();
          setShowModal(true);
        }
      } else {
        // Fetch settings to display in modal
        fetchSettings();
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking request allowed:', error);
      // Fetch settings to display in modal
      fetchSettings();
      setShowModal(true);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="landing-container">
      <div className="page-label">MSU-IIT</div>
      <h1 className="page-title">Online Document Request</h1>

      <div className="cards-wrapper">
        <ContentBox className="card" onClick={() => navigate("/user/track")}>
          <img src="/assets/TruckIcon.svg" alt="" />
          <div className="text-section">
            <div className="title-section">
              <h3 className="cards-title">Track</h3>
              <h3 className="cards-title">Request</h3>
            </div>
            <p className="subtext">Track your document’s progress with your tracking number and ID.</p>
          </div>
          <ButtonLink 
            to="/user/track" 
            placeholder="Track"
            className="btn"
          />
        </ContentBox>

        <ContentBox className="card">
          <img src="/assets/FolderPlusIcon.svg" alt="" />
          <div className="text-section">
            <div className="title-section">
              <h3 className="cards-title">Request</h3>
              <h3 className="cards-title">Document</h3>
            </div>
            <p className="subtext">Request your transcript or other official documents.</p>
          </div>
          <ButtonLink
            onClick={handleRequestClick}
            placeholder="Request"
            className="btn"
          />
        </ContentBox>

        <ContentBox className="card" onClick={() => navigate("/user/documents")}>
          <img src="/assets/FileTextIcon.svg" alt="" />
          <div className="text-section">
            <div className="title-section">
              <h3 className="cards-title">View</h3>
              <h3 className="cards-title">Documents</h3>
            </div>
            <p className="subtext">See available documents and their requirements before making a request.</p>
          </div>
            <ButtonLink 
            to="/user/documents" 
            placeholder="View"
            className="btn"
          />
        </ContentBox>
      </div>

      <div className="announcement-container">
        <div className="announcement-title">Announcement:</div>
        <div className="announcement-content">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Request Not Allowed</h2>
            <p>Requests are not allowed at this time.</p>
            {settings && (
              <div className="settings-info">
                <p><strong>Available Hours:</strong> {formatTime(settings.start_time)} - {formatTime(settings.end_time)}</p>
                <p><strong>Available Days:</strong> {settings.available_days.join(', ')}</p>
              </div>
            )}
            <button onClick={() => setShowModal(false)} className="modal-close-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


export default Landing;