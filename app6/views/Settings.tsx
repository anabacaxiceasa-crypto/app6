
import React, { useState, useEffect } from 'react';
import { Cog, Save, RefreshCcw, Globe, ShieldCheck, Loader2, Smartphone, Database, CheckCircle, AlertCircle, ShieldAlert, Copy, Check, Terminal, Zap } from 'lucide-react';
import { DB, supabase } from '../db';
import { SystemSettings } from '../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({ id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    const tables = ['nikeflow_users', 'nikeflow_products', 'nikeflow_customers', 'nikeflow_sales', 'nikeflow_damaged', 'nikeflow_settings', 'nikeflow_customer_payments'];
    const status: Record<string, boolean> = {};
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      status[table] = !error;
    }
    setDbStatus(status);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    const data = await DB.getSettings();
    setSettings(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await DB.saveSettings(settings);
    setIsSaving(false);
    alert('Configurações aplicadas com sucesso!');
    window.location.reload();
  };

  const copySQL = () => {
    const sql = DB.getSecuritySQL();
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest">Acessando Camada Master...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
            <Cog className="text-nike" size={36} /> Ajustes Master
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-2">Segurança Master, Infraestrutura e Identidade</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-12 py-5 bg-nike text-black font-black italic rounded-2xl hover:scale-105 transition-all flex items-center gap-2 uppercase text-sm shadow-2xl"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          APLICAR MUDANÇAS MASTER
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-[#050505] border border-zinc-900 p-8 rounded-[40px] space-y-8 lg:col-span-2 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-zinc-900 pb-6">
            <Globe className="text-nike" size={24} />
            <h3 className="text-xl font-black italic uppercase">Identidade do Projeto</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2 italic">Nome da Aplicação</label>
              <input 
                type="text" 
                className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none transition-all uppercase"
                value={settings.app_name}
                onChange={(e) => setSettings({...settings, app_name: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-black border border-zinc-800 rounded-3xl">
              <div>
                <p className="font-bold text-sm uppercase italic">Modo de Segurança (Manutenção)</p>
                <p className="text-[9px] text-zinc-600 uppercase font-black">Restringir acesso de vendedores imediatamente</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${settings.maintenance_mode ? 'bg-red-500 justify-end' : 'bg-zinc-800 justify-start'}`}
              >
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#050505] border border-zinc-900 p-8 rounded-[40px] space-y-8 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-zinc-900 pb-6">
            <Database className="text-nike" size={24} />
            <h3 className="text-xl font-black italic uppercase">Status das Tabelas</h3>
          </div>

          <div className="space-y-4">
            {Object.entries(dbStatus).map(([table, ok]) => (
              <div key={table} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-500">{table.replace('nikeflow_', '')}</span>
                {ok ? (
                  <span className="flex items-center gap-1 text-nike"><CheckCircle size={14} /> OK</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 animate-pulse"><AlertCircle size={14} /> FALHA</span>
                )}
              </div>
            ))}
            {!Object.values(dbStatus).every(v => v) && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                 <p className="text-[9px] text-red-500 font-black uppercase leading-tight">TABELAS FALTANDO! Use a ferramenta de reparação abaixo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RLS & Reparação Tool */}
      <div className="bg-[#050505] border-2 border-red-500/30 p-10 rounded-[48px] space-y-8 relative overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.1)]">
        <div className="absolute top-0 right-0 p-10 opacity-10">
           <ShieldAlert size={160} className="text-red-500" />
        </div>
        
        <div className="flex items-center gap-4 border-b border-zinc-900 pb-8">
          <Terminal className="text-red-500" size={32} />
          <div>
            <h3 className="text-2xl font-black italic uppercase text-red-500 leading-none">Reparação de Erros de Banco</h3>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2 italic">Corrija tabelas ausentes e erros de cache (PostgREST)</p>
          </div>
        </div>

        <div className="space-y-6 max-w-3xl relative z-10">
          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
             <div className="flex items-center gap-3 text-red-500">
                <Zap size={20} />
                <p className="text-xs font-black uppercase tracking-tighter">Solução Imediata para Tabelas não encontradas</p>
             </div>
             <p className="text-zinc-400 text-xs font-bold leading-relaxed">
               Se você encontrou um erro dizendo que a tabela de <span className="text-white italic">Pagamentos (payments)</span> ou <span className="text-white italic">Vendas</span> não foi encontrada, siga estes passos:
             </p>
             <ol className="text-zinc-500 text-[11px] font-bold uppercase space-y-2 list-decimal pl-5">
               <li>Clique no botão vermelho "Copiar SQL" abaixo.</li>
               <li>Abra seu painel do <a href="https://supabase.com/dashboard" target="_blank" className="text-nike underline">Supabase</a>.</li>
               <li>Vá em <span className="text-white">"SQL Editor"</span> {">"} <span className="text-white">"New Query"</span>.</li>
               <li>Cole o código e clique em <span className="text-white">"Run"</span>.</li>
             </ol>
          </div>

          <div className="bg-black border border-zinc-900 p-8 rounded-3xl relative group">
             <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <pre className="text-[10px] text-zinc-600 font-mono overflow-x-auto max-h-32 custom-scrollbar">
               {DB.getSecuritySQL()}
             </pre>
             <button 
              onClick={copySQL}
              className="absolute top-6 right-6 bg-red-600 text-white px-6 py-4 rounded-2xl hover:bg-white hover:text-black transition-all flex items-center gap-3 text-xs font-black uppercase shadow-2xl"
             >
               {copied ? <Check size={18} /> : <Copy size={18} />}
               {copied ? 'COPIADO!' : 'COPIAR SQL'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
