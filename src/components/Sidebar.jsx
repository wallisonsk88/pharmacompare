import React from 'react';
import { GitCompare, Upload, Package, TrendingUp, Building2, Settings, ShoppingCart } from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate, isOpen }) {
    const menuItems = [
        { id: 'compare', label: 'Comparar Preços', icon: GitCompare },
        { id: 'import', label: 'Importar Tabela', icon: Upload },
        { id: 'products', label: 'Produtos', icon: Package },
        { id: 'history', label: 'Histórico', icon: TrendingUp },
        { id: 'shopping-list', label: 'Lista de Compras', icon: ShoppingCart },
        { id: 'distributors', label: 'Distribuidoras', icon: Building2 },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <img src="/favicon.png" alt="MEGAFARMA" className="logo-icon" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                    <span className="logo-text">MEGAFARMA</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-title">Menu Principal</div>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item" onClick={() => onNavigate('settings')}>
                    <Settings size={20} />
                    <span>Configurações</span>
                </button>
            </div>
        </aside>
    );
}
