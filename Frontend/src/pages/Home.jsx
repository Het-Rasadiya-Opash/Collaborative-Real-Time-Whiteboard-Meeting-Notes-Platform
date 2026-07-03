import { useEffect, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Boards from "./Boards";
import NotesPage from "./NotesPage";
import Whiteboard from "./Whiteboard";
import Workspace from "./Workspace";

const Home = () => {
  const [activeNav, setActiveNav] = useState(() => {
    try {
      return localStorage.getItem("activeNav") || "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [selectedWorkspace, setSelectedWorkspace] = useState(() => {
    try {
      const stored = localStorage.getItem("selectedWorkspace");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [activeBoard, setActiveBoard] = useState(() => {
    try {
      const stored = localStorage.getItem("activeBoard");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("activeNav", activeNav);
    } catch {}
  }, [activeNav]);

  useEffect(() => {
    try {
      if (selectedWorkspace) {
        localStorage.setItem(
          "selectedWorkspace",
          JSON.stringify(selectedWorkspace),
        );
      } else {
        localStorage.removeItem("selectedWorkspace");
      }
    } catch {}
  }, [selectedWorkspace]);

  useEffect(() => {
    try {
      if (activeBoard) {
        localStorage.setItem("activeBoard", JSON.stringify(activeBoard));
      } else {
        localStorage.removeItem("activeBoard");
      }
    } catch {}
  }, [activeBoard]);

  const handleLaunchWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    setActiveNav("boards");
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen relative">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={(nav) => {
          setActiveNav(nav);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-35 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className="lg:ml-[280px] pt-20 min-h-screen px-4 sm:px-6 pb-4 sm:pb-6 bg-background transition-all duration-300">
        {activeNav === "dashboard" ? (
          <Workspace 
            onLaunchWorkspace={handleLaunchWorkspace} 
            onViewAllBoards={() => setActiveNav("boards")} 
          />
        ) : activeNav === "boards" ? (
          <Boards
            workspace={selectedWorkspace}
            onSelectWorkspace={() => setActiveNav("dashboard")}
            onOpenBoard={(board) => setActiveBoard(board)}
          />
        ) : activeNav === "notes" ? (
          <NotesPage
            workspace={selectedWorkspace}
            onSelectWorkspace={() => setActiveNav("dashboard")}
            onOpenBoard={(board) => setActiveBoard(board)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-on-surface-variant opacity-60">
            <h2 className="text-xl font-bold capitalize">{activeNav} Page</h2>
            <p className="text-sm">Content coming soon...</p>
          </div>
        )}
      </main>

      {activeBoard && (
        <Whiteboard
          board={activeBoard}
          onClose={(dest) => {
            setActiveBoard(null);
            if (dest) setActiveNav(dest);
          }}
          workspace={selectedWorkspace}
        />
      )}
    </div>
  );
};

export default Home;
