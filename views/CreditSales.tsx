
import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Search,
  User as UserIcon,
  X,
  Calendar,
  DollarSign,
  Filter,
  Edit3,
  Save,
  Loader2,
  Receipt,
  CheckCircle,
  Download,
  Trash2,
  ShieldAlert,
  CreditCard,
  Share2,
  Printer,
  FileText
} from 'lucide-react';
import { DB } from '../db';
import { Sale, PaymentMethod, Customer, CustomerPayment, User, UserRole } from '../types';
import { jsPDF } from 'jspdf';
import { generateGeneralCreditReportPDF, generateIndividualCreditReportPDF, generateDateRangeCreditReportPDF } from '../services/pdfService';
import { shareGeneralCreditReportWhatsApp, shareIndividualCreditReportWhatsApp, shareDateRangeCreditReportWhatsApp } from '../services/whatsappService';

type ViewMode = 'sales' | 'payments';

interface CreditSalesProps {
  currentUser: User;
}

const CreditSales: React.FC<CreditSalesProps> = ({ currentUser }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('sales');
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    customerId: '',
    amount: 0,
    method: 'PIX',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isDeletePaymentConfirmOpen, setIsDeletePaymentConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [allSales, allPayments, allCustomers] = await Promise.all([
      DB.getSales(),
      DB.getCustomerPayments(),
      DB.getCustomers()
    ]);
    setSales(allSales.filter(s => s.paymentMethod === PaymentMethod.CREDIT));
    setPayments(allPayments);
    setCustomers(allCustomers);
  };

  const startEditSale = (s: Sale) => {
    setEditingSale(JSON.parse(JSON.stringify(s)));
    setIsEditModalOpen(true);
  };

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    sales.forEach(s => {
      if (s.customerId && !map.has(s.customerId)) { map.set(s.customerId, s.customerName); }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch = s.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCustomer = filterCustomerId === 'all' || s.customerId === filterCustomerId;
      const matchesDate = (!dateRange.start || s.date >= dateRange.start) && (!dateRange.end || s.date <= dateRange.end + 'T23:59:59');
      return matchesSearch && matchesCustomer && matchesDate;
    });
  }, [sales, searchQuery, filterCustomerId, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = p.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCustomer = filterCustomerId === 'all' || p.customerId === filterCustomerId;
      return matchesSearch && matchesCustomer;
    });
  }, [payments, searchQuery, filterCustomerId]);

  const stats = useMemo(() => {
    const pendingSales = filteredSales.filter(s => s.status === 'PENDING').reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalReceived = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
    return {
      pendingSales,
      totalReceived,
      netPending: Math.max(0, pendingSales - totalReceived)
    };
  }, [filteredSales, filteredPayments]);

  const markAsPaid = async (id: string) => {
    if (!confirm('Baixar nota fiscal de fiado?')) return;
    try { await DB.markSaleAsPaid(id); loadData(); }
    catch (err) { alert("Erro ao baixar nota."); }
  };

  const openPaymentModal = () => {
    // Se já estiver filtrado, pré-seleciona
    setPaymentForm({
      customerId: filterCustomerId === 'all' ? '' : filterCustomerId,
      amount: 0,
      method: 'PIX',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.customerId || paymentForm.amount <= 0) {
      alert("Selecione um cliente e um valor válido.");
      return;
    }

    setIsSaving(true);
    try {
      const customer = customers.find(c => c.id === paymentForm.customerId);
      await DB.saveCustomerPayment({
        customerId: paymentForm.customerId,
        customerName: customer?.name || 'Cliente Desconhecido',
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes,
        date: new Date(paymentForm.date).toISOString()
      });
      await loadData();
      setIsPaymentModalOpen(false);
      alert("Pagamento registrado com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSaleReceiptPDF = (s: Sale) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(14);
    doc.text('A.M ABACAXI', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('CEASA - PARAÍBA', 40, 14, { align: 'center' });
    doc.line(5, 16, 75, 16);
    doc.text('COMPROVANTE DE VENDA FIADO', 40, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date(s.date).toLocaleString()}`, 5, 26);
    doc.text(`Cliente: ${s.customerName.toUpperCase()}`, 5, 30);
    doc.line(5, 32, 75, 32);
    let y = 38;
    s.items.forEach(item => {
      doc.text(`${item.quantity}x ${item.productName.substring(0, 20)}`, 5, y);
      doc.text(`R$ ${item.total.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    });
    doc.line(5, y, 75, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 5, y);
    doc.text(`R$ ${s.totalAmount.toFixed(2)}`, 75, y, { align: 'right' });
    y += 10;
    doc.setFont('helvetica', 'italic');
    doc.text('Este comprovante representa uma dívida ativa.', 40, y, { align: 'center' });
    doc.save(`Venda_Fiado_${s.customerName.replace(/\s+/g, '_')}.pdf`);
  };

  const generatePaymentReceiptPDF = (p: CustomerPayment) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 120] });
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(14);
    doc.text('A.M ABACAXI', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('CEASA - PARAÍBA', 40, 14, { align: 'center' });
    doc.line(5, 16, 75, 16);
    doc.text('COMPROVANTE DE RECEBIMENTO', 40, 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date(p.date).toLocaleString()}`, 5, 30);
    doc.text(`Cliente: ${p.customerName.toUpperCase()}`, 5, 35);
    doc.line(5, 38, 75, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR RECEBIDO:', 5, 45);
    doc.text(`R$ ${p.amount.toFixed(2)}`, 75, 45, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma: ${p.method.toUpperCase()}`, 5, 52);
    if (p.notes) doc.text(`Obs: ${p.notes}`, 5, 58);
    doc.line(5, 65, 75, 65);
    doc.setFontSize(7);
    doc.text('Obrigado pela preferência!', 40, 72, { align: 'center' });
    doc.save(`Recibo_AM_Abacaxi_${p.customerName.replace(/\s+/g, '_')}.pdf`);
  };

  const sharePaymentWhatsApp = (p: CustomerPayment) => {
    const message = `
*--- RECIBO DE PAGAMENTO ---*
*A.M ABACAXI*

Confirmamos o recebimento de:
💰 *VALOR:* R$ ${p.amount.toFixed(2)}
📅 *DATA:* ${new Date(p.date).toLocaleDateString()}
💳 *FORMA:* ${p.method}
👤 *CLIENTE:* ${p.customerName}

_Obrigado por manter suas contas em dia!_
    `.trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareSaleWhatsApp = (s: Sale) => {
    const message = `
*--- NOTA DE FIADO ---*
*A.M ABACAXI*

Olá *${s.customerName}*, segue o registro da sua compra:

📅 *DATA:* ${new Date(s.date).toLocaleDateString()}
💰 *VALOR:* R$ ${s.totalAmount.toFixed(2)}
⏰ *VENCIMENTO:* ${s.dueDate ? new Date(s.dueDate).toLocaleDateString() : 'Não definido'}

_Para baixar esta nota, favor efetuar o pagamento via PIX ou em nosso box no Ceasa._
    `.trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsSaving(true);
    try {
      await DB.deleteCustomerPayment(paymentToDelete);
      await loadData();
      setIsDeletePaymentConfirmOpen(false);
      alert("Recebimento excluído!");
    } catch (err: any) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const formatForInput = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) { return ''; }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4 text-white">
            <CreditCard className="text-nike" size={40} /> Gestão de Fiado
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-2 italic">Controle de Carteira & Abatimentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] group transition-all">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Dívida Bruta (Vendas)</p>
          <h3 className="text-3xl font-black italic text-orange-500">R$ {stats.pendingSales.toFixed(2)}</h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] group transition-all">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Total Recebido</p>
          <h3 className="text-3xl font-black italic text-nike">R$ {stats.totalReceived.toFixed(2)}</h3>
        </div>
        <div className="bg-nike text-black p-8 rounded-[40px] group transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
          <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1 italic">Saldo Devedor Atual</p>
          <h3 className="text-3xl font-black italic">R$ {stats.netPending.toFixed(2)}</h3>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => {
                const debtors = uniqueCustomers.map(c => ({
                  id: c.id,
                  name: c.name,
                  total: sales.filter(s => s.customerId === c.id && s.status === 'PENDING').reduce((acc, s) => acc + s.totalAmount, 0)
                })).filter(d => d.total > 0);
                generateGeneralCreditReportPDF(debtors);
              }}
              className="bg-black text-white p-2 rounded-xl hover:scale-105 transition-transform"
              title="Relatório Geral PDF"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => {
                const debtors = uniqueCustomers.map(c => ({
                  id: c.id,
                  name: c.name,
                  total: sales.filter(s => s.customerId === c.id && s.status === 'PENDING').reduce((acc, s) => acc + s.totalAmount, 0)
                })).filter(d => d.total > 0);
                shareGeneralCreditReportWhatsApp(debtors);
              }}
              className="bg-[#25D366] text-white p-2 rounded-xl hover:scale-105 transition-transform"
              title="Relatório Geral WhatsApp"
            >
              <Share2 size={16} />
            </button>
            {currentUser.role === UserRole.ADMIN && (
              <button onClick={openPaymentModal} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-transform flex items-center gap-2">
                <DollarSign size={14} /> Receber
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex bg-[#111] border border-zinc-800 rounded-2xl p-1 w-fit mx-auto sm:mx-0">
        <button onClick={() => setViewMode('sales')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'sales' ? 'bg-nike text-black' : 'text-zinc-500'}`}>Notas Pendentes</button>
        <button onClick={() => setViewMode('payments')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'payments' ? 'bg-nike text-black' : 'text-zinc-500'}`}>Histórico Recebimentos</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 items-center bg-[#111] border border-zinc-800 rounded-2xl p-2 h-[48px] self-end md:self-auto">
          <input
            type="date"
            className="bg-transparent text-white text-[10px] font-bold uppercase outline-none"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <span className="text-zinc-500">-</span>
          <input
            type="date"
            className="bg-transparent text-white text-[10px] font-bold uppercase outline-none"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          {dateRange.start && dateRange.end && (
            <>
              <div className="w-[1px] h-full bg-zinc-800 mx-2"></div>
              <button
                onClick={() => generateDateRangeCreditReportPDF(filteredSales, dateRange.start, dateRange.end)}
                className="text-zinc-500 hover:text-white"
                title="Relatório Período PDF"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={() => shareDateRangeCreditReportWhatsApp(filteredSales, dateRange.start, dateRange.end)}
                className="text-[#25D366] hover:text-[#25D366]/80"
                title="Relatório Período WhatsApp"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-red-500 hover:text-red-400 ml-2"
                title="Limpar Datas"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input type="text" placeholder="Buscar por cliente..." className="w-full bg-[#111] border border-zinc-800 rounded-[30px] py-6 pl-16 pr-6 text-white font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="bg-[#111] border border-zinc-800 rounded-2xl py-6 px-6 text-xs font-black uppercase text-white outline-none" value={filterCustomerId} onChange={(e) => setFilterCustomerId(e.target.value)}>
            <option value="all">Todos Clientes</option>
            {uniqueCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {filterCustomerId !== 'all' && (
            <>
              <button
                onClick={() => {
                  const customer = customers.find(c => c.id === filterCustomerId);
                  const customerSales = sales.filter(s => s.customerId === filterCustomerId && s.status === 'PENDING');
                  if (customer) generateIndividualCreditReportPDF(customer, customerSales);
                }}
                className="bg-[#111] border border-zinc-800 rounded-2xl p-4 text-zinc-500 hover:text-white hover:border-nike transition-all"
                title="Extrato Cliente PDF"
              >
                <FileText size={20} />
              </button>
              <button
                onClick={() => {
                  const customer = customers.find(c => c.id === filterCustomerId);
                  const customerSales = sales.filter(s => s.customerId === filterCustomerId && s.status === 'PENDING');
                  if (customer) shareIndividualCreditReportWhatsApp(customer, customerSales);
                }}
                className="bg-[#111] border border-zinc-800 rounded-2xl p-4 text-[#25D366] hover:border-[#25D366] transition-all"
                title="Extrato Cliente WhatsApp"
              >
                <Share2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {viewMode === 'sales' ? (
          filteredSales.sort((a, b) => b.date.localeCompare(a.date)).map(s => (
            <div key={s.id} className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-nike transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center text-zinc-500 group-hover:bg-nike group-hover:text-black transition-all"><UserIcon size={24} /></div>
                <div>
                  <h4 className="text-xl font-black italic uppercase text-white">{s.customerName}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Venda em {new Date(s.date).toLocaleDateString()}</p>
                  {s.dueDate && <p className="text-[8px] text-orange-500 font-black uppercase mt-1">Vence: {new Date(s.dueDate).toLocaleDateString()}</p>}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-black italic text-white">R$ {s.totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => generateSaleReceiptPDF(s)} className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white" title="Imprimir PDF"><Printer size={18} /></button>
                  <button onClick={() => shareSaleWhatsApp(s)} className="p-4 bg-[#25D366] text-white rounded-2xl" title="WhatsApp"><Share2 size={18} /></button>
                  {currentUser.role === UserRole.ADMIN && (
                    <button onClick={() => startEditSale(s)} className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white"><Edit3 size={18} /></button>
                  )}
                  {s.status === 'PENDING' && currentUser.role === UserRole.ADMIN && (
                    <button onClick={() => markAsPaid(s.id)} className="p-4 bg-nike text-black font-black italic rounded-2xl uppercase text-xs">Baixar Nota</button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredPayments.sort((a, b) => b.date.localeCompare(a.date)).map(p => (
            <div key={p.id} className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-nike transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-nike/10 rounded-3xl flex items-center justify-center text-nike"><Receipt size={24} /></div>
                <div>
                  <h4 className="text-xl font-black italic uppercase text-white">{p.customerName}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Recebido em {new Date(p.date).toLocaleDateString()}</p>
                  <p className="text-[8px] text-zinc-600 uppercase font-black mt-1">Forma: {p.method}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-black italic text-nike">R$ {p.amount.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => generatePaymentReceiptPDF(p)} className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white" title="Recibo PDF"><Printer size={18} /></button>
                  <button onClick={() => sharePaymentWhatsApp(p)} className="p-4 bg-[#25D366] text-white rounded-2xl" title="WhatsApp"><Share2 size={18} /></button>
                  {currentUser.role === UserRole.ADMIN && (
                    <button onClick={() => { setPaymentToDelete(p.id); setIsDeletePaymentConfirmOpen(true); }} className="p-4 bg-zinc-900 text-zinc-500 hover:text-red-500 rounded-2xl"><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isEditModalOpen && editingSale && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/98 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-8 space-y-6">
            <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-2"><Edit3 size={24} className="text-nike" /> Editar Fiado</h3>
            <div className="space-y-4">
              <input type="datetime-local" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white" value={formatForInput(editingSale.date)} onChange={(e) => setEditingSale({ ...editingSale, date: new Date(e.target.value).toISOString() })} />
              <input type="date" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white" value={editingSale.dueDate || ''} onChange={(e) => setEditingSale({ ...editingSale, dueDate: e.target.value })} />
            </div>
            <button onClick={async () => { setIsSaving(true); await DB.updateSale(editingSale); loadData(); setIsEditModalOpen(false); setIsSaving(false); }} disabled={isSaving} className="w-full py-5 bg-nike text-black font-black italic rounded-2xl flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Salvar
            </button>
            <button onClick={() => setIsEditModalOpen(false)} className="w-full py-3 bg-zinc-900 text-zinc-500 font-bold rounded-2xl">Cancelar</button>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/98 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[40px] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2 text-white"><DollarSign className="text-nike" /> Receber Pagamento</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Cliente</label>
                <select
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-nike"
                  value={paymentForm.customerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                >
                  <option value="">Selecione um cliente...</option>
                  {uniqueCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Valor (R$)</label>
                <input
                  type="number"
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-2xl font-black italic outline-none focus:border-nike"
                  placeholder="0.00"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Forma</label>
                  <select
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="CARTÃO">CARTÃO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Data</label>
                  <input
                    type="date"
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2">Observações</label>
                <input
                  type="text"
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none"
                  placeholder="Ex: Abatimento parcial..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <button onClick={handleSavePayment} disabled={isSaving} className="w-full py-4 bg-nike text-black font-black italic rounded-2xl hover:scale-[1.02] transition-all uppercase flex items-center justify-center gap-2 mt-4">
                {isSaving ? <Loader2 className="animate-spin" /> : <DollarSign />} Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeletePaymentConfirmOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
          <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[40px] p-12 text-center space-y-8">
            <ShieldAlert size={48} className="text-red-500 mx-auto" />
            <h3 className="text-3xl font-black italic uppercase text-white">Excluir Recebimento?</h3>
            <div className="flex gap-4">
              <button onClick={() => setIsDeletePaymentConfirmOpen(false)} className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase italic">Voltar</button>
              <button onClick={handleDeletePayment} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditSales;
