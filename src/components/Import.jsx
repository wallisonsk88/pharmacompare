import React, { useState, useRef } from 'react';
import { FileDown, Upload, FileSpreadsheet, FileText, X, Check, AlertTriangle, Loader, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getProducts, getDistributors, createProduct, createDistributor, createPrice } from '../config/supabase';

// Configurar worker do PDF.js com import local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function Import() {
    const [fileData, setFileData] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState('');
    const [headers, setHeaders] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [mapping, setMapping] = useState({
        productName: '', productEan: '', manufacturer: '', distributorName: '', price: '', minQuantity: '', validity: ''
    });
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [step, setStep] = useState(1);
    const [pdfProcessing, setPdfProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setImportResult(null);
        const ext = file.name.split('.').pop().toLowerCase();
        setFileType(ext);

        if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const data = new Uint8Array(ev.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                processSpreadsheetData(jsonData);
            };
            reader.readAsArrayBuffer(file);
        } else if (ext === 'pdf') {
            setPdfProcessing(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                // Tentar extrair tabela do texto do PDF
                const tableData = extractTableFromPdfText(fullText);
                if (tableData.length >= 2) {
                    processSpreadsheetData(tableData);
                } else {
                    alert('Não foi possível extrair dados estruturados do PDF. Tente um arquivo com tabelas mais claras ou use Excel/CSV.');
                    setPdfProcessing(false);
                }
            } catch (error) {
                console.error('Erro ao processar PDF:', error);
                alert('Erro ao processar o PDF. Verifique se o arquivo não está protegido.');
                setPdfProcessing(false);
            }
        } else {
            alert('Use Excel (.xlsx), CSV ou PDF.');
        }
    };

    const extractTableFromPdfText = (text) => {
        // Dividir por linhas
        const lines = text.split('\n').filter(line => line.trim());
        const tableRows = [];

        // Padrões comuns em tabelas de preços de medicamentos
        const pricePattern = /R?\$?\s*\d+[.,]\d{2}/g;
        const eanPattern = /\d{13}/g;

        // Tentar detectar linhas que parecem ser dados de tabela
        for (const line of lines) {
            const hasPrice = pricePattern.test(line);
            pricePattern.lastIndex = 0; // Reset regex

            if (hasPrice) {
                // Tentar dividir a linha em colunas
                // Primeiro tenta por múltiplos espaços
                let cols = line.split(/\s{2,}/).filter(c => c.trim());

                // Se não conseguiu dividir bem, tenta por tabulação
                if (cols.length < 2) {
                    cols = line.split('\t').filter(c => c.trim());
                }

                // Se ainda não conseguiu, tenta extrair campos individuais
                if (cols.length < 2) {
                    const parts = [];
                    // Extrair preço
                    const priceMatch = line.match(/R?\$?\s*(\d+[.,]\d{2})/);
                    if (priceMatch) {
                        // Pegar texto antes do preço como nome do produto
                        const beforePrice = line.substring(0, line.indexOf(priceMatch[0])).trim();
                        if (beforePrice) parts.push(beforePrice);
                        parts.push(priceMatch[0]);
                    }
                    if (parts.length >= 2) cols = parts;
                }

                if (cols.length >= 2) {
                    tableRows.push(cols);
                }
            }
        }

        // Se encontrou linhas, adiciona cabeçalho genérico
        if (tableRows.length > 0) {
            const maxCols = Math.max(...tableRows.map(r => r.length));
            const headers = ['Produto'];
            for (let i = 1; i < maxCols - 1; i++) {
                headers.push(`Coluna ${i + 1}`);
            }
            headers.push('Preço');

            // Normalizar número de colunas em cada linha
            const normalizedRows = tableRows.map(row => {
                while (row.length < maxCols) row.splice(row.length - 1, 0, '');
                return row.slice(0, maxCols);
            });

            return [headers, ...normalizedRows];
        }

        return [];
    };

    const processSpreadsheetData = (jsonData) => {
        setPdfProcessing(false);
        if (jsonData.length < 2) {
            alert('Arquivo precisa ter cabeçalho e dados.');
            return;
        }
        const headerRow = jsonData[0].map(h => String(h || '').trim());
        const dataRows = jsonData.slice(1).filter(row => row.some(c => c));
        setHeaders(headerRow);
        setPreviewData(dataRows.slice(0, 5));
        setFileData(dataRows);
        autoMap(headerRow);
        setStep(2);
    };

    const autoMap = (headerRow) => {
        const m = { ...mapping };
        headerRow.forEach((h, i) => {
            const l = h.toLowerCase();
            if (l.includes('produto') || l.includes('medicamento') || l.includes('nome') || l.includes('descri')) m.productName = i.toString();
            if (l.includes('ean') || l.includes('barras') || l.includes('codigo') || l.includes('código')) m.productEan = i.toString();
            if (l.includes('fabric') || l.includes('laborat') || l.includes('marca')) m.manufacturer = i.toString();
            if (l.includes('distribu') || l.includes('fornec')) m.distributorName = i.toString();
            if (l.includes('preço') || l.includes('preco') || l.includes('valor') || l.includes('price') || l.includes('pmc') || l.includes('custo')) m.price = i.toString();
            if (l.includes('qtd') || l.includes('min') || l.includes('quantidade')) m.minQuantity = i.toString();
        });
        setMapping(m);
    };

    const handleImport = async () => {
        if (!mapping.productName || !mapping.price) { alert('Mapeie produto e preço.'); return; }
        setImporting(true);
        const results = { success: 0, errors: 0, products: 0, distributors: 0, prices: 0 };
        const existingProducts = await getProducts();
        const existingDistributors = await getDistributors();
        const productsMap = {}; existingProducts.forEach(p => { productsMap[p.name.toLowerCase()] = p; if (p.ean) productsMap[p.ean] = p; });
        const distributorsMap = {}; existingDistributors.forEach(d => { distributorsMap[d.name.toLowerCase()] = d; });

        for (const row of fileData) {
            try {
                const pName = String(row[parseInt(mapping.productName)] || '').trim();
                // Limpar o preço - remover R$, espaços, e converter vírgula para ponto
                let priceStr = String(row[parseInt(mapping.price)] || '0');
                priceStr = priceStr.replace(/[R$\s]/g, '').replace(',', '.').replace(/[^\d.]/g, '');
                const priceVal = parseFloat(priceStr);

                if (!pName || isNaN(priceVal) || priceVal <= 0) { results.errors++; continue; }

                let product = productsMap[pName.toLowerCase()];
                if (!product) {
                    const ean = mapping.productEan ? String(row[parseInt(mapping.productEan)] || '').trim() : '';
                    const mfr = mapping.manufacturer ? String(row[parseInt(mapping.manufacturer)] || '').trim() : '';
                    product = await createProduct({ name: pName, ean, manufacturer: mfr, category: 'generico', unit: 'cx' });
                    productsMap[pName.toLowerCase()] = product;
                    results.products++;
                }

                let distributor = null;
                if (mapping.distributorName) {
                    const dName = String(row[parseInt(mapping.distributorName)] || '').trim();
                    if (dName) {
                        distributor = distributorsMap[dName.toLowerCase()];
                        if (!distributor) {
                            distributor = await createDistributor({ name: dName, cnpj: '', contact: '', notes: 'Importado' });
                            distributorsMap[dName.toLowerCase()] = distributor;
                            results.distributors++;
                        }
                    }
                }

                if (distributor) {
                    const minQ = mapping.minQuantity ? parseInt(row[parseInt(mapping.minQuantity)] || '1') : 1;
                    await createPrice({ product_id: product.id, distributor_id: distributor.id, price: priceVal, min_quantity: minQ || 1, validity: null });
                    results.prices++;
                }
                results.success++;
            } catch { results.errors++; }
        }
        setImportResult(results);
        setStep(3);
        setImporting(false);
    };

    const reset = () => {
        setFileData(null);
        setFileName('');
        setFileType('');
        setHeaders([]);
        setPreviewData([]);
        setMapping({ productName: '', productEan: '', manufacturer: '', distributorName: '', price: '', minQuantity: '', validity: '' });
        setImportResult(null);
        setStep(1);
        setPdfProcessing(false);
    };

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Importar Dados</h1>
                <p className="page-subtitle">Importe tabelas de preços de arquivos Excel, CSV ou PDF</p>
            </div>

            <div className="card mb-lg">
                <div className="flex items-center justify-center gap-lg">
                    <div className={`flex items-center gap-sm ${step >= 1 ? 'text-primary' : ''}`}>
                        <div className={`stat-icon ${step >= 1 ? 'primary' : ''}`} style={{ width: 32, height: 32 }}><Upload size={16} /></div>
                        <span>Upload</span>
                    </div>
                    <ArrowRight size={20} style={{ color: 'var(--text-tertiary)' }} />
                    <div className={`flex items-center gap-sm ${step >= 2 ? 'text-primary' : ''}`}>
                        <div className={`stat-icon ${step >= 2 ? 'primary' : ''}`} style={{ width: 32, height: 32 }}><FileSpreadsheet size={16} /></div>
                        <span>Mapeamento</span>
                    </div>
                    <ArrowRight size={20} style={{ color: 'var(--text-tertiary)' }} />
                    <div className={`flex items-center gap-sm ${step >= 3 ? 'text-primary' : ''}`}>
                        <div className={`stat-icon ${step >= 3 ? 'accent' : ''}`} style={{ width: 32, height: 32 }}><Check size={16} /></div>
                        <span>Resultado</span>
                    </div>
                </div>
            </div>

            {step === 1 && (
                <div className="card">
                    {pdfProcessing ? (
                        <div className="empty-state">
                            <Loader size={64} className="loading" />
                            <h3>Processando PDF...</h3>
                            <p>Extraindo dados do documento, aguarde...</p>
                        </div>
                    ) : (
                        <>
                            <div className="empty-state" style={{ border: '2px dashed var(--border-secondary)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                                <FileDown size={64} />
                                <h3>Clique para selecionar arquivo</h3>
                                <p>Formatos suportados:</p>
                                <div className="flex gap-md mt-md">
                                    <span className="badge badge-success"><FileSpreadsheet size={14} /> Excel</span>
                                    <span className="badge badge-info"><FileText size={14} /> CSV</span>
                                    <span className="badge badge-warning"><FileText size={14} /> PDF</span>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <strong>💡 Dicas para importação de PDF:</strong>
                                <ul style={{ margin: 'var(--spacing-sm) 0 0 var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <li>PDFs com tabelas bem estruturadas funcionam melhor</li>
                                    <li>PDFs digitalizados (imagens) podem não funcionar</li>
                                    <li>Se o PDF não funcionar, exporte para Excel primeiro</li>
                                </ul>
                            </div>
                        </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>
            )}

            {step === 2 && (
                <>
                    <div className="card mb-lg">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Mapeamento de Colunas</h3>
                                <p className="card-subtitle">
                                    {fileName} ({fileData.length} linhas)
                                    {fileType === 'pdf' && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Extraído de PDF</span>}
                                </p>
                            </div>
                            <button className="btn btn-secondary" onClick={reset}><X size={16} /> Cancelar</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                            {['productName', 'productEan', 'manufacturer', 'distributorName', 'price', 'minQuantity'].map(field => (
                                <div key={field} className="form-group">
                                    <label className="form-label">
                                        {field === 'productName' ? 'Nome Produto *' :
                                            field === 'price' ? 'Preço *' :
                                                field === 'productEan' ? 'Código EAN' :
                                                    field === 'manufacturer' ? 'Fabricante' :
                                                        field === 'distributorName' ? 'Distribuidora' :
                                                            field === 'minQuantity' ? 'Qtd. Mínima' : field}
                                    </label>
                                    <select className="form-select" value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
                                        <option value="">{field === 'productName' || field === 'price' ? 'Selecione' : 'Não importar'}</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card mb-lg">
                        <h3 className="card-title mb-md">Prévia dos Dados</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead><tr>{headers.map((h, i) => <th key={i}>{h || `Coluna ${i + 1}`}</th>)}</tr></thead>
                                <tbody>{previewData.map((row, ri) => <tr key={ri}>{headers.map((_, ci) => <td key={ci}>{row[ci] || '-'}</td>)}</tr>)}</tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <button className="btn btn-secondary" onClick={reset}>Cancelar</button>
                        <button className="btn btn-primary btn-lg" onClick={handleImport} disabled={importing || !mapping.productName || !mapping.price}>
                            {importing ? <><Loader size={18} className="loading" /> Importando...</> : <>Importar {fileData.length} Registros</>}
                        </button>
                    </div>
                </>
            )}

            {step === 3 && importResult && (
                <div className="card">
                    <div className="empty-state">
                        <div className="stat-icon accent" style={{ width: 80, height: 80 }}><Check size={40} /></div>
                        <h3>Importação Concluída!</h3>
                        <p>{importResult.success} de {fileData.length} importados</p>
                        <div className="stats-grid" style={{ marginTop: 'var(--spacing-xl)', width: '100%' }}>
                            <div className="stat-card"><div className="stat-icon accent"><Check size={24} /></div><div className="stat-content"><div className="stat-value">{importResult.success}</div><div className="stat-label">Sucessos</div></div></div>
                            <div className="stat-card"><div className="stat-icon primary"><FileSpreadsheet size={24} /></div><div className="stat-content"><div className="stat-value">{importResult.products}</div><div className="stat-label">Produtos</div></div></div>
                            <div className="stat-card"><div className="stat-icon info"><FileSpreadsheet size={24} /></div><div className="stat-content"><div className="stat-value">{importResult.distributors}</div><div className="stat-label">Distribuidoras</div></div></div>
                            <div className="stat-card"><div className="stat-icon warning"><FileSpreadsheet size={24} /></div><div className="stat-content"><div className="stat-value">{importResult.prices}</div><div className="stat-label">Preços</div></div></div>
                            {importResult.errors > 0 && (
                                <div className="stat-card" style={{ borderColor: 'var(--error)' }}>
                                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)' }}><AlertTriangle size={24} /></div>
                                    <div className="stat-content"><div className="stat-value">{importResult.errors}</div><div className="stat-label">Erros</div></div>
                                </div>
                            )}
                        </div>
                        <button className="btn btn-primary btn-lg mt-lg" onClick={reset}>Nova Importação</button>
                    </div>
                </div>
            )}
        </div>
    );
}
