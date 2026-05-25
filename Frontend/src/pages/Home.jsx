import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Workspace from "./Workspace";
import Boards from "./Boards";
import Whiteboard from "./Whiteboard";

const Home = () => {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [activeBoard, setActiveBoard] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          <Workspace onLaunchWorkspace={handleLaunchWorkspace} />
        ) : activeNav === "boards" ? (
          <Boards
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
          onClose={() => setActiveBoard(null)}
          workspace={selectedWorkspace}
        />
      )}
    </div>
  );
};

export default Home;
