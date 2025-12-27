import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wand2, Cloud, Check, ChevronRight, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { BookConfig, Gender, Theme, HairStyle, Outfit, Activity } from '../types';
import { WizardVariant, WizardOption } from '../types/admin';
import Navigation from './Navigation';
import { useBooks } from '../context/BooksContext';
import previewBackground from '@assets/generated_images/watercolor_paper_background_with_soft_pastel_splash.png';

import Footer from './Footer';

interface WizardProps {
  onComplete: (config: BookConfig, context?: { theme?: Theme, productId?: string }) => void;
  onCancel: () => void;
  initialTheme?: Theme;
  initialActivity?: Activity;
  bookTitle?: string;
  initialSelections?: Record<string, Record<string, any>>;
  isEditing?: boolean;
}

// --- WATERCOLOR SVG COMPONENTS ---
// Reusable defs for filter and gradients
const WatercolorDefs = ({ skinHex, hairHex }: { skinHex: string, hairHex: string }) => (
  <defs>
    <filter id="watercolor">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      <feGaussianBlur in="displaced" stdDeviation="0.5" result="blurred" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" in="blurred" result="goo" />
      <feComposite operator="in" in="SourceGraphic" in2="goo" result="composite" />
      <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
    </filter>
    <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={skinHex} stopOpacity="1" />
        <stop offset="100%" stopColor={skinHex} stopOpacity="0.9" />
    </linearGradient>
    <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={hairHex} stopOpacity="0.9" />
        <stop offset="100%" stopColor={hairHex} stopOpacity="1" />
    </linearGradient>
  </defs>
);

// --- THUMBNAIL HELPERS (Simplified/Generic) ---
const GenericThumbnail = ({ type, id, color }: { type: string, id: string, color?: string }) => {
  // Placeholder for generic shapes if no specific SVG exists
  if (color) {
    return <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full text-[10px] text-gray-400">
      {id.slice(0, 3)}
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
             // Default to first option if available, or empty string
             if (variant.type === 'options' && variant.options && variant.options.length > 0) {
               initialSelectionsState[tab.id][variant.id] = variant.options[0].id;
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
        
        const combinationKey = selectedOptionIds.join('_');
        const customAvatarUrl = wizardConfig.avatarMappings[combinationKey];
        
        if (customAvatarUrl) {
           return <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover transition-all duration-500 ease-out" />;
        }
     }

     const skinColor = getSelectedResource(tabId, 'skinTone') || '#FFE0BD';
     const hairColor = getSelectedResource(tabId, 'hairColor') || '#302e34';
     const gender = currentSelections['gender'] || 'boy';
     const hairStyle = currentSelections['hairStyle'] || (gender === 'girl' ? 'Long' : 'Court');
     const glasses = currentSelections['glasses'] || 'None';
     const beard = currentSelections['beard'] || 'None';
     
     // Helper for hair back (behind head)
     const renderHairBack = () => {
        if (['Long', 'Carré', 'Bouclé', 'Nattes', 'QueueCheval'].includes(hairStyle)) {
             return <path d="M25,50 Q20,95 50,95 Q80,95 75,50" fill={hairColor} />;
        }
        return null;
     };

     // Helper for hair front (on top of head)
     const renderHairFront = () => {
        switch(hairStyle) {
            case 'Chauve': 
                return <path d="M22,50 Q22,40 25,35 M78,50 Q78,40 75,35" stroke={hairColor} strokeWidth="1" fill="none" opacity="0.5" />;
            case 'Hérissé':
                return <path d="M28,45 L35,25 L45,40 L50,20 L55,40 L65,25 L72,45" fill={hairColor} />;
            case 'Chignon':
                return (
                    <g>
                        <circle cx="50" cy="20" r="12" fill={hairColor} />
                        <path d="M28,50 Q50,25 72,50" fill={hairColor} />
                    </g>
                );
            case 'Nattes':
                return (
                    <g>
                        <path d="M28,50 Q50,25 72,50" fill={hairColor} />
                        <rect x="15" y="50" width="10" height="30" rx="5" fill={hairColor} />
                        <rect x="75" y="50" width="10" height="30" rx="5" fill={hairColor} />
                    </g>
                );
            case 'Bouclé':
                 return (
                    <g>
                        <circle cx="30" cy="40" r="8" fill={hairColor} />
                        <circle cx="40" cy="30" r="8" fill={hairColor} />
                        <circle cx="50" cy="28" r="8" fill={hairColor} />
                        <circle cx="60" cy="30" r="8" fill={hairColor} />
                        <circle cx="70" cy="40" r="8" fill={hairColor} />
                    </g>
                 );
            case 'QueueCheval':
                return (
                    <g>
                       <circle cx="70" cy="30" r="10" fill={hairColor} />
                       <path d="M28,50 Q50,25 72,50" fill={hairColor} />
                    </g>
                );
            case 'Carré':
            case 'Long':
            case 'Court':
            default:
                return <path d="M28,50 Q50,20 72,50 Q72,55 72,50 Q50,30 28,50" fill={hairColor} />;
        }
     };

     const renderGlasses = () => {
         if (glasses === 'Round') {
             return (
                 <g stroke="#333" strokeWidth="1.5" fill="white" fillOpacity="0.2">
                     <circle cx="40" cy="52" r="7" />
                     <circle cx="60" cy="52" r="7" />
                     <line x1="47" y1="52" x2="53" y2="52" />
                 </g>
             );
         }
         if (glasses === 'Square') {
             return (
                 <g stroke="#333" strokeWidth="1.5" fill="white" fillOpacity="0.2">
                     <rect x="32" y="46" width="14" height="12" rx="2" />
                     <rect x="54" y="46" width="14" height="12" rx="2" />
                     <line x1="46" y1="52" x2="54" y2="52" />
                 </g>
             );
         }
         return null;
     };

     const renderBeard = () => {
         if (beard === 'Moustache') {
             return <path d="M38,62 Q50,58 62,62" stroke={hairColor} strokeWidth="3" strokeLinecap="round" fill="none" />;
         }
         if (beard === 'Bouc') {
             return <path d="M48,68 Q50,75 52,68 L50,68 Z" stroke={hairColor} strokeWidth="4" fill={hairColor} />;
         }
         if (beard === 'Barbe') {
             return <path d="M30,55 Q50,90 70,55" fill={hairColor} opacity="0.9" />;
         }
         return null;
     };

     // Simple avatar SVG composition
     return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg transition-all duration-500 ease-out">
           {/* Body/Outfit */}
           <path d="M20,100 Q50,70 80,100" fill={hairColor} opacity="0.5" />
           <path d="M30,100 L30,80 Q50,70 70,80 L70,100" fill="#60A5FA" /> {/* Generic Outfit Color */}
           
           {/* Neck */}
           <rect x="45" y="65" width="10" height="15" fill={skinColor} />
           
           {/* Hair Back */}
           {renderHairBack()}

           {/* Head */}
           <circle cx="50" cy="50" r="22" fill={skinColor} />
           
           {/* Eyes */}
           <circle cx="43" cy="52" r="2" fill="#333" />
           <circle cx="57" cy="52" r="2" fill="#333" />
           
           {/* Smile */}
           <path d="M45,62 Q50,65 55,62" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
           
           {/* Blush */}
           <circle cx="40" cy="58" r="3" fill="#FFAAAA" opacity="0.4" />
           <circle cx="60" cy="58" r="3" fill="#FFAAAA" opacity="0.4" />

           {/* Beard */}
           {renderBeard()}

           {/* Hair Front */}
           {renderHairFront()}
           
           {/* Glasses */}
           {renderGlasses()}
        </svg>
     );
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
  // In a real app, we'd map specific tab/variant IDs to these props
  const getCurrentColors = () => {
    const currentTabSelections = selections[activeTabId] || {};
    // Try to find skin/hair colors in current tab
    const skinToneId = currentTabSelections['skinTone'];
    const hairColorId = currentTabSelections['hairColor'];
    
    // Find hex values from options resources
    let skinHex = '#FFE0BD';
    let hairHex = '#302e34';

    if (activeTab) {
       const skinVariant = activeTab.variants.find(v => v.id === 'skinTone');
       const hairVariant = activeTab.variants.find(v => v.id === 'hairColor');
       
       if (skinVariant && skinToneId && skinVariant.options) {
         const opt = skinVariant.options.find(o => o.id === skinToneId);
         if (opt?.resource) skinHex = opt.resource;
       }
       if (hairVariant && hairColorId && hairVariant.options) {
         const opt = hairVariant.options.find(o => o.id === hairColorId);
         if (opt?.resource) hairHex = opt.resource;
       }
    }
    return { skinHex, hairHex };
  };

  const { skinHex, hairHex } = getCurrentColors();
  const bgPattern = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans relative">
      
      {/* GLOBAL DEFS for Watercolor Style */}
      <svg width="0" height="0" className="absolute">
         <WatercolorDefs skinHex={skinHex} hairHex={hairHex} />
      </svg>

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
                  const isColorPicker = variant.options.some(o => o.resource && o.resource.startsWith('#'));
                  const hasThumbnails = variant.options.some(o => o.thumbnail || o.resource);
                  const isGrid = variant.options.length > 6 && !isColorPicker;

                  if (variant.type === 'checkbox') {
                    // Checkbox handling (using first option or defaulting if no option exists)
                    const isChecked = !!currentValue;
                    return withDivider(
                        <div className="flex items-center justify-between space-x-3 bg-white p-3 rounded-lg border border-gray-200">
                             <label htmlFor={`checkbox-${variant.id}`} className="font-bold text-gray-700 text-sm cursor-pointer select-none">
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
                            {variant.options.map((opt) => (
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
                             {variant.options.map((opt) => {
                               // Prefer resource (uploaded image) over legacy thumbnail
                               const imageUrl = opt.resource && !opt.resource.startsWith('#') ? opt.resource : opt.thumbnail;
                               
                               return (
                               <button
                                 key={opt.id}
                                 onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                 className={`w-14 h-14 rounded-full transition-all border border-gray-200 overflow-hidden flex items-center justify-center bg-white ${currentValue === opt.id ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                                 title={opt.label}
                               >
                                  {imageUrl ? (
                                     <img src={imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                                  ) : (
                                     <span className="text-sm font-bold text-gray-400">{opt.label[0]}</span>
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
                          {variant.options.map((opt) => (
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

             {/* Book Cover Simulation */}
             <div className="relative w-[60%] aspect-[3/4] shadow-2xl rounded-r-xl overflow-hidden transform rotate-1 bg-white group">
                {/* Background Image */}
                <img src={book.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
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
