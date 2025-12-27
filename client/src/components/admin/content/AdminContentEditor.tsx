import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { BookProduct, PageDefinition } from '../../../types/admin';
import { generateAvatarCombinations, slugify } from '../../../utils/adminUtils';
import AdminContentToolbar from './AdminContentToolbar';
import { Plus, Trash2, ImageIcon, Type, Layers, ChevronRight, Copy } from 'lucide-react';

interface AdminContentEditorProps {
  selectedBookId: string | null;
  selectedBook: BookProduct | null;
  handleSaveBook: (updatedBook: BookProduct) => void;
}

const AdminContentEditor: React.FC<AdminContentEditorProps> = ({ selectedBookId, selectedBook, handleSaveBook }) => {
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // Drag & Resize State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartElementPos, setDragStartElementPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startResizePos, setStartResizePos] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentCombinations = React.useMemo(() => {
    if (!selectedBook) return [];
    
    // Find character tab
    const charTab = selectedBook.wizardConfig.tabs.find(t => t.type === 'character');
    if (!charTab) return [];

    const combos = generateAvatarCombinations(charTab);
    return combos.map(c => c.key);
  }, [selectedBook]);

  useEffect(() => {
    if (currentCombinations.length > 0 && !selectedVariant) {
        setSelectedVariant(currentCombinations[0]);
    }
  }, [currentCombinations, selectedVariant]);

  // Global mouse events for drag/resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!selectedBook) return;

        if (isDragging && activeLayerId) {
            const dx = (e.clientX - dragStartPos.x) / zoom;
            const dy = (e.clientY - dragStartPos.y) / zoom;
            
            // Convert pixels to percentage based on PAGE dimensions (approx 800px width reference)
            // Ideally we should use the actual rendered page width in pixels
            // For now, using a rough conversion factor or assuming layout is relative to 100%
            // But dragging in % requires knowing the container size in pixels.
            
            // Hacky way: get container size
            const pageEl = document.querySelector(`[data-page-active="true"]`);
            if (pageEl) {
                const rect = pageEl.getBoundingClientRect();
                const dxPct = (dx / (rect.width / zoom)) * 100;
                const dyPct = (dy / (rect.height / zoom)) * 100;

                // Update element position
                // Check if it's text or image
                const textEl = selectedBook.contentConfig.texts.find(t => t.id === activeLayerId);
                if (textEl) {
                    const newTexts = selectedBook.contentConfig.texts.map(t => 
                        t.id === activeLayerId ? { ...t, position: { ...t.position, x: dragStartElementPos.x + dxPct, y: dragStartElementPos.y + dyPct } } : t
                    );
                    handleSaveBook({ ...selectedBook, contentConfig: { ...selectedBook.contentConfig, texts: newTexts } });
                } else {
                    const imgEl = selectedBook.contentConfig.imageElements?.find(t => t.id === activeLayerId);
                    if (imgEl) {
                        const newImgs = (selectedBook.contentConfig.imageElements || []).map(t => 
                            t.id === activeLayerId ? { ...t, position: { ...t.position, x: dragStartElementPos.x + dxPct, y: dragStartElementPos.y + dyPct } } : t
                        );
                        handleSaveBook({ ...selectedBook, contentConfig: { ...selectedBook.contentConfig, imageElements: newImgs } });
                    }
                }
            }
        }
        else if (isResizing && activeLayerId && resizeHandle) {
             // Resize logic (omitted for brevity in this first pass, but placeholders needed)
             // Similar logic: dx/dy -> pct -> update width/height
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    };

    if (isDragging || isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeLayerId, dragStartPos, dragStartElementPos, zoom, selectedBook]);


  if (!selectedBookId || !selectedBook) return null;

  const handleExportContent = () => {
    // Export ONLY content configuration (variants, pages, elements, dimensions)
    const exportData = {
        version: '1.0',
        type: 'content_config',
        timestamp: new Date().toISOString(),
        bookId: selectedBook.id,
        contentConfig: selectedBook.contentConfig,
        features: selectedBook.features
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(selectedBook.name || 'book')}_content_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Configuration Contenu exportée');
  };

  const handleImportContent = (file: File) => {
    const reader = new FileReader();
    reader.onload = (re: any) => {
        try {
            const imported = JSON.parse(re.target.result);
            if (!imported.contentConfig) {
                toast.error('Format invalide (contentConfig manquant)');
                return;
            }
            if (confirm('Remplacer toute la configuration du contenu (pages, textes, images) ?')) {
                handleSaveBook({
                    ...selectedBook,
                    contentConfig: imported.contentConfig,
                    features: imported.features || selectedBook.features
                });
                toast.success('Configuration Contenu importée');
            }
        } catch (err) {
            toast.error('Erreur de lecture du fichier');
        }
    };
    reader.readAsText(file);
  };

  const renderTransformHandles = (elementId: string, position: any) => {
      if (activeLayerId !== elementId) return null;
      
      const handleStyle = "absolute w-2 h-2 bg-white border border-brand-coral rounded-full z-50 pointer-events-auto";
      
      const onHandleDown = (e: React.MouseEvent, handle: string) => {
          e.stopPropagation();
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStartPos({ x: e.clientX, y: e.clientY });
          // Save start dimensions
          // setStartResizePos(...)
      };

      return (
          <>
            {/* Top Left */}
            <div className={handleStyle} style={{ top: '-4px', left: '-4px', cursor: 'nw-resize' }} onMouseDown={(e) => onHandleDown(e, 'nw')} />
            {/* Top Right */}
            <div className={handleStyle} style={{ top: '-4px', right: '-4px', cursor: 'ne-resize' }} onMouseDown={(e) => onHandleDown(e, 'ne')} />
            {/* Bottom Left */}
            <div className={handleStyle} style={{ bottom: '-4px', left: '-4px', cursor: 'sw-resize' }} onMouseDown={(e) => onHandleDown(e, 'sw')} />
            {/* Bottom Right */}
            <div className={handleStyle} style={{ bottom: '-4px', right: '-4px', cursor: 'se-resize' }} onMouseDown={(e) => onHandleDown(e, 'se')} />
          </>
      );
  };

  // Canvas calculations
  const bookDimensions = selectedBook.features?.dimensions || { width: 210, height: 210 };
  const spineWidth = selectedBook.features?.printConfig?.cover?.spineWidthMm || 0;
  
  // Calculate aspect ratio for the viewport
  // If spread, width = 2 * width + spine
  const totalSpreadWidth = viewMode === 'spread' 
      ? (bookDimensions.width * 2) + spineWidth
      : bookDimensions.width;
  const totalSpreadHeight = bookDimensions.height;

  const aspectRatio = totalSpreadWidth / totalSpreadHeight;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
       <AdminContentToolbar 
          selectedBook={selectedBook}
          handleSaveBook={handleSaveBook}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          combinations={currentCombinations}
          zoom={zoom}
          setZoom={setZoom}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleExportContent={handleExportContent}
          handleImportContent={handleImportContent}
       />

       {/* Main Workspace */}
       <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Sidebar: Pages & Layers */}
          <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col shrink-0">
             <div className="p-4 border-b border-gray-100 font-bold text-slate-700 flex justify-between items-center">
                <span>Pages ({selectedBook.contentConfig.pages.length})</span>
                <button 
                  onClick={() => {
                     const newPages = [...selectedBook.contentConfig.pages];
                     const nextNum = newPages.length + 1;
                     newPages.push({
                        id: Date.now().toString(),
                        pageNumber: nextNum,
                        label: `Page ${nextNum}`
                     });
                     handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, pages: newPages}});
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-indigo-600"
                >
                   <Plus size={16} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto">
                {selectedBook.contentConfig.pages.map((page, idx) => (
                   <div 
                      key={page.id}
                      onClick={() => setSelectedPageId(page.id)}
                      className={`p-3 border-b border-gray-50 hover:bg-slate-50 cursor-pointer flex items-center gap-3 ${selectedPageId === page.id ? 'bg-indigo-50 border-indigo-100' : ''}`}
                   >
                      <div className="w-8 h-10 bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[10px] text-gray-400">
                         {page.pageNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-sm font-medium text-slate-700 truncate">{page.label}</div>
                         <div className="text-[10px] text-slate-400">{page.description || 'Sans description'}</div>
                      </div>
                   </div>
                ))}
             </div>
             
             {/* Active Page Layers */}
             {selectedPageId && (
                <div className="h-1/3 border-t border-gray-200 flex flex-col">
                    <div className="p-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>Calques (Page {selectedBook.contentConfig.pages.find(p => p.id === selectedPageId)?.pageNumber})</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => {
                                    const page = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                    if (page) {
                                        const newTexts = [...selectedBook.contentConfig.texts];
                                        newTexts.push({
                                            id: Date.now().toString(),
                                            label: 'Texte',
                                            type: 'fixed',
                                            content: 'Nouveau texte',
                                            position: { pageIndex: page.pageNumber, zoneId: 'body', x: 10, y: 10, width: 30, height: 10 }
                                        });
                                        handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                    }
                                }}
                                title="Ajouter Texte"
                                className="p-1 hover:bg-white rounded"
                            >
                                <Type size={12} />
                            </button>
                            <button 
                                onClick={() => {
                                    const page = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                    if (page) {
                                        const newImgs = [...(selectedBook.contentConfig.imageElements || [])];
                                        newImgs.push({
                                            id: Date.now().toString(),
                                            label: 'Image',
                                            type: 'static',
                                            position: { pageIndex: page.pageNumber, x: 20, y: 20, width: 20, height: 20 }
                                        });
                                        handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
                                    }
                                }}
                                title="Ajouter Image"
                                className="p-1 hover:bg-white rounded"
                            >
                                <ImageIcon size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* List texts and images for this page */}
                        {(() => {
                           const page = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                           if (!page) return null;
                           
                           const texts = selectedBook.contentConfig.texts.filter(t => t.position.pageIndex === page.pageNumber);
                           const imgs = (selectedBook.contentConfig.imageElements || []).filter(i => i.position.pageIndex === page.pageNumber);
                           
                           return [...texts, ...imgs].map(layer => (
                               <div 
                                   key={layer.id}
                                   onClick={() => setActiveLayerId(layer.id)}
                                   className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer ${activeLayerId === layer.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-50'}`}
                               >
                                   {'content' in layer ? <Type size={12} /> : <ImageIcon size={12} />}
                                   <span className="truncate flex-1">{layer.label}</span>
                                   <button 
                                       onClick={(e) => {
                                           e.stopPropagation();
                                           if (confirm('Supprimer ce calque ?')) {
                                               if ('content' in layer) {
                                                   const newTexts = selectedBook.contentConfig.texts.filter(t => t.id !== layer.id);
                                                   handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
                                               } else {
                                                   const newImgs = (selectedBook.contentConfig.imageElements || []).filter(t => t.id !== layer.id);
                                                   handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
                                               }
                                           }
                                       }}
                                       className="text-gray-400 hover:text-red-500"
                                   >
                                       <Trash2 size={10} />
                                   </button>
                               </div>
                           ));
                        })()}
                    </div>
                </div>
             )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden relative flex flex-col">
             <div className="absolute inset-0 overflow-auto flex items-center justify-center p-12" ref={containerRef}>
                <div 
                   className="bg-white shadow-xl transition-transform origin-center relative"
                   style={{ 
                      width: `${totalSpreadWidth}mm`, // Approximate scale for CSS
                      height: `${totalSpreadHeight}mm`,
                      transform: `scale(${zoom})`,
                      // In real app, we might need pixels or specific mapping
                      // For now relying on mm units in CSS (which browser handles somewhat)
                   }}
                >
                    {/* Render Pages in View */}
                    {(() => {
                        // Find which pages to show
                        // If single view, show selectedPageId
                        // If spread view, show current spread (2 pages)
                        
                        let pagesToShow: PageDefinition[] = [];
                        
                        if (viewMode === 'single') {
                            const p = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                            if (p) pagesToShow = [p];
                            else if (selectedBook.contentConfig.pages.length > 0) pagesToShow = [selectedBook.contentConfig.pages[0]];
                        } else {
                            // Spread view logic (simplified)
                            // Ideally calculate spreads based on page number
                             const p = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                             if (p) {
                                 // Simple logic: if page 1 (cover front), show alone? Or show full cover spread?
                                 // Let's just show the selected page for now to be safe in this mockup
                                 pagesToShow = [p];
                             }
                        }

                        return pagesToShow.map(page => (
                            <div 
                                key={page.id}
                                data-page-active={selectedPageId === page.id}
                                className="w-full h-full relative border border-gray-200 overflow-hidden"
                                onClick={() => setSelectedPageId(page.id)}
                            >
                                {/* Background Image */}
                                {(() => {
                                    const bgImage = selectedBook.contentConfig.images.find(
                                        img => img.pageIndex === page.pageNumber && 
                                            img.combinationKey === selectedVariant
                                    );
                                    if (bgImage?.imageUrl) {
                                        return <img src={bgImage.imageUrl} className="w-full h-full object-cover absolute inset-0 z-0" alt="Background" />;
                                    }
                                    return <div className="absolute inset-0 bg-white z-0" />;
                                })()}

                                {/* Image Elements */}
                                {(selectedBook.contentConfig.imageElements || [])
                                    .filter(el => el.position.pageIndex === page.pageNumber && (!el.combinationKey || el.combinationKey === selectedVariant))
                                    .map(el => (
                                        <div
                                            key={el.id}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
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
                                            {renderTransformHandles(el.id, el.position)}
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

                                {/* Text Elements */}
                                {selectedBook.contentConfig.texts
                                    .filter(t => t.position.pageIndex === page.pageNumber && (!t.combinationKey || t.combinationKey === selectedVariant))
                                    .map(text => (
                                        <div
                                            key={text.id}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setActiveLayerId(text.id);
                                                setIsDragging(true);
                                                setDragStartPos({ x: e.clientX, y: e.clientY });
                                                setDragStartElementPos({ x: text.position.x || 0, y: text.position.y || 0 });
                                            }}
                                            className={`absolute p-2 cursor-move border-2 transition-all overflow-hidden break-words whitespace-pre-wrap ${activeLayerId === text.id ? 'border-brand-coral bg-white/10 z-50' : 'border-transparent hover:border-blue-300 hover:bg-white/5 z-20'}`}
                                            style={{
                                                left: `${text.position.x}%`,
                                                top: `${text.position.y}%`,
                                                width: `${text.position.width}%`,
                                                height: text.position.height ? `${text.position.height}%` : 'auto',
                                                transform: `rotate(${text.position.rotation || 0}deg)`,
                                                ...text.style
                                            }}
                                        >
                                            {renderTransformHandles(text.id, text.position)}
                                            {activeLayerId === text.id ? (
                                                <textarea
                                                    value={text.content}
                                                    onChange={(e) => {
                                                        const newTexts = selectedBook.contentConfig.texts.map(t => 
                                                            t.id === text.id ? { ...t, content: e.target.value } : t
                                                        );
                                                        handleSaveBook({ ...selectedBook, contentConfig: { ...selectedBook.contentConfig, texts: newTexts } });
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className="w-full h-full bg-transparent resize-none outline-none p-0 m-0 border-none focus:ring-0 overflow-hidden font-inherit"
                                                    style={{ 
                                                        ...text.style,
                                                        fontSize: text.style?.fontSize,
                                                        fontFamily: text.style?.fontFamily,
                                                        fontWeight: text.style?.fontWeight,
                                                        fontStyle: text.style?.fontStyle,
                                                        textDecoration: text.style?.textDecoration,
                                                        textAlign: text.style?.textAlign as any,
                                                        color: text.style?.color
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className={`font-medium w-full h-full ${text.type === 'variable' ? 'text-purple-600 bg-purple-50/80 px-1 rounded inline-block' : 'text-slate-800'}`}>
                                                    {(() => {
                                                        const content = text.content || '';
                                                        let processed = content.replace(/\{childName\}/g, '[Prénom]');
                                                        return processed;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }

                                {showGrid && (
                                    <div className="absolute inset-0 pointer-events-none z-40 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                                )}
                            </div>
                        ));
                    })()}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default AdminContentEditor;
