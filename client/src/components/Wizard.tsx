import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wand2, Cloud, Check, ChevronRight, ArrowRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { BookConfig, Gender, Theme, HairStyle, Outfit, Activity } from '../types';
import { WizardVariant, WizardOption } from '../types/admin';
import Navigation from './Navigation';
import { useBooks } from '../context/BooksContext';
import Footer from './Footer';

const previewBackground = '';

interface WizardProps {
  onComplete: (config: BookConfig, context?: { theme?: Theme, productId?: string }) => void;
  onCancel: () => void;
  initialTheme?: Theme;
  initialActivity?: Activity;
  bookTitle?: string;
  initialSelections?: Record<string, Record<string, any>>;
  isEditing?: boolean;
}

// Avatar Image with loading animation
const AvatarImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setError(false);
    setImageLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imageLoaded && !error) {
      // Show animation for 600ms
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded, error]);

  return (
    <div className="relative w-full h-full">
      {/* Loading animation - Pencil drawing */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-10">
          <div className="relative">
            {/* Animated pencil */}
            <div className="animate-bounce">
              <Pencil 
                size={48} 
                className="text-cloud-dark"
                style={{
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                  animation: 'draw 2s ease-in-out infinite'
                }}
              />
            </div>
            {/* Drawing line animation */}
            <svg className="absolute -bottom-8 left-1/2 -translate-x-1/2" width="100" height="20">
              <path
                d="M 10,10 Q 50,5 90,10"
                stroke="#4A5568"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="animate-pulse"
                style={{
                  strokeDasharray: '100',
                  strokeDashoffset: '100',
                  animation: 'drawLine 2s ease-in-out infinite'
                }}
              />
            </svg>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <p className="text-sm">Image non disponible</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img 
        src={src} 
        alt={alt}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        className={`w-full h-full object-cover transition-all duration-500 ease-out ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Watermark overlay (subtle) */}
      {!isLoading && !error && (
        <div className="absolute bottom-2 right-2 opacity-30 hover:opacity-60 transition-opacity">
          <Pencil size={16} className="text-gray-600" />
        </div>
      )}

      <style>{`
        @keyframes draw {
          0%, 100% {
            transform: rotate(-5deg) translateY(0);
          }
          50% {
            transform: rotate(5deg) translateY(-5px);
          }
        }
        
        @keyframes drawLine {
          0% {
            stroke-dashoffset: 100;
            opacity: 0;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -100;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

const Wizard: React.FC<WizardProps> = (props) => {
  const { onComplete, onCancel, bookTitle } = props;
  const { books } = useBooks();
  
  // Find the book configuration
  const book = books.find(b => b.name === bookTitle);
  const wizardConfig = book?.wizardConfig;

  // State for dynamic selections: { [tabId]: { [variantId]: value } }
  const [selections, setSelections] = useState<Record<string, Record<string, any>>>({});
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize state when config loads
  useEffect(() => {
    if (wizardConfig && wizardConfig.tabs.length > 0) {
      // Set initial active tab
      setActiveTabId(wizardConfig.tabs[0].id);
      
      // Initialize default selections if empty
      const initialSelectionsState: Record<string, Record<string, any>> = {};
      wizardConfig.tabs.forEach(tab => {
        initialSelectionsState[tab.id] = {};
        tab.variants.forEach(variant => {
          // Check if we have prop initialSelections for this field
          if (props.initialSelections && props.initialSelections[tab.id] && props.initialSelections[tab.id][variant.id] !== undefined) {
             initialSelectionsState[tab.id][variant.id] = props.initialSelections[tab.id][variant.id];
          } else {
             // Select random option if available, or empty string
             if ((variant.type === 'options' || variant.type === 'color') && variant.options && variant.options.length > 0) {
               const randomIndex = Math.floor(Math.random() * variant.options.length);
               initialSelectionsState[tab.id][variant.id] = variant.options[randomIndex].id;
             } else {
               initialSelectionsState[tab.id][variant.id] = '';
             }
          }
        });
      });
      setSelections(initialSelectionsState);
    }
  }, [wizardConfig]);

  if (!book || !wizardConfig) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Livre introuvable</h2>
          <button onClick={onCancel} className="text-brand-coral hover:underline">
            {props.isEditing ? "Retour au panier" : "Retour à l'accueil"}
          </button>
        </div>
      </div>
    );
  }

  const activeTab = wizardConfig.tabs.find(t => t.id === activeTabId);
  
  const handleSelectionChange = (tabId: string, variantId: string, value: any) => {
    setSelections(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        [variantId]: value
      }
    }));
    
    // Clear error for this field if it exists
    if (errors[variantId]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[variantId];
            return newErrors;
        });
    }
  };

  // Helper to get resource (color/image) for a selection
  const getSelectedResource = (tabId: string, variantId: string) => {
     const selectedId = selections[tabId]?.[variantId];
     if (!selectedId) return null;
     
     const tab = wizardConfig.tabs.find(t => t.id === tabId);
     const variant = tab?.variants.find(v => v.id === variantId);
     const option = variant?.options?.find(o => o.id === selectedId);
     return option?.resource;
  };

  const renderCharacterAvatar = (tabId: string) => {
     const currentSelections = selections[tabId] || {};

     // Check for custom avatar mapping (uploaded via Admin)
     const tab = wizardConfig.tabs.find(t => t.id === tabId);
     if (tab && wizardConfig.avatarMappings) {
        const relevantVariants = tab.variants.filter(v => v.type !== 'text' && v.options && v.options.length > 0);
        const selectedOptionIds = relevantVariants
            .map(v => currentSelections[v.id])
            .filter(id => id && id !== '') // Filter out empty strings/undefined
        
        // Try scoped key first (tabId:optionIds), then fallback to legacy key (optionIds only)
        const legacyKey = selectedOptionIds.join('_');
        const scopedKey = `${tabId}:${legacyKey}`;
        const customAvatarUrl = wizardConfig.avatarMappings[scopedKey] ?? wizardConfig.avatarMappings[legacyKey];
        
        if (customAvatarUrl) {
           return <AvatarImage src={customAvatarUrl} alt="Avatar" />;
        }
     }

     // Fallback: empty if no avatar configured in admin
     return null;
  };

  const handleComplete = () => {
    // VALIDATION: Check required fields
    const newErrors: Record<string, boolean> = {};
    let firstErrorTabId: string | null = null;

    if (wizardConfig) {
      for (const tab of wizardConfig.tabs) {
        for (const variant of tab.variants) {
          // Check for empty text fields (marked with * in UI)
          if (variant.type === 'text') {
            const val = selections[tab.id]?.[variant.id];
            
            // Check for empty required fields
            if (!val || typeof val !== 'string' || val.trim() === '') {
                newErrors[variant.id] = true;
                if (!firstErrorTabId) {
                    firstErrorTabId = tab.id;
                }
            } else {
                // Check min length if specified
                if (variant.minLength && val.length < variant.minLength) {
                    newErrors[variant.id] = true;
                    if (!firstErrorTabId) firstErrorTabId = tab.id;
                    toast.error(`Le champ "${variant.label}" doit contenir au moins ${variant.minLength} caractères`);
                }
                // Check max length if specified (although input limits it, good to double check)
                if (variant.maxLength && val.length > variant.maxLength) {
                    newErrors[variant.id] = true;
                    if (!firstErrorTabId) firstErrorTabId = tab.id;
                    toast.error(`Le champ "${variant.label}" ne doit pas dépasser ${variant.maxLength} caractères`);
                }
            }
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Only show generic error if specific length errors weren't shown
        if (!Object.keys(newErrors).some(k => {
             // Find variant to check if it failed due to length
             const allVariants = wizardConfig?.tabs.flatMap(t => t.variants) || [];
             const v = allVariants.find(v => v.id === k);
             const val = selections[wizardConfig?.tabs.find(t => t.variants.find(va => va.id === k))?.id || '']?.[k];
             return v && val && ((v.minLength && val.length < v.minLength) || (v.maxLength && val.length > v.maxLength));
        })) {
             toast.error("Veuillez remplir les champs obligatoires");
        }
        
        // Switch to the first tab with an error
        if (firstErrorTabId && firstErrorTabId !== activeTabId) {
            setActiveTabId(firstErrorTabId);
        }
        return; // Stop submission
    }

    // Map dynamic selections to BookConfig
    // For now, we map "child" tab to legacy fields if possible for compatibility
    const childTab = selections['child'] || {};
    
    // Only map values that actually exist in the selections
    const appearance: any = {};
    if (childTab['hairColor']) appearance.hairColor = childTab['hairColor'];
    if (childTab['skinTone']) appearance.skinTone = childTab['skinTone'];
    if (childTab['hairStyle']) appearance.hairStyle = childTab['hairStyle'];
    if (childTab['glasses']) {
       appearance.glasses = childTab['glasses'] !== 'None';
       appearance.glassesStyle = childTab['glasses'] === 'None' ? 'None' : childTab['glasses'];
    }

    const config: BookConfig = {
      characters: selections // Store full dynamic data here
    };

    if (childTab['name']) {
        config.childName = childTab['name'];
    }

    if (Object.keys(appearance).length > 0) {
        config.appearance = appearance;
    }

    // REMOVED: theme, age, gender - ONLY include explicitly entered data
    
    onComplete(config, { theme: book.theme, productId: book.id });
  };

  // Helper to get current colors for SVG defs (just taking first available for now as example)
  const bgPattern = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans relative">

      {/* NAVIGATION */}
      <Navigation onStart={() => {}} />

      {/* WIZARD CONTENT */}
      <div className="flex-1 flex flex-col items-center w-full" style={{ backgroundImage: bgPattern }}>
        
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center p-4 pt-20 md:p-8 md:pt-24 mb-12">
          
          {/* --- LEFT COLUMN: CONFIGURATION --- */}
          <div className="w-full lg:w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col relative">
             
             <div className="p-4 border-b border-gray-100 shrink-0 sticky top-0 bg-white z-10">
                <div className="text-xs font-bold text-brand-coral uppercase tracking-wider mb-1">
                   Personnalisation du livre
                </div>
                <h2 className="text-xl font-display font-black text-cloud-dark leading-tight">
                   {book.name}
                </h2>
             </div>

             {/* TABS */}
             <div className="flex border-b border-gray-200 overflow-x-auto shrink-0 sticky top-[73px] bg-white z-10">
                {wizardConfig.tabs.map(tab => (
                  <button 
                     key={tab.id}
                     onClick={() => setActiveTabId(tab.id)}
                     className={`flex-1 py-3 px-4 font-bold text-sm tracking-wider transition-colors relative whitespace-nowrap ${activeTabId === tab.id ? 'bg-white text-cloud-dark' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                  >
                     <span className={activeTabId === tab.id ? "border-b-2 border-cloud-dark pb-3 block w-full" : "pb-3 block w-full"}>
                       {tab.label}
                     </span>
                  </button>
                ))}
             </div>

             {/* FORM CONTENT */}
             <div className="p-4 space-y-4 flex-1">
                {activeTab && activeTab.variants.map((variant, index) => {
                  const currentValue = selections[activeTabId]?.[variant.id];
                  const isLast = index === activeTab.variants.length - 1;

                  // Wrapper function to add divider after each section except the last one
                  const withDivider = (content: React.ReactNode) => (
                    <div key={variant.id} className="space-y-3">
                       {content}
                       {!isLast && (
                          <div className="flex items-center gap-4 py-1 opacity-50">
                             <div className="h-px bg-gray-200 flex-1"></div>
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                             <div className="h-px bg-gray-200 flex-1"></div>
                          </div>
                       )}
                    </div>
                  );

                  // --- RENDER: TEXT INPUT ---
                  if (variant.type === 'text') {
                    return withDivider(
                      <div className="space-y-1">
                         <label className="font-bold text-gray-600 text-sm">
                            {variant.label} *
                         </label>
                         <input 
                           type="text" 
                           value={currentValue || ''}
                           onChange={(e) => handleSelectionChange(activeTabId, variant.id, e.target.value)}
                           className={`w-full border rounded-md px-4 py-2 text-cloud-dark focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-sm font-medium ${errors[variant.id] ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'bg-[#FFFBEB] border-gray-200 focus:border-cloud-dark'}`}
                           placeholder={`Entrez ${variant.label.toLowerCase()}...`}
                           maxLength={variant.maxLength}
                         />
                      </div>
                    );
                  }

                  // --- RENDER: VISUAL OPTIONS (Colors/Icons) ---
                  // Check if options have 'resource' (colors/images) or just labels
                  const isColorPicker = variant.options?.some(o => o.resource && o.resource.startsWith('#')) || false;
                  const hasThumbnails = variant.options?.some(o => o.thumbnail || o.resource) || false;
                  const isGrid = (variant.options?.length || 0) > 6 && !isColorPicker;

                  if (variant.type === 'checkbox') {
                    // Checkbox handling (using first option or defaulting if no option exists)
                    const isChecked = !!currentValue;
                    return withDivider(
                        <div className="flex items-center justify-between gap-4">
                             <label htmlFor={`checkbox-${variant.id}`} className="font-bold text-gray-600 text-sm cursor-pointer select-none">
                                {variant.label}
                            </label>
                            <div 
                              className={`relative w-11 h-6 transition-colors rounded-full cursor-pointer ${isChecked ? 'bg-cloud-dark' : 'bg-gray-200'}`}
                              onClick={() => {
                                handleSelectionChange(activeTabId, variant.id, !isChecked ? 'true' : '');
                              }}
                            >
                                <span 
                                  className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                                <input
                                    type="checkbox"
                                    id={`checkbox-${variant.id}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                        // If checked, store 'true', if unchecked, store empty string (falsy)
                                        handleSelectionChange(activeTabId, variant.id, e.target.checked ? 'true' : '');
                                    }}
                                    className="sr-only"
                                />
                            </div>
                        </div>
                    );
                  }

                  if (isColorPicker) {
                    return withDivider(
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                         <label className="font-bold text-gray-600 text-sm w-24 shrink-0">{variant.label}</label>
                         <div className="flex gap-2 flex-wrap flex-1">
                            {variant.options?.map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                className={`w-8 h-8 rounded-full transition-all border border-gray-200 ${currentValue === opt.id ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                                style={{ backgroundColor: opt.resource }}
                                title={opt.label}
                              />
                            ))}
                         </div>
                      </div>
                    );
                  }

                  if (hasThumbnails) {
                     return withDivider(
                       <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <label className="font-bold text-gray-600 text-sm w-24 shrink-0">{variant.label}</label>
                          <div className="flex gap-2 flex-wrap flex-1">
                             {(variant.options || []).map((opt) => {
                               // Prefer resource (uploaded image) over legacy thumbnail
                               const imageUrl = opt.resource && !opt.resource.startsWith('#') ? opt.resource : opt.thumbnail;
                               if (imageUrl && !imageUrl.startsWith('#')) {
                                 console.log('[Wizard] Displaying image:', { optionId: opt.id, imageUrl });
                               }
                               
                               return (
                               <button
                                 key={opt.id}
                                 onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                 className={`${variant.showLabel ? 'flex items-center gap-2 px-2 py-2' : 'w-14 h-14'} rounded-full transition-all border border-gray-200 overflow-hidden ${variant.showLabel ? 'bg-white' : 'flex items-center justify-center bg-white'} ${currentValue === opt.id ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                                 title={opt.label}
                               >
                                  <div className={`${variant.showLabel ? 'w-10 h-10' : 'w-full h-full'} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0`}>
                                    {imageUrl ? (
                                       <img src={imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="text-sm font-bold text-gray-400">{opt.label[0]}</span>
                                    )}
                                  </div>
                                  {variant.showLabel && (
                                    <span className="text-sm font-medium text-gray-700 pr-2">{opt.label}</span>
                                  )}
                               </button>
                             )})}
                          </div>
                       </div>
                     );
                  }

                  // Default Button Grid/List
                  return withDivider(
                    <div className="space-y-2">
                       <label className="font-bold text-gray-600 text-sm">{variant.label}</label>
                       <div className={`grid ${isGrid ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
                          {variant.options?.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                              className={`px-3 py-2 rounded-md border text-sm font-medium transition-all ${currentValue === opt.id ? 'bg-[#E8F5F2] border-[#8DD0C3] text-cloud-dark' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                               {opt.label}
                            </button>
                          ))}
                       </div>
                    </div>
                  );
                })}
             </div>

             {/* FOOTER ACTIONS */}
             <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end items-center shrink-0">
                {props.isEditing && (
                <button 
                  onClick={onCancel}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm px-4 py-2 mr-auto hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Retour au panier
                </button>
                )}

                <button 
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-accent-sun to-yellow-400 text-yellow-900 px-6 py-3 rounded-full font-bold shadow-lg hover:brightness-105 transition-all flex items-center gap-2 hover:scale-105 hover:shadow-xl"
                >
                   <Wand2 size={20} />
                   {props.isEditing ? "Mettre à jour" : "Créer le livre"}
                </button>
             </div>

          </div>

          {/* --- RIGHT COLUMN: PREVIEW --- */}
          <div className="hidden lg:flex flex-col gap-6 flex-1 h-[700px] sticky top-24 relative items-center justify-center p-8">
             
             {/* Avatar Visualization (Above Book) */}
             <div className="flex flex-col items-center animate-drop-in z-20">
                <div className="w-64 h-64 rounded-full bg-white border-[8px] border-white shadow-xl overflow-hidden relative">
                   {renderCharacterAvatar(
                     activeTab?.type === 'character' 
                       ? activeTabId 
                       : (wizardConfig.tabs.find(t => t.type === 'character')?.id || 'child')
                   )}
                </div>
             </div>

             {/* Book Cover Simulation - Hardcover Effect */}
             <div className="relative w-[55%] aspect-[3/4] transform rotate-2 group" style={{ perspective: '1000px' }}>
                {/* Book container */}
                <div 
                  className="relative w-full h-full transition-transform duration-500"
                  style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-5deg)' }}
                >
                  {/* Page edges (right side) */}
                  <div 
                    className="absolute right-0 top-2 bottom-2 w-3"
                    style={{ transform: 'translateX(3px)' }}
                  >
                    {[...Array(10)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute top-0 bottom-0 bg-gray-100 border-r border-gray-200"
                        style={{ 
                          right: `${i * 1}px`,
                          width: '1px',
                          opacity: 1 - (i * 0.08)
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Page edges (bottom) */}
                  <div 
                    className="absolute left-2 right-2 bottom-0 h-2 bg-gradient-to-b from-gray-100 to-gray-300 rounded-b-sm"
                    style={{ transform: 'translateY(3px)' }}
                  />
                  
                  {/* Main cover with hardcover crease */}
                  <div className="absolute inset-0 rounded-sm overflow-hidden shadow-2xl bg-white">
                    {book.coverImage && <img src={book.coverImage} alt="Cover" className="w-full h-full object-cover" />}
                    
                    {/* Hardcover binding crease/groove - the characteristic indent of hardcover books */}
                    <div 
                      className="absolute left-[2%] top-0 bottom-0 w-[14px] pointer-events-none"
                      style={{
                        background: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.08) 30%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.05) 70%, transparent 100%)',
                        boxShadow: '-1px 0 2px rgba(0,0,0,0.08), 1px 0 2px rgba(0,0,0,0.05)'
                      }}
                    />
                    
                    {/* Cover shine effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none"
                    />
                    
                    {/* Subtle edge shadow on left */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                  </div>
                  
                  {/* Drop shadow */}
                  <div 
                    className="absolute -bottom-6 left-2 right-2 h-10 bg-black/25 blur-xl rounded-full"
                    style={{ transform: 'scaleY(0.25)' }}
                  />
                </div>
             </div>
          </div>

        </div>
      </div>
      
      {/* GLOBAL FOOTER */}
      <Footer />
    </div>
  );
};

export default Wizard;
