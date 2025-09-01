import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';
import DataManagement from './pages/DataManagement';
import PromptEnhancer from './pages/PromptEnhancer';
import ModelInfo from './pages/ModelInfo';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/training" element={<Training />} />
            <Route path="/data" element={<DataManagement />} />
            <Route path="/enhancer" element={<PromptEnhancer />} />
            <Route path="/model" element={<ModelInfo />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
