
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Loader2, 
  Calendar, 
  DollarSign, 
  Users, 
  Truck, 
  Hammer, 
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { DB } from '../db';
import { Expense, ExpenseCategory } from '../types';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().substring(0, 10),
    category: ExpenseCategory.OTHER
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await DB.getExpenses();
    setExpenses(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!newExpense.description || !newExpense.amount) {
      alert("Preencha descrição e valor!");
      return;
    }

    setIsSaving(true);
    try {
      await DB.saveExpense({
        date: newExpense.date || new Date().toISOString().substring(0, 10),
        description: newExpense.description || '',
        amount: Number(newExpense.amount),
        category: newExpense.category as ExpenseCategory
      });
      await loadData();
      setIsModalOpen(false);
      setNewExpense({ date: new Date().toISOString().substring(0, 10), category: ExpenseCategory.OTHER });
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir esta despesa?")) {
      await DB.deleteExpense(id);
      loadData();
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case ExpenseCategory.EMPLOYEE: return <Users size={20} className="text-blue-500" />;
      case ExpenseCategory.FREIGHT: return <Truck size={20} className="text-orange-500" />;
      case ExpenseCategory.LOADING: return <Hammer size={20} className="text-red-500" />;
      default: return <MoreHorizontal size={20} className="text-zinc-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest text-xs">Acessando Livro de Caixa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
            <Receipt className="text-nike" size={36} /> Gestão de Despesas
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-2 italic">Controle de Fluxo de Saída & Operacional</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-nike text-black font-black italic px-8 py-4 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
        >
          <Plus size={20} /> LANÇAR DESPESA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign size={100} className="text-nike" />
           </div>
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Total Despesas no Filtro</p>
           <h3 className="text-3xl font-black italic text-white">R$ {totalAmount.toFixed(2)}</h3>
        </div>
        
        {Object.values(ExpenseCategory).map(cat => {
           const catTotal = expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0);
           return (
             <div key={cat} className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl hover:border-nike/30 transition-all">
                <div className="flex items-center gap-3 mb-2">
                   {getCategoryIcon(cat)}
                   <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{cat}</p>
                </div>
                <h4 className="text-xl font-black italic text-zinc-300">R$ {catTotal.toFixed(2)}</h4>
             </div>
           );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-600" size={20} />
          <input 
            type="text" 
            placeholder="Buscar despesa..."
            className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-3xl py-6 pl-16 pr-6 focus:border-nike outline-none transition-all font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-64">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
           <select 
             className="w-full bg-[#111] border border-zinc-800 rounded-2xl p-4 pl-12 text-xs font-black uppercase outline-none focus:border-nike appearance-none cursor-pointer"
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value)}
           >
             <option value="all">Todas Categorias</option>
             {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-[#050505] border border-zinc-900 rounded-[40px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Data</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Categoria</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Descrição</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Valor</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest italic text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredExpenses.sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                <tr key={e.id} className="hover:bg-zinc-900/30 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                       <Calendar size={14} className="text-zinc-600" />
                       <span className="text-sm font-bold text-zinc-400">{new Date(e.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                     <div className="flex items-center gap-2">
                        {getCategoryIcon(e.category)}
                        <span className="text-[10px] font-black uppercase px-2 py-1 bg-zinc-800 rounded-full">{e.category}</span>
                     </div>
                  </td>
                  <td className="p-6">
                    <p className="text-sm font-bold text-white uppercase truncate max-w-xs">{e.description}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-lg font-black italic text-red-500">R$ {e.amount.toFixed(2)}</p>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleDelete(e.id)}
                      className="p-3 bg-zinc-900 rounded-xl text-zinc-600 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-20 text-center text-zinc-700 font-black uppercase italic tracking-widest text-xs">Nenhuma despesa registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic uppercase tracking-tighter">Lançar Despesa</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={28} /></button>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Data</label>
                       <input 
                         type="date" 
                         className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold focus:border-nike outline-none"
                         value={newExpense.date}
                         onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Categoria</label>
                       <select 
                         className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold focus:border-nike outline-none appearance-none"
                         value={newExpense.category}
                         onChange={(e) => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                       >
                         {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Descrição / Motivo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Pagamento Frete Mercadoria"
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Valor Total (R$)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-black italic text-red-500 focus:border-red-500 outline-none"
                      // Fix: Provide fallback empty string for value and cast input string to number for state updates
                      value={newExpense.amount || ''}
                      onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    />
                 </div>

                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   className="w-full py-6 bg-red-500 text-white font-black italic text-xl rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                 >
                   {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'REGISTRAR SAÍDA'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
