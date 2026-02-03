import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, Loader, Search } from 'lucide-react';
import { getProducts, getPrices, getDistributors } from '../config/supabase';

export default function History() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prods, allPrices, dists] = await Promise.all([getProducts(), getPrices(), getDistributors()]);
            setProducts(prods);
            setPrices(allPrices);
            setDistributors(dists);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    const filteredPrices = prices.filter(p => {
        const product = products.find(pr => pr.id === p.product_id);
        return product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) return <div className="main-content"><div className="empty-state"><Loader size={48} className="loading-spinner" /><h3>Carregando...</h3></div></div>;

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">📈 Histórico de Preços</h1>
                <p className="page-subtitle">Acompanhe todas as variações de preços registradas</p>
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md items-center">
                    <Search size={20} style={{ color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" placeholder="Buscar por produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
                </div>
            </div>

            {filteredPrices.length === 0 ? (
                <div className="card"><div className="empty-state"><Package size={64} /><h3>Nenhum registro</h3><p>Importe tabelas para ver o histórico de preços</p></div></div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Produto</th>
                                    <th>Distribuidora</th>
                                    <th style={{ textAlign: 'right' }}>Preço</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPrices.slice(0, 100).map(price => {
                                    const product = products.find(p => p.id === price.product_id);
                                    const dist = distributors.find(d => d.id === price.distributor_id);
                                    return (
                                        <tr key={price.id}>
                                            <td className="text-muted" style={{ fontSize: '0.85rem' }}>{formatDate(price.recorded_at)}</td>
                                            <td><strong>{product?.name || '-'}</strong></td>
                                            <td>{dist?.name || '-'}</td>
                                            <td style={{ textAlign: 'right' }}><span className="font-bold text-success">{formatCurrency(price.price)}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredPrices.length > 100 && <p className="text-center text-muted mt-lg">Mostrando 100 de {filteredPrices.length} registros</p>}
                </div>
            )}
        </div>
    );
}
