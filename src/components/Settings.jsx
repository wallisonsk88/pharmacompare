import React from 'react';
import { Settings, Database, Palette, Bell, Shield, HelpCircle, Trash2, AlertTriangle, Download, Upload as UploadIcon, FileJson, Loader } from 'lucide-react';
import { isSupabaseConfigured, clearAllData, exportFullDatabase, importFullDatabase, smartImportFromSpreadsheet } from '../config/supabase';
import * as XLSX from 'xlsx';

export default function SettingsPage() {
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef(null);

    const handleExport = async (format = 'xlsx') => {
        setIsExporting(true);
        try {
            const data = await exportFullDatabase();

            if (format === 'json') {
                const fileName = `pharmacompare_backup_${new Date().toISOString().split('T')[0]}.json`;
                const jsonStr = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                // Para CSV, exportamos apenas os preços que contém Nome, EAN e Valor (CSV só suporta uma aba)
                const pricesForExport = data.prices.map(p => ({
                    "Nome do Produto": p.products?.name || '',
                    "Código de Barras (EAN)": p.products?.ean || '',
                    "Preço": p.price || 0,
                    "Distribuidora": p.distributors?.name || '',
                    "Data Registro": p.recorded_at ? new Date(p.recorded_at).toLocaleDateString() : ''
                }));
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(pricesForExport);
                XLSX.utils.book_append_sheet(wb, ws, "Preços");
                const fileName = `pharmacompare_precos_${new Date().toISOString().split('T')[0]}.csv`;
                XLSX.writeFile(wb, fileName, { bookType: 'csv' });
            } else {
                const wb = XLSX.utils.book_new();
                // ... rest of the excel export (keeping existing logic for xlsx)

                // Adicionar cada tabela como uma aba no Excel
                if (data.distributors) {
                    const ws = XLSX.utils.json_to_sheet(data.distributors);
                    XLSX.utils.book_append_sheet(wb, ws, "Distribuidoras");
                }
                if (data.products) {
                    // Mapear campos para nomes amigáveis
                    const productsForExport = data.products.map(p => ({
                        "Nome do Produto": p.name || '',
                        "Código de Barras (EAN)": p.ean || '',
                        "Categoria": p.category || '',
                        "Fabricante": p.manufacturer || ''
                    }));
                    const ws = XLSX.utils.json_to_sheet(productsForExport);
                    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
                }
                if (data.prices) {
                    // Mapear campos para nomes amigáveis incluindo nome do produto e EAN
                    const pricesForExport = data.prices.map(p => ({
                        "Nome do Produto": p.products?.name || '',
                        "Código de Barras (EAN)": p.products?.ean || '',
                        "Preço": p.price || 0,
                        "Distribuidora": p.distributors?.name || '',
                        "Data Registro": p.recorded_at ? new Date(p.recorded_at).toLocaleDateString() : ''
                    }));
                    const ws = XLSX.utils.json_to_sheet(pricesForExport);
                    XLSX.utils.book_append_sheet(wb, ws, "Preços");
                }
                if (data.shopping_list) {
                    const ws = XLSX.utils.json_to_sheet(data.shopping_list);
                    XLSX.utils.book_append_sheet(wb, ws, "Lista de Compras");
                }

                const fileName = `pharmacompare_export_${new Date().toISOString().split('T')[0]}.${format}`;
                XLSX.writeFile(wb, fileName, { bookType: format });
            }

            alert('Exportação concluída com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao exportar dados: ' + error.message);
        }
        setIsExporting(false);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('ATENÇÃO: Importar um backup irá APAGAR todos os dados atuais e substituí-los pelos dados do arquivo. Deseja continuar?')) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        try {
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const data = JSON.parse(evt.target.result);
                        await importFullDatabase(data);
                        alert('Banco de dados restaurado com sucesso!');
                        window.location.reload();
                    } catch (err) {
                        alert('Erro ao processar JSON: ' + err.message);
                        setIsImporting(false);
                    }
                };
                reader.readAsText(file);
            } else {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const bstr = evt.target.result;
                        const wb = XLSX.read(bstr, { type: 'binary' });
                        const importedData = {};

                        console.log('Processando planilhas do Excel/CSV...', wb.SheetNames);

                        // Mapeamento de nomes de abas para chaves do banco
                        const sheetMap = {
                            "Distribuidoras": "distributors",
                            "Produtos": "products",
                            "Preços": "prices",
                            "Lista de Compras": "shopping_list"
                        };

                        wb.SheetNames.forEach(sheetName => {
                            let key = sheetMap[sheetName];
                            const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

                            // Se tiver apenas uma aba (como no CSV ou planilha simples), e não encontrou no map, 
                            // tentamos detectar pelo cabeçalho
                            if (!key && wb.SheetNames.length === 1 && sheetData.length > 0) {
                                const headers = Object.keys(sheetData[0]).map(h => h.toLowerCase());
                                if (headers.some(h => h.includes('nome') || h.includes('ean'))) {
                                    key = 'products'; // Assume produtos se tiver nome ou ean
                                }
                                if (headers.some(h => h.includes('preço') || h.includes('valor'))) {
                                    // Se tiver preço e não tiver nome, assume preços. 
                                    // Se tiver os dois, produtos mapeia primeiro e podemos tentar duplicar ou escolher o melhor
                                    if (!key) key = 'prices';
                                }
                            }

                            if (!key) return;

                            console.log(`Mapeando aba "${sheetName}" para "${key}" com ${sheetData.length} registros`);

                            // Mapeamento reverso para importar com nomes amigáveis
                            if (key === 'products') {
                                importedData[key] = sheetData
                                    .map(row => ({
                                        name: row["Nome do Produto"] || row["name"] || row["Nome"] || row["nome"] || row["PRODUTO"],
                                        ean: String(row["Código de Barras (EAN)"] || row["ean"] || row["Código de Barras"] || row["ean"] || row["EAN"] || '').trim(),
                                        category: row["Categoria"] || row["category"] || 'generico',
                                        manufacturer: row["Fabricante"] || row["manufacturer"] || ''
                                    }))
                                    .filter(p => p.name && String(p.name).trim().length > 0);
                            } else if (key === 'prices') {
                                importedData[key] = sheetData
                                    .map(row => {
                                        const priceRaw = row["Preço"] || row["price"] || row["valor"] || row["VALOR"] || '0';
                                        return {
                                            price: parseFloat(String(priceRaw).replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.')),
                                            name: row["Nome do Produto"] || row["name"] || row["Nome"] || row["nome"] || row["PRODUTO"], // Para o smart link
                                            distributor: row["Distribuidora"] || row["distributor"] || row["DISTRIBUIDORA"],
                                            ...row
                                        };
                                    })
                                    .filter(p => p.price > 0 && (p["product_id"] || p.name));
                            } else {
                                importedData[key] = sheetData;
                            }
                        });

                        if (Object.keys(importedData).length === 0) {
                            throw new Error('Nenhum dado válido encontrado no arquivo. Verifique os nomes das colunas (Nome, Preço, EAN).');
                        }

                        console.log('Enviando para smartImport...', importedData);
                        const result = await smartImportFromSpreadsheet(importedData);

                        alert(`Importação concluída!\nProdutos: ${result.totals.products}\nPreços: ${result.totals.prices}\nDistribuidoras: ${result.totals.distributors}`);
                        window.location.reload();
                    } catch (err) {
                        console.error('Erro no processamento do Excel:', err);
                        alert('Erro ao processar arquivo: ' + err.message);
                        setIsImporting(false);
                    }
                };
                reader.readAsBinaryString(file);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao importar dados: ' + error.message);
            setIsImporting(false);
        }
    };

    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">⚙️ Configurações</h1>
                <p className="page-subtitle">Gerencie as configurações do sistema</p>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                {/* Status do Banco */}
                <div className="card">
                    <h3 className="card-title mb-lg"><Database size={20} /> Banco de Dados</h3>
                    <div className="stat-card" style={{ background: isSupabaseConfigured ? 'var(--accent-success-light)' : 'var(--accent-warning-light)' }}>
                        <div className="stat-icon" style={{ background: isSupabaseConfigured ? 'var(--accent-success)' : 'var(--accent-warning)', color: 'white' }}>
                            <Database size={24} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: isSupabaseConfigured ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                {isSupabaseConfigured ? 'Supabase Conectado' : 'Usando LocalStorage'}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                {isSupabaseConfigured
                                    ? 'Seus dados estão sincronizados na nuvem'
                                    : 'Configure as variáveis de ambiente para usar Supabase'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sobre */}
                <div className="card">
                    <h3 className="card-title mb-lg"><HelpCircle size={20} /> Sobre o Sistema</h3>
                    <div style={{ lineHeight: 1.8 }}>
                        <p><strong>PharmaCompare Pro</strong> - Sistema de comparação de preços farmacêuticos</p>
                        <p className="text-muted">Versão 2.0 - Design Premium</p>
                        <br />
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                            Desenvolvido para facilitar a comparação de preços entre distribuidoras,
                            permitindo encontrar as melhores ofertas para sua farmácia.
                        </p>
                    </div>
                </div>

                {/* Funcionalidades */}
                <div className="card">
                    <h3 className="card-title mb-lg"><Shield size={20} /> Funcionalidades</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                        {[
                            { icon: '📥', title: 'Importação', desc: 'Excel e CSV' },
                            { icon: '🔍', title: 'Comparação', desc: 'Preços lado a lado' },
                            { icon: '📊', title: 'Histórico', desc: 'Variações de preço' },
                            { icon: '🏢', title: 'Distribuidoras', desc: 'Gestão completa' },
                            { icon: '💰', title: 'Economia', desc: 'Melhor preço destacado' },
                            { icon: '☁️', title: 'Nuvem', desc: 'Supabase integrado' },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Backup e Restauração */}
                <div className="card">
                    <h3 className="card-title mb-lg"><Database size={20} /> Backup e Restauração</h3>
                    <p className="text-muted mb-lg" style={{ fontSize: '0.85rem' }}>
                        Exporte todo o seu banco de dados para segurança ou migração.
                        O arquivo gerado contém distribuidoras, produtos, preços e sua lista de compras.
                    </p>

                    <div className="flex gap-md wrap">
                        <button
                            className="btn btn-primary"
                            onClick={() => handleExport('xlsx')}
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader size={18} className="loading-spinner" /> : <Download size={18} />}
                            Exportar Excel (.xlsx)
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader size={18} className="loading-spinner" /> : <FileJson size={18} />}
                            Exportar CSV (.csv)
                        </button>

                        <button
                            className="btn btn-tertiary"
                            onClick={() => handleExport('json')}
                            disabled={isExporting}
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        >
                            {isExporting ? <Loader size={18} className="loading-spinner" /> : <Database size={18} />}
                            Exportar JSON (.json)
                        </button>

                        <button
                            className="btn btn-success"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            {isImporting ? <Loader size={18} className="loading-spinner" /> : <UploadIcon size={18} />}
                            Importar Banco
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".xlsx,.xls,.csv"
                            onChange={handleImport}
                        />
                    </div>
                </div>
            </div>

            {/* Zona de Perigo */}
            <div className="card" style={{ marginTop: 'var(--space-lg)', borderColor: 'var(--accent-danger)' }}>
                <h3 className="card-title mb-lg" style={{ color: 'var(--accent-danger)' }}><AlertTriangle size={20} /> Zona de Perigo</h3>
                <div className="flex justify-between items-center">
                    <div>
                        <div style={{ fontWeight: 600 }}>Limpar Todos os Dados</div>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            Exclui permanentemente todos os produtos, preços e histórico.
                            <br />
                            <strong>Esta ação é irreversível.</strong>
                        </div>
                    </div>
                    <button
                        className="btn btn-danger"
                        onClick={async () => {
                            if (confirm('TEM CERTEZA? Isso apagará TODOS os dados do sistema permanentemente.')) {
                                if (confirm('Sério mesmo? Não haverá como recuperar.')) {
                                    try {
                                        await clearAllData();
                                        alert('Banco de dados limpo com sucesso.');
                                        window.location.reload();
                                    } catch (e) {
                                        console.error(e);
                                        alert('Erro ao limpar dados: ' + e.message);
                                    }
                                }
                            }
                        }}
                    >
                        <Trash2 size={18} /> Limpar Tudo
                    </button>
                </div>
            </div>
        </div>
    );
}
