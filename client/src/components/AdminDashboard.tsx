import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import HomeDashboard from './admin/HomeDashboard';
import SettingsPanel from './admin/SettingsPanel';
import AnalyticsPanel from './admin/AnalyticsPanel';
import PrintersManager from './admin/PrintersManager';
import ShippingManager from './admin/ShippingManager';
import { SaveButton, CreateButton } from './admin/SaveButton';
import { useConfirm } from '../hooks/useConfirm';
import { toast } from 'sonner';
import { Home, BarChart3, Globe, Book, User, Users, FileText, Plus, Settings, ChevronRight, Save, Upload, Trash2, Edit2, Edit3, Layers, Type, Layout, Eye, Image as ImageIcon, Box, X, ArrowUp, ArrowDown, ChevronDown, Menu, ShoppingBag, Truck, Package, Printer, Download, Barcode, Search, RotateCcw, MessageSquare, Send, MapPin, Columns, FileCode, CreditCard, CloudDownload, Loader2, GripVertical, LayoutTemplate, Star } from 'lucide-react';
import { Theme } from '../types';
import { BookProduct, WizardTab, Printer as PrinterType, FeatureSection, ReviewItem, FaqItem, ProductPageConfig } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { useEcommerce } from '../context/EcommerceContext';
import { useHomepage } from '../context/HomepageContext';
import { HomepageSection, HomepageConfig } from '../types/homepage';
import { MenuItem } from '../types/menu';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { formatPrice } from '../utils/formatPrice';
import { formatDate, formatDateTime } from '../utils/formatDate';


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

// Import font list from the package we just installed if available, or fallback to a larger list
import googleFonts from 'google-fonts-complete';
import { uploadFileToStorage } from '../utils/imageUploader';
import { useUpload } from '../hooks/use-upload';

// Characteristic labels for French display
const CHARACTERISTIC_LABELS: Record<string, string> = {
  hero: 'Personnage',
  skin: 'Peau',
  hair: 'Cheveux',
  haircolor: 'Couleur cheveux',
  hairstyle: 'Coiffure',
  eyes: 'Yeux',
  gender: 'Genre',
  outfit: 'Tenue',
  accessory: 'Accessoire',
};

// Image Card Component - shows extracted characteristics from EPUB
interface ImageCardProps {
  img: any;
  wizardConfig: any;
}

const ImageCard: React.FC<ImageCardProps> = ({ img, wizardConfig }) => {

  const isStatic = img.type === 'static' || img.combinationKey === 'default';
  const characteristics = img.characteristics || {};
  const hasCharacteristics = Object.keys(characteristics).length > 0;
  
  const imageUrl = img.url || img.imagePath || img.filePath || '';

  const findWizardMapping = (charKey: string, charValue: string) => {
    if (!wizardConfig?.tabs) return null;
    for (const tab of wizardConfig.tabs) {
      for (const variant of (tab.variants || [])) {
        if (variant.id === charKey) {
          const option = variant.options?.find((o: any) => o.id === charValue);
          if (option) {
            return { tabLabel: tab.label, variantLabel: variant.label, optionLabel: option.label };
          }
        }
      }
    }
    return null;
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${
      isStatic ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
    }`}>
      <div className="flex gap-3 p-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 shadow-sm">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={img.label || 'Image'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">?</text></svg>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              isStatic 
                ? 'bg-slate-200 text-slate-600' 
                : 'bg-purple-500 text-white'
            }`}>
              {isStatic ? 'Statique' : 'Personnalisée'}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.round(img.position?.width || 0)}×{Math.round(img.position?.height || 0)}
            </span>
          </div>
          
          {hasCharacteristics && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(characteristics).map(([key, value]) => {
                const mapping = findWizardMapping(key, value as string);
                return (
                  <div 
                    key={key}
                    className="group relative"
                  >
                    <span className="inline-flex items-center gap-1 text-[10px] bg-white border border-purple-200 rounded-full px-2 py-0.5 text-purple-700">
                      <span className="font-medium">{CHARACTERISTIC_LABELS[key] || key}:</span>
                      <span className="text-purple-900">{value as string}</span>
                      {mapping && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Lié au wizard" />
                      )}
                    </span>
                    {mapping && (
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          Wizard: {mapping.tabLabel} → {mapping.variantLabel} → {mapping.optionLabel}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {img.combinationKey && img.combinationKey !== 'default' && (
            <div className="mt-2">
              <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded break-all">
                {img.combinationKey}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sortable Book Item for drag & drop
interface SortableBookItemProps {
  id: string;
  book: any;
  badge?: string;
  onBadgeChange: (badge: string) => void;
  onRemove: () => void;
}

const SortableBookItem: React.FC<SortableBookItemProps> = ({ id, book, onRemove, badge, onBadgeChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });
  
  const [_isEditingBadge, _setIsEditingBadge] = React.useState(false);

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        {...attributes} 
        {...listeners}
        className="p-2 cursor-grab active:cursor-grabbing hover:border-purple-300 transition-all"
      >
        <div className="absolute top-1 left-1 bg-purple-100 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <Menu size={12} className="text-purple-600" />
        </div>
        <img
          src={book.coverImage}
          alt={book.name}
          className="w-full aspect-square object-cover rounded mb-1 pointer-events-none"
        />
        <div className="text-xs font-medium text-slate-700 truncate pointer-events-none">{book.name}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
        >
          <X size={12} />
        </button>
      </div>
      <div className="border-t border-gray-100 px-2 py-1 bg-gray-50">
        <select
          value={badge || ''}
          onChange={(e) => {
            e.stopPropagation();
            onBadgeChange(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-xs px-1 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white cursor-pointer hover:border-purple-300 transition-colors"
        >
          <option value="">Sans badge</option>
          <option value="Best-seller">⭐ Best-seller</option>
          <option value="Nouveau">✨ Nouveau</option>
          <option value="Promotion">🔥 Promotion</option>
          <option value="Tendance">📈 Tendance</option>
          <option value="Coup de coeur">❤️ Coup de coeur</option>
          <option value="Célébration">🎁 Célébration</option>
          <option value="Exclusif">💎 Exclusif</option>
          <option value="Populaire">🌟 Populaire</option>
        </select>
      </div>
    </div>
  );
};

// Sortable wrapper for top-level menu cards (drag to reorder menus)
const SortableMenuCard: React.FC<{
  id: string;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
};

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { books, addBook, updateBook, deleteBook } = useBooks();
  const { mainMenu, updateMenuItem, addMenuItem, deleteMenuItem } = useMenus();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const { homepageConfig, updateHomepageConfig, isLoading: homepageLoading } = useHomepage();
  const [draftConfig, setDraftConfig] = useState<HomepageConfig | null>(null);
  useEffect(() => {
    if (homepageConfig && !draftConfig) setDraftConfig(homepageConfig);
  }, [homepageConfig]);
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
    addCustomer,
    isLoading: ordersLoading,
  } = useEcommerce();
  const { uploadFile: uploadToBucket } = useUpload();
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeTab, setActiveTab] = useState<'home' | 'books' | 'wizard' | 'avatars' | 'content' | 'productpage' | 'menus' | 'customers' | 'orders' | 'printers' | 'settings' | 'analytics' | 'shipping' | 'homepage'>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [_isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFulfillment, setShowFulfillment] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  // EPUB from bucket state (used by Avatar import)
  const [bucketEpubs, setBucketEpubs] = useState<Array<{name: string, path: string, size?: number}>>([]);
  const [isLoadingEpubs, setIsLoadingEpubs] = useState(false);

  // EPUB + IDML import state
  const [showIdmlImporter, setShowIdmlImporter] = useState(false);
  const [isImportingStoryboard, setIsImportingStoryboard] = useState(false);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [idmlFile, setIdmlFile] = useState<File | null>(null);
  const [fontFilesByFamily, setFontFilesByFamily] = useState<Record<string, File[]>>({});
  const [detectedFonts, setDetectedFonts] = useState<string[]>([]);

  // Avatar EPUB import state
  const [showAvatarEpubSelector, setShowAvatarEpubSelector] = useState(false);
  const [isImportingAvatarEpub, setIsImportingAvatarEpub] = useState(false);
  const [avatarEpubFile, setAvatarEpubFile] = useState<File | null>(null);

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

  const handleDragEnd = (event: DragEndEvent, menuIdx: number, colIdx?: number) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const menu = localMainMenu[menuIdx];
      if (!menu) return;
      
      if (colIdx !== undefined && menu.columns) {
        const col = menu.columns[colIdx];
        const oldIndex = col.items.indexOf(active.id as string);
        const newIndex = col.items.indexOf(over!.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(col.items, oldIndex, newIndex);
            const newCols = [...menu.columns];
            newCols[colIdx] = { ...col, items: newItems };
            setLocalMenuItem(menuIdx, { ...menu, columns: newCols });
        }
      } else if (menu.items) {
        const oldIndex = menu.items.indexOf(active.id as string);
        const newIndex = menu.items.indexOf(over!.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(menu.items, oldIndex, newIndex);
            setLocalMenuItem(menuIdx, { ...menu, items: newItems });
        }
      }
    }
  };

  // Fulfillment Tracking State
  const [fulfillmentTracking, setFulfillmentTracking] = useState('');
  const [isConfirmingShipment, setIsConfirmingShipment] = useState(false);

  // Load EPUBs from bucket when modal opens
  const loadBucketEpubs = async () => {
    setIsLoadingEpubs(true);
    try {
      const response = await fetch('/api/epubs');
      if (response.ok) {
        const data = await response.json();
        setBucketEpubs(data.epubs || []);
      }
    } catch (error) {
      console.error('[loadBucketEpubs] Error:', error);
      toast.error('Erreur lors du chargement des EPUBs');
    } finally {
      setIsLoadingEpubs(false);
    }
  };

  // Load EPUBs when modal opens
  // Function to import avatar template EPUB
  const handleImportAvatarEpub = async (epubPath: string) => {
    if (!selectedBook) {
      toast.error('Veuillez sélectionner un livre');
      return;
    }

    if (!selectedBook.wizardConfig?.tabs || selectedBook.wizardConfig.tabs.length === 0) {
      toast.error('Le livre n\'a pas de configuration wizard. Veuillez d\'abord configurer les personnages.');
      return;
    }

    const targetTabId = selectedAvatarTabId || selectedBook.wizardConfig.tabs[0]?.id;
    if (!targetTabId) {
      toast.error('Aucun personnage sélectionné');
      return;
    }

    setIsImportingAvatarEpub(true);
    try {
      toast.info('Import du template d\'avatars en cours...');
      
      console.log('[Avatar Template] Starting import for book:', selectedBook.id, 'tab:', targetTabId, 'path:', epubPath);
      
      const response = await fetch('/api/epubs/extract-avatar-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epubPath,
          bookId: selectedBook.id,
          tabId: targetTabId,
        }),
      });

      console.log('[Avatar Template] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Avatar Template] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to import avatar template');
      }

      const result = await response.json();
      console.log('[Avatar Template] Result:', result);

      // Merge avatar mappings with existing ones
      const newAvatarMappings = {
        ...(selectedBook.wizardConfig.avatarMappings || {}),
        ...result.avatarMappings
      };

      // Update book
      const updatedBook = {
        ...selectedBook,
        wizardConfig: {
          ...selectedBook.wizardConfig,
          avatarMappings: newAvatarMappings
        }
      };

      await updateBook(updatedBook);
      setDraftBook(updatedBook);
      setShowAvatarEpubSelector(false);

      const successMsg = result.stats.generatedCombinations !== undefined
        ? `Template d'avatars importé : ${result.stats.generatedCombinations} avatars générés depuis ${result.stats.totalLayers} layers (${result.stats.outputFormat}, ${result.stats.avgFileSize} moy.)`
        : `Template d'avatars importé : ${result.stats.mappedImages}/${result.stats.totalImages} images mappées`;
      
      toast.success(successMsg);
      
      // Show layer details if available
      if (result.stats.layersByType) {
        const layerDetails = Object.entries(result.stats.layersByType)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');
        console.log(`[Avatar Template] Layers détaillés: ${layerDetails}`);
      }
    } catch (error: any) {
      console.error('[Avatar Template] Error:', error);
      toast.error(`Erreur lors de l'import du template d'avatars: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsImportingAvatarEpub(false);
    }
  };

  // Function to import avatar template from local file
  const handleImportAvatarEpubFromFile = async () => {
    if (!selectedBook) {
      toast.error('Veuillez sélectionner un livre');
      return;
    }

    if (!avatarEpubFile) {
      toast.error('Veuillez sélectionner un fichier EPUB');
      return;
    }

    if (!selectedBook.wizardConfig?.tabs || selectedBook.wizardConfig.tabs.length === 0) {
      toast.error('Le livre n\'a pas de configuration wizard. Veuillez d\'abord configurer les personnages.');
      return;
    }

    const targetTabId = selectedAvatarTabId || selectedBook.wizardConfig.tabs[0]?.id;
    if (!targetTabId) {
      toast.error('Aucun personnage sélectionné');
      return;
    }

    setIsImportingAvatarEpub(true);
    try {
      toast.info('Import du template d\'avatars en cours...');
      
      console.log('[Avatar Template File] Starting import for book:', selectedBook.id, 'tab:', targetTabId);
      
      // Convert file to base64
      const base64 = await fileToBase64(avatarEpubFile);
      console.log('[Avatar Template File] File converted to base64, length:', base64.length);
      
      const response = await fetch('/api/epubs/extract-avatar-template-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epub: base64,
          bookId: selectedBook.id,
          tabId: targetTabId,
        }),
      });

      console.log('[Avatar Template File] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Avatar Template File] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to import avatar template');
      }

      const result = await response.json();
      console.log('[Avatar Template File] Result:', result);
      console.log('[Avatar Template File] Imported avatarMappings:', result.avatarMappings);
      console.log('[Avatar Template File] Imported avatarMappings keys:', Object.keys(result.avatarMappings || {}));
      console.log('[Avatar Template File] Stats:', result.stats);
      
      // Show characteristics coverage to help debug why images were skipped
      if (result.stats.characteristicsCoverage) {
        console.log('[Avatar Template File] Characteristics found in images:');
        for (const [charKey, values] of Object.entries(result.stats.characteristicsCoverage)) {
          console.log(`  - ${charKey}: ${(values as string[]).join(', ')}`);
        }
      }
      
      // Get expected variants from tab
      const currentTab = selectedBook.wizardConfig.tabs.find(t => t.id === targetTabId);
      if (currentTab) {
        const expectedVariants = currentTab.variants.filter((v: any) => v.type === 'options').map((v: any) => v.id);
        console.log('[Avatar Template File] Expected variants from tab:', expectedVariants);
        
        // Check for mismatches
        const foundCharKeys = Object.keys(result.stats.characteristicsCoverage || {});
        const missing = expectedVariants.filter(v => !foundCharKeys.includes(v));
        const extra = foundCharKeys.filter(k => !expectedVariants.includes(k));
        
        if (missing.length > 0) {
          console.error('[Avatar Template File] PROBLEM: Images are missing these variants:', missing);
        }
        if (extra.length > 0) {
          console.warn('[Avatar Template File] Images contain extra characteristics not in tab:', extra);
        }
      }

      // Merge avatar mappings with existing ones
      const newAvatarMappings = {
        ...(selectedBook.wizardConfig.avatarMappings || {}),
        ...result.avatarMappings
      };

      // Update book
      const updatedBook = {
        ...selectedBook,
        wizardConfig: {
          ...selectedBook.wizardConfig,
          avatarMappings: newAvatarMappings
        }
      };

      await updateBook(updatedBook);
      setDraftBook(updatedBook);
      setShowAvatarEpubSelector(false);
      setAvatarEpubFile(null);

      const successMsg = result.stats.generatedCombinations !== undefined
        ? `Template d'avatars importé : ${result.stats.generatedCombinations} avatars générés depuis ${result.stats.totalLayers} layers (${result.stats.outputFormat}, ${result.stats.avgFileSize} moy.)`
        : `Template d'avatars importé : ${result.stats.mappedImages}/${result.stats.totalImages} images mappées`;
      
      toast.success(successMsg);
      
      // Show layer details if available
      if (result.stats.layersByType) {
        const layerDetails = Object.entries(result.stats.layersByType)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');
        console.log(`[Avatar Template File] Layers détaillés: ${layerDetails}`);
      }
      
      // Log avatar mappings for debugging
      console.log('[Avatar Template File] New avatarMappings after merge:', newAvatarMappings);
      console.log('[Avatar Template File] Total mappings in book:', Object.keys(newAvatarMappings).length);
      
      if (Object.keys(result.avatarMappings || {}).length === 0) {
        console.warn('[Avatar Template File] WARNING: No avatar mappings were generated!');
        console.warn('[Avatar Template File] Check server logs for details');
      }
    } catch (error: any) {
      console.error('[Avatar Template File] Error:', error);
      toast.error(`Erreur lors de l'import du template d'avatars: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsImportingAvatarEpub(false);
    }
  };

  // Function to import storyboard from EPUB + IDML
  const handleImportStoryboard = async () => {
    if (!selectedBook) {
      toast.error('Veuillez sélectionner un livre');
      return;
    }
    
    if (!epubFile || !idmlFile) {
      toast.error('Veuillez sélectionner un fichier EPUB et un fichier IDML');
      return;
    }

    setIsImportingStoryboard(true);
    try {
      // Upload EPUB to bucket
      toast.info('Upload EPUB vers le stockage...');
      const epubUpload = await uploadToBucket(epubFile);
      if (!epubUpload) throw new Error('Échec de l\'upload EPUB');

      // Upload IDML to bucket
      toast.info('Upload IDML vers le stockage...');
      const idmlUpload = await uploadToBucket(idmlFile);
      if (!idmlUpload) throw new Error('Échec de l\'upload IDML');

      // Upload font files to bucket
      const fontPaths: Array<{ name: string; objectPath: string; fontFamily: string }> = [];
      for (const [fontFamily, files] of Object.entries(fontFilesByFamily)) {
        for (const file of files) {
          const fontUpload = await uploadToBucket(file);
          if (!fontUpload) throw new Error(`Échec de l'upload de la police ${file.name}`);
          fontPaths.push({
            name: file.name,
            objectPath: fontUpload.objectPath,
            fontFamily
          });
        }
      }

      toast.info('Import du storyboard en cours...');
      const response = await fetch('/api/books/import-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epubPath: epubUpload.objectPath,
          idmlPath: idmlUpload.objectPath,
          fonts: fontPaths,
          bookId: selectedBook.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import storyboard');
      }

      const result = await response.json();

      // Log detailed debug info
      if (result.debug) {
        console.log('=== DEBUG INFO ===');
        console.log(`EPUB text positions found: ${result.debug.epubTextPositionsCount}`);
        console.log(`IDML text frames found: ${result.debug.idmlTextFramesCount}`);
        console.log(`Merged texts created: ${result.debug.mergedTextsCount}`);

        if (result.debug.epubTextPositionsSample) {
          console.log('EPUB positions sample:', result.debug.epubTextPositionsSample);
        }
        if (result.debug.idmlTextFramesSample) {
          console.log('IDML frames sample:', result.debug.idmlTextFramesSample);
        }
        if (result.debug.mergedTextsSample) {
          console.log('Merged texts sample:', result.debug.mergedTextsSample);
          
          // Show styles for each merged text
          console.log('\n=== STYLES APPLIQUÉS ===');
          result.debug.mergedTextsSample.forEach((text: any, idx: number) => {
            console.log(`\n[${idx}] "${text.content?.substring(0, 30)}..."`);
            console.log(`  - appliedParagraphStyle: ${text.appliedParagraphStyle || 'NONE'}`);
            console.log(`  - appliedCharacterStyle: ${text.appliedCharacterStyle || 'NONE'}`);
            console.log(`  - textAlign: ${text.style?.textAlign || 'DEFAULT'}`);
            console.log(`  - fontSize: ${text.style?.fontSize || 'DEFAULT'}`);
            console.log(`  - fontWeight: ${text.style?.fontWeight || 'DEFAULT'}`);
            console.log(`  - fontFamily: ${text.style?.fontFamily || 'UNDEFINED ⚠️'}`);
            console.log(`  - Full style:`, text.style);
          });
          console.log('\n=== STYLES DISPONIBLES ===');
          console.log('Available paragraph styles:', result.debug.availableParagraphStyles);
          console.log('Paragraph styles details:', result.debug.paragraphStylesDetails);
          console.log('========================');
        }
        console.log('==================');
      }

      // Update book with merged content (wizardConfig reste inchangé, pas de création automatique de tabs)
      // BUGFIX: Remplacer complètement le contentConfig au lieu de le merger
      // pour s'assurer que les nouveaux resolvedStyle des segments sont bien sauvegardés
      const updatedBook = {
        ...selectedBook,
        contentConfig: result.contentConfig  // Remplacer complètement, pas merger
      };
      
      console.log('[AdminDashboard] Updating book with new contentConfig');
      console.log('[AdminDashboard] Texts count:', result.contentConfig.texts?.length || 0);
      console.log('[AdminDashboard] First text has segments:', !!result.contentConfig.texts?.[0]?.conditionalSegments);
      console.log('[AdminDashboard] First segment has resolvedStyle:', !!result.contentConfig.texts?.[0]?.conditionalSegments?.[0]?.resolvedStyle);
      
      // Save to database
      await updateBook(updatedBook);
      setDraftBook(updatedBook);

      toast.success('Storyboard importé avec succès');
      
      setShowIdmlImporter(false);
      setEpubFile(null);
      setIdmlFile(null);
      setFontFilesByFamily({});
      setDetectedFonts([]);
      
      // Show custom fonts upload status
      if (result.uploadedFonts && Object.keys(result.uploadedFonts).length > 0) {
        toast.success(`${Object.keys(result.uploadedFonts).length} police(s) uploadée(s)`);
      }
      
      // Store detected fonts from IDML
      if (result.detectedFonts && result.detectedFonts.length > 0) {
        setDetectedFonts(result.detectedFonts);
        // Initialiser avec un tableau vide pour chaque police
        const initialFonts: Record<string, File[]> = {};
        result.detectedFonts.forEach((font: string) => {
          initialFonts[font] = [];
        });
        setFontFilesByFamily(initialFonts);
      }
      
      // Show warnings if any
      if (result.fontWarnings && result.fontWarnings.length > 0) {
        const errors = result.fontWarnings.filter((w: any) => w.severity === 'error');
        const warnings = result.fontWarnings.filter((w: any) => w.severity === 'warning');
        
        if (errors.length > 0) {
          toast.error(
            `Polices manquantes (${errors.length}) : ${errors.map((w: any) => w.fontFamily).join(', ')}`,
            { duration: 10000 }
          );
        }
        if (warnings.length > 0) {
          toast.warning(
            `Avertissements polices (${warnings.length}) : ${warnings.map((w: any) => w.fontFamily).join(', ')}`,
            { duration: 8000 }
          );
        }
      }
      
      // Show warning if no texts were created
      if (result.debug && result.stats.texts === 0) {
        toast.warning('Aucun texte créé lors de l\'import. Vérifiez la structure du fichier.', { duration: 10000 });
      }
    } catch (error: any) {
      console.error('Error importing storyboard:', error);
      toast.error(`Échec de l'import : ${error.message}`);
    } finally {
      setIsImportingStoryboard(false);
    }
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Function to check import files (IDML, EPUB, fonts)
  const handleCheckImport = async () => {
    const totalFontFiles = Object.values(fontFilesByFamily).reduce((sum, files) => sum + files.length, 0);
    if (!idmlFile && !epubFile && totalFontFiles === 0) {
      toast.error('Veuillez sélectionner au moins un fichier à vérifier');
      return;
    }

    try {
      toast.info('Upload des fichiers pour vérification...');
      
      const payload: { idmlPath?: string; epubPath?: string; fonts?: Array<{ name: string; objectPath: string; fontFamily: string }> } = {};
      
      if (idmlFile) {
        const upload = await uploadToBucket(idmlFile);
        if (!upload) throw new Error('Échec de l\'upload IDML');
        payload.idmlPath = upload.objectPath;
      }
      if (epubFile) {
        const upload = await uploadToBucket(epubFile);
        if (!upload) throw new Error('Échec de l\'upload EPUB');
        payload.epubPath = upload.objectPath;
      }
      if (totalFontFiles > 0) {
        payload.fonts = [];
        for (const [fontFamily, files] of Object.entries(fontFilesByFamily)) {
          for (const file of files) {
            const upload = await uploadToBucket(file);
            if (!upload) throw new Error(`Échec de l'upload de ${file.name}`);
            payload.fonts.push({ name: file.name, objectPath: upload.objectPath, fontFamily });
          }
        }
      }
      
      toast.info('Vérification des fichiers d\'import...');
      const response = await fetch('/api/books/check-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`);
      }

      const { results } = await response.json();
      console.log('[Check Import] Results:', results);
      
      // Show IDML results
      if (results.idml) {
        if (results.idml.valid) {
          toast.success(
            `✓ IDML valide : ${results.idml.stats.textFrames} textes, ${results.idml.stats.characterStyles} styles caractère`,
            { duration: 6000 }
          );
          if (results.idml.fonts && results.idml.fonts.length > 0) {
            // Store detected fonts
            setDetectedFonts(results.idml.fonts);
            
            // Initialize font upload containers
            const initialFonts: Record<string, File[]> = {};
            results.idml.fonts.forEach((font: string) => {
              initialFonts[font] = [];
            });
            setFontFilesByFamily(initialFonts);
            
            const fontsList = results.idml.fonts.slice(0, 5).join(', ');
            const suffix = results.idml.fonts.length > 5 ? ` (+${results.idml.fonts.length - 5})` : '';
            toast.info(`Polices IDML : ${fontsList}${suffix}`, { duration: 8000 });
          }
        } else {
          toast.error(`✗ IDML invalide : ${results.idml.error}`);
        }
      }
      
      // Show EPUB results
      if (results.epub) {
        if (results.epub.valid) {
          toast.success(`✓ EPUB valide : ${results.epub.pages} pages`, { duration: 5000 });
        } else {
          toast.error(`✗ EPUB invalide : ${results.epub.error}`);
        }
      }
      
      // Show fonts results with obfuscation warning
      if (results.fonts && results.fonts.length > 0) {
        const validFonts = results.fonts.filter((f: any) => f.valid);
        const obfuscatedFonts = results.fonts.filter((f: any) => f.obfuscated);
        
        if (validFonts.length === results.fonts.length) {
          toast.success(`✓ ${validFonts.length} police(s) valide(s)`, { duration: 5000 });
        } else if (obfuscatedFonts.length > 0) {
          toast.error(
            `⚠️ ${obfuscatedFonts.length} police(s) OBFUSQUÉE(S) par InDesign ! Utilisez les fichiers TTF/OTF originaux.`,
            { duration: 15000 }
          );
          obfuscatedFonts.forEach((f: any) => {
            console.error(`[Check Import] Police obfusquée: ${f.name} - ${f.details}`);
          });
        }
        
        // Log all font details
        results.fonts.forEach((f: any) => {
          const status = f.valid ? '✓' : (f.obfuscated ? '⚠️ OBFUSQUÉE' : '✗');
          console.log(`[Check Import] Font ${f.name}: ${status} - ${f.details || f.error || ''}`);
        });
      }
      
    } catch (error: any) {
      console.error('[Check Import] Error:', error);
      
      let errorMessage = error.message;
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez que le serveur est démarré et que les fichiers ne sont pas trop volumineux.';
      }
      
      toast.error(`Erreur de vérification : ${errorMessage}`, { duration: 8000 });
    }
  };

  // Menu local state (edits stay local until Save is clicked)
  const [localMainMenu, setLocalMainMenu] = useState<MenuItem[]>([]);

  // Sync local state when entering the tab or when remote data arrives
  React.useEffect(() => {
    if (activeTab === 'menus' && mainMenu.length > 0) {
      setLocalMainMenu(JSON.parse(JSON.stringify(mainMenu)));
    }
  }, [activeTab, mainMenu]);

  // Update one item in local state only
  const setLocalMenuItem = (idx: number, item: MenuItem) => {
    setLocalMainMenu(prev => {
      const next = [...prev];
      next[idx] = item;
      return next;
    });
  };

  const handleSaveMenu = async (idx: number) => {
    await updateMenuItem(idx, localMainMenu[idx]);
  };

  const [collapsedMenus, setCollapsedMenus] = useState<Set<string>>(new Set());

  // Collapse all menus by default when data loads
  React.useEffect(() => {
    if (mainMenu.length > 0) {
      setCollapsedMenus(new Set(mainMenu.map(m => m.id)));
    }
  }, [mainMenu.length]);

  const toggleMenuCollapse = (menuId: string) => {
    setCollapsedMenus(prev => {
      const next = new Set(prev);
      next.has(menuId) ? next.delete(menuId) : next.add(menuId);
      return next;
    });
  };

  const handleMenuCardDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localMainMenu.findIndex(m => m.id === String(active.id));
    const newIndex = localMainMenu.findIndex(m => m.id === String(over.id));
    const reordered = arrayMove(localMainMenu, oldIndex, newIndex).map((m, i) => ({ ...m, position: i }));
    setLocalMainMenu(reordered);
    await Promise.all(reordered.map((m, i) => updateMenuItem(i, m)));
  };

  // Edit Customer State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const emptyCustomerForm = { firstName: '', lastName: '', email: '', phone: '', address: { street: '', zipCode: '', city: '', country: '' } };
  const [editCustomerForm, setEditCustomerForm] = useState(emptyCustomerForm);
  const [originalEditCustomer, setOriginalEditCustomer] = useState(emptyCustomerForm);
  
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
  const [_fontSearch, _setFontSearch] = useState('');
  const [_availableFonts, setAvailableFonts] = useState<string[]>([]);

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

  // Utility function to resolve wizard mapping from parsed condition
  const resolveWizardMapping = (
    parsedCondition: { character: string; variant: string; option: string },
    wizardConfig: any
  ): string | null => {
    // Handle hero-* -> * mapping
    let effectiveTabId = parsedCondition.character;
    if (effectiveTabId.startsWith('hero-')) {
      effectiveTabId = effectiveTabId.substring(5); // Remove "hero-"
    }
    
    // Find the tab
    const tab = wizardConfig?.tabs?.find((t: any) => t.id === effectiveTabId);
    if (!tab) return null;
    
    // Find the variant
    const variant = tab.variants?.find((v: any) => v.id === parsedCondition.variant);
    if (!variant) return null;
    
    // Find the option
    const option = variant.options?.find((o: any) => o.id === parsedCondition.option);
    
    return `${tab.label} > ${variant.title || variant.label} > ${option?.label || parsedCondition.option}`;
  };

  // Utility function to resolve variable mapping
  const resolveVariableMapping = (
    variableName: string,
    wizardConfig: any
  ): string | null => {
    // Check if it's a preview variable (TXTVAR_dedication or TXTVAR_author)
    if (variableName === 'TXTVAR_dedication' || variableName === 'TXTVAR_author') {
      const fieldId = variableName.replace('TXTVAR_', '');
      const previewField = wizardConfig?.previewFields?.find((f: any) => f.id === fieldId);
      if (previewField) {
        return `Preview > ${previewField.label}`;
      }
      // Fallback si previewFields n'existe pas
      return fieldId === 'dedication' ? 'Preview > Dédicace' : 'Preview > Auteur';
    }
    
    // Expected format: TXTVAR_tabId_variantId or just variantId
    let tabId = '';
    let variantId = variableName;
    
    // Parse TXTVAR_ format
    if (variableName.includes('_')) {
      const parts = variableName.split('_');
      if (parts.length >= 3) {
        // Format: TXTVAR_hero-child_name -> parts = ["TXTVAR", "hero-child", "name"]
        tabId = parts[1];
        variantId = parts[2];
      } else if (parts.length === 2) {
        // Format: tabId_variantId -> parts = ["tabId", "variantId"]
        tabId = parts[0];
        variantId = parts[1];
      }
    }
    
    // Handle hero-* mapping
    if (tabId.startsWith('hero-')) {
      tabId = tabId.substring(5);
    }
    
    // If no tabId, search in all tabs
    if (!tabId) {
      for (const tab of (wizardConfig?.tabs || [])) {
        const variant = tab.variants?.find((v: any) => v.id === variantId);
        if (variant) {
          return `${tab.label} > ${variant.title || variant.label}`;
        }
      }
      return null;
    }
    
    // Search in specific tab
    const tab = wizardConfig?.tabs?.find((t: any) => t.id === tabId);
    if (!tab) return null;
    
    const variant = tab.variants?.find((v: any) => v.id === variantId);
    if (!variant) return null;
    
    return `${tab.label} > ${variant.title || variant.label}`;
  };

  // Printers State - loaded from API
  const [printers, setPrinters] = useState<PrinterType[]>([]);

  // Load printers from API
  React.useEffect(() => {
    fetch('/api/printers')
      .then(res => res.json())
      .then(data => setPrinters(data))
      .catch(err => console.error('Error loading printers:', err));
  }, []);

  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  
  // Content Editor State
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedEpubPageIndex, setSelectedEpubPageIndex] = useState<number | null>(null);
  const [selectedAvatarTabId, setSelectedAvatarTabId] = useState<string | null>(null);
  const [avatarFilters, setAvatarFilters] = useState<Record<string, string[]>>({});
  
  // Helper function to generate avatar combinations
  const generateAvatarCombinations = (tab: any): Array<{ parts: Array<{ variantId: string; id: string; label: string }>, key: string }> => {
    if (!tab || !tab.variants) return [];
    
    // Filter option variants only (include color type for avatar combinations)
    const optionVariants = tab.variants.filter((v: any) => v.type === 'options' || v.type === 'color' || !v.type);
    
    // Filter variants that have options
    const variantsWithOptions = optionVariants.filter((v: any) => v.options && v.options.length > 0);
    
    if (variantsWithOptions.length === 0) return [];
    
    // Generate cartesian product of all options
    const generateCombinations = (variants: any[], currentIndex: number, currentParts: any[]): any[] => {
      if (currentIndex >= variants.length) {
        // Build combination object
        const optionIds = currentParts.map(p => p.id);
        const key = optionIds.join('_');
        return [{ parts: currentParts, key }];
      }
      
      const variant = variants[currentIndex];
      const results: any[] = [];
      
      for (const option of variant.options) {
        const part = {
          variantId: variant.id,
          id: option.id,
          label: `${variant.id}:${option.id}`
        };
        const newParts = [...currentParts, part];
        const combos = generateCombinations(variants, currentIndex + 1, newParts);
        results.push(...combos);
      }
      
      return results;
    };
    
    return generateCombinations(variantsWithOptions, 0, []);
  };
  const [viewMode, _setViewMode] = useState<'single' | 'spread'>('single');
  const [activeLayerId, _setActiveLayerId] = useState<string | null>(null);
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());

  const contextBook = books.find(b => b.id === selectedBookId);
  const [draftBook, setDraftBook] = useState<BookProduct | null>(null);
  const selectedBook = draftBook || contextBook;

  // Effect to load all fonts used in the book
  React.useEffect(() => {
    if (!selectedBook?.contentConfig?.texts) return;
    
    const usedFonts = new Set<string>();
    selectedBook.contentConfig.texts.forEach(text => {
        if (text.style?.fontFamily) {
            // Extract primary font name (before comma for fallbacks)
            let fontName = text.style.fontFamily.split(',')[0].trim();
            // Remove quotes if present
            fontName = fontName.replace(/["']/g, '');
            if (fontName) usedFonts.add(fontName);
        }
    });

    // Local/system fonts that are NOT on Google Fonts - skip loading these
    const nonGoogleFonts = new Set([
      'Agency FB', 'Chiller', 'Arial', 'Helvetica', 'Times New Roman', 
      'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS', 'Impact',
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'
    ]);

    usedFonts.forEach(font => {
         // Skip non-Google fonts
         if (nonGoogleFonts.has(font)) return;
         
         const fontEncoded = encodeURIComponent(font.replace(/ /g, '+'));
         const href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
         
         // Use try-catch to avoid querySelector errors with special characters
         try {
           const existingLink = document.querySelector(`link[href*="family=${fontEncoded}"]`);
           if (!existingLink) {
               const link = document.createElement('link');
               link.href = href;
               link.rel = 'stylesheet';
               document.head.appendChild(link);
           }
         } catch (e) {
           // Skip fonts with special characters that break querySelector
           console.warn(`[Fonts] Could not check/load font: ${font}`);
         }
    });
  }, [selectedBook?.contentConfig?.texts]);

  const [_activeRightTab, _setActiveRightTab] = useState<'layers' | 'properties'>('layers');

  // Drag & Drop State
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragStartElementPos, setDragStartElementPos] = useState<{x: number, y: number} | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'rotate'
  const [initialDims, setInitialDims] = useState<{w: number, h: number, r: number} | null>(null);

  // Grid & Precision State
  const [_showGrid, _setShowGrid] = useState(false);
  const [_zoomLevel, _setZoomLevel] = useState(1);
  const [_gridSizeMm, _setGridSizeMm] = useState(10); // 10mm grid default
  const [_snapToGrid, _setSnapToGrid] = useState(false);

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


  // SETTINGS STATE - loaded from API
  const defaultSettingsValue = {
    general: { storeName: '', supportEmail: '', currency: 'EUR', language: 'fr' },
    payment: { 
      stripeEnabled: false, 
      stripeKey: '', 
      stripeSecretKey: '',
      paypalEnabled: false,
      acceptedPaymentMethods: ['visa', 'mastercard', 'amex', 'applepay', 'googlepay'] as string[]
    },
    notifications: { orderConfirmation: true, shippingUpdate: true }
  };
  const [settings, setSettings] = useState(defaultSettingsValue);
  const [savedSettings, setSavedSettings] = useState(defaultSettingsValue);

  // Load settings from API
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const [general, payment, notifications] = await Promise.all([
          fetch('/api/settings/general').then(r => r.ok ? r.json() : null),
          fetch('/api/settings/payment').then(r => r.ok ? r.json() : null),
          fetch('/api/settings/notifications').then(r => r.ok ? r.json() : null)
        ]);
        const loaded = {
          general: general?.value || settings.general,
          payment: payment?.value || settings.payment,
          notifications: notifications?.value || settings.notifications
        };
        setSettings(loaded);
        setSavedSettings(loaded);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (section: string) => {
    try {
      const sectionKey = section === 'Général' ? 'general' : 
                         section === 'Paiement' ? 'payment' : 'notifications';
      const value = settings[sectionKey as keyof typeof settings];
      await fetch(`/api/settings/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setSavedSettings(prev => ({ ...prev, [sectionKey]: value }));
      toast.success(`Réglages "${section}" sauvegardés avec succès`);
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    }
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
             const idx = pages.findIndex(p => p.pageIndex.toString() === selectedPageId);
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
                // Resize logic (Simplified)
                
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

  const handleSaveBook = (updatedBook: BookProduct) => {
    setDraftBook(updatedBook);
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
      contentConfig: { pages: [], texts: [], images: [] },
      isHidden: 1,
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

  // Handlers for preview fields
  const handleTogglePreviewField = (fieldId: string) => {
    if (!selectedBook) return;
    
    // Initialize previewFields if it doesn't exist
    const currentFields = selectedBook.wizardConfig.previewFields || [
      { id: 'dedication', label: 'Dédicace', enabled: false, textElementId: '' },
      { id: 'author', label: 'Auteur', enabled: false, textElementId: '' }
    ];
    
    const updatedFields = currentFields.map(field => 
      field.id === fieldId ? { ...field, enabled: !field.enabled } : field
    );
    
    handleSaveBook({
      ...selectedBook,
      wizardConfig: {
        ...selectedBook.wizardConfig,
        previewFields: updatedFields
      }
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const wizardFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportContent = () => {
    if (!selectedBook) return;

    // Filter out orphaned elements (elements pointing to non-existent pages)
    // We strictly use pageIndex as the reference since that's what we use in rendering
    const validPageNumbers = new Set(selectedBook.contentConfig.pages.map(p => p.pageIndex));
    
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

    const handleImportContent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBook) return;

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      let importedData: any;

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
        importedData = JSON.parse(content);
      }

      if (!importedData.contentConfig) {
        toast.error('Format invalide : Ce fichier ne contient pas une configuration de contenu valide');
        return;
      }

      if (await confirmDialog('Attention : Cette action va remplacer la configuration du CONTENU (Pages, Textes, Images). Le Wizard (Personnages) ne sera PAS modifié. Voulez-vous continuer ?')) {
        handleSaveBook({
          ...selectedBook,
          contentConfig: importedData.contentConfig,
          features: {
            ...selectedBook.features,
            ...(importedData.features ? {
              dimensions: importedData.features.dimensions,
              printConfig: importedData.features.printConfig
            } : {})
          },
          wizardConfig: selectedBook.wizardConfig
        });
        toast.success('Configuration Contenu importée avec succès');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import du fichier : ' + (error as Error).message);
    } finally {
      if (event.target) event.target.value = '';
    }
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

  const handleImportWizard = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedBook) return;
      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        const imported = JSON.parse(content);
        if (!imported.wizardConfig) {
          toast.error('Format invalide (wizardConfig manquant)');
          return;
        }
        if (await confirmDialog('Remplacer toute la configuration du Wizard (Personnages, Variantes) ?')) {
          handleSaveBook({ ...selectedBook, wizardConfig: imported.wizardConfig });
          toast.success('Configuration Wizard importée');
        }
      } catch (err) {
        toast.error('Erreur de lecture du fichier');
      } finally {
        if (event.target) event.target.value = '';
      }
  };

  // Composant pour uploader les fichiers de police par famille
  const FontFamilyUploader = ({ 
    fontFamily, 
    files, 
    onFilesChange 
  }: { 
    fontFamily: string; 
    files: File[]; 
    onFilesChange: (files: File[]) => void;
  }) => {
    const inputId = `font-input-${fontFamily.replace(/\s+/g, '-')}`;
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        onFilesChange([...files, ...newFiles]);
      }
    };
    
    const removeFile = (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    };
    
    return (
      <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-900">{fontFamily}</span>
          <span className="text-xs text-purple-600">
            {files.length} fichier(s)
          </span>
        </div>
        
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white px-2 py-1.5 rounded text-xs">
              <span className="truncate text-slate-700">{file.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          
          <label htmlFor={inputId} className="block">
            <input
              id={inputId}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          <div className="border-2 border-dashed border-purple-300 rounded p-2 hover:bg-purple-100 cursor-pointer text-center transition-colors">
            <span className="text-xs text-purple-600">
              + Ajouter fichier(s)
            </span>
          </div>
          </label>
        </div>
      </div>
    );
  };

  return (
     <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
     {ConfirmDialog}
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
               onClick={() => { setActiveTab('homepage'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'homepage' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Globe size={18} />
                <span>Page d'accueil</span>
             </button>

             <button 
               onClick={() => { setActiveTab('menus'); setSelectedBookId(null); setIsEditing(false); }}
               className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'menus' ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
             >
                <Menu size={18} />
                <span>Menus & Navigation</span>
             </button>

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
                       onClick={async () => {
                          const hasChanges = hasUnsavedChanges || (draftBook && contextBook && JSON.stringify(draftBook) !== JSON.stringify(contextBook));
                          if (!hasChanges) return;
                          const bookToSave = draftBook || selectedBook;
                          if (bookToSave) {
                             try {
                                await updateBook(bookToSave);
                                setDraftBook(JSON.parse(JSON.stringify(bookToSave)));
                             } catch (error) {
                                console.error("Error saving book:", error);
                             }
                          }
                       }}
                       disabled={!selectedBook || !(hasUnsavedChanges || (draftBook && contextBook && JSON.stringify(draftBook) !== JSON.stringify(contextBook)))}
                       className={`w-full font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-sm ${
                          hasUnsavedChanges || (draftBook && contextBook && JSON.stringify(draftBook) !== JSON.stringify(contextBook))
                             ? 'bg-brand-coral hover:bg-red-500 text-white cursor-pointer' 
                             : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
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

                   <button
                     onClick={() => setActiveTab('productpage')}
                     className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${activeTab === 'productpage' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
                   >
                      <LayoutTemplate size={16} />
                      <span>Page produit</span>
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
                   activeTab === 'productpage' ? 'Page produit' :
                   activeTab === 'menus' ? 'Menus' :
                   activeTab === 'homepage' ? 'Page d\'accueil' :
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
                <HomeDashboard orders={orders} books={books} ordersLoading={ordersLoading} setActiveTab={setActiveTab} setSelectedOrderId={setSelectedOrderId} />
              )}
              

              {/* --- VIEW: ANALYTICS --- */}
              {activeTab === 'analytics' && <AnalyticsPanel />}

              {/* --- VIEW: SETTINGS --- */}
              {activeTab === 'settings' && (
                <SettingsPanel settings={settings} setSettings={setSettings} handleSaveSettings={handleSaveSettings} savedSettings={savedSettings} />
              )}
              

              {/* --- VIEW: HOMEPAGE MANAGEMENT --- */}
              {activeTab === 'homepage' && (
                <div className="space-y-6">
                   <div className="mb-6 flex items-center justify-between">
                      <div>
                         <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestion de la page d'accueil</h2>
                         <p className="text-slate-500">Personnalisez le contenu et l'apparence de votre page d'accueil.</p>
                      </div>
                      <SaveButton
                         hasChanges={!!draftConfig && !!homepageConfig && JSON.stringify(draftConfig) !== JSON.stringify(homepageConfig)}
                         isSaving={homepageLoading}
                         onSave={() => { if (draftConfig) updateHomepageConfig(draftConfig); }}
                         className="px-6 py-3 rounded-lg text-sm"
                      />
                   </div>

                   {homepageLoading || !draftConfig ? (
                      <div className="flex items-center justify-center py-12">
                         <Loader2 className="animate-spin text-indigo-600" size={32} />
                      </div>
                   ) : (
                      <>
                         {/* Sections Management */}
                         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                  <Layers size={20} className="text-purple-600" />
                                  Sections de livres
                               </h3>
                               <button
                                  onClick={() => {
                                     const newSection: HomepageSection = {
                                        id: `section-${Date.now()}`,
                                        title: 'Nouvelle section',
                                        subtitle: '',
                                        isVisible: false,
                                        bookIds: [],
                                        badgeType: 'star'
                                     };
                                     setDraftConfig({
                                        ...draftConfig,
                                        sections: [...draftConfig.sections, newSection]
                                     });
                                  }}
                                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                               >
                                  <Plus size={16} />
                                  Nouvelle section
                               </button>
                            </div>

                            <div className="space-y-4">
                               {draftConfig.sections.map((section, sectionIdx) => (
                                  <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                     <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1 space-y-3">
                                           <div className="flex items-center gap-3">
                                              <input
                                                 type="text"
                                                 value={section.title}
                                                 onChange={(e) => {
                                                    const newSections = [...draftConfig.sections];
                                                    newSections[sectionIdx] = { ...section, title: e.target.value };
                                                    setDraftConfig({ ...draftConfig, sections: newSections });
                                                 }}
                                                 className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                                                 placeholder="Titre de la section"
                                              />
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                 <input
                                                    type="checkbox"
                                                    checked={section.isVisible}
                                                    onChange={(e) => {
                                                       const newSections = [...draftConfig.sections];
                                                       newSections[sectionIdx] = { ...section, isVisible: e.target.checked };
                                                       setDraftConfig({ ...draftConfig, sections: newSections });
                                                    }}
                                                    className="w-4 h-4 rounded border border-gray-300"
                                                 />
                                                 <span className="text-sm text-slate-600">Visible</span>
                                              </label>
                                              <button
                                                 onClick={async () => {
                                                    if (await confirmDialog('Supprimer cette section ?')) {
                                                       const newSections = draftConfig.sections.filter((_, idx) => idx !== sectionIdx);
                                                       setDraftConfig({ ...draftConfig, sections: newSections });
                                                    }
                                                 }}
                                                 className="text-red-600 hover:text-red-700 p-2"
                                              >
                                                 <Trash2 size={18} />
                                              </button>
                                           </div>
                                           <input
                                              type="text"
                                              value={section.subtitle || ''}
                                              onChange={(e) => {
                                                 const newSections = [...draftConfig.sections];
                                                 newSections[sectionIdx] = { ...section, subtitle: e.target.value };
                                                 setDraftConfig({ ...draftConfig, sections: newSections });
                                              }}
                                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-purple-500 outline-none"
                                              placeholder="Sous-titre (optionnel)"
                                           />
                                        </div>
                                     </div>

                                     {/* Books in this section */}
                                     <div className="mt-4 pt-4 border-t border-gray-300">
                                        <div className="text-sm font-medium text-slate-700 mb-2">
                                           Livres affichés ({section.bookIds.length})
                                           <span className="text-xs text-slate-500 ml-2 font-normal">Glissez pour réorganiser</span>
                                        </div>
                                        <DndContext
                                           sensors={sensors}
                                           collisionDetection={closestCenter}
                                           onDragEnd={(event: DragEndEvent) => {
                                              const { active, over } = event;
                                              if (over && active.id !== over.id) {
                                                 const oldIndex = section.bookIds.indexOf(active.id as string);
                                                 const newIndex = section.bookIds.indexOf(over.id as string);
                                                 const newBookIds = arrayMove(section.bookIds, oldIndex, newIndex);
                                                 const newSections = [...draftConfig.sections];
                                                 newSections[sectionIdx] = { ...section, bookIds: newBookIds };
                                                 setDraftConfig({ ...draftConfig, sections: newSections });
                                              }
                                           }}
                                        >
                                           <SortableContext items={section.bookIds} strategy={rectSortingStrategy}>
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                 {section.bookIds.map((bookId) => {
                                                    const book = books.find(b => b.id === bookId);
                                                    if (!book) return null;
                                                    return (
                                                       <SortableBookItem
                                                          key={bookId}
                                                          id={bookId}
                                                          book={book}
                                                          badge={section.bookBadges?.[bookId]}
                                                          onBadgeChange={(badge) => {
                                                             const newSections = [...draftConfig.sections];
                                                             newSections[sectionIdx] = {
                                                                ...section,
                                                                bookBadges: {
                                                                   ...section.bookBadges,
                                                                   [bookId]: badge
                                                                }
                                                             };
                                                             setDraftConfig({ ...draftConfig, sections: newSections });
                                                          }}
                                                          onRemove={() => {
                                                             const newSections = [...draftConfig.sections];
                                                             const newBookBadges = { ...section.bookBadges };
                                                             delete newBookBadges[bookId];
                                                             newSections[sectionIdx] = {
                                                                ...section,
                                                                bookIds: section.bookIds.filter(id => id !== bookId),
                                                                bookBadges: newBookBadges
                                                             };
                                                             setDraftConfig({ ...draftConfig, sections: newSections });
                                                          }}
                                                       />
                                                    );
                                                 })}
                                              </div>
                                           </SortableContext>
                                        </DndContext>
                                        <details className="mt-3">
                                           <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700">
                                              + Ajouter des livres à cette section
                                           </summary>
                                           <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-white rounded border border-gray-200">
                                              {books.filter(b => !b.isHidden && !section.bookIds.includes(b.id)).map((book) => (
                                                 <div
                                                    key={book.id}
                                                    onClick={() => {
                                                       const newSections = [...draftConfig.sections];
                                                       newSections[sectionIdx] = {
                                                          ...section,
                                                          bookIds: [...section.bookIds, book.id]
                                                       };
                                                       setDraftConfig({ ...draftConfig, sections: newSections });
                                                    }}
                                                    className="cursor-pointer hover:bg-purple-50 rounded-lg border border-gray-200 p-2 transition-colors"
                                                 >
                                                    <img
                                                       src={book.coverImage}
                                                       alt={book.name}
                                                       className="w-full aspect-square object-cover rounded mb-1"
                                                    />
                                                    <div className="text-xs font-medium text-slate-700 truncate">{book.name}</div>
                                                 </div>
                                              ))}
                                           </div>
                                        </details>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </>
                   )}
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
                                 <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{formatPrice(book.price)}</span>
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
                                onClick={async () => {
                                   if (await confirmDialog('Êtes-vous sûr de vouloir supprimer ce livre ?')) {
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
                                           className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral"
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
                                        if (!sortConfig) {
                                           // Default: sort by date descending (newest first)
                                           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                        }
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
                                     // Real payment status from Stripe
                                     const paymentStatusValue = (order as any).paymentStatus || 'pending';
                                     const paymentStatusLabels: Record<string, string> = {
                                        'paid': 'Payé',
                                        'pending': 'En attente',
                                        'failed': 'Échoué',
                                        'refunded': 'Remboursé'
                                     };
                                     const paymentStatusColors: Record<string, string> = {
                                        'paid': 'bg-green-100 text-green-700',
                                        'pending': 'bg-orange-100 text-orange-800',
                                        'failed': 'bg-red-100 text-red-700',
                                        'refunded': 'bg-purple-100 text-purple-700'
                                     };
                                     const paymentStatus = paymentStatusLabels[paymentStatusValue] || 'En attente';
                                     const paymentColor = paymentStatusColors[paymentStatusValue] || 'bg-orange-100 text-orange-800';
                                     const isPaid = paymentStatusValue === 'paid';
                                     
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
                                                 className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral"
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
                                           <td className="px-4 py-3 font-bold text-slate-900 group-hover:underline">#{order.id}</td>
                                           <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                              {formatDate(order.createdAt)}
                                              <span className="text-slate-400 ml-1 text-[10px]">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                           </td>
                                           <td className="px-4 py-3">
                                              <div className="font-medium text-slate-900">{order.customerName}</div>
                                           </td>
                                           <td className="px-4 py-3 text-right font-medium text-slate-900">
                                              {Number(order.totalAmount).toFixed(2)} €
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
                                                    className="w-full text-sm border border-gray-300 rounded-lg pl-10 pr-3 py-2 bg-slate-50 focus:ring-brand-coral focus:border-brand-coral cursor-pointer"
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
                                                            className="w-full border border-gray-200 bg-slate-50 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base shadow-sm outline-none"
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
                                                                            {formatDate(c.createdAt)}
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
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={newOrderForm.customer.lastName}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, lastName: e.target.value}})}
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                        <input 
                                            type="email" 
                                            value={newOrderForm.customer.email}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, email: e.target.value}})}
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
                                        <input 
                                            type="tel" 
                                            value={newOrderForm.customer.phone}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, phone: e.target.value}})}
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code Postal <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newOrderForm.customer.address.zipCode}
                                                onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, zipCode: e.target.value}}})}
                                                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newOrderForm.customer.address.city}
                                                onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, city: e.target.value}}})}
                                                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays <span className="text-red-500">*</span></label>
                                        <select 
                                            value={newOrderForm.customer.address.country}
                                            onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, country: e.target.value}}})}
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        >
                                            <option value="">Sélectionner un livre...</option>
                                            {books.map(book => (
                                                <option key={book.id} value={book.id}>{book.name} - {formatPrice(book.price)}</option>
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
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Personnalisation (JSON)</h4>
                                        <div className="space-y-3">
                                            <textarea
                                                rows={5}
                                                className="w-full text-sm font-mono border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2 bg-slate-50"
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
                                <CreateButton
                                    canSubmit={!!(
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
                                    isSaving={false}
                                    label="Créer la commande"
                                    onSubmit={submitNewOrder}
                                    className="w-full py-3 rounded-xl"
                                />
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
                                ? formatDateTime(orders.find(o => o.id === selectedOrderId)!.createdAt)
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
                                                  <span className="font-bold">{formatPrice(item.price)}</span>
                                               </div>
                                               <p className="text-sm text-slate-500 mb-1">Quantité: {item.quantity}</p>
                                               <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded max-w-md overflow-x-auto whitespace-pre-wrap">
                                                  {JSON.stringify(item.configuration || (item as any).config, null, 2)}
                                               </pre>
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
                                   <div className="mb-4">
                                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                         <Printer size={18} className="text-indigo-600" />
                                         Production & Fichiers
                                      </h3>
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
                                               toast.info('PDF imprimeur : Cette fonctionnalité sera implémentée via InDesign', {
                                                  description: 'Les PDF de production seront générés directement depuis InDesign avec les données de commande.'
                                               });
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-colors" 
                                            title="PDF imprimeur (à venir)"
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
                                               toast.info('PDF imprimeur : Cette fonctionnalité sera implémentée via InDesign', {
                                                  description: 'Les PDF de production seront générés directement depuis InDesign avec les données de commande.'
                                               });
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-colors" 
                                            title="PDF imprimeur (à venir)"
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

                                {/* Payment Info from Stripe */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                      <CreditCard size={18} className="text-indigo-600" />
                                      Paiement
                                   </h3>
                                   <div className="space-y-3">
                                      <div>
                                         <div className="text-xs text-slate-500 uppercase font-bold mb-1">Statut</div>
                                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                            (order as any).paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                            (order as any).paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                                            (order as any).paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-700' :
                                            'bg-orange-100 text-orange-800'
                                         }`}>
                                            {(order as any).paymentStatus === 'paid' ? 'Payé' :
                                             (order as any).paymentStatus === 'failed' ? 'Échoué' :
                                             (order as any).paymentStatus === 'refunded' ? 'Remboursé' : 'En attente'}
                                         </span>
                                      </div>
                                      {(order as any).stripeSessionId && (
                                         <div>
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Session Stripe</div>
                                            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded break-all">
                                               {(order as any).stripeSessionId}
                                            </div>
                                         </div>
                                      )}
                                      {(order as any).stripePaymentIntentId && (
                                         <div>
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Payment Intent</div>
                                            <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded break-all">
                                               {(order as any).stripePaymentIntentId}
                                            </div>
                                            <a 
                                               href={`https://dashboard.stripe.com/payments/${(order as any).stripePaymentIntentId}`}
                                               target="_blank"
                                               rel="noopener noreferrer"
                                               className="text-xs text-indigo-600 font-bold hover:underline mt-1 inline-block"
                                            >
                                               Voir sur Stripe →
                                            </a>
                                         </div>
                                      )}
                                   </div>
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
                                                           {formatDateTime(log.date)}
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
                                                    className="w-full text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                               value={newComment}
                                               onChange={(e) => setNewComment(e.target.value)}
                                               onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && newComment.trim()) {
                                                     addOrderLog(order.id, { type: 'comment', message: newComment.trim() });
                                                     setNewComment('');
                                                  }
                                               }}
                                            />
                                         </div>
                                         <button 
                                            onClick={() => {
                                               if (newComment.trim()) {
                                                  addOrderLog(order.id, { type: 'comment', message: newComment.trim() });
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
                                               <input type="checkbox" defaultChecked id="notify-check" className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral" />
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
                                      <SaveButton
                                         hasChanges={!!fulfillmentTracking && fulfillmentTracking !== (order.trackingNumber || '')}
                                         isSaving={isConfirmingShipment}
                                         onSave={async () => {
                                            if (!fulfillmentTracking) {
                                               toast.error("Veuillez entrer un numéro de suivi");
                                               return;
                                            }
                                            setIsConfirmingShipment(true);
                                            try {
                                               await updateOrderTracking(order.id, fulfillmentTracking);
                                               toast.success(`Commande expédiée avec le suivi ${fulfillmentTracking}`);
                                               setShowFulfillment(false);
                                            } finally {
                                               setIsConfirmingShipment(false);
                                            }
                                         }}
                                         label="Confirmer l'expédition"
                                         savedLabel="Expédition enregistrée"
                                         className="w-full py-2.5 rounded-lg text-sm"
                                      />
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
                  <div className="max-w-lg mx-auto space-y-6">
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
                                        className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.lastName}
                                        onChange={(e) => setNewCustomerForm({...newCustomerForm, lastName: e.target.value})}
                                        className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                <input 
                                    type="email" 
                                    value={newCustomerForm.email}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                                    className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone <span className="text-red-500">*</span></label>
                                <input 
                                    type="tel" 
                                    value={newCustomerForm.phone}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                                    className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code Postal <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newCustomerForm.address.zipCode}
                                                onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, zipCode: e.target.value}})}
                                                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={newCustomerForm.address.city}
                                                onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, city: e.target.value}})}
                                                className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays</label>
                                        <select 
                                            value={newCustomerForm.address.country}
                                            onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, country: e.target.value}})}
                                            className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
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
                            <CreateButton
                                canSubmit={!!(newCustomerForm.firstName && newCustomerForm.lastName && newCustomerForm.email && newCustomerForm.phone && newCustomerForm.address.street && newCustomerForm.address.zipCode && newCustomerForm.address.city)}
                                isSaving={false}
                                label="Créer le client"
                                onSubmit={submitNewCustomer}
                                className="px-6 py-2.5 rounded-lg"
                            />
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
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Ville</th>
                                <th className="px-6 py-4 text-center">Commandes</th>
                                <th className="px-6 py-4 text-right">Total dépensé</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {[...customers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(customer => (
                                <tr key={customer.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                                   <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{customer.firstName} {customer.lastName}</div>
                                      <div className="text-xs text-slate-400">Inscrit le {formatDate(customer.createdAt)}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                      {(customer as any).hasAccount ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                          Compte
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                                          Guest
                                        </span>
                                      )}
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
                                      {Number(customer.totalSpent).toFixed(2)} €
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
                                                        setOriginalEditCustomer({
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
                                           <p className="text-slate-500 text-sm mb-4">Client depuis {formatDate(customer.createdAt)}</p>
                                           
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
                                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nom <span className="text-red-500">*</span></label>
                                                    <input 
                                                        type="text" 
                                                        value={editCustomerForm.lastName}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, lastName: e.target.value})}
                                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="email" 
                                                    value={editCustomerForm.email}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Téléphone</label>
                                                <input 
                                                    type="tel" 
                                                    value={editCustomerForm.phone}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, phone: e.target.value})}
                                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
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
                                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Code Postal"
                                                            value={editCustomerForm.address.zipCode}
                                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, zipCode: e.target.value}})}
                                                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ville"
                                                            value={editCustomerForm.address.city}
                                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, city: e.target.value}})}
                                                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                                        />
                                                    </div>
                                                    <select 
                                                        value={editCustomerForm.address.country}
                                                        onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, country: e.target.value}})}
                                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
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
                                                <SaveButton
                                                    hasChanges={
                                                        (!!editCustomerForm.firstName && !!editCustomerForm.lastName && !!editCustomerForm.email) &&
                                                        JSON.stringify(editCustomerForm) !== JSON.stringify(originalEditCustomer)
                                                    }
                                                    isSaving={false}
                                                    onSave={() => {
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
                                                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                                                />
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
                                         <div className="text-xl font-bold text-green-600">{Number(customer.totalSpent).toFixed(2)}€</div>
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
                                                  <div className="text-xs text-slate-500">{formatDate(order.createdAt)}</div>
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
                                               <div className="font-bold text-slate-900">{Number(order.totalAmount).toFixed(2)} €</div>
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

              {/* --- VIEW: PAGE PRODUIT --- */}
              {activeTab === 'productpage' && selectedBookId && selectedBook && (() => {
                const pp = selectedBook.productPage ?? {};
                const featureSections = pp.featureSections ?? [];
                const reviews = pp.reviews ?? [];
                const faqItems = [...(pp.faqItems ?? [])].sort((a, b) => a.order - b.order);

                const updatePP = (patch: Partial<typeof pp>) => {
                  handleSaveBook({ ...selectedBook, productPage: { ...pp, ...patch } });
                };

                const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
                  const next = [...arr];
                  const [item] = next.splice(from, 1);
                  next.splice(to, 0, item);
                  return next;
                };

                return (
                  <div className="max-w-4xl mx-auto space-y-6">

                    {/* Carte 1 — Sections de présentation */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Sections de présentation</h3>
                      <div className="space-y-4">
                        {featureSections.map((s, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-600">Section {i + 1}</span>
                              <div className="flex items-center gap-1">
                                <button disabled={i === 0} onClick={() => updatePP({ featureSections: moveItem(featureSections, i, i - 1) })} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                                <button disabled={i === featureSections.length - 1} onClick={() => updatePP({ featureSections: moveItem(featureSections, i, i + 1) })} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                                <button onClick={() => updatePP({ featureSections: featureSections.filter((_, j) => j !== i) })} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <input
                              type="text" placeholder="Titre" value={s.title}
                              onChange={e => { const next = [...featureSections]; next[i] = { ...s, title: e.target.value }; updatePP({ featureSections: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                            <textarea
                              placeholder="Texte" value={s.text} rows={3}
                              onChange={e => { const next = [...featureSections]; next[i] = { ...s, text: e.target.value }; updatePP({ featureSections: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                            <input
                              type="text" placeholder="URL de l'image" value={s.imageUrl}
                              onChange={e => { const next = [...featureSections]; next[i] = { ...s, imageUrl: e.target.value }; updatePP({ featureSections: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={s.reverse} onChange={e => { const next = [...featureSections]; next[i] = { ...s, reverse: e.target.checked }; updatePP({ featureSections: next }); }} className="w-4 h-4 border border-gray-300" />
                              Image à droite (texte à gauche)
                            </label>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => updatePP({ featureSections: [...featureSections, { title: '', text: '', imageUrl: '', reverse: false }] })}
                        className="mt-4 flex items-center gap-2 text-sm text-brand-coral hover:text-red-600 font-semibold"
                      >
                        <Plus size={16} /> Ajouter une section
                      </button>
                    </div>

                    {/* Carte 2 — Avis clients */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Avis clients</h3>
                      <div className="space-y-4">
                        {reviews.map((r, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-600">Avis {i + 1}</span>
                              <button onClick={() => updatePP({ reviews: reviews.filter((_, j) => j !== i) })} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text" placeholder="Nom" value={r.name}
                                onChange={e => { const next = [...reviews]; next[i] = { ...r, name: e.target.value }; updatePP({ reviews: next }); }}
                                className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                              />
                              <select
                                value={r.rating}
                                onChange={e => { const next = [...reviews]; next[i] = { ...r, rating: Number(e.target.value) }; updatePP({ reviews: next }); }}
                                className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                              >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                              </select>
                            </div>
                            <textarea
                              placeholder="Commentaire" value={r.comment} rows={3}
                              onChange={e => { const next = [...reviews]; next[i] = { ...r, comment: e.target.value }; updatePP({ reviews: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => updatePP({ reviews: [...reviews, { name: '', comment: '', rating: 5 }] })}
                        className="mt-4 flex items-center gap-2 text-sm text-brand-coral hover:text-red-600 font-semibold"
                      >
                        <Plus size={16} /> Ajouter un avis
                      </button>
                    </div>

                    {/* Carte 3 — FAQ */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">FAQ</h3>
                      <div className="space-y-4">
                        {faqItems.map((f, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-600">Question {i + 1}</span>
                              <div className="flex items-center gap-1">
                                <button disabled={i === 0} onClick={() => { const next = moveItem(faqItems, i, i - 1).map((x, idx) => ({ ...x, order: idx })); updatePP({ faqItems: next }); }} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                                <button disabled={i === faqItems.length - 1} onClick={() => { const next = moveItem(faqItems, i, i + 1).map((x, idx) => ({ ...x, order: idx })); updatePP({ faqItems: next }); }} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                                <button onClick={() => { const next = faqItems.filter((_, j) => j !== i).map((x, idx) => ({ ...x, order: idx })); updatePP({ faqItems: next }); }} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <input
                              type="text" placeholder="Titre de section (laisser vide = pas de titre)" value={f.sectionTitle ?? ''}
                              onChange={e => { const next = [...faqItems]; next[i] = { ...f, sectionTitle: e.target.value }; updatePP({ faqItems: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                            <input
                              type="text" placeholder="Question" value={f.question}
                              onChange={e => { const next = [...faqItems]; next[i] = { ...f, question: e.target.value }; updatePP({ faqItems: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral font-semibold"
                            />
                            <textarea
                              placeholder="Réponse" value={f.answer} rows={3}
                              onChange={e => { const next = [...faqItems]; next[i] = { ...f, answer: e.target.value }; updatePP({ faqItems: next }); }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => updatePP({ faqItems: [...faqItems, { sectionTitle: '', question: '', answer: '', order: faqItems.length }] })}
                        className="mt-4 flex items-center gap-2 text-sm text-brand-coral hover:text-red-600 font-semibold"
                      >
                        <Plus size={16} /> Ajouter une question
                      </button>
                    </div>

                  </div>
                );
              })()}

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
                              position: localMainMenu.length,
                              visible: false,
                              items: []
                          })}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
                      >
                          <Plus size={18} /> Ajouter un élément
                      </button>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMenuCardDragEnd}>
                    <SortableContext items={localMainMenu.map(m => m.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {localMainMenu.map((menu, idx) => {
                          const isCollapsed = collapsedMenus.has(menu.id);
                          const originalMenu = mainMenu.find(m => m.id === menu.id);
                          return (
                            <SortableMenuCard key={menu.id} id={menu.id}>
                              {(dragHandleProps) => (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                  {/* Summary header — always visible */}
                                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-gray-200">
                                    <div
                                      {...dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 rounded hover:bg-slate-200 transition-colors shrink-0"
                                    >
                                      <GripVertical size={18} />
                                    </div>
                                    <button
                                      onClick={() => toggleMenuCollapse(menu.id)}
                                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                                    >
                                      {isCollapsed
                                        ? <ChevronRight size={16} className="text-slate-400 shrink-0" />
                                        : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                                      }
                                      <span className="font-bold text-slate-800 truncate">{menu.label}</span>
                                      <span className="text-xs bg-white border border-gray-200 text-slate-500 px-2 py-0.5 rounded-md shrink-0">
                                        {menu.type === 'simple' ? 'Liste' : menu.type === 'grid' ? 'Grille' : 'Colonnes'}
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono shrink-0 hidden sm:inline">{menu.basePath}</span>
                                    </button>
                                    <label
                                      className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={menu.visible !== false ? 'Visible dans la navigation' : 'Masqué de la navigation'}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={menu.visible !== false}
                                        onChange={(e) => {
                                          const updated = { ...menu, visible: e.target.checked };
                                          setLocalMenuItem(idx, updated);
                                        }}
                                        className="w-4 h-4 rounded border border-gray-300"
                                      />
                                      <span className="text-xs text-slate-500 hidden sm:inline">Visible</span>
                                    </label>
                                    <button
                                      onClick={async () => { if(await confirmDialog('Êtes-vous sûr de vouloir supprimer ce menu ?')) deleteMenuItem(idx); }}
                                      className="text-slate-400 hover:text-red-500 p-1.5 transition-colors hover:bg-red-50 rounded-lg shrink-0"
                                      title="Supprimer le menu"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>

                                  {/* Expanded content */}
                                  {!isCollapsed && (
                                    <>
                                      <div className="p-6 border-b border-gray-100">
                                        <div className="space-y-4">
                                          <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre du menu</label>
                                            <input
                                              type="text"
                                              value={menu.label}
                                              onChange={(e) => setLocalMenuItem(idx, { ...menu, label: e.target.value })}
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
                                                    onClick={() => setLocalMenuItem(idx, { ...menu, type: type as any })}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${menu.type === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                                                onChange={(e) => setLocalMenuItem(idx, { ...menu, basePath: e.target.value })}
                                                className="text-sm border border-gray-200 rounded px-3 py-1.5 focus:ring-brand-coral focus:border-brand-coral font-mono text-slate-600 w-48"
                                              />
                                            </div>
                                          </div>
                                        </div>
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
                                                        setLocalMenuItem(idx, { ...menu, columns: newCols });
                                                      }}
                                                      className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 text-slate-800 w-full"
                                                      placeholder="Titre de la colonne"
                                                    />
                                                    <button
                                                      onClick={() => {
                                                        const newCols = (menu.columns || []).filter((_, i) => i !== colIdx);
                                                        setLocalMenuItem(idx, { ...menu, columns: newCols });
                                                      }}
                                                      className="text-slate-400 hover:text-red-500"
                                                    >
                                                      <X size={16} />
                                                    </button>
                                                  </div>
                                                  <div className="p-3">
                                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, idx, colIdx)}>
                                                      <SortableContext items={col.items} strategy={verticalListSortingStrategy}>
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
                                                                  setLocalMenuItem(idx, { ...menu, columns: newCols });
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
                                                                  setLocalMenuItem(idx, { ...menu, columns: newCols });
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
                                                        setLocalMenuItem(idx, { ...menu, columns: newCols });
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
                                                  setLocalMenuItem(idx, { ...menu, columns: newCols });
                                                }}
                                                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-brand-coral hover:border-brand-coral hover:bg-slate-50 transition-all min-h-[200px]"
                                              >
                                                <Columns size={32} className="mb-2 opacity-50" />
                                                <span className="font-bold">Ajouter une colonne</span>
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="max-w-3xl">
                                            <div className="bg-slate-50 rounded-lg border border-gray-200 overflow-hidden">
                                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, idx)}>
                                                <SortableContext items={menu.items || []} strategy={verticalListSortingStrategy}>
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
                                                              setLocalMenuItem(idx, { ...menu, items: newItems });
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
                                                            setLocalMenuItem(idx, { ...menu, items: newItems });
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
                                                <div className="p-8 text-center text-slate-400 text-sm">Aucun élément dans ce menu.</div>
                                              )}
                                              <div className="p-3 bg-slate-50 border-t border-gray-200">
                                                <button
                                                  onClick={() => {
                                                    const newItems = [...(menu.items || []), 'Nouveau lien'];
                                                    setLocalMenuItem(idx, { ...menu, items: newItems });
                                                  }}
                                                  className="text-brand-coral font-bold text-sm flex items-center gap-2 hover:underline px-2"
                                                >
                                                  <Plus size={16} /> Ajouter un élément de menu
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                                          <SaveButton
                                            hasChanges={JSON.stringify(menu) !== JSON.stringify(originalMenu || {})}
                                            isSaving={false}
                                            onSave={() => handleSaveMenu(idx)}
                                            className="px-6 py-2.5 rounded-lg text-sm"
                                            label="Enregistrer le menu"
                                            savedLabel="Menu enregistré"
                                          />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </SortableMenuCard>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* --- VIEW: SHIPPING --- */}
              {activeTab === 'shipping' && (
                <ShippingManager shippingZones={shippingZones} defaultShippingRate={defaultShippingRate} updateDefaultShippingRate={updateDefaultShippingRate} addShippingZone={addShippingZone} updateShippingZone={updateShippingZone} deleteShippingZone={deleteShippingZone} editingZoneId={editingZoneId} setEditingZoneId={setEditingZoneId} />
              )}
              

              {/* --- VIEW: PRINTERS --- */}
              {activeTab === 'printers' && (
                <PrintersManager printers={printers} setPrinters={setPrinters} editingPrinterId={editingPrinterId} setEditingPrinterId={setEditingPrinterId} />
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
                          <label className="block text-sm font-bold text-slate-700 mb-2">Images du carrousel (Miniature)</label>
                          <div className="space-y-3">
                             <div className="flex flex-wrap gap-3">
                                
                                {/* Toutes les images */}
                                {(selectedBook.galleryImages || []).map((img, idx) => (
                                   <div 
                                      key={idx} 
                                      draggable
                                      onDragStart={(e) => {
                                         e.dataTransfer.effectAllowed = 'move';
                                         e.dataTransfer.setData('text/plain', idx.toString());
                                      }}
                                      onDragOver={(e) => {
                                         e.preventDefault();
                                         e.dataTransfer.dropEffect = 'move';
                                      }}
                                      onDrop={(e) => {
                                         e.preventDefault();
                                         const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                                         if (fromIdx !== idx) {
                                            const newGallery = [...(selectedBook.galleryImages || [])];
                                            const [moved] = newGallery.splice(fromIdx, 1);
                                            newGallery.splice(idx, 0, moved);
                                            handleSaveBook({...selectedBook, galleryImages: newGallery, coverImage: typeof newGallery[0] === 'string' ? newGallery[0] : newGallery[0].url});
                                         }
                                      }}
                                      className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group cursor-move hover:border-cloud-blue transition-colors"
                                   >
                                      <img src={typeof img === 'string' ? img : img.url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                                      <button 
                                         onClick={() => {
                                            const newGallery = [...(selectedBook.galleryImages || [])];
                                            newGallery.splice(idx, 1);
                                            // Mettre à jour coverImage si on supprime la 1ère
                                            const updates = idx === 0 && newGallery.length > 0
                                              ? { galleryImages: newGallery, coverImage: typeof newGallery[0] === 'string' ? newGallery[0] : newGallery[0].url }
                                              : { galleryImages: newGallery };
                                            handleSaveBook({...selectedBook, ...updates});
                                         }}
                                         className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      >
                                         <X size={12} />
                                      </button>
                                      {/* Toggle effet 3D */}
                                      <button
                                         onClick={() => {
                                            const newGallery = [...(selectedBook.galleryImages || [])];
                                            if (typeof newGallery[idx] === 'string') {
                                               newGallery[idx] = { url: newGallery[idx] as string, use3DEffect: true };
                                            } else {
                                               newGallery[idx] = { ...newGallery[idx] as any, use3DEffect: !(newGallery[idx] as any).use3DEffect };
                                            }
                                            handleSaveBook({...selectedBook, galleryImages: newGallery});
                                         }}
                                         className={`absolute bottom-1 left-1 right-1 text-white text-[9px] font-bold text-center py-0.5 rounded ${(typeof img === 'object' && img.use3DEffect) ? 'bg-cloud-blue' : 'bg-gray-400'}`}
                                      >
                                         {(typeof img === 'object' && img.use3DEffect) ? '3D ON' : '3D OFF'}
                                      </button>
                                      {/* Numéro dynamique */}
                                      <div className="absolute top-0 left-0 right-0 bg-black/30 text-white text-[9px] font-bold text-center py-0.5">
                                         {idx + 1}
                                      </div>
                                   </div>
                                ))}
                                
                                {/* Bouton ajouter */}
                                <div className="w-24 h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-coral hover:bg-brand-coral/5 transition-colors relative group">
                                   <Plus size={24} className="text-gray-400 group-hover:text-brand-coral" />
                                   <input 
                                      type="file" 
                                      accept="image/*"
                                      multiple
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                         const files = Array.from(e.target.files || []);
                                         if (files.length > 0) {
                                            try {
                                               toast.loading(`Upload de ${files.length} image(s)...`, { id: 'gallery-upload' });
                                               const uploadPromises = files.map((file, i) => 
                                                  uploadFileToStorage(file, `gallery_${selectedBook.id}_${Date.now()}_${i}`)
                                               );
                                               const urls = await Promise.all(uploadPromises);
                                               const currentGallery = selectedBook.galleryImages || [];
                                               const newImages = urls.map(url => ({ url, use3DEffect: currentGallery.length === 0 })); // 1ère image = 3D par défaut
                                               const updatedGallery = [...currentGallery, ...newImages];
                                               // Si c'est la 1ère image, mettre aussi coverImage pour rétrocompat
                                               const updates = updatedGallery.length === newImages.length && newImages.length > 0
                                                 ? { galleryImages: updatedGallery, coverImage: newImages[0].url }
                                                 : { galleryImages: updatedGallery };
                                               handleSaveBook({...selectedBook, ...updates});
                                               toast.success(`${files.length} image(s) uploadée(s)!`, { id: 'gallery-upload' });
                                            } catch (error) {
                                               console.error('Gallery upload error:', error);
                                               toast.error('Erreur lors de l\'upload', { id: 'gallery-upload' });
                                            }
                                         }
                                      }}
                                   />
                                </div>
                             </div>
                             <p className="text-xs text-gray-500">Cliquez "3D ON/OFF" pour activer/désactiver l'effet 3D sur chaque image. La 1ère image est affichée en couverture.</p>
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
                          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-coral bg-white">
                            <input 
                              type="number" 
                              value={selectedBook.price}
                              onChange={(e) => handleSaveBook({...selectedBook, price: parseFloat(e.target.value)})}
                              className="flex-1 outline-none text-center font-bold"
                            />
                            <span className="text-gray-400 text-sm leading-none shrink-0">€</span>
                          </div>
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
                       
                       <div className="col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Fond de la Miniature (Optionnel)</label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <input 
                                type="text" 
                                value={selectedBook.thumbnailBackground || ''}
                                onChange={(e) => handleSaveBook({...selectedBook, thumbnailBackground: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-coral outline-none"
                                placeholder="ex: #fef1f7 ou linear-gradient(...)"
                              />
                            </div>
                            <input 
                              type="color" 
                              value={selectedBook.thumbnailBackground?.startsWith('#') ? selectedBook.thumbnailBackground : '#fef1f7'}
                              onChange={(e) => handleSaveBook({...selectedBook, thumbnailBackground: e.target.value})}
                              className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                              title="Choisir une couleur"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Utilisez le sélecteur de couleur ou entrez un dégradé CSS (ex: linear-gradient(135deg, #fef1f7 0%, #faf5ff 100%))</p>
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
                                          className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral"
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
                                                        newTabs[idx].variants[vIdx].type = e.target.value as 'options' | 'text' | 'checkbox' | 'color';
                                                        handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                     }}
                                                     className="w-full text-xs border border-gray-200 rounded-md py-1.5 pl-3 pr-8 bg-white text-slate-600 font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                                  >
                                                     <option value="options">Choix (Options)</option>
                                                     <option value="text">Texte (Libre)</option>
                                                     <option value="checkbox">Case à cocher</option>
                                                     <option value="color">Choix (Couleurs)</option>
                                                  </select>
                                                  
                                                  {variant.type === 'options' && expandedVariantIds.has(`${tab.id}.${variant.id}`) && (
                                                     <div className="flex items-center gap-2 mt-2">
                                                        <input 
                                                           type="checkbox" 
                                                           id={`show-label-${variant.id}`}
                                                           checked={variant.showLabel || false}
                                                           onChange={(e) => {
                                                              const newTabs = [...selectedBook.wizardConfig.tabs];
                                                              newTabs[idx].variants[vIdx].showLabel = e.target.checked;
                                                              handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                           }}
                                                           className="w-4 h-4 rounded border border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <label htmlFor={`show-label-${variant.id}`} className="text-[10px] text-gray-600 cursor-pointer">
                                                           Afficher le texte dans le Wizard
                                                        </label>
                                                     </div>
                                                  )}
                                                  
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
                                                              className="w-full text-[10px] border border-gray-200 rounded px-2 py-1"
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
                                                              className="w-full text-[10px] border border-gray-200 rounded px-2 py-1"
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
                                                           className="w-full text-[10px] border border-gray-200 rounded px-2 py-1"
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
                                            {expandedVariantIds.has(`${tab.id}.${variant.id}`) && (variant.type === 'options' || variant.type === 'color' || !variant.type) && (
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
                                                              label: 'Nouvelle Option',
                                                              ...(variant.type === 'color' && { resource: '#000000' })
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
                                                           
                                                           {/* Color Picker or Uploads */}
                                                           {variant.type === 'color' ? (
                                                              <div className="flex items-center gap-2">
                                                                 <div className="text-center">
                                                                    <input 
                                                                       type="color" 
                                                                       value={option.resource || '#000000'}
                                                                       onChange={(e) => {
                                                                          const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                          newTabs[idx].variants[vIdx].options![oIdx].resource = e.target.value;
                                                                          handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                       }}
                                                                       className="w-10 h-10 rounded-full cursor-pointer border border-gray-200"
                                                                       style={{ padding: '2px' }}
                                                                    />
                                                                    <div className="text-[9px] font-bold text-gray-400 mt-1">Couleur</div>
                                                                 </div>
                                                                 <input 
                                                                    type="text" 
                                                                    value={option.resource || '#000000'}
                                                                    onChange={(e) => {
                                                                       let value = e.target.value;
                                                                       // Ensure it starts with #
                                                                       if (value && !value.startsWith('#')) {
                                                                          value = '#' + value;
                                                                       }
                                                                       const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                       newTabs[idx].variants[vIdx].options![oIdx].resource = value;
                                                                       handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                    }}
                                                                    className="w-20 px-2 py-1 text-xs font-mono border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                                    placeholder="#000000"
                                                                    maxLength={7}
                                                                 />
                                                              </div>
                                                           ) : (
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

                                                                    {/* Hidden File Input for Upload */}
                                                                    <input 
                                                                       type="file" 
                                                                       className="absolute inset-0 opacity-0 cursor-pointer"
                                                                       onChange={async (e) => {
                                                                          const file = e.target.files?.[0];
                                                                          if (file) {
                                                                             try {
                                                                                toast.loading('Upload de la ressource...', { id: 'resource-upload' });
                                                                                const objectPath = await uploadFileToStorage(file, `variant_${variant.id}_${option.id}`);
                                                                                const newTabs = [...selectedBook.wizardConfig.tabs];
                                                                                newTabs[idx].variants[vIdx].options![oIdx].resource = objectPath;
                                                                                handleSaveBook({...selectedBook, wizardConfig: {...selectedBook.wizardConfig, tabs: newTabs}});
                                                                                toast.success('Ressource uploadée!', { id: 'resource-upload' });
                                                                             } catch (error: any) {
                                                                                console.error('Resource upload error:', error);
                                                                                const errorMsg = error?.message || String(error);
                                                                                toast.error(`Erreur: ${errorMsg}`, { id: 'resource-upload', duration: 5000 });
                                                                             }
                                                                          }
                                                                       }}
                                                                    />
                                                                 </div>
                                                              </div>
                                                           )}

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

                    {/* Preview Fields Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                       <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             <Eye size={24} className="text-purple-600" />
                             Preview - Champs Spéciaux
                          </h2>
                       </div>

                       <div className="space-y-4">
                          {(() => {
                             // Initialize previewFields with default values if not present
                             const previewFields = selectedBook.wizardConfig.previewFields || [
                                { id: 'dedication', label: 'Dédicace', enabled: false, textElementId: '' },
                                { id: 'author', label: 'Auteur', enabled: false, textElementId: '' }
                             ];

                             return previewFields.map((field) => {
                                // Detect text elements that contain this variable
                                const variableKey = `{TXTVAR_${field.id}}`;
                                const mappedTexts = selectedBook.contentConfig.texts?.filter(text => 
                                   text.content && text.content.includes(variableKey)
                                ) || [];

                                return (
                                   <div key={field.id} className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                                      <div className="flex items-center gap-4">
                                         {/* Toggle Checkbox */}
                                         <label className="flex items-center cursor-pointer">
                                            <input
                                               type="checkbox"
                                               checked={field.enabled}
                                               onChange={() => handleTogglePreviewField(field.id)}
                                               className="w-5 h-5 rounded border border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                         </label>

                                         {/* Field Label */}
                                         <div className="flex-1">
                                            <div className="font-bold text-slate-700 text-sm">{field.label}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[10px] text-gray-400 uppercase font-bold">Variable:</span>
                                               <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-mono">
                                                  {variableKey}
                                               </span>
                                            </div>
                                         </div>
                                      </div>

                                      {/* Detected Mappings */}
                                      {mappedTexts.length > 0 && (
                                         <div className="mt-3 pl-9">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                                               Détecté dans {mappedTexts.length} élément{mappedTexts.length > 1 ? 's' : ''} :
                                            </div>
                                            <div className="space-y-1">
                                               {mappedTexts.map((text, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 text-xs bg-white border border-purple-200 rounded px-2 py-1">
                                                     <span className="font-mono text-purple-600 font-bold">{text.id}</span>
                                                     <span className="text-gray-400">→</span>
                                                     <span className="text-gray-600 truncate flex-1">
                                                        {text.content?.substring(0, 50)}{text.content && text.content.length > 50 ? '...' : ''}
                                                     </span>
                                                  </div>
                                               ))}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                );
                             });
                          })()}
                       </div>

                       <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                          <p className="text-xs text-purple-700">
                             <strong>💡 Info:</strong> Ces champs permettent de définir des variables système (dédicace, auteur) 
                             qui peuvent être utilisées dans les textes du livre. Activez-les pour les rendre disponibles 
                             dans l'éditeur de texte.
                          </p>
                       </div>
                    </div>
                 </div>
              )}

              {/* --- VIEW: AVATARS & PREVIEWS --- */}
              {activeTab === 'avatars' && selectedBookId && selectedBook && (
                 <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
                    {/* Avatar Grid Area */}
                    <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                       {/* Avatar Grid - Tab Selector */}
                       <div className="mb-4 pb-4 border-b border-gray-200 shrink-0">
                          <div className="flex gap-2">
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
                       {(() => {
                          const targetTab = selectedBook.wizardConfig.tabs.find(t => t.id === (selectedAvatarTabId || selectedBook.wizardConfig.tabs[0]?.id));
                          if (!targetTab) return <div className="text-gray-400">Aucun personnage trouvé.</div>;

                          // Filter options variants only (include color type for avatar filters)
                          const optionVariants = targetTab.variants.filter(v => v.type === 'options' || v.type === 'color' || !v.type);

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
                                        <div className="ml-auto flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setShowAvatarEpubSelector(true);
                                                    loadBucketEpubs();
                                                }}
                                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                                            >
                                                <CloudDownload size={14} />
                                                Importer template Avatar
                                            </button>
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
                                           // Try scoped key first (tabId:key), then fallback to legacy key
                                           const scopedKey = `${targetTab.id}:${combo.key}`;
                                           const existingAvatar = selectedBook.wizardConfig.avatarMappings?.[scopedKey] ?? selectedBook.wizardConfig.avatarMappings?.[combo.key];
                                           
                                           // Debug log for first combo
                                           if (comboIdx === 0) {
                                             console.log('[Avatar Display] First combo:', {
                                               comboKey: combo.key,
                                               scopedKey,
                                               tabId: targetTab.id,
                                               existingAvatar,
                                               allMappings: selectedBook.wizardConfig.avatarMappings
                                             });
                                           }
                                           
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
                                                                onChange={async (e) => {
                                                                   const file = e.target.files?.[0];
                                                                   if (file) {
                                                                      try {
                                                                         toast.loading('Upload de l\'avatar...', { id: 'avatar-upload' });
                                                                         const objectPath = await uploadFileToStorage(file, `avatar_${targetTab.id}_${combo.key}`);
                                                                         const newMappings = { ...(selectedBook.wizardConfig.avatarMappings || {}) };
                                                                         // Use scoped key for new uploads
                                                                         const scopedKey = `${targetTab.id}:${combo.key}`;
                                                                         newMappings[scopedKey] = objectPath;
                                                                         handleSaveBook({
                                                                            ...selectedBook,
                                                                            wizardConfig: {
                                                                               ...selectedBook.wizardConfig,
                                                                               avatarMappings: newMappings
                                                                            }
                                                                         });
                                                                         toast.success('Avatar uploadé!', { id: 'avatar-upload' });
                                                                      } catch (error: any) {
                                                                         console.error('Avatar upload error:', error);
                                                                         const errorMsg = error?.message || String(error);
                                                                         toast.error(`Erreur: ${errorMsg}`, { id: 'avatar-upload', duration: 5000 });
                                                                      }
                                                                   }
                                                                }}
                                                             />
                                                          </label>
                                                          
                                                          {existingAvatar && (
                                                              <button 
                                                                  onClick={async () => {
                                                                      if (await confirmDialog('Supprimer cette image ?')) {
                                                                          const newMappings = { ...(selectedBook.wizardConfig.avatarMappings || {}) };
                                                                          // Delete both scoped and legacy keys
                                                                          const scopedKey = `${targetTab.id}:${combo.key}`;
                                                                          delete newMappings[scopedKey];
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
                                    setShowIdmlImporter(true);
                                    setDetectedFonts([]);
                                  }}
                                  className="p-2 bg-purple-100 hover:bg-purple-200 rounded text-purple-700 shrink-0" 
                                  title="Importer EPUB + IDML (InDesign)"
                              >
                                  <FileCode size={18} />
                              </button>
                              <button
                                  onClick={async () => {
                                      if (await confirmDialog('Voulez-vous réinitialiser le storyboard ?\nCela supprimera le template EPUB généré (pages, textes, images).\nLe wizard sera conservé.\nCette action est irréversible.')) {
                                          handleSaveBook({
                                              ...selectedBook,
                                              contentConfig: { pages: [], texts: [], images: [], imageElements: [], pageImages: [] }
                                          });
                                          setSelectedPageId(null);
                                          setSelectedEpubPageIndex(null);
                                          toast.success('Storyboard réinitialisé avec succès');
                                      }
                                  }}
                                  className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-600 shrink-0 ml-2 border border-red-200"
                                  title="Réinitialiser le storyboard EPUB"
                              >
                                  <RotateCcw size={18} />
                              </button>
                              <input 
                                 type="file" 
                                 ref={fileInputRef}
                                 className="hidden"
                                 accept=".json"
                                 onChange={handleImportContent}
                              />
                          </div>
                       </div>
                    </div>

                    <div className="flex-1 min-h-0 flex gap-6">
                        {/* Storyboard Grid */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 rounded-xl border border-slate-200/50">
                                {(() => {
                                    const hasPages = selectedBook.contentConfig.pages && selectedBook.contentConfig.pages.length > 0;
                                    
                                    if (!hasPages) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                                <div className="p-4 bg-slate-100 rounded-full">
                                                    <Layout size={32} className="opacity-50" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-slate-600">Aucune page configurée</p>
                                                    <p className="text-sm text-slate-400 mt-1">Utilisez le panneau d'import dans la barre d'outils pour commencer.</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    {
                                        const currentBookForPage = draftBook || selectedBook;
                                        const sortedPages = [...selectedBook.contentConfig.pages].sort((a: any, b: any) => a.pageIndex - b.pageIndex);
                                        const pageImages = selectedBook.contentConfig.pageImages || [];
                                        
                                        const effectiveSelectedPage = selectedEpubPageIndex ?? (sortedPages.length > 0 ? sortedPages[0].pageIndex : null);
                                        
                                        const pageTexts = effectiveSelectedPage !== null 
                                            ? currentBookForPage.contentConfig.texts?.filter((t: any) => t.position?.pageIndex === effectiveSelectedPage) || []
                                            : [];
                                        const pageImagesForSelected = effectiveSelectedPage !== null
                                            ? currentBookForPage.contentConfig.imageElements?.filter((i: any) => i.position?.pageIndex === effectiveSelectedPage) || []
                                            : [];
                                        
                                        return (
                                            <ResizablePanelGroup direction="horizontal" className="h-full rounded-xl">
                                                {/* Left Sidebar - Page Thumbnails */}
                                                <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pages ({sortedPages.length})</h4>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                                        {sortedPages.map((page: any) => {
                                                            const pageImagesFromElements = selectedBook.contentConfig.imageElements?.filter((i: any) => i.position?.pageIndex === page.pageIndex) || [];
                                                            const pageImageEntry = pageImages.find((pi: any) => pi.pageIndex === page.pageIndex);
                                                            const isSelected = effectiveSelectedPage === page.pageIndex;
                                                            const pageTextsForThumb = selectedBook.contentConfig.texts?.filter((t: any) => t.position?.pageIndex === page.pageIndex) || [];
                                                            const imagesCount = pageImagesFromElements.length;
                                                            
                                                            // Use real page aspect ratio to avoid letterboxing mismatch
                                                            const pageWidth = page?.width || 210;
                                                            const pageHeight = page?.height || 297;
                                                            const pageAspectRatio = pageWidth / pageHeight;
                                                            
                                                            return (
                                                                <div 
                                                                    key={`thumb-${page.pageIndex}`}
                                                                    className={`relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-md ${
                                                                        isSelected 
                                                                            ? 'border-brand-coral shadow-md ring-2 ring-brand-coral/20' 
                                                                            : 'border-slate-100 hover:border-brand-coral/30'
                                                                    }`}
                                                                    onClick={() => setSelectedEpubPageIndex(page.pageIndex)}
                                                                >
                                                                    <div className="bg-white relative overflow-hidden rounded-t-md" style={{ aspectRatio: pageAspectRatio }}>
                                                                        {/* Use pre-rendered EPUB image with text overlays */}
                                                                        {pageImageEntry?.imageUrl ? (
                                                                            <>
                                                                                <img 
                                                                                    src={pageImageEntry.imageUrl} 
                                                                                    alt={`Page ${page.pageIndex}`}
                                                                                    className="w-full h-full object-contain"
                                                                                    loading="lazy"
                                                                                    decoding="async"
                                                                                />
                                                                                {/* Text zones overlays */}
                                                                                {pageTextsForThumb.map((text: any, textIdx: number) => (
                                                                                        <div
                                                                                            key={`thumb-text-${text.id || textIdx}`}
                                                                                            className="absolute pointer-events-none overflow-hidden"
                                                                                            style={{
                                                                                                left: `${text.position?.x || 0}%`,
                                                                                                top: `${text.position?.y || 0}%`,
                                                                                                width: `${text.position?.width || 30}%`,
                                                                                                height: text.position?.height ? `${text.position.height}%` : 'auto',
                                                                                                border: '2px solid rgba(255, 0, 0, 0.8)',
                                                                                                backgroundColor: 'rgba(255, 0, 0, 0.2)',
                                                                                                transform: text.position?.rotation ? `rotate(${text.position.rotation}deg)` : undefined,
                                                                                                zIndex: 1000,
                                                                                            }}
                                                                                            title={`${text.label || text.id || ''} — ${text.content?.substring(0, 30)} - x:${text.position?.x} y:${text.position?.y}`}
                                                                                        >
                                                                                            <span className="absolute top-0 left-0 text-[9px] leading-none font-mono bg-white/90 text-slate-700 px-1 py-0.5 border border-slate-200 rounded-sm">
                                                                                                {text.label || text.id?.split('-').pop() || `text-${textIdx}`}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                            </>
                                                                        ) : (pageImagesFromElements.length > 0 || pageTextsForThumb.length > 0) ? (
                                                                            <>
                                                                                {/* Render all images with their positions */}
                                                                                {(() => {
                                                                                    const filteredImages = pageImagesFromElements.filter((img: any) => img.position && img.url);
                                                                                    // Calculate scale factor from PAGE dimensions, not first image
                                                                                    // Positions from EPUB are in pixels, convert to % relative to page size
                                                                                    const pageWidth = page?.width || 210;
                                                                                    const scaleFactor = pageWidth > 100 ? 100 / pageWidth : 1;
                                                                                    
                                                                                    return filteredImages
                                                                                        .sort((a: any, b: any) => (a.position?.zIndex || 0) - (b.position?.zIndex || 0))
                                                                                        .map((img: any, imgIdx: number) => {
                                                                                            const style = {
                                                                                                left: `${(img.position?.x || 0) * scaleFactor}%`,
                                                                                                top: `${(img.position?.y || 0) * scaleFactor}%`,
                                                                                                width: `${(img.position?.width || 100) * scaleFactor}%`,
                                                                                                height: img.position?.height ? `${img.position.height * scaleFactor}%` : 'auto',
                                                                                                transform: img.position?.rotation ? `rotate(${img.position.rotation}deg)` : undefined,
                                                                                                zIndex: img.position?.zIndex || 0,
                                                                                            }
                                                                                            return (
                                                                                                <div
                                                                                                    key={`thumb-img-${img.id || imgIdx}`}
                                                                                                    className="absolute"
                                                                                                    style={style}
                                                                                                >
                                                                                                    <img
                                                                                                        src={img.url}
                                                                                                        alt={img.label || 'Image'}
                                                                                                        className="w-full h-full object-contain"
                                                                                                        loading="lazy"
                                                                                                        decoding="async"
                                                                                                        onError={(e) => {
                                                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                            );
                                                                                        });
                                                                                })()}
                                                                                
                                                                                {/* Render all text zones with borders - WITH scaleFactor in fallback */}
                                                                                {(() => {
                                                                                    // Calculate scale factor from PAGE dimensions, not first image
                                                                                    const pageWidth = page?.width || 210;
                                                                                    const scaleFactor = pageWidth > 100 ? 100 / pageWidth : 1;
                                                                                    
                                                                                    return pageTextsForThumb.map((text: any, textIdx: number) => (
                                                                                        <div
                                                                                            key={`thumb-text-${text.id || textIdx}`}
                                                                                            className="absolute pointer-events-none overflow-hidden"
                                                                                            style={{
                                                                                                left: `${(text.position?.x || 0) * scaleFactor}%`,
                                                                                                top: `${(text.position?.y || 0) * scaleFactor}%`,
                                                                                                width: `${(text.position?.width || 30) * scaleFactor}%`,
                                                                                                height: text.position?.height ? `${text.position.height * scaleFactor}%` : 'auto',
                                                                                                border: '1px dashed rgba(59, 130, 246, 0.5)',
                                                                                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                                                                                transform: text.position?.rotation ? `rotate(${text.position.rotation}deg)` : undefined,
                                                                                                zIndex: 1000,
                                                                                            }}
                                                                                            title={`${text.label || text.id || ''} — ${text.content?.substring(0, 50)}`}
                                                                                        >
                                                                                            <span className="absolute top-0 left-0 text-[9px] leading-none font-mono bg-white/90 text-slate-700 px-1 py-0.5 border border-slate-200 rounded-sm">
                                                                                                {text.label || text.id?.split('-').pop() || `text-${textIdx}`}
                                                                                            </span>
                                                                                        </div>
                                                                                    ));
                                                                                })()}
                                                                            </>
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                                                                                <FileCode size={24} className="text-slate-300" />
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* Page number badge */}
                                                                        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                                                                            isSelected ? 'bg-brand-coral text-white' : 'bg-white/90 text-slate-600 shadow-sm'
                                                                        }`}>
                                                                            {page.pageIndex}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-1.5 bg-white rounded-b-md">
                                                                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                                                                            <span>{pageTextsForThumb.length}T</span>
                                                                            <span>{imagesCount}I</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </ResizablePanel>
                                                
                                                <ResizableHandle withHandle className="mx-2" />
                                                
                                                {/* Right Content Panel - Texts & Images for Selected Page */}
                                                <ResizablePanel defaultSize={80} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-brand-coral/5 to-transparent">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                                <Edit3 size={16} className="text-brand-coral" />
                                                                Page {effectiveSelectedPage}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span className="px-2 py-1 bg-slate-100 rounded">{pageTexts.length} Textes</span>
                                                                <span className="px-2 py-1 bg-slate-100 rounded">{pageImagesForSelected.length} Images</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                                        {/* Texts Section */}
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2 sticky top-0 bg-white py-1">
                                                                <Type size={14} className="text-blue-500" />
                                                                Textes ({pageTexts.length})
                                                            </h4>
                                                            {pageTexts.length === 0 ? (
                                                                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg">Aucun texte sur cette page</p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {pageTexts.map((text: any, idx: number) => (
                                                                        <div key={text.id || idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                                <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={text.id}>
                                                                                    {text.label || text.id?.split('-').pop() || `text-${idx}`}
                                                                                </span>
                                                                                <div className="flex gap-1 shrink-0">
                                                                                    {text.type === 'variable' && (
                                                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                                                                            VAR
                                                                                        </span>
                                                                                    )}
                                                                                    {text.conditionalSegments && text.conditionalSegments.length > 0 && (
                                                                                        <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium" title={`${text.conditionalSegments.length} segment(s) conditionnel(s)`}>
                                                                                            🔀 {text.conditionalSegments.length}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div 
                                                                                className="mb-2 p-2 bg-white rounded border border-slate-100 whitespace-pre-wrap"
                                                                                style={{
                                                                                    // Styles de paragraphe (layout)
                                                                                    textAlign: text.style?.textAlign as any || 'left',
                                                                                    lineHeight: text.style?.lineHeight || 'normal',
                                                                                    textIndent: text.style?.textIndent || '0',
                                                                                    fontFamily: text.style?.fontFamily || 'inherit',
                                                                                }}
                                                                            >
                                                                                {/* Si le texte a des segments conditionnels, afficher chaque segment avec son propre style */}
                                                                                {text.conditionalSegments && text.conditionalSegments.length > 0 ? (
                                                                                    text.conditionalSegments.map((segment: any, segIdx: number) => {
                                                                                        // Si resolvedStyle existe, utiliser ses propriétés en priorité
                                                                                        // Mais si textTransform est "none" ou undefined dans resolvedStyle, hériter du style global
                                                                                        const hasResolvedStyle = segment.resolvedStyle !== undefined;
                                                                                        
                                                                                        // Priorité: resolvedStyle.textTransform (si défini et différent de 'none') > text.style.textTransform > 'none'
                                                                                        const textTransformValue = hasResolvedStyle && segment.resolvedStyle?.textTransform && segment.resolvedStyle.textTransform !== 'none'
                                                                                            ? segment.resolvedStyle.textTransform
                                                                                            : (text.style?.textTransform || 'none');
                                                                                        const style = hasResolvedStyle ? {
                                                                                            fontFamily: segment.resolvedStyle?.fontFamily || 'inherit',
                                                                                            fontSize: segment.resolvedStyle?.fontSize || 'inherit',
                                                                                            fontWeight: segment.resolvedStyle?.fontWeight || 'normal',
                                                                                            fontStyle: segment.resolvedStyle?.fontStyle || 'normal',
                                                                                            color: segment.resolvedStyle?.color || '#000000',
                                                                                            letterSpacing: segment.resolvedStyle?.letterSpacing || 'normal',
                                                                                            textDecoration: segment.resolvedStyle?.textDecoration || 'none',
                                                                                            textTransform: textTransformValue as any,
                                                                                            WebkitTextStroke: segment.resolvedStyle?.strokeColor ? `${segment.resolvedStyle?.strokeWeight || 1}pt ${segment.resolvedStyle?.strokeColor}` : 'none',
                                                                                            WebkitTextStrokeColor: segment.resolvedStyle?.strokeColor,
                                                                                            WebkitTextStrokeWidth: segment.resolvedStyle?.strokeColor ? (segment.resolvedStyle?.strokeWeight ? `${segment.resolvedStyle.strokeWeight}pt` : '1pt') : undefined,
                                                                                            fontStretch: segment.resolvedStyle?.fontStretch as any,
                                                                                        } : {
                                                                                            fontFamily: text.style?.fontFamily || 'inherit',
                                                                                            fontSize: text.style?.fontSize || 'inherit',
                                                                                            fontWeight: text.style?.fontWeight || 'normal',
                                                                                            fontStyle: text.style?.fontStyle || 'normal',
                                                                                            color: text.style?.color || '#000000',
                                                                                            letterSpacing: text.style?.letterSpacing || 'normal',
                                                                                            textDecoration: text.style?.textDecoration || 'none',
                                                                                            textTransform: textTransformValue as any,
                                                                                            WebkitTextStroke: text.style?.webkitTextStroke || 'none',
                                                                                            WebkitTextStrokeColor: text.style?.webkitTextStrokeColor,
                                                                                            WebkitTextStrokeWidth: text.style?.webkitTextStrokeWidth,
                                                                                            fontStretch: text.style?.fontStretch as any,
                                                                                        };

                                                                                        // Utiliser le texte du segment tel qu'extrait de l'IDML (préserve les espaces dans le segment)
                                                                                        const segmentText = segment.text || '';
                                                                                        
                                                                                        return (
                                                                                        <span
                                                                                            key={segIdx}
                                                                                            style={style}
                                                                                        >
                                                                                            {segmentText}
                                                                                        </span>
                                                                                    )})
                                                                                ) : (
                                                                                    /* Pas de segments : afficher le texte avec le style global */
                                                                                    <span style={{
                                                                                        fontFamily: text.style?.fontFamily || 'inherit',
                                                                                        fontSize: text.style?.fontSize || 'inherit',
                                                                                        fontWeight: text.style?.fontWeight || 'normal',
                                                                                        fontStyle: text.style?.fontStyle || 'normal',
                                                                                        color: text.style?.color || '#000000',
                                                                                        letterSpacing: text.style?.letterSpacing || 'normal',
                                                                                        textDecoration: text.style?.textDecoration || 'none',
                                                                                        textTransform: text.style?.textTransform as any || 'none',
                                                                                        WebkitTextStroke: text.style?.webkitTextStroke,
                                                                                        WebkitTextStrokeColor: text.style?.webkitTextStrokeColor,
                                                                                        WebkitTextStrokeWidth: text.style?.webkitTextStrokeWidth,
                                                                                        fontStretch: text.style?.fontStretch as any,
                                                                                    }}>
                                                                                        {text.content?.length > 80 ? text.content.substring(0, 80) + '...' : text.content || '(vide)'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                                {text.style?.fontFamily ? (
                                                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium" title="Police">
                                                                                        {text.style.fontFamily.split(',')[0].replace(/["']/g, '')}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium" title="Police non définie dans l'IDML">
                                                                                        ⚠️ Police non définie
                                                                                    </span>
                                                                                )}
                                                                                {text.style?.fontSize && (
                                                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium" title="Taille">
                                                                                        {text.style.fontSize}
                                                                                    </span>
                                                                                )}
                                                                                {/* Couleur globale uniquement si pas de segments */}
                                                                                {!text.conditionalSegments && text.style?.color && (
                                                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1" title="Couleur globale">
                                                                                        <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: text.style.color }}></span>
                                                                                        {text.style.color}
                                                                                    </span>
                                                                                )}
                                                                                {/* Afficher le ParagraphStyle appliqué */}
                                                                                {text.appliedParagraphStyle && (
                                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium" title={`ParagraphStyle: ${text.appliedParagraphStyle}`}>
                                                                                        📄 {text.appliedParagraphStyle.replace('ParagraphStyle/', '')}
                                                                                    </span>
                                                                                )}
                                                                                
                                                                                {/* Afficher les CharacterStyles des segments */}
                                                                                {text.conditionalSegments && text.conditionalSegments.length > 0 ? (() => {
                                                                                    const charStyles = new Set<string>();
                                                                                    text.conditionalSegments.forEach((seg: any) => {
                                                                                        if (seg.appliedCharacterStyle && !seg.appliedCharacterStyle.includes('[No character style]')) {
                                                                                            charStyles.add(seg.appliedCharacterStyle.replace('CharacterStyle/', ''));
                                                                                        }
                                                                                    });
                                                                                    const uniqueCharStyles = Array.from(charStyles);
                                                                                    
                                                                                    if (uniqueCharStyles.length > 0) {
                                                                                        return uniqueCharStyles.map((styleName, i) => (
                                                                                            <span key={i} className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium" title={`CharacterStyle: ${styleName}`}>
                                                                                                ✏️ {styleName}
                                                                                            </span>
                                                                                        ));
                                                                                    }
                                                                                    return null;
                                                                                })() : (
                                                                                    /* Texte sans segments : afficher le CharacterStyle global */
                                                                                    text.appliedCharacterStyle && !text.appliedCharacterStyle.includes('[No character style]') && (
                                                                                        <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium" title={`CharacterStyle: ${text.appliedCharacterStyle}`}>
                                                                                            ✏️ {text.appliedCharacterStyle.replace('CharacterStyle/', '')}
                                                                                        </span>
                                                                                    )
                                                                                )}
                                                                                
                                                                                {text.style?.idmlHorizontalScale && text.style.idmlHorizontalScale !== 100 && (
                                                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium" title="Espacement horizontal (HorizontalScale IDML)">
                                                                                        H: {text.style.idmlHorizontalScale}%
                                                                                    </span>
                                                                                )}
                                                                                {text.style?.idmlVerticalScale && text.style.idmlVerticalScale !== 100 && (
                                                                                    <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-medium" title="Espacement vertical (VerticalScale IDML)">
                                                                                        V: {text.style.idmlVerticalScale}%
                                                                                    </span>
                                                                                )}
                                                                                {text.style?.letterSpacing && text.style.letterSpacing !== 'normal' && (
                                                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium" title="Espacement entre lettres (Tracking IDML)">
                                                                                        Tracking: {text.style.letterSpacing}
                                                                                    </span>
                                                                                )}
                                                                                {text.style?.textAlign && (
                                                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium" title={`Alignement du texte${text.style.idmlJustification ? ` (IDML: ${text.style.idmlJustification})` : ''}`}>
                                                                                        {(() => {
                                                                                            // Utiliser la valeur IDML originale si disponible pour un affichage précis
                                                                                            if (text.style.idmlJustification) {
                                                                                                switch (text.style.idmlJustification) {
                                                                                                    case 'LeftAlign': return 'Gauche';
                                                                                                    case 'CenterAlign': return 'Centré';
                                                                                                    case 'RightAlign': return 'Droite';
                                                                                                    case 'LeftJustified': return 'Justifié à gauche';
                                                                                                    case 'RightJustified': return 'Justifié à droite';
                                                                                                    case 'CenterJustified': return 'Justifié centré';
                                                                                                    case 'FullyJustified': return 'Justifié complet';
                                                                                                    case 'ToBindingSide': return 'Vers reliure';
                                                                                                    case 'AwayFromBindingSide': return 'Opposé reliure';
                                                                                                    default: return text.style.idmlJustification;
                                                                                                }
                                                                                            }
                                                                                            // Fallback sur textAlign
                                                                                            if (text.style.textAlign === 'left') return 'Gauche';
                                                                                            if (text.style.textAlign === 'center') return 'Centré';
                                                                                            if (text.style.textAlign === 'right') return 'Droite';
                                                                                            if (text.style.textAlign === 'justify') return 'Justifié';
                                                                                            return text.style.textAlign;
                                                                                        })()}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            
                                                                            {/* Section couleurs des segments */}
                                                                            {text.conditionalSegments && text.conditionalSegments.length > 0 && (
                                                                                <div className="mb-3 p-2 bg-purple-50/50 rounded border border-purple-200">
                                                                                    <h5 className="text-[10px] font-semibold text-purple-700 mb-2">🎨 Couleurs par segment</h5>
                                                                                    <div className="space-y-1">
                                                                                        {text.conditionalSegments.map((seg: any, i: number) => (
                                                                                            <div key={i} className="text-[10px] bg-white px-2 py-1.5 rounded border border-purple-200 flex items-center gap-2">
                                                                                                <span className="font-mono text-[9px] text-purple-600 min-w-[100px] truncate" title={seg.text}>
                                                                                                    "{seg.text?.trim() || '...'}"
                                                                                                </span>
                                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                                    {seg.resolvedStyle?.color && (
                                                                                                        <span className="flex items-center gap-1">
                                                                                                            <span className="text-[9px] text-slate-600 font-semibold">Fill:</span>
                                                                                                            <span 
                                                                                                                className="w-4 h-4 rounded border border-slate-400 inline-block" 
                                                                                                                style={{ backgroundColor: seg.resolvedStyle.color }} 
                                                                                                                title={`Remplissage: ${seg.resolvedStyle.color}`}
                                                                                                            ></span>
                                                                                                            <span className="text-[9px] text-slate-500 font-mono">{seg.resolvedStyle.color}</span>
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {seg.resolvedStyle?.strokeColor && (
                                                                                                        <span className="flex items-center gap-1">
                                                                                                            <span className="text-[9px] text-slate-600 font-semibold">Stroke:</span>
                                                                                                            <span 
                                                                                                                className="w-4 h-4 rounded border-2 inline-block" 
                                                                                                                style={{ borderColor: seg.resolvedStyle.strokeColor, backgroundColor: 'white' }} 
                                                                                                                title={`Contour: ${seg.resolvedStyle.strokeColor}`}
                                                                                                            ></span>
                                                                                                            <span className="text-[9px] text-slate-500 font-mono">{seg.resolvedStyle.strokeColor}</span>
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Sections textes conditionnels et variables - NOUVEAU */}
                                                                            {(() => {
                                                                                const currentBook = draftBook || selectedBook;
                                                                                
                                                                                // Filtrer et séparer les segments
                                                                                const conditionalSegments = text.conditionalSegments?.filter((seg: any) => seg.condition) || [];
                                                                                let variableSegments = text.conditionalSegments?.filter((seg: any) => 
                                                                                    seg.variables && seg.variables.length > 0
                                                                                ) || [];
                                                                                
                                                                                // Si pas de conditionalSegments mais que le content contient des variables, créer des segments virtuels
                                                                                if (!text.conditionalSegments || text.conditionalSegments.length === 0) {
                                                                                    if (text.content) {
                                                                                        // Détecter les variables TXTVAR dans le content
                                                                                        const txtvarMatches = text.content.match(/\{\{?(TXTVAR_[a-zA-Z0-9_-]+)\}?\}/g);
                                                                                        if (txtvarMatches && txtvarMatches.length > 0) {
                                                                                            variableSegments = txtvarMatches.map((match: string) => {
                                                                                                // Extraire le nom de variable (enlever les accolades)
                                                                                                const varName = match.replace(/\{+|\}+/g, '');
                                                                                                return {
                                                                                                    text: text.content,
                                                                                                    variables: [varName]
                                                                                                };
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                }
                                                                                
                                                                                // Ne rien afficher si pas de segments conditionnels ni de variables
                                                                                if (conditionalSegments.length === 0 && variableSegments.length === 0) {
                                                                                    return null;
                                                                                }
                                                                                
                                                                                return (
                                                                                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                                                                                        {/* Section Textes conditionnels */}
                                                                                        {conditionalSegments.length > 0 && (
                                                                                            <div>
                                                                                                <h5 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                                                                                    <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
                                                                                                    Textes conditionnels ({conditionalSegments.length})
                                                                                                </h5>
                                                                                                <div className="space-y-2">
                                                                                                    {conditionalSegments.map((segment: any, segIdx: number) => {
                                                                                                        const wizardMapping = segment.parsedCondition 
                                                                                                            ? resolveWizardMapping(segment.parsedCondition, currentBook?.wizardConfig)
                                                                                                            : null;
                                                                                                        
                                                                                                        return (
                                                                                                            <div key={segIdx} className="bg-white rounded border border-teal-100 p-2 text-xs">
                                                                                                                <div className="flex items-start gap-2 mb-1">
                                                                                                                    <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded shrink-0">
                                                                                                                        #{segIdx + 1}
                                                                                                                    </span>
                                                                                                                    <span className="text-slate-700 flex-1 font-mono bg-slate-50 px-1 rounded" style={{ whiteSpace: 'pre-wrap' }}>
                                                                                                                        "{segment.text || '(vide)'}"
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                
                                                                                                                <div className="ml-6 mt-1 space-y-1">
                                                                                                                    {/* Nom technique de la condition */}
                                                                                                                    <div className="flex items-center gap-1 text-[10px]">
                                                                                                                        <span className="text-slate-400 font-medium">🔧</span>
                                                                                                                        <span className="text-slate-500 font-mono">{segment.condition?.replace(/_/g, ' ')}</span>
                                                                                                                    </div>
                                                                                                                    
                                                                                                                    {/* Mapping wizard */}
                                                                                                                    {wizardMapping ? (
                                                                                                                        <div className="flex items-center gap-1 text-[10px]">
                                                                                                                            <span className="text-teal-600 font-medium">→</span>
                                                                                                                            <span className="text-teal-700 font-medium">{wizardMapping}</span>
                                                                                                                        </div>
                                                                                                                    ) : (
                                                                                                                        <div className="flex items-center gap-1 text-[10px]">
                                                                                                                            <span className="text-orange-600">⚠</span>
                                                                                                                            <span className="text-orange-600">(non mappé au wizard)</span>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        {/* Section Variables de texte */}
                                                                                        {variableSegments.length > 0 && (
                                                                                            <div>
                                                                                                <h5 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                                                                                    <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                                                                                    Variables de texte ({variableSegments.length})
                                                                                                </h5>
                                                                                                <div className="space-y-2">
                                                                                                    {variableSegments.map((segment: any, segIdx: number) => {
                                                                                                        return (
                                                                                                            <div key={segIdx} className="bg-white rounded border border-purple-100 p-2 text-xs">
                                                                                                                <div className="flex items-start gap-2 mb-1">
                                                                                                                    <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded shrink-0">
                                                                                                                        #{segIdx + 1}
                                                                                                                    </span>
                                                                                                                    <span className="text-slate-700 flex-1 font-mono bg-slate-50 px-1 rounded" style={{ whiteSpace: 'pre-wrap' }}>
                                                                                                                        "{segment.text || '(vide)'}"
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                
                                                                                                                <div className="ml-6 mt-1 space-y-1">
                                                                                                                    {segment.variables.map((varName: string, varIdx: number) => {
                                                                                                                        const varMapping = resolveVariableMapping(varName, currentBook?.wizardConfig);
                                                                                                                        return (
                                                                                                                            <div key={varIdx} className="space-y-0.5">
                                                                                                                                {/* Nom technique de la variable */}
                                                                                                                                <div className="flex items-center gap-1 text-[10px]">
                                                                                                                                    <span className="text-slate-400 font-medium">📝</span>
                                                                                                                                    <span className="font-mono text-slate-500">{varName}</span>
                                                                                                                                </div>
                                                                                                                                
                                                                                                                                {/* Mapping wizard */}
                                                                                                                                {varMapping && (
                                                                                                                                    <div className="flex items-center gap-1 text-[10px] ml-4">
                                                                                                                                        <span className="text-purple-500">→</span>
                                                                                                                                        <span className="text-purple-700 font-medium">{varMapping}</span>
                                                                                                                                    </div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Images Section */}
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2 sticky top-0 bg-white py-1">
                                                                <ImageIcon size={14} className="text-emerald-500" />
                                                                Images ({pageImagesForSelected.length})
                                                                <span className="ml-auto text-[10px] font-normal text-slate-400">
                                                                    {pageImagesForSelected.filter((i: any) => i.type === 'static' || i.combinationKey === 'default').length} statiques, 
                                                                    {pageImagesForSelected.filter((i: any) => i.type === 'personalized' && i.combinationKey !== 'default').length} personnalisées
                                                                </span>
                                                            </h4>
                                                            {pageImagesForSelected.length === 0 ? (
                                                                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg">Aucune image sur cette page</p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {pageImagesForSelected.map((img: any, idx: number) => {
                                                                        const currentBook = draftBook || selectedBook;
                                                                        
                                                                        return (
                                                                            <ImageCard
                                                                                key={img.id || idx}
                                                                                img={img}
                                                                                wizardConfig={currentBook?.wizardConfig}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ResizablePanel>
                                            </ResizablePanelGroup>
                                        );
                                    }
                                    
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {selectedBook?.contentConfig?.pages?.sort((a: any, b: any) => a.pageIndex - b.pageIndex).map((page: any) => (
                                                <div 
                                                    key={page.pageIndex}
                                                    className={`relative group bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
                                                        selectedPageId === page.pageIndex.toString() ? 'border-brand-coral shadow-md ring-2 ring-brand-coral/20' : 'border-slate-100 hover:border-brand-coral/30'
                                                    }`}
                                                    onClick={() => setSelectedPageId(page.pageIndex.toString())}
                                                >
                                                    <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-white rounded-t-xl">
                                                        <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-mono">
                                                                {page.pageIndex}
                                                            </span>
                                                            Page {page.pageIndex}
                                                        </span>
                                                    </div>
                                                    <div className="aspect-[3/2] bg-slate-50/50 relative overflow-hidden flex items-center justify-center m-1 rounded-lg border border-slate-100">
                                                        <div className="text-center space-y-1">
                                                            <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                                                {selectedBook?.contentConfig?.texts?.filter((t: any) => t.position?.pageIndex === page.pageIndex).length || 0} Textes
                                                            </div>
                                                            <div className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                                                {selectedBook?.contentConfig?.imageElements?.filter((i: any) => i.position?.pageIndex === page.pageIndex).length || 0} Images
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
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
                       <SaveButton
                          hasChanges={true}
                          isSaving={false}
                          onSave={() => {
                             if (selectedOrderId) {
                                updateOrderStatus(selectedOrderId, draftStatus as any);
                                setDraftStatus(null);
                                toast.success("Statut de la commande mis à jour");
                             }
                          }}
                          label="Enregistrer"
                          savedLabel="Enregistré"
                          className="px-4 py-1.5 rounded-full text-sm"
                       />
                    </div>
                 </div>
              )}

              {/* Avatar EPUB Selector Modal */}
              {showAvatarEpubSelector && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9000]">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CloudDownload size={20} className="text-purple-600" />
                        Importer un template d'avatars (EPUB)
                      </h3>
                      <button 
                        onClick={() => {
                          setShowAvatarEpubSelector(false);
                          setAvatarEpubFile(null);
                        }}
                        className="p-1 hover:bg-white rounded-lg transition-colors"
                      >
                        <X size={18} className="text-slate-500" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                        <p className="font-medium mb-1">Instructions :</p>
                        <p className="text-xs text-purple-700">
                          Sélectionnez un EPUB contenant les avatars pour le personnage <strong>{selectedBook?.wizardConfig.tabs.find(t => t.id === (selectedAvatarTabId || selectedBook.wizardConfig.tabs[0]?.id))?.label}</strong>.
                          Les images doivent suivre la convention de nommage : <code className="bg-purple-100 px-1 rounded">variant-valeur_variant-valeur.png</code>
                        </p>
                      </div>

                      {/* File Upload Section */}
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Sélectionner depuis votre machine
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                          <input
                            type="file"
                            accept=".epub"
                            onChange={(e) => setAvatarEpubFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="avatar-epub-file-input"
                          />
                          <label 
                            htmlFor="avatar-epub-file-input"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            {avatarEpubFile ? (
                              <div className="w-full">
                                <div className="flex items-center gap-2 text-green-600 mb-3">
                                  <FileCode size={20} />
                                  <span className="text-sm font-medium">{avatarEpubFile.name}</span>
                                  <span className="text-xs text-slate-500">
                                    ({(avatarEpubFile.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleImportAvatarEpubFromFile();
                                  }}
                                  disabled={isImportingAvatarEpub}
                                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isImportingAvatarEpub ? (
                                    <>
                                      <Loader2 size={16} className="animate-spin" />
                                      Import en cours...
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={16} />
                                      Importer ce fichier
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <>
                                <Upload size={24} className="text-slate-400" />
                                <span className="text-sm text-slate-600">Cliquez pour sélectionner un fichier .epub</span>
                                <span className="text-xs text-slate-400">Depuis votre ordinateur</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-slate-500">ou</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">
                            EPUBs disponibles
                          </label>
                          <button
                            onClick={loadBucketEpubs}
                            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            Rafraîchir
                          </button>
                        </div>
                        
                        {isLoadingEpubs ? (
                          <div className="flex items-center justify-center py-8 text-slate-400">
                            <Loader2 size={20} className="animate-spin mr-2" />
                            Chargement...
                          </div>
                        ) : bucketEpubs.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <FileCode size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Aucun EPUB trouvé</p>
                            <p className="text-xs text-slate-400 mt-1">Uploadez des fichiers .epub dans le dossier .private/</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {bucketEpubs.map((epub) => (
                              <div 
                                key={epub.path}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-purple-300 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileCode size={18} className="text-purple-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{epub.name}</p>
                                    {epub.size && (
                                      <p className="text-xs text-slate-400">{(epub.size / 1024 / 1024).toFixed(2)} MB</p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleImportAvatarEpub(epub.path)}
                                  disabled={isImportingAvatarEpub}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                                >
                                  {isImportingAvatarEpub ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <CloudDownload size={14} />
                                  )}
                                  Importer
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                      Les avatars sont extraits et stockés dans le dossier avatars du livre.
                    </div>
                  </div>
                </div>
              , document.body)}

              {/* EPUB + IDML Importer Modal */}
              {showIdmlImporter && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9000]">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileCode size={20} className="text-purple-600" />
                        Importer Storyboard (EPUB + IDML)
                      </h3>
                      <button 
                        onClick={() => {
                          setShowIdmlImporter(false);
                          setEpubFile(null);
                          setIdmlFile(null);
                          setFontFilesByFamily({});
                          setDetectedFonts([]);
                        }}
                        className="p-1 hover:bg-white rounded-lg transition-colors"
                      >
                        <X size={18} className="text-slate-500" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                        <p className="font-medium mb-1">Import combiné :</p>
                        <ul className="text-xs text-purple-700 space-y-1 ml-4 list-disc">
                          <li><strong>EPUB</strong> : Images et positions (x, y, largeur, hauteur) uniquement</li>
                          <li><strong>IDML</strong> : Textes, polices et tous les styles de mise en forme</li>
                        </ul>
                        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-md mt-2">
                          ⚠️ L'EPUB ne contient pas le texte ni les polices. Ces informations viennent uniquement de l'IDML.
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {/* EPUB File Upload */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">
                            1. Fichier EPUB (Fixed Layout)
                          </label>
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <input
                              type="file"
                              accept=".epub"
                              onChange={(e) => setEpubFile(e.target.files?.[0] || null)}
                              className="hidden"
                              id="epub-file-input"
                            />
                            <label 
                              htmlFor="epub-file-input"
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              {epubFile ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <FileCode size={20} />
                                  <span className="text-sm font-medium">{epubFile.name}</span>
                                  <span className="text-xs text-slate-500">
                                    ({(epubFile.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <Upload size={24} className="text-slate-400" />
                                  <span className="text-sm text-slate-600">Cliquez pour sélectionner un fichier .epub</span>
                                  <span className="text-xs text-slate-400">Export Fixed Layout depuis InDesign</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* IDML File Upload */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">
                            2. Fichier IDML (InDesign Markup)
                          </label>
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <input
                              type="file"
                              accept=".idml"
                              onChange={(e) => setIdmlFile(e.target.files?.[0] || null)}
                              className="hidden"
                              id="idml-file-input"
                            />
                            <label 
                              htmlFor="idml-file-input"
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              {idmlFile ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <FileCode size={20} />
                                  <span className="text-sm font-medium">{idmlFile.name}</span>
                                  <span className="text-xs text-slate-500">
                                    ({(idmlFile.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <Upload size={24} className="text-slate-400" />
                                  <span className="text-sm text-slate-600">Cliquez pour sélectionner un fichier .idml</span>
                                  <span className="text-xs text-slate-400">Fichier → Enregistrer sous → IDML dans InDesign</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Font Files Upload */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">
                            3. Polices (optionnel)
                            {detectedFonts.length > 0 && (
                              <span className="ml-2 text-xs text-purple-600 font-normal">
                                {detectedFonts.length} police(s) détectée(s) dans l'IDML
                              </span>
                            )}
                          </label>
                          
          {detectedFonts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-purple-900">
                {detectedFonts.length} police(s) détectée(s) - Uploadez les fichiers correspondants :
              </p>
                              
                              {detectedFonts.map((fontFamily, idx) => (
                                <FontFamilyUploader
                                  key={idx}
                                  fontFamily={fontFamily}
                                  files={fontFilesByFamily[fontFamily] || []}
                                  onFilesChange={(files) => {
                                    setFontFilesByFamily(prev => ({
                                      ...prev,
                                      [fontFamily]: files
                                    }));
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                              <p className="text-sm text-slate-500">
                                Aucune police détectée. Uploadez d'abord un fichier IDML.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleCheckImport}
                          disabled={!idmlFile && !epubFile && Object.values(fontFilesByFamily).reduce((sum, files) => sum + files.length, 0) === 0}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-slate-300"
                        >
                          <Search size={18} />
                          Vérifier Import
                        </button>
                        <button
                          onClick={handleImportStoryboard}
                          disabled={!epubFile || !idmlFile || isImportingStoryboard}
                          className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isImportingStoryboard ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Import en cours...
                            </>
                          ) : (
                            <>
                              <FileCode size={18} />
                              Importer le storyboard
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs space-y-1">
                      <p className="text-slate-600 font-medium">Architecture :</p>
                      <ul className="text-slate-500 space-y-0.5 ml-4 list-disc">
                        <li><strong>EPUB</strong> : Images + Positions (x, y, w, h) des zones de texte</li>
                        <li><strong>IDML</strong> : Textes + Polices (fontFamily) + Styles complets</li>
                      </ul>
                      <p className="text-purple-600 mt-2">
                        💡 L'EPUB ne contient aucune information textuelle. Tout vient de l'IDML.
                      </p>
                    </div>
                  </div>
                </div>
              , document.body)}
           </main>
        </div>
     </div>
  );
};

export default AdminDashboard;
