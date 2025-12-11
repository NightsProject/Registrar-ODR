import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import DashboardIcon from '../icons/DashboardIcon';
import DocumentsIcon from '../icons/DocumentsIcon';
import LogsIcon from '../icons/LogsIcon';
import RequestsIcon from '../icons/RequestsIcon';
import SettingsIcon from '../icons/SettingsIcon';

const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: DashboardIcon },
    { name: 'Requests', path: '/admin/requests', icon: RequestsIcon },
    { name: 'Documents', path: '/admin/document', icon: DocumentsIcon },
    { name: 'Logs', path: '/admin/logs', icon: LogsIcon },
    { name: 'Settings', path: '/admin/settings', icon: SettingsIcon }

];

const Sidebar = () => {
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
                    const Icon = item.icon; // store icon component in variable

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