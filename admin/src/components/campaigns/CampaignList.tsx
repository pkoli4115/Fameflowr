// src/components/campaigns/CampaignList.tsx
import React, { useMemo } from "react";
import { Campaign, computeStatus } from "../../firebase/campaignApi";

type Props = {
  items: Campaign[];
  loading: boolean;
  onEdit: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
  onTogglePublish: (c: Campaign, next: boolean) => void;
  onViewParticipants?: (c: Campaign) => void;
  view?: "grid" | "list"; // NEW
};

const Badge: React.FC<{ text: string; tone?: "green" | "blue" | "gray" | "red" | "amber" }> = ({ text, tone = "gray" }) => {
  const tones: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-700",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{text}</span>;
};

const fmt = (iso?: string) => {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString();
};

const CampaignRow: React.FC<{
  c: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: (next: boolean) => void;
  onViewParticipants?: () => void;
}> = ({ c, onEdit, onDelete, onTogglePublish, onViewParticipants }) => {
  const status = computeStatus(c);
  const tone = useMemo(() => (status === "active" ? "green" : status === "scheduled" ? "blue" : status === "draft" ? "amber" : "gray"), [status]);

  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base md:text-lg font-semibold truncate">{c.title}</h3>
          <Badge text={status} tone={tone as any} />
          <Badge text={c.category} />
          <Badge text={c.visibility} />
          {c.isPublished ? <Badge text="Published" tone="green" /> : <Badge text="Unpublished" tone="red" />}
        </div>
        {c.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</p>}
        <div className="text-xs text-gray-500 mt-1">{fmt(c.startDate)} → {fmt(c.endDate)}</div>
        <div className="text-sm text-gray-600 mt-1">Participants: <span className="font-medium">{c.participantsCount ?? 0}</span></div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm md:justify-items-end">
        <div className="rounded-lg border p-2">
          <div className="text-gray-500">Reach</div>
          <div className="font-medium">{c.reach ?? 0}</div>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-gray-500">Clicks</div>
          <div className="font-medium">{c.clicks ?? 0}</div>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-gray-500">Likes</div>
          <div className="font-medium">{c.likes ?? 0}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:ml-4">
        {onViewParticipants && (
          <button onClick={onViewParticipants} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Participants</button>
        )}
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Edit</button>
        <button onClick={() => onTogglePublish(!c.isPublished)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
          {c.isPublished ? "Unpublish" : "Publish"}
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
};

const CampaignCard: React.FC<{
  c: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: (next: boolean) => void;
  onViewParticipants?: () => void;
}> = ({ c, onEdit, onDelete, onTogglePublish, onViewParticipants }) => {
  const status = computeStatus(c);
  const tone = useMemo(() => (status === "active" ? "green" : status === "scheduled" ? "blue" : status === "draft" ? "amber" : "gray"), [status]);

  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      {!!c.coverUrl && (
        <div className="h-40 bg-gray-100">
          <img src={c.coverUrl} alt={c.title} className="h-40 w-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{c.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge text={status} tone={tone as any} />
              <Badge text={c.category} />
              <Badge text={c.visibility} />
              {c.isPublished ? <Badge text="Published" tone="green" /> : <Badge text="Unpublished" tone="red" />}
            </div>
          </div>
        </div>

        {c.description && <p className="text-sm text-gray-600 line-clamp-3">{c.description}</p>}

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border p-2"><div className="text-gray-500">Reach</div><div className="font-medium">{c.reach ?? 0}</div></div>
          <div className="rounded-lg border p-2"><div className="text-gray-500">Clicks</div><div className="font-medium">{c.clicks ?? 0}</div></div>
          <div className="rounded-lg border p-2"><div className="text-gray-500">Likes</div><div className="font-medium">{c.likes ?? 0}</div></div>
        </div>

        <div className="text-xs text-gray-500">{fmt(c.startDate)} → {fmt(c.endDate)}</div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-sm text-gray-600">Participants: <span className="font-medium">{c.participantsCount ?? 0}</span></div>
          <div className="flex items-center gap-2">
            {onViewParticipants && <button onClick={onViewParticipants} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Participants</button>}
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Edit</button>
            <button onClick={() => onTogglePublish(!c.isPublished)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">{c.isPublished ? "Unpublish" : "Publish"}</button>
            <button onClick={onDelete} className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CampaignList: React.FC<Props> = ({ items, loading, onEdit, onDelete, onTogglePublish, onViewParticipants, view = "list" }) => {
  if (loading && !items.length) {
    return (
      <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "space-y-3"}>
        {Array.from({ length: 6 }).map((_, i) =>
          view === "grid" ? (
            <div key={i} className="rounded-2xl border p-4 animate-pulse h-64 bg-gray-50" />
          ) : (
            <div key={i} className="rounded-xl border p-10 animate-pulse bg-gray-50" />
          )
        )}
      </div>
    );
  }

  if (!items.length) {
    return <div className="rounded-xl border p-6 text-center text-gray-600">No campaigns found.</div>;
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((c) => (
          <CampaignCard
            key={c.id}
            c={c}
            onEdit={() => onEdit(c)}
            onDelete={() => onDelete(c)}
            onTogglePublish={(n) => onTogglePublish(c, n)}
            onViewParticipants={onViewParticipants ? () => onViewParticipants(c) : undefined}
          />
        ))}
      </div>
    );
  }

  // list view
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <CampaignRow
          key={c.id}
          c={c}
          onEdit={() => onEdit(c)}
          onDelete={() => onDelete(c)}
          onTogglePublish={(n) => onTogglePublish(c, n)}
          onViewParticipants={onViewParticipants ? () => onViewParticipants(c) : undefined}
        />
      ))}
    </div>
  );
};

export default CampaignList;
