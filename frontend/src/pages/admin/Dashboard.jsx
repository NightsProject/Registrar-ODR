import React, { useEffect, useState, useRef } from "react";
import { getCSRFToken } from "../../utils/csrf";
import { useNavigate } from "react-router-dom";
import './Dashboard.css';
import NotificationIcon from '../../components/icons/NotificationIcon';
import SearchIcon from "../../components/icons/SearchIcon";
import TotalRequestsIcon from "../../components/icons/TotalRequestsIcon";
import PendingIcon from "../../components/icons/PendingIcon";
import UnpaidIcon from "../../components/icons/UnpaidIcon";
import ProcessedIcon from "../../components/icons/ProcessedIcon";
import ScrollLeft from "../../components/icons/ScrollLeft";
import ScrollRight from "../../components/icons/ScrollRight";
import SettingsIcon from "../../components/icons/SettingsIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import LogoutIcon from "../../components/icons/LogoutIcon";


const ActivityItem = ({ activity }) => (
  <div className="activity-item">
    <div className="activity-details">
      <p className={`activity-message status ${activity.status.toLowerCase()}`}>
        Request #{activity.request_id} by {activity.full_name} - {activity.status}
      </p>
      <span className="activity-time">{activity.requested_at}</span>
    </div>
  </div>
);


const NotificationPanel = ({ notifications, onClose }) => (
  <div className="notification-panel">
    <div className="panel-header">
      <h3>Notifications</h3>
    </div>
    <div className="panel-content">
      {notifications.length === 0 ? (
        <div className="notification-empty-state">
          <p>No new notifications.</p>
        </div>
      ) : (
        notifications.map(n => (
          <div key={n.id} className="notification-item">
            <div className="item-icon-type">
              <span className={`item-icon ${n.type.replace(/\s/g, '-')}`}>{n.type === 'New Request' ? 'R' : n.type === 'Payment Due' ? 'P' : 'D'}</span>  {/* To be replaced by icons based on the type of notification */}
              <p className="item-type">{n.type}</p>
            </div>
            <p className="item-message">{n.message}</p>
            <span className="item-time">{n.time}</span>
          </div>
        ))
      )}
    </div>
  </div>
);


const UserProfilePanel = ({ onClose, onLogout }) => (
  <div className="user-profile-panel">
    <div className="profile-panel-header">
      <div className="profile-avatar-large">
        <span>A</span>
      </div>
      <div className="profile-info">
        <h4>Administrator</h4>
        <p>admin@example.com</p>
      </div>
    </div>
    <div className="profile-panel-content">
      <button className="profile-menu-item">
        <ProfileIcon />
        <span>My Profile</span>
      </button>
      <button className="profile-menu-item">
        <SettingsIcon />
        <span>Settings</span>
      </button>
      <div className="profile-divider"></div>
      <button className="profile-menu-item logout" onClick={onLogout}>
        <LogoutIcon />
        <span>Logout</span>
      </button>
    </div>
  </div>
);


const StatCard = ({ title, icon: Icon, value, subText, percentage, trend }) => (
  <div className="stat-card">
    <div className="card-header">
      <div className="card-icon">
        <Icon className="card-metric-icon" />
      </div>
      <p className="card-title">{title}</p>
    </div>
    <div className="card-content-body">
      <p className="card-subtext">{subText}</p>
      <div className="card-value-row">
        <h2 className="card-value">{value}</h2>
        {percentage !== undefined && (
          <span
            className={`card-percentage ${trend === 'up' ? 'trend-up' :
                trend === 'down' ? 'trend-down' :
                  'trend-neutral'
              }`}
            data-tooltip={
              trend === 'neutral'
                ? `No change compared to last month`
                : `${trend === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(percentage)}% compared to last month`
            }
          >
            {trend !== 'neutral' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="trend-arrow"
              >
                {trend === 'up' ? (
                  <path d="M6 2L10 6L6 6L6 10L6 6L2 6L6 2Z" fill="currentColor" />
                ) : (
                  <path d="M6 10L2 6L6 6L6 2L6 6L10 6L6 10Z" fill="currentColor" />
                )}
              </svg>
            )}
            {trend === 'neutral' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="trend-arrow"
              >
                <path d="M2 6 L10 6" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
            {Math.abs(percentage)}%
          </span>
        )}
      </div>
    </div>
  </div>
);


const ScrollButton = ({ direction, onClick, isVisible }) => {
  const iconClass = "arrow-icon";
  const baseClass = "card-slide-arrow";


  return (
    <div
      className={`${baseClass} ${direction === 'left' ? 'arrow-left' : 'arrow-right'} ${isVisible ? 'arrow-visible' : 'arrow-hidden'}`}
      onClick={onClick}
    >
      {direction === 'left' ? <ScrollLeft className={iconClass} /> : <ScrollRight className={iconClass} />}
    </div>


  );
}


function Dashboard() {
  const scrollContainerReference = useRef(null);
  const notificationReference = useRef(null);
  const profileReference = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();




  const toggleProfile = () => {
    setIsProfileOpen(prev => !prev);
  };


  const handleLogout = async () => {
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      if (response.ok) {
        navigate('/admin/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsProfileOpen(false);
  };


  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };


  const scrollCards = (direction) => {
    if (scrollContainerReference.current) {
      const scrollAmount = 360;
      const currentScroll = scrollContainerReference.current.scrollLeft;
      const newScroll = direction === 'left'
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;


      scrollContainerReference.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };


  const updateScrollState = () => {
    if (scrollContainerReference.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerReference.current;
      const scrollTolerance = 1;


      setCanScrollLeft(scrollLeft > scrollTolerance);


      setCanScrollRight(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - scrollTolerance);
    }
  };


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const csrfToken = getCSRFToken();
        const response = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        } else if (response.status === 401) {
          navigate('/admin/login');
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err) {
        setError('Error fetching dashboard data');
      } finally {
        setLoading(false);
      }
    };


    fetchDashboardData();
  }, [navigate]);


  useEffect(() => {
    const container = scrollContainerReference.current;


    const handleClickOutside = (event) => {
      if (notificationReference.current && !notificationReference.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileReference.current && !profileReference.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };


    if (container) {


      updateScrollState();


      container.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);
      document.addEventListener('mousedown', handleClickOutside);


      return () => {
        container.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isNotificationsOpen, isProfileOpen, dashboardData]);
  const cardData = dashboardData ? [
    {
      title: "Total Submissions",
      icon: TotalRequestsIcon,
      value: dashboardData.stats.total_requests.toLocaleString(),
      subText: "Total requests in system",
      percentage: dashboardData.stats.total_requests_percentage,  
      trend: dashboardData.stats.total_requests_trend              
    },
    {
      title: "In Process",
      icon: PendingIcon,
      value: dashboardData.stats.pending_requests.toString(),
      subText: "Requests in progress",
      percentage: dashboardData.stats.pending_requests_percentage, 
      trend: dashboardData.stats.pending_requests_trend            
    },
    {
      title: "Outstanding Payments",
      icon: UnpaidIcon,
      value: `₱${parseFloat(dashboardData.stats.unpaid_requests || 0).toFixed(2)}`,
      subText: "Total unpaid amount",
      percentage: dashboardData.stats.unpaid_requests_percentage,  
      trend: dashboardData.stats.unpaid_requests_trend             
    },
    {
      title: "Ready for Release",
      icon: ProcessedIcon,
      value: dashboardData.stats.documents_ready.toString(),
      subText: "Documents ready for pickup",          
    },
  ] : [];


  const notificationsData = dashboardData ? dashboardData.notifications : [];

  
  if (loading) {
    return (
      <div className="dashboard-content">
        {/* Header Skeleton */}
        <div className="dashboard-header-wrapper">
          <div className="header-content">
            <div className="skeleton skeleton-title" style={{ width: '300px', height: '32px' }}></div>

            <div className="header-controls">
              <div className="skeleton skeleton-search" style={{ width: '300px', height: '40px' }}></div>
              <div className="skeleton skeleton-circle" style={{ width: '40px', height: '40px' }}></div>
              <div className="skeleton skeleton-profile" style={{ width: '150px', height: '40px' }}></div>
            </div>
          </div>
        </div>

        {/* Stat Cards Skeleton */}
        <div className="stat-cards-content">
          <div className="stat-cards-wrapper scroll-hide">
            <div className="stat-card-inner-scroll">
              {[1, 2, 3, 4].map((_, index) => (
                <div key={index} className="stat-card">
                  <div className="card-header">
                    <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px', marginTop: '8px' }}></div>
                  </div>
                  <div className="card-content-body">
                    <div className="skeleton skeleton-text" style={{ width: '140px', height: '14px', marginBottom: '12px' }}></div>
                    <div className="skeleton skeleton-value" style={{ width: '100px', height: '32px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="recent-activity-wrapper mt-10 bg-white rounded-2xl shadow p-6">
          <div className="skeleton skeleton-text" style={{ width: '180px', height: '24px', marginBottom: '16px' }}></div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <div className="skeleton skeleton-text" style={{ width: '80px', height: '14px' }}></div>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <div className="skeleton skeleton-text" style={{ width: '80px', height: '14px' }}></div>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <div className="skeleton skeleton-text" style={{ width: '100px', height: '14px' }}></div>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <div className="skeleton skeleton-text" style={{ width: '60px', height: '14px' }}></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <div className="skeleton skeleton-text" style={{ width: '60px', height: '14px' }}></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="skeleton skeleton-text" style={{ width: '120px', height: '14px' }}></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="skeleton skeleton-text" style={{ width: '140px', height: '14px' }}></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="skeleton skeleton-pill" style={{ width: '100px', height: '24px' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return <div className="dashboard-content"><p>Error: {error}</p></div>;
  }


  return (
    <div className="dashboard-content">


      {/*------------------- START OF HEADER CONTENT -------------------*/}
      <div className="dashboard-header-wrapper">
        <div className="header-content">
          <h1>Welcome, Administrator.</h1>


          <div className="header-controls">
            <div className="search-input-wrapper">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Search requests, documents..."
                className="header-search"
              />
            </div>


            <div className="notification-wrapper" ref={notificationReference}>
              <button className="notification-icon-btn" onClick={toggleNotifications}>
                <NotificationIcon className="notification-icon" />
                {notificationsData.length > 0 && (
                  <span className="notification-badge">{notificationsData.length}</span>
                )}
              </button>
              {isNotificationsOpen && (
                <NotificationPanel
                  notifications={notificationsData}
                  onClose={() => setIsNotificationsOpen(false)}
                />
              )}
            </div>


            <div className="user-profile-container" ref={profileReference}>
              <div className={`user-profile-wrapper ${isProfileOpen ? 'dropdown-menu-inverted' : ''}`} onClick={toggleProfile}>
                <div className="user-profile">
                  <span className="user-initials">A</span>
                </div>
                <div className="user-info">
                  <div className="user-name">Administrator</div>
                </div>
                <span className="dropdown-menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
              {isProfileOpen && (
                <UserProfilePanel
                  onClose={() => setIsProfileOpen(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {/*--------------------- END OF HEADER CONTENT -------------------*/}


      {/*--------------------- START OF STAT CARDS ---------------------*/}
      <div className="stat-cards-content">
        <div
          className="stat-cards-wrapper scroll-hide"
          ref={scrollContainerReference}
        >
          <div className="stat-card-inner-scroll">
            {cardData.map((card, index) => (
              <StatCard
                key={index}
                title={card.title}
                icon={card.icon}
                value={card.value}
                subText={card.subText}
                percentage={card.percentage}
                trend={card.trend}
              />
            ))}
          </div>
        </div>
        <ScrollButton
          direction="left"
          onClick={() => scrollCards('left')}
          isVisible={canScrollLeft}
        />
        <ScrollButton
          direction="right"
          onClick={() => scrollCards('right')}
          isVisible={canScrollRight}
        />
      </div>
      {/*---------------------- END OF STAT CARDS ---------------------*/}


      {/*------------------ START OF RECENT ACTIVITY ------------------*/}
      <div className="recent-activity-wrapper mt-10 bg-white rounded-2xl shadow p-6">
        <div className="recent-activity-title">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : dashboardData && dashboardData.recent_activity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Request ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date & Time</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                    {dashboardData.recent_activity.map((activity, index) => {
                      const parseDateTime = (dateStr) => {
                        if (!dateStr || dateStr === "Unknown") return "Unknown";

                        const [time, date] = dateStr.split(' ');
                        const [hours, minutes] = time.split(':');
                        const [day, month, year] = date.split('/');

                        const dateObj = new Date(year, month - 1, day, hours, minutes);

                        return dateObj.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });
                      };

                      const formattedDate = parseDateTime(activity.requested_at);

                      let statusColor = "bg-gray-500";
                      switch (activity.status) {
                        case "UNCONFIRMED": statusColor = "bg-gray-500"; break;
                        case "SUBMITTED": statusColor = "bg-blue-500"; break;
                        case "PENDING": statusColor = "bg-yellow-500"; break;
                        case "IN-PROGRESS": statusColor = "bg-indigo-500"; break;
                        case "DOC-READY": statusColor = "bg-purple-500"; break;
                        case "RELEASED": statusColor = "bg-green-600"; break;
                        case "REJECTED": statusColor = "bg-red-600"; break;
                      }

                      return (
                        <tr key={index} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-2 text-sm text-black font-semibold">{activity.request_id}</td>
                          <td className="px-4 py-2 text-sm text-black">{activity.full_name}</td>
                          <td className="px-4 py-2 text-sm text-black">{formattedDate}</td>
                          <td className="px-4 py-2 text-sm font-semibold">
                            <span className={`px-2 py-1 rounded-full text-white text-xs ${statusColor}`}>
                              {activity.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 flex justify-center">No recent activity.</p>
        )}
      </div>
      {/*------------------ END OF RECENT ACTIVITY ------------------*/}

    </div>
  );
}


export default Dashboard;