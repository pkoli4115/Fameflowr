import React, { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { FiHome, FiUsers, FiSettings, FiVideo, FiShield } from 'react-icons/fi';
import './SidebarLayout.css'; // Optional CSS module if you'd like extra styling

type SidebarLayoutProps = {
  children?: ReactNode;
};

const SidebarLayout: React.FC<SidebarLayoutProps> = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-purple-600 to-pink-500 text-white flex flex-col p-6">
        <h1 className="text-3xl font-bold mb-8 tracking-wide">FameFlowr</h1>
        <nav className="flex flex-col space-y-4">
          <NavLink to="/dashboard" className={({ isActive }) => linkStyle(isActive)}>
            <FiHome className="inline mr-2" /> Dashboard
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => linkStyle(isActive)}>
            <FiUsers className="inline mr-2" /> Users
          </NavLink>
          <NavLink to="/campaigns" className={({ isActive }) => linkStyle(isActive)}>
            <FiVideo className="inline mr-2" /> Campaigns
          </NavLink>
          <NavLink to="/moderation" className={({ isActive }) => linkStyle(isActive)}>
            <FiShield className="inline mr-2" /> Moderation
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => linkStyle(isActive)}>
            <FiSettings className="inline mr-2" /> Settings
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

const linkStyle = (isActive: boolean) =>
  `text-white font-medium hover:text-yellow-200 transition ${
    isActive ? 'underline underline-offset-4' : ''
  }`;

export default SidebarLayout;
