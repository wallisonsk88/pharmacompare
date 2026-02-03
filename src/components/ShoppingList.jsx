import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Plus, Trash2, Package, Building2, Minus, Trash, Download } from 'lucide-react';
import { getProducts, getPrices, getDistributors } from '../config/supabase';

export default function ShoppingList() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [list, setList] = useState(() => {
        const savedList = localStorage.getItem('pharmacompare_shopping_list');
        return savedList ? JSON.parse(savedList) : [];
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        localStorage.setItem('pharmacompare_shopping_list', JSON.stringify(list));
    }, [list]);

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

    const filteredSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.ean && p.ean.includes(searchTerm))
        ).slice(0, 10);
    }, [searchTerm, products]);

    const findBestPrice = (productId) => {
        const productPrices = prices.filter(p => p.product_id === productId);
        if (productPrices.length === 0) return null;

        // Pegar o preço mais recente por distribuidora e depois o mais barato de todos
        const byDistributor = {};
        productPrices.forEach(p => {
            const distId = p.distributor_id;
            if (!byDistributor[distId] || new Date(p.recorded_at) > new Date(byDistributor[distId].recorded_at)) {
                byDistributor[distId] = p;
            }
        });

        return Object.values(byDistributor).sort((a, b) => a.price - b.price)[0];
    };

    const addToList = (product) => {
        const bestPrice = findBestPrice(product.id);
        if (!bestPrice) {
            alert('Nenhum preço cadastrado para este produto.');
            return;
        }

        const existingItem = list.find(item => item.product_id === product.id);
        if (existingItem) {
            updateQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem = {
                product_id: product.id,
                name: product.name,
                ean: product.ean,
                price: bestPrice.price,
                distributor_id: bestPrice.distributor_id,
                distributor_name: bestPrice.distributors?.name || 'N/A',
                quantity: 1
            };
            setList([...list, newItem]);
        }
        setSearchTerm('');
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty < 1) return;
        setList(list.map(item =>
            item.product_id === productId ? { ...item, quantity: newQty } : item
        ));
    };

    const removeFromList = (productId) => {
        setList(list.filter(item => item.product_id !== productId));
    };

    const clearList = () => {
        if (confirm('Deseja limpar toda a lista?')) {
            setList([]);
        }
    };

    const total = list.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state">
                    <ShoppingCart size={48} className="loading-spinner" />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">🛒 Lista de Compras</h1>
                    <p className="page-subtitle">Adicione produtos e encontre os melhores preços automaticamente</p>
                </div>
                {list.length > 0 && (
                    <button className="btn btn-danger" onClick={clearList}>
                        <Trash2 size={18} /> Limpar Lista
                    </button>
                )}
            </div>

            {/* Busca de Produtos */}
            <div className="card mb-lg">
                <div className="search-box" style={{ position: 'relative' }}>
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por nome ou código de barras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>

                    {filteredSuggestions.length > 0 && (
                        <div className="search-suggestions card" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 10,
                            marginTop: '4px',
                            boxShadow: 'var(--shadow-lg)',
                            padding: 'var(--space-sm)'
                        }}>
                            {filteredSuggestions.map(product => (
                                <button
                                    key={product.id}
                                    className="suggestion-item flex items-center gap-md p-sm"
                                    onClick={() => addToList(product)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        padding: 'var(--space-sm)'
                                    }}
                                >
                                    <div className="stat-icon info" style={{ width: 32, height: 32 }}>
                                        <Package size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>EAN: {product.ean || '-'}</div>
                                    </div>
                                    <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {list.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <ShoppingCart size={64} />
                        <h3>Sua lista está vazia</h3>
                        <p>Busque um produto acima para começar sua lista de compras</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-lg)', alignItems: 'start' }}>
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Distribuidor</th>
                                        <th style={{ textAlign: 'center' }}>Preço</th>
                                        <th style={{ textAlign: 'center' }}>Qtd</th>
                                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map(item => (
                                        <tr key={item.product_id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>EAN: {item.ean || '-'}</div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <Building2 size={14} />
                                                    {item.distributor_name}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{formatCurrency(item.price)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="flex items-center justify-center gap-sm">
                                                    <button className="btn btn-ghost p-xs" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>
                                                        <Minus size={14} />
                                                    </button>
                                                    <span style={{ minWidth: '30px', fontWeight: 600 }}>{item.quantity}</span>
                                                    <button className="btn btn-ghost p-xs" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-success)' }}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ color: 'var(--accent-danger)' }}
                                                    onClick={() => removeFromList(item.product_id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title mb-lg">Resumo da Compra</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div className="flex justify-between">
                                <span className="text-muted">Itens:</span>
                                <span style={{ fontWeight: 600 }}>{list.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Total Unidades:</span>
                                <span style={{ fontWeight: 600 }}>{list.reduce((sum, item) => sum + item.quantity, 0)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
                                <div className="flex justify-between items-end">
                                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Geral</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>
                            <button className="btn btn-primary w-full mt-lg" onClick={() => window.print()}>
                                <Download size={18} /> Exportar / Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
