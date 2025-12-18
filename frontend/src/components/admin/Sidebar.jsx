

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
import { getFilteredNavigationItems } from '../../utils/roleUtils';


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


    // Get all available navigation items with their icons
    const allNavItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: 'DashboardIcon' },
        { name: 'Requests', path: '/admin/requests', icon: 'RequestsIcon' },
        { name: 'Transactions', path: '/admin/transactions', icon: 'PaidIcon' },
        { name: 'Documents', path: '/admin/document', icon: 'DocumentsIcon' },
        { name: 'Logs', path: '/admin/logs', icon: 'LogsIcon' },
        { name: 'Settings', path: '/admin/settings', icon: 'SettingsIcon' },
        { name: 'Developers', path: '/admin/developers', icon: 'CodeIcon' }
    ];

    // Filter navigation items based on user role
    const navItems = allNavItems.filter(item => 
        filteredNavItems.some(filtered => filtered.path === item.path)
    );

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