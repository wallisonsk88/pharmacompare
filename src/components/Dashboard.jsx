import React, { useState, useEffect } from 'react';
import {
    Building2,
    Pill,
    DollarSign,
    TrendingDown,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Clock,
    Search
} from 'lucide-react';
import { getDistributors, getProducts, getPrices } from '../config/supabase';

export default function Dashboard({ onNavigate }) {
    const [stats, setStats] = useState({
        distributors: 0,
        products: 0,
        pricesRecorded: 0,
        potentialSavings: 0
    });
    const [recentPrices, setRecentPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [distributors, products, prices] = await Promise.all([
                getDistributors(),
                getProducts(),
                getPrices()
            ]);

            // Calcular economia potencial (diferença entre maior e menor preço por produto)
            const productPrices = {};
            prices.forEach(p => {
                if (!productPrices[p.product_id]) {
                    productPrices[p.product_id] = [];
                }
                productPrices[p.product_id].push(p.price);
            });

            let totalSavings = 0;
            Object.values(productPrices).forEach(priceList => {
                if (priceList.length > 1) {
                    const max = Math.max(...priceList);
                    const min = Math.min(...priceList);
                    totalSavings += (max - min);
                }
            });

            setStats({
                distributors: distributors.length,
                products: products.length,
                pricesRecorded: prices.length,
                potentialSavings: totalSavings
            });

            // Últimos preços registrados
            setRecentPrices(prices.slice(0, 5));
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state loading">
                    <Package size={64} />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Visão geral do seu comparador de preços</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => onNavigate('distributors')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon primary">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.distributors}</div>
                        <div className="stat-label">Distribuidoras</div>
                    </div>
                </div>

                <div className="stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon accent">
                        <Pill size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.products}</div>
                        <div className="stat-label">Medicamentos</div>
                    </div>
                </div>

                <div className="stat-card" onClick={() => onNavigate('prices')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon info">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pricesRecorded}</div>
                        <div className="stat-label">Preços Registrados</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <TrendingDown size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{formatCurrency(stats.potentialSavings)}</div>
                        <div className="stat-label">Economia Potencial</div>
                        <div className="stat-change positive">
                            <TrendingDown size={12} />
                            Comparando fornecedores
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card mb-lg">
                <div className="card-header">
                    <h3 className="card-title">Comparação Rápida</h3>
                </div>
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar medicamento para comparar preços..."
                        onClick={() => onNavigate('compare')}
                        readOnly
                        style={{ cursor: 'pointer' }}
                    />
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-primary" onClick={() => onNavigate('compare')}>
                        <TrendingUp size={18} />
                        Comparar Preços
                    </button>
                    <button className="btn btn-secondary" onClick={() => onNavigate('import')}>
                        <Package size={18} />
                        Importar Tabela
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Últimos Preços Registrados</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('history')}>
                        Ver Histórico
                    </button>
                </div>

                {recentPrices.length === 0 ? (
                    <div className="empty-state">
                        <Clock size={48} />
                        <h3>Nenhum preço registrado</h3>
                        <p>Comece adicionando preços de medicamentos</p>
                        <button className="btn btn-primary" onClick={() => onNavigate('prices')}>
                            Adicionar Preço
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Distribuidora</th>
                                    <th>Preço</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPrices.map(price => (
                                    <tr key={price.id}>
                                        <td>{price.products?.name || 'N/A'}</td>
                                        <td>{price.distributors?.name || 'N/A'}</td>
                                        <td className="price-highlight">{formatCurrency(price.price)}</td>
                                        <td>{formatDate(price.recorded_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
