import { History, X } from "lucide-react";

export const SnapshotModal = ({
  snapshotLabel,
  setSnapshotLabel,
  isCreatingSnapshot,
  handleCreateSnapshot,
  setIsSnapshotModalOpen,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-2xl max-w-md w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-on-surface">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <History
                className="animate-in spin-in-12 duration-500"
                size={20}
              />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-on-surface text-base font-extrabold leading-tight">
                Save Custom Version
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 font-medium tracking-wide">
                Create a snapshot of the current whiteboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSnapshotModalOpen(false);
              setSnapshotLabel("");
            }}
            className="text-outline hover:text-error hover:bg-error-container/20 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateSnapshot} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
              Version Label / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Initial Draft, Sprint 1 Done"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans animate-none"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2.5 justify-end mt-1">
            <button
              type="button"
              onClick={() => {
                setIsSnapshotModalOpen(false);
                setSnapshotLabel("");
              }}
              className="px-4 py-2.5 border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface-variant cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!snapshotLabel.trim() || isCreatingSnapshot}
              className="px-4 py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all text-xs font-bold text-on-primary cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
            >
              {isCreatingSnapshot ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                "Save Version"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

