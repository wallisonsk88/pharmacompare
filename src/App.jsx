import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Distributors from './components/Distributors';
import Compare from './components/Compare';
import Import from './components/Import';
import History from './components/History';
import SettingsPage from './components/Settings';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'distributors': return <Distributors />;
      case 'compare': return <Compare />;
      case 'import': return <Import />;
      case 'history': return <History />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

export default App;
