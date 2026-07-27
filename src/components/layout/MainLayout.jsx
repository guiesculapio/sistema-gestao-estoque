import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Fixed sidebar on the left */}
      <Sidebar />

      <div className="flex flex-col flex-1 gap-3 p-3 bg-slate-100 min-w-0">
        {/* Floating header */}
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 flex-shrink-0">
          <Header />
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto rounded-2xl">
          <div className="p-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
