import React from "react";
import type { CampaignCounts } from "../../types/campaign";
import { fmtNumber } from "../../utils/format";

function Card({ label, value }: { label: string; value: number | undefined | null }) {
  const text = typeof value === "number" ? fmtNumber(value) : "—";
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{text}</div>
    </div>
  );
}

export default function CampaignCountsView({ counts }: { counts: CampaignCounts | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Card label="Total" value={counts?.total} />
      <Card label="Draft" value={counts?.draft} />
      <Card label="Scheduled" value={counts?.scheduled} />
      <Card label="Active" value={counts?.active} />
      <Card label="Completed" value={counts?.completed} />
      <Card label="Archived" value={counts?.archived} />
    </div>
  );
}
