import React, { useState } from 'react';
import { toast } from 'sonner';
import { Home, BarChart3, Globe, Book, User, Users, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout, Eye, Copy, Filter, Image as ImageIcon, Box, X, ArrowUp, ArrowDown, ChevronDown, Menu, ShoppingBag, PenTool, Truck, Package, Printer, Download, Barcode, Search, ArrowLeft, ArrowRight, RotateCcw, MessageSquare, Send, MapPin, Clock, Zap } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { useEcommerce } from '../context/EcommerceContext';

// Admin Components
import AdminHome from './admin/AdminHome';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminSettings from './admin/AdminSettings';
import AdminMenus from './admin/AdminMenus';
import AdminShipping from './admin/AdminShipping';
import AdminPrinters from './admin/AdminPrinters';
import AdminOrders from './admin/AdminOrders';
import AdminCustomers from './admin/AdminCustomers';
import AdminBooks from './admin/AdminBooks';
import AdminWizard from './admin/AdminWizard';
import AdminAvatars from './admin/AdminAvatars';
import AdminContentEditor from './admin/content/AdminContentEditor';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { books, updateBook } = useBooks();
  const { mainMenu } = useMenus();
  
  const [activeTab, setActiveTab] = useState<'home' | 'books' | 'wizard' | 'avatars' | 'content' | 'menus' | 'customers' | 'orders' | 'printers' | 'settings' | 'analytics' | 'shipping'>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const contextBook = books.find(b => b.id === selectedBookId);
  const [draftBook, setDraftBook] = useState<BookProduct | null>(null);
  const selectedBook = draftBook || contextBook || null;

  // Sync draft when switching books or initially loading
  React.useEffect(() => {
    if (contextBook && (!draftBook || draftBook.id !== contextBook.id)) {
      setDraftBook(JSON.parse(JSON.stringify(contextBook)));
    } else if (!contextBook) {
      setDraftBook(null);
    }
  }, [contextBook?.id]); 

  const handleSaveBook = (updatedBook: BookProduct) => {
    setDraftBook(updatedBook);
  };

  const handleSaveAndExit = () => {
    if (draftBook) {
        updateBook(draftBook);
        toast.success("Modifications enregistrées");
        setIsEditing(false);
        setDraftBook(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shrink-0 sticky top-0 h-screen z-50`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
           {!isSidebarCollapsed && (
               <div className="font-bold text-xl text-white flex items-center gap-2">
                   <div className="w-8 h-8 bg-brand-coral rounded-lg flex items-center justify-center text-white">
                       <Settings size={20} />
                   </div>
                   NuageBook
               </div>
           )}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 hover:bg-slate-800 rounded">
               {isSidebarCollapsed ? <ChevronRight /> : <ChevronRight className="rotate-180" />}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
           <button 
               onClick={() => setActiveTab('home')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-brand-coral text-white font-bold shadow-lg shadow-brand-coral/20' : 'hover:bg-slate-800 hover:text-white'}`}
           >
               <Home size={20} />
               {!isSidebarCollapsed && <span>Tableau de bord</span>}
           </button>

           <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
               {!isSidebarCollapsed && 'Gestion'}
           </div>

           <button 
               onClick={() => { setActiveTab('orders'); setSelectedBookId(null); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'orders' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <ShoppingBag size={18} />
               {!isSidebarCollapsed && <span>Commandes</span>}
           </button>

           <button 
               onClick={() => { setActiveTab('customers'); setSelectedBookId(null); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'customers' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Users size={18} />
               {!isSidebarCollapsed && <span>Clients</span>}
           </button>

           <button 
               onClick={() => { setActiveTab('books'); setSelectedBookId(null); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'books' && !selectedBookId ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Book size={18} />
               {!isSidebarCollapsed && <span>Livres</span>}
           </button>

           <button 
               onClick={() => setActiveTab('menus')}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'menus' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Menu size={18} />
               {!isSidebarCollapsed && <span>Menus</span>}
           </button>

           <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
               {!isSidebarCollapsed && 'Logistique'}
           </div>

           <button 
               onClick={() => setActiveTab('shipping')}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'shipping' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Truck size={18} />
               {!isSidebarCollapsed && <span>Expédition</span>}
           </button>

           <button 
               onClick={() => setActiveTab('printers')}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'printers' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Printer size={18} />
               {!isSidebarCollapsed && <span>Imprimeurs</span>}
           </button>

           <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
               {!isSidebarCollapsed && 'Système'}
           </div>

           <button 
               onClick={() => setActiveTab('analytics')}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'analytics' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <BarChart3 size={18} />
               {!isSidebarCollapsed && <span>Analyses</span>}
           </button>

           <button 
               onClick={() => setActiveTab('settings')}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'settings' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
           >
               <Settings size={18} />
               {!isSidebarCollapsed && <span>Paramètres</span>}
           </button>

           <button 
               onClick={onBack}
               className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm hover:bg-slate-800/50 text-slate-400 hover:text-white mt-8"
           >
               <Globe size={18} />
               {!isSidebarCollapsed && <span>Retour au site</span>}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-8 flex justify-between items-center shadow-sm z-40 shrink-0 h-16">
           <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold text-slate-800">
                   {activeTab === 'home' ? 'Tableau de bord' :
                    activeTab === 'books' ? 'Produits' :
                    activeTab === 'orders' ? 'Commandes' :
                    activeTab === 'customers' ? 'Clients' :
                    activeTab === 'menus' ? 'Menus' :
                    activeTab === 'shipping' ? 'Expédition' :
                    activeTab === 'printers' ? 'Imprimeurs' :
                    activeTab === 'settings' ? 'Paramètres' : 
                    activeTab === 'analytics' ? 'Analyses' : 'Admin'}
               </h1>
               {selectedBookId && (
                   <div className="flex items-center gap-2 text-sm text-slate-500 border-l border-gray-200 pl-4">
                       <span className="font-medium text-indigo-600">{books.find(b => b.id === selectedBookId)?.name}</span>
                       {isEditing && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Mode Édition</span>}
                   </div>
               )}
           </div>
           
           <div className="flex items-center gap-3">
               <div className="text-sm text-slate-500 mr-2">Admin</div>
               <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Admin" className="w-full h-full object-cover" />
               </div>
           </div>
        </header>

        {/* Dynamic Context Sub-Menu (For Books) */}
        {selectedBookId && (
             <div className="bg-white border-b border-gray-200 px-8 py-0 shadow-sm z-30 flex items-center gap-8 shrink-0">
                 <button 
                    onClick={() => setActiveTab('books')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'books' ? 'border-brand-coral text-brand-coral' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                     <Settings size={16} /> Général
                 </button>
                 <button 
                    onClick={() => setActiveTab('wizard')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'wizard' ? 'border-brand-coral text-brand-coral' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                     <User size={16} /> Personnages (Wizard)
                 </button>
                 <button 
                    onClick={() => setActiveTab('avatars')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'avatars' ? 'border-brand-coral text-brand-coral' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                     <Eye size={16} /> Prévisualisation
                 </button>
                 <button 
                    onClick={() => setActiveTab('content')}
                    className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'border-brand-coral text-brand-coral' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                     <Layout size={16} /> Contenu (Storyboard)
                 </button>

                 <div className="ml-auto flex items-center gap-2 py-2">
                     <button 
                        onClick={() => {
                            if (confirm('Quitter sans enregistrer ?')) {
                                setDraftBook(null);
                                setIsEditing(false);
                                setSelectedBookId(null);
                                setActiveTab('books');
                            }
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded"
                     >
                        Annuler
                     </button>
                     <button 
                        onClick={handleSaveAndExit}
                        className="bg-brand-coral text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-500 transition-colors shadow-sm flex items-center gap-2"
                     >
                        <Save size={14} /> Enregistrer & Quitter
                     </button>
                 </div>
             </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           
           {activeTab === 'home' && <AdminHome setActiveTab={setActiveTab} setSelectedOrderId={setSelectedOrderId} />}
           
           {activeTab === 'analytics' && <AdminAnalytics />}
           
           {activeTab === 'settings' && <AdminSettings />}
           
           {activeTab === 'menus' && <AdminMenus />}
           
           {activeTab === 'shipping' && <AdminShipping />}
           
           {activeTab === 'printers' && <AdminPrinters />}
           
           {activeTab === 'orders' && <AdminOrders />}
           
           {activeTab === 'customers' && <AdminCustomers />}
           
           {activeTab === 'books' && (
              <AdminBooks 
                 selectedBookId={selectedBookId}
                 setSelectedBookId={setSelectedBookId}
                 selectedBook={selectedBook}
                 handleSaveBook={handleSaveBook}
                 setIsEditing={setIsEditing}
              />
           )}
           
           {activeTab === 'wizard' && (
              <AdminWizard 
                 selectedBookId={selectedBookId}
                 selectedBook={selectedBook}
                 handleSaveBook={handleSaveBook}
              />
           )}

           {activeTab === 'avatars' && (
              <AdminAvatars 
                 selectedBookId={selectedBookId}
                 selectedBook={selectedBook}
                 handleSaveBook={handleSaveBook}
              />
           )}

           {activeTab === 'content' && (
              <AdminContentEditor 
                 selectedBookId={selectedBookId}
                 selectedBook={selectedBook}
                 handleSaveBook={handleSaveBook}
              />
           )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
