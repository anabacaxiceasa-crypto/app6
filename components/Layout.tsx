
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Wallet,
  Settings as SettingsIcon,
  ShieldCheck,
  User as UserIcon,
  Cog,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { User, UserRole, SystemSettings } from '../types';
import { DB } from '../db';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [settings, setSettings] = useState<SystemSettings>({ id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false });

  useEffect(() => {
    DB.getSettings().then(setSettings);
  }, []);

  // Menu filtrado conforme o cargo (Role)
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Relatórios', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'analytics', icon: <TrendingUp size={20} />, label: 'Business Intelligence', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'cashier', icon: <Wallet size={20} />, label: 'Caixa Principal', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'expenses', icon: <Receipt size={20} />, label: 'Despesas', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'pos', icon: <ShoppingCart size={20} />, label: 'Vendas (PDV)', roles: [UserRole.ADMIN, UserRole.SELLER, UserRole.FINANCIAL] },
    { id: 'fiado', icon: <CreditCard size={20} />, label: 'Fiado (Crédito)', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'products', icon: <Package size={20} />, label: 'Estoque', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'damaged', icon: <AlertTriangle size={20} />, label: 'Avarias', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'customers', icon: <Users size={20} />, label: 'Clientes', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'payments', icon: <SettingsIcon size={20} />, label: 'Pagamentos', roles: [UserRole.ADMIN, UserRole.FINANCIAL] },
    { id: 'users', icon: <ShieldCheck size={20} />, label: 'Equipe', roles: [UserRole.ADMIN] },
    { id: 'settings', icon: <Cog size={20} />, label: 'Ajustes Master', roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#050505] border-r border-zinc-900 transition-transform duration-500 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="py-12 flex flex-col items-center justify-center border-b border-zinc-900/50 relative overflow-hidden bg-gradient-to-b from-zinc-900/20 to-transparent">
            <div className="absolute top-0 left-0 w-full h-full bg-nike/5 blur-2xl opacity-20"></div>

            <div className="w-24 h-24 relative z-10 mb-6 rounded-full border-2 border-nike shadow-[0_0_30px_rgba(226,255,0,0.2)] flex items-center justify-center bg-white mx-auto">
              <img
                src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/pineapple-logo.png"
                alt="Logo"
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://img.icons8.com/color/512/pineapple.png";
                }}
              />
            </div>

            <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase z-10 leading-none text-center">{settings.app_name}</h1>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-2 z-10 italic text-center">Premium Ceasa System</p>
            <button className="lg:hidden text-zinc-400 absolute top-6 right-6" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
          </div>

          <nav className="flex-1 px-6 py-8 space-y-1 overflow-y-auto custom-scrollbar">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${activeTab === item.id ? 'bg-nike text-black shadow-lg shadow-nike/10' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'}`}
              >
                <div className={`${activeTab === item.id ? 'text-black' : 'text-zinc-600 group-hover:text-nike'}`}>{item.icon}</div>
                <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 bg-[#080808] border-t border-zinc-900">
            <div className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 mb-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 border border-zinc-800"><UserIcon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black italic text-white truncate uppercase">{user.name}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1 
                    ${user.role === UserRole.ADMIN ? 'bg-nike text-black' :
                      user.role === UserRole.FINANCIAL ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    {user.role === UserRole.ADMIN ? 'MASTER ADMIN' :
                      user.role === UserRole.FINANCIAL ? 'FINANCEIRO' : 'VENDEDOR'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-red-500 bg-red-500/5 border border-red-500/10 transition-all font-black uppercase text-[10px] tracking-widest italic">
              <LogOut size={16} /> SAIR
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <header className="h-20 flex items-center justify-between px-6 border-b border-zinc-900 bg-[#050505] lg:hidden shrink-0 z-40">
          <button className="text-white p-2 bg-zinc-900 rounded-xl" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
          <div className="flex items-center gap-2 mx-auto">
            <div className="w-8 h-8 rounded-full border border-nike/30 overflow-hidden bg-white">
              <img src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/pineapple-logo.png" className="w-full h-full object-cover" />
            </div>
            <div className="text-nike font-black italic text-xl tracking-tighter uppercase">{settings.app_name}</div>
          </div>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
