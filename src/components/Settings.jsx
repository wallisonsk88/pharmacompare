import React from 'react';
import { Settings, HelpCircle, Database, Cloud, CloudOff, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../config/supabase';

export default function SettingsPage() {
    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Configurações</h1>
                <p className="page-subtitle">Gerencie as configurações do sistema</p>
            </div>

            <div className="card mb-lg">
                <div className="card-header">
                    <h3 className="card-title flex items-center gap-sm">
                        <Database size={20} />
                        Armazenamento de Dados
                    </h3>
                </div>
                <div className="flex items-center gap-lg" style={{ marginTop: 'var(--spacing-md)' }}>
                    {isSupabaseConfigured ? (
                        <>
                            <div className="stat-icon accent" style={{ width: 48, height: 48 }}><Cloud size={24} /></div>
                            <div>
                                <strong style={{ color: 'var(--success)' }}>Conectado à Nuvem</strong>
                                <p style={{ margin: 0 }}>Seus dados estão sendo salvos no Supabase</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-icon warning" style={{ width: 48, height: 48 }}><CloudOff size={24} /></div>
                            <div>
                                <strong style={{ color: 'var(--warning)' }}>Armazenamento Local</strong>
                                <p style={{ margin: 0 }}>Dados salvos apenas neste navegador. Configure o Supabase para sincronizar na nuvem.</p>
                            </div>
                        </>
                    )}
                </div>

                {!isSupabaseConfigured && (
                    <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <strong>Como configurar o Supabase:</strong>
                        <ol style={{ margin: 'var(--spacing-sm) 0 0 var(--spacing-lg)', color: 'var(--text-secondary)' }}>
                            <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a> e crie uma conta gratuita</li>
                            <li>Crie um novo projeto</li>
                            <li>Copie a URL e a chave anônima (anon key) das configurações</li>
                            <li>Edite o arquivo <code>.env</code> na raiz do projeto com suas credenciais</li>
                            <li>Reinicie o servidor de desenvolvimento</li>
                        </ol>
                    </div>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title flex items-center gap-sm"><Settings size={20} />Sobre o Sistema</h3>
                </div>
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <p><strong>PharmaCompare</strong> - Sistema de Comparação de Preços</p>
                    <p>Versão: 1.0.0</p>
                    <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-tertiary)' }}>Desenvolvido para facilitar a comparação de preços de medicamentos entre distribuidoras farmacêuticas.</p>
                </div>
            </div>
        </div>
    );
}

export function HelpPage() {
    return (
        <div className="main-content">
            <div className="page-header">
                <h1 className="page-title">Ajuda</h1>
                <p className="page-subtitle">Como usar o PharmaCompare</p>
            </div>

            <div className="card mb-lg">
                <h3 className="card-title mb-md">🚀 Primeiros Passos</h3>
                <ol style={{ marginLeft: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: 'var(--spacing-sm)' }}><strong>Cadastre suas distribuidoras:</strong> Acesse "Distribuidoras" e adicione as empresas que você costuma comprar.</li>
                    <li style={{ marginBottom: 'var(--spacing-sm)' }}><strong>Cadastre os medicamentos:</strong> Em "Medicamentos", adicione os produtos que deseja comparar.</li>
                    <li style={{ marginBottom: 'var(--spacing-sm)' }}><strong>Registre os preços:</strong> Na seção "Preços", vincule produtos às distribuidoras com seus respectivos valores.</li>
                    <li style={{ marginBottom: 'var(--spacing-sm)' }}><strong>Compare:</strong> Use a tela "Comparar" para ver qual distribuidora oferece o melhor preço.</li>
                </ol>
            </div>

            <div className="card mb-lg">
                <h3 className="card-title mb-md">📥 Importação de Dados</h3>
                <p>Você pode importar tabelas de preços no formato Excel (.xlsx) ou CSV:</p>
                <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                    <li>O sistema tentará identificar automaticamente as colunas</li>
                    <li>Você pode ajustar o mapeamento manualmente antes de importar</li>
                    <li>Produtos e distribuidoras não existentes serão criados automaticamente</li>
                </ul>
            </div>

            <div className="card">
                <h3 className="card-title mb-md">📊 Histórico de Preços</h3>
                <p>O sistema mantém um histórico de todos os preços registrados, permitindo:</p>
                <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                    <li>Visualizar a variação de preços ao longo do tempo</li>
                    <li>Identificar tendências de aumento ou redução</li>
                    <li>Tomar decisões de compra mais informadas</li>
                </ul>
            </div>
        </div>
    );
}
