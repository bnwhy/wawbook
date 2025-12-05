import React, { useState } from 'react';
import { Book, User, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout, Eye, Copy, Filter } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct, WizardTab, TextElement, PageDefinition } from '../types/admin';

import Wizard from './Wizard';

// --- MOCK INITIAL DATA ---
const INITIAL_BOOKS: BookProduct[] = [
  {
    id: '1',
    name: 'Un lien magique',
    description: "Une histoire d'amour et de complicité unique.",
    price: 29.90,
    promoCode: 'WELCOME10',
    theme: Theme.Adventure,
    coverImage: 'adventure_cover.jpg',
    wizardConfig: {
      avatarStyle: 'watercolor',
      tabs: [
        { id: 't1', label: 'Enfant', type: 'character', options: ['hair', 'skin', 'clothes'], variants: ['Garçon', 'Fille'] },
        { id: 't2', label: 'Parent', type: 'character', options: ['hair', 'skin', 'beard'], variants: ['Papa', 'Maman'] }
      ]
    },
    contentConfig: {
      pages: [
        { id: 'p0', pageNumber: 0, label: 'Couverture', description: 'Couverture rigide personnalisée' },
        { id: 'p1', pageNumber: 1, label: 'Page 1', description: 'Introduction dans la chambre' },
        { id: 'p2', pageNumber: 2, label: 'Page 2', description: 'Départ à l\'aventure' },
        { id: 'p3', pageNumber: 3, label: 'Page 3', description: 'Rencontre magique' },
      ],
      texts: [
        { id: 'txt1', label: 'Titre Couverture', type: 'variable', content: '{{CHILD_NAME}} et {{PARENT_NAME}}', position: { pageIndex: 0, zoneId: 'title' } },
        { id: 'txt2', label: 'Dédicace', type: 'fixed', content: 'Pour mon petit trésor.', position: { pageIndex: 1, zoneId: 'body' } }
      ],
      images: []
    }
  }
];

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'wizard' | 'content'>('books');
  const [books, setBooks] = useState<BookProduct[]>(INITIAL_BOOKS);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Content Editor State
  const [selectedVariant, setSelectedVariant] = useState<string>('default');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Helper to get selected book
  const selectedBook = books.find(b => b.id === selectedBookId);

  // Helper to generate combinations
  const generateCombinations = (book: BookProduct) => {
    const tabs = book.wizardConfig.tabs;
    if (tabs.length === 0) return ['Défaut'];

    // Cartesian product of all tab variants
    const cartesian = (a: string[], b: string[]) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    
    // Get variants for each tab, fallback to ['Standard'] if empty
    const allVariants = tabs.map(t => t.variants.length > 0 ? t.variants : [t.label]);
    
    if (allVariants.length === 0) return ['Défaut'];
    
    // Calculate product
    let combinations = allVariants[0];
    for (let i = 1; i < allVariants.length; i++) {
        combinations = combinations.flatMap(d => allVariants[i].map(e => `${d} + ${e}`));
    }
    
    return combinations;
  };

  const currentCombinations = selectedBook ? generateCombinations(selectedBook) : [];

  const handleSaveBook = (updatedBook: BookProduct) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
    setIsEditing(false);
  };

  const createNewBook = () => {
    const newBook: BookProduct = {
      id: Date.now().toString(),
      name: 'Nouveau Livre',
      description: '',
      price: 29.90,
      theme: Theme.Adventure,
      coverImage: '',
      wizardConfig: { avatarStyle: 'watercolor', tabs: [] },
      contentConfig: { pages: [], texts: [], images: [] }
    };
    setBooks([...books, newBook]);
    setSelectedBookId(newBook.id);
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-coral to-red-500 flex items-center justify-center text-white font-bold">W</div>
           <span className="font-bold text-white text-lg tracking-tight">WawBook Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
           <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2">Catalogue</div>
           <button 
             onClick={() => { setActiveTab('books'); setSelectedBookId(null); setIsEditing(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'books' && !selectedBookId ? 'bg-brand-coral text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
              <Book size={20} />
              <span className="font-medium">Tous les Livres</span>
           </button>

           {selectedBookId && (
             <>
               <div className="text-xs font-bold text-slate-500 uppercase px-4 mt-6 mb-2">Édition en cours</div>
               <div className="px-4 mb-4">
                  <div className="bg-slate-800 rounded p-3 border border-slate-700">
                     <div className="font-bold text-white truncate">{selectedBook?.name}</div>
                     <div className="text-xs text-slate-400">{selectedBook?.id}</div>
                  </div>
               </div>

               <button 
                 onClick={() => setActiveTab('books')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'books' && selectedBookId ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
               >
                  <Settings size={20} />
                  <span className="font-medium">Général</span>
               </button>
               
               <button 
                 onClick={() => setActiveTab('wizard')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'wizard' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
               >
                  <User size={20} />
                  <span className="font-medium">Wizard</span>
               </button>

               <button 
                 onClick={() => setActiveTab('content')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'content' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
               >
                  <Layers size={20} />
                  <span className="font-medium">Contenu & Storyboard</span>
               </button>
             </>
           )}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={16} className="rotate-180" />
              Retour au site
           </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
         {/* Header */}
         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               {selectedBookId ? (
                 <>
                   <span className="text-slate-400 font-normal">Édition :</span>
                   {selectedBook?.name}
                 </>
               ) : 'Gestion du Catalogue'}
            </h1>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-brand-coral text-white flex items-center justify-center font-bold shadow-md">
                  A
               </div>
            </div>
         </header>

         {/* Scrollable Content */}
         <main className="flex-1 overflow-y-auto p-8">
            
            {/* --- VIEW: ALL BOOKS --- */}
            {activeTab === 'books' && !selectedBookId && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <p className="text-slate-500">Gérez les paramètres globaux de vos livres personnalisés.</p>
                    <button 
                      onClick={createNewBook}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
                    >
                       <Plus size={18} />
                       Nouveau Livre
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map(book => (
                      <div key={book.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all">
                         <div className="h-48 bg-slate-100 relative flex items-center justify-center text-slate-300">
                            <Book size={48} />
                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                               <button 
                                 onClick={() => { setSelectedBookId(book.id); setIsEditing(true); }}
                                 className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                               >
                                 Configurer
                               </button>
                            </div>
                         </div>
                         <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                               <h3 className="font-bold text-lg text-slate-900">{book.name}</h3>
                               <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">{book.price} €</span>
                            </div>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{book.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                               <span>ID: {book.id}</span>
                               <span>•</span>
                               <span>{book.wizardConfig.tabs.length} Personnages</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* --- VIEW: EDIT BOOK GENERAL --- */}
            {activeTab === 'books' && selectedBookId && selectedBook && (
               <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b border-gray-100 pb-4">Informations Générales</h2>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                     <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nom du Livre</label>
                        <input 
                          type="text" 
                          value={selectedBook.name}
                          onChange={(e) => handleSaveBook({...selectedBook, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                        />
                     </div>
                     <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea 
                          value={selectedBook.description}
                          onChange={(e) => handleSaveBook({...selectedBook, description: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none h-24 resize-none"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Prix (€)</label>
                        <input 
                          type="number" 
                          value={selectedBook.price}
                          onChange={(e) => handleSaveBook({...selectedBook, price: parseFloat(e.target.value)})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Code Promo (Optionnel)</label>
                        <input 
                          type="text" 
                          value={selectedBook.promoCode || ''}
                          onChange={(e) => handleSaveBook({...selectedBook, promoCode: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                          placeholder="ex: PROMO2024"
                        />
                     </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                     <button className="bg-brand-coral text-white px-6 py-2 rounded-lg font-bold hover:bg-red-500 transition-colors flex items-center gap-2">
                        <Save size={18} /> Enregistrer
                     </button>
                  </div>
               </div>
            )}

            {/* --- VIEW: EDIT WIZARD --- */}
            {activeTab === 'wizard' && selectedBookId && selectedBook && (
               <div className="max-w-[1600px] mx-auto h-[calc(100vh-160px)] flex gap-6">
                  
                  {/* LEFT: Config */}
                  <div className="w-[500px] shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                     <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between items-center">
                           <h2 className="text-lg font-bold text-slate-800">Configuration du Wizard</h2>
                           <button 
                              onClick={() => {
                                 const newTab: WizardTab = { id: Date.now().toString(), label: 'Nouvel Onglet', type: 'character', options: ['name'], variants: [] };
                                 handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: [...selectedBook.wizardConfig.tabs, newTab]}});
                              }}
                              className="text-xs bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                           >
                              <Plus size={14} /> Onglet
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {selectedBook.wizardConfig.tabs.length === 0 ? (
                           <div className="text-center py-12 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                              <Layers size={32} className="mx-auto mb-2 opacity-50" />
                              <p>Aucun onglet configuré.</p>
                           </div>
                        ) : (
                           selectedBook.wizardConfig.tabs.map((tab, idx) => (
                              <div key={tab.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white group">
                                 {/* Tab Header */}
                                 <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                          {idx + 1}
                                       </div>
                                       <input 
                                          type="text" 
                                          value={tab.label}
                                          onChange={(e) => {
                                             const newTabs = [...selectedBook.wizardConfig.tabs];
                                             newTabs[idx].label = e.target.value;
                                             handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                          }}
                                          className="bg-transparent font-bold text-slate-700 border-none focus:ring-0 p-0 text-sm w-32"
                                       />
                                    </div>
                                    <button 
                                       onClick={() => {
                                          const newTabs = selectedBook.wizardConfig.tabs.filter((_, i) => i !== idx);
                                          handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                       }}
                                       className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>

                                 <div className="p-4 space-y-4">
                                    {/* Variants */}
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">Variantes (ex: Garçon, Fille)</label>
                                       <div className="flex gap-2 flex-wrap mb-2">
                                          {(tab.variants || []).map(v => (
                                             <span key={v} className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100 flex items-center gap-1">
                                                {v}
                                                <button 
                                                   onClick={() => {
                                                      const newTabs = [...selectedBook.wizardConfig.tabs];
                                                      newTabs[idx].variants = newTabs[idx].variants.filter(x => x !== v);
                                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                   }}
                                                   className="hover:text-purple-900"
                                                >
                                                   <Trash2 size={10} />
                                                </button>
                                             </span>
                                          ))}
                                          <input 
                                             type="text" 
                                             placeholder="+ variante..." 
                                             className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:border-brand-coral outline-none w-24"
                                             onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                   const val = (e.target as HTMLInputElement).value;
                                                   if (val) {
                                                      const newTabs = [...selectedBook.wizardConfig.tabs];
                                                      newTabs[idx].variants = [...(newTabs[idx].variants || []), val];
                                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                      (e.target as HTMLInputElement).value = '';
                                                   }
                                                }
                                             }}
                                          />
                                       </div>
                                    </div>

                                    {/* Options */}
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">Options Visibles</label>
                                       <div className="flex gap-1.5 flex-wrap">
                                          {['hair', 'skin', 'eyes', 'glasses', 'beard', 'clothes', 'accessory'].map(opt => (
                                             <button 
                                                key={opt}
                                                onClick={() => {
                                                   const newTabs = [...selectedBook.wizardConfig.tabs];
                                                   const currentOptions = newTabs[idx].options;
                                                   if (currentOptions.includes(opt)) {
                                                      newTabs[idx].options = currentOptions.filter(o => o !== opt);
                                                   } else {
                                                      newTabs[idx].options = [...currentOptions, opt];
                                                   }
                                                   handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                }}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${tab.options.includes(opt) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                             >
                                                {opt}
                                             </button>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Assets Link */}
                                    {tab.options.length > 0 && (
                                       <div className="pt-3 border-t border-gray-100">
                                          <button className="w-full py-2 text-xs font-bold text-slate-600 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 flex items-center justify-center gap-2 transition-colors">
                                             <Image size={14} /> Gérer les assets ({tab.options.length})
                                          </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  {/* RIGHT: LIVE PREVIEW */}
                  <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col shadow-2xl">
                     <div className="px-4 py-3 bg-gray-950 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <Eye size={16} className="text-brand-coral" />
                           <span className="text-sm font-bold text-gray-200">Aperçu en direct</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                           Interactif
                        </span>
                     </div>
                     <div className="flex-1 bg-stone-100 relative overflow-hidden isolate">
                        {/* Scaled Wizard Wrapper */}
                        <div className="absolute inset-0 overflow-hidden">
                           <div className="w-full h-full origin-top-left transform scale-[0.85] translate-x-[7.5%] translate-y-[7.5%] shadow-2xl border border-black/10 rounded-xl overflow-hidden bg-white">
                              <Wizard 
                                 onComplete={() => {}} 
                                 onCancel={() => {}} 
                                 wizardConfig={selectedBook.wizardConfig}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

               </div>
            )}

            {/* --- VIEW: EDIT CONTENT (STORYBOARD) --- */}
            {activeTab === 'content' && selectedBookId && selectedBook && (
               <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
                  
                  {/* Toolbar */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                           <Layout size={18} />
                           <span>Vue Storyboard</span>
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                        <button 
                           onClick={() => {
                              const newPage: PageDefinition = { 
                                 id: Date.now().toString(), 
                                 pageNumber: selectedBook.contentConfig.pages.length + 1, 
                                 label: `Page ${selectedBook.contentConfig.pages.length + 1}` 
                              };
                              handleSaveBook({
                                 ...selectedBook, 
                                 contentConfig: {
                                    ...selectedBook.contentConfig, 
                                    pages: [...selectedBook.contentConfig.pages, newPage]
                                 }
                              });
                           }}
                           className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                           <Plus size={16} /> Nouvelle Page
                        </button>
                     </div>
                  </div>

                  <div className="flex gap-6 flex-1 overflow-hidden">
                     
                     {/* Pages List (Sidebar) */}
                     <div className="w-64 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 shrink-0">
                        {selectedBook.contentConfig.pages.map((page) => (
                           <div 
                              key={page.id} 
                              onClick={() => setSelectedPageId(page.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedPageId === page.id ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                           >
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                                 {page.pageNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="font-bold text-sm text-slate-800 truncate">{page.label}</div>
                                 <div className="text-[10px] text-gray-400 truncate">{page.description || "Sans description"}</div>
                              </div>
                              <ChevronRight size={14} className={`text-gray-300 ${selectedPageId === page.id ? 'text-brand-coral' : ''}`} />
                           </div>
                        ))}
                     </div>

                     {/* Main Editor Area */}
                     <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col relative">
                        {selectedPageId ? (
                           <div className="flex-1 overflow-y-auto p-8">
                              <div className="max-w-5xl mx-auto">
                                 
                                 {/* Page Header */}
                                 <div className="flex justify-between items-start mb-8">
                                    <div>
                                       <h2 className="text-2xl font-bold text-slate-800 mb-1">
                                          {selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.label}
                                       </h2>
                                       <p className="text-slate-500">
                                          {selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.description}
                                       </p>
                                    </div>
                                    <button className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                       <Trash2 size={20} />
                                    </button>
                                 </div>

                                 {/* VARIANTS GRID */}
                                 <div className="mb-8">
                                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                       <Image size={20} className="text-brand-coral" />
                                       Illustrations par Combinaison
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                       {currentCombinations.map((variant) => (
                                          <div key={variant} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group">
                                             <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                                <span className="font-bold text-sm text-slate-700">{variant}</span>
                                                <span className="w-2 h-2 rounded-full bg-red-400" title="Image manquante"></span>
                                             </div>
                                             
                                             <div className="aspect-[3/2] bg-gray-100 relative flex items-center justify-center group-hover:bg-gray-200 transition-colors cursor-pointer overflow-hidden">
                                                {/* Mock Image Preview */}
                                                <div className="text-center z-10">
                                                   <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                                   <span className="text-xs font-bold text-gray-500">Uploader Image</span>
                                                </div>
                                                
                                                {/* Text Overlay Preview */}
                                                 {selectedBook.contentConfig.texts
                                                  .filter(t => t.position.pageIndex === selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.pageNumber)
                                                  .map(text => (
                                                     <div 
                                                        key={text.id}
                                                        className="absolute border border-dashed border-blue-400 bg-blue-50/50 text-[10px] text-blue-800 p-1 cursor-move hover:bg-blue-100/80 transition-colors"
                                                        style={{
                                                           left: `${text.position.x || 10}%`,
                                                           top: `${text.position.y || 10}%`,
                                                        }}
                                                        title={`Position: ${text.position.x}%, ${text.position.y}%`}
                                                     >
                                                        {text.label}
                                                     </div>
                                                  ))}
                                             </div>
                                          </div>
                                       ))}
                                       
                                       {/* Add Variant */}
                                       <button className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-brand-coral hover:text-brand-coral hover:bg-brand-coral/5 transition-all aspect-[4/3]">
                                          <Plus size={24} className="mb-2" />
                                          <span className="text-xs font-bold">+ Nouvelle Combinaison</span>
                                       </button>
                                    </div>
                                 </div>

                                 {/* TEXT ZONES */}
                                 <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                       <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                          <Type size={20} className="text-brand-coral" />
                                          Textes de la page
                                       </h3>
                                       <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors">
                                          + Ajouter Zone Texte
                                       </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                       {selectedBook.contentConfig.texts
                                          .filter(t => t.position.pageIndex === selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.pageNumber)
                                          .map(text => (
                                             <div key={text.id} className="p-4 bg-slate-50 rounded-lg border border-gray-200 flex gap-4 items-start">
                                                <div className="w-8 h-8 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                                                   T
                                                </div>
                                                <div className="flex-1">
                                                   <div className="flex justify-between mb-1">
                                                      <span className="font-bold text-sm text-slate-700">{text.label}</span>
                                                      <div className="flex items-center gap-2">
                                                         <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${text.type === 'variable' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
                                                            {text.type}
                                                         </span>
                                                      </div>
                                                   </div>
                                                   <p className="text-sm text-slate-600 font-mono bg-white p-2 rounded border border-gray-200 mb-2">
                                                      {text.content}
                                                   </p>
                                                   
                                                   {/* Position Controls */}
                                                   <div className="flex gap-4 text-xs text-gray-500 items-center">
                                                      <span>Position (0-100%):</span>
                                                      <div className="flex items-center gap-1">
                                                         X: <input 
                                                            type="number" 
                                                            className="w-12 border rounded px-1 py-0.5 bg-white" 
                                                            placeholder="10"
                                                            value={text.position.x || ''}
                                                            onChange={(e) => {
                                                               const newTexts = selectedBook.contentConfig.texts.map(t => t.id === text.id ? {...t, position: {...t.position, x: parseInt(e.target.value)}} : t);
                                                               handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                                            }}
                                                         />
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                         Y: <input 
                                                            type="number" 
                                                            className="w-12 border rounded px-1 py-0.5 bg-white" 
                                                            placeholder="10"
                                                            value={text.position.y || ''}
                                                            onChange={(e) => {
                                                               const newTexts = selectedBook.contentConfig.texts.map(t => t.id === text.id ? {...t, position: {...t.position, y: parseInt(e.target.value)}} : t);
                                                               handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                                            }}
                                                         />
                                                      </div>
                                                   </div>
                                                </div>
                                                <button className="text-gray-400 hover:text-red-500 p-1">
                                                   <Trash2 size={16} />
                                                </button>
                                             </div>
                                       ))}
                                       {selectedBook.contentConfig.texts.filter(t => t.position.pageIndex === selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.pageNumber).length === 0 && (
                                          <div className="text-center py-6 text-gray-400 italic text-sm">
                                             Aucun texte configuré pour cette page.
                                          </div>
                                       )}
                                    </div>
                                 </div>

                              </div>
                           </div>
                        ) : (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                              <Layers size={64} className="mb-4 opacity-50" />
                              <p className="text-lg font-medium">Sélectionnez une page à gauche pour l'éditer</p>
                           </div>
                        )}
                     </div>

                  </div>

               </div>
            )}

         </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
