import React, { useState, useEffect } from 'react';
import {
    Pill,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Barcode,
    Factory,
    Tag
} from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../config/supabase';

const categories = [
    { value: 'referencia', label: 'Referência' },
    { value: 'generico', label: 'Genérico' },
    { value: 'similar', label: 'Similar' },
    { value: 'fitoterapico', label: 'Fitoterápico' },
    { value: 'outros', label: 'Outros' }
];

const units = [
    { value: 'cx', label: 'Caixa' },
    { value: 'un', label: 'Unidade' },
    { value: 'fr', label: 'Frasco' },
    { value: 'amp', label: 'Ampola' },
    { value: 'env', label: 'Envelope' },
    { value: 'tb', label: 'Tubo' }
];

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        ean: '',
        manufacturer: '',
        category: 'generico',
        unit: 'cx'
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, formData);
            } else {
                await createProduct(formData);
            }
            await loadProducts();
            closeModal();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir este medicamento?')) {
            try {
                await deleteProduct(id);
                await loadProducts();
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                alert('Erro ao excluir produto');
            }
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                ean: product.ean || '',
                manufacturer: product.manufacturer || '',
                category: product.category || 'generico',
                unit: product.unit || 'cx'
            });
        } else {
            setEditingProduct(null);
            setFormData({ name: '', ean: '', manufacturer: '', category: 'generico', unit: 'cx' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setFormData({ name: '', ean: '', manufacturer: '', category: 'generico', unit: 'cx' });
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ean && p.ean.includes(searchTerm)) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCategoryBadge = (category) => {
        const colors = {
            referencia: 'primary',
            generico: 'success',
            similar: 'info',
            fitoterapico: 'warning',
            outros: 'secondary'
        };
        const labels = {
            referencia: 'Referência',
            generico: 'Genérico',
            similar: 'Similar',
            fitoterapico: 'Fitoterápico',
            outros: 'Outros'
        };
        return <span className={`badge badge-${colors[category] || 'primary'}`}>{labels[category] || category}</span>;
    };

    return (
        <div className="main-content">
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Medicamentos</h1>
                        <p className="page-subtitle">Catálogo de medicamentos para comparação</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Novo Medicamento
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, código EAN ou fabricante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="empty-state loading">
                        <Pill size={64} />
                        <h3>Carregando...</h3>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <Pill size={64} />
                        <h3>Nenhum medicamento encontrado</h3>
                        <p>{searchTerm ? 'Tente buscar por outro termo' : 'Comece adicionando seu primeiro medicamento'}</p>
                        {!searchTerm && (
                            <button className="btn btn-primary" onClick={() => openModal()}>
                                <Plus size={18} />
                                Adicionar Medicamento
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>EAN</th>
                                    <th>Fabricante</th>
                                    <th>Categoria</th>
                                    <th>Unidade</th>
                                    <th style={{ width: '100px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div className="stat-icon accent" style={{ width: 36, height: 36 }}>
                                                    <Pill size={18} />
                                                </div>
                                                <strong>{product.name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            {product.ean ? (
                                                <div className="flex items-center gap-sm">
                                                    <Barcode size={14} />
                                                    {product.ean}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {product.manufacturer ? (
                                                <div className="flex items-center gap-sm">
                                                    <Factory size={14} />
                                                    {product.manufacturer}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>{getCategoryBadge(product.category)}</td>
                                        <td>{units.find(u => u.value === product.unit)?.label || product.unit}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => openModal(product)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleDelete(product.id)}
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
                                {editingProduct ? 'Editar Medicamento' : 'Novo Medicamento'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome do Medicamento *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ex: Dipirona 500mg"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Código EAN (Código de Barras)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="7891234567890"
                                        value={formData.ean}
                                        onChange={(e) => setFormData({ ...formData, ean: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fabricante/Laboratório</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Nome do laboratório"
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Categoria</label>
                                        <select
                                            className="form-select"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Unidade</label>
                                        <select
                                            className="form-select"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        >
                                            {units.map(unit => (
                                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? 'Salvar Alterações' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
