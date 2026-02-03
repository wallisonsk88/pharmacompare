import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Package, Building2, ArrowRight } from 'lucide-react';
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

    // Agrupar preços por produto - pegar apenas o mais recente de cada distribuidora
    const getProductPrices = (productId) => {
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

    // Calcular estatísticas
    const stats = {
        totalProducts: products.length,
        productsWithPrices: products.filter(p => prices.some(pr => pr.product_id === p.id)).length,
        totalSavings: 0
    };

    products.forEach(p => {
        const pPrices = getProductPrices(p.id);
        if (pPrices.length > 1) {
            stats.totalSavings += pPrices[pPrices.length - 1].price - pPrices[0].price;
        }
    });

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state">
                    <Package size={48} className="loading" />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            {/* Hero de Busca */}
            <div className="search-hero">
                <h2>🔍 Encontre o Melhor Preço</h2>
                <p>Digite o nome do medicamento para comparar preços entre distribuidoras</p>
                <div className="search-box">
                    <input
                        type="text"
                        className="search-input-large"
                        placeholder="Buscar medicamento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Estatísticas */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                        <div className="stat-value">{stats.totalProducts}</div>
                        <div className="stat-label">Medicamentos</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Building2 size={24} /></div>
                    <div>
                        <div className="stat-value">{stats.productsWithPrices}</div>
                        <div className="stat-label">Com Preços</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><TrendingDown size={24} /></div>
                    <div>
                        <div className="stat-value">{formatCurrency(stats.totalSavings)}</div>
                        <div className="stat-label">Economia Possível</div>
                    </div>
                </div>
            </div>

            {/* Lista de Produtos */}
            {filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Package size={64} />
                        <h3>Nenhum medicamento encontrado</h3>
                        <p>Importe tabelas de preços para começar a comparar</p>
                    </div>
                </div>
            ) : (
                <div className="product-list">
                    {filteredProducts.map(product => {
                        const productPrices = getProductPrices(product.id);
                        const bestPrice = productPrices[0];
                        const worstPrice = productPrices[productPrices.length - 1];
                        const saving = productPrices.length > 1 ? worstPrice.price - bestPrice.price : 0;

                        return (
                            <div key={product.id} className="product-item">
                                <div className="product-item-header">
                                    <div className="product-name">{product.name}</div>
                                    {saving > 0 && (
                                        <div className="saving-indicator">
                                            <TrendingDown size={16} />
                                            Economia de {formatCurrency(saving)}
                                        </div>
                                    )}
                                </div>

                                {productPrices.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>Sem preços cadastrados</p>
                                ) : (
                                    <div className="product-prices">
                                        {productPrices.map((price, idx) => (
                                            <div key={price.id} className={`price-option ${idx === 0 ? 'best' : ''}`}>
                                                <div className="distributor-name">
                                                    {price.distributors?.name || 'Distribuidora'}
                                                </div>
                                                <div className="price-value">
                                                    {formatCurrency(price.price)}
                                                    {idx === 0 && <span className="best-badge">MELHOR</span>}
                                                </div>
                                            </div>
                                        ))}
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
