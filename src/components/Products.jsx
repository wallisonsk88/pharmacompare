import React, { useState, useEffect } from 'react';
import { Package, Trash2, Search, AlertTriangle, Loader, X, Building2, Plus, DollarSign, Edit2 } from 'lucide-react';
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
        } catch (e) { console.error(e); alert('Erro ao criar produto'); }
        setSaving(false);
    };

    const handleAddPrice = async () => {
        if (!newPriceValue || !newPriceDistributor) return;
        const priceVal = parseFloat(newPriceValue.replace(',', '.'));
        if (isNaN(priceVal) || priceVal <= 0) { alert('Valor inválido'); return; }
        setSaving(true);
        try {
            await createPrice({ product_id: showAddPriceModal.id, distributor_id: newPriceDistributor, price: priceVal, min_quantity: 1, validity: null });
            await loadData();
            setNewPriceValue(''); setNewPriceDistributor(''); setShowAddPriceModal(null);
        } catch (e) { console.error(e); alert('Erro ao adicionar preço'); }
        setSaving(false);
    };

    const handleDeleteProduct = async (product) => {
        setDeleting(true);
        try {
            const productPrices = prices.filter(p => p.product_id === product.id);
            for (const price of productPrices) await deletePrice(price.id);
            await deleteProduct(product.id);
            await loadData();
            setShowDeleteModal(null);
        } catch (e) { console.error(e); alert('Erro ao excluir'); }
        setDeleting(false);
    };

    const handleDeleteAllFromDistributor = async (distributor) => {
        setDeleting(true);
        try {
            const distPrices = prices.filter(p => p.distributor_id === distributor.id);
            for (const price of distPrices) await deletePrice(price.id);
            await loadData();
            setShowDeleteDistModal(null);
        } catch (e) { console.error(e); alert('Erro ao excluir'); }
        setDeleting(false);
    };

    const handleDeleteAll = async () => {
        if (!confirm('⚠️ Excluir TODOS os produtos e preços?')) return;
        if (!confirm('Essa ação é IRREVERSÍVEL!')) return;
        setDeleting(true);
        try {
            for (const price of prices) await deletePrice(price.id);
            for (const product of products) await deleteProduct(product.id);
            await loadData();
        } catch (e) { console.error(e); alert('Erro'); }
        setDeleting(false);
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const getPriceCount = (productId) => prices.filter(p => p.product_id === productId).length;
    const getDistPriceCount = (distId) => prices.filter(p => p.distributor_id === distId).length;

    if (loading) return <div className="main-content"><div className="empty-state"><Loader size={48} className="loading-spinner" /><h3>Carregando...</h3></div></div>;

    const Modal = ({ children, onClose }) => (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>{children}</div>
        </div>
    );

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
                <h3 className="card-title mb-lg"><Building2 size={20} /> Excluir Tabela de Distribuidora</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
                    {distributors.map(dist => (
                        <div key={dist.id} className="stat-card">
                            <div className="stat-icon warning"><Building2 size={20} /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{dist.name}</div>
                                <div className="text-muted" style={{ fontSize: '0.85rem' }}>{getDistPriceCount(dist.id)} preço(s)</div>
                            </div>
                            {getDistPriceCount(dist.id) > 0 && (
                                <button className="btn btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => setShowDeleteDistModal(dist)}><Trash2 size={18} /></button>
                            )}
                        </div>
                    ))}
                </div>
                {products.length > 0 && (
                    <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-primary)' }}>
                        <button className="btn btn-danger" onClick={handleDeleteAll} disabled={deleting}><Trash2 size={18} /> Excluir TUDO</button>
                    </div>
                )}
            </div>

            {/* Busca */}
            <div className="card mb-lg">
                <div className="flex gap-md items-center">
                    <Search size={20} style={{ color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
                </div>
            </div>

            {/* Lista */}
            {filteredProducts.length === 0 ? (
                <div className="card"><div className="empty-state"><Package size={64} /><h3>Nenhum produto</h3><p>Clique em "Novo Produto" para adicionar</p></div></div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Produto</th><th>Preços</th><th style={{ width: 130 }}>Ações</th></tr></thead>
                            <tbody>
                                {filteredProducts.slice(0, 50).map(product => (
                                    <tr key={product.id}>
                                        <td><strong>{product.name}</strong></td>
                                        <td><span className="badge badge-primary">{getPriceCount(product.id)}</span></td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button className="btn btn-ghost" onClick={() => setShowAddPriceModal(product)} title="Adicionar preço"><DollarSign size={16} /></button>
                                                <button className="btn btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => setShowDeleteModal(product)} title="Excluir"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Novo Produto */}
            {showAddModal && (
                <Modal onClose={() => setShowAddModal(false)}>
                    <div className="modal-header">
                        <h3 className="modal-title"><Plus size={20} /> Novo Produto</h3>
                        <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nome do Produto</label>
                        <input type="text" className="form-input" placeholder="Ex: Dipirona 500mg" value={newProductName} onChange={e => setNewProductName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddProduct()} autoFocus />
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleAddProduct} disabled={saving || !newProductName.trim()}>{saving ? 'Salvando...' : 'Criar'}</button>
                    </div>
                </Modal>
            )}

            {/* Modal: Adicionar Preço */}
            {showAddPriceModal && (
                <Modal onClose={() => setShowAddPriceModal(null)}>
                    <div className="modal-header">
                        <h3 className="modal-title"><DollarSign size={20} /> Adicionar Preço</h3>
                        <button className="modal-close" onClick={() => setShowAddPriceModal(null)}><X size={24} /></button>
                    </div>
                    <p className="text-muted mb-md">Produto: <strong style={{ color: 'var(--text-primary)' }}>{showAddPriceModal.name}</strong></p>
                    <div className="form-group">
                        <label className="form-label">Distribuidora</label>
                        <select className="form-select" value={newPriceDistributor} onChange={e => setNewPriceDistributor(e.target.value)}>
                            <option value="">Selecione...</option>
                            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Preço (R$)</label>
                        <input type="text" className="form-input" placeholder="Ex: 12,50" value={newPriceValue} onChange={e => setNewPriceValue(e.target.value)} />
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowAddPriceModal(null)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleAddPrice} disabled={saving || !newPriceValue || !newPriceDistributor}>{saving ? 'Salvando...' : 'Adicionar'}</button>
                    </div>
                </Modal>
            )}

            {/* Modal: Excluir Produto */}
            {showDeleteModal && (
                <Modal onClose={() => setShowDeleteModal(null)}>
                    <div className="modal-header">
                        <h3 className="modal-title" style={{ color: 'var(--accent-danger)' }}><AlertTriangle size={20} /> Excluir Produto</h3>
                        <button className="modal-close" onClick={() => setShowDeleteModal(null)}><X size={24} /></button>
                    </div>
                    <p>Excluir <strong>"{showDeleteModal.name}"</strong> e seus {getPriceCount(showDeleteModal.id)} preço(s)?</p>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>Cancelar</button>
                        <button className="btn btn-danger" onClick={() => handleDeleteProduct(showDeleteModal)} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir'}</button>
                    </div>
                </Modal>
            )}

            {/* Modal: Excluir Distribuidora */}
            {showDeleteDistModal && (
                <Modal onClose={() => setShowDeleteDistModal(null)}>
                    <div className="modal-header">
                        <h3 className="modal-title" style={{ color: 'var(--accent-danger)' }}><AlertTriangle size={20} /> Excluir Tabela</h3>
                        <button className="modal-close" onClick={() => setShowDeleteDistModal(null)}><X size={24} /></button>
                    </div>
                    <p>Excluir <strong>todos os {getDistPriceCount(showDeleteDistModal.id)} preços</strong> da distribuidora <strong>"{showDeleteDistModal.name}"</strong>?</p>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteDistModal(null)}>Cancelar</button>
                        <button className="btn btn-danger" onClick={() => handleDeleteAllFromDistributor(showDeleteDistModal)} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir Todos'}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
