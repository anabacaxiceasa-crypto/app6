
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X,
  AlertCircle,
  DollarSign,
  Tag,
  Package as PackageIcon,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';
import { DB } from '../db';
import { Product } from '../types';
import { editProductImage } from '../services/geminiService';

const ProductPlaceholder = ({ src, size = "w-20 h-20" }: { src?: string, size?: string }) => (
  <div className={`${size} relative flex items-center justify-center bg-white rounded-3xl overflow-hidden border border-zinc-800 shadow-inner group`}>
    <img 
      src={src || "https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/pineapple-logo.png"} 
      alt="Produto" 
      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://img.icons8.com/color/512/pineapple.png";
      }}
    />
  </div>
);

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const data = await DB.getProducts();
    setProducts(data);
  };

  const handleGeminiEnhance = async () => {
    if (!editingProduct?.imageUrl) {
      alert("Insira uma URL de imagem primeiro para aplicar o estilo Nike.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch(editingProduct.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const enhanced = await editProductImage(base64data, "Remova o fundo, adicione iluminação profissional de estúdio e centralize o produto.");
        if (enhanced) {
          setEditingProduct(prev => ({ ...prev, imageUrl: enhanced }));
        } else {
          alert("Não foi possível processar com IA no momento.");
        }
        setIsGenerating(false);
      };
    } catch (err) {
      alert("Erro ao acessar imagem original.");
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct?.name || editingProduct.price === undefined) {
      setSaveError('Nome e Preço são obrigatórios');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const dataToSave: Partial<Product> = {
        name: editingProduct.name,
        price: Number(editingProduct.price),
        costPrice: Number(editingProduct.costPrice || 0),
        stock: Number(editingProduct.stock || 0),
        category: editingProduct.category || 'Geral',
        imageUrl: editingProduct.imageUrl
      };

      if (editingProduct.id) {
        dataToSave.id = editingProduct.id;
      }

      await DB.saveProduct(dataToSave);
      await fetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar. Verifique permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Estoque Master</h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1">Controle de Inventário e Vitrine IA</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#111] p-1 rounded-xl flex border border-zinc-800 mr-2">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-nike' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('table')}
               className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-nike' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <List size={18} />
             </button>
          </div>
          <button 
            onClick={() => { setSaveError(''); setEditingProduct({}); setIsModalOpen(true); }}
            className="bg-nike text-black font-black italic px-8 py-4 rounded-2xl hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} /> NOVO PRODUTO
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Filtrar estoque..."
          className="w-full bg-[#111] border border-zinc-800 rounded-[30px] py-6 pl-16 pr-6 focus:border-nike outline-none transition-all font-bold text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-[#111] border border-zinc-800 rounded-[40px] overflow-hidden group hover:border-nike transition-all duration-500">
              <div className="aspect-video bg-zinc-900 overflow-hidden relative flex items-center justify-center">
                <ProductPlaceholder src={p.imageUrl} size="w-32 h-32" />
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setSaveError(''); setEditingProduct(p); setIsModalOpen(true); }} className="p-3 bg-black/80 backdrop-blur-md rounded-2xl text-white hover:text-nike transition-all border border-white/5"><Edit3 size={18} /></button>
                  <button onClick={() => { setProductToDelete(p.id); setIsDeleteModalOpen(true); }} className="p-3 bg-black/80 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border border-white/5"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-xl truncate uppercase italic tracking-tighter text-white">{p.name}</h3>
                  <span className="text-[9px] px-3 py-1 bg-zinc-800 rounded-full uppercase font-black text-zinc-400">{p.category}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-black italic text-nike">R$ {p.price.toFixed(2)}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black mt-1">Custo: R$ {(p.costPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black italic text-2xl ${p.stock < 5 ? 'text-red-500' : 'text-white'}`}>{p.stock}</p>
                    <p className="text-[10px] uppercase font-bold text-zinc-600">unidades</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/30">
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Produto</th>
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Categoria</th>
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Preço Custo</th>
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Preço Venda</th>
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest">Estoque</th>
                  <th className="p-6 text-[10px] uppercase font-black text-zinc-500 tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-900/50 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <ProductPlaceholder src={p.imageUrl} size="w-12 h-12" />
                        <span className="font-black italic uppercase text-sm text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">{p.category}</span>
                    </td>
                    <td className="p-6">
                      <span className="font-black italic text-zinc-400 text-sm">R$ {(p.costPrice || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-6">
                      <span className="font-black italic text-nike text-sm">R$ {p.price.toFixed(2)}</span>
                    </td>
                    <td className="p-6">
                      <span className={`font-black italic text-sm ${p.stock < 5 ? 'text-red-500' : 'text-white'}`}>
                        {p.stock} UN
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setSaveError(''); setEditingProduct(p); setIsModalOpen(true); }} className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-nike transition-all"><Edit3 size={16} /></button>
                        <button onClick={() => { setProductToDelete(p.id); setIsDeleteModalOpen(true); }} className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-[50px] shadow-2xl">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Editor de Produto</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={28} /></button>
              </div>

              <div className="space-y-6">
                {saveError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black uppercase">
                    <AlertCircle size={18} /> {saveError}
                  </div>
                )}

                <div className="flex flex-col items-center gap-4 mb-6">
                   <ProductPlaceholder src={editingProduct?.imageUrl} size="w-40 h-40" />
                   <div className="flex gap-2 w-full">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                          type="text"
                          placeholder="Link da imagem (URL)"
                          className="w-full bg-black border border-zinc-800 rounded-xl p-4 pl-12 text-[10px] font-bold outline-none focus:border-nike text-white"
                          value={editingProduct?.imageUrl || ''}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                        />
                      </div>
                      <button 
                        onClick={handleGeminiEnhance}
                        disabled={isGenerating || !editingProduct?.imageUrl}
                        className="bg-nike/10 text-nike border border-nike/20 px-4 rounded-xl flex items-center gap-2 hover:bg-nike hover:text-black transition-all disabled:opacity-30"
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        <span className="text-[10px] font-black uppercase">IA NIKE</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Nome</label>
                  <input 
                    type="text" 
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-nike outline-none text-white"
                    value={editingProduct?.name || ''}
                    onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Preço Venda</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-black text-nike outline-none"
                      value={editingProduct?.price || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Preço Custo</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold outline-none text-white"
                      value={editingProduct?.costPrice || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Estoque</label>
                    <input 
                      type="number" 
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold outline-none text-white"
                      value={editingProduct?.stock || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-2">Categoria</label>
                    <input 
                      type="text" 
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold outline-none text-white"
                      value={editingProduct?.category || ''}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full mt-6 py-6 bg-nike text-black font-black italic text-2xl rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'SALVAR PRODUTO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
          <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[50px] p-12 text-center space-y-8">
            <AlertCircle size={60} className="text-red-500 mx-auto" />
            <h3 className="text-3xl font-black italic uppercase text-white">Eliminar?</h3>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase">Voltar</button>
              <button 
                onClick={async () => {
                   if (productToDelete) {
                     await DB.deleteProduct(productToDelete);
                     fetchProducts();
                     setIsDeleteModalOpen(false);
                   }
                }} 
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
