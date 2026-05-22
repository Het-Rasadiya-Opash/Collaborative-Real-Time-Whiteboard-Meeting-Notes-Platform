import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const Home = () => {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen relative">
      <Sidebar />
      <Header />
    </div>
  );
};

export default Home;
