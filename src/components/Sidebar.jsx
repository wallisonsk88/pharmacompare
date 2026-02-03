import React from 'react';
import {
    LayoutDashboard,
    Building2,
    Pill,
    DollarSign,
    FileDown,
    Scale,
    TrendingUp,
    Settings,
    HelpCircle
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'distributors', label: 'Distribuidoras', icon: Building2 },
    { id: 'products', label: 'Medicamentos', icon: Pill },
    { id: 'prices', label: 'Preços', icon: DollarSign },
    { id: 'import', label: 'Importar Dados', icon: FileDown },
    { id: 'compare', label: 'Comparar', icon: Scale },
    { id: 'history', label: 'Histórico', icon: TrendingUp },
];

const bottomNavItems = [
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'help', label: 'Ajuda', icon: HelpCircle },
];

export default function Sidebar({ currentPage, onNavigate }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Pill size={28} />
                </div>
                <div>
                    <div className="sidebar-title">PharmaCompare</div>
                    <div className="sidebar-subtitle">Comparador de Preços</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">Menu Principal</div>
                    {navItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <div className="nav-section-title">Sistema</div>
                    {bottomNavItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </nav>
        </aside>
    );
}
