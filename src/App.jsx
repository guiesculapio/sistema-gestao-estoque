import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "lucide-react";
import MainLayout from "./components/layout/mainlayout";
import Dashboard from "./pages/dashboard";
import Inventario from "./pages/inventario";
import Relatorios from "./pages/relatorios";
import Vendas from "./pages/vendas";
import Configuracoes from "./pages/configuracoes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AuthenticatedApp() {
  return (
    <InventoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InventoryProvider>
  );
}

function AppGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // Rotas públicas — acessíveis sem sessão
  if (window.location.pathname === "/register") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return session ? <AuthenticatedApp /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

export default App;
