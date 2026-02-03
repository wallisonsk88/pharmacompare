import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Calendar,
    Package,
    Building2
} from 'lucide-react';
import {
    getPrices,
    createPrice,
    updatePrice,
    deletePrice,
    getProducts,
    getDistributors
} from '../config/supabase';

export default function Prices() {
    const [prices, setPrices] = useState([]);
    const [products, setProducts] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);
    const [formData, setFormData] = useState({
        product_id: '',
        distributor_id: '',
        price: '',
        min_quantity: 1,
        validity: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pricesData, productsData, distributorsData] = await Promise.all([
                getPrices(),
                getProducts(),
                getDistributors()
            ]);
            setPrices(pricesData);
            setProducts(productsData);
            setDistributors(distributorsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const priceData = {
                ...formData,
                price: parseFloat(formData.price.replace(',', '.')),
                min_quantity: parseInt(formData.min_quantity) || 1,
                validity: formData.validity || null
            };

            if (editingPrice) {
                await updatePrice(editingPrice.id, priceData);
            } else {
                await createPrice(priceData);
            }
            await loadData();
            closeModal();
        } catch (error) {
            console.error('Erro ao salvar preço:', error);
            alert('Erro ao salvar preço');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir este registro de preço?')) {
            try {
                await deletePrice(id);
                await loadData();
            } catch (error) {
                console.error('Erro ao excluir preço:', error);
                alert('Erro ao excluir preço');
            }
        }
    };

    const openModal = (price = null) => {
        if (price) {
            setEditingPrice(price);
            setFormData({
                product_id: price.product_id,
                distributor_id: price.distributor_id,
                price: price.price.toString().replace('.', ','),
                min_quantity: price.min_quantity || 1,
                validity: price.validity || ''
            });
        } else {
            setEditingPrice(null);
            setFormData({
                product_id: products[0]?.id || '',
                distributor_id: distributors[0]?.id || '',
                price: '',
                min_quantity: 1,
                validity: ''
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrice(null);
        setFormData({ product_id: '', distributor_id: '', price: '', min_quantity: 1, validity: '' });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const filteredPrices = prices.filter(p => {
        const productName = p.products?.name?.toLowerCase() || '';
        const distributorName = p.distributors?.name?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return productName.includes(term) || distributorName.includes(term);
    });

    const formatPriceInput = (value) => {
        // Remove tudo exceto números e vírgula
        let cleaned = value.replace(/[^\d,]/g, '');
        // Garante apenas uma vírgula
        const parts = cleaned.split(',');
        if (parts.length > 2) {
            cleaned = parts[0] + ',' + parts.slice(1).join('');
        }
        return cleaned;
    };

    return (
        <div className="main-content">
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Registro de Preços</h1>
                        <p className="page-subtitle">Cadastre e gerencie preços de medicamentos por distribuidora</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => openModal()}
                        disabled={products.length === 0 || distributors.length === 0}
                    >
                        <Plus size={18} />
                        Novo Preço
                    </button>
                </div>
            </div>

            {(products.length === 0 || distributors.length === 0) && (
                <div className="card mb-lg" style={{ borderColor: 'var(--warning)' }}>
                    <div className="flex items-center gap-md">
                        <div className="stat-icon warning">
                            <Package size={24} />
                        </div>
                        <div>
                            <strong>Atenção</strong>
                            <p style={{ margin: 0 }}>
                                {products.length === 0 && 'Você precisa cadastrar pelo menos um medicamento. '}
                                {distributors.length === 0 && 'Você precisa cadastrar pelo menos uma distribuidora.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por medicamento ou distribuidora..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="empty-state loading">
                        <DollarSign size={64} />
                        <h3>Carregando...</h3>
                    </div>
                ) : filteredPrices.length === 0 ? (
                    <div className="empty-state">
                        <DollarSign size={64} />
                        <h3>Nenhum preço registrado</h3>
                        <p>
                            {searchTerm
                                ? 'Tente buscar por outro termo'
                                : 'Comece registrando o preço de um medicamento'}
                        </p>
                        {!searchTerm && products.length > 0 && distributors.length > 0 && (
                            <button className="btn btn-primary" onClick={() => openModal()}>
                                <Plus size={18} />
                                Registrar Preço
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Distribuidora</th>
                                    <th>Preço</th>
                                    <th>Qtd. Mín.</th>
                                    <th>Validade</th>
                                    <th>Registrado em</th>
                                    <th style={{ width: '100px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPrices.map(price => (
                                    <tr key={price.id}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div className="stat-icon accent" style={{ width: 32, height: 32 }}>
                                                    <Package size={16} />
                                                </div>
                                                {price.products?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-sm">
                                                <Building2 size={14} />
                                                {price.distributors?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="price-highlight">{formatCurrency(price.price)}</td>
                                        <td>{price.min_quantity || 1}</td>
                                        <td>
                                            {price.validity ? (
                                                <div className="flex items-center gap-sm">
                                                    <Calendar size={14} />
                                                    {formatDate(price.validity)}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>{formatDate(price.recorded_at)}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => openModal(price)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleDelete(price.id)}
                                                    title="Excluir"
                                                    style={{ color: 'var(--error)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingPrice ? 'Editar Preço' : 'Registrar Novo Preço'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Medicamento *</label>
                                    <select
                                        className="form-select"
                                        value={formData.product_id}
                                        onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione um medicamento</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Distribuidora *</label>
                                    <select
                                        className="form-select"
                                        value={formData.distributor_id}
                                        onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione uma distribuidora</option>
                                        {distributors.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Preço (R$) *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="0,00"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: formatPriceInput(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Quantidade Mínima</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="1"
                                            min="1"
                                            value={formData.min_quantity}
                                            onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Validade do Preço</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.validity}
                                        onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingPrice ? 'Salvar Alterações' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
