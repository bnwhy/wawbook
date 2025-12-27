import React, { useState } from 'react';
import { Book, Plus, ImageIcon, PenTool, Settings, Menu, Save } from 'lucide-react';
import { useBooks } from '../../context/BooksContext';
import { useMenus } from '../../context/MenuContext';
import { Theme } from '../../types';
import { BookProduct } from '../../types/admin';

interface AdminBooksProps {
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
  handleSaveBook: (updatedBook: BookProduct) => void;
  selectedBook: BookProduct | null;
  setIsEditing: (isEditing: boolean) => void;
}

const AdminBooks: React.FC<AdminBooksProps> = ({ 
  selectedBookId, 
  setSelectedBookId, 
  handleSaveBook,
  selectedBook,
  setIsEditing
}) => {
  const { books, addBook } = useBooks();
  const { mainMenu } = useMenus();

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
      contentConfig: { pages: [], texts: [], images: [], imageElements: [] }
    };
    addBook(newBook);
    setSelectedBookId(newBook.id);
    handleSaveBook(newBook);
    setIsEditing(true);
  };

  return (
    <>
      {/* --- VIEW: ALL BOOKS --- */}
      {!selectedBookId && (
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
                         <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{book.price.toFixed(2)} €</span>
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

      {/* --- VIEW: EDIT BOOK GENERAL --- */}
      {selectedBookId && selectedBook && (
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
                              onClick={() => handleSaveBook({...selectedBook, coverImage: ''})}
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

               <div className="col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                     <label className="block text-sm font-bold text-slate-800 mb-1">Visibilité du livre</label>
                     <p className="text-xs text-slate-500">Si masqué, le livre ne sera pas visible dans la boutique.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                     <input 
                        type="checkbox" 
                        checked={!selectedBook.isHidden} 
                        onChange={(e) => handleSaveBook({...selectedBook, isHidden: !e.target.checked})}
                        className="sr-only peer" 
                     />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-coral/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                     <span className="ml-3 text-sm font-medium text-slate-700">{selectedBook.isHidden ? 'Masqué' : 'Visible'}</span>
                  </label>
               </div>
            </div>

            {/* Features Editor */}
            <div className="mb-6 border-t border-gray-100 pt-6">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Settings size={18} className="text-indigo-600" />
                   Caractéristiques du Livre
               </h3>
               
               <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                     <label className="block text-sm font-bold text-slate-700 mb-2">Langues (séparées par virgule)</label>
                     <textarea 
                       value={selectedBook.features?.languages?.join(', ') || ''}
                       onChange={(e) => {
                          const langs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          handleSaveBook({
                             ...selectedBook, 
                             features: { ...selectedBook.features, languages: langs }
                          });
                       }}
                       className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none h-24 text-sm resize-none"
                       placeholder="Français, Anglais..."
                     />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                     <label className="block text-sm font-bold text-slate-700 mb-2">Options de Personnalisation</label>
                     <textarea 
                       value={selectedBook.features?.customization?.join(', ') || ''}
                       onChange={(e) => {
                          const customs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          handleSaveBook({
                             ...selectedBook, 
                             features: { ...selectedBook.features, customization: customs }
                          });
                       }}
                       className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none h-24 text-sm resize-none"
                       placeholder="Nom, Coiffure, Lunettes..."
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de Pages</label>
                     <input 
                       type="number"
                       value={selectedBook.features?.pages || 40}
                       onChange={(e) => {
                          handleSaveBook({
                             ...selectedBook, 
                             features: { ...selectedBook.features, pages: parseInt(e.target.value) || 0 }
                          });
                       }}
                       className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Formats (séparés par virgule)</label>
                     <input 
                       type="text"
                       value={selectedBook.features?.formats?.join(', ') || ''}
                       onChange={(e) => {
                          const formats = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          handleSaveBook({
                             ...selectedBook, 
                             features: { ...selectedBook.features, formats: formats }
                          });
                       }}
                       className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                       placeholder="Broché : 21x21 cm, Relié..."
                     />
                  </div>
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
    </>
  );
};

export default AdminBooks;
