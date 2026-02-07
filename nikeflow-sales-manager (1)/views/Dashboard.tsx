
import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  AlertCircle,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { DB } from '../db';
import { Sale, PaymentMethod, Product, DamagedGood } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';

const Dashboard: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [damaged, setDamaged] = useState<DamagedGood[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      try {
        const [s, p, d] = await Promise.all([
          DB.getSales(),
          DB.getProducts(),
          DB.getDamagedGoods()
        ]);
        setSales(s);
        setProducts(p);
        setDamaged(d);
      } catch (err) {
        console.error("Erro ao carregar dados do Dashboard:", err);
      } finally {
        setIsLoadingData(false);
        setTimeout(() => {
          setMounted(true);
        }, 500);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dailySales = sales.filter(s => s.date.startsWith(today) && s.status !== 'CANCELLED');
    const dailyTotal = dailySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    
    const totalRevenue = sales.filter(s => s.status !== 'CANCELLED').reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const pendingCredit = sales
      .filter(s => s.paymentMethod === PaymentMethod.CREDIT && s.status === 'PENDING')
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    return {
      dailyTotal,
      totalRevenue,
      pendingCredit,
      totalSalesCount: sales.filter(s => s.status !== 'CANCELLED').length,
      lowStockCount: products.filter(p => p.stock < 5).length
    };
  }, [sales, products]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.date.startsWith(date) && s.status !== 'CANCELLED');
      return {
        date: date.split('-').slice(1).reverse().join('/'),
        total: daySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0)
      };
    });
  }, [sales]);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(226, 255, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(24);
      doc.text('A.M ABACAXI', 20, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('RELATÓRIO DE DESEMPENHO MASTER', 20, 32);
      doc.save(`Relatorio_Executivo_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('Erro ao gerar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest">Acessando Métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Relatórios Master</h2>
          <p className="text-zinc-500">Visão consolidada do seu império Ceasa.</p>
        </div>
        <button 
          onClick={exportToPDF}
          disabled={isExporting}
          className="bg-white text-black font-black italic px-6 py-3 rounded-2xl hover:bg-nike transition-all flex items-center gap-2"
        >
          {isExporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
          GERAR PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-zinc-800 p-6 rounded-3xl group hover:border-nike transition-all">
          <DollarSign size={24} className="mb-4 text-nike" />
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Vendas Hoje</p>
          <h3 className="text-3xl font-black italic text-white">R$ {(stats.dailyTotal || 0).toFixed(2)}</h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-6 rounded-3xl group hover:border-nike transition-all">
          <ShoppingBag size={24} className="mb-4 text-nike" />
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Total Vendas</p>
          <h3 className="text-3xl font-black italic text-white">{stats.totalSalesCount}</h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-6 rounded-3xl group hover:border-nike transition-all">
          <Clock size={24} className="mb-4 text-orange-500" />
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">A Receber</p>
          <h3 className="text-3xl font-black italic text-orange-500">R$ {(stats.pendingCredit || 0).toFixed(2)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-zinc-800 p-8 rounded-[40px] flex flex-col min-w-0 overflow-hidden">
          <h4 className="text-xl font-black italic uppercase mb-8 text-white">Fluxo Semanal</h4>
          <div className="w-full relative" style={{ minHeight: '320px', height: '320px', minWidth: 0 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e2ff00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e2ff00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#333" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontWeight: 800 }}
                  />
                  <YAxis 
                    stroke="#333" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontWeight: 800 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px' }}
                    itemStyle={{ color: '#e2ff00', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#e2ff00" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full w-full bg-zinc-900/10 rounded-3xl animate-pulse" />}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-800 p-8 rounded-[40px]">
          <h4 className="text-xl font-black italic uppercase mb-8 text-white">Alertas de Estoque</h4>
          <div className="space-y-4">
            {products.filter(p => p.stock < 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-5 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 hover:border-red-500/30 transition-all">
                <div>
                  <p className="font-black italic uppercase text-xs text-white">{p.name}</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-500 font-black italic text-lg">{p.stock} UN</p>
                </div>
              </div>
            ))}
            {stats.lowStockCount === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-800">
                <AlertCircle size={40} className="mb-4 opacity-20" />
                <p className="italic font-black uppercase text-xs tracking-widest">Estoque 100% Operacional</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
