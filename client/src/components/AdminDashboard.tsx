import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Home, BarChart3, Globe, Book, User, Users, FileText, Image, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Layers, Type, Layout, Eye, Copy, Filter, Image as ImageIcon, Box, X, ArrowUp, ArrowDown, ChevronDown, Menu, ShoppingBag, PenTool, Truck, Package, Printer, Download, Barcode, Search, ArrowLeft, ArrowRight, RotateCcw, MessageSquare, Send, MapPin, Clock, Zap, Columns, HelpCircle, FileCode, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Theme } from '../types';
import { BookProduct, WizardTab, TextElement, PageDefinition, ImageElement, Printer as PrinterType } from '../types/admin';
import { ShippingZone, ShippingMethod } from '../types/ecommerce';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { useEcommerce } from '../context/EcommerceContext';
import { MenuItem, MenuColumn } from '../types/menu';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
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

import { readPsd } from 'ag-psd';
import { parseHtmlFile, parseZipFile } from '../utils/htmlImporter';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const { books, addBook, updateBook, deleteBook } = useBooks();
  const { mainMenu, setMainMenu, updateMenuItem, addMenuItem, deleteMenuItem } = useMenus();
  const { 
    customers, 
    orders, 
    shippingZones,
    defaultShippingRate,
    updateDefaultShippingRate,
    addShippingZone,
    updateShippingZone,
    deleteShippingZone,
    updateOrderStatus, 
    updateOrderTracking, 
    getOrdersByCustomer, 
    addOrderLog, 
    createOrder, 
    updateCustomer, 
    addCustomer 
  } = useEcommerce();
  
  const [activeTab, setActiveTab] = useState<'home' | 'books' | 'wizard' | 'avatars' | 'content' | 'menus' | 'customers' | 'orders' | 'printers' | 'settings' | 'analytics' | 'shipping'>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFulfillment, setShowFulfillment] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  // Import State
  const [pendingImportPageId, setPendingImportPageId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [importSessionTexts, setImportSessionTexts] = useState<TextElement[]>([]);
  const [importSessionImages, setImportSessionImages] = useState<ImageElement[]>([]);
  const [importSessionDimensions, setImportSessionDimensions] = useState<{ width: number, height: number } | null>(null);


  // Shipping Zone State
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

    const handleCapturePreview = async () => {
        const iframe = document.querySelector('iframe[title="HTML Preview"]') as HTMLIFrameElement;
        if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
            toast.error("Impossible de trouver le contenu de l'aperçu");
            return;
        }
    
        try {
            toast.info("Génération de l'image (JPEG) en cours...");
            
            const canvas = await html2canvas(iframe.contentDocument.body, {
                scale: 2, 
                useCORS: true,
                logging: false,
                width: iframe.contentDocument.documentElement.scrollWidth,
                height: iframe.contentDocument.documentElement.scrollHeight,
                windowWidth: iframe.contentDocument.documentElement.scrollWidth,
                windowHeight: iframe.contentDocument.documentElement.scrollHeight
            });
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            // Trigger Download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `preview-capture-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Determine target page index
            let targetPageIndex = 1;
            if (pendingImportPageId && selectedBook) {
                 const p = selectedBook.contentConfig.pages.find(page => page.id === pendingImportPageId);
                 if (p) targetPageIndex = p.pageNumber;
            }
            
            const newImage: ImageElement = {
                id: `img-capture-${Date.now()}`,
                label: 'Capture HTML',
                type: 'static',
                url: dataUrl,
                combinationKey: 'default',
                position: {
                    pageIndex: targetPageIndex,
                    x: 0, y: 0, 
                    width: 100, height: 100, 
                    rotation: 0,
                    layer: 10 
                }
            };
    
            if (selectedBook) {
                handleSaveBook({
                    ...selectedBook,
                    contentConfig: {
                        ...selectedBook.contentConfig,
                        imageElements: [...(selectedBook.contentConfig.imageElements || []), newImage]
                    }
                });
                toast.success("Capture téléchargée et ajoutée au livre !");
            }
    
        } catch (e) {
            console.error("Capture failed", e);
            toast.error("Erreur lors de la capture");
        }
    };

    const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, menuIdx: number, colIdx?: number) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const menu = mainMenu[menuIdx];
      
      if (colIdx !== undefined && menu.columns) {
        // Reorder column items
        const col = menu.columns[colIdx];
        const oldIndex = col.items.indexOf(active.id as string);
        const newIndex = col.items.indexOf(over!.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(col.items, oldIndex, newIndex);
            const newCols = [...menu.columns];
            newCols[colIdx] = { ...col, items: newItems };
            updateMenuItem(menuIdx, { ...menu, columns: newCols });
        }
      } else if (menu.items) {
        // Reorder simple items
        const oldIndex = menu.items.indexOf(active.id as string);
        const newIndex = menu.items.indexOf(over!.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(menu.items, oldIndex, newIndex);
            updateMenuItem(menuIdx, { ...menu, items: newItems });
        }
      }
    }
  };

  // Fulfillment Tracking State
  const [fulfillmentTracking, setFulfillmentTracking] = useState('');

  // Menu Dirty State Tracking
  const [originalMainMenu, setOriginalMainMenu] = useState<MenuItem[]>([]);

  // Update original menu state when entering the tab
  React.useEffect(() => {
    if (activeTab === 'menus') {
        setOriginalMainMenu(JSON.parse(JSON.stringify(mainMenu)));
    }
  }, [activeTab]);

  const handleSaveMenu = (idx: number) => {
      const newOriginals = [...originalMainMenu];
      newOriginals[idx] = JSON.parse(JSON.stringify(mainMenu[idx]));
      setOriginalMainMenu(newOriginals);
      toast.success('Menu enregistré avec succès');
  };

  // Edit Customer State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
          street: '',
          zipCode: '',
          city: '',
          country: ''
      }
  });
  
  // New Order Form State
  const [newOrderForm, setNewOrderForm] = useState({
      customer: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: {
              street: '',
              zipCode: '',
              city: '',
              country: 'France'
          }
      },
      items: [
          {
              bookId: '',
              quantity: 1,
              config: '{\n  "name": "",\n  "gender": "boy"\n}'
          }
      ]
  });

  // Order Filters State
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  
  // Customer Creation State
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
          street: '',
          zipCode: '',
          city: '',
          country: 'France'
      }
  });

  // Order Status Draft State
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  // Export Function
  const handleExport = () => {
    const ordersToExport = selectedOrderIds.size > 0 
      ? orders.filter(o => selectedOrderIds.has(o.id))
      : orders;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Date,Client,Email,Statut,Total,Tracking\n"
      + ordersToExport.map(o => `${o.id},${o.createdAt},${o.customerName},${o.customerEmail},${o.status},${o.totalAmount},${o.trackingNumber || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `commandes_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${ordersToExport.length} commandes exportées avec succès`);
  };

  const handleExportCustomers = () => {
    const customersToExport = customers;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Nom,Email,Téléphone,Ville,Commandes,Total Dépensé\n"
      + customersToExport.map(c => `${c.id},${c.firstName} ${c.lastName},${c.email},${c.phone || ''},${c.address?.city || ''},${c.orderCount},${c.totalSpent}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${customersToExport.length} clients exportés avec succès`);
  };

  const handleCreateCustomer = () => {
      setIsCreatingCustomer(true);
  };

  const submitNewCustomer = () => {
      if (!newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email) {
          toast.error("Veuillez remplir les informations obligatoires");
          return;
      }

      const newCustomer = {
          id: Date.now().toString(),
          firstName: newCustomerForm.firstName,
          lastName: newCustomerForm.lastName,
          email: newCustomerForm.email,
          phone: newCustomerForm.phone,
          address: newCustomerForm.address,
          createdAt: new Date().toISOString(),
          orderCount: 0,
          totalSpent: 0
      };

      addCustomer(newCustomer);
      toast.success("Client créé avec succès !");
      setIsCreatingCustomer(false);
      setNewCustomerForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: {
              street: '',
              zipCode: '',
              city: '',
              country: 'France'
          }
      });
  };

  // Create Order Handler
  const handleCreateOrder = () => {
     setIsCreatingOrder(true);
  };

  const submitNewOrder = () => {
      // Validation simple
      if (!newOrderForm.customer.lastName || !newOrderForm.customer.email) {
          toast.error("Veuillez remplir les informations client obligatoires");
          return;
      }
      
      let itemConfig = {};
      try {
        // @ts-ignore
        itemConfig = JSON.parse(newOrderForm.items[0].config);
      } catch (e) {
        toast.error("La configuration doit être un JSON valide");
        return;
      }

      const selectedBook = books.find(b => b.id === newOrderForm.items[0].bookId) || books[0];
      
      const orderItems = newOrderForm.items.map(item => {
          const book = books.find(b => b.id === item.bookId) || books[0];
          return {
              productId: book.id,
              bookTitle: book.name,
              quantity: item.quantity,
              price: book.price,
              config: itemConfig
          };
      });

      const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      createOrder(newOrderForm.customer, orderItems, totalAmount);
      toast.success("Commande créée avec succès !");
      setIsCreatingOrder(false);
      
      // Reset form
      setNewOrderForm({
          customer: {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              address: {
                  street: '',
                  zipCode: '',
                  city: '',
                  country: 'France'
              }
          },
          items: [
              {
                  bookId: books[0]?.id || '',
                  quantity: 1,
                  config: '{\n  "name": "",\n  "gender": "boy"\n}'
              }
          ]
      });
  };

  React.useEffect(() => {
    setDraftStatus(null);
    setSelectedOrderIds(new Set()); // Clear selection when switching tabs or clicking an order
  }, [selectedOrderId, activeTab]);

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

  // Compute available variable options based on selected book wizard config
  const variableOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
        { value: '', label: '-- Texte Fixe --' }
    ];

    if (selectedBook?.wizardConfig?.tabs) {
        selectedBook.wizardConfig.tabs.forEach(tab => {
            if (tab.variants) {
                tab.variants.forEach(variant => {
                    if (variant.type === 'text') {
                        options.push({
                            value: `{{${variant.id}}}`,
                            label: `${variant.title || variant.label} (${variant.id})`
                        });
                    }
                });
            }
        });
    }

    // Add standard/global variables ONLY if strictly necessary and standard for all books
    // For now, we only include "dedication" which is a system-level variable not always in wizard
    const standardVars = [
        { id: 'dedication', label: 'Dédicace' }
    ];

    standardVars.forEach(stdVar => {
        const key = `{{${stdVar.id}}}`;
        if (!options.some(o => o.value === key)) {
             options.push({
                value: key,
                label: `${stdVar.label} (${stdVar.id})`
            });
        }
    });

    return options;
  }, [selectedBook]);
  
  // Effect to load all fonts used in the book
  React.useEffect(() => {
    if (!selectedBook?.contentConfig?.texts) return;
    
    const usedFonts = new Set<string>();
    selectedBook.contentConfig.texts.forEach(text => {
        if (text.style?.fontFamily) {
            usedFonts.add(text.style.fontFamily);
        }
    });

    usedFonts.forEach(font => {
         const href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
         if (!document.querySelector(`link[href="${href}"]`)) {
             const link = document.createElement('link');
             link.href = href;
             link.rel = 'stylesheet';
             document.head.appendChild(link);
         }
    });
  }, [selectedBook?.contentConfig?.texts]);

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
  const [zoomLevel, setZoomLevel] = useState(1);
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
        const ids = combo.map((o: any) => o.id); // Remove sort to avoid collisions (e.g. A_B vs B_A)
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
       
       // Key is combination of option IDs (preserve order for uniqueness)
       const key = parts.map((p: any) => p.id).join('_');
       
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
  const wizardFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportContent = () => {
    if (!selectedBook) return;

    // Filter out orphaned elements (elements pointing to non-existent pages)
    // We strictly use pageNumber as the reference since that's what we use in rendering
    const validPageNumbers = new Set(selectedBook.contentConfig.pages.map(p => p.pageNumber));
    
    // Create a clean copy of content config removing orphaned items and stripping 'zoneId' from position
    const cleanContentConfig = {
      ...selectedBook.contentConfig,
      texts: selectedBook.contentConfig.texts
          .filter(t => validPageNumbers.has(t.position.pageIndex))
          .map(({ position, ...rest }) => {
            // Remove 'zoneId' from position object
            const { zoneId, ...cleanPosition } = position;
            return {
              ...rest, // This includes 'type', 'style' (font, size, etc.), 'content', etc.
              position: cleanPosition
            };
          }),
      images: selectedBook.contentConfig.images.filter(i => validPageNumbers.has(i.pageIndex)),
      imageElements: (selectedBook.contentConfig.imageElements || []).filter(i => validPageNumbers.has(i.position.pageIndex))
    };

    // Export ONLY content config + features (dimensions)
    // EXCLUDING wizardConfig to respect scope
    // We strictly filter features to only export layout-related data (dimensions, printConfig)
    const exportData = {
      type: 'content_config',
      timestamp: new Date().toISOString(),
      contentConfig: cleanContentConfig,
      features: {
          dimensions: selectedBook.features?.dimensions,
          printConfig: selectedBook.features?.printConfig
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(selectedBook.name || 'book')}_content_config_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Configuration Contenu exportée (Pages, Textes, Images)');
  };

    const handleImportContent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBook) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedData: any;

        // Try to detect if it's our HTML master template
        if (content.trim().toLowerCase().startsWith('<!doctype html') || content.includes('<html')) {
             const parser = new DOMParser();
             const doc = parser.parseFromString(content, 'text/html');
             const scriptContent = doc.getElementById('book-config')?.textContent;
             
             if (scriptContent) {
                 importedData = JSON.parse(scriptContent);
                 toast.success('Configuration extraite du Template HTML Maître');
             } else {
                 throw new Error('Script JSON #book-config introuvable dans le fichier HTML');
             }
        } else {
            // Assume standard JSON file
            importedData = JSON.parse(content);
        }

        // Validation: Check if contentConfig exists
        if (!importedData.contentConfig) {
          toast.error('Format invalide : Ce fichier ne contient pas une configuration de contenu valide');
          return;
        }

        if (confirm('Attention : Cette action va remplacer la configuration du CONTENU (Pages, Textes, Images). Le Wizard (Personnages) ne sera PAS modifié. Voulez-vous continuer ?')) {
          
          handleSaveBook({
            ...selectedBook,
            // ONLY Update Content + Features (Layout related only)
            contentConfig: importedData.contentConfig,
            features: {
                ...selectedBook.features, // Preserve existing features (languages, formats, customization)
                ...(importedData.features ? {
                    dimensions: importedData.features.dimensions,
                    printConfig: importedData.features.printConfig
                } : {})
            },
            
            // PRESERVE Wizard
            wizardConfig: selectedBook.wizardConfig
          });
          toast.success('Configuration Contenu importée avec succès');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Erreur lors de l\'import du fichier : ' + (error as Error).message);
      }
      
      // Reset input
      if (event.target) event.target.value = '';
    };
    reader.readAsText(file);
  };

  // --- WIZARD HANDLERS (Scoped to Wizard Tab) ---
  const handleExportWizard = () => {
      if (!selectedBook) return;
      const exportData = {
          type: 'wizard_config',
          timestamp: new Date().toISOString(),
          wizardConfig: selectedBook.wizardConfig
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(selectedBook.name || 'book')}_wizard_config_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Configuration Wizard exportée');
  };

  const handleImportWizard = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedBook) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const imported = JSON.parse(e.target?.result as string);
              if (!imported.wizardConfig) {
                  toast.error('Format invalide (wizardConfig manquant)');
                  return;
              }
              if (confirm('Remplacer toute la configuration du Wizard (Personnages, Variantes) ?')) {
                  handleSaveBook({
                      ...selectedBook,
                      wizardConfig: imported.wizardConfig
                  });
                  toast.success('Configuration Wizard importée');
              }
          } catch (err) {
              toast.error('Erreur de lecture du fichier');
          }
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
               onClick={() => { setActiveTab('shipping'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'shipping' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Truck size={18} />
                <span>Expédition</span>
             </button>

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

                     <button
                        onClick={() => {
                           if (selectedBookId) {
                               window.open(`/?preview_book=${selectedBook.id}`, '_blank');
                           }
                        }}
                        className="w-full font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer mt-3"
                     >
                        <Eye size={14} />
                        Voir le site
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
                    activeTab === 'shipping' ? 'Expédition' :
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
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de contact</label>
                                <input 
                                   type="email" 
                                   value={settings.general.supportEmail}
                                   onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
                                <select 
                                   value={settings.general.currency}
                                   onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Express (€)</label>
                                <input 
                                   type="number" 
                                   step="0.1"
                                   value={settings.shipping.expressRate}
                                   onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, expressRate: parseFloat(e.target.value)}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil Gratuité (€)</label>
                                <input 
                                   type="number" 
                                   value={settings.shipping.freeShippingThreshold}
                                   onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, freeShippingThreshold: parseFloat(e.target.value)}})}
                                   className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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

                    <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50/50">
                          <div>
                             <h3 className="font-bold text-red-800 text-lg">Zone de Danger</h3>
                             <p className="text-sm text-red-500">Gestion des données locales</p>
                          </div>
                       </div>
                       <div className="p-6">
                          <p className="text-sm text-slate-600 mb-4">
                             Cette application utilise le stockage local de votre navigateur (LocalStorage) pour sauvegarder vos données (Livres, Commandes, Clients, Réglages). 
                             Si vous souhaitez réinitialiser l'application à son état d'origine (données de démonstration), vous pouvez effacer les données locales ci-dessous.
                          </p>
                          <button 
                             onClick={() => {
                                if (confirm('Attention : Toutes vos modifications seront perdues. Voulez-vous vraiment réinitialiser toutes les données ?')) {
                                   localStorage.clear();
                                   window.location.reload();
                                }
                             }}
                             className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-red-50 transition-colors shadow-sm"
                          >
                             <Trash2 size={16} /> Réinitialiser toutes les données
                          </button>
                          <button 
                             onClick={() => {
                                if (confirm('Attention : Tous vos livres seront supprimés et réinitialisés aux valeurs par défaut. Voulez-vous continuer ?')) {
                                   localStorage.removeItem('admin_books');
                                   window.location.reload();
                                }
                             }}
                             className="bg-white border border-orange-200 text-orange-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-orange-50 transition-colors shadow-sm mt-3"
                          >
                             <Book size={16} /> Réinitialiser uniquement les livres
                          </button>
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
                           <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative">
                              {book.coverImage ? (
                                <img src={book.coverImage} alt={book.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                   <Book size={24} />
                                </div>
                              )}
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

                           <div className="shrink-0 flex items-center gap-2">
                              <button 
                                onClick={() => { setSelectedBookId(book.id); setIsEditing(true); }}
                                className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-brand-coral hover:text-white transition-colors"
                              >
                                Configurer
                              </button>
                              <button 
                                onClick={() => {
                                   if (confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) {
                                      deleteBook(book.id);
                                   }
                                }}
                                className="bg-slate-100 text-slate-400 px-3 py-2.5 rounded-lg font-bold text-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Supprimer le livre"
                              >
                                <Trash2 size={18} />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* --- VIEW: ORDERS --- */}
              {activeTab === 'orders' && !selectedOrderId && !isCreatingOrder && (
                <div className="space-y-4">
                   <div className="flex flex-col gap-4">
                      <div className="flex justify-end items-center">
                         <div className="flex gap-2">
                            <button 
                               onClick={handleExport}
                               className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                               <Download size={16} />
                               Exporter {selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''}
                            </button>
                            <button 
                               onClick={handleCreateOrder}
                               className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800 flex items-center gap-2"
                            >
                               <Plus size={16} />
                               Créer une commande
                            </button>
                         </div>
                      </div>

                      {/* Filters & Search Bar */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                         <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 px-2">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                               <button 
                                  onClick={() => setOrderFilter(null)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${!orderFilter ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                               >
                                  Tout
                               </button>
                               <button 
                                  onClick={() => setOrderFilter('pending')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === 'pending' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                               >
                                  En attente
                               </button>
                               <button 
                                  onClick={() => setOrderFilter('processing')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === 'processing' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                               >
                                  En cours
                               </button>
                               <button 
                                  onClick={() => setOrderFilter('shipped')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === 'shipped' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                               >
                                  Expédiée
                               </button>
                               <button 
                                  onClick={() => setOrderFilter('delivered')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === 'delivered' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                               >
                                  Livrée
                               </button>
                               <button 
                                  onClick={() => setOrderFilter('cancelled')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === 'cancelled' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                               >
                                  Annulée
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
                                        <input 
                                           type="checkbox" 
                                           className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                                           checked={orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id))}
                                           onChange={(e) => {
                                              if (e.target.checked) {
                                                 const allIds = orders.map(o => o.id);
                                                 setSelectedOrderIds(new Set(allIds));
                                              } else {
                                                 setSelectedOrderIds(new Set());
                                              }
                                           }}
                                        />
                                     </th>
                                     <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id')}>
                                         <div className="flex items-center gap-1">
                                             Commande
                                             {sortConfig?.key === 'id' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                     <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                                         <div className="flex items-center gap-1">
                                             Date
                                             {sortConfig?.key === 'createdAt' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                     <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('customerName')}>
                                         <div className="flex items-center gap-1">
                                             Client
                                             {sortConfig?.key === 'customerName' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                     <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalAmount')}>
                                         <div className="flex items-center justify-end gap-1">
                                             Total
                                             {sortConfig?.key === 'totalAmount' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                     <th className="px-4 py-3 font-semibold">Statut paiement</th>
                                     <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                                         <div className="flex items-center gap-1">
                                             Statut traitement
                                             {sortConfig?.key === 'status' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                     <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('items')}>
                                         <div className="flex items-center gap-1">
                                             Articles
                                             {sortConfig?.key === 'items' && (
                                                 sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                             )}
                                         </div>
                                     </th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-50">
                                  {orders
                                     .filter(order => !orderFilter || order.status === orderFilter)
                                     .sort((a, b) => {
                                        if (!sortConfig) return 0;
                                        const { key, direction } = sortConfig;
                                        
                                        // Handle specific fields
                                        let aValue: any = a[key as keyof typeof a];
                                        let bValue: any = b[key as keyof typeof b];

                                        if (key === 'items') {
                                            aValue = a.items.length;
                                            bValue = b.items.length;
                                        }
                                        
                                        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                                        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                                        return 0;
                                     })
                                     .map(order => {
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
                                        <tr key={order.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => setSelectedOrderId(order.id)}>
                                           <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                              <input 
                                                 type="checkbox" 
                                                 className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                                                 checked={selectedOrderIds.has(order.id)}
                                                 onChange={(e) => {
                                                    e.stopPropagation(); // Prevent row click
                                                    const newSelected = new Set(selectedOrderIds);
                                                    if (e.target.checked) {
                                                       newSelected.add(order.id);
                                                    } else {
                                                       newSelected.delete(order.id);
                                                    }
                                                    setSelectedOrderIds(newSelected);
                                                 }}
                                              />
                                           </td>
                                           <td className="px-4 py-3 font-bold text-slate-900 group-hover:underline">#{order.id.slice(0,8)}</td>
                                           <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                              {new Date(order.createdAt).toLocaleDateString()}
                                              <span className="text-slate-400 ml-1 text-[10px]">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                           </td>
                                           <td className="px-4 py-3">
                                              <div className="font-medium text-slate-900">{order.customerName}</div>
                                           </td>
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

              {/* --- VIEW: CREATE ORDER --- */}
              {activeTab === 'orders' && isCreatingOrder && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                       <button onClick={() => setIsCreatingOrder(false)} className="text-slate-400 hover:text-slate-600">
                          <ArrowUp className="-rotate-90" size={20} />
                       </button>
                       <h2 className="text-2xl font-bold text-slate-800">Nouvelle Commande</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {/* Customer Info */}
                        <div className="col-span-2 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <User size={18} className="text-indigo-600" />
                                        Informations Client
                                    </h3>
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        <button 
                                            onClick={() => setIsNewCustomer(true)}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isNewCustomer ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Nouveau
                                        </button>
                                        <button 
                                            onClick={() => setIsNewCustomer(false)}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isNewCustomer ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Existant
                                        </button>
                                    </div>
                                </div>

                                {!isNewCustomer && (
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    readOnly
                                                    placeholder="Sélectionner un client..."
                                                    value={newOrderForm.customer.email ? `${newOrderForm.customer.firstName} ${newOrderForm.customer.lastName}` : ''}
                                                    className="w-full text-sm border-gray-300 rounded-lg pl-10 pr-3 py-2 bg-slate-50 focus:ring-brand-coral focus:border-brand-coral cursor-pointer"
                                                    onClick={() => setIsCustomerSearchOpen(true)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => setIsCustomerSearchOpen(true)}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg border border-slate-200 transition-colors"
                                                title="Rechercher (F4)"
                                            >
                                                <Search size={20} />
                                            </button>
                                        </div>

                                        <Dialog open={isCustomerSearchOpen} onOpenChange={setIsCustomerSearchOpen}>
                                            <DialogContent className="max-w-4xl h-[70vh] flex flex-col p-0 gap-0 bg-slate-50 overflow-hidden outline-none">
                                                {/* Header */}
                                                <div className="p-6 bg-white border-b border-gray-200">
                                                    <DialogHeader className="mb-4">
                                                        <DialogTitle className="text-xl">Rechercher un client</DialogTitle>
                                                        <DialogDescription>
                                                            Recherchez et sélectionnez un client pour pré-remplir la commande.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                        <input
                                                            type="text"
                                                            placeholder="Rechercher par nom, email, téléphone..."
                                                            value={customerSearch}
                                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                                            autoFocus
                                                            className="w-full border-gray-200 bg-slate-50 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base shadow-sm outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 overflow-y-auto bg-white p-0">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                                            <tr>
                                                                <th className="px-6 py-3">Nom</th>
                                                                <th className="px-6 py-3">Email</th>
                                                                <th className="px-6 py-3">Ville</th>
                                                                <th className="px-6 py-3 text-right">Dernière commande</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {customers
                                                                .filter(c => 
                                                                    c.firstName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                                    c.lastName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                                    c.email.toLowerCase().includes(customerSearch.toLowerCase())
                                                                )
                                                                .map(c => (
                                                                    <tr 
                                                                        key={c.id} 
                                                                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                                                                        onClick={() => {
                                                                            setNewOrderForm({
                                                                                ...newOrderForm,
                                                                                customer: {
                                                                                    firstName: c.firstName,
                                                                                    lastName: c.lastName,
                                                                                    email: c.email,
                                                                                    phone: c.phone || '',
                                                                                    address: {
                                                                                        street: c.address?.street || '',
                                                                                        zipCode: c.address?.zipCode || '',
                                                                                        city: c.address?.city || '',
                                                                                        country: c.address?.country || 'France'
                                                                                    }
                                                                                }
                                                                            });
                                                                            setIsCustomerSearchOpen(false);
                                                                        }}
                                                                    >
                                                                        <td className="px-6 py-4">
                                                                            <div className="font-bold text-slate-900 group-hover:text-indigo-700">{c.firstName} {c.lastName}</div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-slate-500">{c.email}</td>
                                                                        <td className="px-6 py-4 text-slate-500">{c.address?.city || '-'}</td>
                                                                        <td className="px-6 py-4 text-right text-slate-400 text-xs">
                                                                            {new Date(c.createdAt).toLocaleDateString()}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            {customers.filter(c => 
                                                                c.firstName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                                c.lastName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                                c.email.toLowerCase().includes(customerSearch.toLowerCase())
                                                            ).length === 0 && (
                                                                <tr>
                                                                    <td colSpan={4} className="px-6 py-12 text-center">
                                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                                            <Search size={32} className="opacity-20" />
                                                                            <p>Aucun client trouvé pour "{customerSearch}"</p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* Footer */}
                                                <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end">
                                                    <button 
                                                        onClick={() => setIsCustomerSearchOpen(false)}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={newOrderForm.customer.firstName}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, firstName: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={newOrderForm.customer.lastName}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, lastName: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                        <input 
                                            type="email" 
                                            value={newOrderForm.customer.email}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, email: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
                                        <input 
                                            type="tel" 
                                            value={newOrderForm.customer.phone}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, phone: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Truck size={18} className="text-indigo-600" />
                                    Adresse de Livraison
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rue <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={newOrderForm.customer.address.street}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, street: e.target.value}}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code Postal <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newOrderForm.customer.address.zipCode}
                                                onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, zipCode: e.target.value}}})}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newOrderForm.customer.address.city}
                                                onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, city: e.target.value}}})}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays <span className="text-red-500">*</span></label>
                                        <select 
                                            value={newOrderForm.customer.address.country}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, country: e.target.value}}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        >
                                            <option value="France">France</option>
                                            <option value="Belgique">Belgique</option>
                                            <option value="Suisse">Suisse</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Book size={18} className="text-indigo-600" />
                                    Article
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livre <span className="text-red-500">*</span></label>
                                        <select 
                                            value={newOrderForm.items[0].bookId}
                                            onChange={(e) => {
                                                const newItems = [...newOrderForm.items];
                                                newItems[0].bookId = e.target.value;
                                                setNewOrderForm({...newOrderForm, items: newItems});
                                            }}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        >
                                            <option value="">Sélectionner un livre...</option>
                                            {books.map(book => (
                                                <option key={book.id} value={book.id}>{book.name} - {book.price}€</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantité <span className="text-red-500">*</span></label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={newOrderForm.items[0].quantity}
                                            onChange={(e) => {
                                                const newItems = [...newOrderForm.items];
                                                newItems[0].quantity = parseInt(e.target.value) || 1;
                                                setNewOrderForm({...newOrderForm, items: newItems});
                                            }}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Personnalisation (JSON)</h4>
                                        <div className="space-y-3">
                                            <textarea
                                                rows={5}
                                                className="w-full text-sm font-mono border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2 bg-slate-50"
                                                value={typeof newOrderForm.items[0].config === 'string' ? newOrderForm.items[0].config : JSON.stringify(newOrderForm.items[0].config, null, 2)}
                                                onChange={(e) => {
                                                    const newItems = [...newOrderForm.items];
                                                    // @ts-ignore - Temporary type mismatch during refactor
                                                    newItems[0].config = e.target.value;
                                                    setNewOrderForm({...newOrderForm, items: newItems});
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-slate-700">Total</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        {(() => {
                                            const book = books.find(b => b.id === newOrderForm.items[0].bookId);
                                            const price = book ? book.price : 0;
                                            return (price * newOrderForm.items[0].quantity).toFixed(2);
                                        })()} €
                                    </span>
                                </div>
                                <button 
                                    onClick={submitNewOrder}
                                    disabled={!(
                                        newOrderForm.customer.firstName && 
                                        newOrderForm.customer.lastName && 
                                        newOrderForm.customer.email && 
                                        newOrderForm.customer.address.street && 
                                        newOrderForm.customer.address.zipCode && 
                                        newOrderForm.customer.address.city && 
                                        newOrderForm.customer.address.country && 
                                        newOrderForm.items[0].bookId && 
                                        newOrderForm.items[0].quantity > 0
                                    )}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
                                >
                                    <Save size={18} />
                                    Créer la commande
                                </button>
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
                           <button 
                              onClick={() => {
                                  setFulfillmentTracking(orders.find(o => o.id === selectedOrderId)?.trackingNumber || '');
                                  setShowFulfillment(true);
                              }}
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
                                   <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                                      {(() => {
                                          const subtotal = order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                          const shipping = 4.90;
                                          const discount = 0; // Pour l'instant, pas de gestion de réduction dans le modèle

                                          return (
                                              <>
                                                  <div className="flex justify-between text-sm">
                                                     <span className="text-slate-500">Sous-total</span>
                                                     <span className="font-medium text-slate-900">{subtotal.toFixed(2)} €</span>
                                                  </div>
                                                  <div className="flex justify-between text-sm">
                                                     <span className="text-slate-500">Livraison</span>
                                                     <span className="font-medium text-slate-900">{shipping.toFixed(2)} €</span>
                                                  </div>
                                                  {discount > 0 && (
                                                      <div className="flex justify-between text-sm">
                                                         <span className="text-slate-500">Réduction</span>
                                                         <span className="font-medium text-green-600">-{discount.toFixed(2)} €</span>
                                                      </div>
                                                  )}
                                                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                                     <span className="font-bold text-slate-800">Total</span>
                                                     <span className="text-2xl font-bold text-slate-900">{(subtotal + shipping - discount).toFixed(2)} €</span>
                                                  </div>
                                              </>
                                          );
                                      })()}
                                   </div>
                                </div>

                                {/* Production & Files */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <div className="flex justify-between items-center mb-4">
                                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                         <Printer size={18} className="text-indigo-600" />
                                         Production & Fichiers
                                      </h3>
                                      <button 
                                         onClick={() => {
                                             toast.promise(
                                                 new Promise((resolve) => setTimeout(resolve, 2000)),
                                                 {
                                                     loading: 'Régénération des fichiers en cours...',
                                                     success: 'Fichiers régénérés avec succès !',
                                                     error: 'Erreur lors de la régénération'
                                                 }
                                             );
                                         }}
                                         className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                                      >
                                         <RotateCcw size={14} />
                                         Régénérer
                                      </button>
                                   </div>
                                   <div className="space-y-3">
                                      {/* Cover File */}
                                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                         <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-red-500">
                                               <FileText size={20} />
                                            </div>
                                            <div>
                                               <div className="font-bold text-slate-800 text-sm">Fichier Couverture (PDF)</div>
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
                                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
                                         const isSelected = (draftStatus || order.status) === status;
                                         return (
                                            <button
                                               key={status}
                                               onClick={() => setDraftStatus(status)}
                                               className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                  isSelected
                                                     ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                                     : 'text-slate-600 hover:bg-slate-50'
                                               }`}
                                            >
                                               {status === 'pending' ? 'En attente' :
                                                status === 'processing' ? 'En cours de production' :
                                                status === 'shipped' ? 'Expédiée' :
                                                status === 'delivered' ? 'Livrée' : 'Annulée'}
                                            </button>
                                         );
                                      })}
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

                                {/* Logs & Commentaires (Moved to Sidebar) */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <MessageSquare size={18} className="text-indigo-600" />
                                      Activité & Commentaires
                                   </h3>
                                   
                                   <div className="space-y-6">
                                      {/* Logs Timeline */}
                                      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                         {order.logs && order.logs.length > 0 ? (
                                            order.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                               <div key={log.id} className="flex gap-3 text-sm">
                                                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                                     log.type === 'status_change' ? 'bg-orange-400' : 
                                                     log.type === 'system' ? 'bg-slate-300' : 'bg-indigo-500'
                                                  }`} />
                                                  <div className="flex-1">
                                                     <div className="flex justify-between items-start">
                                                        <span className={`font-medium text-xs ${
                                                           log.type === 'system' ? 'text-slate-500' : 'text-slate-800'
                                                        }`}>
                                                           {log.author || 'Système'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                           {new Date(log.date).toLocaleString()}
                                                        </span>
                                                     </div>
                                                     <p className="text-slate-600 text-sm mt-0.5">{log.message}</p>
                                                  </div>
                                               </div>
                                            ))
                                         ) : (
                                            <div className="text-center text-slate-400 text-sm py-4">Aucune activité enregistrée</div>
                                         )}
                                      </div>

                                      {/* Add Comment Input */}
                                      <div className="flex gap-2 items-start pt-4 border-t border-gray-100">
                                         <div className="flex-1">
                                            <input 
                                               type="text" 
                                               placeholder="Ajouter un commentaire..." 
                                               className="w-full text-sm border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                               value={newComment}
                                               onChange={(e) => setNewComment(e.target.value)}
                                               onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && newComment.trim()) {
                                                     addOrderLog(order.id, newComment.trim(), 'comment');
                                                     setNewComment('');
                                                  }
                                               }}
                                            />
                                         </div>
                                         <button 
                                            onClick={() => {
                                               if (newComment.trim()) {
                                                  addOrderLog(order.id, newComment.trim(), 'comment');
                                                  setNewComment('');
                                               }
                                            }}
                                            disabled={!newComment.trim()}
                                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                         >
                                            <Send size={18} />
                                         </button>
                                      </div>
                                   </div>
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
                                               <label className="text-xs font-bold text-slate-500 mb-1 block">Numéro de suivi <span className="text-red-500">*</span></label>
                                               <input 
                                                  type="text"
                                                  value={fulfillmentTracking}
                                                  onChange={(e) => setFulfillmentTracking(e.target.value)}
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
                                            if (fulfillmentTracking) {
                                               updateOrderTracking(order.id, fulfillmentTracking);
                                               toast.success(`Commande expédiée avec le suivi ${fulfillmentTracking}`);
                                               setShowFulfillment(false);
                                            } else {
                                               toast.error("Veuillez entrer un numéro de suivi");
                                            }
                                         }}
                                         disabled={!fulfillmentTracking}
                                         className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                            !fulfillmentTracking 
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                         }`}
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

              {/* --- VIEW: CREATE CUSTOMER --- */}
              {activeTab === 'customers' && isCreatingCustomer && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                       <button onClick={() => setIsCreatingCustomer(false)} className="text-slate-400 hover:text-slate-600">
                          <ArrowUp className="-rotate-90" size={20} />
                       </button>
                       <h2 className="text-2xl font-bold text-slate-800">Nouveau Client</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <User size={18} className="text-indigo-600" />
                                Informations Client
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.firstName}
                                        onChange={(e) => setNewCustomerForm({...newCustomerForm, firstName: e.target.value})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.lastName}
                                        onChange={(e) => setNewCustomerForm({...newCustomerForm, lastName: e.target.value})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                <input 
                                    type="email" 
                                    value={newCustomerForm.email}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone <span className="text-red-500">*</span></label>
                                <input 
                                    type="tel" 
                                    value={newCustomerForm.phone}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    Adresse
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rue <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={newCustomerForm.address.street}
                                            onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, street: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code Postal <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newCustomerForm.address.zipCode}
                                                onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, zipCode: e.target.value}})}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newCustomerForm.address.city}
                                                onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, city: e.target.value}})}
                                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays</label>
                                        <select 
                                            value={newCustomerForm.address.country}
                                            onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, country: e.target.value}})}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        >
                                            <option value="France">France</option>
                                            <option value="Belgique">Belgique</option>
                                            <option value="Suisse">Suisse</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setIsCreatingCustomer(false)}
                                className="px-6 py-2.5 border border-gray-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={submitNewCustomer}
                                disabled={!newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email || !newCustomerForm.phone || !newCustomerForm.address.street || !newCustomerForm.address.zipCode || !newCustomerForm.address.city}
                                className={`px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20 ${
                                  !newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email || !newCustomerForm.phone || !newCustomerForm.address.street || !newCustomerForm.address.zipCode || !newCustomerForm.address.city
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                            >
                                Créer le client
                            </button>
                        </div>
                    </div>
                  </div>
              )}

              {/* --- VIEW: CUSTOMERS --- */}
              {activeTab === 'customers' && !selectedCustomerId && !isCreatingCustomer && (
                 <div className="space-y-6">
                    <div className="flex justify-end items-center">
                         <div className="flex gap-2">
                            <button 
                               onClick={handleExportCustomers}
                               className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                               <Download size={16} />
                               Exporter
                            </button>
                            <button 
                               onClick={handleCreateCustomer}
                               className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800 flex items-center gap-2"
                            >
                               <Plus size={16} />
                               Ajouter un client
                            </button>
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
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {customers.map(customer => (
                                <tr key={customer.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
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
                                   {!isEditingCustomer ? (
                                       <>
                                           <div className="flex justify-end mb-2 -mt-2">
                                                <button 
                                                    onClick={() => {
                                                        setEditCustomerForm({
                                                            firstName: customer.firstName,
                                                            lastName: customer.lastName,
                                                            email: customer.email,
                                                            phone: customer.phone || '',
                                                            address: {
                                                                street: customer.address?.street || '',
                                                                zipCode: customer.address?.zipCode || '',
                                                                city: customer.address?.city || '',
                                                                country: customer.address?.country || ''
                                                            }
                                                        });
                                                        setIsEditingCustomer(true);
                                                    }}
                                                    className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                                                    title="Modifier le profil"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                           </div>
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
                                       </>
                                   ) : (
                                       <div className="text-left space-y-4">
                                            <div className="text-center font-bold text-slate-800 mb-4">Modifier le Profil</div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Prénom <span className="text-red-500">*</span></label>
                                                    <input 
                                                        type="text" 
                                                        value={editCustomerForm.firstName}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, firstName: e.target.value})}
                                                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nom <span className="text-red-500">*</span></label>
                                                    <input 
                                                        type="text" 
                                                        value={editCustomerForm.lastName}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, lastName: e.target.value})}
                                                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="email" 
                                                    value={editCustomerForm.email}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                                                    className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Téléphone</label>
                                                <input 
                                                    type="tel" 
                                                    value={editCustomerForm.phone}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, phone: e.target.value})}
                                                    className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                />
                                            </div>

                                            <div className="pt-2 border-t border-gray-100 mt-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Adresse</label>
                                                <div className="space-y-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Rue"
                                                        value={editCustomerForm.address.street}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, street: e.target.value}})}
                                                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Code Postal"
                                                            value={editCustomerForm.address.zipCode}
                                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, zipCode: e.target.value}})}
                                                            className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ville"
                                                            value={editCustomerForm.address.city}
                                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, city: e.target.value}})}
                                                            className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                        />
                                                    </div>
                                                    <select 
                                                        value={editCustomerForm.address.country}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, country: e.target.value}})}
                                                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                    >
                                                        <option value="France">France</option>
                                                        <option value="Belgique">Belgique</option>
                                                        <option value="Suisse">Suisse</option>
                                                        <option value="Canada">Canada</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={() => setIsEditingCustomer(false)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                                                >
                                                    Annuler
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        updateCustomer(customer.id, {
                                                            firstName: editCustomerForm.firstName,
                                                            lastName: editCustomerForm.lastName,
                                                            email: editCustomerForm.email,
                                                            phone: editCustomerForm.phone,
                                                            address: editCustomerForm.address
                                                        });
                                                        setIsEditingCustomer(false);
                                                        toast.success("Profil client mis à jour");
                                                    }}
                                                    disabled={!editCustomerForm.firstName || !editCustomerForm.lastName || !editCustomerForm.email}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        !editCustomerForm.firstName || !editCustomerForm.lastName || !editCustomerForm.email
                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    }`}
                                                >
                                                    Enregistrer
                                                </button>
                                            </div>
                                       </div>
                                   )}
                                </div>
                                
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4">Statistiques</h3>
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                                         <div className="text-2xl font-bold text-indigo-600">{customer.orderCount}</div>
                                         <div className="text-xs text-slate-500">Commandes</div>
                                      </div>
                                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                                         <div className="text-xl font-bold text-green-600">{customer.totalSpent.toFixed(2)}€</div>
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

                  <div className="grid grid-cols-1 gap-8">
                      {mainMenu.map((menu, idx) => (
                          <div key={menu.id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                                  <div className="flex-1 space-y-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre du menu</label>
                                          <input 
                                              type="text" 
                                              value={menu.label}
                                              onChange={(e) => updateMenuItem(idx, { ...menu, label: e.target.value })}
                                              className="font-bold text-xl text-slate-800 bg-transparent border border-gray-200 rounded px-3 py-2 w-full max-w-md focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all"
                                          />
                                      </div>
                                      <div className="flex items-center gap-6">
                                          <div className="flex flex-col gap-1">
                                              <span className="text-xs font-bold text-slate-500 uppercase">Type d'affichage</span>
                                              <div className="flex bg-slate-100 p-1 rounded-lg">
                                                  {['simple', 'grid', 'columns'].map((type) => (
                                                      <button
                                                          key={type}
                                                          onClick={() => updateMenuItem(idx, { ...menu, type: type as any })}
                                                          className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                                                              menu.type === type 
                                                                  ? 'bg-white text-slate-900 shadow-sm' 
                                                                  : 'text-slate-500 hover:text-slate-700'
                                                          }`}
                                                      >
                                                          {type === 'simple' ? 'Liste' : type === 'grid' ? 'Grille' : 'Colonnes'}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                              <span className="text-xs font-bold text-slate-500 uppercase">Chemin de base</span>
                                              <input 
                                                  type="text" 
                                                  value={menu.basePath}
                                                  onChange={(e) => updateMenuItem(idx, { ...menu, basePath: e.target.value })}
                                                  className="text-sm border border-gray-200 rounded px-3 py-1.5 focus:ring-brand-coral focus:border-brand-coral font-mono text-slate-600 w-48"
                                              />
                                          </div>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => {
                                          if(confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) {
                                              deleteMenuItem(idx);
                                          }
                                      }}
                                      className="text-slate-400 hover:text-red-500 p-2 transition-colors hover:bg-red-50 rounded-lg"
                                      title="Supprimer le menu"
                                  >
                                      <Trash2 size={20} />
                                  </button>
                              </div>
                              
                              <div className="p-6 bg-white">
                                  <div className="mb-4 flex justify-between items-center">
                                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Éléments du menu</h3>
                                  </div>

                                  {menu.type === 'columns' ? (
                                      <div className="space-y-6">
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                              {(menu.columns || []).map((col, colIdx) => (
                                                  <div key={colIdx} className="border border-gray-200 rounded-xl bg-slate-50 overflow-hidden">
                                                      <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center">
                                                          <input 
                                                              type="text"
                                                              value={col.title}
                                                              onChange={(e) => {
                                                                  const newCols = [...(menu.columns || [])];
                                                                  newCols[colIdx] = { ...col, title: e.target.value };
                                                                  updateMenuItem(idx, { ...menu, columns: newCols });
                                                              }}
                                                              className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-800 w-full"
                                                              placeholder="Titre de la colonne"
                                                          />
                                                          <button 
                                                              onClick={() => {
                                                                  const newCols = (menu.columns || []).filter((_, i) => i !== colIdx);
                                                                  updateMenuItem(idx, { ...menu, columns: newCols });
                                                              }}
                                                              className="text-slate-400 hover:text-red-500"
                                                          >
                                                              <X size={16} />
                                                          </button>
                                                      </div>
                                                      <div className="p-3">
                                                          <DndContext 
                                                              sensors={sensors}
                                                              collisionDetection={closestCenter}
                                                              onDragEnd={(e) => handleDragEnd(e, idx, colIdx)}
                                                          >
                                                              <SortableContext 
                                                                  items={col.items}
                                                                  strategy={verticalListSortingStrategy}
                                                              >
                                                                  <div className="space-y-2">
                                                                      {col.items.map((item, itemIdx) => (
                                                                          <SortableItem key={item} id={item} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center gap-3 shadow-sm">
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
                                                                                  className="flex-1 border-none p-0 text-sm focus:ring-0 bg-transparent"
                                                                                  onPointerDown={(e) => e.stopPropagation()}
                                                                                  onKeyDown={(e) => e.stopPropagation()}
                                                                              />
                                                                              <button 
                                                                                  onClick={() => {
                                                                                      const newItems = col.items.filter((_, i) => i !== itemIdx);
                                                                                      const newCols = [...(menu.columns || [])];
                                                                                      newCols[colIdx] = { ...col, items: newItems };
                                                                                      updateMenuItem(idx, { ...menu, columns: newCols });
                                                                                  }}
                                                                                  className="text-slate-300 hover:text-red-400"
                                                                                  onPointerDown={(e) => e.stopPropagation()}
                                                                              >
                                                                                  <X size={14} />
                                                                              </button>
                                                                          </SortableItem>
                                                                      ))}
                                                                  </div>
                                                              </SortableContext>
                                                          </DndContext>
                                                          <button 
                                                              onClick={() => {
                                                                  const newItems = [...col.items, 'Nouveau lien'];
                                                                  const newCols = [...(menu.columns || [])];
                                                                  newCols[colIdx] = { ...col, items: newItems };
                                                                  updateMenuItem(idx, { ...menu, columns: newCols });
                                                              }}
                                                              className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-lg text-slate-500 hover:text-brand-coral hover:border-brand-coral text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                          >
                                                              <Plus size={14} /> Ajouter un lien
                                                          </button>
                                                      </div>
                                                  </div>
                                              ))}
                                              
                                              <button 
                                                  onClick={() => {
                                                      const newCols = [...(menu.columns || []), { title: 'Nouvelle Colonne', items: [] }];
                                                      updateMenuItem(idx, { ...menu, columns: newCols });
                                                  }}
                                                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-brand-coral hover:border-brand-coral hover:bg-slate-50 transition-all min-h-[200px]"
                                              >
                                                  <Columns size={32} className="mb-2 opacity-50" />
                                                  <span className="font-bold">Ajouter une colonne</span>
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      // Simple or Grid (List of items)
                                      (<div className="max-w-3xl">
                                          <div className="bg-slate-50 rounded-lg border border-gray-200 overflow-hidden">
                                              <DndContext 
                                                  sensors={sensors}
                                                  collisionDetection={closestCenter}
                                                  onDragEnd={(e) => handleDragEnd(e, idx)}
                                              >
                                                  <SortableContext 
                                                      items={menu.items || []}
                                                      strategy={verticalListSortingStrategy}
                                                  >
                                                      <div className="divide-y divide-gray-200">
                                                         {(menu.items || []).map((item, itemIdx) => (
                                                             <SortableItem key={item} id={item} className="bg-white p-3 flex items-center gap-4 group hover:bg-slate-50 transition-colors">
                                                                 <div className="flex-1">
                                                                    <input 
                                                                        type="text"
                                                                        value={item}
                                                                        onChange={(e) => {
                                                                            const newItems = [...(menu.items || [])];
                                                                            newItems[itemIdx] = e.target.value;
                                                                            updateMenuItem(idx, { ...menu, items: newItems });
                                                                        }}
                                                                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-medium"
                                                                        placeholder="Nom du lien"
                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                    />
                                                                 </div>
                                                                 <button 
                                                                     onClick={() => {
                                                                         const newItems = (menu.items || []).filter((_, i) => i !== itemIdx);
                                                                         updateMenuItem(idx, { ...menu, items: newItems });
                                                                     }}
                                                                     className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                                                     onPointerDown={(e) => e.stopPropagation()}
                                                                     title="Supprimer"
                                                                 >
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </SortableItem>
                                                         ))}
                                                      </div>
                                                  </SortableContext>
                                              </DndContext>
                                              
                                              {(!menu.items || menu.items.length === 0) && (
                                                  <div className="p-8 text-center text-slate-400 text-sm">
                                                      Aucun élément dans ce menu.
                                                  </div>
                                              )}
                                              
                                              <div className="p-3 bg-slate-50 border-t border-gray-200">
                                                  <button 
                                                      onClick={() => {
                                                          const newItems = [...(menu.items || []), 'Nouveau lien'];
                                                          updateMenuItem(idx, { ...menu, items: newItems });
                                                      }}
                                                      className="text-brand-coral font-bold text-sm flex items-center gap-2 hover:underline px-2"
                                                  >
                                                      <Plus size={16} /> Ajouter un élément de menu
                                                  </button>
                                              </div>
                                          </div>
                                      </div>)
                                  )}
                                  
                                  <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                                      <button 
                                          onClick={() => handleSaveMenu(idx)}
                                          disabled={JSON.stringify(menu) === JSON.stringify(originalMainMenu[idx] || {})}
                                          className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm ${
                                              JSON.stringify(menu) !== JSON.stringify(originalMainMenu[idx] || {})
                                                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          }`}
                                      >
                                          <Save size={16} /> Enregistrer le menu
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              )}

              {/* --- VIEW: SHIPPING --- */}
              {activeTab === 'shipping' && (
                 <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Expédition et Livraison</h2>
                            <p className="text-slate-500 mt-1">Configurez les zones, tarifs et délais de livraison.</p>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => {
                                    const newZone: ShippingZone = {
                                        id: `zone-${Date.now()}`,
                                        name: 'Nouvelle Zone',
                                        countries: [],
                                        methods: []
                                    };
                                    addShippingZone(newZone);
                                    setEditingZoneId(newZone.id);
                                }}
                                className="bg-white border border-gray-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Plus size={18} /> Ajouter une zone
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Globe size={20} className="text-indigo-600" />
                                Zones d'expédition
                            </h3>
                            
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Tarif par défaut:</label>
                                <div className="relative w-24">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                    <input 
                                        type="number" 
                                        value={defaultShippingRate}
                                        onChange={(e) => updateDefaultShippingRate(parseFloat(e.target.value) || 0)}
                                        className="w-full text-sm border border-gray-300 rounded-lg pl-6 pr-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-bold text-slate-800"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                             {shippingZones.map(zone => (
                                <div key={zone.id} className="p-6">
                                    {editingZoneId === zone.id ? (
                                        <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-indigo-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom de la zone</label>
                                                    <input 
                                                        type="text" 
                                                        value={zone.name}
                                                        onChange={(e) => updateShippingZone(zone.id, { name: e.target.value })}
                                                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Ex: France Métropolitaine"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Pays (Codes ISO ou Noms)</label>
                                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white border border-gray-300 rounded min-h-[42px]">
                                                        {zone.countries.map(country => (
                                                            <span key={country} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                                                {country}
                                                                <button onClick={() => updateShippingZone(zone.id, { countries: zone.countries.filter(c => c !== country) })}>
                                                                    <X size={12} />
                                                                </button>
                                                            </span>
                                                        ))}
                                                        <input 
                                                            type="text" 
                                                            placeholder={zone.countries.length === 0 ? "Ajouter (Entrée)" : ""}
                                                            className="bg-transparent border-none p-0 text-sm focus:ring-0 min-w-[100px] flex-1"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (val && !zone.countries.includes(val)) {
                                                                        updateShippingZone(zone.id, { countries: [...zone.countries, val] });
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-bold text-slate-700">Méthodes de livraison</label>
                                                    <button 
                                                        onClick={() => {
                                                            const newMethod: ShippingMethod = {
                                                                id: `method-${Date.now()}`,
                                                                name: 'Nouvelle méthode',
                                                                price: 0,
                                                                estimatedDelay: '2-3 jours'
                                                            };
                                                            updateShippingZone(zone.id, { methods: [...zone.methods, newMethod] });
                                                        }}
                                                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                                                    >
                                                        <Plus size={14} /> Ajouter une méthode
                                                    </button>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {zone.methods.map((method, mIdx) => (
                                                        <div key={method.id} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded border border-gray-200 items-start md:items-center">
                                                            <div className="flex-1 w-full">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        value={method.name}
                                                                        onChange={(e) => {
                                                                            const newMethods = [...zone.methods];
                                                                            newMethods[mIdx] = { ...method, name: e.target.value };
                                                                            updateShippingZone(zone.id, { methods: newMethods });
                                                                        }}
                                                                        className="flex-1 text-sm font-bold border-none p-0 focus:ring-0 text-slate-800 placeholder-gray-400"
                                                                        placeholder="Nom de la méthode"
                                                                    />
                                                                    {method.condition && method.condition.type !== 'none' && (
                                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                                                            {method.condition.type === 'price' ? 'Prix' : method.condition.type === 'weight' ? 'Poids' : 'Quantité'} {
                                                                                method.condition.operator === 'greater_than' ? '> ' : 
                                                                                method.condition.operator === 'less_than' ? '< ' : ''
                                                                            }
                                                                            {method.condition.value}
                                                                            {method.condition.operator === 'between' ? ` - ${method.condition.maxValue}` : ''}
                                                                            {method.condition.type === 'price' ? '€' : method.condition.type === 'weight' ? 'kg' : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <input 
                                                                    type="text" 
                                                                    value={method.estimatedDelay || ''}
                                                                    onChange={(e) => {
                                                                        const newMethods = [...zone.methods];
                                                                        newMethods[mIdx] = { ...method, estimatedDelay: e.target.value };
                                                                        updateShippingZone(zone.id, { methods: newMethods });
                                                                    }}
                                                                    className="w-full text-xs text-slate-500 border-none p-0 focus:ring-0 placeholder-gray-300"
                                                                    placeholder="Délai estimé (ex: 48h)"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                                                    <input 
                                                                        type="number" 
                                                                        value={method.price}
                                                                        onChange={(e) => {
                                                                            const newMethods = [...zone.methods];
                                                                            newMethods[mIdx] = { ...method, price: parseFloat(e.target.value) || 0 };
                                                                            updateShippingZone(zone.id, { methods: newMethods });
                                                                        }}
                                                                        className="w-20 text-sm border border-gray-200 rounded pl-6 pr-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 text-right font-bold"
                                                                    />
                                                                </div>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button className={`p-1.5 rounded transition-colors ${method.condition?.type && method.condition.type !== 'none' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>
                                                                            <Filter size={16} />
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-80 p-4 bg-white">
                                                                        <div className="space-y-4">
                                                                            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                                                <Filter size={14} /> Condition d'application
                                                                            </h4>
                                                                            
                                                                            <div className="space-y-3">
                                                                                <div>
                                                                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Type de condition</label>
                                                                                    <select 
                                                                                        className="w-full text-sm border border-gray-200 rounded p-2"
                                                                                        value={method.condition?.type || 'none'}
                                                                                        onChange={(e) => {
                                                                                            const newMethods = [...zone.methods];
                                                                                            // @ts-ignore
                                                                                            const type = e.target.value as 'weight' | 'price' | 'quantity' | 'none';
                                                                                            newMethods[mIdx] = { 
                                                                                                ...method, 
                                                                                                condition: type === 'none' ? undefined : { 
                                                                                                    type, 
                                                                                                    operator: 'greater_than', 
                                                                                                    value: 0 
                                                                                                } 
                                                                                            };
                                                                                            updateShippingZone(zone.id, { methods: newMethods });
                                                                                        }}
                                                                                    >
                                                                                        <option value="none">Aucune condition (Toujours appliquer)</option>
                                                                                        <option value="price">Basé sur le prix de la commande</option>
                                                                                        <option value="weight">Basé sur le poids de la commande</option>
                                                                                    <option value="quantity">Basé sur la quantité d'articles</option>
                                                                                    </select>
                                                                                </div>

                                                                                {method.condition && method.condition.type !== 'none' && (
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Opérateur</label>
                                                                                            <select 
                                                                                                className="w-full text-sm border border-gray-200 rounded p-2"
                                                                                                value={method.condition.operator}
                                                                                                onChange={(e) => {
                                                                                                    const newMethods = [...zone.methods];
                                                                                                    if (newMethods[mIdx].condition) {
                                                                                                        // @ts-ignore
                                                                                                        newMethods[mIdx].condition.operator = e.target.value;
                                                                                                        updateShippingZone(zone.id, { methods: newMethods });
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <option value="greater_than">Supérieur à ({'>'})</option>
                                                                                                <option value="less_than">Inférieur à ({'<'})</option>
                                                                                                <option value="between">Entre</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-xs font-bold text-slate-500 mb-1 block">
                                                                                                Valeur {method.condition.type === 'price' ? '(€)' : method.condition.type === 'weight' ? '(kg)' : '(Qté)'}
                                                                                            </label>
                                                                                            <input 
                                                                                                type="number"
                                                                                                className="w-full text-sm border border-gray-200 rounded p-2"
                                                                                                value={method.condition.value}
                                                                                                onChange={(e) => {
                                                                                                    const newMethods = [...zone.methods];
                                                                                                    if (newMethods[mIdx].condition) {
                                                                                                        newMethods[mIdx].condition.value = parseFloat(e.target.value) || 0;
                                                                                                        updateShippingZone(zone.id, { methods: newMethods });
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                
                                                                                {method.condition && method.condition.operator === 'between' && (
                                                                                    <div>
                                                                                        <label className="text-xs font-bold text-slate-500 mb-1 block">
                                                                                            Valeur Max {method.condition.type === 'price' ? '(€)' : method.condition.type === 'weight' ? '(kg)' : '(Qté)'}
                                                                                        </label>
                                                                                        <input 
                                                                                            type="number"
                                                                                            className="w-full text-sm border border-gray-200 rounded p-2"
                                                                                            value={method.condition.maxValue || 0}
                                                                                            onChange={(e) => {
                                                                                                const newMethods = [...zone.methods];
                                                                                                if (newMethods[mIdx].condition) {
                                                                                                    newMethods[mIdx].condition.maxValue = parseFloat(e.target.value) || 0;
                                                                                                    updateShippingZone(zone.id, { methods: newMethods });
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <button 
                                                                    onClick={() => {
                                                                        const newMethods = zone.methods.filter((_, i) => i !== mIdx);
                                                                        updateShippingZone(zone.id, { methods: newMethods });
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {zone.methods.length === 0 && (
                                                        <p className="text-sm text-gray-400 italic text-center py-2">Aucune méthode configurée pour cette zone.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                                                <button 
                                                    onClick={() => {
                                                        if (confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
                                                            deleteShippingZone(zone.id);
                                                        }
                                                    }}
                                                    className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                >
                                                    <Trash2 size={14} /> Supprimer la zone
                                                </button>
                                                <button 
                                                    onClick={() => setEditingZoneId(null)}
                                                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Save size={16} /> Enregistrer
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                        {zone.countries.length > 0 ? zone.countries[0].substring(0, 2).toUpperCase() : '??'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{zone.name}</h4>
                                                        <p className="text-xs text-slate-500 truncate max-w-md">
                                                            {zone.countries.length > 0 ? zone.countries.join(', ') : 'Aucun pays défini'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setEditingZoneId(zone.id)}
                                                    className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1"
                                                >
                                                    <Edit2 size={14} /> Modifier
                                                </button>
                                            </div>
                                            <div className="bg-slate-50 rounded-lg p-4 border border-gray-100 space-y-3">
                                                {zone.methods.map(method => (
                                                    <div key={method.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-slate-700">{method.name}</span>
                                                                    {method.condition && method.condition.type !== 'none' && (
                                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                                                            {method.condition.type === 'price' ? 'Prix' : method.condition.type === 'weight' ? 'Poids' : 'Quantité'} {
                                                                                method.condition.operator === 'greater_than' ? '> ' : 
                                                                                method.condition.operator === 'less_than' ? '< ' : ''
                                                                            }
                                                                            {method.condition.value}
                                                                            {method.condition.operator === 'between' ? ` - ${method.condition.maxValue}` : ''}
                                                                            {method.condition.type === 'price' ? '€' : method.condition.type === 'weight' ? 'kg' : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {method.estimatedDelay && (
                                                                    <span className="text-[10px] text-slate-400">{method.estimatedDelay}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-900">{method.price.toFixed(2)} €</div>
                                                    </div>
                                                ))}
                                                {zone.methods.length === 0 && (
                                                    <p className="text-xs text-slate-400 italic">Aucune méthode de livraison configurée.</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                             ))}
                             {shippingZones.length === 0 && (
                                 <div className="p-12 text-center">
                                     <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                         <Globe size={32} className="text-slate-300" />
                                     </div>
                                     <h3 className="text-slate-800 font-bold mb-2">Aucune zone d'expédition</h3>
                                     <p className="text-slate-500 text-sm mb-6">Configurez les zones où vous livrez vos produits.</p>
                                     <button 
                                        onClick={() => {
                                            const newZone: ShippingZone = {
                                                id: `zone-${Date.now()}`,
                                                name: 'Nouvelle Zone',
                                                countries: [],
                                                methods: []
                                            };
                                            addShippingZone(newZone);
                                            setEditingZoneId(newZone.id);
                                        }}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                                     >
                                         Créer une première zone
                                     </button>
                                 </div>
                             )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Package size={20} className="text-indigo-600" />
                                Règles d'emballage
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Poids par livre (g)</label>
                                    <input 
                                        type="number" 
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        defaultValue={350}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Poids moyen utilisé pour le calcul des frais de port.</p>
                                </div>
                            </div>
                        </div>
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
                             <label className="block text-sm font-bold text-slate-700 mb-2">Langues disponibles</label>
                             <div className="border border-gray-300 rounded-lg p-3 h-48 overflow-y-auto bg-white space-y-2">
                                {(!selectedBook.features?.languages || selectedBook.features.languages.length === 0) && (
                                    <div className="text-gray-400 text-xs italic p-2 text-center">Aucune langue configurée</div>
                                )}
                                
                                {(selectedBook.features?.languages || []).map((lang, idx) => {
                                    // Safety check if we still have strings during migration
                                    const code = typeof lang === 'string' ? '??' : lang.code;
                                    const label = typeof lang === 'string' ? lang : lang.label;
                                    
                                    return (
                                      <div key={idx} className="flex items-center gap-2">
                                          <input 
                                              type="text" 
                                              value={code} 
                                              onChange={(e) => {
                                                  const newLangs = [...(selectedBook.features?.languages || [])];
                                                  // @ts-ignore
                                                  if (typeof newLangs[idx] === 'string') newLangs[idx] = { code: e.target.value, label: newLangs[idx] };
                                                  else newLangs[idx] = { ...newLangs[idx], code: e.target.value };
                                                  
                                                  handleSaveBook({
                                                      ...selectedBook,
                                                      features: { ...selectedBook.features, languages: newLangs as any }
                                                  });
                                              }}
                                              className="w-16 border border-gray-200 rounded px-2 py-1 text-xs font-mono uppercase focus:ring-1 focus:ring-brand-coral outline-none"
                                              placeholder="FR"
                                          />
                                          <input 
                                              type="text" 
                                              value={label}
                                              onChange={(e) => {
                                                  const newLangs = [...(selectedBook.features?.languages || [])];
                                                  // @ts-ignore
                                                  if (typeof newLangs[idx] === 'string') newLangs[idx] = { code: '??', label: e.target.value };
                                                  else newLangs[idx] = { ...newLangs[idx], label: e.target.value };
                                                  
                                                  handleSaveBook({
                                                      ...selectedBook,
                                                      features: { ...selectedBook.features, languages: newLangs as any }
                                                  });
                                              }}
                                              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-coral outline-none"
                                              placeholder="Nom de la langue"
                                          />
                                          <button 
                                              onClick={() => {
                                                  const newLangs = (selectedBook.features?.languages || []).filter((_, i) => i !== idx);
                                                  handleSaveBook({
                                                      ...selectedBook,
                                                      features: { ...selectedBook.features, languages: newLangs }
                                                  });
                                              }}
                                              className="text-gray-400 hover:text-red-500 p-1"
                                              title="Supprimer"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </div>
                                    );
                                })}
                             </div>
                             <button 
                                onClick={() => {
                                     const newLangs = [...(selectedBook.features?.languages || [])];
                                     newLangs.push({ code: '', label: '' });
                                     handleSaveBook({
                                         ...selectedBook,
                                         features: { ...selectedBook.features, languages: newLangs as any }
                                     });
                                }}
                                className="mt-2 text-xs text-brand-coral font-bold flex items-center gap-1 hover:text-red-600 transition-colors"
                             >
                                <Plus size={14} /> Ajouter une langue
                             </button>
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
                              {/* New Wizard Buttons */}
                              <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                                  <button 
                                      onClick={handleExportWizard}
                                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" 
                                      title="Exporter la config Wizard (JSON)"
                                  >
                                      <Download size={16} />
                                  </button>
                                  <button 
                                      onClick={() => wizardFileInputRef.current?.click()}
                                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" 
                                      title="Importer la config Wizard (JSON)"
                                  >
                                      <Upload size={16} />
                                  </button>
                                  <input 
                                      type="file" 
                                      ref={wizardFileInputRef}
                                      onChange={handleImportWizard}
                                      accept=".json"
                                      className="hidden"
                                  />
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
                                                  onClick={() => toggleVariantExpand(`${tab.id}.${variant.id}`)}
                                                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                                               >
                                                  {expandedVariantIds.has(`${tab.id}.${variant.id}`) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                                                        newTabs[idx].variants[vIdx].type = e.target.value as 'options' | 'text' | 'checkbox';
                                                        handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                     }}
                                                     className="w-full text-xs border-gray-200 rounded-md py-1.5 pl-3 pr-8 bg-white text-slate-600 font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                                  >
                                                     <option value="options">Choix (Options)</option>
                                                     <option value="text">Texte (Libre)</option>
                                                     <option value="checkbox">Case à cocher</option>
                                                  </select>
                                                  
                                                  {variant.type === 'text' && expandedVariantIds.has(`${tab.id}.${variant.id}`) && (
                                                     <div className="flex flex-col gap-2 mt-2">
                                                        <div className="flex gap-2">
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
                                                        <input 
                                                           type="text" 
                                                           placeholder="Unité (ex: ans, cm)" 
                                                           value={variant.unit || ''}
                                                           onChange={(e) => {
                                                              const newTabs = [...selectedBook.wizardConfig.tabs];
                                                              newTabs[idx].variants[vIdx].unit = e.target.value;
                                                              handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                           }}
                                                           className="w-full text-[10px] border-gray-200 rounded px-2 py-1"
                                                           title="Unité affichée dans le wizard"
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
                                            {expandedVariantIds.has(`${tab.id}.${variant.id}`) && (variant.type === 'options' || !variant.type) && (
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
                                                                 <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors mb-1 overflow-hidden ${option.resource ? 'border-blue-200 bg-blue-50 text-blue-500' : 'border-gray-200 bg-gray-50 group-hover/upload:border-blue-500 group-hover/upload:text-blue-500 text-gray-300'}`}>
                                                                    {option.resource ? (
                                                                       <img src={option.resource} alt="Res" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                       <Box size={16} />
                                                                    )}
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
                                                                          newTabs[idx].variants[vIdx].options![oIdx].resource = url;
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
                                                                    const currentOption = newTabs[idx].variants[vIdx].options![oIdx];

                                                                    // Auto-update ID logic
                                                                    const oldSlug = slugify(currentOption.label);
                                                                    const currentId = currentOption.id;

                                                                    // Check if ID is default-like or empty
                                                                    const isDefaultId = /^\d+$/.test(currentId) || currentId.startsWith('opt_') || currentId.startsWith('nouvelle_option');
                                                                    const isSyncedId = currentId === oldSlug;

                                                                    newTabs[idx].variants[vIdx].options![oIdx].label = newLabel;

                                                                    if ((isDefaultId || isSyncedId || currentId === '') && newLabel.trim() !== '') {
                                                                        const baseId = slugify(newLabel);
                                                                        const otherIds = newTabs[idx].variants[vIdx].options!
                                                                           .filter((_, i) => i !== oIdx)
                                                                           .map(o => o.id);
                                                                        
                                                                        let uniqueId = baseId;
                                                                        let counter = 2;
                                                                        while (otherIds.includes(uniqueId)) {
                                                                            uniqueId = `${baseId}_${counter}`;
                                                                            counter++;
                                                                        }
                                                                        newTabs[idx].variants[vIdx].options![oIdx].id = uniqueId;
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
                                                                          newTabs[idx].variants[vIdx].options![oIdx].id = e.target.value;
                                                                          handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                       }}
                                                                       onBlur={(e) => {
                                                                          const val = e.target.value.trim();
                                                                          if (!val) return;
                                                                          const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                          const otherIds = newTabs[idx].variants[vIdx].options!.filter((_, i) => i !== oIdx).map(o => o.id);
                                                                          
                                                                          let uniqueId = val;
                                                                          let counter = 2;
                                                                          while (otherIds.includes(uniqueId)) {
                                                                              uniqueId = `${val}_${counter}`;
                                                                              counter++;
                                                                          }
                                                                          
                                                                          if (uniqueId !== val) {
                                                                              newTabs[idx].variants[vIdx].options![oIdx].id = uniqueId;
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
                                                                 newTabs[idx].variants[vIdx].options = newTabs[idx].variants[vIdx].options!.filter(o => o.id !== option.id);
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
                                {currentCombinations.map(c => {
                                   const parts = c.split('_');
                                   
                                   // Try to format as requested: idperso_choix...-idperso_choix
                                   // We need to parse the variant string which is typically "perso_value_perso_value"
                                   // and group them. Since we don't strictly know the schema here, we'll try a best effort grouping
                                   // or just display it in a technical but cleaner way.
                                   
                                   // Actually, based on the user request "idperso_choix...-idperso_choix", 
                                   // if the string is like "child_boy_skin_light", they probably want "child_boy-skin_light"
                                   // But typically the combination key IS just values joined by underscores.
                                   // The user seems to want a specific technical format.
                                   // Let's assume the combination key 'c' is already the value they want, or close to it.
                                   // If they want "idperso_choix", maybe they mean grouping by character ID?
                                   
                                   // Let's look at how currentCombinations are built. They are just strings.
                                   // If the input is "child_boy_skin_light", maybe they want it to look like that?
                                   // The previous implementation was: {c}
                                   
                                   // The user says: "Nom des variables plus claire perso_choix...-perso_choix"
                                   // And "Je veux un nom technique type idperso_choix...-idperso_choix"
                                   
                                   // If the data is stored as flat strings, we might just need to replace underscores with dashes 
                                   // between groups, but we don't know the groups.
                                   // However, looking at the previous user message example: "Claire   ClaireClaire   FonceeFoncee"
                                   // It seems my previous "Capitalize" logic made it weird if the keys were simple.
                                   
                                   // Let's go with a raw technical display but perhaps slightly formatted if needed,
                                   // or simply revert to the raw string if that's what "nom technique" implies, 
                                   // possibly just ensuring it fits the "idperso_choix" pattern.
                                   
                                   // Actually, looking at the user's specific request: "idperso_choix...-idperso_choix"
                                   // It implies they want to see the ID of the person/variable and the choice selected.
                                   // Since `c` is likely just the combination string (e.g. "boy_light"), 
                                   // we might just want to display `c` directly but maybe replace separators?
                                   
                                   // If `c` is "child_boy_skin_light", and they want "child_boy-skin_light", 
                                   // we need to know where to split.
                                   // Without metadata, we can't perfectly split.
                                   
                                   // BUT, maybe the user just wants the RAW value back because my "Readable" version was too "Clean"?
                                   // "Claire Claire" is confusing. "claire_claire" is technical.
                                   
                                   // Let's try to format it as "key: value" if we can, or just return the raw string `c` 
                                   // but maybe with a separator if we can detect pairs.
                                   
                                   // If we assume the format is value_value_value (as generated by generateCombinations),
                                   // and we don't have the keys here easily (they are in `tabs`), we can't easily reconstruction "idperso".
                                   
                                   // However, the user provided example "idperso_choix...-idperso_choix".
                                   // This looks like they want to see the variable names too?
                                   
                                   // Let's revert to a "technical" view which is likely just the raw string, 
                                   // but maybe we can make it slightly better by replacing underscores with dashes 
                                   // if that helps readability, or just keeping underscores.
                                   
                                   // Re-reading: "Je veux un nom technique type idperso_choix...-idperso_choix"
                                   // This suggests `idperso` is the variable name (e.g. 'child') and `choix` is the value (e.g. 'boy').
                                   // The current `c` might just be values "boy_light".
                                   // If `c` DOES NOT contain the keys, we can't invent them.
                                   
                                   // Wait, `currentCombinations` comes from `generateCombinations`.
                                   // If it's just values, we can't add keys without looking up `wizardConfig`.
                                   
                                   // Let's try to look up keys if possible, or just revert to `c` if that's "technical" enough compared to "Claire Claire".
                                   // The user's complaint "Claire ClaireClaire Foncee..." suggests my previous code did a bad job 
                                   // (it printed "Claire - Claire" etc).
                                   
                                   // If I just revert to `{c}`, it prints "claire_claire" (assuming snake case).
                                   // The user wants "idperso_choix".
                                   
                                   // Let's try to inspect `selectedBook.wizardConfig.tabs` to build a better string.
                                   // We have `selectedBook` in scope.
                                   
                                   let technicalName = c;
                                   
                                   // Attempt to reconstruct "key_value" format if we have the config
                                   if (selectedBook && selectedBook.wizardConfig && selectedBook.wizardConfig.tabs) {
                                       const values = c.split('_');
                                       if (values.length === selectedBook.wizardConfig.tabs.length) {
                                            technicalName = selectedBook.wizardConfig.tabs.map((tab, idx) => {
                                                return `${tab.id}_${values[idx]}`;
                                            }).join('-');
                                       }
                                   }

                                   return <option key={c} value={c}>{technicalName}</option>
                                })}
                             </select>
                          </div>

                           {/* Print Settings Dialog */}
                          <input
                             type="file"
                             ref={importInputRef}
                             className="hidden"
                             accept=".html,.htm,.zip,.epub"
                             onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file || !selectedBook) return;
                                 
                                 try {
                                     toast.info(file.name.endsWith('.zip') || file.name.endsWith('.epub') ? "Lecture de l'archive en cours..." : "Lecture du fichier HTML en cours...");
                                     const defaultW = selectedBook.features?.dimensions?.width || 800;
                                     const defaultH = selectedBook.features?.dimensions?.height || 600;
                                     
                                     let result;
                                     if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.epub')) {
                                         result = await parseZipFile(file, defaultW, defaultH);
                                     } else {
                                         result = await parseHtmlFile(file, defaultW, defaultH);
                                     }
                                     
                                     const { texts: newTexts, images: newImages, htmlContent, width, height } = result;

                                     if (htmlContent) {
                                         setPreviewHtml(htmlContent);
                                     }
                                     
                                     if (width && height) {
                                         setImportSessionDimensions({ width, height });
                                     }
                                     
                                     if (newTexts.length === 0 && newImages.length === 0) {
                                         toast.warning("Aucun élément compatible trouvé");
                                         return;
                                     }

                                     // Determine target page index
                                     let targetPageIndex = -1;
                                     // Only use specific pending ID (from sidebar buttons) - NOT global selectedPageId
                                     const effectivePageId = pendingImportPageId;

                                     if (effectivePageId) {
                                         const page = selectedBook.contentConfig.pages.find(p => p.id === effectivePageId);
                                         if (page) {
                                             targetPageIndex = page.pageNumber;
                                         }
                                     }

                                     // If a specific page is selected, force all elements to that page
                                     // otherwise keep auto-detected pages
                                     const finalTexts = targetPageIndex !== -1 
                                         ? newTexts.map(t => ({ 
                                             ...t, 
                                             position: { 
                                                 ...t.position, 
                                                 pageIndex: targetPageIndex,
                                                 layer: 50 // Force high z-index
                                             },
                                             combinationKey: selectedVariant 
                                           }))
                                         : newTexts.map(t => ({ 
                                             ...t, 
                                             position: { 
                                                 ...t.position, 
                                                 layer: 50 // Force high z-index
                                             },
                                             combinationKey: selectedVariant 
                                           }));
                                         
                                     const finalImages = targetPageIndex !== -1
                                         ? newImages.map(i => ({ 
                                             ...i, 
                                             position: { 
                                                 ...i.position, 
                                                 pageIndex: targetPageIndex,
                                                 layer: 50 // Force high z-index
                                             },
                                             combinationKey: selectedVariant 
                                           }))
                                         : newImages.map(i => ({ 
                                             ...i, 
                                             position: { 
                                                 ...i.position, 
                                                 layer: 50 // Force high z-index
                                             },
                                             combinationKey: selectedVariant 
                                           }));
                                           
                                     console.log('Final import payload:', { finalTexts, finalImages });
                                     
                                     setImportSessionTexts(finalTexts);
                                     setImportSessionImages(finalImages);
                                     
                                     const targetPageName = targetPageIndex !== -1 ? `Page ${targetPageIndex}` : "Auto-detect";
                                     toast.success(`Import chargé : ${finalTexts.length} textes, ${finalImages.length} images. Veuillez vérifier et mapper les variables.`);
                                 } catch (err) {
                                     console.error(err);
                                     toast.error("Erreur lors de l'import HTML");
                                 }
                                 
                                 e.target.value = '';
                                 setPendingImportPageId(null);
                             }}
                          />
                          


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
                                  onClick={() => importInputRef.current?.click()}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 shrink-0" 
                                  title="Importer Template HTML (.zip/.html/.epub)"
                              >
                                  <FileCode size={18} />
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
                                  accept=".json,.html"
                                  className="hidden"
                              />
                          </div>
                       
                    </div>

                    <div className="flex-1 min-h-0 flex gap-6">
                    {/* Storyboard Grid - Restored */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 rounded-xl border border-slate-200/50">
                        {(!selectedBook.contentConfig.pages || selectedBook.contentConfig.pages.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                <div className="p-4 bg-slate-100 rounded-full">
                                    <Layout size={32} className="opacity-50" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-slate-600">Aucune page configurée</p>
                                    <p className="text-sm text-slate-400 mt-1">Utilisez le panneau d'import à droite pour commencer.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {selectedBook.contentConfig.pages.sort((a: any, b: any) => a.pageNumber - b.pageNumber).map((page: any) => (
                                    <div 
                                        key={page.id}
                                        className={`relative group bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
                                            selectedPageId === page.id ? 'border-brand-coral shadow-md ring-2 ring-brand-coral/20' : 'border-slate-100 hover:border-brand-coral/30'
                                        }`}
                                        onClick={() => setSelectedPageId(page.id)}
                                    >
                                        <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-white rounded-t-xl">
                                            <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-mono">
                                                    {page.pageNumber}
                                                </span>
                                                Page {page.pageNumber}
                                            </span>
                                        </div>
                                        <div className="aspect-[3/2] bg-slate-50/50 relative overflow-hidden flex items-center justify-center m-1 rounded-lg border border-slate-100">
                                            <div className="text-center space-y-1">
                                                <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                                    {selectedBook.contentConfig.texts?.filter((t: any) => t.position?.pageIndex === page.pageNumber).length || 0} Textes
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                                    {selectedBook.contentConfig.imageElements?.filter((i: any) => i.position?.pageIndex === page.pageNumber).length || 0} Images
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                        <div className="w-[450px] shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
                            <div className="flex flex-col gap-4 mb-4 shrink-0">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FileCode className="text-brand-coral" size={20} />
                                    Aperçu et Mapping des Variables
                                </h3>
                                <div className="flex gap-2 self-start flex-wrap">
                                    {importSessionTexts.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                try {
                                                    // If we have dimensions, ask user if they want to update book dimensions
                                                    if (importSessionDimensions) {
                                                        const currentW = selectedBook.features?.dimensions?.width || 210;
                                                        const currentH = selectedBook.features?.dimensions?.height || 210;
                                                        // Simple heuristic: if diff > 10%
                                                        if (Math.abs(currentW - importSessionDimensions.width) > 10 || Math.abs(currentH - importSessionDimensions.height) > 10) {
                                                            if (confirm(`Les dimensions détectées (${importSessionDimensions.width}x${importSessionDimensions.height}) sont différentes de celles du livre (${currentW}x${currentH}). Voulez-vous mettre à jour les dimensions du livre ?`)) {
                                                                handleSaveBook({
                                                                    ...selectedBook,
                                                                    features: {
                                                                        ...selectedBook.features,
                                                                        dimensions: importSessionDimensions
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }
                                                
                                                    // Smart merge of texts: update existing ones by ID, append new ones
                                                    const existingTexts = selectedBook.contentConfig.texts || [];
                                                    const newTexts = [...existingTexts];
                                                    
                                                    importSessionTexts.forEach(importedText => {
                                                        const existingIndex = newTexts.findIndex(t => t.id === importedText.id);
                                                        if (existingIndex >= 0) {
                                                            newTexts[existingIndex] = importedText;
                                                        } else {
                                                            newTexts.push(importedText);
                                                        }
                                                    });

                                                    // Smart merge of images: update existing ones by ID, append new ones
                                                    const existingImages = selectedBook.contentConfig.imageElements || [];
                                                    const newImages = [...existingImages];

                                                    importSessionImages.forEach(importedImage => {
                                                        const existingIndex = newImages.findIndex(i => i.id === importedImage.id);
                                                        if (existingIndex >= 0) {
                                                            newImages[existingIndex] = importedImage;
                                                        } else {
                                                            newImages.push(importedImage);
                                                        }
                                                    });

                                                    handleSaveBook({
                                                        ...selectedBook,
                                                        contentConfig: {
                                                            ...selectedBook.contentConfig,
                                                            texts: newTexts,
                                                            imageElements: newImages
                                                        }
                                                    });
                                                    
                                                    // DO NOT CLOSE THE SESSION AUTOMATICALLY
                                                    // setPreviewHtml(null);
                                                    // setImportSessionTexts([]);
                                                    // setImportSessionImages([]);
                                                    // setImportSessionDimensions(null);
                                                    
                                                    toast.success(`Configuration sauvegardée et mise à jour (${importSessionTexts.length} éléments en session)`);
                                                } catch (e) {
                                                    toast.error("Erreur lors de la sauvegarde");
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2"
                                        >
                                            <Save size={16} />
                                            Enregistrer & Mettre à jour
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleCapturePreview}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-brand-coral hover:bg-brand-coral/90 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95"
                                    >
                                        <Camera size={16} />
                                        <span>Générer JPEG</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setPreviewHtml(null);
                                            setImportSessionTexts([]);
                                            setImportSessionImages([]);
                                        }}
                                        className="px-3 py-1.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors text-sm"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 shadow-sm rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
                                <div className="flex-1 border border-gray-200 rounded overflow-hidden bg-white relative">
                                    {previewHtml ? (
                                        <iframe 
                                            srcDoc={previewHtml}
                                            className="w-full h-full border-0 bg-white" 
                                            title="HTML Preview"
                                            sandbox="allow-same-origin" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                            <FileCode size={48} className="mb-4 opacity-50" />
                                            <p className="text-sm font-medium">Aucun fichier importé</p>
                                            <p className="text-xs opacity-70 mt-1">Utilisez le bouton d'import dans la barre d'outils</p>
                                        </div>
                                    )}
                                    {importSessionDimensions && (
                                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none font-mono">
                                            DIMENSIONS: {Math.round(importSessionDimensions.width)} x {Math.round(importSessionDimensions.height)} px
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col border border-gray-200 rounded bg-gray-50 h-full">
                                    <div className="p-3 border-b border-gray-200 font-bold text-xs text-gray-500 bg-gray-100 flex justify-between items-center shrink-0">
                                        <span>TEXTES DÉTECTÉS ({importSessionTexts.length})</span>
                                        <span className="text-[10px] text-gray-400">Associez les textes aux variables</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {importSessionTexts.length === 0 ? (
                                            <div className="text-center text-gray-400 py-8 text-sm">
                                                Aucun texte détecté dans ce fichier.
                                            </div>
                                        ) : (
                                            importSessionTexts.map((textItem, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm hover:border-brand-coral/50 transition-colors">
                                                    <div className="mb-2 font-mono text-xs text-gray-500 truncate" title={textItem.id}>
                                                        ID: {textItem.id.split('-').pop()} | Page {textItem.position.pageIndex}
                                                    </div>
                                                    <div className="mb-3 p-2 bg-gray-50 rounded text-gray-800 text-sm border border-gray-100 italic">
                                                        "{textItem.content.length > 50 ? textItem.content.substring(0, 50) + '...' : textItem.content}"
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-brand-coral focus:border-brand-coral outline-none"
                                                            value={textItem.type === 'variable' ? textItem.content : ''}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                const newTexts = [...importSessionTexts];
                                                                if (newVal) {
                                                                    newTexts[idx] = { 
                                                                        ...newTexts[idx], 
                                                                        type: 'variable', 
                                                                        content: newVal 
                                                                    };
                                                                } else {
                                                                    // Revert to original content if possible, but we don't store original separately here.
                                                                    // For now, switch to fixed but keep content (user can edit manually if we added that)
                                                                     newTexts[idx] = { 
                                                                        ...newTexts[idx], 
                                                                        type: 'fixed'
                                                                    };
                                                                }
                                                                setImportSessionTexts(newTexts);
                                                            }}
                                                        >
                                                            {variableOptions.map(opt => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {textItem.type === 'variable' && (
                                                            <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">
                                                                VAR
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const newTexts = importSessionTexts.filter((_, i) => i !== idx);
                                                                setImportSessionTexts(newTexts);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Supprimer cet élément de l'import"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
              )}

              {draftStatus && draftStatus !== (orders.find(o => o.id === selectedOrderId)?.status) && (
                 <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/90">
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={() => setDraftStatus(null)}
                          className="px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors text-xs font-bold uppercase tracking-wide text-slate-300 hover:text-white"
                       >
                          Annuler
                       </button>
                       <button 
                          onClick={() => {
                             if (selectedOrderId) {
                                updateOrderStatus(selectedOrderId, draftStatus as any);
                                setDraftStatus(null);
                                toast.success("Statut de la commande mis à jour");
                             }
                          }}
                          className="bg-brand-coral hover:bg-red-500 text-white px-4 py-1.5 rounded-full font-bold text-sm transition-colors shadow-lg shadow-brand-coral/20"
                       >
                          Enregistrer
                       </button>
                    </div>
                 </div>
              )}
           </main>
        </div>
     </div>
  );
};

export default AdminDashboard;
