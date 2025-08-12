// FILE: src/components/campaigns/CampaignStats.tsx
// =============================
import React from "react";
import { fmtNumber } from "../../utils/format";

export default function CampaignStats({ total, reach, clicks, likes }: { total?: number; reach?: number; clicks?: number; likes?: number; }) {
  const Card = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{fmtNumber(typeof value === "number" ? value : undefined)}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Campaigns" value={total ?? "—"} />
      <Card label="Reach" value={reach ?? "—"} />
      <Card label="Clicks" value={clicks ?? "—"} />
      <Card label="Likes" value={likes ?? "—"} />
    </div>
  );
}
