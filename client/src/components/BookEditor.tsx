import React, { useState } from 'react';
import { BookOpen, Layers, Settings, Type, Image, Trash2, Plus, ArrowUp, ArrowDown, Move, Image as ImageIcon, Printer } from 'lucide-react';
import { BookProduct, TextElement, ImageElement } from '../types/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';

interface BookEditorProps {
  selectedBook: BookProduct;
  handleSaveBook: (book: BookProduct) => void;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  viewMode: 'single' | 'spread';
  setViewMode: (mode: 'single' | 'spread') => void;
  activeLayerId: string | null;
  setActiveLayerId: (id: string | null) => void;
  activeRightTab: 'layers' | 'properties';
  setActiveRightTab: (tab: 'layers' | 'properties') => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  setDragStartPos: (pos: {x: number, y: number} | null) => void;
  setDragStartElementPos: (pos: {x: number, y: number} | null) => void;
}

export const BookEditor: React.FC<BookEditorProps> = ({
  selectedBook,
  handleSaveBook,
  selectedPageId,
  setSelectedPageId,
  viewMode,
  setViewMode,
  activeLayerId,
  setActiveLayerId,
  activeRightTab,
  setActiveRightTab,
  canvasRef,
  isDragging,
  setIsDragging,
  setDragStartPos,
  setDragStartElementPos
}) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('default');
  const [showPrintConfig, setShowPrintConfig] = useState(false);

  const bookDimensions = selectedBook.features?.dimensions || { width: 210, height: 210 };
  const aspectRatio = bookDimensions.width / bookDimensions.height;

  // Pages Logic
  const pages = selectedBook.contentConfig.pages || [];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
       {/* --- TOP BAR --- */}
       <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
                <div className="w-8 h-8 rounded bg-brand-coral/10 text-brand-coral flex items-center justify-center">
                   <BookOpen size={18} />
                </div>
                <span>Éditeur</span>
             </div>
             
             <div className="h-8 w-px bg-gray-200"></div>
             
             <div className="flex items-center gap-3">
                <div className="flex flex-col">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Largeur</label>
                   <input 
                      type="number" 
                      value={bookDimensions.width}
                      onChange={(e) => {
                         const width = parseInt(e.target.value) || 210;
                         handleSaveBook({
                            ...selectedBook,
                            features: {
                               ...selectedBook.features,
                               dimensions: { ...bookDimensions, width }
                            }
                         });
                      }}
                      className="w-16 h-7 text-xs border border-gray-200 rounded px-2 font-mono focus:ring-brand-coral focus:border-brand-coral"
                   />
                </div>
                <div className="flex flex-col">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hauteur</label>
                   <input 
                      type="number" 
                      value={bookDimensions.height}
                      onChange={(e) => {
                         const height = parseInt(e.target.value) || 210;
                         handleSaveBook({
                            ...selectedBook,
                            features: {
                               ...selectedBook.features,
                               dimensions: { ...bookDimensions, height }
                            }
                         });
                      }}
                      className="w-16 h-7 text-xs border border-gray-200 rounded px-2 font-mono focus:ring-brand-coral focus:border-brand-coral"
                   />
                </div>
             </div>
          </div>

          <Dialog open={showPrintConfig} onOpenChange={setShowPrintConfig}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">
                    <Printer size={16} />
                    Paramètres d'impression
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configuration Impression</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Cover Settings */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 border-b pb-2">Couverture</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Bleed (mm)</label>
                                <input 
                                    type="number" 
                                    value={selectedBook.features?.printConfig?.cover?.bleedMm || 3}
                                    onChange={(e) => handleSaveBook({
                                        ...selectedBook,
                                        features: {
                                            ...selectedBook.features,
                                            printConfig: {
                                                ...selectedBook.features?.printConfig,
                                                cover: { ...selectedBook.features?.printConfig?.cover, bleedMm: parseFloat(e.target.value) }
                                            } as any
                                        }
                                    })}
                                    className="w-full text-sm border-gray-300 rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Marge Sécu (mm)</label>
                                <input 
                                    type="number" 
                                    value={selectedBook.features?.printConfig?.cover?.safeMarginMm || 10}
                                    onChange={(e) => handleSaveBook({
                                        ...selectedBook,
                                        features: {
                                            ...selectedBook.features,
                                            printConfig: {
                                                ...selectedBook.features?.printConfig,
                                                cover: { ...selectedBook.features?.printConfig?.cover, safeMarginMm: parseFloat(e.target.value) }
                                            } as any
                                        }
                                    })}
                                    className="w-full text-sm border-gray-300 rounded mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Interior Settings */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 border-b pb-2">Intérieur</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Bleed (mm)</label>
                                <input 
                                    type="number" 
                                    value={selectedBook.features?.printConfig?.interior?.bleedMm || 3}
                                    onChange={(e) => handleSaveBook({
                                        ...selectedBook,
                                        features: {
                                            ...selectedBook.features,
                                            printConfig: {
                                                ...selectedBook.features?.printConfig,
                                                interior: { ...selectedBook.features?.printConfig?.interior, bleedMm: parseFloat(e.target.value) }
                                            } as any
                                        }
                                    })}
                                    className="w-full text-sm border-gray-300 rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Marge Sécu (mm)</label>
                                <input 
                                    type="number" 
                                    value={selectedBook.features?.printConfig?.interior?.safeMarginMm || 10}
                                    onChange={(e) => handleSaveBook({
                                        ...selectedBook,
                                        features: {
                                            ...selectedBook.features,
                                            printConfig: {
                                                ...selectedBook.features?.printConfig,
                                                interior: { ...selectedBook.features?.printConfig?.interior, safeMarginMm: parseFloat(e.target.value) }
                                            } as any
                                        }
                                    })}
                                    className="w-full text-sm border-gray-300 rounded mt-1"
                                />
                            </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Type de papier</label>
                             <select 
                                value={selectedBook.features?.printConfig?.interior?.paperType || '80g_white'}
                                onChange={(e) => handleSaveBook({
                                    ...selectedBook,
                                    features: {
                                        ...selectedBook.features,
                                        printConfig: {
                                            ...selectedBook.features?.printConfig,
                                            interior: { ...selectedBook.features?.printConfig?.interior, paperType: e.target.value }
                                        } as any
                                    }
                                })}
                                className="w-full text-sm border-gray-300 rounded mt-1"
                             >
                                <option value="80g_white">80g Blanc Standard</option>
                                <option value="80g_cream">80g Crème</option>
                                <option value="100g_white">100g Blanc Premium</option>
                                <option value="coated_standard">Couché Standard</option>
                                <option value="coated_premium">Couché Premium</option>
                             </select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800">
                            Fermer
                        </button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
          </Dialog>
       </div>

       {/* --- MAIN EDITOR AREA --- */}
       <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR: PAGES */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col z-10">
             <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Structure du livre</h3>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-medium text-slate-700">{pages.length} Pages</span>
                   <div className="flex gap-1">
                      <button 
                        onClick={() => {
                            const newPage = {
                                id: `page-${Date.now()}`,
                                pageNumber: pages.length,
                                label: `Page ${pages.length + 1}`,
                                description: ''
                            };
                            handleSaveBook({
                                ...selectedBook,
                                contentConfig: {
                                    ...selectedBook.contentConfig,
                                    pages: [...pages, newPage]
                                }
                            });
                        }}
                        title="Ajouter une page" 
                        className="p-1 text-slate-400 hover:text-brand-coral hover:bg-red-50 rounded"
                      >
                         <Plus size={14} />
                      </button>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 p-2 space-y-2">
                {pages.map((page, index) => {
                    const isFrontCover = index === 0;
                    const isBackCover = index === pages.length - 1;
                    
                    // Don't show back cover as separate item
                    if (isBackCover) return null;

                    return (
                   <div 
                      key={page.id} 
                      onClick={() => {
                         setSelectedPageId(page.id);
                         if (isFrontCover) {
                             setViewMode('spread');
                         } else {
                             setViewMode('single'); 
                         }
                      }}
                      className={`group relative p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedPageId === page.id ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                   >
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${selectedPageId === page.id ? 'bg-brand-coral text-white' : 'bg-slate-100 text-slate-500'}`}>
                         {isFrontCover ? 'C' : index}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className={`font-bold text-sm truncate ${selectedPageId === page.id ? 'text-brand-coral' : 'text-slate-700'}`}>
                            {isFrontCover ? 'Couverture (À plat)' : `Page ${index}`}
                         </div>
                         <div className="text-[10px] text-gray-400 truncate">{page.description || "Sans description"}</div>
                      </div>
                      
                      {/* Delete Page Button */}
                      {!isFrontCover && !isBackCover && (
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newPages = pages.filter(p => p.id !== page.id).map((p, i) => ({...p, pageNumber: i})); // Re-index
                                handleSaveBook({
                                    ...selectedBook,
                                    contentConfig: {
                                        ...selectedBook.contentConfig,
                                        pages: newPages
                                    }
                                });
                                if (selectedPageId === page.id) setSelectedPageId(null);
                            }}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded shadow-sm transition-all"
                            title="Supprimer la page"
                          >
                            <Trash2 size={12} />
                          </button>
                      )}
                   </div>
                )})}
             </div>
          </div>

          {/* CENTER: CANVAS */}
          <div className="flex-1 bg-slate-200/50 overflow-hidden flex flex-col relative">
             {selectedPageId ? (
                <div className="w-full h-full flex flex-col relative">
                   {/* Context Bar */}
                   <div className="absolute top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur border-b border-gray-200/50 flex items-center justify-between px-6 z-10">
                      <div className="font-bold text-slate-700">
                         {(() => {
                            const index = pages.findIndex(p => p.id === selectedPageId);
                            if (index === 0) return 'Couverture intégrale (Dos + Face)';
                            if (index === pages.length - 1) return 'Couverture Arrière';
                            return `Page ${index}`;
                         })()}
                      </div>
                      
                      {/* View Mode Toggle - Only for interior pages */}
                      {(() => {
                        const index = pages.findIndex(p => p.id === selectedPageId);
                        const isCover = index === 0 || index === pages.length - 1;
                        
                        if (!isCover) {
                            return (
                                <div className="flex bg-slate-100 rounded-lg p-1 border border-gray-200/50">
                                    <button 
                                        onClick={() => setViewMode('single')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'single' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Page unique
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('spread')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'spread' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Double page
                                    </button>
                                </div>
                            );
                        }
                        return null;
                      })()}
                   </div>

                   {/* Canvas Area */}
                   <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
                      <div 
                         ref={canvasRef}
                         className="transition-all duration-300 flex gap-0 shadow-2xl bg-white"
                         style={{
                            aspectRatio: viewMode === 'spread' ? `${aspectRatio * 2}/1` : `${aspectRatio}/1`,
                            width: viewMode === 'spread' ? '90%' : 'auto',
                            height: viewMode === 'spread' ? 'auto' : '90%',
                            maxWidth: '100%',
                            maxHeight: '100%'
                         }}
                      >
                         {/* PAGE RENDERER */}
                         {(() => {
                            const currentPage = pages.find(p => p.id === selectedPageId);
                            if (!currentPage) return null;
                            
                            const pageIndex = pages.findIndex(p => p.id === selectedPageId);
                            const isFrontCover = pageIndex === 0;
                            const isBackCover = pageIndex === pages.length - 1;
                            const isCoverPage = isFrontCover || isBackCover;

                            let pagesToShow = [];

                            if (viewMode === 'spread' && isCoverPage) {
                                // Special Cover Spread: Back Cover (Left) + Front Cover (Right)
                                const backCover = pages[pages.length - 1];
                                const frontCover = pages[0];
                                if (backCover?.id === frontCover?.id) {
                                    pagesToShow = [frontCover].filter(Boolean);
                                } else {
                                    pagesToShow = [backCover, frontCover].filter(Boolean);
                                }
                            } else if (viewMode === 'spread') {
                                // Interior Spreads
                                const startIdx = pageIndex % 2 !== 0 ? pageIndex : pageIndex - 1;
                                const leftPage = pages[startIdx];
                                const rightPage = pages[startIdx + 1];
                                const isRightBackCover = (startIdx + 1) === (pages.length - 1);
                                
                                pagesToShow = [leftPage];
                                if (rightPage && !isRightBackCover) {
                                    pagesToShow.push(rightPage);
                                }
                                pagesToShow = pagesToShow.filter(Boolean);
                            } else {
                                pagesToShow = [currentPage].filter(Boolean);
                            }

                            return pagesToShow.map((page: any, idx) => {
                                const pIdx = pages.findIndex(p => p.id === page.id);
                                const isThisPageCover = pIdx === 0 || pIdx === pages.length - 1;
                                
                                const config = isThisPageCover 
                                   ? selectedBook.features?.printConfig?.cover 
                                   : selectedBook.features?.printConfig?.interior;
                                   
                                const safeMarginMm = config?.safeMarginMm;

                                return (
                                <div key={page.id} className="flex-1 bg-white relative overflow-hidden group border-r border-gray-100 last:border-0">
                                   
                                   {/* Label Overlay for Cover Spread */}
                                   {viewMode === 'spread' && isCoverPage && (
                                      <div className="absolute top-2 left-2 z-50 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                         {pIdx === 0 ? 'Face Avant' : 'Dos / Arrière'}
                                      </div>
                                   )}

                                   {/* Safe Margin Guide */}
                                   {safeMarginMm && (
                                      <div 
                                         className="absolute border border-green-400 border-dashed pointer-events-none z-50 opacity-50"
                                         style={{
                                            left: `${(safeMarginMm / (selectedBook.features?.dimensions?.width || 210)) * 100}%`,
                                            top: `${(safeMarginMm / (selectedBook.features?.dimensions?.height || 210)) * 100}%`,
                                            right: `${(safeMarginMm / (selectedBook.features?.dimensions?.width || 210)) * 100}%`,
                                            bottom: `${(safeMarginMm / (selectedBook.features?.dimensions?.height || 210)) * 100}%`,
                                         }}
                                         title={`Marge de sécurité: ${safeMarginMm}mm`}
                                      />
                                   )}

                                   {/* 1. BASE LAYER (Background Variant) */}
                                   <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                                      {(() => {
                                         const bgImage = selectedBook.contentConfig.images.find(
                                            img => img.pageIndex === page.pageNumber && 
                                                  (img.combinationKey === selectedVariant || img.combinationKey === 'default')
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

                                   {/* 2. IMAGE LAYERS */}
                                   {(selectedBook.contentConfig.imageElements || [])
                                      .filter(el => el.position.pageIndex === page.pageNumber)
                                      .map(el => (
                                         <div
                                            key={el.id}
                                            onMouseDown={(e) => {
                                               e.stopPropagation();
                                               e.preventDefault();
                                               setActiveLayerId(el.id);
                                               setIsDragging(true);
                                               setDragStartPos({ x: e.clientX, y: e.clientY });
                                               setDragStartElementPos({ x: el.position.x || 0, y: el.position.y || 0 });
                                            }}
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
                                            onMouseDown={(e) => {
                                               e.stopPropagation();
                                               e.preventDefault();
                                               setActiveLayerId(text.id);
                                               setIsDragging(true);
                                               setDragStartPos({ x: e.clientX, y: e.clientY });
                                               setDragStartElementPos({ x: text.position.x || 0, y: text.position.y || 0 });
                                            }}
                                            className={`absolute p-2 cursor-move border-2 transition-all overflow-hidden break-words whitespace-pre-wrap ${activeLayerId === text.id ? 'border-brand-coral bg-white/10 z-50' : 'border-transparent hover:border-blue-300 hover:bg-white/5 z-20'}`}
                                            style={{
                                               left: `${text.position.x}%`,
                                               top: `${text.position.y}%`,
                                               width: `${text.position.width || 30}%`,
                                               height: text.position.height ? `${text.position.height}%` : 'auto',
                                               transform: `rotate(${text.position.rotation || 0}deg)`,
                                               ...text.style
                                            }}
                                         >
                                            <div className={`font-medium w-full h-full ${text.type === 'variable' ? 'text-purple-600 bg-purple-50/80 px-1 rounded inline-block' : 'text-slate-800'}`}>
                                               {text.content}
                                            </div>
                                         </div>
                                      ))
                                   }
                                </div>
                                );
                            });
                         })()}
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

          {/* RIGHT SIDEBAR: PROPERTIES */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
             {/* Tabs */}
             <div className="flex border-b border-gray-200 bg-gray-50">
                 <button 
                     onClick={() => setActiveRightTab('layers')}
                     className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeRightTab === 'layers' ? 'bg-white text-brand-coral border-b-2 border-brand-coral' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     <Layers size={14} /> Calques
                 </button>
                 <button 
                     onClick={() => setActiveRightTab('properties')}
                     className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeRightTab === 'properties' ? 'bg-white text-brand-coral border-b-2 border-brand-coral' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     <Settings size={14} /> Propriétés
                 </button>
             </div>
             
             <div className="flex-1 p-0 flex flex-col overflow-hidden">
                {activeRightTab === 'layers' ? (
                   <>
                    <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Ordre d'affichage</span>
                       
                       <div className="flex gap-2">
                          <button 
                             onClick={() => {
                                const currentPage = pages.find(p => p.id === selectedPageId);
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
                                const currentPage = pages.find(p => p.id === selectedPageId);
                                if(!currentPage) return;

                                const newImg: ImageElement = {
                                   id: `img-${Date.now()}`,
                                   label: 'Nouvelle Image',
                                   type: 'static',
                                   position: { pageIndex: currentPage.pageNumber, x: 20, y: 20, width: 20, height: 20 }
                                };
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

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                       {(() => {
                          const currentPage = pages.find(p => p.id === selectedPageId);
                          if (!currentPage) return null;

                          const pageTexts = selectedBook.contentConfig.texts
                             .filter(t => t.position.pageIndex === currentPage.pageNumber)
                             .map(t => ({...t, _kind: 'text'}));
                             
                          const pageImages = (selectedBook.contentConfig.imageElements || [])
                             .filter(i => i.position.pageIndex === currentPage.pageNumber)
                             .map(i => ({...i, _kind: 'image'}));
                             
                          const allLayers = [...pageTexts, ...pageImages];
                          
                          if (allLayers.length === 0) {
                             return (
                                <div className="text-center py-8 text-gray-400 text-xs">
                                   Aucun calque sur cette page
                                </div>
                             );
                          }

                          return allLayers.map(layer => (
                             <div 
                                key={layer.id} 
                                onClick={() => setActiveLayerId(layer.id)}
                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer group ${activeLayerId === layer.id ? 'bg-brand-coral/10 border-brand-coral/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
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
                   </>
                ) : (
                   <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
                      {activeLayerId ? (
                         <div className="p-4 space-y-4">
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
                                        className="w-full text-xs border border-gray-300 rounded p-1 mt-1"
                                     />
                                  </div>

                                  {/* Text Specific */}
                                  {isText ? (
                                     <div className="space-y-4">
                                        <div>
                                           <label className="text-[10px] font-bold text-gray-500 uppercase">Contenu</label>
                                           <textarea 
                                              value={(layer as TextElement).content} 
                                              onChange={(e) => updateLayer({content: e.target.value})}
                                              rows={3}
                                              className="w-full text-xs border border-gray-300 rounded p-1 mt-1"
                                           />
                                        </div>
                                        <div>
                                           <label className="text-[10px] font-bold text-gray-500 uppercase">Style</label>
                                           <div className="grid grid-cols-2 gap-2 mt-1">
                                              <div>
                                                 <span className="text-[10px] text-gray-400">Taille</span>
                                                 <input type="number" value={(layer as TextElement).style?.fontSize || 12} onChange={(e) => updateLayer({style: {...(layer as TextElement).style, fontSize: parseInt(e.target.value)}})} className="w-full text-xs border rounded p-1" />
                                              </div>
                                              <div>
                                                 <span className="text-[10px] text-gray-400">Couleur</span>
                                                 <input type="color" value={(layer as TextElement).style?.color || '#000000'} onChange={(e) => updateLayer({style: {...(layer as TextElement).style, color: e.target.value}})} className="w-full h-6 border rounded p-0" />
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  ) : (
                                     (layer as any).type === 'variable' ? (
                                        <select 
                                           value={(layer as any).variableKey || ''}
                                           onChange={(e) => updateLayer({variableKey: e.target.value})}
                                           className="w-full text-xs border border-gray-300 rounded p-1 mt-1"
                                        >
                                           <option value="">Choisir variable...</option>
                                           {selectedBook.wizardConfig.tabs.flatMap(t => t.variants).map(v => (
                                              <option key={v.id} value={v.id}>{v.label}</option>
                                           ))}
                                        </select>
                                     ) : (
                                        <div className="text-xs text-gray-400 italic">Image statique</div>
                                     )
                                  )}
                                  
                                  {/* Position */}
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
                                           <span className="text-[10px] text-gray-400 mr-1">H</span>
                                           <input type="number" value={layer.position.height || 0} onChange={(e) => updateLayer({position: {...layer.position, height: parseFloat(e.target.value)}})} className="w-12 text-xs border rounded p-1" />
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
                      ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <Settings size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Sélectionnez un calque pour modifier ses propriétés</p>
                         </div>
                      )}
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};
