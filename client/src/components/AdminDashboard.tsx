import React, { useState } from 'react';
import { Book, User, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2 } from 'lucide-react';
import { Theme } from '../types';

interface WizardConfig {
  id: string;
  name: string;
  avatarConfig: {
    baseId: string;
    options: string[]; // e.g., ['hairColor', 'skinTone', 'glasses']
  };
}

interface ContentConfig {
  id: string;
  combinationId: string; // e.g., "theme:adventure|gender:boy"
  textVariables: Record<string, string>;
  imageVariables: Record<string, string>;
}

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'books' | 'wizards' | 'content'>('books');
  
  // --- MOCK DATA ---
  const [books, setBooks] = useState([
    { id: '1', title: 'Un lien magique', theme: Theme.Adventure, cover: 'adventure_cover.jpg' },
    { id: '2', title: 'Le secret de la forêt', theme: Theme.Animals, cover: 'animals_cover.jpg' },
  ]);

  const [wizards, setWizards] = useState<WizardConfig[]>([
    { id: 'w1', name: 'Standard Child Wizard', avatarConfig: { baseId: 'child_base', options: ['hair', 'skin', 'clothes'] } },
    { id: 'w2', name: 'Grandparent Wizard', avatarConfig: { baseId: 'adult_base', options: ['hair', 'skin', 'beard', 'glasses'] } },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-coral to-red-500 flex items-center justify-center text-white font-bold">W</div>
           <span className="font-bold text-white text-lg tracking-tight">WawBook Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
           <button 
             onClick={() => setActiveTab('books')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'books' ? 'bg-brand-coral text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
              <Book size={20} />
              <span className="font-medium">Livres</span>
           </button>
           
           <button 
             onClick={() => setActiveTab('wizards')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'wizards' ? 'bg-brand-coral text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
              <User size={20} />
              <span className="font-medium">Wizards & Avatars</span>
           </button>

           <button 
             onClick={() => setActiveTab('content')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'content' ? 'bg-brand-coral text-white shadow-lg' : 'hover:bg-slate-800'}`}
           >
              <FileText size={20} />
              <span className="font-medium">Contenu Variable</span>
           </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={16} className="rotate-180" />
              Retour au site
           </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Header */}
         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800">
               {activeTab === 'books' && 'Gestion des Livres'}
               {activeTab === 'wizards' && 'Configuration des Wizards'}
               {activeTab === 'content' && 'Variables Textes & Images'}
            </h1>
            <div className="flex items-center gap-4">
               <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600">
                  <Settings size={20} />
               </button>
               <div className="w-10 h-10 rounded-full bg-brand-coral text-white flex items-center justify-center font-bold">
                  A
               </div>
            </div>
         </header>

         {/* Scrollable Content */}
         <main className="flex-1 overflow-y-auto p-8">
            
            {/* --- BOOKS TAB --- */}
            {activeTab === 'books' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <p className="text-slate-500">Gérez votre catalogue de livres personnalisables.</p>
                    <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md">
                       <Plus size={18} />
                       Nouveau Livre
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map(book => (
                      <div key={book.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all">
                         <div className="h-48 bg-slate-100 relative flex items-center justify-center text-slate-300">
                            <Book size={48} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                         </div>
                         <div className="p-5">
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{book.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{book.theme}</p>
                            <div className="flex gap-2">
                               <button className="flex-1 px-3 py-2 bg-slate-50 text-slate-700 rounded-md font-medium text-sm hover:bg-slate-100 border border-gray-200 flex items-center justify-center gap-2">
                                  <Edit2 size={14} /> Éditer
                               </button>
                               <button className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md border border-transparent hover:border-red-100">
                                  <Trash2 size={16} />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                    
                    {/* Add Placeholder */}
                    <button className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-brand-coral hover:text-brand-coral hover:bg-brand-coral/5 transition-all h-full min-h-[300px]">
                       <Plus size={48} className="mb-4 opacity-50" />
                       <span className="font-bold">Ajouter un livre</span>
                    </button>
                 </div>
              </div>
            )}

            {/* --- WIZARDS TAB --- */}
            {activeTab === 'wizards' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <p className="text-slate-500">Configurez les options de personnalisation des avatars.</p>
                     <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md">
                        <Plus size={18} />
                        Nouveau Wizard
                     </button>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                           <tr>
                              <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Nom du Wizard</th>
                              <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Base Avatar</th>
                              <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Options Activées</th>
                              <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {wizards.map(wizard => (
                             <tr key={wizard.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-medium text-slate-900">{wizard.name}</td>
                                <td className="px-6 py-4 text-slate-600 font-mono text-sm bg-gray-50/50 rounded">{wizard.avatarConfig.baseId}</td>
                                <td className="px-6 py-4">
                                   <div className="flex gap-2 flex-wrap">
                                      {wizard.avatarConfig.options.map(opt => (
                                         <span key={opt} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">{opt}</span>
                                      ))}
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <button className="text-brand-coral font-bold text-sm hover:underline">Configurer</button>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {/* --- CONTENT TAB --- */}
            {activeTab === 'content' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <p className="text-slate-500">Gérez les textes et images dynamiques par combinaison.</p>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-end">
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Livre</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-coral outline-none">
                           <option>Un lien magique</option>
                           <option>Le secret de la forêt</option>
                        </select>
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Genre</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-coral outline-none">
                           <option>Tous</option>
                           <option>Garçon</option>
                           <option>Fille</option>
                        </select>
                     </div>
                     <button className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium h-[38px]">Filtrer</button>
                  </div>

                  {/* Variable Editor */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-brand-coral" />
                        Variables Textuelles
                     </h3>
                     
                     <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-lg border border-gray-100">
                           <div className="col-span-3">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Clé Variable</label>
                              <input type="text" value="{{HERO_NAME}}" disabled className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-500" />
                           </div>
                           <div className="col-span-9">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Valeur par défaut</label>
                              <input type="text" placeholder="Entrez le texte..." className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm" />
                           </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-lg border border-gray-100">
                           <div className="col-span-3">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Clé Variable</label>
                              <input type="text" value="{{COMPANION_TYPE}}" disabled className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-500" />
                           </div>
                           <div className="col-span-9">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Valeur par défaut</label>
                              <input type="text" placeholder="Entrez le texte..." className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Image size={20} className="text-brand-coral" />
                        Variables Images
                     </h3>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                           <div key={i} className="aspect-square bg-slate-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-brand-coral hover:text-brand-coral hover:bg-brand-coral/5 transition-all cursor-pointer">
                              <Upload size={24} className="mb-2" />
                              <span className="text-xs font-bold">Upload Variant {i}</span>
                           </div>
                        ))}
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
