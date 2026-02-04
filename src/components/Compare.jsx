import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Package, Building2, ArrowDownRight, Zap, Plus, Edit2, X, Check, Trash2 } from 'lucide-react';
import { getProducts, getPrices, getDistributors, createPrice, updatePrice, deletePrice } from '../config/supabase';

export default function Compare() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Estados para edição de preços
    const [editingPrice, setEditingPrice] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [addingPriceProduct, setAddingPriceProduct] = useState(null);
    const [newPriceDistributor, setNewPriceDistributor] = useState('');
    const [newPriceValue, setNewPriceValue] = useState('');
    const [saving, setSaving] = useState(false);

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

    // Distribuidoras que ainda não têm preço para o produto
    const getAvailableDistributors = (productId) => {
        const productPrices = getProductPrices(productId);
        const usedDistIds = productPrices.map(p => p.distributor_id);
        return distributors.filter(d => !usedDistIds.includes(d.id));
    };

    // Handlers de edição
    const handleStartEdit = (price) => {
        setEditingPrice(price.id);
        setEditValue(price.price.toString().replace('.', ','));
    };

    const handleSaveEdit = async (price) => {
        const newValue = parseFloat(editValue.replace(',', '.'));
        if (isNaN(newValue) || newValue <= 0) {
            alert('Valor inválido');
            return;
        }
        setSaving(true);
        try {
            await updatePrice(price.id, { price: newValue });
            await loadData();
            setEditingPrice(null);
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar preço');
        }
        setSaving(false);
    };

    const handleDeletePrice = async (priceId) => {
        if (!confirm('Excluir este preço?')) return;
        try {
            await deletePrice(priceId);
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir');
        }
    };

    const handleAddPrice = async (productId) => {
        if (!newPriceDistributor || !newPriceValue) return;
        const priceVal = parseFloat(newPriceValue.replace(',', '.'));
        if (isNaN(priceVal) || priceVal <= 0) {
            alert('Valor inválido');
            return;
        }
        setSaving(true);
        try {
            await createPrice({
                product_id: productId,
                distributor_id: newPriceDistributor,
                price: priceVal,
                min_quantity: 1,
                validity: null
            });
            await loadData();
            setAddingPriceProduct(null);
            setNewPriceDistributor('');
            setNewPriceValue('');
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar preço');
        }
        setSaving(false);
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
        <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Cabeçalho Fixo */}
            <div className="compare-header" style={{ flexShrink: 0 }}>
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
            </div>

            {/* Lista de Produtos com Scroll */}
            <div className="compare-products-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-lg)' }}>
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
                        {filteredProducts.slice(0, 50).map(product => {
                            const productPrices = getProductPrices(product.id);
                            const bestPrice = productPrices[0];
                            const worstPrice = productPrices[productPrices.length - 1];
                            const saving = productPrices.length > 1 ? worstPrice.price - bestPrice.price : 0;
                            const availableDistributors = getAvailableDistributors(product.id);

                            return (
                                <div key={product.id} className="product-card">
                                    <div className="product-header">
                                        <div>
                                            <div className="product-name">{product.name}</div>
                                            {product.ean && (
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>EAN: {product.ean}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {saving > 0 && (
                                                <div className="saving-badge">
                                                    <ArrowDownRight size={16} />
                                                    Economia de {formatCurrency(saving)}
                                                </div>
                                            )}
                                            {availableDistributors.length > 0 && (
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => setAddingPriceProduct(addingPriceProduct === product.id ? null : product.id)}
                                                    title="Adicionar preço de outra distribuidora"
                                                    style={{ padding: '4px 8px' }}
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Formulário de adicionar preço */}
                                    {addingPriceProduct === product.id && (
                                        <div style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: 'var(--space-md)',
                                            display: 'flex',
                                            gap: 'var(--space-md)',
                                            alignItems: 'center',
                                            flexWrap: 'wrap'
                                        }}>
                                            <select
                                                className="form-select"
                                                value={newPriceDistributor}
                                                onChange={(e) => setNewPriceDistributor(e.target.value)}
                                                style={{ minWidth: 200 }}
                                            >
                                                <option value="">Selecione a distribuidora...</option>
                                                {availableDistributors.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>R$</span>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="0,00"
                                                    value={newPriceValue}
                                                    onChange={(e) => setNewPriceValue(e.target.value)}
                                                    style={{ width: 100 }}
                                                />
                                            </div>
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleAddPrice(product.id)}
                                                disabled={saving || !newPriceDistributor || !newPriceValue}
                                            >
                                                <Check size={16} /> Adicionar
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => {
                                                    setAddingPriceProduct(null);
                                                    setNewPriceDistributor('');
                                                    setNewPriceValue('');
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {productPrices.length === 0 ? (
                                        <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
                                            Nenhum preço cadastrado para este produto
                                        </div>
                                    ) : (
                                        <div className="product-prices">
                                            {productPrices.map((price, idx) => (
                                                <div
                                                    key={price.id}
                                                    className={`price-card ${idx === 0 ? 'best' : ''}`}
                                                    style={{
                                                        position: 'relative',
                                                        border: idx === 0 ? '2px solid var(--accent-success)' : undefined,
                                                        background: idx === 0 ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)' : undefined
                                                    }}
                                                >
                                                    <div className="distributor">
                                                        {price.distributors?.name || 'Distribuidora'}
                                                    </div>
                                                    <div className="price-value">
                                                        {editingPrice === price.id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <span>R$</span>
                                                                <input
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    style={{
                                                                        width: 80,
                                                                        padding: '4px 8px',
                                                                        border: '1px solid var(--border-primary)',
                                                                        borderRadius: '4px',
                                                                        fontSize: '1rem'
                                                                    }}
                                                                    autoFocus
                                                                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(price)}
                                                                />
                                                                <button
                                                                    className="btn btn-ghost"
                                                                    onClick={() => handleSaveEdit(price)}
                                                                    disabled={saving}
                                                                    style={{ padding: '4px' }}
                                                                >
                                                                    <Check size={16} color="var(--accent-success)" />
                                                                </button>
                                                                <button
                                                                    className="btn btn-ghost"
                                                                    onClick={() => setEditingPrice(null)}
                                                                    style={{ padding: '4px' }}
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span style={{ cursor: 'pointer' }} onClick={() => handleStartEdit(price)}>
                                                                    {formatCurrency(price.price)}
                                                                </span>
                                                                {idx === 0 && <span className="best-label">Melhor</span>}
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Botões de ação */}
                                                    {editingPrice !== price.id && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            right: '4px',
                                                            display: 'flex',
                                                            gap: '2px',
                                                            opacity: 0.6
                                                        }}
                                                            className="price-actions"
                                                        >
                                                            <button
                                                                className="btn btn-ghost"
                                                                onClick={() => handleStartEdit(price)}
                                                                style={{ padding: '2px' }}
                                                                title="Editar preço"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost"
                                                                onClick={() => handleDeletePrice(price.id)}
                                                                style={{ padding: '2px', color: 'var(--accent-danger)' }}
                                                                title="Excluir preço"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
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
        </div>
    );
}
