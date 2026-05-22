import React from "react";
import { useState } from "react";
import {
  Network,
  LayoutDashboard,
  Briefcase,
  Palette,
  FileText,
  Users,
  Settings,
  ListFilter,
  User,
  Share2,
  UserPlus,
  HelpCircle,
} from "lucide-react";

const Sidebar = ({ activeNav, setActiveNav }) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width flex flex-col p-4 border-r border-outline-variant z-40 bg-surface-container-low">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container shadow-sm">
          <Network className="w-6 h-6 font-semibold" />
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm font-black text-on-surface">
            Project Space
          </h2>
          <p className="font-label-md text-label-md text-on-surface-variant opacity-70">
            Collaborative Team
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <button
          onClick={() => setActiveNav("dashboard")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
            activeNav === "dashboard"
              ? "text-primary font-bold bg-primary-container/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="font-label-md text-sm">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveNav("boards")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
            activeNav === "boards"
              ? "text-primary font-bold bg-primary-container/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Palette size={20} />
          <span className="font-label-md text-sm">Boards</span>
        </button>

        <button
          onClick={() => setActiveNav("notes")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
            activeNav === "notes"
              ? "text-primary font-bold bg-primary-container/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <FileText size={20} />
          <span className="font-label-md text-sm">Notes</span>
        </button>
        <button
          onClick={() => setActiveNav("members")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
            activeNav === "members"
              ? "text-primary font-bold bg-primary-container/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Users size={20} />
          <span className="font-label-md text-sm">Members</span>
        </button>
        <button
          onClick={() => setActiveNav("settings")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
            activeNav === "settings"
              ? "text-primary font-bold bg-primary-container/20"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <Settings size={20} />
          <span className="font-label-md text-sm">Settings</span>
        </button>
      </nav>

      <div className="mt-6">
        <p className="font-label-sm text-label-sm text-outline uppercase px-3 mb-2 font-bold tracking-wider">
          Filters
        </p>
        <div className="space-y-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeFilter === "all"
                ? "bg-surface-container-high text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="flex items-center gap-3">
              <ListFilter size={18} />
              <span className="font-label-md text-sm">Boards</span>
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("owned")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeFilter === "owned"
                ? "bg-surface-container-high text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="flex items-center gap-3">
              <User size={18} />
              <span className="font-label-md text-sm">Owned by me</span>
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("shared")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeFilter === "shared"
                ? "bg-surface-container-high text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="flex items-center gap-3">
              <Share2 size={18} />
              <span className="font-label-md text-sm">Shared with me</span>
            </span>
          </button>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-outline-variant space-y-1">
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-primary font-bold hover:bg-primary/5 rounded-lg transition-all duration-200 cursor-pointer"
        >
          <UserPlus size={20} />
          <span className="font-label-md text-sm">Invite Member</span>
        </button>
        <a
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all duration-200"
          href="#"
        >
          <HelpCircle size={20} />
          <span className="font-label-md text-sm">Help Center</span>
        </a>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all duration-200 cursor-pointer"
        >
          <User size={20} />
          <span className="font-label-md text-sm">Account</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
