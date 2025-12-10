import React, { useState } from 'react';
import { Book, User, Users, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout, Eye, Copy, Filter, Image as ImageIcon, Box, X, ArrowUp, ArrowDown, ChevronDown, Menu, ShoppingBag, PenTool } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct, WizardTab, TextElement, PageDefinition, ImageElement } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { MenuItem, MenuColumn } from '../types/menu';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { books, addBook, updateBook, deleteBook } = useBooks();
  const { mainMenu, setMainMenu, updateMenuItem, addMenuItem, deleteMenuItem } = useMenus();
  
  const [activeTab, setActiveTab] = useState<'books' | 'wizard' | 'avatars' | 'content' | 'menus' | 'settings'>('books');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Content Editor State
  const [selectedVariant, setSelectedVariant] = useState<string>('default'); // Used for previewing specific combinations
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedAvatarTabId, setSelectedAvatarTabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());

  // Helper to get selected book
  const selectedBook = books.find(b => b.id === selectedBookId);

  const currentCombinations = React.useMemo(() => {
    if (!selectedBook) return [];
    
    // 1. Find all "character" tabs
    const charTabs = selectedBook.wizardConfig.tabs.filter(t => t.type === 'character');
    
    if (charTabs.length === 0) return ['Défaut'];

    // 2. Find all "options" variants within those tabs
    const allOptionSets: { label: string, options: any[] }[] = [];

    charTabs.forEach(tab => {
        tab.variants.forEach(variant => {
            if (variant.type === 'options' && variant.options && variant.options.length > 0) {
                allOptionSets.push({
                    label: variant.label,
                    options: variant.options
                });
            }
        });
    });

    if (allOptionSets.length === 0) return ['Défaut'];

    // 3. Cartesian Product with LIMIT
    const cartesian = (args: any[]) => {
        const r: any[] = [];
        const max = args.length - 1;
        const LIMIT = 2000; // Limit to prevent crash

        function helper(arr: any[], i: number) {
            if (r.length >= LIMIT) return;

            for (let j = 0, l = args[i].length; j < l; j++) {
                const a = arr.slice(0);
                a.push(args[i][j]);
                if (i === max) {
                    r.push(a);
                    if (r.length >= LIMIT) return;
                }
                else {
                    helper(a, i + 1);
                    if (r.length >= LIMIT) return;
                }
            }
        }
        helper([], 0);
        return r;
    };

    const optionsLists = allOptionSets.map(s => s.options);
    const combinations = cartesian(optionsLists);

    // 4. Map to strings (keys)
    const results = combinations.map(combo => {
        const ids = combo.map((o: any) => o.id).sort();
        return ids.join('_');
    });

    if (results.length >= 2000) {
        results.push('... (Liste tronquée pour la performance)');
    }
    
    return results;
  }, [selectedBook]);

  // Helper to generate combinations for Avatar Mappings (Per Tab)
  const generateAvatarCombinations = (tab: WizardTab) => {
     // Filter out text variants or variants without options
     const relevantVariants = tab.variants.filter(v => v.type !== 'text' && v.options && v.options.length > 0);
     
     if (relevantVariants.length === 0) return [];

     // Helper for cartesian product of objects
     const cartesian = (args: any[]) => {
        const r: any[] = [];
        const max = args.length - 1;
        function helper(arr: any[], i: number) {
           for (let j = 0, l = args[i].length; j < l; j++) {
              const a = arr.slice(0); // clone arr
              a.push(args[i][j]);
              if (i === max) r.push(a);
              else helper(a, i + 1);
           }
        }
        helper([], 0);
        return r;
     };

     const variantsOptions = relevantVariants.map(v => v.options);
     const combos = cartesian(variantsOptions); // Array of arrays of options

     return combos.map(combo => {
        // Sort IDs for consistent key
        const ids = combo.map((o: any) => o.id).sort();
        const key = ids.join('_');
        const label = combo.map((o: any) => o.label).join(' + ');
        return { key, label, parts: combo };
     });
  };

  const handleSaveBook = (updatedBook: BookProduct) => {
    updateBook(updatedBook);
    setIsEditing(false);
  };

  const createNewBook = () => {
    const newBook: BookProduct = {
      id: Date.now().toString(),
      name: 'Nouveau Livre',
      description: '',
      price: 29.90,
      theme: Theme.Adventure,
      category: 'theme',
      coverImage: '',
      wizardConfig: { avatarStyle: 'watercolor', tabs: [] },
      contentConfig: { pages: [], texts: [], images: [] }
    };
    addBook(newBook);
    setSelectedBookId(newBook.id);
    setIsEditing(true);
  };

  const toggleVariantExpand = (variantId: string) => {
    const newSet = new Set(expandedVariantIds);
    if (newSet.has(variantId)) {
        newSet.delete(variantId);
    } else {
        newSet.add(variantId);
    }
    setExpandedVariantIds(newSet);
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
           <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2">Gestion</div>
           <button 
             onClick={() => { setActiveTab('books'); setSelectedBookId(null); setIsEditing(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'books' && !selectedBookId ? 'bg-brand-coral text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
              <Book size={20} />
              <span className="font-medium">Produits</span>
           </button>

           <button 
             onClick={() => { setActiveTab('menus'); setSelectedBookId(null); setIsEditing(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'menus' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
           >
              <Menu size={20} />
              <span className="font-medium">Menus</span>
           </button>

           <button 
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
           >
              <Users size={20} />
              <span className="font-medium">Clients</span>
           </button>

           <button 
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
           >
              <ShoppingBag size={20} />
              <span className="font-medium">Commandes</span>
           </button>

           <button 
             onClick={() => { setActiveTab('settings'); setSelectedBookId(null); setIsEditing(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
           >
              <Settings size={20} />
              <span className="font-medium">Paramétrages</span>
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
                 onClick={() => setActiveTab('avatars')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'avatars' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
               >
                  <Eye size={20} />
                  <span className="font-medium">Prévisualisations</span>
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

                 <div className="flex flex-col gap-4">
                    {books.map(book => (
                      <div key={book.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-6 group hover:shadow-md hover:border-brand-coral transition-all">
                         <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 shrink-0">
                            <Book size={24} />
                         </div>
                         
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                               <h3 className="font-bold text-lg text-slate-900 truncate">{book.name}</h3>
                               <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{book.price} €</span>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1 mb-2">{book.description}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                               <span className="bg-slate-100 px-1.5 py-0.5 rounded">ID: {book.id}</span>
                               <span>•</span>
                               <span>{book.wizardConfig.tabs.length} Personnages</span>
                            </div>
                         </div>

                         <div className="shrink-0">
                            <button 
                              onClick={() => { setSelectedBookId(book.id); setIsEditing(true); }}
                              className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-brand-coral hover:text-white transition-colors"
                            >
                              Configurer
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* --- VIEW: MENUS --- */}
            {activeTab === 'menus' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Navigation</h2>
                        <p className="text-slate-500 mt-1">Gérez le menu principal du site.</p>
                    </div>
                    <button 
                        onClick={() => addMenuItem({
                            id: Date.now().toString(),
                            label: 'Nouveau Menu',
                            type: 'simple',
                            basePath: '/',
                            items: []
                        })}
                        className="bg-brand-coral text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-500 transition-colors"
                    >
                        <Plus size={18} /> Ajouter un élément
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {mainMenu.map((menu, idx) => (
                        <div key={menu.id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div className="flex-1 mr-4">
                                    <input 
                                        type="text" 
                                        value={menu.label}
                                        onChange={(e) => updateMenuItem(idx, { ...menu, label: e.target.value })}
                                        className="font-bold text-lg text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full"
                                    />
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400 font-mono">Type:</span>
                                            <select 
                                                value={menu.type}
                                                onChange={(e) => updateMenuItem(idx, { ...menu, type: e.target.value as any })}
                                                className="text-xs border-none bg-transparent py-0 pl-1 pr-6 focus:ring-0 text-slate-600 font-bold uppercase cursor-pointer"
                                            >
                                                <option value="simple">Simple</option>
                                                <option value="grid">Grille</option>
                                                <option value="columns">Colonnes</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400 font-mono">Path:</span>
                                            <input 
                                                type="text" 
                                                value={menu.basePath}
                                                onChange={(e) => updateMenuItem(idx, { ...menu, basePath: e.target.value })}
                                                className="text-xs border-none bg-transparent p-0 focus:ring-0 text-slate-600 font-mono w-32"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => deleteMenuItem(idx)}
                                    className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            <div className="p-4 bg-white">
                                {menu.type === 'columns' ? (
                                    <div className="space-y-4">
                                        {(menu.columns || []).map((col, colIdx) => (
                                            <div key={colIdx} className="border border-gray-100 rounded-lg p-3 bg-slate-50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <input 
                                                        type="text"
                                                        value={col.title}
                                                        onChange={(e) => {
                                                            const newCols = [...(menu.columns || [])];
                                                            newCols[colIdx] = { ...col, title: e.target.value };
                                                            updateMenuItem(idx, { ...menu, columns: newCols });
                                                        }}
                                                        className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-700"
                                                        placeholder="Titre de la colonne"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newCols = (menu.columns || []).filter((_, i) => i !== colIdx);
                                                            updateMenuItem(idx, { ...menu, columns: newCols });
                                                        }}
                                                        className="text-gray-300 hover:text-red-400"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {col.items.map((item, itemIdx) => (
                                                        <div key={itemIdx} className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1">
                                                            <input 
                                                                type="text"
                                                                value={item}
                                                                onChange={(e) => {
                                                                    const newItems = [...col.items];
                                                                    newItems[itemIdx] = e.target.value;
                                                                    const newCols = [...(menu.columns || [])];
                                                                    newCols[colIdx] = { ...col, items: newItems };
                                                                    updateMenuItem(idx, { ...menu, columns: newCols });
                                                                }}
                                                                className="border-none p-0 text-xs w-24 focus:ring-0"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    const newItems = col.items.filter((_, i) => i !== itemIdx);
                                                                    const newCols = [...(menu.columns || [])];
                                                                    newCols[colIdx] = { ...col, items: newItems };
                                                                    updateMenuItem(idx, { ...menu, columns: newCols });
                                                                }}
                                                                className="text-gray-300 hover:text-red-400"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => {
                                                            const newItems = [...col.items, 'Nouveau'];
                                                            const newCols = [...(menu.columns || [])];
                                                            newCols[colIdx] = { ...col, items: newItems };
                                                            updateMenuItem(idx, { ...menu, columns: newCols });
                                                        }}
                                                        className="bg-white border border-dashed border-gray-300 text-gray-400 hover:text-brand-coral hover:border-brand-coral rounded px-2 py-1 text-xs transition-colors"
                                                    >
                                                        + Item
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => {
                                                const newCols = [...(menu.columns || []), { title: 'Nouvelle Colonne', items: [] }];
                                                updateMenuItem(idx, { ...menu, columns: newCols });
                                            }}
                                            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-brand-coral hover:border-brand-coral text-sm font-bold transition-colors"
                                        >
                                            + Ajouter une colonne
                                        </button>
                                    </div>
                                ) : (
                                    // Simple or Grid (List of items)
                                    <div className="flex flex-wrap gap-2">
                                        {(menu.items || []).map((item, itemIdx) => (
                                            <div key={itemIdx} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 group">
                                                <input 
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const newItems = [...(menu.items || [])];
                                                        newItems[itemIdx] = e.target.value;
                                                        updateMenuItem(idx, { ...menu, items: newItems });
                                                    }}
                                                    className="bg-transparent border-none p-0 focus:ring-0 w-32 text-slate-700 font-medium"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newItems = (menu.items || []).filter((_, i) => i !== itemIdx);
                                                        updateMenuItem(idx, { ...menu, items: newItems });
                                                    }}
                                                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => {
                                                const newItems = [...(menu.items || []), 'Nouveau lien'];
                                                updateMenuItem(idx, { ...menu, items: newItems });
                                            }}
                                            className="bg-white border border-dashed border-gray-300 text-gray-400 hover:text-brand-coral hover:border-brand-coral rounded-lg px-3 py-1.5 text-sm font-bold transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Ajouter
                                        </button>
                                    </div>
                                )}
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">Image de couverture</label>
                        <div className="flex items-center gap-4">
                           <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group cursor-pointer">
                              {selectedBook.coverImage ? (
                                 <img src={selectedBook.coverImage} alt="Cover" className="w-full h-full object-cover" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon size={24} />
                                 </div>
                              )}
                              <input 
                                 type="file" 
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                                 onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       const url = URL.createObjectURL(file);
                                       handleSaveBook({...selectedBook, coverImage: url});
                                    }
                                 }}
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <PenTool className="text-white" size={20} />
                              </div>
                           </div>
                           <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">Format recommandé: 800x1200px (Portrait)</p>
                              {selectedBook.coverImage && (
                                 <button 
                                    onClick={() => handleSaveBook({...selectedBook, coverImage: undefined})}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold"
                                 >
                                    Supprimer l'image
                                 </button>
                              )}
                           </div>
                        </div>
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
                  
                  {/* Menu Association */}
                  <div className="mb-6 border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Menu size={18} className="text-indigo-600" />
                        Apparaître dans les menus
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-200 max-h-60 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                            {mainMenu.flatMap(menuItem => {
                                const paths: { label: string, path: string }[] = [];
                                if (menuItem.type === 'simple' || menuItem.type === 'grid') {
                                    menuItem.items?.forEach(sub => {
                                        paths.push({ 
                                            label: `${menuItem.label} > ${sub}`, 
                                            path: `${menuItem.basePath}/${encodeURIComponent(sub)}` 
                                        });
                                    });
                                } else if (menuItem.type === 'columns') {
                                    menuItem.columns?.forEach(col => {
                                        col.items.forEach(sub => {
                                            paths.push({ 
                                                label: `${menuItem.label} > ${col.title} > ${sub}`, 
                                                path: `${menuItem.basePath}/${encodeURIComponent(sub)}` 
                                            });
                                        });
                                    });
                                }
                                return paths;
                            }).map((option) => (
                                <label key={option.path} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-brand-coral cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={(selectedBook.associatedPaths || []).includes(option.path)}
                                        onChange={(e) => {
                                            const currentPaths = selectedBook.associatedPaths || [];
                                            let newPaths;
                                            if (e.target.checked) {
                                                newPaths = [...currentPaths, option.path];
                                            } else {
                                                newPaths = currentPaths.filter(p => p !== option.path);
                                            }
                                            handleSaveBook({...selectedBook, associatedPaths: newPaths});
                                        }}
                                        className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                                    />
                                    <span className="text-xs font-medium text-slate-600 truncate" title={option.label}>
                                        {option.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {mainMenu.length === 0 && (
                            <div className="text-center text-gray-400 text-sm italic">Aucun menu configuré</div>
                        )}
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
               <div className="max-w-4xl mx-auto space-y-6">
                  

                  {/* Tabs Config */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <User size={24} className="text-indigo-600" />
                           Structure des Personnages (Wizard)
                        </h2>
                        <button 
                          onClick={() => {
                             const newTab: WizardTab = { id: Date.now().toString(), label: 'Nouveau Perso', type: 'character', options: [], variants: [] };
                             handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: [...selectedBook.wizardConfig.tabs, newTab]}});
                          }}
                          className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm"
                        >
                           <Plus size={16} /> Ajouter Personnage
                        </button>
                     </div>

                     <div className="space-y-4">
                        {selectedBook.wizardConfig.tabs.map((tab, idx) => (
                           <div key={tab.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                              {/* Tab Header */}
                              <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center gap-4">
                                 <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <ChevronDown size={18} />
                                 </button>
                                 <div className="flex items-center gap-2 text-gray-400">
                                    <User size={18} />
                                 </div>
                                 <div className="flex-1">
                                    <input 
                                      type="text" 
                                      value={tab.label}
                                      onChange={(e) => {
                                         const newTabs = [...selectedBook.wizardConfig.tabs];
                                         newTabs[idx].label = e.target.value;
                                         handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                      }}
                                      className="w-full bg-transparent font-bold text-slate-700 border-none p-0 focus:ring-0 text-base"
                                      placeholder="Nom du personnage (ex: Héros)"
                                   />
                                 </div>
                                 <button 
                                   onClick={() => {
                                      const newTabs = selectedBook.wizardConfig.tabs.filter((_, i) => i !== idx);
                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                   }}
                                   className="text-gray-300 hover:text-red-400 p-1 transition-colors"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>

                              {/* Tab Body */}
                              <div className="p-6">
                                 <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attributs Configurables</h4>
                                    <button 
                                       onClick={() => {
                                          const newTabs = [...selectedBook.wizardConfig.tabs];
                                          newTabs[idx].variants.push({
                                             id: Date.now().toString(),
                                             label: 'Nouvel Attribut',
                                             type: 'options',
                                             options: []
                                          });
                                          handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                       }}
                                       className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                                    >
                                       <Plus size={14} /> Ajouter Attribut
                                    </button>
                                 </div>

                                 <div className="space-y-4">
                                    {tab.variants.map((variant, vIdx) => (
                                       <div key={variant.id} className="relative group bg-white border border-gray-100 rounded-lg shadow-sm">
                                          {/* Variant Row */}
                                          <div className="flex items-center gap-4 py-3 px-3">
                                             <button 
                                                onClick={() => toggleVariantExpand(variant.id)}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                             >
                                                {expandedVariantIds.has(variant.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                             </button>
                                             
                                             <div className="text-gray-300 cursor-move hover:text-gray-500">
                                                <div className="flex flex-col gap-[2px]">
                                                   <div className="flex gap-[2px]">
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                   </div>
                                                   <div className="flex gap-[2px]">
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                   </div>
                                                   <div className="flex gap-[2px]">
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                      <div className="w-1 h-1 rounded-full bg-current"></div>
                                                   </div>
                                                </div>
                                             </div>
                                             
                                             <div className="text-indigo-300">
                                                <Layers size={18} />
                                             </div>

                                             <div className="flex-1">
                                                <input 
                                                   type="text" 
                                                   value={variant.label}
                                                   onChange={(e) => {
                                                      const newTabs = [...selectedBook.wizardConfig.tabs];
                                                      newTabs[idx].variants[vIdx].label = e.target.value;
                                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                   }}
                                                   className="w-full bg-transparent font-medium text-slate-700 border-none p-0 focus:ring-0 text-sm"
                                                   placeholder="Nom de l'attribut"
                                                />
                                             </div>

                                             <div className="w-48">
                                                <select
                                                   value={variant.type || 'options'}
                                                   onChange={(e) => {
                                                      const newTabs = [...selectedBook.wizardConfig.tabs];
                                                      newTabs[idx].variants[vIdx].type = e.target.value as 'options' | 'text';
                                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                   }}
                                                   className="w-full text-xs border-gray-200 rounded-md py-1.5 pl-3 pr-8 bg-white text-slate-600 font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                   <option value="options">Choix (Options)</option>
                                                   <option value="text">Texte (Libre)</option>
                                                </select>
                                                
                                                {variant.type === 'text' && expandedVariantIds.has(variant.id) && (
                                                   <div className="flex gap-2 mt-2">
                                                      <input 
                                                         type="number" 
                                                         placeholder="Min" 
                                                         value={variant.minLength || ''}
                                                         onChange={(e) => {
                                                            const newTabs = [...selectedBook.wizardConfig.tabs];
                                                            newTabs[idx].variants[vIdx].minLength = parseInt(e.target.value) || undefined;
                                                            handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                         }}
                                                         className="w-full text-[10px] border-gray-200 rounded px-2 py-1"
                                                         title="Longueur minimum"
                                                      />
                                                      <input 
                                                         type="number" 
                                                         placeholder="Max" 
                                                         value={variant.maxLength || ''}
                                                         onChange={(e) => {
                                                            const newTabs = [...selectedBook.wizardConfig.tabs];
                                                            newTabs[idx].variants[vIdx].maxLength = parseInt(e.target.value) || undefined;
                                                            handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                         }}
                                                         className="w-full text-[10px] border-gray-200 rounded px-2 py-1"
                                                         title="Longueur maximum"
                                                      />
                                                   </div>
                                                )}
                                             </div>

                                             <button 
                                                onClick={() => {
                                                   const newTabs = [...selectedBook.wizardConfig.tabs];
                                                   newTabs[idx].variants = newTabs[idx].variants.filter(v => v.id !== variant.id);
                                                   handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                }}
                                                className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                             >
                                                <Trash2 size={16} />
                                             </button>
                                          </div>

                                          {/* Options Area (Nested) - Collapsible */}
                                          {expandedVariantIds.has(variant.id) && (variant.type === 'options' || !variant.type) && (
                                             <div className="px-4 pb-4">
                                                <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-4 relative">
                                                {/* Vertical Connector Line */}
                                                <div className="absolute -left-6 top-0 bottom-0 w-px bg-gray-200 border-l border-dashed border-gray-300"></div>
                                                <div className="absolute -left-6 top-6 w-6 h-px bg-gray-200 border-t border-dashed border-gray-300"></div>

                                                <div className="flex justify-between items-center mb-4">
                                                   <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Options Disponibles</h5>
                                                   <button 
                                                      onClick={() => {
                                                         const newTabs = [...selectedBook.wizardConfig.tabs];
                                                         if (!newTabs[idx].variants[vIdx].options) newTabs[idx].variants[vIdx].options = [];
                                                         newTabs[idx].variants[vIdx].options.push({
                                                            id: `opt_${Date.now()}`,
                                                            label: 'Nouvelle Option'
                                                         });
                                                         handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                      }}
                                                      className="text-[10px] text-green-600 hover:text-green-700 font-bold flex items-center gap-1"
                                                   >
                                                      <Plus size={12} /> Ajouter Option
                                                   </button>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                   {(variant.options || []).map((option, oIdx) => (
                                                      <div key={option.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4 group/option">
                                                         
                                                         {/* Uploads */}
                                                         <div className="flex gap-3">
                                                            <div className="text-center group/upload cursor-pointer relative">
                                                               <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors mb-1 overflow-hidden ${option.thumbnail ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 group-hover/upload:border-brand-coral group-hover/upload:text-brand-coral text-gray-300'}`}>
                                                                  {option.thumbnail ? (
                                                                     <img src={option.thumbnail} alt="Thumb" className="w-full h-full object-cover" />
                                                                  ) : (
                                                                     <ImageIcon size={16} />
                                                                  )}
                                                               </div>
                                                               <div className={`text-[9px] font-bold ${option.thumbnail ? 'text-green-600' : 'text-gray-400 group-hover/upload:text-brand-coral'}`}>Miniature</div>
                                                               
                                                               {/* Hidden File Input for Mock Upload */}
                                                               <input 
                                                                  type="file" 
                                                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                                                  onChange={(e) => {
                                                                     const file = e.target.files?.[0];
                                                                     if (file) {
                                                                        // Mock upload - create object URL
                                                                        const url = URL.createObjectURL(file);
                                                                        const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                        newTabs[idx].variants[vIdx].options[oIdx].thumbnail = url;
                                                                        handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                     }
                                                                  }}
                                                               />
                                                            </div>

                                                            <div className="text-center group/upload cursor-pointer relative">
                                                               <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors mb-1 ${option.resource ? 'border-blue-200 bg-blue-50 text-blue-500' : 'border-gray-200 bg-gray-50 group-hover/upload:border-blue-500 group-hover/upload:text-blue-500 text-gray-300'}`}>
                                                                  <Box size={16} />
                                                               </div>
                                                               <div className={`text-[9px] font-bold ${option.resource ? 'text-blue-600' : 'text-gray-400 group-hover/upload:text-blue-500'}`}>Ressource</div>

                                                               {/* Hidden File Input for Mock Upload */}
                                                               <input 
                                                                  type="file" 
                                                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                                                  onChange={(e) => {
                                                                     const file = e.target.files?.[0];
                                                                     if (file) {
                                                                        // Mock upload - create object URL
                                                                        const url = URL.createObjectURL(file);
                                                                        const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                        newTabs[idx].variants[vIdx].options[oIdx].resource = url;
                                                                        handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                     }
                                                                  }}
                                                               />
                                                            </div>
                                                         </div>

                                                         <div className="w-px h-8 bg-gray-100"></div>
                                                         
                                                         <div className="flex-1 min-w-0">
                                                            <input 
                                                               type="text" 
                                                               value={option.label}
                                                               onChange={(e) => {
                                                                  const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                  newTabs[idx].variants[vIdx].options[oIdx].label = e.target.value;
                                                                  handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                               }}
                                                               className="w-full text-sm font-medium text-slate-700 border-none p-0 focus:ring-0 bg-transparent mb-1"
                                                               placeholder="Nom de l'option"
                                                            />
                                                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                                                               <span className="bg-gray-100 px-1.5 py-0.5 rounded">ID: {option.id}</span>
                                                            </div>
                                                         </div>

                                                         <button 
                                                            onClick={() => {
                                                               const newTabs = [...selectedBook.wizardConfig.tabs];
                                                               newTabs[idx].variants[vIdx].options = newTabs[idx].variants[vIdx].options.filter(o => o.id !== option.id);
                                                               handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                            }}
                                                            className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover/option:opacity-100 transition-opacity"
                                                         >
                                                            <Trash2 size={16} />
                                                         </button>
                                                      </div>
                                                   ))}
                                                </div>
                                             </div>
                                          </div>
                                          )}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        ))}
                        
                        {selectedBook.wizardConfig.tabs.length === 0 && (
                           <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                              <div className="w-16 h-16 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <User size={32} />
                              </div>
                              <h3 className="text-lg font-bold text-slate-700 mb-2">Aucun personnage configuré</h3>
                              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Commencez par ajouter un personnage (Héros, Parent, etc.) pour définir les options de personnalisation.</p>
                              <button 
                                onClick={() => {
                                   const newTab: WizardTab = { id: Date.now().toString(), label: 'Nouveau Perso', type: 'character', options: [], variants: [] };
                                   handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: [...selectedBook.wizardConfig.tabs, newTab]}});
                                }}
                                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors inline-flex items-center gap-2 shadow-sm"
                              >
                                 <Plus size={16} /> Ajouter le premier personnage
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* --- VIEW: AVATARS & PREVIEWS --- */}
            {activeTab === 'avatars' && selectedBookId && selectedBook && (
               <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] flex flex-col">
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 shrink-0">
                     <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Eye size={24} className="text-indigo-600" />
                        Prévisualisation des Personnages
                     </h2>
                     <p className="text-slate-500 mb-6">
                        Configurez l'apparence finale (avatar) pour chaque combinaison d'options possible. Ces images seront affichées dans le Wizard lors de la sélection.
                     </p>

                     {/* Tab Selector */}
                     <div className="flex gap-2 border-b border-gray-100 pb-1">
                        {selectedBook.wizardConfig.tabs.map(tab => (
                           <button
                              key={tab.id}
                              onClick={() => setSelectedAvatarTabId(tab.id)}
                              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors relative top-[1px] ${selectedAvatarTabId === tab.id || (!selectedAvatarTabId && tab === selectedBook.wizardConfig.tabs[0]) ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 border-b-transparent' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                           >
                              {tab.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Grid Area */}
                  <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                     {(() => {
                        const targetTab = selectedBook.wizardConfig.tabs.find(t => t.id === (selectedAvatarTabId || selectedBook.wizardConfig.tabs[0]?.id));
                        if (!targetTab) return <div className="text-gray-400">Aucun personnage trouvé.</div>;

                        const combinations = generateAvatarCombinations(targetTab);

                        if (combinations.length === 0) {
                           return (
                              <div className="text-center py-12 text-gray-400">
                                 <User size={48} className="mx-auto mb-4 opacity-20" />
                                 <p>Aucune combinaison d'options disponible pour ce personnage.</p>
                                 <p className="text-sm mt-2">Ajoutez des variantes de type "Options" dans l'onglet Wizard.</p>
                              </div>
                           );
                        }

                        return (
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                              {combinations.map((combo) => {
                                 const existingAvatar = selectedBook.wizardConfig.avatarMappings?.[combo.key];
                                 
                                 return (
                                    <div key={combo.key} className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-all">
                                       <div className="aspect-square bg-white relative flex items-center justify-center border-b border-gray-100">
                                          {existingAvatar ? (
                                             <img src={existingAvatar} alt="Avatar" className="w-full h-full object-contain p-4" />
                                          ) : (
                                             <User size={48} className="text-gray-200" />
                                          )}
                                          
                                          {/* Upload Overlay */}
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                             <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                <label className="cursor-pointer bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                                                   <Upload size={14} />
                                                   {existingAvatar ? 'Modifier' : 'Ajouter'}
                                                   <input 
                                                      type="file" 
                                                      className="hidden" 
                                                      onChange={(e) => {
                                                         const file = e.target.files?.[0];
                                                         if (file) {
                                                            const url = URL.createObjectURL(file);
                                                            const newMappings = { ...(selectedBook.wizardConfig.avatarMappings || {}) };
                                                            newMappings[combo.key] = url;
                                                            handleSaveBook({
                                                               ...selectedBook,
                                                               wizardConfig: {
                                                                  ...selectedBook.wizardConfig,
                                                                  avatarMappings: newMappings
                                                               }
                                                            });
                                                         }
                                                      }}
                                                   />
                                                </label>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="p-3">
                                          <div className="flex flex-wrap gap-1 mb-1">
                                             {combo.parts.map((part: any, i: number) => (
                                                <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-gray-200 rounded text-slate-600">
                                                   {part.label}
                                                </span>
                                             ))}
                                          </div>
                                          <div className="text-[9px] text-gray-400 font-mono truncate" title={combo.key}>
                                             KEY: {combo.key}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        );
                     })()}
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
                           <div className="flex-1 flex flex-col h-full">
                              
                              {/* Editor Toolbar */}
                              <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
                                 <div className="flex items-center gap-4">
                                    <h2 className="font-bold text-slate-800">
                                       {selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.label}
                                    </h2>
                                    <div className="h-6 w-px bg-gray-200"></div>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                       <button 
                                          onClick={() => setViewMode('single')}
                                          className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'single' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                       >
                                          Page unique
                                       </button>
                                       <button 
                                          onClick={() => setViewMode('spread')}
                                          className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'spread' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                       >
                                          Double page
                                       </button>
                                    </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                       <span className="text-xs font-bold text-gray-400 uppercase">Aperçu Variante:</span>
                                       <select 
                                          value={selectedVariant}
                                          onChange={(e) => setSelectedVariant(e.target.value)}
                                          className="text-xs border-gray-200 rounded py-1 pl-2 pr-8 bg-white font-medium focus:ring-brand-coral focus:border-brand-coral"
                                       >
                                          {currentCombinations.map(c => (
                                             <option key={c} value={c}>{c}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>
                              </div>

                              {/* Canvas & Sidebar Container */}
                              <div className="flex-1 flex overflow-hidden">
                                 
                                 {/* CANVAS AREA */}
                                 <div className="flex-1 bg-slate-100 overflow-auto p-8 flex items-center justify-center relative">
                                    {/* Page Container */}
                                    <div className={`transition-all duration-300 flex gap-0 shadow-2xl ${viewMode === 'spread' ? 'aspect-[3/2] w-[90%]' : 'aspect-[3/4] h-[90%]'}`}>
                                       
                                       {/* PAGE RENDERER */}
                                       {(() => {
                                          const currentPage = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                          if (!currentPage) return null;
                                          
                                          const pagesToShow = viewMode === 'spread' 
                                             ? [currentPage, selectedBook.contentConfig.pages.find(p => p.pageNumber === currentPage.pageNumber + 1)].filter(Boolean)
                                             : [currentPage];

                                          return pagesToShow.map((page: any, idx) => (
                                             <div key={page.id} className="flex-1 bg-white relative overflow-hidden group border-r border-gray-100 last:border-0">
                                                
                                                {/* 1. BASE LAYER (Background Variant) */}
                                                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                                                   {/* Find image for current variant & page */}
                                                   {(() => {
                                                      const bgImage = selectedBook.contentConfig.images.find(
                                                         img => img.pageIndex === page.pageNumber && 
                                                               (img.combinationKey === selectedVariant || img.combinationKey === 'default') // Fallback logic
                                                      );
                                                      
                                                      if (bgImage?.imageUrl) {
                                                         return <img src={bgImage.imageUrl} className="w-full h-full object-cover" alt="Background" />;
                                                      }
                                                      return (
                                                         <div className="text-center text-gray-300">
                                                            <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                                                            <span className="text-xs font-bold block">Aucune illustration</span>
                                                            <span className="text-[10px]">Variante: {selectedVariant}</span>
                                                         </div>
                                                      );
                                                   })()}
                                                </div>

                                                {/* 2. IMAGE LAYERS (Stickers/Overlays) */}
                                                {(selectedBook.contentConfig.imageElements || [])
                                                   .filter(el => el.position.pageIndex === page.pageNumber)
                                                   .map(el => (
                                                      <div
                                                         key={el.id}
                                                         onClick={(e) => { e.stopPropagation(); setActiveLayerId(el.id); }}
                                                         className={`absolute cursor-move border-2 transition-all ${activeLayerId === el.id ? 'border-brand-coral z-50' : 'border-transparent hover:border-blue-300 z-10'}`}
                                                         style={{
                                                            left: `${el.position.x}%`,
                                                            top: `${el.position.y}%`,
                                                            width: `${el.position.width}%`,
                                                            height: el.position.height ? `${el.position.height}%` : 'auto',
                                                            transform: `rotate(${el.position.rotation || 0}deg)`
                                                         }}
                                                      >
                                                         {el.type === 'static' && el.url ? (
                                                            <img src={el.url} className="w-full h-full object-contain" alt={el.label} />
                                                         ) : (
                                                            <div className="w-full h-full bg-blue-100/50 flex items-center justify-center text-[10px] text-blue-800 font-bold border border-blue-200">
                                                               {el.variableKey ? `{IMG:${el.variableKey}}` : 'Image'}
                                                            </div>
                                                         )}
                                                      </div>
                                                   ))
                                                }

                                                {/* 3. TEXT LAYERS */}
                                                {selectedBook.contentConfig.texts
                                                   .filter(t => t.position.pageIndex === page.pageNumber)
                                                   .map(text => (
                                                      <div 
                                                         key={text.id}
                                                         onClick={(e) => { e.stopPropagation(); setActiveLayerId(text.id); }}
                                                         className={`absolute p-2 cursor-move border-2 transition-all ${activeLayerId === text.id ? 'border-brand-coral bg-white/10 z-50' : 'border-transparent hover:border-blue-300 hover:bg-white/5 z-20'}`}
                                                         style={{
                                                            left: `${text.position.x}%`,
                                                            top: `${text.position.y}%`,
                                                            width: `${text.position.width || 30}%`,
                                                            transform: `rotate(${text.position.rotation || 0}deg)`,
                                                            ...text.style
                                                         }}
                                                      >
                                                         <div className={`font-medium ${text.type === 'variable' ? 'text-purple-600 bg-purple-50/80 px-1 rounded inline-block' : 'text-slate-800'}`}>
                                                            {text.content}
                                                         </div>
                                                      </div>
                                                   ))
                                                }
                                             </div>
                                          ));
                                       })()}
                                    </div>
                                 </div>

                                 {/* RIGHT PANEL: LAYERS & PROPERTIES */}
                                 <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                       <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                          <Layers size={16} /> Calques
                                       </h3>
                                       
                                       {/* Add Layer Menu */}
                                       <div className="flex gap-2">
                                          <button 
                                             onClick={() => {
                                                const currentPage = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                                if(!currentPage) return;
                                                
                                                const newText: TextElement = {
                                                   id: `text-${Date.now()}`,
                                                   label: 'Nouveau Texte',
                                                   type: 'fixed',
                                                   content: 'Texte ici...',
                                                   position: { pageIndex: currentPage.pageNumber, zoneId: 'body', x: 10, y: 10, width: 30 }
                                                };
                                                const newTexts = [...selectedBook.contentConfig.texts, newText];
                                                handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                                setActiveLayerId(newText.id);
                                             }}
                                             className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                                             title="Ajouter Texte"
                                          >
                                             <Type size={16} />
                                          </button>
                                          <button 
                                              onClick={() => {
                                                const currentPage = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                                if(!currentPage) return;

                                                const newImg: ImageElement = {
                                                   id: `img-${Date.now()}`,
                                                   label: 'Nouvelle Image',
                                                   type: 'static',
                                                   position: { pageIndex: currentPage.pageNumber, x: 20, y: 20, width: 20, height: 20 }
                                                };
                                                // Handle optional imageElements array
                                                const currentElements = selectedBook.contentConfig.imageElements || [];
                                                handleSaveBook({
                                                   ...selectedBook, 
                                                   contentConfig: {
                                                      ...selectedBook.contentConfig, 
                                                      imageElements: [...currentElements, newImg]
                                                   }
                                                });
                                                setActiveLayerId(newImg.id);
                                              }}
                                             className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                                             title="Ajouter Image"
                                          >
                                             <Image size={16} />
                                          </button>
                                       </div>
                                    </div>

                                    {/* Layers List */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                       {/* Dynamic Layers List */}
                                       {(() => {
                                          const currentPage = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                          if (!currentPage) return null;

                                          const textLayers = selectedBook.contentConfig.texts
                                             .filter(t => t.position.pageIndex === currentPage.pageNumber)
                                             .map(t => ({...t, _kind: 'text'}));
                                          
                                          const imgLayers = (selectedBook.contentConfig.imageElements || [])
                                             .filter(i => i.position.pageIndex === currentPage.pageNumber)
                                             .map(i => ({...i, _kind: 'image'}));
                                          
                                          const allLayers = [...textLayers, ...imgLayers]; // Should sort by z-index ideally

                                          return allLayers.map(layer => (
                                             <div 
                                                key={layer.id}
                                                onClick={() => setActiveLayerId(layer.id)}
                                                className={`flex items-center gap-3 p-2 rounded border cursor-pointer group ${activeLayerId === layer.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                             >
                                                {layer._kind === 'text' ? <Type size={14} className="text-slate-400" /> : <Image size={14} className="text-slate-400" />}
                                                <div className="flex-1 min-w-0">
                                                   <div className="text-xs font-bold text-slate-700 truncate">{layer.label}</div>
                                                   <div className="text-[10px] text-gray-400 truncate">
                                                      {layer._kind === 'text' ? (layer as any).content : (layer as any).type}
                                                   </div>
                                                </div>
                                                <button 
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      // Delete logic
                                                      if (layer._kind === 'text') {
                                                         const newTexts = selectedBook.contentConfig.texts.filter(t => t.id !== layer.id);
                                                         handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                                      } else {
                                                         const newImgs = (selectedBook.contentConfig.imageElements || []).filter(i => i.id !== layer.id);
                                                         handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
                                                      }
                                                      if (activeLayerId === layer.id) setActiveLayerId(null);
                                                   }}
                                                   className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1"
                                                >
                                                   <Trash2 size={14} />
                                                </button>
                                             </div>
                                          ));
                                       })()}
                                    </div>

                                    {/* Properties Panel */}
                                    {activeLayerId && (
                                       <div className="h-1/2 border-t border-gray-200 bg-gray-50 flex flex-col">
                                          <div className="p-3 border-b border-gray-200 bg-white font-bold text-xs uppercase text-slate-500 tracking-wider">
                                             Propriétés
                                          </div>
                                          <div className="p-4 overflow-y-auto space-y-4">
                                             {(() => {
                                                const textLayer = selectedBook.contentConfig.texts.find(t => t.id === activeLayerId);
                                                const imgLayer = (selectedBook.contentConfig.imageElements || []).find(i => i.id === activeLayerId);
                                                const layer = textLayer || imgLayer;
                                                
                                                if (!layer) return <div className="text-xs text-gray-400">Calque introuvable</div>;
                                                
                                                const isText = !!textLayer;

                                                const updateLayer = (updates: any) => {
                                                   if (isText) {
                                                      const newTexts = selectedBook.contentConfig.texts.map(t => t.id === layer.id ? {...t, ...updates} : t);
                                                      handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                                   } else {
                                                      const newImgs = (selectedBook.contentConfig.imageElements || []).map(i => i.id === layer.id ? {...i, ...updates} : i);
                                                      handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
                                                   }
                                                };

                                                return (
                                                   <>
                                                      {/* Common Props */}
                                                      <div>
                                                         <label className="text-[10px] font-bold text-gray-500 uppercase">Label</label>
                                                         <input 
                                                            type="text" 
                                                            value={layer.label}
                                                            onChange={(e) => updateLayer({label: e.target.value})}
                                                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 mt-1"
                                                         />
                                                      </div>

                                                      {/* Type Selector (Fixed vs Variable) - Only for images */}
                                                      {!isText && (
                                                         <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Type de contenu</label>
                                                            <div className="flex bg-white rounded border border-gray-300 mt-1 p-0.5">
                                                               <button 
                                                                  onClick={() => updateLayer({type: 'static'})}
                                                                  className={`flex-1 py-1 text-xs font-medium rounded ${layer.type === 'static' ? 'bg-gray-100 text-slate-800' : 'text-gray-400'}`}
                                                               >
                                                                  Fixe
                                                               </button>
                                                               <button 
                                                                  onClick={() => updateLayer({type: 'variable'})}
                                                                  className={`flex-1 py-1 text-xs font-medium rounded ${layer.type === 'variable' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}
                                                               >
                                                                  Variable
                                                               </button>
                                                            </div>
                                                         </div>
                                                      )}

                                                      {/* Content Input */}
                                                      <div>
                                                         <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                                                            {isText ? 'Contenu Texte' : (layer.type === 'variable' ? 'Variable Wizard' : 'URL Image')}
                                                         </label>
                                                         
                                                         {isText ? (
                                                            <div className="space-y-2">
                                                               {/* Variable Inserter */}
                                                               <div className="flex gap-2">
                                                                  <select 
                                                                     className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                                                     onChange={(e) => {
                                                                        if (e.target.value) {
                                                                           updateLayer({content: ((layer as any).content || '') + e.target.value});
                                                                           e.target.value = ''; // Reset select
                                                                        }
                                                                     }}
                                                                  >
                                                                     <option value="">Insérer une variable...</option>
                                                                     {selectedBook.wizardConfig.tabs.map(tab => {
                                                                        // Filter only text variants
                                                                        const textVariants = tab.variants.filter(v => v.type === 'text');
                                                                        if (textVariants.length === 0) return null;
                                                                        
                                                                        return (
                                                                           <optgroup key={tab.id} label={tab.label}>
                                                                              {textVariants.map(v => (
                                                                                 <option key={v.id} value={`{${tab.id}.${v.id}}`}>
                                                                                    {v.label}
                                                                                 </option>
                                                                              ))}
                                                                           </optgroup>
                                                                        );
                                                                     })}
                                                                  </select>
                                                               </div>

                                                               <textarea 
                                                                  value={(layer as any).content}
                                                                  onChange={(e) => updateLayer({content: e.target.value})}
                                                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-24 font-mono leading-relaxed"
                                                                  placeholder="Écrivez votre texte ici... Utilisez {tab.variable} pour insérer des données dynamiques."
                                                               />
                                                            </div>
                                                         ) : (
                                                            layer.type === 'variable' ? (
                                                               <select 
                                                                  value={(layer as any).variableKey}
                                                                  onChange={(e) => updateLayer({variableKey: e.target.value})}
                                                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-indigo-50/50 border-indigo-200 text-indigo-700"
                                                               >
                                                                  <option value="">Choisir une variable image...</option>
                                                                  {selectedBook.wizardConfig.tabs.map(tab => (
                                                                     <optgroup key={tab.id} label={tab.label}>
                                                                        {tab.variants.filter(v => v.type === 'options').map(v => (
                                                                           <option key={v.id} value={`${tab.id}.${v.id}`}>
                                                                              {v.label}
                                                                           </option>
                                                                        ))}
                                                                     </optgroup>
                                                                  ))}
                                                               </select>
                                                            ) : (
                                                               <div className="flex gap-2">
                                                                  <input 
                                                                     type="text" 
                                                                     placeholder="URL de l'image"
                                                                     value={(layer as any).url || ''}
                                                                     onChange={(e) => updateLayer({url: e.target.value})}
                                                                     className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                                                                  />
                                                               </div>
                                                            )
                                                         )}
                                                      </div>

                                                      {/* Position Grid */}
                                                      <div>
                                                         <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Position & Taille (%)</label>
                                                         <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                               <span className="text-[10px] text-gray-400 mr-1">X</span>
                                                               <input type="number" value={layer.position.x || 0} onChange={(e) => updateLayer({position: {...layer.position, x: parseFloat(e.target.value)}})} className="w-12 text-xs border rounded p-1" />
                                                            </div>
                                                            <div>
                                                               <span className="text-[10px] text-gray-400 mr-1">Y</span>
                                                               <input type="number" value={layer.position.y || 0} onChange={(e) => updateLayer({position: {...layer.position, y: parseFloat(e.target.value)}})} className="w-12 text-xs border rounded p-1" />
                                                            </div>
                                                            <div>
                                                               <span className="text-[10px] text-gray-400 mr-1">W</span>
                                                               <input type="number" value={layer.position.width || 0} onChange={(e) => updateLayer({position: {...layer.position, width: parseFloat(e.target.value)}})} className="w-12 text-xs border rounded p-1" />
                                                            </div>
                                                            <div>
                                                               <span className="text-[10px] text-gray-400 mr-1">Rot</span>
                                                               <input type="number" value={layer.position.rotation || 0} onChange={(e) => updateLayer({position: {...layer.position, rotation: parseFloat(e.target.value)}})} className="w-12 text-xs border rounded p-1" />
                                                            </div>
                                                         </div>
                                                      </div>

                                                   </>
                                                );
                                             })()}
                                          </div>
                                       </div>
                                    )}

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
