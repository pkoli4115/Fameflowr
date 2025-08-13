// FILE: src/components/campaigns/CampaignStats.tsx
// =============================
import React from "react";
import { fmtNumber } from "../../utils/format";
import { getAggregatedMetrics } from "../../firebase/campaignApi";

type Props = {
  total?: number;
  reach?: number;
  clicks?: number;
  likes?: number;
  /** bump this number to force a reload from backend (when props not provided) */
  refreshKey?: number;
};

export default function CampaignStats({
  total,
  reach,
  clicks,
  likes,
  refreshKey = 0,
}: Props) {
  // If parent provides numbers, we show them as-is (no change in behavior).
  // Otherwise we load metrics from backend.
  const [loaded, setLoaded] = React.useState({
    total: total ?? 0,
    reach: reach ?? 0,
    clicks: clicks ?? 0,
    likes: likes ?? 0,
  });

  const propsProvided =
    [total, reach, clicks, likes].some((v) => typeof v === "number");

  // Keep local state in sync if parent passes in new props
  React.useEffect(() => {
    if (propsProvided) {
      setLoaded({
        total: total ?? 0,
        reach: reach ?? 0,
        clicks: clicks ?? 0,
        likes: likes ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, reach, clicks, likes]);

  // If no props provided, load from backend; re-run when refreshKey changes
  React.useEffect(() => {
    if (propsProvided) return;
    (async () => {
      const m = await getAggregatedMetrics();
      setLoaded({
        total: m.total ?? 0,
        reach: m.reach ?? 0,
        clicks: m.clicks ?? 0,
        likes: m.likes ?? 0,
      });
    })();
  }, [propsProvided, refreshKey]);

  const Card = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">
        {fmtNumber(typeof value === "number" ? value : undefined)}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* ✅ First card now reflects backend-maintained total when props not provided */}
      <Card label="Campaigns" value={propsProvided ? (total ?? "—") : loaded.total} />
      <Card label="Reach"     value={propsProvided ? (reach ?? "—") : loaded.reach} />
      <Card label="Clicks"    value={propsProvided ? (clicks ?? "—") : loaded.clicks} />
      <Card label="Likes"     value={propsProvided ? (likes ?? "—") : loaded.likes} />
    </div>
  );
}
