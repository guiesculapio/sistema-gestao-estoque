import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./header";

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header fixo no topo */}
        <Header />

        {/* Área de conteúdo que muda conforme a rota */}
        <main className="p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
