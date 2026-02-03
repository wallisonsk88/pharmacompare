import React, { useState, useEffect } from 'react';
import {
    Scale,
    Search,
    TrendingDown,
    TrendingUp,
    Package,
    Building2,
    Award,
    AlertTriangle
} from 'lucide-react';
import { getProducts, getPricesByProduct, getDistributors } from '../config/supabase';

export default function Compare() {
    const [products, setProducts] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [priceComparison, setPriceComparison] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [productsData, distributorsData] = await Promise.all([
                getProducts(),
                getDistributors()
            ]);
            setProducts(productsData);
            setDistributors(distributorsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProductSelect = async (product) => {
        setSelectedProduct(product);
        setComparing(true);

        try {
            const prices = await getPricesByProduct(product.id);

            // Agrupar por distribuidora e pegar o preço mais recente
            const distributorPrices = {};
            prices.forEach(price => {
                const distId = price.distributor_id;
                if (!distributorPrices[distId] || new Date(price.recorded_at) > new Date(distributorPrices[distId].recorded_at)) {
                    distributorPrices[distId] = price;
                }
            });

            // Converter para array e ordenar por preço
            const comparisonData = Object.values(distributorPrices)
                .sort((a, b) => a.price - b.price)
                .map((price, index, arr) => ({
                    ...price,
                    isBest: index === 0,
                    isWorst: index === arr.length - 1 && arr.length > 1,
                    savings: index === 0 ? 0 : price.price - arr[0].price,
                    savingsPercent: index === 0 ? 0 : ((price.price - arr[0].price) / arr[0].price * 100)
                }));

            setPriceComparison(comparisonData);
        } catch (error) {
            console.error('Erro ao comparar preços:', error);
        } finally {
            setComparing(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ean && p.ean.includes(searchTerm))
    );

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state loading">
                    <Scale size={64} />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Comparar Preços</h1>
                <p className="page-subtitle">Compare preços do mesmo medicamento entre diferentes distribuidoras</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--spacing-lg)' }}>
                {/* Lista de Produtos */}
                <div className="card" style={{ height: 'fit-content', maxHeight: 'calc(100vh - 200px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 className="card-title mb-md">Selecione um Medicamento</h3>
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Buscar medicamento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', marginTop: 'var(--spacing-md)' }}>
                        {filteredProducts.length === 0 ? (
                            <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                                <Package size={48} />
                                <p style={{ fontSize: '0.875rem' }}>Nenhum medicamento encontrado</p>
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`nav-item ${selectedProduct?.id === product.id ? 'active' : ''}`}
                                    onClick={() => handleProductSelect(product)}
                                    style={{ marginBottom: 'var(--spacing-xs)' }}
                                >
                                    <Package size={18} />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {product.name}
                                        </div>
                                        {product.manufacturer && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {product.manufacturer}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Resultado da Comparação */}
                <div className="card">
                    {!selectedProduct ? (
                        <div className="empty-state">
                            <Scale size={64} />
                            <h3>Selecione um medicamento</h3>
                            <p>Escolha um medicamento na lista ao lado para comparar preços entre distribuidoras</p>
                        </div>
                    ) : comparing ? (
                        <div className="empty-state loading">
                            <Scale size={64} />
                            <h3>Comparando preços...</h3>
                        </div>
                    ) : priceComparison.length === 0 ? (
                        <div className="empty-state">
                            <AlertTriangle size={64} />
                            <h3>Sem preços registrados</h3>
                            <p>O medicamento <strong>{selectedProduct.name}</strong> ainda não possui preços cadastrados</p>
                        </div>
                    ) : (
                        <>
                            <div className="card-header">
                                <div>
                                    <h3 className="card-title">{selectedProduct.name}</h3>
                                    <p className="card-subtitle">{priceComparison.length} distribuidora(s) com preço registrado</p>
                                </div>
                                {priceComparison.length > 1 && (
                                    <div className="stat-card" style={{ padding: 'var(--spacing-md)', margin: 0 }}>
                                        <div className="stat-icon accent" style={{ width: 40, height: 40 }}>
                                            <TrendingDown size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Economia máxima</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)' }}>
                                                {formatCurrency(priceComparison[priceComparison.length - 1].savings)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: 'var(--spacing-lg)' }}>
                                {priceComparison.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="card"
                                        style={{
                                            marginBottom: 'var(--spacing-md)',
                                            borderColor: item.isBest ? 'var(--success)' : item.isWorst ? 'var(--error)' : undefined,
                                            background: item.isBest ? 'rgba(34, 197, 94, 0.05)' : undefined
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-md">
                                                <div
                                                    className="stat-icon"
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        background: item.isBest ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                                        color: item.isBest ? 'var(--success)' : 'var(--primary-400)'
                                                    }}
                                                >
                                                    {item.isBest ? <Award size={24} /> : <Building2 size={24} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                                                        {item.distributors?.name || 'Distribuidora'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        Registrado em {formatDate(item.recorded_at)}
                                                    </div>
                                                    {item.min_quantity > 1 && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                            Quantidade mínima: {item.min_quantity}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div
                                                    className="price-highlight"
                                                    style={{
                                                        fontSize: '1.5rem',
                                                        color: item.isBest ? 'var(--success)' : item.isWorst ? 'var(--error)' : 'var(--text-primary)'
                                                    }}
                                                >
                                                    {formatCurrency(item.price)}
                                                </div>
                                                {!item.isBest && (
                                                    <div className="price-change up">
                                                        <TrendingUp size={12} />
                                                        +{formatCurrency(item.savings)} ({item.savingsPercent.toFixed(1)}%)
                                                    </div>
                                                )}
                                                {item.isBest && priceComparison.length > 1 && (
                                                    <span className="badge badge-success">Melhor Preço</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
