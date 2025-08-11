// src/router/AppRoutes.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";

// Lazy-load pages for better performance
const Dashboard  = lazy(() => import("../pages/Dashboard"));
const Users      = lazy(() => import("../pages/Users"));
const Settings   = lazy(() => import("../pages/Settings"));
const Campaigns  = lazy(() => import("../pages/Campaigns"));
const Moderation = lazy(() => import("../pages/Moderation"));
const Posts      = lazy(() => import("../pages/Posts"));

const NotFound: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold">Page not found</h1>
    <p className="text-gray-600 mt-2">The page you’re looking for doesn’t exist.</p>
  </div>
);

const AppRoutes: React.FC = () => (
  <Suspense fallback={<div className="p-6">Loading…</div>}>
    <Routes>
      <Route path="/" element={<SidebarLayout />}>
        {/* Redirect root `/` to `/dashboard` */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Main sections */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="posts" element={<Posts />} />

        {/* 404 within layout */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 404 outside layout safety net (e.g., unknown top-level path) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
