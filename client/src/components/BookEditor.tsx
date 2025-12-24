import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, Settings, Type, Image, Trash2, Plus, ArrowUp, ArrowDown, Move } from 'lucide-react';
import { BookProduct, TextElement, ImageElement } from '../types/admin';

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
       </div>

       {/* --- MAIN EDITOR AREA --- */}
       <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR: PAGES */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col z-10">
             <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Structure du livre</h3>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-medium text-slate-700">{pages.length} Pages</span>
                </div>
             </div>
             
             <div className="flex-1 p-2 space-y-2">
                {pages.map((page, index) => (
                   <div 
                      key={page.id} 
                      onClick={() => {
                         setSelectedPageId(page.id);
                         setViewMode('single'); 
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedPageId === page.id ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                   >
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${selectedPageId === page.id ? 'bg-brand-coral text-white' : 'bg-slate-100 text-slate-500'}`}>
                         {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className={`font-bold text-sm truncate ${selectedPageId === page.id ? 'text-brand-coral' : 'text-slate-700'}`}>
                            {index === 0 ? 'Couverture Avant' : index === pages.length - 1 ? 'Couverture Arrière' : `Page ${index + 1}`}
                         </div>
                      </div>
                   </div>
                ))}
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
                            if (index === 0) return 'Couverture Avant';
                            if (index === pages.length - 1) return 'Couverture Arrière';
                            return `Page ${index + 1}`;
                         })()}
                      </div>
                      
                      {/* View Mode Toggle */}
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
                         <div className="w-full h-full flex items-center justify-center text-slate-300">
                            Canvas Placeholder
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
             
             <div className="flex-1 p-4">
                {activeRightTab === 'layers' ? (
                   <div className="text-center text-gray-400 mt-10">Liste des calques</div>
                ) : (
                   <div className="text-center text-gray-400 mt-10">Propriétés</div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};
