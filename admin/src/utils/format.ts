export const fmtNumber = (n?: number) =>
  typeof n === "number" && !isNaN(n) ? n.toLocaleString() : "—";

function toDateSafe(v: any): Date | undefined {
  if (!v && v !== 0) return undefined;
  if (v && typeof v === "object" && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export const fmtDate = (v?: any) => {
  const d = toDateSafe(v);
  return d ? d.toLocaleString() : "—";
};

export const safe = <T,>(v: T | undefined | null, fallback: T) => (v ?? fallback);
