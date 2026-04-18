import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/mainlayout';
import Dashboard from './pages/dashboard';
import Inventario from './pages/inventario';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota principal que carrega o Layout (Sidebar + Header) */}
        <Route path="/" element={<MainLayout />}>
          {/* Faz o Dashboard ser a página inicial automática */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventario" element={<Inventario />} />
          
          {/* Redireciona qualquer rota errada para o dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;