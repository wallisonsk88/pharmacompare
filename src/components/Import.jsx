import React, { useState, useEffect, useRef } from 'react';
import { Upload, Check, Loader, Building2, Plus, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDistributors, createDistributor, getProducts, createProduct, createPrice } from '../config/supabase';

export default function Import() {
    const [distributors, setDistributors] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [newDistributorName, setNewDistributorName] = useState('');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => { loadDistributors(); }, []);

    const loadDistributors = async () => {
        try {
            const data = await getDistributors();
            setDistributors(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleCreateDistributor = async () => {
        if (!newDistributorName.trim()) return;
        try {
            const newDist = await createDistributor({
                name: newDistributorName.trim(),
                cnpj: '',
                contact: '',
                notes: ''
            });
            setDistributors([...distributors, newDist]);
            setSelectedDistributor(newDist.id);
            setNewDistributorName('');
        } catch (e) {
            console.error(e);
            alert('Erro ao criar distribuidora');
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file) => {
        if (!selectedDistributor) {
            alert('Selecione uma distribuidora primeiro!');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const data = new Uint8Array(await file.arrayBuffer());
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rows.length < 2) {
                alert('Arquivo vazio ou sem dados');
                setImporting(false);
                return;
            }

            // Identificar colunas automaticamente
            const header = rows[0].map(h => String(h || '').toLowerCase());
            let productCol = -1, priceCol = -1, eanCol = -1;

            header.forEach((h, i) => {
                if (h.includes('produto') || h.includes('medicamento') || h.includes('nome') || h.includes('descri')) productCol = i;
                if (h.includes('preço') || h.includes('preco') || h.includes('valor') || h.includes('pmc') || h.includes('custo') || h.includes('unit')) priceCol = i;
                if (h.includes('ean') || h.includes('barras') || h.includes('barcode') || h.includes('cod')) eanCol = i;
            });

            if (productCol === -1) productCol = 0;
            if (priceCol === -1) priceCol = rows[0].length - 1;

            const results = { success: 0, errors: 0, total: rows.length - 1 };
            const existingProducts = await getProducts();
            const productsMap = {};
            existingProducts.forEach(p => { productsMap[p.name.toLowerCase()] = p; });

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                try {
                    const productName = String(row[productCol] || '').trim();
                    const eanVal = eanCol !== -1 ? String(row[eanCol] || '').trim() : '';
                    let priceStr = String(row[priceCol] || '');
                    priceStr = priceStr.replace(/[R$\s]/g, '').replace(',', '.').replace(/[^\d.]/g, '');
                    const priceVal = parseFloat(priceStr);

                    if (!productName || productName.length < 2 || isNaN(priceVal) || priceVal <= 0) {
                        results.errors++;
                        continue;
                    }

                    let product = productsMap[productName.toLowerCase()];
                    if (!product) {
                        product = await createProduct({
                            name: productName,
                            ean: eanVal,
                            manufacturer: '',
                            category: 'generico',
                            unit: 'cx'
                        });
                        productsMap[productName.toLowerCase()] = product;
                    }

                    await createPrice({
                        product_id: product.id,
                        distributor_id: selectedDistributor,
                        price: priceVal,
                        min_quantity: 1,
                        validity: null
                    });

                    results.success++;
                } catch (err) {
                    console.error('Erro linha', i, err);
                    results.errors++;
                }
            }

            setImportResult(results);
        } catch (error) {
            console.error('Erro ao importar:', error);
            alert('Erro ao processar arquivo: ' + error.message);
        }

        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const reset = () => {
        setImportResult(null);
        setSelectedDistributor('');
    };

    if (loading) {
        return (
            <div className="main-content">
                <div className="empty-state">
                    <Loader size={48} className="loading-spinner" />
                    <h3>Carregando...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">📥 Importar Tabela de Preços</h1>
                <p className="page-subtitle">Selecione a distribuidora e faça upload do arquivo Excel ou CSV</p>
            </div>

            {importResult ? (
                <div className="card text-center">
                    <div style={{ padding: 'var(--space-2xl)' }}>
                        <div className="stat-icon success" style={{ width: 80, height: 80, margin: '0 auto var(--space-lg)', borderRadius: '50%' }}>
                            <Check size={40} />
                        </div>
                        <h2 style={{ marginBottom: 'var(--space-sm)', fontWeight: 700 }}>Importação Concluída!</h2>
                        <p style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>
                            <span className="text-success font-bold">{importResult.success}</span> de {importResult.total} produtos importados
                        </p>
                        {importResult.errors > 0 && (
                            <div className="badge badge-warning" style={{ fontSize: '0.85rem', padding: 'var(--space-sm) var(--space-md)' }}>
                                <AlertCircle size={16} />
                                {importResult.errors} linhas ignoradas (sem nome ou preço válido)
                            </div>
                        )}
                        <div style={{ marginTop: 'var(--space-xl)' }}>
                            <button className="btn btn-primary" onClick={reset}>
                                Nova Importação
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                    {/* Passo 1: Distribuidora */}
                    <div className="card">
                        <h3 className="card-title mb-lg">
                            <span style={{ background: 'var(--accent-primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginRight: 'var(--space-sm)' }}>1</span>
                            Selecione a Distribuidora
                        </h3>

                        <div className="flex gap-md mb-md">
                            <select
                                className="form-select"
                                value={selectedDistributor}
                                onChange={(e) => setSelectedDistributor(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Escolha uma distribuidora...</option>
                                {distributors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-sm items-center">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ou digite para criar nova..."
                                value={newDistributorName}
                                onChange={(e) => setNewDistributorName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCreateDistributor()}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-success"
                                onClick={handleCreateDistributor}
                                disabled={!newDistributorName.trim()}
                            >
                                <Plus size={18} /> Criar
                            </button>
                        </div>
                    </div>

                    {/* Passo 2: Upload */}
                    <div className="card">
                        <h3 className="card-title mb-lg">
                            <span style={{ background: selectedDistributor ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: selectedDistributor ? 'white' : 'var(--text-muted)', width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginRight: 'var(--space-sm)' }}>2</span>
                            Envie o Arquivo
                        </h3>

                        {!selectedDistributor ? (
                            <div className="upload-zone" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                <Upload size={48} />
                                <h3>Primeiro selecione uma distribuidora</h3>
                                <p>Você poderá fazer upload após selecionar</p>
                            </div>
                        ) : importing ? (
                            <div className="upload-zone">
                                <Loader size={48} className="loading-spinner" />
                                <h3>Importando...</h3>
                                <p>Processando arquivo, aguarde...</p>
                            </div>
                        ) : (
                            <div
                                className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                style={dragActive ? { borderColor: 'var(--accent-primary)', background: 'var(--accent-primary-light)' } : {}}
                            >
                                <FileSpreadsheet size={48} />
                                <h3>Arraste o arquivo aqui ou clique para selecionar</h3>
                                <p>Suporte para Excel (.xlsx) e CSV</p>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />

                        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>💡 Dica:</strong> O sistema identifica automaticamente as colunas de "Produto" e "Preço" pelos nomes do cabeçalho.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
