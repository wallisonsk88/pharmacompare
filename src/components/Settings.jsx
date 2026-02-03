import React from 'react';
import { Settings, Database, Palette, Bell, Shield, HelpCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../config/supabase';

export default function SettingsPage() {
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
            </div>
        </div>
    );
}
