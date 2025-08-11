// src/router/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SidebarLayout from '../components/layout/SidebarLayout';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Settings from '../pages/Settings';
import Campaigns from '../pages/Campaigns';
import Moderation from '../pages/Moderation';
import Posts from '../pages/Posts';

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<SidebarLayout />}>
      {/* Redirect root `/` to `/dashboard` */}
      <Route index element={<Navigate to="/dashboard" replace />} />

      {/* Fix routes to match Sidebar links */}
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="users" element={<Users />} />
      <Route path="settings" element={<Settings />} />
      <Route path="campaigns" element={<Campaigns />} />
      <Route path="moderation" element={<Moderation />} />
      <Route path="posts" element={<Posts />} />
    </Route>
  </Routes>
);

export default AppRoutes;
