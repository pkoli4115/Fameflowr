// src/components/campaigns/CampaignStats.tsx
import React from "react";

type Props = {
  stats: {
    total: number;
    active: number;
    scheduled: number;
    ended: number;
    draft: number;
    reach: number;
    clicks: number;
    likes: number;
  };
};

const StatCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-xl border p-4">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

const CampaignStats: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Active" value={stats.active} />
      <StatCard label="Scheduled" value={stats.scheduled} />
      <StatCard label="Ended" value={stats.ended} />
      <StatCard label="Drafts" value={stats.draft} />
      <StatCard label="Reach" value={stats.reach} />
      <StatCard label="Clicks" value={stats.clicks} />
      <StatCard label="Likes" value={stats.likes} />
    </div>
  );
};

export default CampaignStats;
