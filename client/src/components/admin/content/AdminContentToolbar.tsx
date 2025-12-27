import React, { useRef } from 'react';
import { Layout, Printer, Download, Upload, Trash2, Save, ZoomIn, ZoomOut, Maximize, Grid } from 'lucide-react';
import { BookProduct } from '../../../types/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';

interface AdminContentToolbarProps {
  selectedBook: BookProduct;
  handleSaveBook: (book: BookProduct) => void;
  selectedVariant: string;
  setSelectedVariant: (v: string) => void;
  combinations: string[];
  zoom: number;
  setZoom: (z: number) => void;
  showGrid: boolean;
  setShowGrid: (s: boolean) => void;
  viewMode: 'single' | 'spread';
  setViewMode: (m: 'single' | 'spread') => void;
  handleExportContent: () => void;
  handleImportContent: (file: File) => void;
}

const AdminContentToolbar: React.FC<AdminContentToolbarProps> = ({
  selectedBook,
  handleSaveBook,
  selectedVariant,
  setSelectedVariant,
  combinations,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  viewMode,
  setViewMode,
  handleExportContent,
  handleImportContent
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center shrink-0">
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600 font-bold">
             <Layout size={18} />
             <span>Vue Storyboard</span>
          </div>

          {/* Variant Selector */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-4">
             <label className="text-[10px] font-bold text-gray-400 uppercase">Variante</label>
             <select 
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="h-7 text-xs border border-gray-200 rounded px-2 font-medium bg-white focus:ring-brand-coral focus:border-brand-coral w-48 max-w-[200px]"
                title={selectedVariant}
             >
                {combinations.map(c => (
                   <option key={c} value={c}>{c}</option>
                ))}
             </select>
          </div>

           {/* Print Settings Dialog */}
           <Dialog>
              <DialogTrigger asChild>
                  <button className="ml-4 p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Paramètres d'impression">
                      <Printer size={18} />
                  </button>
              </DialogTrigger>
              <DialogContent className="bg-white sm:max-w-[600px]">
                  <DialogHeader>
                      <DialogTitle className="text-slate-900 text-lg">Configuration Impression</DialogTitle>
                      <DialogDescription className="text-slate-500">
                          Définissez les marges et fonds perdus pour l'export PDF.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                      {/* Cover Settings */}
                      <div className="space-y-4 border-b border-gray-100 pb-4">
                          <h4 className="font-bold text-sm text-slate-700">Couverture</h4>
                          
                          {/* Cover Dimensions */}
                          <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <h5 className="text-xs font-bold text-slate-600 uppercase mb-2">Dimensions (à plat)</h5>
                              
                              <div className="grid grid-cols-2 gap-6">
                                  {/* Pages (Front/Back) */}
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Pages (Avant/Arrière)</label>
                                      <div className="flex items-center gap-2">
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] text-gray-400">Largeur</label>
                                              <input 
                                                  type="number" 
                                                  step="0.01"
                                                  value={selectedBook.features?.dimensions?.width || 210}
                                                  onChange={(e) => {
                                                      handleSaveBook({
                                                          ...selectedBook,
                                                          features: {
                                                              ...selectedBook.features,
                                                              dimensions: {
                                                                  ...selectedBook.features?.dimensions,
                                                                  width: parseFloat(e.target.value) || 210
                                                              }
                                                          } as any
                                                      });
                                                  }}
                                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                              />
                                          </div>
                                          <span className="pt-4 text-gray-300">x</span>
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] text-gray-400">Hauteur</label>
                                              <input 
                                                  type="number" 
                                                  step="0.01"
                                                  value={selectedBook.features?.dimensions?.height || 210}
                                                  onChange={(e) => {
                                                      handleSaveBook({
                                                          ...selectedBook,
                                                          features: {
                                                              ...selectedBook.features,
                                                              dimensions: {
                                                                  ...selectedBook.features?.dimensions,
                                                                  height: parseFloat(e.target.value) || 210
                                                              }
                                                          } as any
                                                      });
                                                  }}
                                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                              />
                                          </div>
                                      </div>
                                  </div>

                                  {/* Spine */}
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Tranche</label>
                                      <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400">Largeur</label>
                                          <input 
                                              type="number" 
                                              step="0.01"
                                              value={selectedBook.features?.printConfig?.cover?.spineWidthMm || 5}
                                              onChange={(e) => {
                                                  handleSaveBook({
                                                      ...selectedBook,
                                                      features: {
                                                          ...selectedBook.features,
                                                          printConfig: {
                                                              ...selectedBook.features?.printConfig,
                                                              cover: { ...selectedBook.features?.printConfig?.cover, spineWidthMm: parseFloat(e.target.value) || 0 }
                                                          } as any
                                                      }
                                                  });
                                              }}
                                              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-900">Fonds perdus (mm)</label>
                                  <input 
                                      type="number" 
                                      step="0.01"
                                      value={selectedBook.features?.printConfig?.cover?.bleedMm || 3.175}
                                      onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          handleSaveBook({
                                              ...selectedBook,
                                              features: {
                                                  ...selectedBook.features,
                                                  printConfig: {
                                                      ...selectedBook.features?.printConfig,
                                                      cover: { ...selectedBook.features?.printConfig?.cover, bleedMm: val }
                                                  } as any
                                              }
                                          });
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-900">Marge de sécurité (mm)</label>
                                  <input 
                                      type="number" 
                                      step="0.01"
                                      value={selectedBook.features?.printConfig?.cover?.safeMarginMm || 10}
                                      onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          handleSaveBook({
                                              ...selectedBook,
                                              features: {
                                                  ...selectedBook.features,
                                                  printConfig: {
                                                      ...selectedBook.features?.printConfig,
                                                      cover: { ...selectedBook.features?.printConfig?.cover, safeMarginMm: val }
                                                  } as any
                                              }
                                          });
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Interior Settings */}
                      <div className="space-y-4">
                          <h4 className="font-bold text-sm text-slate-700">Intérieur</h4>
                          
                          {/* Interior Dimensions */}
                          <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <h5 className="text-xs font-bold text-slate-600 uppercase mb-2">Dimensions Page</h5>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] text-gray-500">Largeur (mm)</label>
                                      <input 
                                          type="number" 
                                          value={selectedBook.features?.dimensions?.width || 210}
                                          onChange={(e) => {
                                              handleSaveBook({
                                                  ...selectedBook,
                                                  features: {
                                                      ...selectedBook.features,
                                                      dimensions: {
                                                          ...selectedBook.features?.dimensions,
                                                          width: parseInt(e.target.value) || 210
                                                      }
                                                  } as any
                                              });
                                          }}
                                          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] text-gray-500">Hauteur (mm)</label>
                                      <input 
                                          type="number" 
                                          value={selectedBook.features?.dimensions?.height || 210}
                                          onChange={(e) => {
                                              handleSaveBook({
                                                  ...selectedBook,
                                                  features: {
                                                      ...selectedBook.features,
                                                      dimensions: {
                                                          ...selectedBook.features?.dimensions,
                                                          height: parseInt(e.target.value) || 210
                                                      }
                                                  } as any
                                              });
                                          }}
                                          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-900">Fonds perdus (mm)</label>
                                  <input 
                                      type="number" 
                                      value={selectedBook.features?.printConfig?.interior?.bleedMm || 3}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          handleSaveBook({
                                              ...selectedBook,
                                              features: {
                                                  ...selectedBook.features,
                                                  printConfig: {
                                                      ...selectedBook.features?.printConfig,
                                                      interior: { ...selectedBook.features?.printConfig?.interior, bleedMm: val }
                                                  } as any
                                              }
                                          });
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-semibold text-slate-900">Marge de sécurité (mm)</label>
                                  <input 
                                      type="number" 
                                      value={selectedBook.features?.printConfig?.interior?.safeMarginMm || 10}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          handleSaveBook({
                                              ...selectedBook,
                                              features: {
                                                  ...selectedBook.features,
                                                  printConfig: {
                                                      ...selectedBook.features?.printConfig,
                                                      interior: { ...selectedBook.features?.printConfig?.interior, safeMarginMm: val }
                                                  } as any
                                              }
                                          });
                                      }}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-bold transition-colors">Enregistrer & Fermer</button>
                      </DialogClose>
                  </DialogFooter>
              </DialogContent>
           </Dialog>

          {/* Export/Import Actions */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-4">
              <button 
                  onClick={handleExportContent}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 shrink-0" 
                  title="Exporter la configuration (JSON)"
              >
                  <Download size={18} />
              </button>
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 shrink-0" 
                  title="Importer la configuration (JSON)"
              >
                  <Upload size={18} />
              </button>
              <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".json"
                 onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) handleImportContent(file);
                 }}
              />
              <button
                  onClick={() => {
                      if (confirm('ATTENTION: Voulez-vous réinitialiser TOUTE la configuration du livre ?\nCela effacera toutes les pages, textes, images et variantes.\nCette action est irréversible.')) {
                          handleSaveBook({
                              ...selectedBook,
                              contentConfig: { pages: [], texts: [], images: [], imageElements: [] }
                          });
                          toast.success('Configuration réinitialisée');
                      }
                  }}
                  className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-500 shrink-0 ml-2"
                  title="Réinitialiser"
              >
                  <Trash2 size={18} />
              </button>
          </div>
       </div>

       {/* Editor Controls */}
       <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode(viewMode === 'single' ? 'spread' : 'single')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200 transition-colors"
          >
             <Maximize size={14} />
             {viewMode === 'single' ? 'Vue Double' : 'Vue Simple'}
          </button>
          
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
             <Grid size={14} />
             Guides
          </button>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
             <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} className="p-1 hover:bg-white rounded text-slate-500">
                <ZoomOut size={14} />
             </button>
             <span className="text-xs font-mono w-12 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1 hover:bg-white rounded text-slate-500">
                <ZoomIn size={14} />
             </button>
          </div>
       </div>
    </div>
  );
};

export default AdminContentToolbar;
