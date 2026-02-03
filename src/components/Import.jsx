import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, Loader, Building2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDistributors, createDistributor, getProducts, createProduct, createPrice } from '../config/supabase';

export default function Import() {
    const [distributors, setDistributors] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [newDistributorName, setNewDistributorName] = useState('');
    const [showNewDistributor, setShowNewDistributor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
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
            const newDist = await createDistributor({ name: newDistributorName.trim(), cnpj: '', contact: '', notes: '' });
            setDistributors([...distributors, newDist]);
            setSelectedDistributor(newDist.id);
            setNewDistributorName('');
            setShowNewDistributor(false);
        } catch (e) { console.error(e); alert('Erro ao criar distribuidora'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedDistributor) return;

        setImporting(true);
        setImportResult(null);

        try {
            const ext = file.name.split('.').pop().toLowerCase();
            let rows = [];

            if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
                const data = new Uint8Array(await file.arrayBuffer());
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            } else {
                alert('Use arquivos Excel (.xlsx) ou CSV');
                setImporting(false);
                return;
            }

            // Processar linhas - encontrar coluna de produto e preço
            if (rows.length < 2) {
                alert('Arquivo vazio ou sem dados');
                setImporting(false);
                return;
            }

            const header = rows[0].map(h => String(h || '').toLowerCase());
            let productCol = -1, priceCol = -1;

            // Tentar identificar colunas automaticamente
            header.forEach((h, i) => {
                if (h.includes('produto') || h.includes('medicamento') || h.includes('nome') || h.includes('descri')) productCol = i;
                if (h.includes('preço') || h.includes('preco') || h.includes('valor') || h.includes('pmc') || h.includes('custo')) priceCol = i;
            });

            // Se não encontrou, usar primeira e última coluna como padrão
            if (productCol === -1) productCol = 0;
            if (priceCol === -1) priceCol = rows[0].length - 1;

            const results = { success: 0, errors: 0, total: 0 };
            const existingProducts = await getProducts();
            const productsMap = {};
            existingProducts.forEach(p => { productsMap[p.name.toLowerCase()] = p; });

            // Importar cada linha (exceto cabeçalho)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                results.total++;

                try {
                    const productName = String(row[productCol] || '').trim();
                    let priceStr = String(row[priceCol] || '');
                    priceStr = priceStr.replace(/[R$\s]/g, '').replace(',', '.').replace(/[^\d.]/g, '');
                    const priceVal = parseFloat(priceStr);

                    if (!productName || productName.length < 2 || isNaN(priceVal) || priceVal <= 0) {
                        results.errors++;
                        continue;
                    }

                    // Criar ou buscar produto
                    let product = productsMap[productName.toLowerCase()];
                    if (!product) {
                        product = await createProduct({ name: productName, ean: '', manufacturer: '', category: 'generico', unit: 'cx' });
                        productsMap[productName.toLowerCase()] = product;
                    }

                    // Criar preço
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
            alert('Erro ao processar arquivo');
        }

        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const reset = () => {
        setImportResult(null);
        setSelectedDistributor('');
    };

    if (loading) {
        return <div className="main-content"><div className="empty-state"><Loader size={48} className="loading" /><h3>Carregando...</h3></div></div>;
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Importar Tabela de Preços</h1>
                <p className="page-subtitle">Selecione a distribuidora e importe a tabela</p>
            </div>

            {importResult ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="stat-icon accent" style={{ width: 80, height: 80 }}><Check size={40} /></div>
                        <h3>Importação Concluída!</h3>
                        <p>{importResult.success} de {importResult.total} produtos importados</p>
                        {importResult.errors > 0 && (
                            <p style={{ color: 'var(--warning)', marginTop: 8 }}>
                                <AlertTriangle size={16} style={{ verticalAlign: 'middle' }} /> {importResult.errors} linhas ignoradas (sem nome ou preço válido)
                            </p>
                        )}
                        <button className="btn btn-primary btn-lg mt-lg" onClick={reset}>Nova Importação</button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Passo 1: Selecionar Distribuidora */}
                    <div className="card mb-lg">
                        <h3 className="card-title mb-md flex items-center gap-sm">
                            <Building2 size={20} />
                            1. Selecione a Distribuidora
                        </h3>

                        {!showNewDistributor ? (
                            <div className="flex gap-md">
                                <select
                                    className="form-select"
                                    value={selectedDistributor}
                                    onChange={(e) => setSelectedDistributor(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Escolha uma distribuidora...</option>
                                    {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <button className="btn btn-secondary" onClick={() => setShowNewDistributor(true)}>
                                    + Nova
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-md">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nome da nova distribuidora"
                                    value={newDistributorName}
                                    onChange={(e) => setNewDistributorName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary" onClick={handleCreateDistributor}>Criar</button>
                                <button className="btn btn-secondary" onClick={() => { setShowNewDistributor(false); setNewDistributorName(''); }}>Cancelar</button>
                            </div>
                        )}
                    </div>

                    {/* Passo 2: Importar Arquivo */}
                    <div className="card">
                        <h3 className="card-title mb-md flex items-center gap-sm">
                            <FileSpreadsheet size={20} />
                            2. Importe o Arquivo
                        </h3>

                        {!selectedDistributor ? (
                            <div className="empty-state" style={{ padding: 'var(--spacing-xl)', opacity: 0.5 }}>
                                <Upload size={48} />
                                <p>Primeiro selecione uma distribuidora acima</p>
                            </div>
                        ) : importing ? (
                            <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                                <Loader size={48} className="loading" />
                                <h3>Importando...</h3>
                                <p>Processando arquivo, aguarde...</p>
                            </div>
                        ) : (
                            <div
                                className="empty-state"
                                style={{ padding: 'var(--spacing-xl)', cursor: 'pointer', border: '2px dashed var(--primary-500)', borderRadius: 'var(--radius-lg)' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={48} />
                                <h3>Clique para selecionar arquivo</h3>
                                <p>Excel (.xlsx) ou CSV</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                                    O sistema vai identificar automaticamente as colunas de produto e preço
                                </p>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
