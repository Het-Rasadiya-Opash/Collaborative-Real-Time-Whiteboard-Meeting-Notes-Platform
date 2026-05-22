import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Workspace from "./Workspace";

const Home = () => {
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen relative">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <Header />

      <main className="pl-[280px] pt-[56px] min-h-screen p-6 bg-background">
        {activeNav === "dashboard" ? (
          <Workspace />
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-on-surface-variant opacity-60">
            <h2 className="text-xl font-bold capitalize">{activeNav} Page</h2>
            <p className="text-sm">Content coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
