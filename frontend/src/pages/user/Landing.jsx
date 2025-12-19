


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ButtonLink from "../../components/common/ButtonLink";
import ContentBox from "../../components/user/ContentBox";
import TestModePopup from "../../components/user/TestModePopup";
import { testModeService } from "../../services/registrationService";
import "../../components/common/index.css";
import "./Landing.css";


function Landing() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showTestModePopup, setShowTestModePopup] = useState(false);

  const [settings, setSettings] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [dateInfo, setDateInfo] = useState(null);

  useEffect(() => {
    fetchAnnouncement();
    checkTestMode();
  }, []);


  const fetchAnnouncement = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAnnouncement(data.announcement || '');
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    }
  };


  const checkTestMode = async () => {
    try {
      const data = await testModeService.getTestMode();
      if (data.test_mode) {
        setShowTestModePopup(true);
      }
    } catch (error) {
      console.error('Error checking test mode:', error);
    }
  };


  const handleRequestClick = async () => {
    try {
      const response = await fetch('/api/public/request-status', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.allowed) {
          navigate("/user/login");

        } else {
          // Use settings and date info from response or fetch if needed
          if (data.settings) {
            setSettings(data.settings);
            setDateInfo(data.date_info || null);
            setShowModal(true);
          } else {
            // Fallback to fetching settings if not in response
            fetchSettings();
            setShowModal(true);
          }
        }
      } else {
        // Fetch settings to display in modal on error
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
        {announcement || "No announcement at this time."}
        </div>
      </div>



      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Request Not Allowed</h2>
            <p>Requests are not allowed at this time.</p>
            
            {/* Date-specific restriction info */}
            {dateInfo && dateInfo.has_today_restriction && (
              <div className="date-restriction-info" style={{
                backgroundColor: dateInfo.today_available ? '#d4edda' : '#f8d7da',
                color: dateInfo.today_available ? '#155724' : '#721c24',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '10px',
                border: `1px solid ${dateInfo.today_available ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                <p><strong>Today's Date ({dateInfo.today}):</strong></p>
                <p>This date is specifically marked as {dateInfo.today_available ? 'AVAILABLE' : 'UNAVAILABLE'} for requests.</p>
              </div>
            )}
            
            {/* Standard time/day restrictions */}
            {settings && (
              <div className="settings-info">

                <p><strong>Available Hours:</strong> {formatTime(settings.start_time)} - {formatTime(settings.end_time)}</p>
                <p><strong>Available Days:</strong> {settings.available_days.join(', ')}</p>
              </div>
            )}
            
            {/* Upcoming restrictions info */}
            {dateInfo && dateInfo.upcoming_restrictions && dateInfo.upcoming_restrictions.length > 0 && (
              <div className="upcoming-restrictions" style={{ marginTop: '15px' }}>
                <p><strong>Upcoming Date Restrictions:</strong></p>
                <ul style={{ maxHeight: '100px', overflowY: 'auto', paddingLeft: '20px' }}>
                  {dateInfo.upcoming_restrictions.map((restriction, index) => (
                    <li key={index}>
                      {restriction.date}: {restriction.is_available ? 'Available' : 'Unavailable'} 
                      {restriction.reason && ` (${restriction.reason})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button onClick={() => setShowModal(false)} className="modal-close-btn">Close</button>
          </div>
        </div>
      )}

      {showTestModePopup && (
        <TestModePopup
          isOpen={showTestModePopup}
          onClose={() => setShowTestModePopup(false)}
        />
      )}
    </div>
  );
}


export default Landing;