
import React, { useState, useEffect } from 'react';
import { UserRole, SystemSettings } from './types';
import { DB, supabase } from './db';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import SalesPOS from './views/SalesPOS';
import Products from './views/Products';
import Customers from './views/Customers';
import CreditSales from './views/CreditSales';
import DamagedGoods from './views/DamagedGoods';
import MainCashier from './views/MainCashier';
import PaymentMethods from './views/PaymentMethods';
import UserManagement from './views/UserManagement';
import Settings from './views/Settings';
import Analytics from './views/Analytics';
import Expenses from './views/Expenses';
import CratesManager from './views/CratesManager';
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  User as UserIcon,
  Lock,
  ShoppingCart,
  Shield,
  Key,
  Package
} from 'lucide-react';

type AuthRoleTab = 'admin' | 'seller';

const BrandLogo = ({ size = "w-48 h-48" }: { size?: string }) => (
  <div className={`${size} relative group flex items-center justify-center mx-auto text-center`}>
    <div className="absolute inset-0 bg-nike/20 blur-[60px] rounded-full scale-150 group-hover:bg-nike/40 transition-all duration-700 animate-pulse"></div>
    <div className="relative w-full h-full rounded-full border-4 border-nike shadow-[0_0_50px_rgba(226,255,0,0.4)] overflow-hidden bg-white flex items-center justify-center mx-auto">
      <img
        src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/pineapple-logo.png"
        alt="A.M Abacaxi"
        className="w-full h-full object-cover scale-110"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://img.icons8.com/color/512/pineapple.png";
        }}
      />
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authRole, setAuthRole] = useState<AuthRoleTab>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<SystemSettings>({ id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false });

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {


    DB.getSettings().then(setSettings);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [session?.user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      // Use DB abstraction instead of direct Supabase query
      const users = await DB.getUsers();
      let profile = users.find(u => u.id === userId);

      if (profile) {
        // Auto-Admin: Hardcode 'ademymoreira@hotmail.com' as ADMIN if not already
        if (profile.email === 'ademymoreira@hotmail.com' && profile.role !== UserRole.ADMIN) {
          profile.role = UserRole.ADMIN;
          await DB.saveUser(profile);
        }

        setUserProfile(profile);
        // Garantia de segurança: Se for vendedor, redireciona pro PDV
        if (profile.role === UserRole.SELLER) {
          setActiveTab('pos');
        }
      } else {
        // Auto-healing: Create profile if missing
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isAdmin = user.email === 'ademymoreira@hotmail.com';
          const newProfile = {
            id: user.id,
            email: user.email!,
            name: isAdmin ? 'Administrador' : 'Novo Usuário',
            username: user.email?.split('@')[0] || 'user',
            role: isAdmin ? UserRole.ADMIN : UserRole.SELLER
          };

          // Use DB.saveUser instead of supabase.insert
          await DB.saveUser(newProfile);

          setUserProfile(newProfile);
          if (newProfile.role === UserRole.SELLER) setActiveTab('pos');
        } else {
          // Final fallback if creation fails
          await supabase.auth.signOut();
        }
      }
    } catch (e) {
      console.error("Erro crítico de segurança:", e);
      await supabase.auth.signOut();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');



    // BACKDOOR: Admin Master Access
    // BACKDOOR REMOVED: Using robust mockSupabase flow instead
    // if (form.email.trim().toLowerCase() === 'admin' && form.password.trim().toLowerCase() === 'admin') { ... }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password
    });

    if (authError) {
      setError('Acesso negado. Verifique e-mail e senha.');
      setIsLoading(false);
      return;
    }

    if (data.user) {
      let { data: profile } = await supabase.from('nikeflow_users').select('*').eq('id', data.user.id).single();

      // AUTO-HEALING: Se não existir perfil, criar agora antes de validar
      if (!profile) {
        const isAdmin = data.user.email === 'ademymoreira@hotmail.com';
        const newProfile = {
          id: data.user.id,
          email: data.user.email,
          name: isAdmin ? 'Administrador' : 'Novo Usuário',
          username: data.user.email?.split('@')[0] || 'user',
          role: isAdmin ? UserRole.ADMIN : UserRole.SELLER
        };
        const { error: insertError } = await supabase.from('nikeflow_users').insert([newProfile]);
        if (!insertError) {
          profile = newProfile;
        }
      }

      if (profile) {
        // Auto-Admin Grant (Duplicate check to be safe)
        if (profile.email === 'ademymoreira@hotmail.com' && profile.role !== UserRole.ADMIN) {
          await supabase.from('nikeflow_users').update({ role: UserRole.ADMIN }).eq('id', profile.id);
          profile.role = UserRole.ADMIN;
        }

        // Check de Role forçado
        if (authRole === 'admin' && !([UserRole.ADMIN, UserRole.FINANCIAL] as string[]).includes(profile.role)) {
          await supabase.auth.signOut();
          setError('Este login não possui privilégios ADMINISTRATIVOS ou FINANCEIROS.');
          setIsLoading(false);
          return;
        }
        if (authRole === 'seller' && profile.role !== UserRole.SELLER) {
          await supabase.auth.signOut();
          setError('Login MASTER detectado. Use o portal administrativo.');
          setIsLoading(false);
          return;
        }
        // Check de Manutenção
        if (profile.role === UserRole.SELLER && settings.maintenance_mode) {
          await supabase.auth.signOut();
          setError('SISTEMA EM MANUTENÇÃO. Contate o administrador.');
          setIsLoading(false);
          return;
        }
      } else {
        await supabase.auth.signOut();
        await supabase.auth.signOut();
        setError('Conta não vinculada. Por favor, faça login como Admin e clique em "Reparar Banco" nas Configurações.');
      }
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setSession(null);
  };

  const renderContent = () => {
    const isSeller = userProfile?.role === UserRole.SELLER;
    const adminOnlyTabs = ['dashboard', 'analytics', 'cashier', 'expenses', 'products', 'damaged', 'customers', 'payments', 'users', 'settings', 'crates', 'fiado'];

    // Hard check: Vendedores nunca acessam abas de admin, mesmo via URL/Estado
    if (isSeller && adminOnlyTabs.includes(activeTab)) {
      return <SalesPOS currentUser={userProfile} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'analytics': return <Analytics />;
      case 'cashier': return <MainCashier />;
      case 'expenses': return <Expenses onNavigate={setActiveTab} />;
      case 'pos': return <SalesPOS currentUser={userProfile} />;
      case 'products': return <Products />;
      case 'customers': return <Customers />;
      case 'fiado': return <CreditSales currentUser={userProfile} />;
      case 'damaged': return <DamagedGoods />;
      case 'payments': return <PaymentMethods />;
      case 'users': return <UserManagement />;
      case 'settings': return <Settings />;
      case 'crates': return <CratesManager />;
      default: return <Dashboard />;
    }
  };

  if (!session || !userProfile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-nike/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-nike/10 blur-[150px] rounded-full"></div>
        </div>

        <div className="w-full max-w-md z-10 space-y-12 animate-in fade-in zoom-in-95 duration-700 mx-auto">
          <div className="flex flex-col items-center justify-center text-center mx-auto">
            <BrandLogo />
            <div className="mt-8 space-y-2">
              <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-white">{settings.app_name}</h1>
              <p className="text-zinc-500 font-black uppercase text-[12px] tracking-[0.6em] italic">CEASA PARAÍBA • MASTER SYSTEM</p>
            </div>
          </div>

          <div className="bg-[#080808] border border-zinc-900 rounded-[48px] shadow-2xl backdrop-blur-3xl overflow-hidden mx-auto">
            <div className="flex border-b border-zinc-900">
              <button
                onClick={() => setAuthRole('admin')}
                className={`flex-1 py-7 flex items-center justify-center gap-3 transition-all duration-500 ${authRole === 'admin' ? 'bg-nike text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Shield size={20} />
                <span className="text-[11px] font-black uppercase tracking-widest italic">Admin Master</span>
              </button>
              <button
                onClick={() => setAuthRole('seller')}
                className={`flex-1 py-7 flex items-center justify-center gap-3 transition-all duration-500 ${authRole === 'seller' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <ShoppingCart size={20} />
                <span className="text-[11px] font-black uppercase tracking-widest italic">Vendedor</span>
              </button>
            </div>

            <div className="p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-nike transition-colors" size={20} />
                    <input
                      type="email"
                      placeholder="E-mail Corporativo"
                      className="w-full bg-black border border-zinc-800 rounded-3xl p-6 pl-16 text-sm font-bold focus:border-nike outline-none transition-all placeholder:text-zinc-800"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-nike transition-colors" size={20} />
                    <input
                      type="password"
                      placeholder="Senha de Acesso"
                      className="w-full bg-black border border-zinc-800 rounded-3xl p-6 pl-16 text-sm font-bold focus:border-nike outline-none transition-all placeholder:text-zinc-800"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-center gap-4 animate-in shake">
                    <AlertCircle size={20} className="text-red-500 shrink-0" />
                    <p className="text-red-500 text-[11px] font-black uppercase leading-tight">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-7 font-black italic text-2xl rounded-3xl transition-all flex items-center justify-center gap-3 uppercase tracking-tighter ${authRole === 'admin'
                    ? 'bg-nike text-black shadow-lg shadow-nike/20'
                    : 'bg-white text-black hover:bg-zinc-200'
                    } hover:scale-[1.03] active:scale-[0.97]`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={28} /> : (
                    <>
                      {authRole === 'admin' ? 'ENTRAR COMO MASTER' : 'INICIAR TURNO'}
                      <ArrowRight size={28} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={userProfile} onLogout={handleSignOut} activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
