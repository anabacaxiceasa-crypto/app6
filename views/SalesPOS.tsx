
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  History,
  ShoppingCart,
  X,
  Edit3,
  Save,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Mic,
  MicOff,
  Receipt,
  User as UserIcon,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { DB } from '../db';
import { Product, Customer, SaleItem, PaymentMethod, Sale, User } from '../types';
import { processVoiceSale } from '../services/geminiService';

interface SalesPOSProps {
  currentUser: User;
}

const ProductPlaceholder = ({ size = 24 }: { size?: number }) => (
  <div style={{ width: size, height: size }} className="relative flex items-center justify-center bg-white rounded-xl overflow-hidden border border-zinc-800">
    <img
      src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/pineapple-logo.png"
      alt="A.M Abacaxi"
      className="w-full h-full object-cover scale-110"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://img.icons8.com/color/512/pineapple.png";
      }}
    />
  </div>
);

const SalesPOS: React.FC<SalesPOSProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [dueDate, setDueDate] = useState('');
  const [cratesIn, setCratesIn] = useState(0);
  const [cratesOut, setCratesOut] = useState(0);

  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalSurcharge, setGlobalSurcharge] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saleSuccessInfo, setSaleSuccessInfo] = useState<{ total: number; change: number } | null>(null);

  // Item Editing State
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemEditForm, setItemEditForm] = useState<SaleItem | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const [isAvulsoModalOpen, setIsAvulsoModalOpen] = useState(false);
  const [avulsoForm, setAvulsoForm] = useState({ description: '', value: '' });

  const [isListening, setIsListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    refreshData();
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleVoiceTranscript(transcript);
      };
      recognitionRef.current.onerror = () => { setIsListening(false); setVoiceProcessing(false); };
    }
  }, []);

  const handleVoiceTranscript = async (transcript: string) => {
    setVoiceProcessing(true);
    const result = await processVoiceSale(transcript);
    if (result && Array.isArray(result)) {
      result.forEach(voiceItem => {
        const product = products.find(p =>
          p.name.toLowerCase().includes(voiceItem.productName.toLowerCase())
        );
        if (product) {
          for (let i = 0; i < voiceItem.quantity; i++) addToCart(product);
        }
      });
    }
    setVoiceProcessing(false);
  };

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else { recognitionRef.current?.start(); setIsListening(true); }
  };

  const refreshData = async () => {
    const [fetchedProducts, fetchedCustomers, fetchedSales] = await Promise.all([
      DB.getProducts(),
      DB.getCustomers(),
      DB.getSales()
    ]);
    setProducts(fetchedProducts);
    setCustomers(fetchedCustomers);
    setRecentSales(fetchedSales.filter(s => s.status !== 'CANCELLED').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20));
  };

  const finalizeSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === PaymentMethod.CREDIT && !selectedCustomer) {
      alert("Selecione um cliente para venda em FIADO");
      return;
    }
    setIsSaving(true);
    try {
      const sale: Omit<Sale, 'id'> = {
        date: new Date().toISOString(),
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Cliente Balcão',
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        items: cart,
        totalAmount: cartFinalTotal,
        paymentMethod,
        dueDate: paymentMethod === PaymentMethod.CREDIT ? dueDate : undefined,
        status: paymentMethod === PaymentMethod.CREDIT ? 'PENDING' : 'PAID',
        cratesIn,
        cratesOut
      };
      await DB.saveSale(sale);
      setCratesIn(0);
      setCratesOut(0);
      setSaleSuccessInfo({ total: cartFinalTotal, change: 0 });
      refreshData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally { setIsSaving(false); }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { alert("Produto sem estoque!"); return; }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        return prev.map(item => item.productId === product.id
          ? { ...item, quantity: newQty, total: (newQty * item.unitPrice) }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        surcharge: 0,
        total: product.price
      }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.productId !== productId));

  const updateQuantity = (productId: string, value: number) => {
    if (productId === 'AVULSO') return;
    const newQty = Math.max(0, value); // Allow 0 for typing
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: newQty, total: (newQty * item.unitPrice) };
      }
      return item;
    }));
  };

  const openItemEdit = (index: number) => {
    setEditingItemIndex(index);
    setItemEditForm({ ...cart[index] });
  };

  const saveItemEdit = () => {
    if (editingItemIndex === null || !itemEditForm) return;

    setCart(prev => prev.map((item, idx) => {
      if (idx === editingItemIndex) {
        const total = (itemEditForm.quantity * itemEditForm.unitPrice) - (itemEditForm.discount || 0) + (itemEditForm.surcharge || 0);
        return { ...itemEditForm, total: Math.max(0, total) };
      }
      return item;
    }));
    setEditingItemIndex(null);
    setItemEditForm(null);
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    setIsSaving(true);
    try {
      await DB.updateSale(editingSale);
      await refreshData();
      setIsEditModalOpen(false);
      alert("Venda atualizada!");
    } catch (err: any) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setIsSaving(true);
    try {
      await DB.cancelSale(saleToDelete);
      await refreshData();
      setIsDeleteConfirmOpen(false);
      alert("Venda excluída!");
    } catch (err: any) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const cartItemsSubtotal = useMemo(() => cart.reduce((acc, item) => acc + item.total, 0), [cart]);
  const cartFinalTotal = useMemo(() => Math.max(0, cartItemsSubtotal - globalDiscount + globalSurcharge), [cartItemsSubtotal, globalDiscount, globalSurcharge]);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatForInput = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) { return ''; }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="w-full bg-[#111] border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-nike outline-none transition-all text-white font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsAvulsoModalOpen(true)} className="bg-white text-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black italic uppercase text-xs hover:bg-nike transition-all shadow-xl">
              <Receipt size={18} /> Avulso
            </button>
            <button onClick={toggleVoice} disabled={voiceProcessing} className={`px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black italic uppercase text-xs transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-nike text-black hover:scale-105'}`}>
              {voiceProcessing ? <Loader2 className="animate-spin" size={18} /> : (isListening ? <MicOff size={18} /> : <Mic size={18} />)}
              Voz AI
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black italic uppercase text-xs">
              <History size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className={`bg-[#111] border border-zinc-800 p-3 rounded-[24px] hover:border-nike transition-all cursor-pointer group ${p.stock <= 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="aspect-square bg-zinc-900 rounded-[18px] mb-2 overflow-hidden flex items-center justify-center">
                <ProductPlaceholder size={48} />
              </div>
              <p className="font-bold truncate uppercase tracking-tighter text-xs text-white">{p.name}</p>
              <div className="flex justify-between items-end mt-1">
                <p className="text-nike font-black text-sm">R$ {p.price.toFixed(2)}</p>
                <p className={`text-[8px] font-black uppercase ${p.stock < 5 ? 'text-red-500' : 'text-zinc-500'}`}>{p.stock} un</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col bg-[#0a0a0a] border border-zinc-800 rounded-[40px] overflow-hidden shrink-0 shadow-2xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><ShoppingCart size={20} className="text-nike" /> Carrinho</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-red-500 hover:underline">Limpar</button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="bg-zinc-900/50 p-4 rounded-[24px] space-y-3 border border-zinc-800/50">
              <span className="font-bold text-xs truncate uppercase text-zinc-300 flex-1 pr-2">{item.productName}</span>
              <div className="flex gap-1">
                <button onClick={() => openItemEdit(idx)} className="text-zinc-600 hover:text-nike"><Edit3 size={16} /></button>
                <button onClick={() => removeFromCart(item.productId)} className="text-zinc-600 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-black border border-zinc-800 rounded-full px-2 py-1">
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1 text-zinc-400 hover:text-white" disabled={item.productId === 'AVULSO'}><Minus size={12} /></button>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="bg-transparent text-xs font-black w-10 text-center text-white outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={item.quantity === 0 ? '' : item.quantity}
                    disabled={item.productId === 'AVULSO'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') updateQuantity(item.productId, 0);
                      else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) updateQuantity(item.productId, parsed);
                      }
                    }}
                    onBlur={() => {
                      if (item.quantity <= 0) updateQuantity(item.productId, 1);
                    }}
                  />
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1 text-zinc-400 hover:text-nike" disabled={item.productId === 'AVULSO'}><Plus size={12} /></button>
                </div>
                <span className="text-lg font-black italic text-nike">R$ {item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800 p-10 opacity-20">
              <ShoppingCart size={48} className="mb-2" />
              <p className="text-[10px] font-black uppercase italic text-center">Adicione itens para começar</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-zinc-900/80 backdrop-blur-md space-y-4 border-t border-zinc-800">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 pl-1">Cliente</label>
              <select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none" value={selectedCustomer?.id || ''} onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}>
                <option value="">Balcão (Geral)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 pl-1">Pagamento</label>
              <select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {paymentMethod === PaymentMethod.CREDIT && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-orange-500 pl-1">Vencimento do Fiado</label>
              <input type="date" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
          <div className="pt-2">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-zinc-500 uppercase font-black text-xs tracking-widest italic">Total</span>
              <span className="text-5xl font-black italic text-white">R$ {cartFinalTotal.toFixed(2)}</span>
            </div>
            <button onClick={finalizeSale} disabled={cart.length === 0 || isSaving} className="w-full py-6 bg-nike text-black font-black italic text-2xl rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-30 flex items-center justify-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" size={28} /> : 'FINALIZAR'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL VENDA AVULSA */}
      {isAvulsoModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[40px] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black italic uppercase flex items-center gap-2"><Receipt className="text-nike" /> Venda Manual</h3>
              <button onClick={() => setIsAvulsoModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Descrição da Venda</label>
                <input type="text" className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none text-white" value={avulsoForm.description} onChange={(e) => setAvulsoForm({ ...avulsoForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Valor (R$)</label>
                <input type="number" className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-black italic text-nike focus:border-nike outline-none" value={avulsoForm.value} onChange={(e) => setAvulsoForm({ ...avulsoForm, value: e.target.value })} />
              </div>
            </div>
            <button onClick={() => {
              const val = parseFloat(avulsoForm.value);
              if (avulsoForm.description && !isNaN(val)) {
                setCart(prev => [...prev, { productId: 'AVULSO', productName: `[AVULSO] ${avulsoForm.description.toUpperCase()}`, quantity: 1, unitPrice: val, discount: 0, surcharge: 0, total: val }]);
                setIsAvulsoModalOpen(false);
                setAvulsoForm({ description: '', value: '' });
              }
            }} className="w-full py-5 bg-nike text-black font-black italic text-xl rounded-2xl hover:scale-105 transition-all">ADICIONAR</button>
          </div>
        </div>
      )}

      {/* HISTORICO */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-2xl font-black italic uppercase flex items-center gap-3"><History className="text-nike" /> Vendas Recentes</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {recentSales.map(sale => (
                <div key={sale.id} className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{new Date(sale.date).toLocaleDateString()}</span>
                    <h4 className="font-black italic text-lg uppercase text-white mt-1">{sale.customerName}</h4>
                    <p className="text-xs text-zinc-500 uppercase font-bold">{sale.paymentMethod} • R$ {sale.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    {currentUser.role === 'ADMIN' && (
                      <button onClick={() => { setEditingSale(JSON.parse(JSON.stringify(sale))); setIsEditModalOpen(true); }} className="p-3 bg-zinc-800 text-white rounded-2xl hover:text-nike transition-all"><Edit3 size={18} /></button>
                    )}
                    {currentUser.role === 'ADMIN' && (
                      <button onClick={() => { setSaleToDelete(sale.id); setIsDeleteConfirmOpen(true); }} className="p-3 bg-zinc-800 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                    )}

                    {/* CRATE CONTROL / CONTROLE DE CAIXAS */}
                    {selectedCustomer && (
                      <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 space-y-3">
                        <div className="flex justify-between items-center border-b border-zinc-700/50 pb-2">
                          <span className="text-[10px] uppercase font-black text-zinc-400">Saldo de Caixas</span>
                          <span className={`text-sm font-black italic ${(selectedCustomer.crates_balance || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {selectedCustomer.crates_balance || 0} pendentes
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] uppercase font-black text-green-500 pl-1">Entrada (Devolução)</label>
                            <div className="flex items-center bg-black border border-zinc-700 rounded-xl px-2">
                              <input type="number" min="0" className="w-full bg-transparent p-2 text-center text-white font-bold text-sm outline-none" value={cratesIn} onChange={(e) => setCratesIn(parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] uppercase font-black text-red-500 pl-1">Saída (Empréstimo)</label>
                            <div className="flex items-center bg-black border border-zinc-700 rounded-xl px-2">
                              <input type="number" min="0" className="w-full bg-transparent p-2 text-center text-white font-bold text-sm outline-none" value={cratesOut} onChange={(e) => setCratesOut(parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO EXCLUSÃO */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
          <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[40px] p-12 text-center space-y-8">
            <ShieldAlert size={48} className="text-red-500 mx-auto" />
            <h3 className="text-3xl font-black italic uppercase text-white">Excluir Venda?</h3>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase italic">Voltar</button>
              <button onClick={handleDeleteSale} disabled={isSaving} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic">{isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingSale && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black italic uppercase flex items-center gap-3"><Edit3 className="text-nike" /> Editar</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={28} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 pl-2">Data</label>
                <input type="datetime-local" className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold text-white outline-none" value={formatForInput(editingSale.date)} onChange={(e) => setEditingSale({ ...editingSale, date: new Date(e.target.value).toISOString() })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 pl-2">Cliente</label>
                <select className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold text-white outline-none" value={editingSale.customerId || ''} onChange={(e) => {
                  const c = customers.find(x => x.id === e.target.value);
                  setEditingSale({ ...editingSale, customerId: e.target.value || null, customerName: c?.name || 'Cliente Balcão' });
                }}>
                  <option value="">Balcão</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleUpdateSale} disabled={isSaving} className="w-full py-5 bg-nike text-black rounded-2xl font-black uppercase italic flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar
            </button>
          </div>
        </div>
      )}

      {/* ITEM EDIT MODAL */}
      {editingItemIndex !== null && itemEditForm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[40px] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Edit3 className="text-nike" /> Detalhes do Item</h3>
              <button onClick={() => setEditingItemIndex(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Produto</label>
                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white font-bold text-sm uppercase">
                  {itemEditForm.productName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-nike"
                    value={itemEditForm.unitPrice}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Quantidade</label>
                  <input
                    type="number"
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-nike"
                    value={itemEditForm.quantity}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-green-500 tracking-widest pl-2">Desconto (R$)</label>
                  <input
                    type="number"
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-green-500 font-bold outline-none focus:border-green-500"
                    value={itemEditForm.discount}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-orange-500 tracking-widest pl-2">Acréscimo (R$)</label>
                  <input
                    type="number"
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-orange-500 font-bold outline-none focus:border-orange-500"
                    value={itemEditForm.surcharge}
                    onChange={(e) => setItemEditForm({ ...itemEditForm, surcharge: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black uppercase text-zinc-500">Total do Item</span>
                  <span className="text-2xl font-black italic text-white">
                    R$ {Math.max(0, (itemEditForm.quantity * itemEditForm.unitPrice) - (itemEditForm.discount || 0) + (itemEditForm.surcharge || 0)).toFixed(2)}
                  </span>
                </div>
                <button onClick={saveItemEdit} className="w-full py-4 bg-white text-black font-black italic rounded-2xl hover:scale-[1.02] transition-all uppercase">
                  Confirmar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {saleSuccessInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-nike/20 w-full max-w-lg rounded-[40px] p-10 text-center space-y-8 animate-in zoom-in-95">
            <CheckCircle2 size={48} className="text-nike mx-auto" />
            <div className="space-y-2">
              <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Venda Concluída</p>
              <p className="text-6xl font-black italic text-white">R$ {saleSuccessInfo.total.toFixed(2)}</p>
            </div>
            <button onClick={() => setSaleSuccessInfo(null)} className="w-full py-5 bg-nike text-black font-black italic rounded-2xl hover:scale-105 transition-all uppercase text-lg">Nova Venda</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPOS;
