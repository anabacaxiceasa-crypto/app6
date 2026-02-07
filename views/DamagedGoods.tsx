
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus,
  Trash2,
  Calendar,
  X,
  ShieldAlert
} from 'lucide-react';
import { DB } from '../db';
import { Product, DamagedGood } from '../types';

const DamagedGoods: React.FC = () => {
  const [goods, setGoods] = useState<DamagedGood[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [newDamage, setNewDamage] = useState<Partial<DamagedGood>>({});

  useEffect(() => {
    const fetch = async () => {
      const [g, p] = await Promise.all([
        DB.getDamagedGoods(),
        DB.getProducts()
      ]);
      setGoods(g);
      setProducts(p);
    };
    fetch();
  }, []);

  const handlePreSave = () => {
    if (newDamage.productId && newDamage.quantity) {
      setIsConfirmOpen(true);
    }
  };

  const handleSave = async () => {
    if (newDamage.productId && newDamage.quantity) {
      const prod = products.find(p => p.id === newDamage.productId);
      const dg: Omit<DamagedGood, 'id'> = {
        date: new Date().toISOString(),
        productId: newDamage.productId,
        productName: prod?.name || 'Desconhecido',
        quantity: Number(newDamage.quantity),
        reason: newDamage.reason || 'Não especificado'
      };
      await DB.saveDamagedGood(dg);
      const data = await DB.getDamagedGoods();
      setGoods(data);
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      setNewDamage({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">Avarias</h2>
          <p className="text-zinc-500">Registro de perdas, danos e saídas extraordinárias.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-500 text-white font-black italic px-6 py-3 rounded-2xl hover:bg-red-600 hover:scale-105 transition-all flex items-center gap-2 shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
        >
          <Plus size={20} /> LANÇAR AVARIA
        </button>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30">
                <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Data</th>
                <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Produto</th>
                <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Qtd</th>
                <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[...goods].sort((a,b) => b.date.localeCompare(a.date)).map(g => (
                <tr key={g.id} className="hover:bg-zinc-900/50 transition-all group">
                  <td className="p-6 font-bold text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-zinc-600 group-hover:text-red-500 transition-colors" /> {new Date(g.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-6 font-black uppercase italic tracking-tight">{g.productName}</td>
                  <td className="p-6">
                    <span className="bg-red-500/10 text-red-500 font-black px-3 py-1 rounded-full text-xs">
                      {g.quantity} UN
                    </span>
                  </td>
                  <td className="p-6 italic text-zinc-500 text-sm max-w-xs truncate">{g.reason}</td>
                </tr>
              ))}
              {goods.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-24 text-center text-zinc-700 italic">
                    <AlertTriangle size={48} className="mx-auto mb-4 opacity-10" />
                    Sem registros de avaria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Avaria Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-zinc-600 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-3">
              <ShieldAlert className="text-red-500" /> Lançar Perda
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Produto com Defeito</label>
                <select 
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-500 outline-none transition-all appearance-none text-zinc-300"
                  value={newDamage.productId || ''}
                  onChange={(e) => setNewDamage(prev => ({ ...prev, productId: e.target.value }))}
                >
                  <option value="">Selecione o produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Saldo: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Quantidade Perdida</label>
                <input 
                  type="number" 
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-500 outline-none transition-all"
                  value={newDamage.quantity || ''}
                  placeholder="Ex: 1"
                  onChange={(e) => setNewDamage(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Motivo / Detalhes</label>
                <textarea 
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-500 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Descreva o que aconteceu..."
                  value={newDamage.reason || ''}
                  onChange={(e) => setNewDamage(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black italic rounded-2xl hover:bg-zinc-700 transition-all uppercase"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handlePreSave}
                  disabled={!newDamage.productId || !newDamage.quantity}
                  className="flex-2 px-8 py-4 bg-red-500 text-white font-black italic rounded-2xl hover:bg-red-600 transition-all disabled:opacity-30 disabled:grayscale uppercase"
                >
                  REGISTRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Step Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[40px] p-10 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h3 className="text-3xl font-black italic uppercase tracking-tighter">Confirmar Registro?</h3>
            <p className="text-zinc-500 font-bold">
              Ao confirmar, <span className="text-red-500">{newDamage.quantity} unidade(s)</span> serão removidas automaticamente do saldo total do estoque.
            </p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black italic rounded-2xl hover:bg-zinc-700 transition-all uppercase"
              >
                Revisar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-4 bg-red-500 text-white font-black italic rounded-2xl hover:bg-red-600 transition-all uppercase shadow-[0_10px_30px_rgba(239,68,68,0.3)]"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DamagedGoods;
