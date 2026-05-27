import React from "react";
import {
  LayoutDashboard,
  PenTool,
  FileText,
  Users,
  Settings,
  X,
  HelpCircle,
  LogOut,
  StickyNotes,
} from "lucide-react";

export const WhiteboardSidebar = ({ onClose, isOpen, setIsOpen }) => {
  return (
    <aside className={`fixed left-0 top-0 h-full w-[280px] bg-slate-50 border-r border-outline-variant shadow-sm z-50 flex flex-col justify-between py-6 transition-all duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div>
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-lg text-primary font-headline-md tracking-tight">
              Workspace
            </h1>
            <p className="text-[11px] text-on-surface-variant/70 font-semibold select-none">
              Collaborative Canvas
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-on-surface-variant transition-colors cursor-pointer flex items-center justify-center"
            title="Collapse Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1 px-3">
          <a
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors duration-150 cursor-pointer border-l-4 border-transparent hover:translate-x-1 transition-all"
          >
            <LayoutDashboard size={20} className="select-none" />
            <span className="text-sm font-semibold">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-primary font-bold bg-surface-container border-l-4 border-primary shadow-sm cursor-pointer">
            <PenTool size={20} className="select-none" />
            <span className="text-sm font-semibold">Boards</span>
          </a>

          <a
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors duration-150 cursor-pointer border-l-4 border-transparent hover:translate-x-1 transition-all"
          >
            <FileText size={20} className="select-none" />
            <span className="text-sm font-semibold">Notes</span>
          </a>
          <a
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors duration-150 cursor-pointer border-l-4 border-transparent hover:translate-x-1 transition-all"
          >
            <Settings size={20} className="select-none" />
            <span className="text-sm font-semibold">Settings</span>
          </a>
        </nav>
      </div>

      <div className="mt-auto px-4 space-y-4">
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-outline text-primary font-bold text-xs hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <X size={16} />
          Close Board
        </button>

        <div className="pt-4 border-t border-outline-variant space-y-1">
          <a
            onClick={onClose}
            className="flex items-center gap-3 text-on-surface-variant py-2 px-4 hover:bg-surface-container-low rounded-lg transition-all cursor-pointer"
          >
            <HelpCircle size={18} className="select-none" />
            <span className="text-xs font-semibold">Help Center</span>
          </a>
          <a
            onClick={onClose}
            className="flex items-center gap-3 text-on-surface-variant py-2 px-4 hover:bg-error-container/20 hover:text-error rounded-lg transition-all cursor-pointer"
          >
            <LogOut size={18} className="select-none" />
            <span className="text-xs font-semibold">Sign Out</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
