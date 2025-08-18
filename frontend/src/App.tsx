import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
// Temporarily commented out - these components still use MUI and need to be rewritten
// import Training from './pages/Training';
// import DataManagement from './pages/DataManagement';
// import PromptEnhancer from './pages/PromptEnhancer';
// import ModelInfo from './pages/ModelInfo';
import './App.css';

// Temporary placeholder component
const ComingSoon = ({ pageName }: { pageName: string }) => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <h2>{pageName}</h2>
    <p>This page is being converted to work without MUI. Coming soon!</p>
  </div>
);

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/training" element={<ComingSoon pageName="Training" />} />
            <Route path="/data" element={<ComingSoon pageName="Data Management" />} />
            <Route path="/enhancer" element={<ComingSoon pageName="Prompt Enhancer" />} />
            <Route path="/model" element={<ComingSoon pageName="Model Info" />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
