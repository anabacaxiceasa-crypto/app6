
import React, { useState, useEffect } from 'react';
import { Users, Mail, ShieldCheck, ShieldAlert, Trash2, Loader2, Search, UserPlus, X, Lock, Key, AlertTriangle, Copy, Check, Wallet } from 'lucide-react';
import { DB, supabase } from '../db';
import { User, UserRole } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyAlert, setShowKeyAlert] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.SELLER
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await DB.getUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Nota Sênior: Para criar usuários no Auth sem deslogar o Admin, 
      // o ideal é desativar a confirmação de e-mail no Supabase Dashboard
      // ou usar uma Edge Function. Aqui usamos o signUp padrão.

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name.toUpperCase(),
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const profile: User = {
          id: authData.user.id,
          name: newUser.name.toUpperCase(),
          username: newUser.email.split('@')[0],
          email: newUser.email.trim(),
          role: newUser.role,
          password_hash: 'managed-by-supabase-auth'
        };

        await DB.saveUser(profile);
        await loadUsers();
        setIsModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: UserRole.SELLER });

        alert(`SUCESSO!\nO usuário ${profile.name} foi criado.\n\nATENÇÃO: Como você criou um novo login, sua sessão atual pode ter sido alterada para o novo usuário.\n\nSe você for deslogado, basta entrar novamente com sua conta de ADMIN.`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar cadastro. Tente REPARAR O BANCO nas Configurações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === UserRole.ADMIN ? UserRole.SELLER : UserRole.ADMIN;
    if (confirm(`Alterar cargo de ${user.name} para ${newRole}?`)) {
      await DB.saveUser({ ...user, role: newRole });
      loadUsers();
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('Atenção: A exclusão aqui remove o perfil do banco. Para remover o acesso total, desative o usuário também no painel de Authentication do Supabase.')) {
      await DB.deleteUser(id);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-nike" size={48} />
        <p className="font-black italic uppercase text-zinc-500 tracking-widest">Sincronizando Equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
            <Users className="text-nike" size={36} /> Gestão de Equipe
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-2">Segurança Master & Controle de Acessos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-nike text-black font-black italic px-8 py-4 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
        >
          <UserPlus size={20} /> CADASTRAR NOVO ACESSO
        </button>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl flex items-center gap-4">
        <AlertTriangle className="text-orange-500 shrink-0" size={24} />
        <div>
          <p className="text-orange-500 font-black italic uppercase text-xs">Aviso de Segurança</p>
          <p className="text-zinc-400 text-[10px] font-bold uppercase">Novos usuários criados aqui são automaticamente registrados no Supabase Auth. Certifique-se de que a confirmação por e-mail está desativada no seu painel para acesso imediato.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-600" size={20} />
        <input
          type="text"
          placeholder="Filtrar por nome ou e-mail corporativo..."
          className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-[30px] py-6 pl-16 pr-6 focus:border-nike outline-none transition-all font-bold"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-[#050505] border border-zinc-900 p-8 rounded-[40px] flex items-center justify-between group hover:border-nike transition-all duration-500 overflow-hidden relative">
            <div className="flex items-center gap-6 z-10">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:bg-nike group-hover:text-black transition-all uppercase italic">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black italic uppercase leading-none">{user.name}</h3>
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
                  <Mail size={12} /> {user.email}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 
                    ${user.role === UserRole.ADMIN ? 'bg-nike/10 text-nike' :
                      user.role === UserRole.FINANCIAL ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    {user.role === UserRole.ADMIN ? <ShieldCheck size={10} /> :
                      user.role === UserRole.FINANCIAL ? <Wallet size={10} /> : <ShieldAlert size={10} />}
                    {user.role === UserRole.ADMIN ? 'ADMIN MASTER' :
                      user.role === UserRole.FINANCIAL ? 'FINANCEIRO' : 'VENDEDOR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 z-10">
              <button
                onClick={() => toggleRole(user)}
                title="Alterar Cargo"
                className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-nike transition-all"
              >
                <Key size={20} />
              </button>
              <button
                onClick={() => deleteUser(user.id)}
                title="Excluir Usuário"
                className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-red-500 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">Novo Acesso</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2 italic">Nome Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2 italic">E-mail Corporativo</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2 italic">Senha (Mín. 6 Caracteres)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-2 italic">Cargo de Confiança</label>
                  <select
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none appearance-none"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  >
                    <option value={UserRole.SELLER}>VENDEDOR (Operacional)</option>
                    <option value={UserRole.FINANCIAL}>FINANCEIRO (Gerencial)</option>
                    <option value={UserRole.ADMIN}>ADMINISTRADOR (Controle Total)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black uppercase">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-nike text-black font-black italic text-xl rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : 'CRIAR ACESSO OFICIAL'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
