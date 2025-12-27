import React, { useState } from 'react';
import { toast } from 'sonner';
import { Home, BarChart3, Globe, Book, User, Users, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout, Eye, Copy, Filter, Image as ImageIcon, Box, X, ArrowUp, ArrowDown, ChevronDown, Menu, ShoppingBag, PenTool, Truck, Package, Printer, Download, Barcode, Search, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct, WizardTab, TextElement, PageDefinition, ImageElement, Printer as PrinterType } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { useEcommerce } from '../context/EcommerceContext';
import { MenuItem, MenuColumn } from '../types/menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';

import { generateCoverPDF, generateInteriorPDF } from '../utils/pdfGenerator';

const slugify = (text: string) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/__+/g, '_');
};

// Load Google Fonts
const GOOGLE_FONTS_API_KEY = ''; // We'll use the package instead if possible or a direct list
// Import font list from the package we just installed if available, or fallback to a larger list
import googleFonts from 'google-fonts-complete';

// Simple Ruler Component
const Ruler = ({ sizeMm, orientation }: { sizeMm: number, orientation: 'horizontal' | 'vertical' }) => {
    const ticks = [];
    const step = 10; // 10mm steps
    // Optimize for large sizes
    for (let i = 0; i <= sizeMm; i += step) {
        const pct = (i / sizeMm) * 100;
        const isMajor = i % 50 === 0;
        ticks.push(
            <div 
                key={i} 
                className="absolute bg-gray-400"
                style={{
                    [orientation === 'horizontal' ? 'left' : 'top']: `${pct}%`,
                    [orientation === 'horizontal' ? 'height' : 'width']: isMajor ? '100%' : '40%',
                    [orientation === 'horizontal' ? 'bottom' : 'right']: 0,
                    [orientation === 'horizontal' ? 'width' : 'height']: '1px',
                }}
            >
                {isMajor && (
                    <span className={`absolute text-[8px] text-gray-500 font-sans ${orientation === 'horizontal' ? 'top-0 left-1' : 'right-1 top-0 -translate-y-1/2 rotate-[-90deg] origin-right'}`}>
                        {i}
                    </span>
                )}
            </div>
        );
    }
    return <div className="w-full h-full relative overflow-hidden">{ticks}</div>;
};

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { books, addBook, updateBook, deleteBook } = useBooks();
  const { mainMenu, setMainMenu, updateMenuItem, addMenuItem, deleteMenuItem } = useMenus();
  const { customers, orders, updateOrderStatus, updateOrderTracking, getOrdersByCustomer } = useEcommerce();
  
  const [activeTab, setActiveTab] = useState<'home' | 'books' | 'wizard' | 'avatars' | 'content' | 'menus' | 'customers' | 'orders' | 'printers' | 'settings' | 'analytics'>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFulfillment, setShowFulfillment] = useState(false);

  // Font Search State
  const [fontSearch, setFontSearch] = useState('');
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);

  // Initialize fonts
  React.useEffect(() => {
    // Convert object keys to array
    const fontList = Object.keys(googleFonts);
    setAvailableFonts(fontList);
    
    // Load some popular fonts by default into the document head so they preview correctly
    const popularFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'];
    popularFonts.forEach(font => {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    });
  }, []);

  // Effect to dynamically load selected font
  const loadFont = (fontFamily: string) => {
    if (!fontFamily) return;
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  };


  // Printers State
  const [printers, setPrinters] = useState<PrinterType[]>(() => {
    try {
        const saved = localStorage.getItem('admin_printers');
        return saved ? JSON.parse(saved) : [
            { id: 'PRT-001', name: 'PrintHouse Pro', countryCodes: ['FR', 'BE', 'LU'], contactEmail: 'print@printhouse.com', productionDelayDays: 3 },
            { id: 'PRT-002', name: 'SwissPrint', countryCodes: ['CH'], contactEmail: 'orders@swissprint.ch', productionDelayDays: 2 },
            { id: 'PRT-003', name: 'Maple Press', countryCodes: ['CA'], contactEmail: 'hello@maplepress.ca', productionDelayDays: 5 }
        ];
    } catch (e) {
        console.error('Error loading printers', e);
        return [
            { id: 'PRT-001', name: 'PrintHouse Pro', countryCodes: ['FR', 'BE', 'LU'], contactEmail: 'print@printhouse.com', productionDelayDays: 3 },
            { id: 'PRT-002', name: 'SwissPrint', countryCodes: ['CH'], contactEmail: 'orders@swissprint.ch', productionDelayDays: 2 },
            { id: 'PRT-003', name: 'Maple Press', countryCodes: ['CA'], contactEmail: 'hello@maplepress.ca', productionDelayDays: 5 }
        ];
    }
  });

  // Persist printers
  React.useEffect(() => {
    try {
        localStorage.setItem('admin_printers', JSON.stringify(printers));
    } catch (e) {
        console.error('Error saving printers', e);
    }
  }, [printers]);

  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  
  // Content Editor State
  const [selectedVariant, setSelectedVariant] = useState<string>('default'); // Used for previewing specific combinations
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedAvatarTabId, setSelectedAvatarTabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());

  const contextBook = books.find(b => b.id === selectedBookId);
  const [draftBook, setDraftBook] = useState<BookProduct | null>(null);
  const selectedBook = draftBook || contextBook;
  const [activeRightTab, setActiveRightTab] = useState<'layers' | 'properties'>('layers');

  // Drag & Drop State
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragStartElementPos, setDragStartElementPos] = useState<{x: number, y: number} | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'rotate'
  const [initialDims, setInitialDims] = useState<{w: number, h: number, r: number} | null>(null);

  // Grid & Precision State
  const [showGrid, setShowGrid] = useState(false);
  const [gridSizeMm, setGridSizeMm] = useState(10); // 10mm grid default
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [avatarFilters, setAvatarFilters] = useState<Record<string, string[]>>({}); // Top-level state for avatar filters, string[] for multiselect

  // Keyboard Nudge Logic
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!activeLayerId || !selectedBook) return;

        // Only handle arrow keys
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        
        e.preventDefault();

        const isShift = e.shiftKey; // Shift = 10mm, Normal = 1mm
        const stepMm = isShift ? 10 : 1;
        
        const dims = selectedBook.features?.dimensions || { width: 210, height: 210 };
        const stepX = (stepMm / dims.width) * 100;
        const stepY = (stepMm / dims.height) * 100;

        let dx = 0;
        let dy = 0;

        switch(e.key) {
            case 'ArrowLeft': dx = -stepX; break;
            case 'ArrowRight': dx = stepX; break;
            case 'ArrowUp': dy = -stepY; break;
            case 'ArrowDown': dy = stepY; break;
        }

        // Apply update
        const textLayer = selectedBook.contentConfig.texts.find(t => t.id === activeLayerId);
        const imgLayer = (selectedBook.contentConfig.imageElements || []).find(i => i.id === activeLayerId);

        if (textLayer) {
            const newTexts = selectedBook.contentConfig.texts.map(t => 
                t.id === activeLayerId ? {
                    ...t, 
                    position: {
                        ...t.position, 
                        x: (t.position.x || 0) + dx,
                        y: (t.position.y || 0) + dy
                    }
                } : t
            );
            handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
        } else if (imgLayer) {
            const newImgs = (selectedBook.contentConfig.imageElements || []).map(i => 
                i.id === activeLayerId ? {
                    ...i, 
                    position: {
                        ...i.position, 
                        x: (i.position.x || 0) + dx,
                        y: (i.position.y || 0) + dy
                    }
                } : i
            );
            handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerId, selectedBook]);


  // SETTINGS STATE
  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('admin_settings');
        return saved ? JSON.parse(saved) : {
            general: {
                storeName: 'NuageBook',
                supportEmail: 'contact@nuagebook.com',
                currency: 'EUR',
                language: 'fr'
            },
            payment: {
                stripeEnabled: true,
                stripeKey: 'pk_test_sample_key_12345',
                paypalEnabled: false
            },
            shipping: {
                freeShippingThreshold: 50,
                standardRate: 4.90,
                expressRate: 9.90
            },
            notifications: {
                orderConfirmation: true,
                shippingUpdate: true
            }
        };
    } catch (e) {
        return {
            general: {
                storeName: 'NuageBook',
                supportEmail: 'contact@nuagebook.com',
                currency: 'EUR',
                language: 'fr'
            },
            payment: {
                stripeEnabled: true,
                stripeKey: 'pk_test_sample_key_12345',
                paypalEnabled: false
            },
            shipping: {
                freeShippingThreshold: 50,
                standardRate: 4.90,
                expressRate: 9.90
            },
            notifications: {
                orderConfirmation: true,
                shippingUpdate: true
            }
        };
    }
  });

  const handleSaveSettings = (section: string) => {
      localStorage.setItem('admin_settings', JSON.stringify(settings));
      toast.success(`Réglages "${section}" sauvegardés avec succès`);
  };

  // Sync draft when switching books or initially loading
  React.useEffect(() => {
    if (contextBook && (!draftBook || draftBook.id !== contextBook.id)) {
      setDraftBook(JSON.parse(JSON.stringify(contextBook)));
    } else if (!contextBook) {
      setDraftBook(null);
    }
  }, [contextBook?.id]); // Only sync on ID change, not every update

  // Drag Logic Effect
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !activeLayerId || !dragStartPos || !dragStartElementPos || !canvasRef.current || !selectedBook) return;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;
        
        // CORRECTION FOR SPREAD MODE
        let scaleX = 1;
        if (viewMode === 'spread') {
             const dims = selectedBook.features?.dimensions || { width: 210, height: 210 };
             const pages = selectedBook.contentConfig.pages;
             const idx = pages.findIndex(p => p.id === selectedPageId);
             const isCover = idx === 0 || idx === pages.length - 1;
             
             if (isCover) {
                 const spine = selectedBook.features?.printConfig?.cover?.spineWidthMm || 0;
                 const totalW = (dims.width * 2) + spine;
                 scaleX = totalW / dims.width;
             } else {
                 scaleX = 2; 
             }
        }

        // Convert delta to percentage (Adjusted for Scale)
        const deltaXPercent = (deltaX / canvasRect.width) * 100 * scaleX;
        const deltaYPercent = (deltaY / canvasRect.height) * 100;
        
        const textLayer = selectedBook.contentConfig.texts.find(t => t.id === activeLayerId);
        const imgLayer = (selectedBook.contentConfig.imageElements || []).find(i => i.id === activeLayerId);
        
        if (resizeHandle) {
            // RESIZING / ROTATING LOGIC
            let newX = dragStartElementPos.x;
            let newY = dragStartElementPos.y;
            let newW = initialDims?.w || 20;
            let newH = initialDims?.h || 20;
            let newR = initialDims?.r || 0;

            if (resizeHandle === 'rotate') {
                 // Rotation logic
                 // Center of element in screen coords
                 const elementCenterX = canvasRect.left + (dragStartElementPos.x / (100 * scaleX)) * canvasRect.width + ((initialDims?.w || 0) / (100 * scaleX) * canvasRect.width) / 2;
                 const elementCenterY = canvasRect.top + (dragStartElementPos.y / 100) * canvasRect.height + ((initialDims?.h || 0) / 100 * canvasRect.height) / 2;
                 
                 const angle = Math.atan2(e.clientY - elementCenterY, e.clientX - elementCenterX);
                 const angleDeg = angle * (180 / Math.PI);
                 // Snap to 45 deg
                 newR = e.shiftKey ? Math.round((angleDeg + 90) / 45) * 45 : angleDeg + 90;
            } else {
                // Resize logic (Simplified - assumes no rotation for resize math for now)
                // TODO: Handle rotated resize properly
                
                if (resizeHandle.includes('e')) {
                    newW = (initialDims?.w || 0) + deltaXPercent;
                }
                if (resizeHandle.includes('w')) {
                    newW = (initialDims?.w || 0) - deltaXPercent;
                    newX = dragStartElementPos.x + deltaXPercent;
                }
                if (resizeHandle.includes('s')) {
                    newH = (initialDims?.h || 0) + deltaYPercent;
                }
                if (resizeHandle.includes('n')) {
                    newH = (initialDims?.h || 0) - deltaYPercent;
                    newY = dragStartElementPos.y + deltaYPercent;
                }
            }

            if (textLayer) {
                 const newTexts = selectedBook.contentConfig.texts.map(t => t.id === activeLayerId ? {
                     ...t, 
                     position: {
                         ...t.position, 
                         x: newX, y: newY, width: newW, height: newH, rotation: newR
                     }
                 } : t);
                 handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
            } else if (imgLayer) {
                 const newImgs = (selectedBook.contentConfig.imageElements || []).map(i => i.id === activeLayerId ? {
                     ...i, 
                     position: {
                         ...i.position, 
                         x: newX, y: newY, width: newW, height: newH, rotation: newR
                     }
                 } : i);
                 handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
            }

        } else {
            // MOVING LOGIC
            const newX = dragStartElementPos.x + deltaXPercent;
            const newY = dragStartElementPos.y + deltaYPercent;
            
            if (textLayer) {
                 const newTexts = selectedBook.contentConfig.texts.map(t => t.id === activeLayerId ? {...t, position: {...t.position, x: newX, y: newY}} : t);
                 handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, texts: newTexts}});
            } else if (imgLayer) {
                 const newImgs = (selectedBook.contentConfig.imageElements || []).map(i => i.id === activeLayerId ? {...i, position: {...i.position, x: newX, y: newY}} : i);
                 handleSaveBook({...selectedBook, contentConfig: {...selectedBook.contentConfig, imageElements: newImgs}});
            }
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
        setResizeHandle(null);
        setInitialDims(null);
        setDragStartPos(null);
        setDragStartElementPos(null);
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeLayerId, dragStartPos, dragStartElementPos, selectedBook, viewMode, selectedPageId, resizeHandle, initialDims]);
  const hasUnsavedChanges = JSON.stringify(draftBook) !== JSON.stringify(contextBook);

  // Sync active layer with selected variant visibility
  React.useEffect(() => {
     if (!activeLayerId || !selectedBook) return;

     const textLayer = selectedBook.contentConfig.texts.find(t => t.id === activeLayerId);
     const imgLayer = (selectedBook.contentConfig.imageElements || []).find(i => i.id === activeLayerId);
     const layer = textLayer || imgLayer;

     if (layer && layer.combinationKey && layer.combinationKey !== selectedVariant) {
        setActiveLayerId(null);
     }
  }, [selectedVariant, selectedBook, activeLayerId]);

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
     
    // Recursively generate combinations for this specific tab
    const variants = relevantVariants;
    const variantOptions = variants.map(v => v.options);
    
    const cartesian = (args: any[]) => {
        const r: any[] = [];
        const max = args.length - 1;
        function helper(arr: any[], i: number) {
            for (let j = 0, l = args[i].length; j < l; j++) {
                const a = arr.slice(0);
                a.push(args[i][j]);
                if (i === max) r.push(a);
                else helper(a, i + 1);
            }
        }
        helper([], 0);
        return r;
    };

    const combinations = cartesian(variantOptions);
    
    return combinations.map(combo => {
       const parts = combo.map((opt: any, index: number) => ({
          label: opt.label,
          id: opt.id,
          // Find which variant this option belongs to
          variantId: variants[index].id
       }));
       
       // Key is sorted combination of option IDs
       const key = parts.map((p: any) => p.id).sort().join('_');
       
       return { key, parts };
    });
  };

  // Calculate aspect ratio style
  const bookDimensions = selectedBook?.features?.dimensions || { width: 210, height: 210 }; // Default square 21x21
  const aspectRatio = bookDimensions.width / bookDimensions.height;

  // Helper to render Resize/Rotate Handles
  const renderTransformHandles = (elementId: string, position: {width?: number, height?: number, rotation?: number}) => {
      if (activeLayerId !== elementId) return null;
      
      const handleStyle = "absolute w-2.5 h-2.5 bg-white border border-brand-coral rounded-full shadow z-50 pointer-events-auto";
      const w = position.width || 0;
      const h = position.height || 0;

      const onHandleDown = (e: React.MouseEvent, type: string) => {
          e.stopPropagation();
          e.preventDefault();
          setIsDragging(true);
          setResizeHandle(type);
          setDragStartPos({ x: e.clientX, y: e.clientY });
          
          const textLayer = selectedBook?.contentConfig.texts.find(t => t.id === elementId);
          const imgLayer = (selectedBook?.contentConfig.imageElements || []).find(i => i.id === elementId);
          const layer = textLayer || imgLayer;
          
          if (layer) {
              setDragStartElementPos({ x: layer.position.x || 0, y: layer.position.y || 0 });
              setInitialDims({ 
                  w: layer.position.width || 0, 
                  h: layer.position.height || 0,
                  r: layer.position.rotation || 0
              });
          }
      };

      return (
          <>
            {/* Rotate Handle */}
            <div 
                className={handleStyle} 
                style={{ top: '-15px', left: '50%', transform: 'translateX(-50%)', cursor: 'grab' }}
                onMouseDown={(e) => onHandleDown(e, 'rotate')}
                title="Pivoter"
            >
                <div className="absolute top-full left-1/2 h-2.5 w-px bg-brand-coral -translate-x-1/2"></div>
            </div>

            {/* Corners */}
            <div className={handleStyle} style={{ top: '-5px', left: '-5px', cursor: 'nw-resize' }} onMouseDown={(e) => onHandleDown(e, 'nw')} />
            <div className={handleStyle} style={{ top: '-5px', right: '-5px', cursor: 'ne-resize' }} onMouseDown={(e) => onHandleDown(e, 'ne')} />
            <div className={handleStyle} style={{ bottom: '-5px', left: '-5px', cursor: 'sw-resize' }} onMouseDown={(e) => onHandleDown(e, 'sw')} />
            <div className={handleStyle} style={{ bottom: '-5px', right: '-5px', cursor: 'se-resize' }} onMouseDown={(e) => onHandleDown(e, 'se')} />
            
            {/* Edges */}
            <div className="absolute top-0 left-1/2 w-full h-1 -translate-y-1/2 -translate-x-1/2 cursor-n-resize group-hover/handle:bg-brand-coral/20" onMouseDown={(e) => onHandleDown(e, 'n')} />
            <div className="absolute bottom-0 left-1/2 w-full h-1 translate-y-1/2 -translate-x-1/2 cursor-s-resize" onMouseDown={(e) => onHandleDown(e, 's')} />
            <div className="absolute left-0 top-1/2 h-full w-1 -translate-x-1/2 -translate-y-1/2 cursor-w-resize" onMouseDown={(e) => onHandleDown(e, 'w')} />
            <div className="absolute right-0 top-1/2 h-full w-1 translate-x-1/2 -translate-y-1/2 cursor-e-resize" onMouseDown={(e) => onHandleDown(e, 'e')} />
          </>
      );
  };

  const handleSaveBook = (updatedBook: BookProduct) => {
    setDraftBook(updatedBook);
  };

  const handleSaveAndExit = (updatedBook: BookProduct) => {
    updateBook(updatedBook);
    setDraftBook(null); // Clear draft to resync with new context
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
    setDraftBook(newBook);
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportContent = () => {
    if (!selectedBook) return;

    // Export ONLY content configuration (variants, pages, elements, dimensions)
    const exportData = {
      version: '1.2',
      timestamp: new Date().toISOString(),
      sourceBookId: selectedBook.id, // Only ID for reference
      // Export ONLY configuration parts, NOT product identity (id, name, price, etc.)
      wizardConfig: {
        avatarStyle: selectedBook.wizardConfig.avatarStyle,
        tabs: selectedBook.wizardConfig.tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          type: tab.type,
          variants: tab.variants.map(v => ({
             id: v.id,
             label: v.label,
             type: v.type,
             options: v.options,
             minLength: v.minLength,
             maxLength: v.maxLength
             // Thumbnail excluded from export
          }))
        })),
        avatarMappings: selectedBook.wizardConfig.avatarMappings
      }, // Variants & Options
      contentConfig: selectedBook.contentConfig, // Layers, Texts, Images, Pages
      features: {
        dimensions: selectedBook.features?.dimensions || { width: 210, height: 210 },
        printConfig: selectedBook.features?.printConfig
      } // ONLY Dimensions & Print Settings
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(selectedBook.name || 'book')}_storyboard_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Configuration Storyboard exportée (sans données produit)');
  };

  const handleImportContent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBook) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Basic validation
        if (!importedData.wizardConfig || !importedData.contentConfig) {
          toast.error('Format de fichier invalide: Configuration manquante');
          return;
        }

        if (confirm('Attention : Cette action va remplacer la configuration du contenu (variantes, pages, calques). Les métadonnées du produit (Nom, Prix, ID) ne seront PAS modifiées. Voulez-vous continuer ?')) {
          
          // Merge features carefully: Only overwrite dimensions/printConfig, keep others (marketing)
          const newFeatures = {
             ...selectedBook.features,
             ...(importedData.features?.dimensions ? { dimensions: importedData.features.dimensions } : {}),
             ...(importedData.features?.printConfig ? { printConfig: importedData.features.printConfig } : {})
          };

          handleSaveBook({
            ...selectedBook,
            // Overwrite ONLY configuration parts
            wizardConfig: importedData.wizardConfig,
            contentConfig: importedData.contentConfig,
            features: newFeatures,
            // Explicitly PRESERVE product identity
            id: selectedBook.id,
            name: selectedBook.name,
            description: selectedBook.description,
            price: selectedBook.price,
            theme: selectedBook.theme,
            category: selectedBook.category,
            coverImage: selectedBook.coverImage
          });
          toast.success('Configuration Storyboard importée avec succès');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Erreur lors de l\'import du fichier');
      }
      
      // Reset input
      if (event.target) event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
     <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
        {/* SIDEBAR */}
        <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-coral to-red-500 flex items-center justify-center text-white font-bold">W</div>
             <span className="font-bold text-white text-lg tracking-tight">WawBook Admin</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
             <button 
               onClick={() => { setActiveTab('home'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'home' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Home size={18} />
                <span>Accueil</span>
             </button>

             <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commandes</div>
             
             <button 
               onClick={() => { setActiveTab('orders'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'orders' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <ShoppingBag size={18} />
                <span>Commandes</span>
             </button>

             <button 
               onClick={() => { setActiveTab('customers'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'customers' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Users size={18} />
                <span>Clients</span>
             </button>

             <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produits</div>

             <button 
               onClick={() => { setActiveTab('books'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'books' && !selectedBookId ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Book size={18} />
                <span>Livres</span>
             </button>

             <button 
               onClick={() => { setActiveTab('menus'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'menus' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Menu size={18} />
                <span>Menus & Navigation</span>
             </button>

             <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logistique</div>

             <button 
               onClick={() => { setActiveTab('printers'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'printers' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Printer size={18} />
                <span>Imprimeurs</span>
             </button>
             
             <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Boutique</div>

             <button 
               onClick={() => { setActiveTab('analytics'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'analytics' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <BarChart3 size={18} />
                <span>Analyses</span>
             </button>

             <button 
               onClick={() => { setActiveTab('settings'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'settings' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Settings size={18} />
                <span>Paramètres</span>
             </button>

             {selectedBookId && (
               <div className="mt-6 pt-6 border-t border-slate-800">
                 <div className="px-4 mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-coral uppercase tracking-wider">Mode Édition</span>
                    <button onClick={() => { setSelectedBookId(null); setIsEditing(false); setActiveTab('books'); }} className="text-slate-500 hover:text-white">
                      <X size={14} />
                    </button>
                 </div>
                 
                 <div className="px-4 mb-4">
                    <div className="bg-slate-800 rounded p-3 border border-slate-700 mb-3">
                       <div className="font-bold text-white truncate text-sm">{selectedBook?.name}</div>
                       <div className="text-[10px] text-slate-400 font-mono">{selectedBook?.id}</div>
                    </div>
                    
                    <button 
                       onClick={() => {
                          const bookToSave = draftBook || selectedBook;
                          if (bookToSave) {
                             updateBook(bookToSave);
                             // Force refresh draft from context after save to reset "unsaved" state cleanly
                             // But keep it as separate object to allow new edits
                             setDraftBook(JSON.parse(JSON.stringify(bookToSave)));
                             toast.success("Modifications enregistrées");
                          }
                       }}
                       disabled={!selectedBook}
                       className={`w-full font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-sm ${
                          hasUnsavedChanges || (draftBook && contextBook && JSON.stringify(draftBook) !== JSON.stringify(contextBook))
                             ? 'bg-brand-coral hover:bg-red-500 text-white cursor-pointer' 
                             : 'bg-slate-800 text-slate-500 hover:bg-slate-700 cursor-pointer'
                       }`}
                    >
                       <Save size={14} />
                       {hasUnsavedChanges || (draftBook && contextBook && JSON.stringify(draftBook) !== JSON.stringify(contextBook)) ? 'Sauvegarder' : 'Enregistré'}
                    </button>
                 </div>

                 <div className="space-y-1">
                   <button 
                     onClick={() => setActiveTab('books')}
                     className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'books' && selectedBookId ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
                   >
                      <Settings size={16} />
                      <span>Général</span>
                   </button>
                   
                   <button 
                     onClick={() => setActiveTab('wizard')}
                     className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'wizard' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
                   >
                      <User size={16} />
                      <span>Wizard</span>
                   </button>

                   <button 
                     onClick={() => setActiveTab('avatars')}
                     className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'avatars' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
                   >
                      <Eye size={16} />
                      <span>Avatars</span>
                   </button>

                   <button 
                     onClick={() => setActiveTab('content')}
                     className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'content' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
                   >
                      <Layers size={16} />
                      <span>Contenu</span>
                   </button>
                 </div>
               </div>
             )}
          </nav>

          <div className="p-4 border-t border-slate-800">
             <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
                <ChevronRight size={14} className="rotate-180" />
                Retour au site
             </button>
          </div>
        </div>
        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
           {/* Header */}
           <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-10">
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 {selectedBookId ? (
                   <>
                     <span className="text-slate-400 font-normal text-lg">Produits /</span>
                     {selectedBook?.name}
                   </>
                 ) : (
                    activeTab === 'home' ? 'Tableau de bord' :
                    activeTab === 'books' ? 'Produits' :
                    activeTab === 'orders' ? 'Commandes' :
                    activeTab === 'customers' ? 'Clients' :
                    activeTab === 'menus' ? 'Menus' :
                    activeTab === 'printers' ? 'Imprimeurs' :
                    activeTab === 'settings' ? 'Paramètres' : 
                    activeTab === 'analytics' ? 'Analyses' : 'Admin'
                 )}
              </h1>
              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-slate-900">Admin User</div>
                    <div className="text-xs text-slate-500">admin@wawbook.com</div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-brand-coral text-white flex items-center justify-center font-bold shadow-md">
                    A
                 </div>
              </div>
           </header>

           {/* Scrollable Content */}
           <main className="flex-1 overflow-y-auto p-8">
              
              {/* --- VIEW: HOME (DASHBOARD) --- */}
              {activeTab === 'home' && (
                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ventes Totales</h3>
                             <div className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">+12%</div>
                          </div>
                          <div className="text-3xl font-bold text-slate-900 mb-1">
                             {orders.reduce((acc, order) => acc + order.totalAmount, 0).toFixed(2)} €
                          </div>
                          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
                       </div>

                       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Commandes</h3>
                             <div className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">+5%</div>
                          </div>
                          <div className="text-3xl font-bold text-slate-900 mb-1">
                             {orders.length}
                          </div>
                          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
                       </div>

                       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Panier Moyen</h3>
                             <div className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold">-2%</div>
                          </div>
                          <div className="text-3xl font-bold text-slate-900 mb-1">
                             {orders.length > 0 ? (orders.reduce((acc, order) => acc + order.totalAmount, 0) / orders.length).toFixed(2) : '0.00'} €
                          </div>
                          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                             <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800">Dernières commandes</h3>
                                <button onClick={() => setActiveTab('orders')} className="text-indigo-600 text-sm font-bold hover:underline">Tout voir</button>
                             </div>
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                   <tr>
                                      <th className="px-6 py-3">Commande</th>
                                      <th className="px-6 py-3">Client</th>
                                      <th className="px-6 py-3">Statut</th>
                                      <th className="px-6 py-3 text-right">Total</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                   {orders.slice(0, 5).map(order => (
                                      <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setActiveTab('orders'); setSelectedOrderId(order.id); }}>
                                         <td className="px-6 py-4 font-bold text-slate-900">{order.id}</td>
                                         <td className="px-6 py-4">{order.customerName}</td>
                                         <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                               order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                               order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                               order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                                               order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                               'bg-slate-100 text-slate-600'
                                            }`}>
                                               {order.status === 'pending' ? 'En attente' :
                                                order.status === 'processing' ? 'En cours' :
                                                order.status === 'shipped' ? 'Expédiée' :
                                                order.status === 'delivered' ? 'Livrée' : 'Annulée'}
                                            </span>
                                         </td>
                                         <td className="px-6 py-4 text-right font-bold">{order.totalAmount.toFixed(2)} €</td>
                                      </tr>
                                   ))}
                                   {orders.length === 0 && (
                                      <tr>
                                         <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Aucune commande récente</td>
                                      </tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                             <h3 className="font-bold text-slate-800 mb-4">À faire</h3>
                             <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                                   <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>
                                   <span className="text-sm font-medium">{orders.filter(o => o.status === 'pending').length} commandes à traiter</span>
                                   <ChevronRight size={16} className="ml-auto opacity-50" />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                                   <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                   <span className="text-sm font-medium">{orders.filter(o => o.status === 'processing').length} en cours de production</span>
                                   <ChevronRight size={16} className="ml-auto opacity-50" />
                                </div>
                             </div>
                          </div>

                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                             <h3 className="font-bold text-slate-800 mb-4">Top Produits</h3>
                             <div className="space-y-4">
                                {books.slice(0, 3).map((book, i) => (
                                   <div key={book.id} className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                                         {i + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <div className="text-sm font-medium text-slate-900 truncate">{book.name}</div>
                                         <div className="text-xs text-slate-500">{book.wizardConfig.tabs.length} options</div>
                                      </div>
                                      <div className="text-xs font-bold text-slate-700">{book.price} €</div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* --- VIEW: ANALYTICS --- */}
              {activeTab === 'analytics' && (
                 <div className="space-y-8">
                    <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
                       <div className="relative z-10">
                          <h2 className="text-3xl font-bold mb-2">Performances</h2>
                          <p className="text-slate-400 max-w-xl">
                             Analysez vos ventes, le comportement de vos clients et la performance de vos produits pour optimiser votre boutique.
                          </p>
                       </div>
                       <BarChart3 className="absolute right-8 top-8 text-slate-800 opacity-20 w-64 h-64 -rotate-12" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-64 flex flex-col items-center justify-center text-center">
                          <BarChart3 size={48} className="text-slate-300 mb-4" />
                          <h3 className="font-bold text-slate-800">Graphique des ventes</h3>
                          <p className="text-sm text-slate-500 mt-2">Données simulées pour la démo.</p>
                       </div>
                       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-64 flex flex-col items-center justify-center text-center">
                          <Globe size={48} className="text-slate-300 mb-4" />
                          <h3 className="font-bold text-slate-800">Ventes par région</h3>
                          <p className="text-sm text-slate-500 mt-2">Données simulées pour la démo.</p>
                       </div>
                    </div>
                 </div>
              )}

              {/* --- VIEW: SETTINGS --- */}
              {activeTab === 'settings' && (
                 <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                             <h3 className="font-bold text-slate-800 text-lg">Général</h3>
                             <p className="text-sm text-slate-500">Informations de base de votre boutique</p>
                          </div>
                          <button 
                             onClick={() => handleSaveSettings('Général')}
                             className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                          >
                             <Save size={16} /> Sauvegarder
                          </button>
                       </div>
                       <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de la boutique</label>
                                <input 
                                   type="text" 
                                   value={settings.general.storeName}
                                   onChange={(e) => setSettings({...settings, general: {...settings.general, storeName: e.target.value}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de contact</label>
                                <input 
                                   type="email" 
                                   value={settings.general.supportEmail}
                                   onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
                                <select 
                                   value={settings.general.currency}
                                   onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                >
                                   <option value="EUR">Euro (€)</option>
                                   <option value="USD">Dollar ($)</option>
                                   <option value="GBP">Livre (£)</option>
                                </select>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                             <h3 className="font-bold text-slate-800 text-lg">Paiement</h3>
                             <p className="text-sm text-slate-500">Fournisseurs et passerelles de paiement</p>
                          </div>
                          <button 
                             onClick={() => handleSaveSettings('Paiement')}
                             className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                          >
                             <Save size={16} /> Sauvegarder
                          </button>
                       </div>
                       <div className="p-6 space-y-6">
                          <div className="flex items-start gap-4">
                             <div className="pt-1">
                                <input 
                                   type="checkbox" 
                                   checked={settings.payment.stripeEnabled}
                                   onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeEnabled: e.target.checked}})}
                                   className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
                                />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-700">Stripe</h4>
                                <p className="text-sm text-slate-500 mb-2">Accepter les cartes bancaires via Stripe.</p>
                                {settings.payment.stripeEnabled && (
                                   <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clé API Publique</label>
                                      <input 
                                         type="text" 
                                         value={settings.payment.stripeKey}
                                         onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeKey: e.target.value}})}
                                         className="w-full text-sm border-gray-300 rounded-lg bg-slate-50 font-mono text-slate-600"
                                      />
                                   </div>
                                )}
                             </div>
                          </div>
                          
                          <div className="w-full h-px bg-gray-100"></div>

                          <div className="flex items-start gap-4">
                             <div className="pt-1">
                                <input 
                                   type="checkbox" 
                                   checked={settings.payment.paypalEnabled}
                                   onChange={(e) => setSettings({...settings, payment: {...settings.payment, paypalEnabled: e.target.checked}})}
                                   className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
                                />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-700">PayPal</h4>
                                <p className="text-sm text-slate-500">Accepter les paiements via PayPal.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                             <h3 className="font-bold text-slate-800 text-lg">Expédition</h3>
                             <p className="text-sm text-slate-500">Tarifs et règles de livraison</p>
                          </div>
                          <button 
                             onClick={() => handleSaveSettings('Expédition')}
                             className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                          >
                             <Save size={16} /> Sauvegarder
                          </button>
                       </div>
                       <div className="p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Standard (€)</label>
                                <input 
                                   type="number" 
                                   step="0.1"
                                   value={settings.shipping.standardRate}
                                   onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, standardRate: parseFloat(e.target.value)}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Express (€)</label>
                                <input 
                                   type="number" 
                                   step="0.1"
                                   value={settings.shipping.expressRate}
                                   onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, expressRate: parseFloat(e.target.value)}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil Gratuité (€)</label>
                                <input 
                                   type="number" 
                                   value={settings.shipping.freeShippingThreshold}
                                   onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, freeShippingThreshold: parseFloat(e.target.value)}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral"
                                />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                             <h3 className="font-bold text-slate-800 text-lg">Notifications</h3>
                             <p className="text-sm text-slate-500">Emails transactionnels</p>
                          </div>
                          <button 
                             onClick={() => handleSaveSettings('Notifications')}
                             className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                          >
                             <Save size={16} /> Sauvegarder
                          </button>
                       </div>
                       <div className="p-6 space-y-4">
                          <div className="flex items-start gap-4">
                             <div className="pt-1">
                                <input 
                                   type="checkbox" 
                                   checked={settings.notifications.orderConfirmation}
                                   onChange={(e) => setSettings({...settings, notifications: {...settings.notifications, orderConfirmation: e.target.checked}})}
                                   className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
                                />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-700">Confirmation de commande</h4>
                                <p className="text-sm text-slate-500">Envoyer un email au client lors de la commande.</p>
                             </div>
                          </div>
                          <div className="flex items-start gap-4">
                             <div className="pt-1">
                                <input 
                                   type="checkbox" 
                                   checked={settings.notifications.shippingUpdate}
                                   onChange={(e) => setSettings({...settings, notifications: {...settings.notifications, shippingUpdate: e.target.checked}})}
                                   className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
                                />
                             </div>
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-700">Mise à jour d'expédition</h4>
                                <p className="text-sm text-slate-500">Envoyer un email au client lors de l'expédition.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

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

              {/* --- VIEW: ORDERS --- */}
              {activeTab === 'orders' && !selectedOrderId && (
                <div className="space-y-4">
                   <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                         <h2 className="text-xl font-bold text-slate-800">Commandes</h2>
                         <div className="flex gap-2">
                            <button className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">
                               Exporter
                            </button>
                            <button className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800">
                               Créer une commande
                            </button>
                         </div>
                      </div>

                      {/* Filters & Search Bar */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                         <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 px-2">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                               <button className="px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-md whitespace-nowrap">Tout</button>
                               <button className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md whitespace-nowrap transition-colors">Non traité</button>
                               <button className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md whitespace-nowrap transition-colors">Non payé</button>
                               <button className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md whitespace-nowrap transition-colors">Ouvert</button>
                               <button className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md whitespace-nowrap transition-colors">Archivé</button>
                               <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md">
                                  <Plus size={14} />
                               </button>
                            </div>
                            <div className="relative">
                               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                  type="text" 
                                  placeholder="Rechercher..." 
                                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 outline-none focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all"
                               />
                            </div>
                         </div>
                         
                         {/* Table */}
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                               <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-gray-100">
                                  <tr>
                                     <th className="px-4 py-3 w-8">
                                        <input type="checkbox" className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
                                     </th>
                                     <th className="px-4 py-3 font-semibold">Commande</th>
                                     <th className="px-4 py-3 font-semibold">Date</th>
                                     <th className="px-4 py-3 font-semibold">Client</th>
                                     <th className="px-4 py-3 font-semibold">Canal</th>
                                     <th className="px-4 py-3 font-semibold text-right">Total</th>
                                     <th className="px-4 py-3 font-semibold">Statut paiement</th>
                                     <th className="px-4 py-3 font-semibold">Statut traitement</th>
                                     <th className="px-4 py-3 font-semibold">Articles</th>
                                     <th className="px-4 py-3 font-semibold">Livraison</th>
                                     <th className="px-4 py-3 font-semibold">Méthode</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-50">
                                  {orders.map(order => {
                                     // Mock statuses for the view
                                     const isPaid = order.status !== 'pending' && order.status !== 'cancelled';
                                     const paymentStatus = isPaid ? 'Payé' : 'En attente';
                                     const paymentColor = isPaid ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-800';
                                     
                                     const fulfillmentStatus = 
                                        order.status === 'delivered' ? 'Livré' :
                                        order.status === 'shipped' ? 'Expédié' :
                                        order.status === 'processing' ? 'En cours' :
                                        order.status === 'cancelled' ? 'Annulé' : 'Non traité';
                                        
                                     const fulfillmentColor = 
                                        order.status === 'delivered' ? 'bg-slate-100 text-slate-700' :
                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                        order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                                        order.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-800';

                                     return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
                                           <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                              <input type="checkbox" className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
                                           </td>
                                           <td className="px-4 py-3 font-bold text-slate-900 group-hover:underline">#{order.id.slice(0,8)}</td>
                                           <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                              {new Date(order.createdAt).toLocaleDateString()}
                                              <span className="text-slate-400 ml-1 text-[10px]">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                           </td>
                                           <td className="px-4 py-3">
                                              <div className="font-medium text-slate-900">{order.customerName}</div>
                                           </td>
                                           <td className="px-4 py-3 text-slate-500">Boutique en ligne</td>
                                           <td className="px-4 py-3 text-right font-medium text-slate-900">
                                              {order.totalAmount.toFixed(2)} €
                                           </td>
                                           <td className="px-4 py-3">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${paymentColor}`}>
                                                 <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPaid ? 'bg-slate-500' : 'bg-orange-500'}`}></div>
                                                 {paymentStatus}
                                              </span>
                                           </td>
                                           <td className="px-4 py-3">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${fulfillmentColor}`}>
                                                 {fulfillmentStatus}
                                              </span>
                                           </td>
                                           <td className="px-4 py-3 text-slate-500">{order.items.length} article{order.items.length > 1 ? 's' : ''}</td>
                                           <td className="px-4 py-3">
                                              {order.trackingNumber ? (
                                                 <span className="text-slate-900 font-medium text-[11px] border border-slate-200 px-1.5 py-0.5 rounded bg-white">
                                                    En transit
                                                 </span>
                                              ) : (
                                                 <span className="text-slate-400 text-[11px]">-</span>
                                              )}
                                           </td>
                                           <td className="px-4 py-3 text-slate-500">Standard</td>
                                        </tr>
                                     );
                                  })}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* --- VIEW: ORDER DETAIL --- */}
              {activeTab === 'orders' && selectedOrderId && !showFulfillment && (
                 <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                       <button onClick={() => setSelectedOrderId(null)} className="text-slate-400 hover:text-slate-600">
                          <ArrowUp className="-rotate-90" size={20} />
                       </button>
                       <div className="flex-1">
                          <h2 className="text-2xl font-bold text-slate-800">Commande {selectedOrderId}</h2>
                          <div className="text-sm text-slate-500">
                             {orders.find(o => o.id === selectedOrderId)?.createdAt 
                                ? new Date(orders.find(o => o.id === selectedOrderId)!.createdAt).toLocaleDateString() + ' à ' + new Date(orders.find(o => o.id === selectedOrderId)!.createdAt).toLocaleTimeString()
                                : ''}
                          </div>
                       </div>
                       <div className="flex gap-2">
                           <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                              Imprimer
                           </button>
                           <button 
                              onClick={() => setShowFulfillment(true)}
                              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm"
                           >
                              Expédier les articles
                           </button>
                       </div>
                    </div>

                    {(() => {
                       const order = orders.find(o => o.id === selectedOrderId);
                       if (!order) return <div>Commande introuvable</div>;
                       
                       return (
                          <div className="grid grid-cols-3 gap-6">
                             {/* Main Info */}
                             <div className="col-span-2 space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <ShoppingBag size={18} className="text-indigo-600" />
                                      Articles
                                   </h3>
                                   <div className="space-y-4">
                                      {order.items.map(item => (
                                         <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                               <Book size={24} className="text-slate-300" />
                                            </div>
                                            <div className="flex-1">
                                               <div className="flex justify-between">
                                                  <h4 className="font-bold text-slate-900">{item.bookTitle}</h4>
                                                  <span className="font-bold">{item.price.toFixed(2)} €</span>
                                               </div>
                                               <p className="text-sm text-slate-500 mb-1">Quantité: {item.quantity}</p>
                                               <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded inline-block">
                                                  {JSON.stringify(item.configuration, null, 2)}
                                               </div>
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                   <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
                                      <span className="font-medium text-slate-500">Total</span>
                                      <span className="text-2xl font-bold text-slate-900">{order.totalAmount.toFixed(2)} €</span>
                                   </div>
                                </div>

                                {/* Production & Files */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <Printer size={18} className="text-indigo-600" />
                                      Production & Fichiers
                                   </h3>
                                   <div className="space-y-3">
                                      {/* Cover File */}
                                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                         <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-red-500">
                                               <FileText size={20} />
                                            </div>
                                            <div>
                                               <div className="font-bold text-slate-800 text-sm">Fichier Couverture (PDF)</div>
                                               <div className="text-xs text-slate-500">
                                                  {order.status === 'pending' ? 'En attente de génération' : `Généré le ${new Date(order.createdAt).toLocaleDateString()} • 2.4 MB`}
                                               </div>
                                            </div>
                                         </div>
                                         <button 
                                            onClick={() => {
                                               toast.promise(
                                                  new Promise(async (resolve, reject) => {
                                                     try {
                                                        const blob = await generateCoverPDF(order, books);
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `cover-${order.id}.pdf`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                        resolve(true);
                                                     } catch (e) {
                                                        reject(e);
                                                     }
                                                  }),
                                                  {
                                                     loading: 'Génération du PDF de couverture...',
                                                     success: `Couverture pour la commande #${order.id} téléchargée !`,
                                                     error: 'Erreur lors du téléchargement'
                                                  }
                                               );
                                            }}
                                            className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors" 
                                            title="Télécharger la couverture"
                                         >
                                            <Download size={18} />
                                         </button>
                                      </div>

                                      {/* Interior File */}
                                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                         <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-500">
                                               <FileText size={20} />
                                            </div>
                                            <div>
                                               <div className="font-bold text-slate-800 text-sm">Fichier Intérieur (PDF)</div>
                                               <div className="text-xs text-slate-500">
                                                  {order.status === 'pending' ? 'En attente de génération' : `Généré le ${new Date(order.createdAt).toLocaleDateString()} • 22.1 MB`}
                                               </div>
                                            </div>
                                         </div>
                                         <button 
                                            onClick={() => {
                                               toast.promise(
                                                  new Promise(async (resolve, reject) => {
                                                     try {
                                                        const blob = await generateInteriorPDF(order, books);
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `interior-${order.id}.pdf`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                        resolve(true);
                                                     } catch (e) {
                                                        reject(e);
                                                     }
                                                  }),
                                                  {
                                                     loading: 'Génération du PDF intérieur (Haute Qualité)...',
                                                     success: `Intérieur pour la commande #${order.id} téléchargé !`,
                                                     error: 'Erreur lors du téléchargement'
                                                  }
                                               );
                                            }}
                                            className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors" 
                                            title="Télécharger l'intérieur"
                                         >
                                            <Download size={18} />
                                         </button>
                                      </div>
                                   </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Imprimeur</div>
                                            {(() => {
                                               const country = order.shippingAddress.country;
                                               const printer = printers.find(p => p.countryCodes.includes(country)) || printers[0];
                                               
                                               return (
                                                  <>
                                                     <div className="font-medium text-slate-800">{printer ? printer.name : 'Non assigné'}</div>
                                                     <div className="text-xs text-slate-400 mt-1">ID: {printer ? printer.id : '-'}</div>
                                                     {printer && (
                                                        <div className="text-[10px] text-indigo-600 mt-1 font-medium bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                                                           Zone: {country}
                                                        </div>
                                                     )}
                                                  </>
                                               );
                                            })()}
                                         </div>
                                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Statut Production</div>
                                            <div className="font-medium text-green-600 flex items-center gap-1">
                                               <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                               Prêt à imprimer
                                            </div>
                                         </div>
                                      </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <Truck size={18} className="text-indigo-600" />
                                      Livraison
                                   </h3>
                                   <div className="grid grid-cols-2 gap-6">
                                      <div>
                                         <div className="text-xs text-slate-500 uppercase font-bold mb-2">Adresse de livraison</div>
                                         <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <div className="font-bold text-slate-900 mb-1">{order.customerName}</div>
                                            {order.shippingAddress.street}<br/>
                                            {order.shippingAddress.zipCode} {order.shippingAddress.city}<br/>
                                            {order.shippingAddress.country}
                                         </div>
                                      </div>
                                      
                                      <div>
                                         <div className="text-xs text-slate-500 uppercase font-bold mb-2">Étiquette d'expédition</div>
                                         <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-white flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/10 transition-colors cursor-pointer group">
                                            <Barcode size={32} className="text-slate-300 group-hover:text-indigo-400" />
                                            <div className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Générer l'étiquette</div>
                                            <div className="text-[10px] text-slate-400">Format: 10x15cm (PDF)</div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>

                             {/* Sidebar Actions */}
                             <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4">Statut</h3>
                                   <div className="space-y-2">
                                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                                         <button
                                            key={status}
                                            onClick={() => updateOrderStatus(order.id, status as any)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                               order.status === status 
                                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                                  : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                         >
                                            {status === 'pending' ? 'En attente' :
                                             status === 'processing' ? 'En cours de production' :
                                             status === 'shipped' ? 'Expédiée' :
                                             status === 'delivered' ? 'Livrée' : 'Annulée'}
                                         </button>
                                      ))}
                                   </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4">Client</h3>
                                   <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                         {order.customerName.charAt(0)}
                                      </div>
                                      <div>
                                         <div className="font-bold text-sm text-slate-900">{order.customerName}</div>
                                         <div className="text-xs text-slate-500">{order.customerEmail}</div>
                                      </div>
                                   </div>
                                   <button 
                                      onClick={() => {
                                         setActiveTab('customers');
                                         setSelectedCustomerId(order.customerId);
                                         setSelectedOrderId(null);
                                      }}
                                      className="text-xs text-indigo-600 font-bold hover:underline"
                                   >
                                      Voir le profil client
                                   </button>
                                </div>
                             </div>
                          </div>
                       );
                    })()}
                 </div>
              )}

              {/* --- VIEW: FULFILLMENT --- */}
              {activeTab === 'orders' && selectedOrderId && showFulfillment && (
                 <div className="max-w-4xl mx-auto space-y-6">
                    {(() => {
                       const order = orders.find(o => o.id === selectedOrderId);
                       if (!order) return <div>Commande introuvable</div>;

                       return (
                          <>
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                   <button onClick={() => setShowFulfillment(false)} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium text-sm">
                                      <ArrowUp className="-rotate-90" size={16} />
                                      Expédier
                                   </button>
                                </div>
                                <button className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">
                                   Imprimer le bon de livraison
                                </button>
                             </div>

                             <div className="grid grid-cols-3 gap-6">
                                {/* Left Column */}
                                <div className="col-span-2 space-y-6">
                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                      <div className="flex items-center justify-between mb-6">
                                         <div className="flex items-center gap-2">
                                            <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-200">Non traité</div>
                                            <div className="font-bold text-slate-500 text-sm">#{order.id}</div>
                                         </div>
                                         <div className="text-xs text-slate-500 font-medium">{order.shippingAddress.city}</div>
                                      </div>

                                      {/* Items */}
                                      <div className="space-y-6">
                                         {order.items.map(item => (
                                            <div key={item.id} className="flex gap-4">
                                               <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                                                  <Book size={24} className="text-slate-300" />
                                               </div>
                                               <div className="flex-1">
                                                  <div className="flex justify-between items-start">
                                                     <div>
                                                        <div className="font-bold text-slate-900 text-sm">{item.bookTitle}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                           <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                              Personnalisé
                                                           </span>
                                                        </div>
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500 font-medium">0 kg</span>
                                                        <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                                                           <input 
                                                              type="text" 
                                                              className="w-12 text-center text-sm py-1 outline-none" 
                                                              value={item.quantity}
                                                              readOnly 
                                                           />
                                                           <div className="bg-slate-50 text-slate-500 px-2 py-1 text-xs border-l border-gray-300">
                                                              sur {item.quantity}
                                                           </div>
                                                        </div>
                                                     </div>
                                                  </div>
                                               </div>
                                            </div>
                                         ))}
                                      </div>

                                      {/* Tracking Section */}
                                      <div className="mt-8 pt-6 border-t border-gray-100">
                                         <h4 className="font-bold text-slate-800 mb-4 text-sm">Information de suivi</h4>
                                         
                                         <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="col-span-2">
                                               <label className="text-xs font-bold text-slate-500 mb-1 block">Numéro de suivi</label>
                                               <input 
                                                  type="text"
                                                  id="tracking-input" 
                                                  defaultValue={order.trackingNumber || ''}
                                                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all"
                                               />
                                            </div>
                                            <div>
                                               <label className="text-xs font-bold text-slate-500 mb-1 block">Transporteur</label>
                                               <div className="relative">
                                                  <select id="carrier-select" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none appearance-none bg-white focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all">
                                                     <option>La Poste</option>
                                                     <option>Colissimo</option>
                                                     <option>Mondial Relay</option>
                                                     <option>Chronopost</option>
                                                     <option>DHL</option>
                                                     <option>UPS</option>
                                                  </select>
                                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                               </div>
                                            </div>
                                         </div>
                                         
                                         <button className="text-brand-coral font-bold text-sm flex items-center gap-1 hover:underline">
                                            <Plus size={14} />
                                            Ajouter un autre numéro de suivi
                                         </button>
                                      </div>

                                      {/* Notify Customer */}
                                      <div className="mt-6 pt-6 border-t border-gray-100">
                                         <h4 className="font-bold text-slate-800 mb-4 text-sm">Notifier le client de l'expédition</h4>
                                         <div className="flex items-start gap-3">
                                            <div className="pt-0.5">
                                               <input type="checkbox" defaultChecked id="notify-check" className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
                                            </div>
                                            <label htmlFor="notify-check" className="text-sm text-slate-600">
                                               Envoyer les détails d'expédition à votre client maintenant
                                            </label>
                                         </div>
                                      </div>
                                   </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                      <div className="flex justify-between items-start mb-4">
                                         <h3 className="font-bold text-slate-800 text-sm">Adresse de livraison</h3>
                                         <button className="text-slate-400 hover:text-slate-600">
                                            <Edit2 size={14} />
                                         </button>
                                      </div>
                                      <div className="text-sm text-slate-600 space-y-1">
                                         <div className="font-medium text-slate-900">{order.customerName}</div>
                                         <div>{order.shippingAddress.street}</div>
                                         <div>{order.shippingAddress.zipCode} {order.shippingAddress.city}</div>
                                         <div>{order.shippingAddress.country}</div>
                                         <a href="#" className="text-brand-coral hover:underline text-xs font-bold mt-2 inline-block">Voir sur la carte</a>
                                      </div>
                                      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-slate-500">
                                         Le client a sélectionné <strong>Standard</strong> lors du paiement.
                                      </div>
                                   </div>

                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                      <h3 className="font-bold text-slate-800 text-sm mb-4">Résumé</h3>
                                      <div className="text-sm text-slate-600 mb-6">
                                         Expédition depuis <strong>{order.shippingAddress.city}</strong>
                                      </div>
                                      <div className="flex justify-between text-sm font-medium text-slate-900 mb-6">
                                         <span>{order.items.length} sur {order.items.length} articles</span>
                                      </div>
                                      <button 
                                         onClick={() => {
                                            const trackingInput = document.getElementById('tracking-input') as HTMLInputElement;
                                            if (trackingInput && trackingInput.value) {
                                               updateOrderTracking(order.id, trackingInput.value);
                                               toast.success(`Commande expédiée avec le suivi ${trackingInput.value}`);
                                               setShowFulfillment(false);
                                            } else {
                                               toast.error("Veuillez entrer un numéro de suivi");
                                            }
                                         }}
                                         className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                      >
                                         Confirmer l'expédition
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </>
                       );
                    })()}
                 </div>
              )}

              {/* --- VIEW: CUSTOMERS --- */}
              {activeTab === 'customers' && !selectedCustomerId && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <div>
                          <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
                          <p className="text-slate-500 mt-1">Base de données clients.</p>
                       </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 font-medium">
                             <tr>
                                <th className="px-6 py-4">Nom</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Ville</th>
                                <th className="px-6 py-4 text-center">Commandes</th>
                                <th className="px-6 py-4 text-right">Total dépensé</th>
                                <th className="px-6 py-4"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {customers.map(customer => (
                                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{customer.firstName} {customer.lastName}</div>
                                      <div className="text-xs text-slate-400">Inscrit le {new Date(customer.createdAt).toLocaleDateString()}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="text-slate-600">{customer.email}</div>
                                      <div className="text-xs text-slate-400">{customer.phone || '-'}</div>
                                   </td>
                                   <td className="px-6 py-4 text-slate-600">
                                      {customer.address?.city || '-'}
                                   </td>
                                   <td className="px-6 py-4 text-center font-medium text-slate-900">
                                      {customer.orderCount}
                                   </td>
                                   <td className="px-6 py-4 text-right font-bold text-slate-900">
                                      {customer.totalSpent.toFixed(2)} €
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => setSelectedCustomerId(customer.id)}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                                      >
                                         Voir
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {/* --- VIEW: CUSTOMER DETAIL --- */}
              {activeTab === 'customers' && selectedCustomerId && (
                 <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                       <button onClick={() => setSelectedCustomerId(null)} className="text-slate-400 hover:text-slate-600">
                          <ArrowUp className="-rotate-90" size={20} />
                       </button>
                       <h2 className="text-2xl font-bold text-slate-800">Fiche Client</h2>
                    </div>

                    {(() => {
                       const customer = customers.find(c => c.id === selectedCustomerId);
                       if (!customer) return <div>Client introuvable</div>;
                       const customerOrders = getOrdersByCustomer(customer.id);

                       return (
                          <div className="grid grid-cols-3 gap-6">
                             {/* Profile Info */}
                             <div className="col-span-1 space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                                   <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-slate-400">
                                      {customer.firstName.charAt(0)}
                                   </div>
                                   <h3 className="text-xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h3>
                                   <p className="text-slate-500 text-sm mb-4">Client depuis {new Date(customer.createdAt).toLocaleDateString()}</p>
                                   
                                   <div className="border-t border-gray-100 pt-4 text-left space-y-3">
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                         <div className="text-sm font-medium text-slate-700 break-all">{customer.email}</div>
                                      </div>
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Téléphone</label>
                                         <div className="text-sm font-medium text-slate-700">{customer.phone || '-'}</div>
                                      </div>
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Adresse</label>
                                         <div className="text-sm font-medium text-slate-700">
                                            {customer.address?.street}<br/>
                                            {customer.address?.zipCode} {customer.address?.city}<br/>
                                            {customer.address?.country}
                                         </div>
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4">Statistiques</h3>
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                                         <div className="text-2xl font-bold text-indigo-600">{customer.orderCount}</div>
                                         <div className="text-xs text-slate-500">Commandes</div>
                                      </div>
                                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                                         <div className="text-xl font-bold text-green-600">{customer.totalSpent.toFixed(0)}€</div>
                                         <div className="text-xs text-slate-500">Dépensé</div>
                                      </div>
                                   </div>
                                </div>
                             </div>

                             {/* Order History */}
                             <div className="col-span-2 space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <Package size={18} className="text-indigo-600" />
                                      Historique des commandes
                                   </h3>
                                   <div className="space-y-4">
                                      {customerOrders.length > 0 ? customerOrders.map(order => (
                                         <div key={order.id} className="border border-gray-100 rounded-lg p-4 hover:border-indigo-100 hover:bg-indigo-50/20 transition-colors cursor-pointer" onClick={() => {
                                            setActiveTab('orders');
                                            setSelectedOrderId(order.id);
                                            setSelectedCustomerId(null);
                                         }}>
                                            <div className="flex justify-between items-start mb-2">
                                               <div>
                                                  <div className="font-bold text-slate-900">{order.id}</div>
                                                  <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                               </div>
                                               <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                  order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                  order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                                                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                  'bg-slate-100 text-slate-600'
                                               }`}>
                                                  {order.status}
                                               </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                               <div className="text-sm text-slate-600">
                                                  {order.items.length} article(s) : {order.items.map(i => i.bookTitle).join(', ')}
                                               </div>
                                               <div className="font-bold text-slate-900">{order.totalAmount.toFixed(2)} €</div>
                                            </div>
                                         </div>
                                      )) : (
                                         <div className="text-center py-8 text-slate-400 italic">Aucune commande trouvée</div>
                                      )}
                                   </div>
                                </div>
                             </div>
                          </div>
                       );
                    })()}
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
                                      (<div className="flex flex-wrap gap-2">
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
                                      </div>)
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              )}

              {/* --- VIEW: PRINTERS --- */}
              {activeTab === 'printers' && (
                <div className="max-w-4xl mx-auto space-y-6">
                   <div className="flex justify-between items-center">
                      <div>
                         <h2 className="text-2xl font-bold text-slate-800">Imprimeurs</h2>
                         <p className="text-slate-500 mt-1">Gérez vos partenaires d'impression par région.</p>
                      </div>
                      <button 
                        onClick={() => {
                          const newPrinter: PrinterType = {
                             id: `PRT-${Date.now()}`,
                             name: 'Nouvel Imprimeur',
                             countryCodes: [],
                             contactEmail: '',
                             productionDelayDays: 3
                          };
                          setPrinters([...printers, newPrinter]);
                          setEditingPrinterId(newPrinter.id);
                        }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
                      >
                         <Plus size={18} />
                         Ajouter
                      </button>
                   </div>

                   <div className="grid gap-4">
                      {printers.map(printer => (
                         <div key={printer.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            {editingPrinterId === printer.id ? (
                               <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nom</label>
                                        <input 
                                           type="text" 
                                           value={printer.name}
                                           onChange={(e) => setPrinters(printers.map(p => p.id === printer.id ? {...p, name: e.target.value} : p))}
                                           className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                     </div>
                                     <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Contact</label>
                                        <input 
                                           type="text" 
                                           value={printer.contactEmail || ''}
                                           onChange={(e) => setPrinters(printers.map(p => p.id === printer.id ? {...p, contactEmail: e.target.value} : p))}
                                           className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                     </div>
                                  </div>
                                  
                                  <div>
                                     <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Pays supportés (codes ISO)</label>
                                     <div className="flex flex-wrap gap-2 mb-2">
                                        {printer.countryCodes.map(code => (
                                           <span key={code} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                              {code}
                                              <button onClick={() => setPrinters(printers.map(p => p.id === printer.id ? {...p, countryCodes: p.countryCodes.filter(c => c !== code)} : p))}>
                                                 <X size={12} />
                                              </button>
                                           </span>
                                        ))}
                                        <input 
                                           type="text" 
                                           placeholder="+ AJOUTER (Ex: FR)"
                                           className="bg-transparent border border-dashed border-gray-300 rounded px-2 py-1 text-xs uppercase w-32 focus:w-40 transition-all outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                           onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                 const code = e.currentTarget.value.toUpperCase();
                                                 if (code && !printer.countryCodes.includes(code)) {
                                                    setPrinters(printers.map(p => p.id === printer.id ? {...p, countryCodes: [...p.countryCodes, code]} : p));
                                                    e.currentTarget.value = '';
                                                 }
                                              }
                                           }}
                                        />
                                     </div>
                                     <p className="text-xs text-slate-400">Appuyez sur Entrée pour ajouter un code pays.</p>
                                  </div>

                                  <div className="flex justify-end gap-2 pt-2">
                                     <button 
                                        onClick={() => setEditingPrinterId(null)}
                                        className="px-4 py-2 bg-green-50 text-green-700 font-bold text-xs rounded hover:bg-green-100"
                                     >
                                        Terminer
                                     </button>
                                  </div>
                               </div>
                            ) : (
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                        <Printer size={24} />
                                     </div>
                                     <div>
                                        <h3 className="font-bold text-slate-900">{printer.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                           <span className="font-mono bg-slate-100 px-1 rounded">{printer.id}</span>
                                           <span>•</span>
                                           <span>{printer.contactEmail}</span>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6">
                                     <div className="flex items-center gap-2">
                                        <Globe size={16} className="text-slate-400" />
                                        <div className="flex gap-1">
                                           {printer.countryCodes.map(code => (
                                              <span key={code} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                 {code}
                                              </span>
                                           ))}
                                        </div>
                                     </div>

                                     <div className="flex items-center gap-2 border-l border-gray-100 pl-6">
                                        <button 
                                           onClick={() => setEditingPrinterId(printer.id)}
                                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        >
                                           <Edit2 size={16} />
                                        </button>
                                        <button 
                                           onClick={() => {
                                              if (confirm('Supprimer cet imprimeur ?')) {
                                                 setPrinters(printers.filter(p => p.id !== printer.id));
                                              }
                                           }}
                                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                           <Trash2 size={16} />
                                        </button>
                                     </div>
                                  </div>
                               </div>
                            )}
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
                          
                          <div className="flex items-center gap-3">
                             {/* Export/Import for Wizard Config */}
                             <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                                  <button 
                                      onClick={() => {
                                          if (!selectedBook) return;
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
                                                        // Check if ID is default-like (numeric or matches old slug) or empty
                                                        const oldSlug = slugify(currentVariant.label);
                                                        const currentId = currentVariant.id;
                                                        
                                                        // Check if ID matches slug of old label OR is strictly numeric (old default) OR starts with 'nouvel_attribut' (new default)
                                                        const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('nouvel_attribut');
                                                        const isSyncedId = currentId === oldSlug;
                                                        
                                                        newTabs[idx].variants[vIdx].label = newLabel;
                                                        
                                                        if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                                            const baseId = slugify(newLabel);
                                                            // Ensure unique in this tab, excluding self
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
                                                                    toast.info(`ID corrigé pour l'unicité: ${uniqueId}`);
                                                              }
                                                           }}
                                                           className={`bg-transparent text-[9px] font-mono text-slate-500 border-none p-0 focus:ring-0 w-24 hover:bg-gray-50 rounded px-1 ${tab.variants.filter((_, i) => i !== vIdx).some(v => v.id === variant.id) ? 'text-red-500 font-bold bg-red-50' : ''}`}
                                                           placeholder="ID variant"
                                                        />
                                                     </span>
                                                  </div>
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
                                                        <div key={oIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4 group/option">
                                                           
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
                                                                    const newLabel = e.target.value;
                                                                    const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                    const currentOption = newTabs[idx].variants[vIdx].options[oIdx];

                                                                    // Auto-update ID logic
                                                                    const oldSlug = slugify(currentOption.label);
                                                                    const currentId = currentOption.id;

                                                                    // Check if ID is default-like or empty
                                                                    const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('opt_') || currentId.startsWith('nouvelle_option');
                                                                    const isSyncedId = currentId === oldSlug;

                                                                    newTabs[idx].variants[vIdx].options[oIdx].label = newLabel;

                                                                    if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                                                        const baseId = slugify(newLabel);
                                                                        const otherIds = newTabs[idx].variants[vIdx].options
                                                                           .filter((_, i) => i !== oIdx)
                                                                           .map(o => o.id);
                                                                        
                                                                        let uniqueId = baseId;
                                                                        let counter = 2;
                                                                        while (otherIds.includes(uniqueId)) {
                                                                            uniqueId = `${baseId}_${counter}`;
                                                                            counter++;
                                                                        }
                                                                        newTabs[idx].variants[vIdx].options[oIdx].id = uniqueId;
                                                                    }

                                                                    handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                 }}
                                                                 className="w-full text-sm font-medium text-slate-700 border-none p-0 focus:ring-0 bg-transparent mb-1"
                                                                 placeholder="Nom de l'option"
                                                              />
                                                              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                                                                 <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    ID: 
                                                                    <input 
                                                                       type="text" 
                                                                       value={option.id}
                                                                       onChange={(e) => {
                                                                          const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                          newTabs[idx].variants[vIdx].options[oIdx].id = e.target.value;
                                                                          handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                       }}
                                                                       onBlur={(e) => {
                                                                          const val = e.target.value.trim();
                                                                          if (!val) return;
                                                                          const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                          const otherIds = newTabs[idx].variants[vIdx].options.filter((_, i) => i !== oIdx).map(o => o.id);
                                                                          
                                                                          let uniqueId = val;
                                                                          let counter = 2;
                                                                          while (otherIds.includes(uniqueId)) {
                                                                              uniqueId = `${val}_${counter}`;
                                                                              counter++;
                                                                          }
                                                                          
                                                                          if (uniqueId !== val) {
                                                                              newTabs[idx].variants[vIdx].options[oIdx].id = uniqueId;
                                                                              handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                              toast.info(`ID corrigé pour l'unicité: ${uniqueId}`);
                                                                          }
                                                                       }}
                                                                       className={`bg-transparent border-none p-0 w-20 text-[10px] focus:ring-0 font-mono text-slate-600 ${variant.options?.filter((_, i) => i !== oIdx).some(o => o.id === option.id) ? 'text-red-500 font-bold bg-red-50' : ''}`}
                                                                       placeholder="ID option"
                                                                    />
                                                                 </span>
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
                                                                  className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg hover:bg-red-600 flex items-center justify-center"
                                                                  title="Supprimer l'image"
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

                          {/* Variant Selector */}
                          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-4">
                             <label className="text-[10px] font-bold text-gray-400 uppercase">Variante</label>
                             <select 
                                value={selectedVariant}
                                onChange={(e) => setSelectedVariant(e.target.value)}
                                className="h-7 text-xs border border-gray-200 rounded px-2 font-medium bg-white focus:ring-brand-coral focus:border-brand-coral w-48 max-w-[200px]"
                                title={selectedVariant}
                             >
                                {currentCombinations.map(c => (
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
                                      <DialogTitle className="text-slate-900 text-lg">Configuration Impression (Lulu / POD)</DialogTitle>
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
                                                          <span className="pt-4 text-gray-300">x</span>
                                                          <div className="flex-1 space-y-1">
                                                              <label className="text-[10px] text-gray-400">Hauteur</label>
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

                                                  {/* Spine */}
                                                  <div className="space-y-2">
                                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Tranche</label>
                                                      <div className="space-y-1">
                                                          <label className="text-[10px] text-gray-400">Largeur</label>
                                                          <input 
                                                              type="number" 
                                                              step="0.1"
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
                                                      step="0.1"
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
                                                      step="0.1"
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
                                                      step="0.1"
                                                      value={selectedBook.features?.printConfig?.interior?.bleedMm || 3.175}
                                                      onChange={(e) => {
                                                          const val = parseFloat(e.target.value);
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
                                                      step="0.1"
                                                      value={selectedBook.features?.printConfig?.interior?.safeMarginMm || 10}
                                                      onChange={(e) => {
                                                          const val = parseFloat(e.target.value);
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
                              <button
                                  onClick={() => {
                                      if (confirm('ATTENTION: Voulez-vous réinitialiser TOUTE la configuration du livre ?\nCela effacera toutes les pages, textes, images et variantes.\nCette action est irréversible.')) {
                                          handleSaveBook({
                                              ...selectedBook,
                                              wizardConfig: { avatarStyle: 'watercolor', tabs: [] },
                                              contentConfig: { pages: [], texts: [], images: [], imageElements: [] },
                                              features: { ...selectedBook.features, dimensions: { width: 210, height: 210 } }
                                          });
                                          setSelectedPageId(null);
                                          toast.success('Configuration réinitialisée avec succès');
                                      }
                                  }}
                                  className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-600 shrink-0 ml-2 border border-red-200"
                                  title="Réinitialiser la configuration (Reset complet)"
                              >
                                  <RotateCcw size={18} />
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef}
                                  onChange={handleImportContent}
                                  accept=".json"
                                  className="hidden"
                              />
                          </div>
                       </div>
                       
                       {/* Move "Nouvelle Page" button to its own container if needed, but flex-wrap on parent helps */}
                       <div className="flex gap-2 shrink-0">
                          <button 
                             onClick={() => {
                                const pages = selectedBook.contentConfig.pages || [];
                                let currentPages = [...pages];
                                
                                // Ensure minimal structure (Front + Back) exists if missing
                                if (currentPages.length === 0) {
                                    currentPages = [
                                        { id: `cover-front-${Date.now()}`, pageNumber: 0, label: 'Couverture Avant' },
                                        { id: `cover-back-${Date.now()}`, pageNumber: 999, label: 'Couverture Arrière' }
                                    ];
                                } else if (currentPages.length === 1) {
                                    // We have 1 page, assume it's Front, add Back
                                    currentPages.push({ id: `cover-back-${Date.now()}`, pageNumber: 999, label: 'Couverture Arrière' });
                                }

                                const frontCover = currentPages[0];
                                const backCover = currentPages[currentPages.length - 1];
                                
                                // Calculate new page number (interior pages start at 1)
                                const interiorPages = currentPages.slice(1, -1);
                                const newPageNum = interiorPages.length + 1;
                                
                                const newPage: PageDefinition = { 
                                   id: Date.now().toString(), 
                                   pageNumber: newPageNum, 
                                   label: `Page ${newPageNum}` 
                                };
                                
                                // Construct new array: [Front, ...Interior, NewPage, Back]
                                const newPages = [
                                   frontCover,
                                   ...interiorPages,
                                   newPage,
                                   backCover
                                ];

                                handleSaveBook({
                                   ...selectedBook, 
                                   contentConfig: {
                                      ...selectedBook.contentConfig, 
                                      pages: newPages
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
                          {/* 1. COUVERTURE (Combined Front & Back) */}
                          {(() => {
                             const pages = selectedBook.contentConfig?.pages || [];
                             if (pages.length < 2) return null;

                             const frontCover = pages[0];
                             const backCover = pages[pages.length - 1];
                             const isCoverSelected = selectedPageId === frontCover.id || selectedPageId === backCover.id;

                             return (
                                <div 
                                   onClick={() => {
                                      setSelectedPageId(frontCover.id);
                                      setViewMode('spread'); // Force spread view for full cover
                                   }}
                                   className={`group p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${isCoverSelected ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                   <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                                      COUV
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm text-slate-800 truncate">
                                         Couverture Complète
                                      </div>
                                      <div className="text-[10px] text-gray-400 truncate">Dos + Face Avant</div>
                                   </div>
                                   
                                   <button
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         if(!confirm('Attention: Voulez-vous supprimer la couverture (Face Avant ET Dos) ?\nLes pages intérieures deviendront la nouvelle couverture.')) return;

                                         // Deep copy
                                         let newPages = [...selectedBook.contentConfig.pages];
                                         let newTexts = [...(selectedBook.contentConfig.texts || [])];
                                         let newImages = [...(selectedBook.contentConfig.images || [])];
                                         let newImageElements = [...(selectedBook.contentConfig.imageElements || [])];

                                         if (newPages.length < 2) return;

                                         const frontIdx = 0;
                                         const backIdx = newPages.length - 1;

                                         // 1. Remove Pages (filter out first and last)
                                         // We use the original length to identify the last index
                                         newPages = newPages.filter((_, i) => i !== frontIdx && i !== backIdx);

                                         // 2. Remove content on deleted pages
                                         newTexts = newTexts.filter(t => t.position.pageIndex !== frontIdx && t.position.pageIndex !== backIdx);
                                         newImages = newImages.filter(img => img.pageIndex !== frontIdx && img.pageIndex !== backIdx);
                                         newImageElements = newImageElements.filter(el => el.position.pageIndex !== frontIdx && el.position.pageIndex !== backIdx);

                                         // 3. Shift content indices (decrement by 1 because page 0 was removed)
                                         newTexts.forEach(t => t.position.pageIndex = Math.max(0, t.position.pageIndex - 1));
                                         newImages.forEach(img => img.pageIndex = Math.max(0, img.pageIndex - 1));
                                         newImageElements.forEach(el => el.position.pageIndex = Math.max(0, el.position.pageIndex - 1));

                                         // 4. Re-index pages array
                                         newPages.forEach((p, i) => p.pageNumber = i);

                                         handleSaveBook({
                                            ...selectedBook,
                                            contentConfig: {
                                               ...selectedBook.contentConfig,
                                               pages: newPages,
                                               texts: newTexts,
                                               images: newImages,
                                               imageElements: newImageElements
                                            }
                                         });

                                         if (newPages.length > 0) {
                                            setSelectedPageId(newPages[0].id);
                                         } else {
                                            setSelectedPageId(null);
                                         }
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Supprimer la couverture"
                                   >
                                      <Trash2 size={14} />
                                   </button>

                                   <ChevronRight size={14} className={`text-gray-300 ${isCoverSelected ? 'text-brand-coral' : ''}`} />
                                </div>
                             );
                          })()}

                          {/* 2. INTERIOR PAGES (Skip first and last) */}
                          {selectedBook.contentConfig.pages.slice(1, -1).map((page, index) => (
                             <div 
                                key={page.id} 
                                onClick={() => {
                                   setSelectedPageId(page.id);
                                   // Force single view mode for interior pages as requested
                                   setViewMode('single'); 
                                }}
                                className={`group p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedPageId === page.id ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                             >
                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                                   {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="font-bold text-sm text-slate-800 truncate">
                                      Page {index + 1}
                                   </div>
                                   <div className="text-[10px] text-gray-400 truncate">{page.description || "Sans description"}</div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      if(!confirm('Voulez-vous vraiment supprimer cette page ?')) return;

                                      const deletedPageIndex = selectedBook.contentConfig.pages.findIndex(p => p.id === page.id);
                                      if (deletedPageIndex === -1) return;

                                      // Deep copy relevant parts
                                      const newPages = [...selectedBook.contentConfig.pages];
                                      let newTexts = [...(selectedBook.contentConfig.texts || [])];
                                      let newImages = [...(selectedBook.contentConfig.images || [])];
                                      let newImageElements = [...(selectedBook.contentConfig.imageElements || [])];

                                      // 1. Remove Page
                                      newPages.splice(deletedPageIndex, 1);

                                      // 2. Remove content on deleted page
                                      newTexts = newTexts.filter(t => t.position.pageIndex !== deletedPageIndex);
                                      newImages = newImages.filter(img => img.pageIndex !== deletedPageIndex);
                                      newImageElements = newImageElements.filter(el => el.position.pageIndex !== deletedPageIndex);

                                      // 3. Shift content on subsequent pages
                                      newTexts.forEach(t => { if(t.position.pageIndex > deletedPageIndex) t.position.pageIndex--; });
                                      newImages.forEach(img => { if(img.pageIndex > deletedPageIndex) img.pageIndex--; });
                                      newImageElements.forEach(el => { if(el.position.pageIndex > deletedPageIndex) el.position.pageIndex--; });

                                      // 4. Re-index pages (pageNumber)
                                      newPages.forEach((p, i) => p.pageNumber = i);

                                      handleSaveBook({
                                          ...selectedBook,
                                          contentConfig: {
                                              ...selectedBook.contentConfig,
                                              pages: newPages,
                                              texts: newTexts,
                                              images: newImages,
                                              imageElements: newImageElements
                                          }
                                      });

                                      if (selectedPageId === page.id) {
                                          setSelectedPageId(newPages[Math.max(0, deletedPageIndex - 1)].id);
                                      }
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Supprimer la page"
                                >
                                  <Trash2 size={14} />
                                </button>

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
                                         {(() => {
                                            const page = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                            const index = selectedBook.contentConfig.pages.findIndex(p => p.id === selectedPageId);
                                            if (!page) return '';
                                            if (index === 0) return 'Couverture Avant';
                                            if (index === selectedBook.contentConfig.pages.length - 1) return 'Couverture Arrière';
                                            return page.label;
                                         })()}
                                      </h2>
                                      <div className="h-6 w-px bg-gray-200"></div>
                                      
                                      {/* Show View Mode Toggle ONLY for interior pages (not cover) */}
                                      <div className="flex items-center gap-2 mr-4">
                                          <button
                                              onClick={() => setShowGrid(!showGrid)}
                                              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'}`}
                                              title="Afficher la grille (10mm)"
                                          >
                                              <Layout size={14} />
                                              {showGrid ? 'Grille ON' : 'Grille'}
                                          </button>
                                      </div>

                                      {(() => {
                                         const index = selectedBook.contentConfig.pages.findIndex(p => p.id === selectedPageId);
                                         const isCover = index === 0 || index === selectedBook.contentConfig.pages.length - 1;
                                         
                                         if (!isCover) {
                                            return (
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
                                            );
                                         }
                                         return null;
                                      })()}
                                   </div>
                                   
                                </div>

                                {/* Canvas & Sidebar Container */}
                                <div className="flex-1 flex overflow-hidden">
                                   
                                   {/* CANVAS AREA */}
                                   <div className="flex-1 bg-slate-100 overflow-auto p-8 flex items-center justify-center relative">
                                      <div className="relative">
                                          {/* RULERS */}
                                          {showGrid && (() => {
                                             const pageIndex = selectedBook.contentConfig.pages.findIndex(p => p.id === selectedPageId);
                                             const isCover = pageIndex === 0 || pageIndex === selectedBook.contentConfig.pages.length - 1;
                                             
                                             let rulerW = selectedBook.features?.dimensions?.width || 210;
                                             let rulerH = selectedBook.features?.dimensions?.height || 210;

                                             if (viewMode === 'spread' && isCover) {
                                                const config = selectedBook.features?.printConfig?.cover;
                                                const bleed = config?.bleedMm || 0;
                                                const spine = config?.spineWidthMm || 0;
                                                rulerW = bleed + rulerW + spine + rulerW + bleed;
                                                rulerH = bleed + rulerH + bleed;
                                             } else if (viewMode === 'spread') {
                                                 rulerW = rulerW * 2;
                                             }
                                             
                                             return (
                                                 <>
                                                     <div className="absolute -top-6 left-0 right-0 h-6 bg-white/80 backdrop-blur border-b border-gray-300 z-10">
                                                         <Ruler sizeMm={rulerW} orientation="horizontal" />
                                                     </div>
                                                     <div className="absolute top-0 -left-6 bottom-0 w-6 bg-white/80 backdrop-blur border-r border-gray-300 z-10">
                                                         <Ruler sizeMm={rulerH} orientation="vertical" />
                                                     </div>
                                                     <div className="absolute -top-6 -left-6 w-6 h-6 bg-white border-r border-b border-gray-300 z-20 flex items-center justify-center text-[8px] text-gray-400 font-bold select-none">mm</div>
                                                 </>
                                             );
                                          })()}
                                          
                                          {/* Page Container */}
                                          <div 
                                             ref={canvasRef}
                                         className="transition-all duration-300 flex gap-0 shadow-2xl bg-white"
                                         style={{
                                            // Force single aspect ratio if viewing cover (since we now treat cover as single page)
                                            aspectRatio: (() => {
                                                if (viewMode === 'spread') {
                                                    // Determine if we are viewing cover or interior spread
                                                    const pages = selectedBook.contentConfig?.pages || [];
                                                    const idx = pages.findIndex(p => p.id === selectedPageId);
                                                    const isCover = idx === 0 || idx === pages.length - 1;
                                                    
                                                    if (isCover) {
                                                        const spineW = selectedBook.features?.printConfig?.cover?.spineWidthMm || 0;
                                                        // Use bookDimensions from state, safe guard against 0 height
                                                        const h = bookDimensions.height || 210;
                                                        const w = bookDimensions.width || 210;
                                                        const totalW = (w * 2) + spineW;
                                                        return `${totalW / h}/1`;
                                                    }
                                                    
                                                    return `${aspectRatio * 2}/1`;
                                                }
                                                return `${aspectRatio}/1`;
                                            })(),
                                            width: (viewMode === 'spread') 
                                               ? '90%' 
                                               : 'auto',
                                            height: (viewMode === 'spread') 
                                               ? 'auto' 
                                               : '90%',
                                            maxWidth: '100%',
                                            maxHeight: '100%'
                                         }}
                                      >
                                         
                                         {/* PAGE RENDERER */}
                                         {(() => {
                                            const currentPage = selectedBook.contentConfig.pages.find(p => p.id === selectedPageId);
                                            if (!currentPage) return null;
                                            
                                            const pageIndex = selectedBook.contentConfig.pages.findIndex(p => p.id === selectedPageId);
                                            const isFrontCover = pageIndex === 0;
                                            const isBackCover = pageIndex === selectedBook.contentConfig.pages.length - 1;
                                            const isCoverPage = isFrontCover || isBackCover;

                                            let pagesToShow = [];

                                            if (viewMode === 'spread' && isCoverPage) {
                                                // Cover Spread: Treat as a single page view, BUT combine back and front cover data
                                                // We will render a single container that spans both pages.
                                                // We use a dummy object that we'll catch in the map loop
                                                pagesToShow = [{ id: 'cover-spread', isSpread: true }];
                                            } else if (viewMode === 'spread') {
                                               // Interior Spreads Logic: Group by pairs (1-2, 3-4, etc.)
                                               // Index 1 (Page 1) & Index 2 (Page 2) -> Pair starting at 1
                                               // Index 3 (Page 3) & Index 4 (Page 4) -> Pair starting at 3
                                               
                                               const startIdx = pageIndex % 2 !== 0 ? pageIndex : pageIndex - 1;
                                               
                                               const leftPage = selectedBook.contentConfig.pages[startIdx];
                                               const rightPage = selectedBook.contentConfig.pages[startIdx + 1];
                                               
                                               // Ensure we don't include the Back Cover in an interior spread
                                               const isRightBackCover = (startIdx + 1) === (selectedBook.contentConfig.pages.length - 1);
                                               
                                               pagesToShow = [leftPage];
                                               if (rightPage && !isRightBackCover) {
                                                   pagesToShow.push(rightPage);
                                               }
                                               
                                               pagesToShow = pagesToShow.filter(Boolean);
                                            } else {
                                               pagesToShow = [currentPage].filter(Boolean);
                                            }

                                            return pagesToShow.map((page: any, idx) => {
                                               // SPECIAL COVER SPREAD RENDERING
                                               if (page.id === 'cover-spread') {
                                                   // Define dimensions
                                                   const trimWidth = selectedBook.features?.dimensions?.width || 210;
                                                   const trimHeight = selectedBook.features?.dimensions?.height || 210;
                                                   const rawSpineWidth = selectedBook.features?.printConfig?.cover?.spineWidthMm || 0;
                                                   const spineWidth = rawSpineWidth > 0 ? rawSpineWidth : 0;
                                                   
                                                   const config = selectedBook.features?.printConfig?.cover;
                                                   const bleedMm = config?.bleedMm || 0;
                                                   const safeMarginMm = config?.safeMarginMm || 0;

                                                   // Total Spread Dimensions (Bleed + Back + Spine + Front + Bleed)
                                                   const totalSpreadWidth = bleedMm + trimWidth + spineWidth + trimWidth + bleedMm;
                                                   const totalSpreadHeight = bleedMm + trimHeight + bleedMm;

                                                   // Helper to convert mm to %
                                                   const toPctX = (mm: number) => (mm / totalSpreadWidth) * 100;
                                                   const toPctY = (mm: number) => (mm / totalSpreadHeight) * 100;

                                                   // We treat Page 0 as the "Spread" page
                                                   const targetPage = selectedBook.contentConfig.pages[0];
                                                   if (!targetPage) return null;

                                                   return (
                                                       <div 
                                                           key="cover-spread" 
                                                           className={`flex-1 bg-white relative shadow-lg ring-1 ring-gray-200 ${showGrid ? 'overflow-visible' : 'overflow-hidden'}`}
                                                           onClick={(e) => {
                                                               e.stopPropagation();
                                                               setSelectedPageId(targetPage.id);
                                                           }}
                                                       >
                                                           {/* Label removed as requested */}
                                                           
                                                           {/* Selection Ring */}
                                                           {selectedPageId === targetPage.id && (
                                                              <div className="absolute inset-0 border-2 border-brand-coral z-40 pointer-events-none"></div>
                                                           )}

                                                           {/* GUIDES & GRID */}
                                                           {showGrid && (
                                                               <>
                                                                  {/* 1. TRIM LINES (Coupe) */}
                                                                  {/* Top & Bottom */}
                                                                  <div className="absolute left-0 right-0 border-t border-slate-900/20 z-40 pointer-events-none" style={{ top: `${toPctY(bleedMm)}%` }}></div>
                                                                  <div className="absolute left-0 right-0 border-b border-slate-900/20 z-40 pointer-events-none" style={{ bottom: `${toPctY(bleedMm)}%` }}></div>
                                                                  
                                                                  {/* Left (Back Trim) */}
                                                                  <div className="absolute top-0 bottom-0 border-l border-slate-900/20 z-40 pointer-events-none" style={{ left: `${toPctX(bleedMm)}%` }}></div>
                                                                  
                                                                  {/* Right (Front Trim) */}
                                                                  <div className="absolute top-0 bottom-0 border-r border-slate-900/20 z-40 pointer-events-none" style={{ right: `${toPctX(bleedMm)}%` }}></div>

                                                                  {/* Spine Lines (Fold) */}
                                                                  <div className="absolute top-0 bottom-0 border-l border-dashed border-purple-400 z-40 pointer-events-none" style={{ left: `${toPctX(bleedMm + trimWidth)}%` }}></div>
                                                                  <div className="absolute top-0 bottom-0 border-l border-dashed border-purple-400 z-40 pointer-events-none" style={{ left: `${toPctX(bleedMm + trimWidth + spineWidth)}%` }}></div>

                                                                  {/* 2. BLEED ZONES (Fonds Perdus) */}
                                                                  <div className="absolute inset-0 pointer-events-none z-50">
                                                                      {/* Top Strip */}
                                                                      <div className="absolute top-0 left-0 right-0 bg-cyan-500/10 border-b border-cyan-500 border-dashed" style={{ height: `${toPctY(bleedMm)}%` }}></div>
                                                                      {/* Bottom Strip */}
                                                                      <div className="absolute bottom-0 left-0 right-0 bg-cyan-500/10 border-t border-cyan-500 border-dashed" style={{ height: `${toPctY(bleedMm)}%` }}></div>
                                                                      {/* Left Strip */}
                                                                      <div className="absolute top-0 bottom-0 left-0 bg-cyan-500/10 border-r border-cyan-500 border-dashed" style={{ width: `${toPctX(bleedMm)}%` }}></div>
                                                                      {/* Right Strip */}
                                                                      <div className="absolute top-0 bottom-0 right-0 bg-cyan-500/10 border-l border-cyan-500 border-dashed" style={{ width: `${toPctX(bleedMm)}%` }}></div>
                                                                      
                                                                      {/* Label removed as requested */}
                                                                  </div>

                                                                  {/* 3. SAFE MARGINS (Zone de sécurité) */}
                                                                  {/* Back Cover Safe Zone */}
                                                                  <div className="absolute border border-dashed border-red-400 pointer-events-none z-50 opacity-50" style={{
                                                                      top: `${toPctY(bleedMm + safeMarginMm)}%`,
                                                                      bottom: `${toPctY(bleedMm + safeMarginMm)}%`,
                                                                      left: `${toPctX(bleedMm + safeMarginMm)}%`,
                                                                      width: `${toPctX(trimWidth - (2 * safeMarginMm))}%`
                                                                  }}></div>
                                                                  
                                                                  {/* Front Cover Safe Zone */}
                                                                  <div className="absolute border border-dashed border-red-400 pointer-events-none z-50 opacity-50" style={{
                                                                      top: `${toPctY(bleedMm + safeMarginMm)}%`,
                                                                      bottom: `${toPctY(bleedMm + safeMarginMm)}%`,
                                                                      right: `${toPctX(bleedMm + safeMarginMm)}%`,
                                                                      width: `${toPctX(trimWidth - (2 * safeMarginMm))}%`
                                                                  }}></div>

                                                                  {/* Spine Safe Zone? Usually just centered text */}
                                                               </>
                                                           )}

                                                           {/* CONTENT RENDERING (Using Page 0 Data) */}
                                                           
                                                           {/* 1. BASE LAYER */}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 -z-10">
                                                              {(() => {
                                                                 const bgImage = selectedBook.contentConfig.images.find(
                                                                    img => img.pageIndex === targetPage.pageNumber && 
                                                                          img.combinationKey === selectedVariant
                                                                 );
                                                                 if (bgImage?.imageUrl) return <img src={bgImage.imageUrl} className="w-full h-full object-cover" alt="Background" />;
                                                                 return null;
                                                              })()}
                                                           </div>

                                                           {/* 2. IMAGE LAYERS */}
                                                           {(selectedBook.contentConfig.imageElements || [])
                                                              .filter(el => el.position.pageIndex === targetPage.pageNumber && el.combinationKey === selectedVariant)
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

                                                           {/* 3. TEXT LAYERS */}
                                                           {selectedBook.contentConfig.texts
                                                              .filter(t => t.position.pageIndex === targetPage.pageNumber && t.combinationKey === selectedVariant)
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
                                                                        <div className={`font-medium w-full h-full pointer-events-none ${text.type === 'variable' ? 'text-purple-600 bg-purple-50/80 px-1 rounded inline-block' : 'text-slate-800'}`}>
                                                                           {(() => {
                                                                               const content = text.content || '';
                                                                               let processed = content.replace(/\{childName\}/g, '[Prénom]');
                                                                               return processed.replace(/\{(\d+\.\d+)\}/g, (match, key) => {
                                                                                   const [tabId, variantId] = key.split('.');
                                                                                   const tab = selectedBook.wizardConfig.tabs.find(t => t.id === tabId);
                                                                                   if (tab) {
                                                                                       const variant = tab.variants.find(v => v.id === variantId);
                                                                                       if (variant) {
                                                                                           return `[${tab.label}: ${variant.label}]`;
                                                                                       }
                                                                                   }
                                                                                   return match;
                                                                               });
                                                                           })()}
                                                                        </div>
                                                                    )}
                                                                 </div>
                                                              ))
                                                           }
                                                       </div>
                                                   );
                                               }

                                               // Determine margin config for this specific page
                                               const pIdx = selectedBook.contentConfig.pages.findIndex(p => p.id === page.id);
                                               const isThisPageCover = pIdx === 0 || pIdx === selectedBook.contentConfig.pages.length - 1;
                                               
                                               const config = isThisPageCover 
                                                  ? selectedBook.features?.printConfig?.cover 
                                                  : selectedBook.features?.printConfig?.interior;
                                                  
                                               const safeMarginMm = config?.safeMarginMm;
                                               const bleedMm = config?.bleedMm;

                                               return (
                                                  <div 
                                                     key={page.id} 
                                                     onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPageId(page.id);
                                                     }}
                                                     className={`flex-1 bg-white relative group border-r border-gray-100 last:border-0 transition-shadow duration-200 ${showGrid ? 'overflow-visible' : 'overflow-hidden'} ${selectedPageId === page.id ? 'ring-2 ring-brand-coral ring-inset z-10' : 'hover:ring-1 hover:ring-gray-300 ring-inset'}`}
                                                  >
                                                     {/* Label Overlay for Cover Spread */}
                                                     {viewMode === 'spread' && isCoverPage && (
                                                        <div className="absolute top-2 left-2 z-50 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                                           {pIdx === 0 ? 'Face Avant' : 'Dos / Arrière'}
                                                        </div>
                                                     )}
                                                     {/* TRIM LINE (Page Boundary) */}
                                                     {showGrid && (
                                                         <div className="absolute inset-0 border border-slate-900/20 z-40 pointer-events-none"></div>
                                                     )}
                                                     {/* 0. BLEED GUIDE (Fonds Perdus) - Outside Trim */}
                                                     {bleedMm && showGrid && (
                                                        <div 
                                                           className="absolute border-2 border-cyan-500 border-dashed pointer-events-none z-50 opacity-75"
                                                           style={{
                                                              left: `-${(bleedMm / bookDimensions.width) * 100}%`,
                                                              top: `-${(bleedMm / bookDimensions.height) * 100}%`,
                                                              right: `-${(bleedMm / bookDimensions.width) * 100}%`,
                                                              bottom: `-${(bleedMm / bookDimensions.height) * 100}%`,
                                                           }}
                                                        >
                                                           <div className="absolute -top-4 left-0 text-cyan-600 text-[9px] font-bold uppercase whitespace-nowrap bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-cyan-200">
                                                              Fonds Perdus ({bleedMm}mm)
                                                           </div>
                                                        </div>
                                                     )}
                                                     {/* Safe Margin Guide - Inside Trim */}
                                                     {safeMarginMm && showGrid && (
                                                        <div 
                                                           className="absolute border border-red-400 border-dashed pointer-events-none z-50 shadow-sm opacity-60"
                                                           style={{
                                                              left: `${(safeMarginMm / bookDimensions.width) * 100}%`,
                                                              top: `${(safeMarginMm / bookDimensions.height) * 100}%`,
                                                              right: `${(safeMarginMm / bookDimensions.width) * 100}%`,
                                                              bottom: `${(safeMarginMm / bookDimensions.height) * 100}%`,
                                                           }}
                                                        >
                                                           <div className="absolute top-0 right-0 bg-red-400 text-white text-[8px] px-1 font-bold rounded-bl opacity-80">
                                                              MARGE ({safeMarginMm}mm)
                                                           </div>
                                                        </div>
                                                     )}
                                                     {/* GRID OVERLAY */}
                                                     {showGrid && (
                                                         <div className="absolute inset-0 z-40 pointer-events-none" style={{
                                                             backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
                                                             backgroundSize: `${(10 / bookDimensions.width) * 100}% ${(10 / bookDimensions.height) * 100}%`
                                                         }}>
                                                             {/* Center Lines */}
                                                             <div className="absolute left-1/2 top-0 bottom-0 w-px bg-indigo-300 opacity-50"></div>
                                                             <div className="absolute top-1/2 left-0 right-0 h-px bg-indigo-300 opacity-50"></div>
                                                         </div>
                                                     )}
                                                     {/* 1. BASE LAYER (Background Variant) */}
                                                     <div 
                                                         className="absolute flex items-center justify-center bg-gray-50"
                                                         style={{
                                                            top: showGrid && bleedMm ? `-${(bleedMm / bookDimensions.height) * 100}%` : '0',
                                                            left: showGrid && bleedMm ? `-${(bleedMm / bookDimensions.width) * 100}%` : '0',
                                                            right: showGrid && bleedMm ? `-${(bleedMm / bookDimensions.width) * 100}%` : '0',
                                                            bottom: showGrid && bleedMm ? `-${(bleedMm / bookDimensions.height) * 100}%` : '0',
                                                         }}
                                                     >
                                                        {/* Find image for current variant & page */}
                                                        {(() => {
                                                           const bgImage = selectedBook.contentConfig.images.find(
                                                              img => img.pageIndex === page.pageNumber && 
                                                                    img.combinationKey === selectedVariant
                                                           );
                                                           
                                                           if (bgImage?.imageUrl) {
                                                              return <img src={bgImage.imageUrl} className="w-full h-full object-cover" alt="Background" />;
                                                           }
                                                           return null;
                                                        })()}
                                                     </div>
                                                     {/* 2. IMAGE LAYERS (Stickers/Overlays) */}
                                                     {(selectedBook.contentConfig.imageElements || [])
                                                        .filter(el => el.position.pageIndex === page.pageNumber && el.combinationKey === selectedVariant)
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
                                                     {/* 3. TEXT LAYERS */}
                                                     {selectedBook.contentConfig.texts
                                                        .filter(t => t.position.pageIndex === page.pageNumber && t.combinationKey === selectedVariant)
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
                                                                  <div className={`font-medium w-full h-full pointer-events-none ${text.type === 'variable' ? 'text-purple-600 bg-purple-50/80 px-1 rounded inline-block' : 'text-slate-800'}`}>
                                                                     {(() => {
                                                                         // Always try to replace variable placeholders, regardless of text type
                                                                         // Use [Friendly Name] format for readability in admin
                                                                         const content = text.content || '';
                                                                         let processed = content.replace(/\{childName\}/g, '[Prénom]');
                                                                         return processed.replace(/\{(\d+\.\d+)\}/g, (match, key) => {
                                                                             const [tabId, variantId] = key.split('.');
                                                                             const tab = selectedBook.wizardConfig.tabs.find(t => t.id === tabId);
                                                                             if (tab) {
                                                                                 const variant = tab.variants.find(v => v.id === variantId);
                                                                                 if (variant) {
                                                                                     return `[${tab.label}: ${variant.label}]`;
                                                                                 }
                                                                             }
                                                                             return match;
                                                                         });
                                                                     })()}
                                                                  </div>
                                                              )}
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

                                   {/* RIGHT PANEL: LAYERS & PROPERTIES */}
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
                                      
                                      {/* LAYERS TAB HEADER */}
                                      {activeRightTab === 'layers' && (<>
                                      <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Ordre d'affichage</span>
                                         
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
                                                     combinationKey: selectedVariant, // Strictly bind to current variant
                                                     position: { pageIndex: currentPage.pageNumber, zoneId: 'body', x: 0, y: 0, width: 30 }
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
                                                     combinationKey: selectedVariant, // Strictly bind to current variant
                                                     position: { pageIndex: currentPage.pageNumber, x: 0, y: 0, width: 20, height: 20 }
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
                                               .filter(t => t.position.pageIndex === currentPage.pageNumber && t.combinationKey === selectedVariant)
                                               .map(t => ({...t, _kind: 'text'}));
                                            
                                            const imgLayers = (selectedBook.contentConfig.imageElements || [])
                                               .filter(i => i.position.pageIndex === currentPage.pageNumber && i.combinationKey === selectedVariant)
                                               .map(i => ({...i, _kind: 'image'}));
                                            
                                            const allLayers = [...textLayers, ...imgLayers]; // Should sort by z-index ideally

                                            return allLayers.map(layer => (
                                               <div 
                                                  key={layer.id}
                                                  onClick={() => {
                                                      setActiveLayerId(layer.id);
                                                      // Optional: auto-switch to properties? Maybe better to stay on layers to manage order
                                                      // setActiveRightTab('properties'); 
                                                  }}
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
                                      </>)}

                                      {/* Properties Tab */}
                                      {activeRightTab === 'properties' && (
                                         <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
                                            {activeLayerId ? (
                                               <>
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
                                                        {/* Text Styling Options */}
                                                        {isText && (
                                                           <div>
                                                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Style du texte</label>
                                                              <div className="grid grid-cols-2 gap-2 mb-2">
                                                                  <div>
                                                                      <label className="text-[9px] text-gray-400 mb-0.5 block">Taille (px)</label>
                                                                      <input 
                                                                          type="number" 
                                                                          value={(layer as any).style?.fontSize ? parseInt((layer as any).style.fontSize) : 16} 
                                                                          onChange={(e) => updateLayer({style: {...(layer as any).style, fontSize: `${e.target.value}px`}})} 
                                                                          className="w-full text-xs border border-gray-300 rounded px-2 py-1" 
                                                                      />
                                                                  </div>
                                                                  <div>
                                                                      <label className="text-[9px] text-gray-400 mb-0.5 block">Couleur</label>
                                                                      <div className="flex gap-2 items-center">
                                                                          <input 
                                                                              type="color" 
                                                                              value={(layer as any).style?.color || '#000000'} 
                                                                              onChange={(e) => updateLayer({style: {...(layer as any).style, color: e.target.value}})} 
                                                                              className="w-8 h-7 p-0 border border-gray-300 rounded cursor-pointer" 
                                                                          />
                                                                          <span className="text-[10px] text-gray-500 font-mono">{(layer as any).style?.color || '#000000'}</span>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                              <div className="flex gap-1">
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, fontWeight: (layer as any).style?.fontWeight === 'bold' ? 'normal' : 'bold'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs font-bold transition-colors ${(layer as any).style?.fontWeight === 'bold' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Gras"
                                                                  >
                                                                      B
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, fontStyle: (layer as any).style?.fontStyle === 'italic' ? 'normal' : 'italic'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs italic transition-colors ${(layer as any).style?.fontStyle === 'italic' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Italique"
                                                                  >
                                                                      I
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, textDecoration: (layer as any).style?.textDecoration === 'underline' ? 'none' : 'underline'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs underline transition-colors ${(layer as any).style?.textDecoration === 'underline' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Souligné"
                                                                  >
                                                                      U
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, textAlign: 'left'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs transition-colors ${(layer as any).style?.textAlign === 'left' || !(layer as any).style?.textAlign ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Aligner à gauche"
                                                                  >
                                                                      L
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, textAlign: 'center'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs transition-colors ${(layer as any).style?.textAlign === 'center' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Centrer"
                                                                  >
                                                                      C
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => updateLayer({style: {...(layer as any).style, textAlign: 'right'}})}
                                                                      className={`flex-1 py-1.5 border rounded text-xs transition-colors ${(layer as any).style?.textAlign === 'right' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                      title="Aligner à droite"
                                                                  >
                                                                      R
                                                                  </button>
                                                              </div>
                                                              <div className="mt-2">
                                                                  <label className="text-[9px] text-gray-400 mb-0.5 block">Police</label>
                                                                  <div className="relative">
                                                                      <input
                                                                          type="text"
                                                                          placeholder="Rechercher une police..."
                                                                          value={fontSearch}
                                                                          onChange={(e) => setFontSearch(e.target.value)}
                                                                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-1"
                                                                      />
                                                                      <select 
                                                                          value={(layer as any).style?.fontFamily || 'Inter'} 
                                                                          onChange={(e) => {
                                                                              const newFont = e.target.value;
                                                                              loadFont(newFont);
                                                                              updateLayer({style: {...(layer as any).style, fontFamily: newFont}});
                                                                          }}
                                                                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                                                          size={5} // Show multiple options to make scrolling easier
                                                                      >
                                                                          <option value="Inter">Inter (Default)</option>
                                                                          {availableFonts
                                                                              .filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()))
                                                                              .slice(0, 100) // Limit results for performance
                                                                              .map(font => (
                                                                              <option key={font} value={font} style={{ fontFamily: font }}>
                                                                                  {font}
                                                                              </option>
                                                                          ))}
                                                                      </select>
                                                                      <div className="text-[9px] text-gray-400 mt-1 text-right">
                                                                          {availableFonts.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())).length} polices trouvées
                                                                      </div>
                                                                  </div>
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
                                                                    value={(() => {
                                                                       // HYDRATE: ID -> Friendly Label
                                                                       const text = (layer as any).content || '';
                                                                       let processed = text.replace(/\{childName\}/g, '[Prénom]');
                                                                       return processed.replace(/\{(\d+\.\d+)\}/g, (match: string, key: string) => {
                                                                          const [tabId, variantId] = key.split('.');
                                                                          const tab = selectedBook.wizardConfig.tabs.find(t => t.id === tabId);
                                                                          if (tab) {
                                                                              const variant = tab.variants.find(v => v.id === variantId);
                                                                              if (variant) {
                                                                                  return `[${tab.label}: ${variant.label}]`;
                                                                              }
                                                                          }
                                                                          return match;
                                                                       });
                                                                    })()}
                                                                    onChange={(e) => {
                                                                       // DEHYDRATE: Friendly Label -> ID
                                                                       let val = e.target.value;
                                                                       val = val.replace(/\[Prénom\]/g, '{childName}');
                                                                       val = val.replace(/\[([^:]+): ([^\]]+)\]/g, (match, tabLabel, varLabel) => {
                                                                          const tab = selectedBook.wizardConfig.tabs.find(t => t.label === tabLabel);
                                                                          if (tab) {
                                                                               const variant = tab.variants.find(v => v.label === varLabel);
                                                                               if (variant) {
                                                                                   return `{${tab.id}.${variant.id}}`;
                                                                               }
                                                                          }
                                                                          return match;
                                                                       });
                                                                       updateLayer({content: val});
                                                                    }}
                                                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-24 font-mono leading-relaxed"
                                                                    placeholder="Écrivez votre texte ici... Utilisez [Tab: Variante] pour les variables."
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
                                                                 <div className="flex flex-col gap-2">
                                                                    <input 
                                                                       type="text" 
                                                                       placeholder="URL de l'image"
                                                                       value={(layer as any).url || ''}
                                                                       onChange={(e) => updateLayer({url: e.target.value})}
                                                                       className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                    <div className="relative">
                                                                      <input 
                                                                         type="file" 
                                                                         accept="image/*"
                                                                         onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const reader = new FileReader();
                                                                                reader.onloadend = () => {
                                                                                    updateLayer({url: reader.result as string});
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                            }
                                                                         }}
                                                                         className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                                      />
                                                                    </div>
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
                                                                 <input type="number" value={layer.position.x || 0} onChange={(e) => updateLayer({position: {...layer.position, x: parseFloat(e.target.value) || 0}})} className="w-12 text-xs border rounded p-1" />
                                                              </div>
                                                              <div>
                                                                 <span className="text-[10px] text-gray-400 mr-1">Y</span>
                                                                 <input type="number" value={layer.position.y || 0} onChange={(e) => updateLayer({position: {...layer.position, y: parseFloat(e.target.value) || 0}})} className="w-12 text-xs border rounded p-1" />
                                                              </div>
                                                              <div>
                                                                 <span className="text-[10px] text-gray-400 mr-1">W</span>
                                                                 <input type="number" value={layer.position.width || 0} onChange={(e) => updateLayer({position: {...layer.position, width: parseFloat(e.target.value) || 0}})} className="w-12 text-xs border rounded p-1" />
                                                              </div>
                                                              <div>
                                                                 <span className="text-[10px] text-gray-400 mr-1">H</span>
                                                                 <input type="number" value={layer.position.height || 0} onChange={(e) => updateLayer({position: {...layer.position, height: parseFloat(e.target.value) || 0}})} className="w-12 text-xs border rounded p-1" />
                                                              </div>
                                                              <div>
                                                                 <span className="text-[10px] text-gray-400 mr-1">Rot</span>
                                                                 <input type="number" value={layer.position.rotation || 0} onChange={(e) => updateLayer({position: {...layer.position, rotation: parseFloat(e.target.value) || 0}})} className="w-12 text-xs border rounded p-1" />
                                                              </div>
                                                           </div>
                                                        </div>
                                                     </>
                                                  );
                                               })()}
                                               </div>
                                               
                                               {/* Delete Layer Button - Fixed at bottom of properties panel */}
                                               <div className="mt-auto p-4 border-t border-gray-200 bg-white">
                                                  
                                               </div>
                                               </>
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
