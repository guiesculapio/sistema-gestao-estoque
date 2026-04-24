import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/mainlayout";
import Dashboard from "./pages/dashboard";
import Inventario from "./pages/inventario";
import Relatorios from "./pages/relatorios";
import { InventoryProvider } from "./context/InventoryContext";

function App() {
  return (
    // O Provedor de dados deve ficar no topo de tudo
    <InventoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InventoryProvider>
  );
}

export default App;
