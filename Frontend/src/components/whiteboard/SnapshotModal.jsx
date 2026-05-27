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
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-md w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <History
                className="animate-in spin-in-12 duration-500"
                size={20}
              />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-slate-850 text-base font-extrabold leading-tight">
                Save Custom Version
              </h3>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
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
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateSnapshot} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Version Label / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Initial Draft, Sprint 1 Done"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
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
              className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!snapshotLabel.trim() || isCreatingSnapshot}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all text-xs font-bold text-white cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md shadow-blue-500/10"
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

