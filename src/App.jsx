import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Distributors from './components/Distributors';
import Products from './components/Products';
import Prices from './components/Prices';
import Compare from './components/Compare';
import Import from './components/Import';
import History from './components/History';
import SettingsPage, { HelpPage } from './components/Settings';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'distributors': return <Distributors />;
      case 'products': return <Products />;
      case 'prices': return <Prices />;
      case 'compare': return <Compare />;
      case 'import': return <Import />;
      case 'history': return <History />;
      case 'settings': return <SettingsPage />;
      case 'help': return <HelpPage />;
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
