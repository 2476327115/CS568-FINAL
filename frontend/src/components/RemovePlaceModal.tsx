import type { Place } from "../types";

interface RemovePlaceModalProps {
  place: Place | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemovePlaceModal({
  place,
  open,
  onCancel,
  onConfirm,
}: RemovePlaceModalProps) {
  if (!open || !place) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-ink">Remove {place.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This will shorten your route by around 1 hour.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
          >
            Remove and update route
          </button>
        </div>
      </div>
    </div>
  );
}
