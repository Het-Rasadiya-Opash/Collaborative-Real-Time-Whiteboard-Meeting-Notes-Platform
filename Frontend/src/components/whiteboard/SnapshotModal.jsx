import React from "react";
import { History, X } from "lucide-react";

export const SnapshotModal = ({
  snapshotLabel,
  setSnapshotLabel,
  isCreatingSnapshot,
  handleCreateSnapshot,
  setIsSnapshotModalOpen,
}) => {
  return (
    <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-surface-bright border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History
              className="text-primary animate-in spin-in-12 duration-500"
              size={20}
            />
            <h3 className="font-headline-md text-base font-black text-on-surface">
              Save Custom Version
            </h3>
          </div>
          <button
            onClick={() => {
              setIsSnapshotModalOpen(false);
              setSnapshotLabel("");
            }}
            className="text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateSnapshot} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-outline uppercase font-bold tracking-wider">
              Version Label / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Initial Draft, Sprint 1 Done"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                setIsSnapshotModalOpen(false);
                setSnapshotLabel("");
              }}
              className="px-4 py-2 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors text-xs font-bold text-on-surface-variant cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!snapshotLabel.trim() || isCreatingSnapshot}
              className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all text-xs font-bold text-on-primary cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
            >
              {isCreatingSnapshot ? "Saving..." : "Save Version"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
