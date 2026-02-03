import React, { useState, useEffect, useRef } from 'react';
import { Upload, Check, Loader, Building2, Plus, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDistributors, createDistributor, getProducts, createProduct, createPrice, createProductsBatch, createPricesBatch } from '../config/supabase';

export default function Import() {
    const [distributors, setDistributors] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [newDistributorName, setNewDistributorName] = useState('');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
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

            // Identificar colunas automaticamente com detecção mais robusta
            const header = rows[0].map(h => String(h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
            let productCol = 0; // Sempre usar primeira coluna como produto
            let priceCol = -1, eanCol = -1;

            // Palavras-chave para cada tipo de coluna
            const priceKeywords = ['preco', 'valor', 'pmc', 'custo', 'unit', 'venda', 'tabela'];
            const eanKeywords = ['ean', 'barras', 'barcode', 'gtin'];

            header.forEach((h, i) => {
                if (priceCol === -1 && priceKeywords.some(k => h.includes(k))) priceCol = i;
                if (eanCol === -1 && eanKeywords.some(k => h.includes(k))) eanCol = i;
            });

            // Se não encontrou coluna de preço por nome, procura por padrão de preço (R$ XX,XX) nos dados
            if (priceCol === -1 && rows.length > 1) {
                const firstDataRow = rows[1];
                for (let i = 0; i < firstDataRow.length; i++) {
                    const val = String(firstDataRow[i] || '');
                    // Detecta padrões como "R$ 20,00" ou "20,00" ou "R$20.00"
                    if (/R\$\s*\d/.test(val) || /^\d{1,6}[,\.]\d{2}\s*$/.test(val.trim())) {
                        priceCol = i;
                        console.log(`Coluna de preço detectada pelo conteúdo: ${i} (valor: "${val}")`);
                        break;
                    }
                }
            }

            // Se ainda não encontrou, verificar se alguma coluna tem "R$" nos dados
            if (priceCol === -1 && rows.length > 1) {
                for (let i = 0; i < rows[1].length; i++) {
                    const val = String(rows[1][i] || '');
                    if (val.includes('R$') || val.includes('r$')) {
                        priceCol = i;
                        console.log(`Coluna de preço encontrada com R$: ${i}`);
                        break;
                    }
                }
            }

            if (priceCol === -1) {
                priceCol = 1; // Fallback: segunda coluna é normalmente o preço
                console.log('Fallback: usando coluna 1 como preço');
            }

            // Se a coluna de produto e preço são iguais, ajustar
            if (productCol === priceCol) {
                productCol = 0;
                priceCol = 1;
            }

            console.log('Colunas detectadas:', { productCol, priceCol, eanCol, header: rows[0] });
            console.log('Exemplo de dados - Produto:', rows[1][productCol], '| Preço:', rows[1][priceCol]);

            const results = { success: 0, errors: 0, total: rows.length - 1 };
            const existingProducts = await getProducts();
            const productsMap = {};
            existingProducts.forEach(p => { productsMap[p.name.toLowerCase()] = p; });

            // Preparar dados para processamento em lote
            const itemsToProcess = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const productName = String(row[productCol] || '').trim();
                const eanVal = eanCol !== -1 ? String(row[eanCol] || '').trim() : '';
                let priceStr = String(row[priceCol] || '');
                const originalPrice = priceStr; // Para debug

                // Limpeza mais robusta do preço
                priceStr = priceStr
                    .replace(/R\$/gi, '')
                    .replace(/\s/g, '')
                    .replace(/\./g, '') // Remove pontos de milhar
                    .replace(',', '.'); // Converte vírgula decimal para ponto

                const priceVal = parseFloat(priceStr);

                // Debug: mostrar primeiras 5 linhas no console
                if (i <= 5) {
                    console.log(`Linha ${i}:`, {
                        productName,
                        priceCol,
                        rawValue: row[priceCol],
                        originalPrice,
                        cleanedPrice: priceStr,
                        parsedPrice: priceVal,
                        isValid: !isNaN(priceVal) && priceVal > 0
                    });
                }

                if (!productName || productName.length < 2 || isNaN(priceVal) || priceVal <= 0) {
                    results.errors++;
                    continue;
                }

                itemsToProcess.push({ productName, eanVal, priceVal });
            }

            const totalItems = itemsToProcess.length;
            setProgress({ current: 0, total: totalItems });

            // Processar em lotes de 100 para melhor performance
            const BATCH_SIZE = 100;
            const newProductsToCreate = [];
            const pricesToCreate = [];
            let processedCount = 0;

            // Primeiro, identificar produtos novos
            for (const item of itemsToProcess) {
                if (!productsMap[item.productName.toLowerCase()]) {
                    newProductsToCreate.push({
                        name: item.productName,
                        ean: item.eanVal,
                        manufacturer: '',
                        category: 'generico',
                        unit: 'cx'
                    });
                    // Marca como pendente para evitar duplicatas
                    productsMap[item.productName.toLowerCase()] = { pending: true };
                }
            }

            // Criar produtos novos em lotes
            const totalNewProducts = newProductsToCreate.length;
            for (let i = 0; i < newProductsToCreate.length; i += BATCH_SIZE) {
                const batch = newProductsToCreate.slice(i, i + BATCH_SIZE);
                try {
                    const createdProducts = await createProductsBatch(batch);
                    createdProducts.forEach(p => {
                        productsMap[p.name.toLowerCase()] = p;
                    });
                } catch (err) {
                    console.error('Erro ao criar lote de produtos:', err);
                    // Fallback: criar um por um
                    for (const prod of batch) {
                        try {
                            const created = await createProduct(prod);
                            productsMap[created.name.toLowerCase()] = created;
                        } catch (e) {
                            console.error('Erro ao criar produto:', e);
                        }
                    }
                }
                // Progresso durante criação de produtos (primeira metade)
                const productProgress = Math.min(i + BATCH_SIZE, totalNewProducts);
                setProgress({ current: productProgress, total: totalItems, phase: 'Cadastrando produtos...' });
            }

            // Preparar preços
            console.log('=== PREPARANDO PREÇOS ===');
            console.log('Total de itens a processar:', itemsToProcess.length);
            console.log('Produtos no mapa:', Object.keys(productsMap).length);

            for (const item of itemsToProcess) {
                const product = productsMap[item.productName.toLowerCase()];
                if (product && product.id) {
                    pricesToCreate.push({
                        product_id: product.id,
                        distributor_id: selectedDistributor,
                        price: item.priceVal,
                        min_quantity: 1,
                        validity: null
                    });
                } else {
                    if (!product) {
                        console.log('Produto não encontrado:', item.productName);
                    } else if (!product.id) {
                        console.log('Produto sem ID:', item.productName, product);
                    }
                    results.errors++;
                }
            }

            console.log('Total de preços a criar:', pricesToCreate.length);
            console.log('Distribuidora selecionada:', selectedDistributor);
            if (pricesToCreate.length > 0) {
                console.log('Primeiro preço:', pricesToCreate[0]);
            }

            // Criar preços em lotes
            for (let i = 0; i < pricesToCreate.length; i += BATCH_SIZE) {
                const batch = pricesToCreate.slice(i, i + BATCH_SIZE);
                try {
                    console.log(`Criando lote ${i / BATCH_SIZE + 1} com ${batch.length} preços...`);
                    await createPricesBatch(batch);
                    results.success += batch.length;
                    console.log(`Lote criado com sucesso!`);
                } catch (err) {
                    console.error('Erro ao criar lote de preços:', err);
                    // Fallback: criar um por um
                    for (const price of batch) {
                        try {
                            await createPrice(price);
                            results.success++;
                        } catch (e) {
                            console.error('Erro ao criar preço:', e);
                            results.errors++;
                        }
                    }
                }
                processedCount = Math.min(i + BATCH_SIZE, pricesToCreate.length);
                setProgress({ current: processedCount, total: totalItems, phase: 'Registrando preços...' });
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
        setProgress({ current: 0, total: 0 });
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
                                {progress.total > 0 && (
                                    <>
                                        <p style={{ fontWeight: 500 }}>{progress.phase || 'Preparando...'}</p>
                                        <p>{progress.current} de {progress.total} itens</p>
                                        <div style={{ width: '100%', maxWidth: 300, height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden', margin: '1rem auto' }}>
                                            <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </>
                                )}
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aguarde...</p>
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
