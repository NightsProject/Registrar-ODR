



import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import DashboardIcon from '../icons/DashboardIcon';
import DocumentsIcon from '../icons/DocumentsIcon';
import LogsIcon from '../icons/LogsIcon';
import PaidIcon from '../icons/PaidIcon';
import RequestsIcon from '../icons/RequestsIcon';
import SettingsIcon from '../icons/SettingsIcon';
import CodeIcon from '../icons/CodeIcon';
import { useAuth } from '../../contexts/AuthContext';


const Sidebar = () => {
    const { role, getFilteredNavigationItems } = useAuth();
    const filteredNavItems = getFilteredNavigationItems();

    // Define icon mapping for navigation items
    const getIconComponent = (iconName) => {
        const iconMap = {
            'DashboardIcon': DashboardIcon,
            'RequestsIcon': RequestsIcon,
            'PaidIcon': PaidIcon,
            'DocumentsIcon': DocumentsIcon,
            'LogsIcon': LogsIcon,
            'SettingsIcon': SettingsIcon,
            'CodeIcon': CodeIcon,
        };
        return iconMap[iconName] || DashboardIcon;
    };

    // Use the filtered navigation items from AuthContext which already handles role-based filtering
    const navItems = filteredNavItems;

    return (
        <aside className="admin-sidebar">
            <div className="sidebar-header">
                <img src="/assets/MSUIITLogo.png" alt="MSUIIT Logo" className="sidebar-brand-logo" />
                <div className="brand-name">
                    <p id="online">Online</p>
                    <p>Document</p>
                    <p>Request</p>  
                </div>
            </div>

            <nav>
                {navItems.map((item) => {
                    const Icon = getIconComponent(item.icon);

                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                        >
                            {/* 👇 this function gives you access to isActive */}
                            {({ isActive }) => (
                                <>
                                    <Icon className="nav-icon" active={isActive} />
                                    {item.name}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;