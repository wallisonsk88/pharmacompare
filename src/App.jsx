import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Compare from './components/Compare';
import Import from './components/Import';
import History from './components/History';
import Distributors from './components/Distributors';
import Products from './components/Products';
import ShoppingList from './components/ShoppingList';
import SettingsPage from './components/Settings';
import { Menu, X } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState('compare');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false); // Fecha sidebar ao navegar no mobile
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'compare': return <Compare />;
      case 'import': return <Import />;
      case 'products': return <Products />;
      case 'history': return <History />;
      case 'shopping-list': return <ShoppingList />;
      case 'distributors': return <Distributors />;
      case 'settings': return <SettingsPage />;
      default: return <Compare />;
    }
  };

  return (
    <div className="app-layout">
      {/* Botão Hamburger - só aparece no mobile */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menu"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para fechar sidebar ao clicar fora */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
      />
      {renderPage()}
    </div>
  );
}

export default App;
