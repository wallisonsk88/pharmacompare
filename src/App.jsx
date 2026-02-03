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

function App() {
  const [currentPage, setCurrentPage] = useState('compare');

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
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
}

export default App;
