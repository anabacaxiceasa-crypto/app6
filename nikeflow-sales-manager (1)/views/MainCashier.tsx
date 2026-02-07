
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Wallet, 
  RotateCcw,
  Loader2,
  ShoppingCart,
  Search,
  Share2,
  Download,
  User as UserIcon
} from 'lucide-react';
import { DB } from '../db';
import { Sale, PaymentMethod, Product } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';

const MainCashier: React.FC = () => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [chartView, setChartView] = useState<'qty' | 'value'>('qty');
  const [mounted, setMounted] = useState(false);
  const [searchItem, setSearchItem] = useState('');

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => {
      requestAnimationFrame(() => setMounted(true));
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedSales, fetchedProducts] = await Promise.all([
      DB.getSales(),
      DB.getProducts()
    ]);
    setSales(fetchedSales);
    setProducts(fetchedProducts);
    setIsLoading(false);
  };

  const totals = useMemo(() => {
    const res = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.PIX]: 0,
      [PaymentMethod.CARD]: 0,
      [PaymentMethod.CREDIT]: 0,
      avista: 0,
      total: 0,
      productSales: {} as Record<string, { name: string, qty: number, total: number }>,
      detailedItems: [] as any[]
    };

    const filtered = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return s.status !== 'CANCELLED' && 
             (startDate ? saleDate >= startDate : true) && 
             (endDate ? saleDate <= endDate : true);
    });

    filtered.forEach(s => {
      const amount = s.totalAmount;
      res[s.paymentMethod] += amount;
      res.total += amount;
      if (s.paymentMethod !== PaymentMethod.CREDIT) res.avista += amount;

      s.items.forEach(item => {
        if (!res.productSales[item.productId]) {
          res.productSales[item.productId] = { name: item.productName, qty: 0, total: 0 };
        }
        res.productSales[item.productId].qty += item.quantity;
        res.productSales[item.productId].total += item.total;

        res.detailedItems.push({
          id: `${s.id}-${item.productId}`,
          saleId: s.id.substring(0, 8),
          date: s.date,
          customer: s.customerName || 'Cliente Balcão',
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          paymentMethod: s.paymentMethod
        });
      });
    });

    return res;
  }, [sales, startDate, endDate]);

  const chartData = useMemo(() => {
    const dataArray = Object.values(totals.productSales) as { name: string, qty: number, total: number }[];
    return dataArray
      .sort((a, b) => chartView === 'qty' ? b.qty - a.qty : b.total - a.total)
      .slice(0, 8);
  }, [totals.productSales, chartView]);

  const filteredDetailedItems = useMemo(() => {
    return totals.detailedItems
      .filter(i => 
        i.productName.toLowerCase().includes(searchItem.toLowerCase()) || 
        i.customer.toLowerCase().includes(searchItem.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [totals.detailedItems, searchItem]);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(226, 255, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(22);
      doc.text('A.M ABACAXI', 20, 25);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`EXTRATO DE VENDAS ITEM A ITEM: ${startDate} a ${endDate}`, 20, 32);

      let y = 55;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA', 15, y);
      doc.text('CLIENTE', 40, y);
      doc.text('PRODUTO', 95, y);
      doc.text('QTD', 150, y);
      doc.text('TOTAL', 170, y);
      
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      filteredDetailedItems.forEach((item) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(new Date(item.date).toLocaleDateString(), 15, y);
        doc.text(item.customer.substring(0, 30).toUpperCase(), 40, y);
        doc.text(item.productName.substring(0, 30).toUpperCase(), 95, y);
        doc.text(`${item.quantity}`, 150, y);
        doc.text(`R$ ${item.total.toFixed(2)}`, 170, y);
        y += 7;
      });

      doc.save(`Extrato_Detalhado_AM_Abacaxi_${startDate}.pdf`);
    } catch (err) {
      alert('Erro ao gerar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest">Sincronizando Extrato...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4 text-white">
            <Wallet className="text-nike" size={40} /> Caixa & Extrato
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1">Visão Geral de Fluxo e Movimentação Detalhada</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-white text-black font-black italic px-6 py-4 rounded-2xl hover:bg-nike transition-all flex items-center gap-2 text-xs uppercase shadow-xl"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exportar Extrato
          </button>
          <button onClick={loadData} className="bg-zinc-800 text-white font-black italic p-4 rounded-2xl hover:bg-zinc-700 transition-all">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[
          { label: 'Dinheiro', val: totals[PaymentMethod.CASH], color: 'text-green-500' },
          { label: 'Pix', val: totals[PaymentMethod.PIX], color: 'text-nike' },
          { label: 'Cartão', val: totals[PaymentMethod.CARD], color: 'text-blue-500' },
          { label: 'Fiado', val: totals[PaymentMethod.CREDIT], color: 'text-orange-500' },
        ].map(i => (
          <div key={i.label} className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] group hover:border-nike transition-all">
             <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">{i.label}</p>
             <h4 className={`text-3xl font-black italic ${i.color}`}>R$ {i.val.toFixed(2)}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] space-y-6">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Período de Análise</p>
              <div className="space-y-4">
                <input type="date" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-nike" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <div className="text-center text-zinc-700 text-[10px] font-black uppercase tracking-widest">Até</div>
                <input type="date" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-nike" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="pt-6 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">Saldo Líquido (À Vista)</p>
                <h3 className="text-4xl font-black italic text-nike">R$ {totals.avista.toFixed(2)}</h3>
              </div>
           </div>
        </div>

        <div className="lg:col-span-2 bg-[#050505] border border-zinc-900 rounded-[48px] overflow-hidden flex flex-col h-[700px] shadow-2xl">
           <div className="p-8 border-b border-zinc-900 flex flex-col sm:flex-row justify-between items-center bg-zinc-900/10 gap-4">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><ShoppingCart size={24} className="text-nike" /> Extrato Item a Item</h3>
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Filtrar por CLIENTE ou produto..." 
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-nike text-white uppercase"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-black z-10 shadow-lg shadow-black/50">
                  <tr className="border-b border-zinc-900">
                    <th className="p-6 text-[10px] font-black uppercase text-zinc-600 tracking-widest">Data</th>
                    <th className="p-6 text-[10px] font-black uppercase text-zinc-600 tracking-widest text-nike">Nome do Cliente</th>
                    <th className="p-6 text-[10px] font-black uppercase text-zinc-600 tracking-widest">Produto</th>
                    <th className="p-6 text-[10px] font-black uppercase text-zinc-600 tracking-widest text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredDetailedItems.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-900/30 transition-all group">
                       <td className="p-6">
                          <span className="text-[10px] font-black italic text-zinc-500">{new Date(item.date).toLocaleDateString()}</span>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-3">
                             <UserIcon size={12} className="text-nike" />
                             <span className="text-xs font-black italic uppercase text-white tracking-tight">{item.customer}</span>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className="text-[10px] font-black uppercase text-zinc-400">{item.productName} ({item.quantity}un)</span>
                       </td>
                       <td className="p-6 text-right">
                          <span className="text-sm font-black italic text-white">R$ {item.total.toFixed(2)}</span>
                       </td>
                    </tr>
                  ))}
                  {filteredDetailedItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-24 text-center text-zinc-800 font-black uppercase italic text-xs tracking-[0.3em]">Nenhuma movimentação encontrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MainCashier;
