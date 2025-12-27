import React, { useState } from 'react';
import { Eye, Download, Upload, ChevronDown, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BookProduct } from '../../types/admin';
import { generateAvatarCombinations, slugify } from '../../utils/adminUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

interface AdminAvatarsProps {
  selectedBookId: string | null;
  selectedBook: BookProduct | null;
  handleSaveBook: (updatedBook: BookProduct) => void;
}

const AdminAvatars: React.FC<AdminAvatarsProps> = ({ selectedBookId, selectedBook, handleSaveBook }) => {
  const [selectedAvatarTabId, setSelectedAvatarTabId] = useState<string | null>(null);
  const [avatarFilters, setAvatarFilters] = useState<Record<string, string[]>>({}); // variantId -> [selectedOptionIds]

  if (!selectedBookId || !selectedBook) return null;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] flex flex-col">
       
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 shrink-0">
          <div className="flex justify-between items-start mb-4">
             <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Eye size={24} className="text-indigo-600" />
                     Prévisualisation des Personnages
                 </h2>
                 <p className="text-sm text-slate-500 mt-1">
                     Configurez l'apparence finale (avatar) pour chaque combinaison d'options possible.
                     Ces images seront affichées dans le Wizard lors de la sélection.
                 </p>
             </div>
             
             <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-4">
                 <button 
                     onClick={() => {
                         if (!selectedBook) return;
                         
                         // Generate all possible keys to ensure export is complete (even empty ones)
                         const completeMappings = { ...(selectedBook.wizardConfig.avatarMappings || {}) };
                         
                         selectedBook.wizardConfig.tabs.forEach(tab => {
                            if (tab.type === 'character') {
                               const combos = generateAvatarCombinations(tab);
                               combos.forEach(c => {
                                  if (!completeMappings[c.key]) {
                                     completeMappings[c.key] = ""; // Empty placeholder
                                  }
                               });
                            }
                         });

                         const exportData = {
                             version: '1.0',
                             type: 'avatar_mappings',
                             timestamp: new Date().toISOString(),
                             bookId: selectedBook.id,
                             avatarMappings: completeMappings
                         };
                         const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                         const url = URL.createObjectURL(blob);
                         const link = document.createElement('a');
                         link.href = url;
                         link.download = `${slugify(selectedBook.name || 'book')}_avatars_export_${new Date().toISOString().slice(0, 10)}.json`;
                         document.body.appendChild(link);
                         link.click();
                         document.body.removeChild(link);
                         URL.revokeObjectURL(url);
                         toast.success('Mappings Avatars exportés (toutes combinaisons)');
                     }}
                     className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" 
                     title="Exporter les mappings (JSON)"
                 >
                     <Download size={18} />
                 </button>
                 <button 
                     onClick={() => {
                         const input = document.createElement('input');
                         input.type = 'file';
                         input.accept = '.json';
                         input.onchange = (e: any) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             const reader = new FileReader();
                             reader.onload = (re: any) => {
                                 try {
                                     const imported = JSON.parse(re.target.result);
                                     if (!imported.avatarMappings) {
                                         toast.error('Format invalide (avatarMappings manquant)');
                                         return;
                                     }
                                     if (confirm('Remplacer tous les mappings d\'avatars ?')) {
                                         handleSaveBook({
                                             ...selectedBook,
                                             wizardConfig: {
                                                 ...selectedBook.wizardConfig,
                                                 avatarMappings: imported.avatarMappings
                                             }
                                         });
                                         toast.success('Mappings Avatars importés');
                                     }
                                 } catch (err) {
                                     toast.error('Erreur de lecture du fichier');
                                 }
                             };
                             reader.readAsText(file);
                         };
                         input.click();
                     }}
                     className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" 
                     title="Importer les mappings (JSON)"
                 >
                     <Upload size={18} />
                 </button>
             </div>
          </div>

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

             // Filter options variants only
             const optionVariants = targetTab.variants.filter(v => v.type === 'options' || !v.type);

             const combinations = generateAvatarCombinations(targetTab).filter(combo => {
                 // Apply filters
                 return Object.entries(avatarFilters).every(([variantId, selectedOptionIds]) => {
                     if (!selectedOptionIds || selectedOptionIds.length === 0) return true;
                     
                     // Use more robust matching that handles potentially missing/mismatched IDs
                     const hasMatch = combo.parts.some((p: any) => {
                         // Direct ID match
                         if (p.variantId === variantId && selectedOptionIds.includes(p.id)) return true;
                         return false;
                     });
                     
                     return hasMatch;
                 });
             });

             return (
                <div>
                   {/* Filters Header */}
                   {optionVariants.length > 0 && (
                       <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-gray-100 items-end">
                           {optionVariants.map(variant => {
                               const selectedIds = avatarFilters[variant.id] || [];
                               
                               return (
                                  <div key={variant.id} className="flex flex-col gap-1 min-w-[140px]">
                                     <label className="text-[10px] font-bold text-slate-500 uppercase">{variant.label}</label>
                                     <Popover>
                                         <PopoverTrigger asChild>
                                             <button className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white flex items-center justify-between hover:bg-slate-50">
                                                 <span className="truncate">
                                                     {selectedIds.length === 0 
                                                         ? "Tous" 
                                                         : selectedIds.length === 1 
                                                             ? (variant.options?.find(o => o.id === selectedIds[0])?.label || selectedIds[0])
                                                             : `${selectedIds.length} sélectionnés`
                                                     }
                                                 </span>
                                                 <ChevronDown size={12} className="opacity-50" />
                                             </button>
                                         </PopoverTrigger>
                                         <PopoverContent className="w-[200px] p-0" align="start">
                                             <div className="max-h-[300px] overflow-y-auto p-1 bg-[#ffffff]">
                                                 <div 
                                                     className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                                                     onClick={() => {
                                                         setAvatarFilters(prev => {
                                                             const next = { ...prev };
                                                             delete next[variant.id];
                                                             return next;
                                                         });
                                                     }}
                                                 >
                                                     <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.length === 0 ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                         {selectedIds.length === 0 && <span className="text-white text-[10px]">✓</span>}
                                                     </div>
                                                     <span className="text-sm">Tous</span>
                                                 </div>
                                                 {variant.options?.map(opt => {
                                                     const isSelected = selectedIds.includes(opt.id);
                                                     return (
                                                         <div 
                                                             key={opt.id}
                                                             className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                                                             onClick={() => {
                                                                 setAvatarFilters(prev => {
                                                                     const current = prev[variant.id] || [];
                                                                     const next = current.includes(opt.id)
                                                                         ? current.filter(id => id !== opt.id)
                                                                         : [...current, opt.id];
                                                                     
                                                                     // If empty, remove key to reset to "All"
                                                                     if (next.length === 0) {
                                                                         const copy = { ...prev };
                                                                         delete copy[variant.id];
                                                                         return copy;
                                                                     }
                                                                     
                                                                     return { ...prev, [variant.id]: next };
                                                                 });
                                                             }}
                                                         >
                                                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                                 {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                             </div>
                                                             <span className="text-sm">{opt.label}</span>
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                         </PopoverContent>
                                     </Popover>
                                  </div>
                               );})}
                           <div className="ml-auto">
                               <button 
                                   onClick={() => setAvatarFilters({})}
                                   className="text-xs text-slate-500 hover:text-red-500 underline"
                                   disabled={Object.keys(avatarFilters).length === 0}
                               >
                                   Réinitialiser
                               </button>
                           </div>
                       </div>
                   )}
                   {/* Results Info */}
                   <div className="mb-4 text-xs text-slate-400 font-medium">
                       {combinations.length} combinaisons affichées
                   </div>
                   {combinations.length === 0 ? (
                       <div className="text-center py-12 text-gray-400">
                          <User size={48} className="mx-auto mb-4 opacity-20" />
                          <p>Aucune combinaison ne correspond à vos filtres.</p>
                       </div>
                   ) : (
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                           {combinations.map((combo, comboIdx) => {
                              const existingAvatar = selectedBook.wizardConfig.avatarMappings?.[combo.key];
                              
                              return (
                                 <div key={`${combo.key}_${comboIdx}`} className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-all">
                                    <div className="aspect-square bg-white relative flex items-center justify-center border-b border-gray-100">
                                       {existingAvatar ? (
                                          <img src={existingAvatar} alt="Avatar" className="w-full h-full object-contain p-4" />
                                       ) : (
                                          <User size={48} className="text-gray-200" />
                                       )}
                                       
                                       {/* Upload Overlay */}
                                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all flex gap-2">
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
                                             
                                             {existingAvatar && (
                                                 <button 
                                                     onClick={() => {
                                                         if (confirm('Supprimer cette image ?')) {
                                                             const newMappings = { ...(selectedBook.wizardConfig.avatarMappings || {}) };
                                                             delete newMappings[combo.key];
                                                             handleSaveBook({
                                                                 ...selectedBook,
                                                                 wizardConfig: {
                                                                     ...selectedBook.wizardConfig,
                                                                     avatarMappings: newMappings
                                                                 }
                                                             });
                                                             toast.success('Image supprimée');
                                                         }
                                                     }}
                                                     className="bg-white text-red-500 p-1.5 rounded-lg shadow-lg hover:bg-red-50"
                                                 >
                                                     <Trash2 size={14} />
                                                 </button>
                                             )}
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
                   )}
                </div>
             );
          })()}
       </div>
    </div>
  );
};

export default AdminAvatars;
