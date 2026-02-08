import React, { useState, useEffect } from 'react';
import { Package, TrendingDown, TrendingUp, Archive, Search, Save, Loader2 } from 'lucide-react';
import { DB } from '../db';
import { Customer, SystemSettings } from '../types';

const CratesView: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Stats
    const [totalOwned, setTotalOwned] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [custs, sets] = await Promise.all([
                DB.getCustomers(),
                DB.getSettings()
            ]);
            setCustomers(custs);
            setSettings(sets);
            setTotalOwned(sets.total_crates || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveTotalCrates = async () => {
        if (!settings) return;
        setSavingConfig(true);
        try {
            await DB.saveSettings({ ...settings, total_crates: totalOwned });
            alert("Configuração salva!");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSavingConfig(false);
        }
    };

    const totalLoaned = customers.reduce((acc, c) => acc + (c.crates_balance || 0), 0);
    const inStock = totalOwned - totalLoaned;

    const debtors = customers
        .filter(c => (c.crates_balance || 0) !== 0)
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.crates_balance || 0) - (a.crates_balance || 0));

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-nike" size={48} /></div>;

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black italic uppercase text-white flex items-center gap-3">
                    <Package size={40} className="text-nike" /> Controle de Caixas
                </h1>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111] p-6 rounded-[32px] border border-zinc-800 flex flex-col justify-between group hover:border-nike transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-zinc-800/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div>
                        <p className="text-zinc-500 font-black uppercase text-xs tracking-widest pl-1">Total Patrimônio (Compradas)</p>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="number"
                                value={totalOwned}
                                onChange={(e) => setTotalOwned(parseInt(e.target.value) || 0)}
                                className="bg-black border border-zinc-800 rounded-xl p-2 text-3xl font-black italic text-white outline-none w-32 focus:border-nike"
                            />
                            <button onClick={saveTotalCrates} disabled={savingConfig} className="p-3 bg-zinc-800 rounded-xl hover:bg-nike hover:text-black transition-all">
                                {savingConfig ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase">
                        <Archive size={14} /> Patrimônio Total da Empresa
                    </div>
                </div>

                <div className="bg-[#111] p-6 rounded-[32px] border border-zinc-800 flex flex-col justify-between group hover:border-red-500 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-red-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div>
                        <p className="text-zinc-500 font-black uppercase text-xs tracking-widest pl-1">Emprestadas (Na Rua)</p>
                        <h2 className="text-4xl font-black italic text-red-500 mt-2">{totalLoaned}</h2>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-red-500 text-xs font-bold uppercase">
                        <TrendingUp size={14} /> {debtors.length} Clientes com caixas
                    </div>
                </div>

                <div className="bg-[#111] p-6 rounded-[32px] border border-zinc-800 flex flex-col justify-between group hover:border-green-500 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-green-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div>
                        <p className="text-zinc-500 font-black uppercase text-xs tracking-widest pl-1">Em Estoque (Disponível)</p>
                        <h2 className={`text-4xl font-black italic mt-2 ${inStock < 0 ? 'text-red-500' : 'text-green-500'}`}>{inStock}</h2>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-green-500 text-xs font-bold uppercase">
                        <TrendingDown size={14} /> Calculado Automaticamente
                    </div>
                </div>
            </div>

            {/* LISTA DE DEVEDORES */}
            <div className="flex-1 bg-[#111] border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2 text-white">
                        <TrendingUp className="text-red-500" /> Clientes Pendentes
                    </h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full bg-black border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-white font-bold outline-none focus:border-nike transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {debtors.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                            <Package size={64} className="opacity-20" />
                            <p className="font-black italic uppercase text-sm">Nenhuma pendência encontrada</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-zinc-900/50 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cliente</th>
                                    <th className="text-left p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Contato</th>
                                    <th className="text-right p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Saldo Devedor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {debtors.map(c => (
                                    <tr key={c.id} className="hover:bg-zinc-900/30 transition-all">
                                        <td className="p-6">
                                            <p className="font-bold text-white uppercase text-sm">{c.name}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-zinc-400 text-xs">{c.phone}</p>
                                            <p className="text-[10px] text-zinc-600">{c.email}</p>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className={`px-4 py-2 rounded-xl text-xs font-black italic ${(c.crates_balance || 0) > 0
                                                    ? 'bg-red-500/10 text-red-500'
                                                    : 'bg-green-500/10 text-green-500'
                                                }`}>
                                                {c.crates_balance} caixas
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CratesView;
