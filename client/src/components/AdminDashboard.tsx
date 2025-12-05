import React, { useState } from 'react';
import { Book, User, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct, WizardTab, TextElement } from '../types/admin';

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
        { id: 't1', label: 'Enfant', type: 'character', options: ['hair', 'skin', 'clothes'] },
        { id: 't2', label: 'Parent', type: 'character', options: ['hair', 'skin', 'beard'] }
      ]
    },
    contentConfig: {
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

  // Helper to get selected book
  const selectedBook = books.find(b => b.id === selectedBookId);

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
      contentConfig: { texts: [], images: [] }
    };
    setBooks([...books, newBook]);
    setSelectedBookId(newBook.id);
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
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
                  <span className="font-medium">Contenu</span>
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
         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
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
               <div className="max-w-4xl mx-auto space-y-6">
                  
                  {/* Style Config */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                     <h2 className="text-xl font-bold mb-4 text-slate-800">Style Artistique</h2>
                     <div className="grid grid-cols-3 gap-4">
                        {['watercolor', 'cartoon', 'realistic'].map(style => (
                           <button 
                             key={style}
                             onClick={() => handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, avatarStyle: style as any}})}
                             className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedBook.wizardConfig.avatarStyle === style ? 'border-brand-coral bg-red-50 text-brand-coral' : 'border-gray-100 hover:border-gray-200'}`}
                           >
                              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                              <span className="font-bold capitalize">{style}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Tabs Config */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Onglets de Personnalisation</h2>
                        <button 
                          onClick={() => {
                             const newTab: WizardTab = { id: Date.now().toString(), label: 'Nouveau Perso', type: 'character', options: [] };
                             handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: [...selectedBook.wizardConfig.tabs, newTab]}});
                          }}
                          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                           + Ajouter un onglet
                        </button>
                     </div>

                     <div className="space-y-4">
                        {selectedBook.wizardConfig.tabs.map((tab, idx) => (
                           <div key={tab.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                              <div className="flex gap-4 items-start mb-4">
                                 <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nom de l'onglet</label>
                                    <input 
                                      type="text" 
                                      value={tab.label}
                                      onChange={(e) => {
                                         const newTabs = [...selectedBook.wizardConfig.tabs];
                                         newTabs[idx].label = e.target.value;
                                         handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                      }}
                                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    />
                                 </div>
                                 <div className="w-40">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                                    <select 
                                      value={tab.type}
                                      onChange={(e) => {
                                         const newTabs = [...selectedBook.wizardConfig.tabs];
                                         newTabs[idx].type = e.target.value as any;
                                         handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                      }}
                                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    >
                                       <option value="character">Personnage</option>
                                       <option value="element">Élément (Objet)</option>
                                    </select>
                                 </div>
                                 <button 
                                   onClick={() => {
                                      const newTabs = selectedBook.wizardConfig.tabs.filter((_, i) => i !== idx);
                                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                   }}
                                   className="mt-6 text-red-400 hover:text-red-600 p-1"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                              
                              <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Options disponibles</label>
                                 <div className="flex gap-2 flex-wrap">
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
                                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${tab.options.includes(opt) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                       >
                                          {opt}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        ))}
                        {selectedBook.wizardConfig.tabs.length === 0 && (
                           <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              Aucun onglet configuré. Ajoutez-en un pour commencer.
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* --- VIEW: EDIT CONTENT --- */}
            {activeTab === 'content' && selectedBookId && selectedBook && (
               <div className="space-y-6">
                  
                  {/* Text Management */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <Type size={20} className="text-brand-coral" />
                           Textes du Livre
                        </h2>
                        <button 
                          onClick={() => {
                             const newText: TextElement = { id: Date.now().toString(), label: 'Nouveau Texte', type: 'fixed', content: '', position: { pageIndex: 0, zoneId: 'body' } };
                             handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: [...selectedBook.contentConfig.texts, newText]}});
                          }}
                          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                           + Ajouter un texte
                        </button>
                     </div>

                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                 <th className="py-3 px-2 w-16">Page</th>
                                 <th className="py-3 px-2 w-32">Zone</th>
                                 <th className="py-3 px-2 w-48">Label</th>
                                 <th className="py-3 px-2 w-32">Type</th>
                                 <th className="py-3 px-2">Contenu (Supporte les variables)</th>
                                 <th className="py-3 px-2 w-10"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {selectedBook.contentConfig.texts.map((text, idx) => (
                                 <tr key={text.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-2">
                                       <input 
                                         type="number" 
                                         className="w-12 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                                         value={text.position.pageIndex}
                                         onChange={(e) => {
                                            const newTexts = [...selectedBook.contentConfig.texts];
                                            newTexts[idx].position.pageIndex = parseInt(e.target.value);
                                            handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                         }}
                                       />
                                    </td>
                                    <td className="p-2">
                                       <select 
                                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                                          value={text.position.zoneId}
                                          onChange={(e) => {
                                             const newTexts = [...selectedBook.contentConfig.texts];
                                             newTexts[idx].position.zoneId = e.target.value;
                                             handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                          }}
                                       >
                                          <option value="header">En-tête</option>
                                          <option value="body">Corps</option>
                                          <option value="footer">Pied</option>
                                          <option value="title">Titre</option>
                                       </select>
                                    </td>
                                    <td className="p-2">
                                       <input 
                                         type="text" 
                                         className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                                         value={text.label}
                                         onChange={(e) => {
                                            const newTexts = [...selectedBook.contentConfig.texts];
                                            newTexts[idx].label = e.target.value;
                                            handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                         }}
                                       />
                                    </td>
                                    <td className="p-2">
                                       <span className={`text-xs font-bold px-2 py-1 rounded ${text.type === 'variable' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {text.type === 'variable' ? 'Variable' : 'Fixe'}
                                       </span>
                                    </td>
                                    <td className="p-2">
                                       <input 
                                         type="text" 
                                         className="w-full border border-gray-200 rounded px-2 py-1 text-sm font-mono text-slate-600"
                                         value={text.content}
                                         onChange={(e) => {
                                            const newTexts = [...selectedBook.contentConfig.texts];
                                            newTexts[idx].content = e.target.value;
                                            newTexts[idx].type = e.target.value.includes('{{') ? 'variable' : 'fixed';
                                            handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                         }}
                                       />
                                    </td>
                                    <td className="p-2 text-right">
                                       <button 
                                          onClick={() => {
                                             const newTexts = selectedBook.contentConfig.texts.filter((_, i) => i !== idx);
                                             handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                          }}
                                          className="text-red-400 hover:text-red-600"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Image Management */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <Image size={20} className="text-brand-coral" />
                           Illustrations Variables
                        </h2>
                        <button className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors">
                           + Uploader des variantes
                        </button>
                     </div>
                     
                     <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <Upload size={48} className="text-gray-300 mb-4" />
                        <h3 className="font-bold text-gray-700 mb-1">Glissez-déposez vos illustrations ici</h3>
                        <p className="text-sm text-gray-500 mb-4">Supporte l'organisation automatique par nom de fichier (ex: page1_boy_watercolor.png)</p>
                        <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                           Parcourir les fichiers
                        </button>
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
