
import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Loader2,
  RefreshCcw,
  ArrowUpRight,
  Zap,
  Flame,
  Trophy,
  LineChart,
  Sparkles,
  BrainCircuit,
  Lightbulb
} from 'lucide-react';
import { DB } from '../db';
import { Sale, Product, PaymentMethod } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { getBusinessStrategy } from '../services/geminiService';

const Analytics: React.FC = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Gemini State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => {
      setMounted(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, p] = await Promise.all([DB.getSales(), DB.getProducts()]);
      setSales(s);
      setProducts(p);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return s.status !== 'CANCELLED' && 
             saleDate >= startDate && 
             saleDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const avg = filteredSales.length > 0 ? total / filteredSales.length : 0;
    const itemsCount = filteredSales.reduce((acc, s) => acc + (s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0), 0);
    
    let totalProfit = 0;
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const profitPerItem = item.unitPrice - (prod.costPrice || 0);
          totalProfit += profitPerItem * item.quantity;
        }
      });
    });

    return { total, avg, itemsCount, count: filteredSales.length, totalProfit };
  }, [filteredSales, products]);

  const topProductsData = useMemo(() => {
    const map: Record<string, { name: string, total: number, qty: number, profit: number }> = {};
    
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        if (!map[item.productId]) {
          const prod = products.find(p => p.id === item.productId);
          map[item.productId] = { name: item.productName, total: 0, qty: 0, profit: 0 };
        }
        map[item.productId].total += (item.total || 0);
        map[item.productId].qty += (item.quantity || 0);
        
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          map[item.productId].profit += (item.unitPrice - (prod.costPrice || 0)) * item.quantity;
        }
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales, products]);

  const salesTrendData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    let current = new Date(startDate);
    const last = new Date(endDate);
    while (current <= last) {
      dailyMap[current.toISOString().split('T')[0]] = 0;
      current.setDate(current.getDate() + 1);
    }
    filteredSales.forEach(s => {
      const day = s.date.split('T')[0];
      if (dailyMap[day] !== undefined) dailyMap[day] += (s.totalAmount || 0);
    });
    return Object.entries(dailyMap).map(([date, total]) => ({
      date: date.split('-').reverse().slice(0, 2).join('/'),
      total
    }));
  }, [filteredSales, startDate, endDate]);

  const askGeminiAdvisor = async () => {
    setIsAiLoading(true);
    const context = {
      totals: stats,
      ranking: topProductsData,
      inventory: products.map(p => ({ name: p.name, stock: p.stock }))
    };
    const advice = await getBusinessStrategy(context);
    setAiInsight(advice);
    setIsAiLoading(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest">Processando Inteligência...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4 text-white">
            <LineChart className="text-nike" size={40} /> BI Strategist
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-1">O que vender? Onde investir?</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-[#111] p-2 rounded-3xl border border-zinc-800">
          <div className="flex items-center gap-2 px-4 border-r border-zinc-800">
            <Calendar size={18} className="text-zinc-500" />
            <input type="date" className="bg-transparent text-xs font-black uppercase outline-none text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-zinc-700">até</span>
            <input type="date" className="bg-transparent text-xs font-black uppercase outline-none text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={loadData} className="p-3 text-zinc-400 hover:text-nike transition-all"><RefreshCcw size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={120} className="text-nike" /></div>
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Faturamento Bruto</p>
           <h3 className="text-3xl font-black italic text-white">R$ {stats.total.toFixed(2)}</h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px] relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={120} className="text-nike" /></div>
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Lucro Estimado</p>
           <h3 className="text-3xl font-black italic text-nike">R$ {stats.totalProfit.toFixed(2)}</h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px]">
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Volume de Itens</p>
           <h3 className="text-3xl font-black italic text-white">{stats.itemsCount} <span className="text-xs">UN</span></h3>
        </div>
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px]">
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Ticket Médio</p>
           <h3 className="text-3xl font-black italic text-white">R$ {stats.avg.toFixed(2)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[48px] p-10">
              <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-10 text-white flex items-center gap-3"><LineChart size={24} className="text-nike" /> Desempenho no Período</h4>
              <div className="w-full h-[300px]">
                 {mounted ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={salesTrendData}>
                       <defs>
                         <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#e2ff00" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#e2ff00" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="date" stroke="#333" fontSize={10} tick={{fontWeight: 900}} />
                       <YAxis stroke="#333" fontSize={10} tick={{fontWeight: 900}} />
                       <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #222'}} />
                       <Area type="monotone" dataKey="total" stroke="#e2ff00" strokeWidth={4} fill="url(#grad)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 ) : null}
              </div>
           </div>

           {/* Gemini Advisor Section */}
           <div className="bg-[#111] border border-nike/20 p-10 rounded-[48px] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nike to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-nike rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(226,255,0,0.3)] animate-pulse">
                    <BrainCircuit size={32} className="text-black" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black italic uppercase text-white leading-none">Gemini Strategic AI</h4>
                    <p className="text-[10px] font-black uppercase text-nike tracking-widest mt-1">Análise de dados avançada</p>
                  </div>
                </div>
                <button 
                  onClick={askGeminiAdvisor}
                  disabled={isAiLoading}
                  className="bg-nike text-black font-black italic px-8 py-4 rounded-2xl hover:scale-105 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  GERAR INSIGHTS IA
                </button>
              </div>

              <div className="bg-black/50 border border-zinc-800 p-8 rounded-3xl min-h-[160px] relative">
                 {aiInsight ? (
                   <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <p className="text-zinc-200 text-sm font-bold leading-relaxed italic">
                        {aiInsight}
                      </p>
                      <div className="flex items-center gap-2 text-nike">
                         <Lightbulb size={16} />
                         <span className="text-[9px] font-black uppercase tracking-widest">Recomendações baseadas em vendas reais</span>
                      </div>
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic py-10">
                      <Sparkles size={32} className="mb-2 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-widest">Clique acima para receber orientação estratégica do Gemini</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-gradient-to-br from-nike/20 to-transparent border border-nike/20 p-10 rounded-[48px] relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12"><Flame size={160} className="text-nike" /></div>
              <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-nike">Insight Master</h4>
              <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                 O produto <span className="text-nike font-black uppercase">{topProductsData[0]?.name || 'N/A'}</span> é a sua maior força de giro no momento.
              </p>
              <div className="mt-8 p-6 bg-black/40 rounded-3xl border border-nike/10">
                 <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Sugestão de Investimento:</p>
                 <p className="text-xs font-black text-white italic">"Aumentar o estoque de {topProductsData[0]?.name || '...'} para maximizar a margem de R$ {topProductsData[0]?.profit.toFixed(2) || '0.00'} capturada neste período."</p>
              </div>
           </div>

           <div className="bg-[#111] border border-zinc-800 p-8 rounded-[40px]">
              <h4 className="text-sm font-black italic uppercase tracking-tighter mb-6 text-white">Resumo BI</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500 mb-2"><span>Rentabilidade</span><span>{( (stats.totalProfit / stats.total) * 100 || 0 ).toFixed(1)}%</span></div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                       <div className="h-full bg-nike transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalProfit / stats.total) * 100)}%` }}></div>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-zinc-500 italic">Conversão Operacional</span>
                    <span className="text-xl font-black italic text-white">100%</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
