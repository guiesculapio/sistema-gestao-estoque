import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./header";

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />

      <div className="flex flex-col flex-1 gap-3 p-3 bg-slate-100 min-w-0">
        {/* Header flutuante */}
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 flex-shrink-0">
          <Header />
        </div>

        {/* Área de conteúdo com scroll */}
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
