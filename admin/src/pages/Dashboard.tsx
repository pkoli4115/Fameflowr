import React from 'react';
import { FaChartBar, FaUserFriends, FaProjectDiagram } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container">
      <h1>📊 Fameflowr Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <FaUserFriends size={32} />
          <h2>2,150</h2>
          <p>Active Users</p>
        </div>
        <div className="stat-card">
          <FaProjectDiagram size={32} />
          <h2>320</h2>
          <p>Campaigns</p>
        </div>
        <div className="stat-card">
          <FaChartBar size={32} />
          <h2>99%</h2>
          <p>Engagement</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
