import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, TrendingUp, Package, Building2, ArrowDownRight, Zap } from 'lucide-react';
import { getProducts, getPrices, getDistributors } from '../config/supabase';

export default function Compare() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prods, allPrices, dists] = await Promise.all([
                getProducts(), getPrices(), getDistributors()
            ]);
            setProducts(prods);
            setPrices(allPrices);
            setDistributors(dists);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(v);

    // Filtrar produtos pela busca
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ean && p.ean.includes(searchTerm))
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
        totalDistributors: distributors.length,
        productsWithPrices: 0,
        totalSavings: 0
    };

    products.forEach(p => {
        const pPrices = getProductPrices(p.id);
        if (pPrices.length > 0) stats.productsWithPrices++;
        if (pPrices.length > 1) {
            stats.totalSavings += pPrices[pPrices.length - 1].price - pPrices[0].price;
        }
    });

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state">
                    <Package size={48} className="loading-spinner" />
                    <h3>Carregando dados...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            {/* Hero de Busca */}
            <div className="search-hero">
                <h1>🔍 Comparar Preços</h1>
                <p>Encontre o melhor preço entre todas as distribuidoras em tempo real</p>
                <div className="search-box">
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            className="search-input-large"
                            placeholder="Digite o nome do medicamento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            </div>

            {/* Estatísticas */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary"><Package size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalProducts}</div>
                        <div className="stat-label">Produtos Cadastrados</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info"><Building2 size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalDistributors}</div>
                        <div className="stat-label">Distribuidoras</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning"><Zap size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.productsWithPrices}</div>
                        <div className="stat-label">Com Preços Ativos</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><TrendingDown size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{formatCurrency(stats.totalSavings)}</div>
                        <div className="stat-label">Economia Potencial</div>
                    </div>
                </div>
            </div>

            {/* Lista de Produtos com Comparação */}
            {filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Package size={64} />
                        <h3>Nenhum produto encontrado</h3>
                        <p style={{ marginTop: '8px' }}>
                            {products.length === 0
                                ? 'Importe tabelas de preços para começar a comparar'
                                : 'Tente buscar por outro termo'
                            }
                        </p>
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
                            <div key={product.id} className="product-card">
                                <div className="product-header">
                                    <div>
                                        <div className="product-name">{product.name}</div>
                                        {product.ean && (
                                            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>EAN: {product.ean}</div>
                                        )}
                                    </div>
                                    {saving > 0 && (
                                        <div className="saving-badge">
                                            <ArrowDownRight size={16} />
                                            Economia de {formatCurrency(saving)}
                                        </div>
                                    )}
                                </div>

                                {productPrices.length === 0 ? (
                                    <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
                                        Nenhum preço cadastrado para este produto
                                    </div>
                                ) : (
                                    <div className="product-prices">
                                        {productPrices.map((price, idx) => (
                                            <div key={price.id} className={`price-card ${idx === 0 ? 'best' : ''}`}>
                                                <div className="distributor">
                                                    {price.distributors?.name || 'Distribuidora'}
                                                </div>
                                                <div className="price-value">
                                                    {formatCurrency(price.price)}
                                                    {idx === 0 && <span className="best-label">Melhor</span>}
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
