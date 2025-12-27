import React, { useState } from 'react';
import { User, Download, Upload, Plus, ChevronDown, Trash2, ChevronRight, Layers, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { BookProduct, WizardTab, WizardVariant } from '../../types/admin';
import { slugify } from '../../utils/adminUtils';

interface AdminWizardProps {
  selectedBookId: string | null;
  selectedBook: BookProduct | null;
  handleSaveBook: (updatedBook: BookProduct) => void;
}

const AdminWizard: React.FC<AdminWizardProps> = ({ selectedBookId, selectedBook, handleSaveBook }) => {
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());

  if (!selectedBookId || !selectedBook) return null;

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
    <div className="max-w-4xl mx-auto space-y-6">
       {/* Tabs Config */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User size={24} className="text-indigo-600" />
                Structure des Personnages (Wizard)
             </h2>
             
             <div className="flex items-center gap-3">
                {/* Export/Import for Wizard Config */}
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                     <button 
                         onClick={() => {
                             const exportData = {
                                 version: '1.0',
                                 type: 'wizard_config',
                                 timestamp: new Date().toISOString(),
                                 bookId: selectedBook.id,
                                 wizardConfig: selectedBook.wizardConfig
                             };
                             const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                             const url = URL.createObjectURL(blob);
                             const link = document.createElement('a');
                             link.href = url;
                             link.download = `${slugify(selectedBook.name || 'book')}_wizard_export_${new Date().toISOString().slice(0, 10)}.json`;
                             document.body.appendChild(link);
                             link.click();
                             document.body.removeChild(link);
                             URL.revokeObjectURL(url);
                             toast.success('Configuration Wizard exportée');
                         }}
                         className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" 
                         title="Exporter la config Wizard (JSON)"
                     >
                         <Download size={16} />
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
                                         if (!imported.wizardConfig) {
                                             toast.error('Format invalide (wizardConfig manquant)');
                                             return;
                                         }
                                         if (confirm('Remplacer toute la configuration des personnages ?')) {
                                             handleSaveBook({
                                                 ...selectedBook,
                                                 wizardConfig: imported.wizardConfig
                                             });
                                             toast.success('Configuration Wizard importée');
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
                         title="Importer la config Wizard (JSON)"
                     >
                         <Upload size={16} />
                     </button>
                </div>

                 <button 
                   onClick={() => {
                      const baseLabel = 'Nouveau Perso';
                      const baseId = slugify(baseLabel);
                      
                      // Ensure unique ID
                      const otherIds = selectedBook.wizardConfig.tabs.map(t => t.id);
                      let uniqueId = baseId;
                      let counter = 2;
                      while (otherIds.includes(uniqueId)) {
                          uniqueId = `${baseId}_${counter}`;
                          counter++;
                      }

                      const newTab: WizardTab = { id: uniqueId, label: baseLabel, type: 'character', options: [], variants: [] };
                      handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: [...selectedBook.wizardConfig.tabs, newTab]}});
                   }}
                   className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm"
                 >
                    <Plus size={16} /> Ajouter Personnage
                 </button>
             </div>
          </div>


          <div className="space-y-4">
             {selectedBook.wizardConfig.tabs.map((tab, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
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
                              const newLabel = e.target.value;
                              const newTabs = [...selectedBook.wizardConfig.tabs];
                              const currentTab = newTabs[idx];

                              // Auto-update ID logic
                              const oldSlug = slugify(currentTab.label);
                              const currentId = currentTab.id;
                              
                              // Check if ID is default-like or empty
                              const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('nouveau_perso');
                              const isSyncedId = currentId === oldSlug;

                              newTabs[idx].label = newLabel;

                              if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                  const baseId = slugify(newLabel);
                                  const otherIds = newTabs
                                     .filter((_, i) => i !== idx)
                                     .map(t => t.id);
                                  
                                  let uniqueId = baseId;
                                  let counter = 2;
                                  while (otherIds.includes(uniqueId)) {
                                      uniqueId = `${baseId}_${counter}`;
                                      counter++;
                                  }
                                  newTabs[idx].id = uniqueId;
                              }
                              
                              handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                           }}
                           className="w-full bg-transparent font-bold text-slate-700 border-none p-0 focus:ring-0 text-base"
                           placeholder="Nom du personnage (ex: Héros)"
                        />
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] text-gray-400 uppercase font-bold">ID:</span>
                           <input 
                              type="text" 
                              value={tab.id}
                              onChange={(e) => {
                                 const newTabs = [...selectedBook.wizardConfig.tabs];
                                 newTabs[idx].id = e.target.value;
                                 handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                              }}
                              onBlur={(e) => {
                                 const val = e.target.value.trim();
                                 if (!val) return;
                                 const newTabs = [...selectedBook.wizardConfig.tabs];
                                 const otherIds = newTabs.filter((_, i) => i !== idx).map(t => t.id);
                                 
                                 let uniqueId = val;
                                 let counter = 2;
                                 while (otherIds.includes(uniqueId)) {
                                     uniqueId = `${val}_${counter}`;
                                     counter++;
                                 }
                                 
                                 if (uniqueId !== val) {
                                     newTabs[idx].id = uniqueId;
                                     handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                     toast.info(`ID corrigé pour l'unicité: ${uniqueId}`);
                                 }
                              }}
                              className={`bg-gray-100 text-[10px] font-mono text-slate-500 border-none rounded px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-500 w-32 ${selectedBook.wizardConfig.tabs.filter((_, i) => i !== idx).some(t => t.id === tab.id) ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                              placeholder="ID unique"
                           />
                        </div>
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
                               const baseLabel = 'Nouvel Attribut';
                               const baseId = slugify(baseLabel);
                               
                               // Ensure unique ID
                               const otherIds = newTabs[idx].variants.map(v => v.id);
                               let uniqueId = baseId;
                               let counter = 2;
                               while (otherIds.includes(uniqueId)) {
                                   uniqueId = `${baseId}_${counter}`;
                                   counter++;
                               }

                               newTabs[idx].variants.push({
                                  id: uniqueId,
                                  label: baseLabel,
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
                            <div key={vIdx} className="relative group bg-white border border-gray-100 rounded-lg shadow-sm">
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
                                           const newLabel = e.target.value;
                                           const newTabs = [...selectedBook.wizardConfig.tabs];
                                           const currentVariant = newTabs[idx].variants[vIdx];
                                           
                                           // Auto-update ID logic
                                           const oldSlug = slugify(currentVariant.label);
                                           const currentId = currentVariant.id;
                                           
                                           const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('nouvel_attribut');
                                           const isSyncedId = currentId === oldSlug;
                                           
                                           newTabs[idx].variants[vIdx].label = newLabel;
                                           
                                           if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                               const baseId = slugify(newLabel);
                                               const otherIds = newTabs[idx].variants
                                                   .filter((_, i) => i !== vIdx)
                                                   .map(v => v.id);
                                               
                                               let uniqueId = baseId;
                                               let counter = 2;
                                               while (otherIds.includes(uniqueId)) {
                                                   uniqueId = `${baseId}_${counter}`;
                                                   counter++;
                                               }
                                               newTabs[idx].variants[vIdx].id = uniqueId;
                                           }

                                           handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                        }}
                                        className="w-full bg-transparent font-medium text-slate-700 border-none p-0 focus:ring-0 text-sm"
                                        placeholder="Nom de l'attribut"
                                     />
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                           <span className="text-[9px] text-gray-400 uppercase font-bold">ID:</span>
                                           <input 
                                              type="text" 
                                              value={variant.id}
                                              onChange={(e) => {
                                                 const newTabs = [...selectedBook.wizardConfig.tabs];
                                                 newTabs[idx].variants[vIdx].id = e.target.value;
                                                 handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                              }}
                                              onBlur={(e) => {
                                                 const val = e.target.value.trim();
                                                 if (!val) return;
                                                 const newTabs = [...selectedBook.wizardConfig.tabs];
                                                 const otherIds = newTabs[idx].variants.filter((_, i) => i !== vIdx).map(v => v.id);
                                                 
                                                 let uniqueId = val;
                                                 let counter = 2;
                                                 while (otherIds.includes(uniqueId)) {
                                                     uniqueId = `${val}_${counter}`;
                                                     counter++;
                                                 }
                                                 
                                                 if (uniqueId !== val) {
                                                     newTabs[idx].variants[vIdx].id = uniqueId;
                                                     handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                     toast.info(`ID corrigé: ${uniqueId}`);
                                                 }
                                              }}
                                              className="bg-transparent text-[9px] font-mono text-slate-500 border-none p-0 w-24 focus:ring-0"
                                              placeholder="ID unique"
                                           />
                                        </span>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                     <select 
                                        value={variant.type}
                                        onChange={(e) => {
                                           const newTabs = [...selectedBook.wizardConfig.tabs];
                                           // @ts-ignore
                                           newTabs[idx].variants[vIdx].type = e.target.value;
                                           handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                        }}
                                        className="text-xs border border-gray-200 rounded px-2 py-1"
                                     >
                                        <option value="options">Options (Choix)</option>
                                        <option value="text">Texte libre</option>
                                     </select>

                                     <button 
                                        onClick={() => {
                                           const newTabs = [...selectedBook.wizardConfig.tabs];
                                           newTabs[idx].variants = newTabs[idx].variants.filter((_, i) => i !== vIdx);
                                           handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                        }}
                                        className="text-gray-300 hover:text-red-400 p-1 transition-colors"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                  </div>
                               </div>

                               {/* Variant Details (Expanded) */}
                               {expandedVariantIds.has(variant.id) && variant.type === 'options' && (
                                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {variant.options?.map((option, oIdx) => (
                                           <div key={oIdx} className="bg-white p-2 rounded border border-gray-200 relative group/opt">
                                              <button 
                                                 onClick={() => {
                                                    const newTabs = [...selectedBook.wizardConfig.tabs];
                                                    const newOptions = variant.options?.filter((_, i) => i !== oIdx) || [];
                                                    newTabs[idx].variants[vIdx].options = newOptions;
                                                    handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                 }}
                                                 className="absolute top-1 right-1 text-gray-300 hover:text-red-400 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                              >
                                                 <Trash2 size={12} />
                                              </button>
                                              
                                              <div className={`w-full aspect-square bg-slate-100 rounded mb-2 overflow-hidden flex items-center justify-center border border-gray-100 relative group/upload ${!option.thumbnail ? 'hover:bg-slate-200' : ''}`}>
                                                 {option.thumbnail ? (
                                                    <img src={option.thumbnail} alt="" className="w-full h-full object-contain" />
                                                 ) : (
                                                    <ImageIcon size={16} className="text-gray-300" />
                                                 )}
                                                 
                                                 {/* Image Upload Input */}
                                                 <label className="absolute inset-0 cursor-pointer flex items-center justify-center">
                                                     <input 
                                                         type="file" 
                                                         className="hidden" 
                                                         onChange={(e) => {
                                                             const file = e.target.files?.[0];
                                                             if (file) {
                                                                 const url = URL.createObjectURL(file);
                                                                 const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                 if (!newTabs[idx].variants[vIdx].options) newTabs[idx].variants[vIdx].options = [];
                                                                 // @ts-ignore
                                                                 newTabs[idx].variants[vIdx].options[oIdx].thumbnail = url;
                                                                 handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                             }
                                                         }}
                                                     />
                                                     <div className={`bg-black/40 text-white rounded-full p-1 opacity-0 group-hover/upload:opacity-100 transition-opacity ${!option.thumbnail ? 'hidden' : ''}`}>
                                                         <Upload size={12} />
                                                     </div>
                                                 </label>
                                              </div>

                                              <input 
                                                 type="text" 
                                                 value={option.label}
                                                 onChange={(e) => {
                                                    const newLabel = e.target.value;
                                                    const newTabs = [...selectedBook.wizardConfig.tabs];
                                                    if (!newTabs[idx].variants[vIdx].options) newTabs[idx].variants[vIdx].options = [];
                                                    // @ts-ignore
                                                    const currentOpt = newTabs[idx].variants[vIdx].options[oIdx];
                                                    
                                                    // Auto-update ID
                                                    const oldSlug = slugify(currentOpt.label);
                                                    const currentId = currentOpt.id;
                                                    const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('nouvelle_option');
                                                    const isSyncedId = currentId === oldSlug;
                                                    
                                                    // @ts-ignore
                                                    newTabs[idx].variants[vIdx].options[oIdx].label = newLabel;
                                                    
                                                    if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                                        const baseId = slugify(newLabel);
                                                        // Ensure unique in this variant
                                                        const otherIds = newTabs[idx].variants[vIdx].options
                                                            ?.filter((_, i) => i !== oIdx)
                                                            .map(o => o.id) || [];
                                                            
                                                        let uniqueId = baseId;
                                                        let counter = 2;
                                                        while (otherIds.includes(uniqueId)) {
                                                            uniqueId = `${baseId}_${counter}`;
                                                            counter++;
                                                        }
                                                        // @ts-ignore
                                                        newTabs[idx].variants[vIdx].options[oIdx].id = uniqueId;
                                                    }

                                                    handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                 }}
                                                 className="w-full text-xs font-bold text-center border-none p-0 focus:ring-0 bg-transparent"
                                                 placeholder="Nom"
                                              />
                                              
                                              <input 
                                                 type="text" 
                                                 value={option.id}
                                                 onChange={(e) => {
                                                    const newTabs = [...selectedBook.wizardConfig.tabs];
                                                    if (!newTabs[idx].variants[vIdx].options) newTabs[idx].variants[vIdx].options = [];
                                                    // @ts-ignore
                                                    newTabs[idx].variants[vIdx].options[oIdx].id = e.target.value;
                                                    handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                 }}
                                                 onBlur={(e) => {
                                                    const val = e.target.value.trim();
                                                    if (!val) return;
                                                    const newTabs = [...selectedBook.wizardConfig.tabs];
                                                    const otherIds = newTabs[idx].variants[vIdx].options?.filter((_, i) => i !== oIdx).map(o => o.id) || [];
                                                    
                                                    let uniqueId = val;
                                                    let counter = 2;
                                                    while (otherIds.includes(uniqueId)) {
                                                        uniqueId = `${val}_${counter}`;
                                                        counter++;
                                                    }
                                                    
                                                    if (uniqueId !== val) {
                                                        // @ts-ignore
                                                        newTabs[idx].variants[vIdx].options[oIdx].id = uniqueId;
                                                        handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                        toast.info(`ID corrigé: ${uniqueId}`);
                                                    }
                                                 }}
                                                 className="w-full text-[10px] text-gray-400 text-center border-none p-0 focus:ring-0 bg-transparent font-mono"
                                                 placeholder="ID"
                                              />
                                           </div>
                                        ))}

                                        {/* Add Option Button */}
                                        <button 
                                           onClick={() => {
                                              const newTabs = [...selectedBook.wizardConfig.tabs];
                                              if (!newTabs[idx].variants[vIdx].options) newTabs[idx].variants[vIdx].options = [];
                                              
                                              const baseLabel = 'Nouvelle Option';
                                              const baseId = slugify(baseLabel);
                                              const otherIds = newTabs[idx].variants[vIdx].options?.map(o => o.id) || [];
                                              
                                              let uniqueId = baseId;
                                              let counter = 2;
                                              while (otherIds.includes(uniqueId)) {
                                                  uniqueId = `${baseId}_${counter}`;
                                                  counter++;
                                              }

                                              newTabs[idx].variants[vIdx].options?.push({
                                                 id: uniqueId,
                                                 label: baseLabel
                                              });
                                              handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                           }}
                                           className="aspect-square rounded border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                                        >
                                           <Plus size={20} />
                                           <span className="text-[10px] font-bold mt-1">Ajouter</span>
                                        </button>
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
  );
};

export default AdminWizard;
