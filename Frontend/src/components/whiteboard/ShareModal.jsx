import { Share2, X } from "lucide-react";
import toast from "react-hot-toast";

export const ShareModal = ({
  isPublicLinkActive,
  activeShareRole,
  activeShareToken,
  activeShareExpires,
  shareExpiry,
  setShareExpiry,
  shareRole,
  setShareRole,
  handleGenerateShareLink,
  handleRevokeShareLink,
  setIsShareModalOpen,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-md w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Share2 size={20} />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-slate-850 text-base font-extrabold leading-tight">
                Share Whiteboard
              </h3>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                Manage public access settings
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isPublicLinkActive ? (
          <div className="flex flex-col gap-4 text-left">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Public Sharing Active</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-emerald-800 uppercase font-black tracking-wider">
                  Access Link (
                  {activeShareRole === "VIEWER"
                    ? "Viewer Only"
                    : "Editor/Collaborative"}
                  )
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.protocol}//${window.location.host}/board/shared/${activeShareToken}`}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
                  />
                  <button
                    onClick={async () => {
                      const url = `${window.location.protocol}//${window.location.host}/board/shared/${activeShareToken}`;
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied to clipboard!");
                    }}
                    className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                    title="Copy Link"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      content_copy
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2.5 mt-1">
                <span className="font-semibold">Expires:</span>
                <span className="font-extrabold text-emerald-700">
                  {activeShareExpires
                    ? new Date(activeShareExpires).toLocaleString()
                    : "Never (No Expiry)"}
                </span>
              </div>
            </div>

            <button
              onClick={handleRevokeShareLink}
              className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                link_off
              </span>
              Revoke Share Link
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Link Expiration
              </label>
              <select
                value={shareExpiry}
                onChange={(e) => setShareExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              >
                <option value="1">1 Hour</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="168">7 Days (1 Week)</option>
                <option value="-1">Never (No Expiry)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Access Permission
              </label>
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              >
                <option value="VIEWER">Viewer (View-Only Access)</option>
                <option value="EDITOR">
                  Editor (Collaborative Draw & Chat)
                </option>
              </select>
            </div>

            <button
              onClick={handleGenerateShareLink}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md mt-2"
            >
              <span className="material-symbols-outlined text-[16px]">
                link
              </span>
              Generate Public Share Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
