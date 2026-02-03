import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, TrendingUp, Package, Building2, DollarSign } from 'lucide-react';
import { getProducts, getPrices } from '../config/supabase';

export default function Compare() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prods, allPrices] = await Promise.all([getProducts(), getPrices()]);
            setProducts(prods);
            setPrices(allPrices);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Filtrar produtos pela busca
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar preços por produto
    const getProductPrices = (productId) => {
        // Pegar o preço mais recente de cada distribuidora
        const productPrices = prices.filter(p => p.product_id === productId);
        const byDistributor = {};

        productPrices.forEach(p => {
            const distId = p.distributor_id;
            if (!byDistributor[distId] || new Date(p.recorded_at) > new Date(byDistributor[distId].recorded_at)) {
                byDistributor[distId] = p;
            }
        });

        return Object.values(byDistributor).sort((a, b) => a.price - b.price);
    };

    if (loading) {
        return <div className="main-content"><div className="empty-state"><Package size={48} /><h3>Carregando...</h3></div></div>;
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Comparar Preços</h1>
                <p className="page-subtitle">Veja qual distribuidora tem o melhor preço</p>
            </div>

            {/* Busca */}
            <div className="card mb-lg">
                <div className="search-container">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar medicamento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de Comparações */}
            {filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Package size={48} />
                        <h3>Nenhum medicamento encontrado</h3>
                        <p>Importe tabelas de preços para começar a comparar</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {filteredProducts.map(product => {
                        const productPrices = getProductPrices(product.id);
                        const bestPrice = productPrices[0];
                        const worstPrice = productPrices[productPrices.length - 1];
                        const saving = productPrices.length > 1 ? worstPrice.price - bestPrice.price : 0;

                        return (
                            <div key={product.id} className="card">
                                <div className="flex items-center justify-between mb-md">
                                    <h3 className="card-title" style={{ margin: 0 }}>{product.name}</h3>
                                    {saving > 0 && (
                                        <span className="badge badge-success">
                                            <TrendingDown size={14} /> Economia de {formatCurrency(saving)}
                                        </span>
                                    )}
                                </div>

                                {productPrices.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)' }}>Sem preços cadastrados</p>
                                ) : (
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th><Building2 size={14} style={{ verticalAlign: 'middle' }} /> Distribuidora</th>
                                                    <th><DollarSign size={14} style={{ verticalAlign: 'middle' }} /> Preço</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productPrices.map((price, idx) => (
                                                    <tr key={price.id}>
                                                        <td>{price.distributors?.name || 'Distribuidora'}</td>
                                                        <td className="price-highlight">{formatCurrency(price.price)}</td>
                                                        <td>
                                                            {idx === 0 ? (
                                                                <span className="badge badge-success"><TrendingDown size={12} /> Melhor Preço</span>
                                                            ) : idx === productPrices.length - 1 && productPrices.length > 1 ? (
                                                                <span className="badge badge-error"><TrendingUp size={12} /> Mais Caro</span>
                                                            ) : null}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
