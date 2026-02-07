
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Smartphone, Banknote, History, X, Loader2 } from 'lucide-react';
import { DB } from '../db';
import { PaymentMethod as PaymentMethodEnum } from '../types';

const PaymentMethods: React.FC = () => {
  const [methods, setMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<any>({ type: 'CASH', active: true });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setIsLoading(true);
    const data = await DB.getPaymentMethods();
    setMethods(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (newMethod.name && newMethod.type) {
      const method = {
        name: newMethod.name,
        type: newMethod.type,
        active: true
      };
      await DB.savePaymentMethod(method);
      loadMethods();
      setIsModalOpen(false);
      setNewMethod({ type: 'CASH', active: true });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir esta forma de pagamento?')) {
      await DB.deletePaymentMethod(id);
      loadMethods();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CASH': return <Banknote size={24} className="text-green-500" />;
      case 'PIX': return <Smartphone size={24} className="text-nike" />;
      case 'CARD': return <CreditCard size={24} className="text-blue-500" />;
      case 'CREDIT': return <History size={24} className="text-orange-500" />;
      default: return <CreditCard size={24} />;
    }
  };

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-nike" size={48} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black italic uppercase">Formas de Pagamento</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-nike text-black font-black italic px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all">
          <Plus size={20} /> ADICIONAR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {methods.map(m => (
          <div key={m.id} className="bg-[#111] border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group hover:border-nike transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-zinc-900 p-3 rounded-2xl group-hover:bg-nike/10 transition-all">{getIcon(m.type)}</div>
              <div>
                <p className="font-black italic uppercase">{m.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-black">{m.type}</p>
              </div>
            </div>
            <button onClick={() => handleDelete(m.id)} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
          </div>
        ))}
        {methods.length === 0 && (
          <div className="col-span-full py-10 text-center text-zinc-600 italic font-bold">Nenhuma forma de pagamento extra cadastrada.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[40px] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black italic uppercase">Nova Forma</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-zinc-500 hover:text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Nome da Opção</label>
                <input type="text" placeholder="Ex: Cartão de Crédito 12x" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none focus:border-nike transition-all" onChange={(e) => setNewMethod({...newMethod, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Tipo de Processamento</label>
                <select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold outline-none appearance-none focus:border-nike transition-all" onChange={(e) => setNewMethod({...newMethod, type: e.target.value})}>
                  <option value="CASH">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="CARD">Cartão</option>
                  <option value="CREDIT">Fiado (A Receber)</option>
                </select>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-nike text-black font-black italic rounded-2xl hover:scale-105 transition-all uppercase">SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
