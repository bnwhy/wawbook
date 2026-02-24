import React, { useState, useEffect } from 'react';
import { Wand2, Cloud, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { BookConfig, Theme, Activity } from '../types';
import Navigation from './Navigation';
import { useBooks } from '../context/BooksContext';
import Footer from './Footer';
import { formatPrice } from '../utils/formatPrice';

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
    return;
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
            <p className="text-xl">Image non disponible</p>
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
  
  // Ref for wizard container
  const wizardContainerRef = React.useRef<HTMLDivElement>(null);
  // Stable ref to initialSelections to avoid re-init on every parent render
  const initialSelectionsRef = React.useRef(props.initialSelections);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize state when config loads — uses initialSelectionsRef for stability
  useEffect(() => {
    if (wizardConfig && wizardConfig.tabs.length > 0) {
      setActiveTabId(wizardConfig.tabs[0].id);
      
      const savedSelections = initialSelectionsRef.current;
      const initialSelectionsState: Record<string, Record<string, any>> = {};
      wizardConfig.tabs.forEach(tab => {
        initialSelectionsState[tab.id] = {};
        tab.variants.forEach(variant => {
          if (savedSelections && savedSelections[tab.id] && savedSelections[tab.id][variant.id] !== undefined) {
             initialSelectionsState[tab.id][variant.id] = savedSelections[tab.id][variant.id];
          } else {
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Livre introuvable</h2>
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

  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ 
      backgroundColor: '#E0F2FE',
      backgroundImage: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)'
    }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out 3s infinite;
        }
      `}</style>

      {/* NAVIGATION */}
      <Navigation onStart={() => {}} />

      {/* MOBILE AVATAR - STICKY (positioned outside overflow container) */}
      <div className="lg:hidden flex justify-center py-4 backdrop-blur-sm border-b border-white/50 transition-all duration-300 w-full sticky top-[60px] z-30" style={{
        background: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)'
      }}>
         <div className="w-[225px] h-[225px] rounded-full bg-white/70 backdrop-blur-md border border-gray-300 overflow-hidden shadow-2xl">
            {renderCharacterAvatar(
              activeTab?.type === 'character' 
                ? activeTabId 
                : (wizardConfig.tabs.find(t => t.type === 'character')?.id || 'child')
            )}
         </div>
      </div>

      {/* WIZARD CONTENT */}
      <div className="flex-1 flex flex-col items-center w-full relative overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.6) 0%, rgba(240, 249, 255, 0.8) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(20px)'
      }}>
        
        {/* Watercolor texture overlay */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='watercolor'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='5' seed='2'/%3E%3CfeColorMatrix type='hueRotate' values='200'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23watercolor)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '400px 400px',
          mixBlendMode: 'overlay'
        }} />
        
        {/* Soft watercolor blobs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full opacity-20 blur-3xl animate-float pointer-events-none" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-sky-200 rounded-full opacity-15 blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute bottom-32 left-1/4 w-72 h-72 bg-cyan-200 rounded-full opacity-20 blur-3xl animate-float pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-blue-100 rounded-full opacity-25 blur-3xl animate-float-delayed pointer-events-none" />
        
        {/* Floating Clouds - More blurred */}
        <div className="absolute top-32 left-10 text-white opacity-30 blur-sm animate-float pointer-events-none">
          <Cloud size={100} fill="currentColor" />
        </div>
        <div className="absolute top-52 right-20 text-white opacity-20 blur-sm animate-float-delayed pointer-events-none">
          <Cloud size={80} fill="currentColor" />
        </div>
        <div className="absolute bottom-20 left-1/4 text-white opacity-25 blur-sm animate-float pointer-events-none">
          <Cloud size={120} fill="currentColor" />
        </div>

        <div ref={wizardContainerRef} className="relative z-10 bg-transparent w-full max-w-6xl flex flex-col lg:flex-row gap-56 items-start justify-center p-4 pt-20 md:p-8 md:pt-24 mb-12">
          
          {/* --- LEFT COLUMN: CONFIGURATION --- */}
          <div className="w-full lg:w-[563px] flex flex-col relative">
             
             {/* CONTAINER WITH TITLE */}
             <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-4">
               <h2 className="text-3xl font-bold text-cloud-dark" style={{ fontSize: '25px' }}>
                 Personnaliser vos personnages
               </h2>
             </div>
             
             {/* WIZARD FORM */}
             <div className="overflow-hidden flex flex-col relative shadow-2xl">
             
             {/* TABS */}
             <div className="flex shrink-0 lg:sticky lg:top-0 bg-transparent z-10 border-b border-gray-300">
                {wizardConfig.tabs.map(tab => (
                  <button 
                     key={tab.id}
                     onClick={() => setActiveTabId(tab.id)}
                     className={`flex-1 px-6 py-3 font-bold text-xl tracking-wide transition-all whitespace-nowrap relative ${
                       activeTabId === tab.id 
                         ? 'bg-white text-cloud-dark border border-b-0 border-gray-300 rounded-t-lg -mb-px z-10' 
                         : 'bg-[#F2F2F2] text-gray-400 hover:text-gray-600 rounded-t-lg border border-gray-300'
                     }`}
                  >
                     {tab.label}
                  </button>
                ))}
             </div>

             {/* FORM CONTENT */}
             <div className="p-6 space-y-4 flex-1 border border-t-0 border-gray-300 rounded-b-lg bg-white">
                {activeTab && activeTab.variants.map((variant, index) => {
                  const currentValue = selections[activeTabId]?.[variant.id];
                  const isLast = index === activeTab.variants.length - 1;

                  // Wrapper function to add divider after each section except the last one
                  const withDivider = (content: React.ReactNode) => (
                    <div key={variant.id} className="space-y-3">
                       {content}
                       {!isLast && (
                          <div className="py-2">
                             <div className="h-0.5 bg-gray-300 w-full"></div>
                          </div>
                       )}
                    </div>
                  );

                  // --- RENDER: TEXT INPUT ---
                  if (variant.type === 'text') {
                    return withDivider(
                      <div className="space-y-1">
                         <label className="font-bold text-gray-600 text-xl">
                            {variant.label} *
                         </label>
                         <input 
                           type="text" 
                           value={currentValue || ''}
                           onChange={(e) => handleSelectionChange(activeTabId, variant.id, e.target.value)}
                           className={`w-full border rounded-md px-4 py-2 text-cloud-dark focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-xl font-medium ${errors[variant.id] ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'bg-[#FFFBEB] border-gray-200 focus:border-cloud-dark'}`}
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
                             <label htmlFor={`checkbox-${variant.id}`} className="font-bold text-gray-600 text-xl cursor-pointer select-none">
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
                         <label className="font-bold text-gray-600 text-xl w-24 shrink-0">{variant.label}</label>
                         <div className="flex gap-2 flex-wrap flex-1">
                            {variant.options?.map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                className={`w-8 h-8 rounded-full transition-all border border-gray-200 ${currentValue === opt.id ? 'border-cloud-blue ring-2 ring-cloud-blue/20 scale-110 ring-offset-2' : 'hover:scale-105'}`}
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
                          <label className="font-bold text-gray-600 text-xl w-24 shrink-0">{variant.label}</label>
                          <div className="flex gap-2 flex-wrap flex-1">
                             {(variant.options || []).map((opt) => {
                               // Prefer resource (uploaded image) over legacy thumbnail
                               const imageUrl = opt.resource && !opt.resource.startsWith('#') ? opt.resource : opt.thumbnail;
                               
                               return (
                               <button
                                 key={opt.id}
                                 onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                 className={`${variant.showLabel ? 'flex items-center gap-2 px-2 py-2' : 'w-14 h-14'} rounded-full transition-all border border-gray-200 overflow-hidden ${variant.showLabel ? 'bg-white' : 'flex items-center justify-center bg-white'} ${currentValue === opt.id ? 'border-cloud-blue ring-2 ring-cloud-blue/20 scale-110 ring-offset-2' : 'hover:scale-105'}`}
                                 title={opt.label}
                               >
                                  <div className={`${variant.showLabel ? 'w-10 h-10' : 'w-full h-full'} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0`}>
                                    {imageUrl ? (
                                       <img src={imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="text-xl font-bold text-gray-400">{opt.label[0]}</span>
                                    )}
                                  </div>
                                  {variant.showLabel && (
                                    <span className="text-xl font-medium text-gray-700 pr-2">{opt.label}</span>
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
                       <label className="font-bold text-gray-600 text-xl">{variant.label}</label>
                       <div className={`grid ${isGrid ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
                          {variant.options?.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                              className={`px-3 py-2 rounded-md border text-xl font-medium transition-all ${currentValue === opt.id ? 'bg-cloud-blue/10 border-cloud-blue text-cloud-dark' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
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
             {props.isEditing && (
             <button 
               onClick={onCancel}
               className="text-gray-400 hover:text-gray-600 font-bold text-xl px-4 py-2 mr-auto hover:bg-gray-100 rounded-lg transition-colors"
             >
                 Retour au panier
             </button>
             )}

             </div>
             {/* END WIZARD FORM */}
          </div>

          {/* --- RIGHT COLUMN: PREVIEW --- */}
          <div className="hidden lg:flex flex-col gap-6 flex-1 relative items-center justify-start px-8 pb-8 pt-[53px]">
             
             {/* Avatar Visualization (Above Book) */}
             <div className="flex flex-col items-center animate-drop-in z-20 -ml-24">
                <div className="w-72 h-72 rounded-full bg-white/70 backdrop-blur-md border border-gray-300 overflow-hidden relative shadow-2xl flex-shrink-0">
                   {renderCharacterAvatar(
                     activeTab?.type === 'character' 
                       ? activeTabId 
                       : (wizardConfig.tabs.find(t => t.type === 'character')?.id || 'child')
                   )}
                </div>
                
                {/* Book Info */}
                {book && (
                  <div className="mt-16 text-left max-w-md">
                    <h2 className="text-3xl font-bold text-cloud-dark mb-2">{book.name}</h2>
                    <div className="flex items-center justify-start gap-3 mb-4">
                      {book.oldPrice && (
                        <span className="text-lg text-gray-400 line-through whitespace-nowrap">{formatPrice(book.oldPrice)}</span>
                      )}
                      <span className="text-2xl font-black text-accent-melon whitespace-nowrap">{formatPrice(book.price)}</span>
                    </div>
                    <p className="text-lg text-gray-600 mb-6">{book.description}</p>
                    
                    <button 
                      onClick={handleComplete}
                      className="bg-[#0c4a6e] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex items-center gap-2 ml-auto"
                    >
                      <Wand2 size={32} />
                      {props.isEditing ? "Mettre à jour" : "Créer le livre"}
                    </button>
                  </div>
                )}
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
