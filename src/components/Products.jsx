import React, { useState, useEffect } from 'react';
import { Package, Trash2, Search, AlertTriangle, Loader, X, Building2, Plus, DollarSign } from 'lucide-react';
import { getProducts, getPrices, getDistributors, deleteProduct, deletePrice, createProduct, createPrice } from '../config/supabase';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [showDeleteDistModal, setShowDeleteDistModal] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddPriceModal, setShowAddPriceModal] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states
    const [newProductName, setNewProductName] = useState('');
    const [newPriceValue, setNewPriceValue] = useState('');
    const [newPriceDistributor, setNewPriceDistributor] = useState('');

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

    const handleAddProduct = async () => {
        if (!newProductName.trim()) return;
        setSaving(true);
        try {
            await createProduct({ name: newProductName.trim(), ean: '', manufacturer: '', category: 'generico', unit: 'cx' });
            await loadData();
            setNewProductName('');
            setShowAddModal(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao criar produto');
        }
        setSaving(false);
    };

    const handleAddPrice = async () => {
        if (!newPriceValue || !newPriceDistributor) return;
        const priceVal = parseFloat(newPriceValue.replace(',', '.'));
        if (isNaN(priceVal) || priceVal <= 0) {
            alert('Valor inválido');
            return;
        }
        setSaving(true);
        try {
            await createPrice({
                product_id: showAddPriceModal.id,
                distributor_id: newPriceDistributor,
                price: priceVal,
                min_quantity: 1,
                validity: null
            });
            await loadData();
            setNewPriceValue('');
            setNewPriceDistributor('');
            setShowAddPriceModal(null);
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar preço');
        }
        setSaving(false);
    };

    const handleDeleteProduct = async (product) => {
        setDeleting(true);
        try {
            const productPrices = prices.filter(p => p.product_id === product.id);
            for (const price of productPrices) {
                await deletePrice(price.id);
            }
            await deleteProduct(product.id);
            await loadData();
            setShowDeleteModal(null);
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir produto');
        }
        setDeleting(false);
    };

    const handleDeleteAllFromDistributor = async (distributor) => {
        setDeleting(true);
        try {
            const distPrices = prices.filter(p => p.distributor_id === distributor.id);
            for (const price of distPrices) {
                await deletePrice(price.id);
            }
            await loadData();
            setShowDeleteDistModal(null);
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir preços');
        }
        setDeleting(false);
    };

    const handleDeleteAllProducts = async () => {
        if (!confirm('⚠️ ATENÇÃO: Isso vai excluir TODOS os produtos e preços! Tem certeza?')) return;
        if (!confirm('Essa ação é IRREVERSÍVEL. Confirma?')) return;

        setDeleting(true);
        try {
            for (const price of prices) {
                await deletePrice(price.id);
            }
            for (const product of products) {
                await deleteProduct(product.id);
            }
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir');
        }
        setDeleting(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPriceCount = (productId) => prices.filter(p => p.product_id === productId).length;
    const getDistPriceCount = (distId) => prices.filter(p => p.distributor_id === distId).length;

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state">
                    <Loader size={48} className="loading" />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">📦 Gerenciar Produtos</h1>
                    <p className="page-subtitle">Adicione, edite ou exclua produtos e preços</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> Novo Produto
                </button>
            </div>

            {/* Excluir por Distribuidora */}
            <div className="card mb-lg">
                <h3 className="card-title flex items-center gap-sm mb-lg">
                    <Building2 size={20} />
                    Excluir Tabela de Distribuidora
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {distributors.map(dist => {
                        const count = getDistPriceCount(dist.id);
                        return (
                            <div key={dist.id} className="stat-card">
                                <div className="stat-icon orange"><Building2 size={20} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{dist.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{count} preço(s)</div>
                                </div>
                                {count > 0 && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px', color: 'var(--danger)' }}
                                        onClick={() => setShowDeleteDistModal(dist)}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {products.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border)' }}>
                        <button
                            className="btn"
                            style={{ background: 'var(--danger)', color: 'white' }}
                            onClick={handleDeleteAllProducts}
                            disabled={deleting}
                        >
                            <Trash2 size={18} /> Excluir TUDO
                        </button>
                    </div>
                )}
            </div>

            {/* Busca e Lista de Produtos */}
            <div className="card">
                <div className="flex gap-md items-center mb-lg">
                    <Search size={20} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1 }}
                    />
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <Package size={64} />
                        <h3>Nenhum produto encontrado</h3>
                        <p>Clique em "Novo Produto" para adicionar manualmente</p>
                    </div>
                ) : (
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preços</th>
                                <th style={{ width: 120 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.slice(0, 50).map(product => (
                                <tr key={product.id}>
                                    <td><strong>{product.name}</strong></td>
                                    <td>{getPriceCount(product.id)}</td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '6px' }}
                                                onClick={() => setShowAddPriceModal(product)}
                                                title="Adicionar preço"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '6px', color: 'var(--danger)' }}
                                                onClick={() => setShowDeleteModal(product)}
                                                title="Excluir produto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Adicionar Produto */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0 }}><Plus size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Novo Produto</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome do Produto</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ex: Dipirona 500mg"
                                value={newProductName}
                                onChange={(e) => setNewProductName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddProduct()}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-md mt-lg">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleAddProduct} disabled={saving || !newProductName.trim()} style={{ flex: 1 }}>
                                {saving ? 'Salvando...' : 'Criar Produto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Preço */}
            {showAddPriceModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0 }}><DollarSign size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Adicionar Preço</h3>
                            <button onClick={() => setShowAddPriceModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Produto: <strong>{showAddPriceModal.name}</strong></p>
                        <div className="form-group">
                            <label className="form-label">Distribuidora</label>
                            <select
                                className="form-select"
                                value={newPriceDistributor}
                                onChange={(e) => setNewPriceDistributor(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preço (R$)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ex: 12,50"
                                value={newPriceValue}
                                onChange={(e) => setNewPriceValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddPrice()}
                            />
                        </div>
                        <div className="flex gap-md mt-lg">
                            <button className="btn btn-secondary" onClick={() => setShowAddPriceModal(null)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleAddPrice} disabled={saving || !newPriceValue || !newPriceDistributor} style={{ flex: 1 }}>
                                {saving ? 'Salvando...' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir Produto */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0, color: 'var(--danger)' }}><AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Excluir Produto</h3>
                            <button onClick={() => setShowDeleteModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <p>Excluir <strong>"{showDeleteModal.name}"</strong> e seus {getPriceCount(showDeleteModal.id)} preço(s)?</p>
                        <div className="flex gap-md mt-lg">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={() => handleDeleteProduct(showDeleteModal)} disabled={deleting}>
                                {deleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Excluir Distribuidora */}
            {showDeleteDistModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0, color: 'var(--danger)' }}><AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Excluir Tabela</h3>
                            <button onClick={() => setShowDeleteDistModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <p>Excluir <strong>TODOS os {getDistPriceCount(showDeleteDistModal.id)} preços</strong> da distribuidora <strong>"{showDeleteDistModal.name}"</strong>?</p>
                        <div className="flex gap-md mt-lg">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteDistModal(null)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={() => handleDeleteAllFromDistributor(showDeleteDistModal)} disabled={deleting}>
                                {deleting ? 'Excluindo...' : 'Excluir Todos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
