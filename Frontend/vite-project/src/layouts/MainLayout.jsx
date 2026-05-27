import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import AIChatDrawer from '../components/AIChatDrawer';

const MainLayout = () => {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="main-layout">
        <Sidebar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
      <AIChatDrawer />
    </div>
  );
};

export default MainLayout;
