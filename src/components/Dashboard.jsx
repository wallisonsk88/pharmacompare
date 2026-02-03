import React, { useState, useEffect } from 'react';
import { Building2, Package, DollarSign, TrendingDown, Upload, GitCompare } from 'lucide-react';
import { getDistributors, getProducts, getPrices } from '../config/supabase';

export default function Dashboard({ onNavigate }) {
    const [stats, setStats] = useState({ distributors: 0, products: 0, prices: 0, saving: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const [distributors, products, prices] = await Promise.all([
                getDistributors(), getProducts(), getPrices()
            ]);

            // Calcular economia potencial
            let totalSaving = 0;
            const productPrices = {};

            prices.forEach(p => {
                if (!productPrices[p.product_id]) productPrices[p.product_id] = [];
                productPrices[p.product_id].push(p.price);
            });

            Object.values(productPrices).forEach(priceList => {
                if (priceList.length > 1) {
                    const sorted = priceList.sort((a, b) => a - b);
                    totalSaving += sorted[sorted.length - 1] - sorted[0];
                }
            });

            setStats({
                distributors: distributors.length,
                products: products.length,
                prices: prices.length,
                saving: totalSaving
            });
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Bem-vindo ao PharmaCompare</h1>
                <p className="page-subtitle">Compare preços de medicamentos entre distribuidoras</p>
            </div>

            {/* Estatísticas */}
            <div className="stats-grid mb-xl">
                <div className="stat-card">
                    <div className="stat-icon primary"><Building2 size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.distributors}</div>
                        <div className="stat-label">Distribuidoras</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info"><Package size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.products}</div>
                        <div className="stat-label">Medicamentos</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning"><DollarSign size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.prices}</div>
                        <div className="stat-label">Preços Cadastrados</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon accent"><TrendingDown size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{formatCurrency(stats.saving)}</div>
                        <div className="stat-label">Economia Potencial</div>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas */}
            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Começar</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                <div
                    className="card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => onNavigate('import')}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="flex items-center gap-md mb-md">
                        <div className="stat-icon primary"><Upload size={24} /></div>
                        <h3 style={{ margin: 0 }}>Importar Tabela</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Selecione uma distribuidora e importe a tabela de preços dela
                    </p>
                </div>

                <div
                    className="card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => onNavigate('compare')}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div className="flex items-center gap-md mb-md">
                        <div className="stat-icon accent"><GitCompare size={24} /></div>
                        <h3 style={{ margin: 0 }}>Comparar Preços</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Veja qual distribuidora tem o melhor preço para cada medicamento
                    </p>
                </div>
            </div>

            {/* Instruções */}
            {stats.products === 0 && (
                <div className="card mt-xl" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--primary-500)' }}>
                    <h3 className="card-title">🚀 Como usar</h3>
                    <ol style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>Clique em <strong>"Importar Tabela"</strong></li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>Selecione ou crie uma distribuidora</li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>Faça upload da tabela (Excel ou CSV)</li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>Repita para outras distribuidoras</li>
                        <li>Vá em <strong>"Comparar Preços"</strong> para ver o melhor preço!</li>
                    </ol>
                </div>
            )}
        </div>
    );
}
