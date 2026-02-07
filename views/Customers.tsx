
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  X,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';
import { DB } from '../db';
import { Customer } from '../types';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const data = await DB.getCustomers();
    setCustomers(data);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleSave = async () => {
    if (!editingCustomer.name || !editingCustomer.phone) {
      setSaveError('Nome e Telefone são obrigatórios');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const dataToSave: Partial<Customer> = {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        email: editingCustomer.email,
        address: editingCustomer.address
      };
      if (editingCustomer.id) {
        dataToSave.id = editingCustomer.id;
      }
      await DB.saveCustomer(dataToSave);
      await fetchCustomers();
      setIsModalOpen(false);
      setEditingCustomer({});
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar cliente. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (filteredCustomers.length === 0) return;

    const headers = ["ID", "Nome", "Telefone", "E-mail", "Endereco"];
    const rows = filteredCustomers.map(c => [
      c.id,
      c.name,
      c.phone,
      c.email || '',
      c.address || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clientes_am_abacaxi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">Clientes</h2>
          <p className="text-zinc-500">Cadastro e gestão de relacionamento.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={exportToCSV}
            disabled={filteredCustomers.length === 0}
            className="flex-1 sm:flex-none bg-zinc-800 text-white font-black italic px-6 py-3 rounded-2xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 text-xs uppercase disabled:opacity-30"
          >
            <Download size={18} /> EXPORTAR CSV
          </button>
          <button 
            onClick={() => { setSaveError(''); setEditingCustomer({}); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-nike text-black font-black italic px-6 py-3 rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <UserPlus size={20} /> NOVO CLIENTE
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-[#111] border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-nike outline-none transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map(c => (
          <div key={c.id} className="bg-[#111] border border-zinc-800 p-6 rounded-[32px] group hover:border-nike transition-all cursor-pointer">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center font-black text-2xl text-zinc-500 group-hover:bg-nike group-hover:text-black transition-all">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 truncate">
                <h3 className="font-black italic text-xl truncate uppercase tracking-tighter">{c.name}</h3>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">CLIENTE REGISTRADO</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-zinc-400">
                <Phone size={16} className="text-zinc-600" /> <span className="text-sm font-bold">{c.phone}</span>
              </div>
              {c.email && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Mail size={16} className="text-zinc-600" /> <span className="text-sm truncate font-medium">{c.email}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <MapPin size={16} className="text-zinc-600" /> <span className="text-sm truncate font-medium">{c.address}</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => { setSaveError(''); setEditingCustomer(c); setIsModalOpen(true); }}
              className="w-full mt-6 py-3 bg-zinc-900 rounded-xl text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 hover:text-white transition-all italic"
            >
              EDITAR PERFIL
            </button>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-700 font-black uppercase italic tracking-widest text-xs">Nenhum cliente encontrado.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Perfil do Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              {saveError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black uppercase">
                  <AlertCircle size={18} /> {saveError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2 italic">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-nike outline-none transition-all uppercase"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do Cliente"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2 italic">Telefone (WhatsApp)</label>
                <input 
                  type="text" 
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-nike outline-none transition-all"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2 italic">E-mail (Opcional)</label>
                <input 
                  type="email" 
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-nike outline-none transition-all"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2 italic">Endereço</label>
                <input 
                  type="text" 
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-nike outline-none transition-all uppercase"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, Número, Bairro"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-6 py-5 bg-nike text-black font-black italic text-xl rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'SALVAR CLIENTE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
