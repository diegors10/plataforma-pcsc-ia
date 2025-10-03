import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/Layout';
import Home from './pages/Home';
import Prompts from './pages/PromptsSimple';
import NovoPrompt from './pages/NovoPrompt';
import Discussoes from './pages/Discussoes';
import VisualizarDiscussao from './pages/VisualizarDiscussao';
import Sobre from './pages/Sobre';
import BoasPraticas from './pages/BoasPraticas';
import VisualizarPrompt from './pages/VisualizarPrompt';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';

import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/prompts" element={<Prompts />} />
              <Route path="/prompts/novo" element={<NovoPrompt />} />
              <Route path="/discussoes" element={<Discussoes />} />
              <Route path="/discussoes/:id" element={<VisualizarDiscussao />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/boas-praticas" element={<BoasPraticas />} />
              <Route path="/prompts/:id" element={<VisualizarPrompt />} />

              {/* Autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Perfil */}
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
