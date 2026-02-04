import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Plus, Trash2, Package, Building2, Minus, Download, Save, Edit2, Check, X } from 'lucide-react';
import { getProducts, getPrices, getDistributors, createPrice, getShoppingList, addShoppingItem, updateShoppingItem, deleteShoppingItem, clearShoppingList } from '../config/supabase';

export default function ShoppingList() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [list, setList] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Carregar dados principais primeiro
            const [prods, allPrices, dists] = await Promise.all([
                getProducts(), getPrices(), getDistributors()
            ]);
            setProducts(prods || []);
            setPrices(allPrices || []);
            setDistributors(dists || []);

            // Tentar carregar lista de compras separadamente (pode falhar se tabela não existir)
            try {
                const shoppingList = await getShoppingList();
                if (shoppingList && shoppingList.length > 0) {
                    const formattedList = shoppingList.map(item => ({
                        id: item.id,
                        product_id: item.product_id,
                        name: item.product_name,
                        ean: item.product_ean,
                        price: item.price || 0,
                        distributor_id: item.distributor_id,
                        distributor_name: item.distributor_name || 'Selecione',
                        last_price: item.last_price,
                        last_distributor: item.last_distributor,
                        quantity: item.quantity || 1
                    }));
                    setList(formattedList);
                }
            } catch (listError) {
                console.warn('Tabela shopping_list não encontrada, usando lista local:', listError.message);
                // Fallback para localStorage
                const savedList = localStorage.getItem('pharmacompare_shopping_list');
                if (savedList) setList(JSON.parse(savedList));
            }
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
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

    const findProductByEan = (ean) => {
        const cleanEan = ean.replace(/\D/g, '');
        return products.find(p => p.ean && p.ean === cleanEan);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && searchTerm.length >= 2) {
            const productByEan = findProductByEan(searchTerm);
            if (productByEan) {
                addToList(productByEan);
                return;
            }
            if (filteredSuggestions.length >= 1) {
                addToList(filteredSuggestions[0]);
            }
        }
    };

    const getLastPrice = (productId) => {
        const productPrices = prices.filter(p => p.product_id === productId);
        if (productPrices.length === 0) return null;
        const sorted = productPrices.sort((a, b) =>
            new Date(b.recorded_at) - new Date(a.recorded_at)
        );
        return sorted[0];
    };

    const addToList = async (product) => {
        const lastPrice = getLastPrice(product.id);
        const existingItem = list.find(item => item.product_id === product.id);

        if (existingItem) {
            // Atualizar quantidade
            const newQty = existingItem.quantity + 1;
            try {
                await updateShoppingItem(existingItem.id, { ...existingItem, quantity: newQty });
                setList(list.map(item =>
                    item.product_id === product.id ? { ...item, quantity: newQty } : item
                ));
            } catch (e) { console.error(e); }
        } else {
            // Adicionar novo item
            const newItem = {
                product_id: product.id,
                name: product.name,
                ean: product.ean,
                price: lastPrice ? lastPrice.price : 0,
                distributor_id: lastPrice ? lastPrice.distributor_id : (distributors[0]?.id || null),
                distributor_name: lastPrice ? (lastPrice.distributors?.name || 'N/A') : (distributors[0]?.name || 'Selecione'),
                last_price: lastPrice ? lastPrice.price : null,
                last_distributor: lastPrice ? (lastPrice.distributors?.name || null) : null,
                quantity: 1
            };
            try {
                const savedItem = await addShoppingItem(newItem);
                setList([...list, { ...newItem, id: savedItem.id }]);
            } catch (e) { console.error(e); }
        }
        setSearchTerm('');
    };

    const updateQuantity = async (productId, newQty) => {
        if (newQty < 1) return;
        const item = list.find(i => i.product_id === productId);
        if (item) {
            try {
                await updateShoppingItem(item.id, { ...item, quantity: newQty });
                setList(list.map(i =>
                    i.product_id === productId ? { ...i, quantity: newQty } : i
                ));
            } catch (e) { console.error(e); }
        }
    };

    const removeFromList = async (productId) => {
        const item = list.find(i => i.product_id === productId);
        if (item) {
            try {
                await deleteShoppingItem(item.id);
                setList(list.filter(i => i.product_id !== productId));
            } catch (e) { console.error(e); }
        }
    };

    const clearList = async () => {
        if (confirm('Deseja limpar toda a lista?')) {
            try {
                await clearShoppingList();
                setList([]);
            } catch (e) { console.error(e); }
        }
    };

    const updateDistributor = async (productId, distributorId) => {
        const dist = distributors.find(d => d.id === distributorId);
        const item = list.find(i => i.product_id === productId);
        if (item) {
            try {
                await updateShoppingItem(item.id, {
                    ...item,
                    distributor_id: distributorId,
                    distributor_name: dist?.name || 'N/A'
                });
                setList(list.map(i =>
                    i.product_id === productId ? {
                        ...i,
                        distributor_id: distributorId,
                        distributor_name: dist?.name || 'N/A'
                    } : i
                ));
            } catch (e) { console.error(e); }
        }
    };

    const startEditPrice = (item) => {
        setEditingItem(item.product_id);
        setEditPrice(item.price > 0 ? item.price.toString().replace('.', ',') : '');
    };

    const saveEditPrice = async (productId) => {
        const priceValue = parseFloat(editPrice.replace(',', '.'));
        const item = list.find(i => i.product_id === productId);
        if (!isNaN(priceValue) && priceValue >= 0 && item) {
            try {
                await updateShoppingItem(item.id, { ...item, price: priceValue });
                setList(list.map(i =>
                    i.product_id === productId ? { ...i, price: priceValue } : i
                ));
            } catch (e) { console.error(e); }
        }
        setEditingItem(null);
        setEditPrice('');
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditPrice('');
    };

    const saveAllPrices = async () => {
        const itemsWithPrice = list.filter(item => item.price > 0 && item.distributor_id);

        if (itemsWithPrice.length === 0) {
            alert('Nenhum item com preço e distribuidor para salvar.');
            return;
        }

        setSaving(true);
        let savedCount = 0;
        let errorCount = 0;

        for (const item of itemsWithPrice) {
            try {
                await createPrice({
                    product_id: item.product_id,
                    distributor_id: item.distributor_id,
                    price: item.price
                });
                savedCount++;
            } catch (error) {
                console.error('Erro ao salvar preço:', error);
                errorCount++;
            }
        }

        setSaving(false);

        const allPrices = await getPrices();
        setPrices(allPrices);

        if (errorCount === 0) {
            alert(`✅ ${savedCount} preço(s) salvos com sucesso!\n\nNa próxima lista, esses valores aparecerão como referência.`);
        } else {
            alert(`⚠️ ${savedCount} salvo(s), ${errorCount} erro(s).`);
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                    <h1 className="page-title">🛒 Lista de Compras</h1>
                    <p className="page-subtitle">Lista sincronizada - acesse de qualquer dispositivo</p>
                </div>
                {list.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <button className="btn btn-success" onClick={saveAllPrices} disabled={saving}>
                            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Preços'}
                        </button>
                        <button className="btn btn-danger" onClick={clearList}>
                            <Trash2 size={18} /> Limpar
                        </button>
                    </div>
                )}
            </div>

            <div className="card mb-lg">
                <div className="search-box" style={{ position: 'relative' }}>
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Bipe o código ou digite e pressione Enter..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{ paddingLeft: '40px' }}
                            autoFocus
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
                            {filteredSuggestions.map(product => {
                                const lastPrice = getLastPrice(product.id);
                                return (
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
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {lastPrice ? (
                                                    <span style={{ color: 'var(--accent-success)' }}>
                                                        Último: {formatCurrency(lastPrice.price)} em {lastPrice.distributors?.name || 'N/A'}
                                                    </span>
                                                ) : (
                                                    <span>EAN: {product.ean || '-'}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
                                    </button>
                                );
                            })}
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
                <div className="shopping-layout">
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
                                                {item.last_price && (
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-info)' }}>
                                                        Último: {formatCurrency(item.last_price)} ({item.last_distributor})
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select"
                                                    value={item.distributor_id || ''}
                                                    onChange={(e) => updateDistributor(item.product_id, e.target.value)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '0.85rem',
                                                        minWidth: '120px'
                                                    }}
                                                >
                                                    <option value="">Selecione</option>
                                                    {distributors.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingItem === item.product_id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem' }}>R$</span>
                                                        <input
                                                            type="text"
                                                            value={editPrice}
                                                            onChange={(e) => setEditPrice(e.target.value)}
                                                            onKeyPress={(e) => e.key === 'Enter' && saveEditPrice(item.product_id)}
                                                            className="form-input"
                                                            style={{
                                                                width: '70px',
                                                                padding: '4px 8px',
                                                                fontSize: '0.85rem',
                                                                textAlign: 'right'
                                                            }}
                                                            autoFocus
                                                        />
                                                        <button className="btn btn-ghost p-xs" onClick={() => saveEditPrice(item.product_id)} style={{ color: 'var(--accent-success)' }}>
                                                            <Check size={14} />
                                                        </button>
                                                        <button className="btn btn-ghost p-xs" onClick={cancelEdit} style={{ color: 'var(--accent-danger)' }}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditPrice(item)}
                                                        style={{
                                                            background: 'none',
                                                            border: '1px dashed var(--border-secondary)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            padding: '4px 12px',
                                                            cursor: 'pointer',
                                                            color: item.price > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {item.price > 0 ? formatCurrency(item.price) : 'Informar'}
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                            </td>
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
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: item.price > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                                                {item.price > 0 ? formatCurrency(item.price * item.quantity) : '-'}
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
                            <div className="flex justify-between">
                                <span className="text-muted">Com preço:</span>
                                <span style={{ fontWeight: 600 }}>{list.filter(i => i.price > 0).length}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
                                <div className="flex justify-between items-end">
                                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Geral</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>
                            <button className="btn btn-success w-full mt-lg" onClick={saveAllPrices} disabled={saving}>
                                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Preços'}
                            </button>
                            <button className="btn btn-primary w-full" onClick={() => window.print()}>
                                <Download size={18} /> Exportar / Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
