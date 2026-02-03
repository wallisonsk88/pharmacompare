import React, { useState, useEffect } from 'react';
import { Package, Trash2, Search, AlertTriangle, Loader, X, Building2 } from 'lucide-react';
import { getProducts, getPrices, getDistributors, deleteProduct, deletePrice } from '../config/supabase';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [showDeleteDistModal, setShowDeleteDistModal] = useState(null);
    const [deleting, setDeleting] = useState(false);

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
            <div className="page-header">
                <h1 className="page-title">📦 Gerenciar Dados</h1>
                <p className="page-subtitle">Exclua produtos ou tabelas inteiras de distribuidoras</p>
            </div>

            {/* Excluir por Distribuidora */}
            <div className="card mb-lg">
                <h3 className="card-title flex items-center gap-sm mb-lg">
                    <Building2 size={20} />
                    Excluir Tabela de Distribuidora
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
                    Exclua todos os preços importados de uma distribuidora de uma vez
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {distributors.map(dist => {
                        const count = getDistPriceCount(dist.id);
                        return (
                            <div key={dist.id} className="stat-card">
                                <div className="stat-icon orange"><Building2 size={20} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{dist.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {count} preço(s)
                                    </div>
                                </div>
                                {count > 0 && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px', color: 'var(--danger)' }}
                                        onClick={() => setShowDeleteDistModal(dist)}
                                        title="Excluir todos os preços desta distribuidora"
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
                            <Trash2 size={18} />
                            Excluir TUDO (todos os produtos e preços)
                        </button>
                    </div>
                )}
            </div>

            {/* Busca de Produtos */}
            <div className="card mb-lg">
                <h3 className="card-title flex items-center gap-sm mb-md">
                    <Package size={20} />
                    Excluir Produto Individual
                </h3>
                <div className="flex gap-md items-center">
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
            </div>

            {/* Lista de Produtos */}
            {filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Package size={64} />
                        <h3>Nenhum produto encontrado</h3>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preços</th>
                                <th style={{ width: 80 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.slice(0, 50).map(product => (
                                <tr key={product.id}>
                                    <td><strong>{product.name}</strong></td>
                                    <td>{getPriceCount(product.id)}</td>
                                    <td>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px', color: 'var(--danger)' }}
                                            onClick={() => setShowDeleteModal(product)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length > 50 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'var(--spacing-md)' }}>
                            Mostrando 50 de {filteredProducts.length} produtos. Use a busca para filtrar.
                        </p>
                    )}
                </div>
            )}

            {/* Modal Excluir Produto */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0, color: 'var(--danger)' }}>
                                <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                Excluir Produto
                            </h3>
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
                            <h3 style={{ margin: 0, color: 'var(--danger)' }}>
                                <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                Excluir Tabela
                            </h3>
                            <button onClick={() => setShowDeleteDistModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <p>Excluir <strong>TODOS os {getDistPriceCount(showDeleteDistModal.id)} preços</strong> da distribuidora <strong>"{showDeleteDistModal.name}"</strong>?</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>Os produtos continuarão existindo, apenas os preços desta distribuidora serão removidos.</p>
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
