import React, { useState, useEffect } from 'react';
import { Package, Trash2, Search, AlertTriangle, Loader, X } from 'lucide-react';
import { getProducts, getPrices, deleteProduct, deletePrice } from '../config/supabase';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [prods, allPrices] = await Promise.all([getProducts(), getPrices()]);
            setProducts(prods);
            setPrices(allPrices);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDeleteProduct = async (product) => {
        setDeleting(true);
        try {
            // Deletar todos os preços deste produto primeiro
            const productPrices = prices.filter(p => p.product_id === product.id);
            for (const price of productPrices) {
                await deletePrice(price.id);
            }
            // Depois deletar o produto
            await deleteProduct(product.id);
            await loadData();
            setShowDeleteModal(null);
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir produto');
        }
        setDeleting(false);
    };

    const handleDeleteAllPricesFromDistributor = async (distributorId, distributorName) => {
        if (!confirm(`Tem certeza que deseja excluir TODOS os preços da distribuidora "${distributorName}"?`)) return;

        setDeleting(true);
        try {
            const distPrices = prices.filter(p => p.distributor_id === distributorId);
            for (const price of distPrices) {
                await deletePrice(price.id);
            }
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir preços');
        }
        setDeleting(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPriceCount = (productId) => prices.filter(p => p.product_id === productId).length;

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
                <h1 className="page-title">📦 Gerenciar Produtos</h1>
                <p className="page-subtitle">Visualize e exclua produtos importados</p>
            </div>

            {/* Busca */}
            <div className="card mb-lg">
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

            {/* Estatísticas */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                        <div className="stat-value">{products.length}</div>
                        <div className="stat-label">Produtos</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Package size={24} /></div>
                    <div>
                        <div className="stat-value">{prices.length}</div>
                        <div className="stat-label">Preços Registrados</div>
                    </div>
                </div>
            </div>

            {/* Lista de Produtos */}
            {filteredProducts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Package size={64} />
                        <h3>Nenhum produto encontrado</h3>
                        <p>Importe tabelas de preços para ver os produtos aqui</p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preços Cadastrados</th>
                                <th style={{ width: 100 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <strong>{product.name}</strong>
                                        {product.manufacturer && (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {product.manufacturer}
                                            </div>
                                        )}
                                    </td>
                                    <td>{getPriceCount(product.id)} preço(s)</td>
                                    <td>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '8px', color: 'var(--danger)' }}
                                            onClick={() => setShowDeleteModal(product)}
                                            title="Excluir produto"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Confirmação */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="flex justify-between items-center mb-lg">
                            <h3 style={{ margin: 0, color: 'var(--danger)' }}>
                                <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                Excluir Produto
                            </h3>
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Tem certeza que deseja excluir <strong>"{showDeleteModal.name}"</strong>?
                        </p>
                        <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Isso também excluirá todos os {getPriceCount(showDeleteModal.id)} preços associados a este produto.
                        </p>

                        <div className="flex gap-md justify-between">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(null)}
                                style={{ flex: 1 }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1, background: 'var(--danger)', color: 'white' }}
                                onClick={() => handleDeleteProduct(showDeleteModal)}
                                disabled={deleting}
                            >
                                {deleting ? <Loader size={18} className="loading" /> : <Trash2 size={18} />}
                                {deleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
