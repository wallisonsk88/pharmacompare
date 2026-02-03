import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Building2, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getProducts, getDistributors, getPriceHistory } from '../config/supabase';

export default function History() {
    const [products, setProducts] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [p, d] = await Promise.all([getProducts(), getDistributors()]);
            setProducts(p);
            setDistributors(d);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (selectedProduct) loadHistory();
    }, [selectedProduct, selectedDistributor]);

    const loadHistory = async () => {
        try {
            const data = await getPriceHistory(selectedProduct, selectedDistributor || null);
            const chartData = data.map(p => ({
                date: new Date(p.recorded_at).toLocaleDateString('pt-BR'),
                price: p.price,
                fullDate: p.recorded_at
            }));
            setPriceHistory(chartData);
        } catch (e) { console.error(e); }
    };

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const getVariation = () => {
        if (priceHistory.length < 2) return null;
        const first = priceHistory[0].price;
        const last = priceHistory[priceHistory.length - 1].price;
        const diff = last - first;
        const percent = (diff / first) * 100;
        return { diff, percent, isUp: diff > 0 };
    };

    const variation = getVariation();

    if (loading) {
        return <div className="main-content"><div className="empty-state loading"><TrendingUp size={64} /><h3>Carregando...</h3></div></div>;
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Histórico de Preços</h1>
                <p className="page-subtitle">Acompanhe a variação de preços ao longo do tempo</p>
            </div>

            <div className="card mb-lg">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Medicamento</label>
                        <select className="form-select" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                            <option value="">Selecione um medicamento</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Distribuidora (opcional)</label>
                        <select className="form-select" value={selectedDistributor} onChange={(e) => setSelectedDistributor(e.target.value)}>
                            <option value="">Todas as distribuidoras</option>
                            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {!selectedProduct ? (
                <div className="card"><div className="empty-state"><TrendingUp size={64} /><h3>Selecione um medicamento</h3><p>Escolha um medicamento para ver o histórico de preços</p></div></div>
            ) : priceHistory.length === 0 ? (
                <div className="card"><div className="empty-state"><Calendar size={64} /><h3>Sem histórico</h3><p>Não há registros de preços para este medicamento</p></div></div>
            ) : (
                <>
                    {variation && (
                        <div className="stats-grid mb-lg">
                            <div className="stat-card">
                                <div className="stat-icon primary"><Package size={24} /></div>
                                <div className="stat-content"><div className="stat-value">{priceHistory.length}</div><div className="stat-label">Registros</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon info"><Calendar size={24} /></div>
                                <div className="stat-content"><div className="stat-value">{formatCurrency(priceHistory[0].price)}</div><div className="stat-label">Primeiro Preço</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon accent"><TrendingUp size={24} /></div>
                                <div className="stat-content"><div className="stat-value">{formatCurrency(priceHistory[priceHistory.length - 1].price)}</div><div className="stat-label">Último Preço</div></div>
                            </div>
                            <div className="stat-card" style={{ borderColor: variation.isUp ? 'var(--error)' : 'var(--success)' }}>
                                <div className="stat-icon" style={{ background: variation.isUp ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: variation.isUp ? 'var(--error)' : 'var(--success)' }}>
                                    {variation.isUp ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ color: variation.isUp ? 'var(--error)' : 'var(--success)' }}>{variation.percent > 0 ? '+' : ''}{variation.percent.toFixed(1)}%</div>
                                    <div className="stat-label">Variação</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h3 className="card-title mb-lg">Gráfico de Variação</h3>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <LineChart data={priceHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                                    <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={12} />
                                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 8 }} labelStyle={{ color: 'var(--text-primary)' }} formatter={(v) => [formatCurrency(v), 'Preço']} />
                                    <Legend />
                                    <Line type="monotone" dataKey="price" name="Preço" stroke="var(--primary-500)" strokeWidth={3} dot={{ fill: 'var(--primary-500)', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card mt-lg">
                        <h3 className="card-title mb-md">Tabela de Registros</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead><tr><th>Data</th><th>Preço</th><th>Variação</th></tr></thead>
                                <tbody>
                                    {priceHistory.map((item, i) => {
                                        const prev = i > 0 ? priceHistory[i - 1].price : null;
                                        const diff = prev ? item.price - prev : 0;
                                        const pct = prev ? (diff / prev) * 100 : 0;
                                        return (
                                            <tr key={i}>
                                                <td><div className="flex items-center gap-sm"><Calendar size={14} />{item.date}</div></td>
                                                <td className="price-highlight">{formatCurrency(item.price)}</td>
                                                <td>{prev ? (<span className={`price-change ${diff > 0 ? 'up' : 'down'}`}>{diff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{diff > 0 ? '+' : ''}{pct.toFixed(1)}%</span>) : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
