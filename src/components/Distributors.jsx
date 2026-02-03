import React, { useState, useEffect } from 'react';
import {
    Building2,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Phone,
    FileText
} from 'lucide-react';
import { getDistributors, createDistributor, updateDistributor, deleteDistributor } from '../config/supabase';

export default function Distributors() {
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDistributor, setEditingDistributor] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        contact: '',
        notes: ''
    });

    useEffect(() => {
        loadDistributors();
    }, []);

    const loadDistributors = async () => {
        try {
            const data = await getDistributors();
            setDistributors(data);
        } catch (error) {
            console.error('Erro ao carregar distribuidoras:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDistributor) {
                await updateDistributor(editingDistributor.id, formData);
            } else {
                await createDistributor(formData);
            }
            await loadDistributors();
            closeModal();
        } catch (error) {
            console.error('Erro ao salvar distribuidora:', error);
            alert('Erro ao salvar distribuidora');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta distribuidora?')) {
            try {
                await deleteDistributor(id);
                await loadDistributors();
            } catch (error) {
                console.error('Erro ao excluir distribuidora:', error);
                alert('Erro ao excluir distribuidora');
            }
        }
    };

    const openModal = (distributor = null) => {
        if (distributor) {
            setEditingDistributor(distributor);
            setFormData({
                name: distributor.name,
                cnpj: distributor.cnpj || '',
                contact: distributor.contact || '',
                notes: distributor.notes || ''
            });
        } else {
            setEditingDistributor(null);
            setFormData({ name: '', cnpj: '', contact: '', notes: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingDistributor(null);
        setFormData({ name: '', cnpj: '', contact: '', notes: '' });
    };

    const filteredDistributors = distributors.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.cnpj && d.cnpj.includes(searchTerm))
    );

    const formatCNPJ = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    return (
        <div className="main-content">
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Distribuidoras</h1>
                        <p className="page-subtitle">Gerencie suas distribuidoras de medicamentos</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Nova Distribuidora
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="empty-state loading">
                        <Building2 size={64} />
                        <h3>Carregando...</h3>
                    </div>
                ) : filteredDistributors.length === 0 ? (
                    <div className="empty-state">
                        <Building2 size={64} />
                        <h3>Nenhuma distribuidora encontrada</h3>
                        <p>{searchTerm ? 'Tente buscar por outro termo' : 'Comece adicionando sua primeira distribuidora'}</p>
                        {!searchTerm && (
                            <button className="btn btn-primary" onClick={() => openModal()}>
                                <Plus size={18} />
                                Adicionar Distribuidora
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CNPJ</th>
                                    <th>Contato</th>
                                    <th>Observações</th>
                                    <th style={{ width: '100px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDistributors.map(distributor => (
                                    <tr key={distributor.id}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div className="stat-icon primary" style={{ width: 36, height: 36 }}>
                                                    <Building2 size={18} />
                                                </div>
                                                <strong>{distributor.name}</strong>
                                            </div>
                                        </td>
                                        <td>{distributor.cnpj || '-'}</td>
                                        <td>
                                            {distributor.contact ? (
                                                <div className="flex items-center gap-sm">
                                                    <Phone size={14} />
                                                    {distributor.contact}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {distributor.notes ? (
                                                <div className="flex items-center gap-sm" style={{ maxWidth: 200 }}>
                                                    <FileText size={14} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {distributor.notes}
                                                    </span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => openModal(distributor)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleDelete(distributor.id)}
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
                                {editingDistributor ? 'Editar Distribuidora' : 'Nova Distribuidora'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Nome da distribuidora"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CNPJ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="00.000.000/0000-00"
                                        value={formData.cnpj}
                                        onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                                        maxLength={18}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contato</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Telefone ou e-mail"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Observações</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Observações sobre a distribuidora..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDistributor ? 'Salvar Alterações' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
