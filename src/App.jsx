import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Relatorios from "./pages/Relatorios";
import Vendas from "./pages/Vendas";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { Loader } from "lucide-react";

/**
 * Protected route — redirects to /login if not authenticated.
 */
function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader size={28} className="animate-spin text-slate-400" />
      </div>
    );
  return session ? children : <Navigate to="/login" replace />;
}

/**
 * Public route — redirects to /dashboard if already authenticated.
 * Prevents a logged-in user from accessing /login or /register.
 */
function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader size={28} className="animate-spin text-slate-400" />
      </div>
    );
  return session ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <InventoryProvider>
                  <MainLayout />
                </InventoryProvider>
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
