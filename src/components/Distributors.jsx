import React, { useState, useEffect } from 'react';
import { Building2, Trash2, Plus, Edit2, Loader, X, AlertTriangle, Phone, FileText } from 'lucide-react';
import { getDistributors, createDistributor, updateDistributor, deleteDistributor, getPrices, deletePrice } from '../config/supabase';

export default function Distributors() {
    const [distributors, setDistributors] = useState([]);
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', cnpj: '', contact: '', notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [dists, allPrices] = await Promise.all([getDistributors(), getPrices()]);
            setDistributors(dists);
            setPrices(allPrices);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const getDistPriceCount = (distId) => prices.filter(p => p.distributor_id === distId).length;

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateDistributor(editingId, form);
            } else {
                await createDistributor(form);
            }
            await loadData();
            closeModal();
        } catch (e) { console.error(e); alert('Erro ao salvar'); }
        setSaving(false);
    };

    const handleEdit = (dist) => {
        setEditingId(dist.id);
        setForm({ name: dist.name, cnpj: dist.cnpj || '', contact: dist.contact || '', notes: dist.notes || '' });
        setShowModal(true);
    };

    const handleDelete = async (dist) => {
        setSaving(true);
        try {
            const distPrices = prices.filter(p => p.distributor_id === dist.id);
            for (const price of distPrices) await deletePrice(price.id);
            await deleteDistributor(dist.id);
            await loadData();
            setShowDeleteModal(null);
        } catch (e) { console.error(e); alert('Erro ao excluir'); }
        setSaving(false);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setForm({ name: '', cnpj: '', contact: '', notes: '' });
    };

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
                    <h1 className="page-title">🏢 Distribuidoras</h1>
                    <p className="page-subtitle">Gerencie suas distribuidoras cadastradas</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Nova Distribuidora
                </button>
            </div>

            {distributors.length === 0 ? (
                <div className="card"><div className="empty-state"><Building2 size={64} /><h3>Nenhuma distribuidora</h3><p>Clique em "Nova Distribuidora" para adicionar</p></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
                    {distributors.map(dist => (
                        <div key={dist.id} className="card">
                            <div className="flex justify-between items-center mb-md">
                                <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{dist.name}</h3>
                                <div className="flex gap-xs">
                                    <button className="btn btn-ghost" onClick={() => handleEdit(dist)}><Edit2 size={16} /></button>
                                    <button className="btn btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => setShowDeleteModal(dist)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {dist.cnpj && <p className="text-muted" style={{ fontSize: '0.85rem' }}>CNPJ: {dist.cnpj}</p>}
                            {dist.contact && <p className="text-muted" style={{ fontSize: '0.85rem' }}><Phone size={12} style={{ verticalAlign: 'middle' }} /> {dist.contact}</p>}
                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <span className="badge badge-primary">{getDistPriceCount(dist.id)} preço(s)</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Nova/Editar */}
            {showModal && (
                <Modal onClose={closeModal}>
                    <div className="modal-header">
                        <h3 className="modal-title"><Building2 size={20} /> {editingId ? 'Editar' : 'Nova'} Distribuidora</h3>
                        <button className="modal-close" onClick={closeModal}><X size={24} /></button>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input type="text" className="form-input" placeholder="Nome da distribuidora" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CNPJ</label>
                        <input type="text" className="form-input" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contato</label>
                        <input type="text" className="form-input" placeholder="Telefone ou e-mail" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <input type="text" className="form-input" placeholder="Notas adicionais" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </Modal>
            )}

            {/* Modal: Excluir */}
            {showDeleteModal && (
                <Modal onClose={() => setShowDeleteModal(null)}>
                    <div className="modal-header">
                        <h3 className="modal-title" style={{ color: 'var(--accent-danger)' }}><AlertTriangle size={20} /> Excluir Distribuidora</h3>
                        <button className="modal-close" onClick={() => setShowDeleteModal(null)}><X size={24} /></button>
                    </div>
                    <p>Excluir <strong>"{showDeleteModal.name}"</strong> e todos os seus {getDistPriceCount(showDeleteModal.id)} preços?</p>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>Cancelar</button>
                        <button className="btn btn-danger" onClick={() => handleDelete(showDeleteModal)} disabled={saving}>{saving ? 'Excluindo...' : 'Excluir'}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
