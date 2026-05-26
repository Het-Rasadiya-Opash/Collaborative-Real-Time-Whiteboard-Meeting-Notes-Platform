import React from "react";

export const WhiteboardSidebar = ({ onClose }) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest border-r border-outline-variant shadow-sm z-50 flex flex-col py-8">
      <div className="px-6 mb-8 flex flex-col gap-1">
        <span className="font-headline-md text-xl font-bold text-primary">
          Workspace
        </span>
        <span className="text-xs text-on-surface-variant opacity-70">
          Enterprise Plan
        </span>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        <a
          onClick={onClose}
          className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-body-md">Dashboards</span>
        </a>
        <a className="flex items-center gap-3 bg-surface-container text-primary border-l-4 border-active-indicator py-3 px-4 rounded-r-lg cursor-pointer">
          <span className="material-symbols-outlined">draw</span>
          <span className="font-body-md font-semibold">Boards</span>
        </a>
        <a
          onClick={onClose}
          className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
        >
          <span className="material-symbols-outlined">description</span>
          <span className="font-body-md">Notes</span>
        </a>
        <a
          onClick={onClose}
          className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 py-3 px-4 rounded-lg cursor-pointer"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body-md">Settings</span>
        </a>
      </nav>
      <div className="px-4 mt-auto">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-4 rounded-xl shadow-md hover:bg-primary-container transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-body-md">Close Board</span>
        </button>
      </div>
    </aside>
  );
};
