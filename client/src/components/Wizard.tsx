import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wand2, Cloud, Check, ChevronRight, ArrowRight } from 'lucide-react';
import { BookConfig, Gender, Theme, HairStyle, Outfit, Activity } from '../types';
import { WizardVariant, WizardOption } from '../types/admin';
import Navigation from './Navigation';
import { useBooks } from '../context/BooksContext';
import previewBackground from '@assets/generated_images/watercolor_paper_background_with_soft_pastel_splash.png';

import Footer from './Footer';

interface WizardProps {
  onComplete: (config: BookConfig) => void;
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
             if (variant.type === 'options' && variant.options.length > 0) {
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
  };

  // Helper to get resource (color/image) for a selection
  const getSelectedResource = (tabId: string, variantId: string) => {
     const selectedId = selections[tabId]?.[variantId];
     if (!selectedId) return null;
     
     const tab = wizardConfig.tabs.find(t => t.id === tabId);
     const variant = tab?.variants.find(v => v.id === variantId);
     const option = variant?.options.find(o => o.id === selectedId);
     return option?.resource;
  };

  const renderCharacterAvatar = (tabId: string) => {
     const skinColor = getSelectedResource(tabId, 'skinTone') || '#FFE0BD';
     const hairColor = getSelectedResource(tabId, 'hairColor') || '#302e34';
     const gender = selections[tabId]?.['gender'];
     
     // Simple avatar SVG composition
     return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
           {/* Body/Outfit */}
           <path d="M20,100 Q50,70 80,100" fill={hairColor} opacity="0.5" />
           <path d="M30,100 L30,80 Q50,70 70,80 L70,100" fill="#60A5FA" /> {/* Generic Outfit Color */}
           
           {/* Neck */}
           <rect x="45" y="65" width="10" height="15" fill={skinColor} />
           
           {/* Head */}
           <circle cx="50" cy="50" r="22" fill={skinColor} />
           
           {/* Hair Base */}
           <path d="M28,50 Q50,20 72,50 Q75,60 72,50 Q50,15 28,50" fill={hairColor} />
           
           {/* Eyes */}
           <circle cx="43" cy="52" r="2" fill="#333" />
           <circle cx="57" cy="52" r="2" fill="#333" />
           
           {/* Smile */}
           <path d="M45,60 Q50,63 55,60" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
           
           {/* Blush */}
           <circle cx="40" cy="58" r="3" fill="#FFAAAA" opacity="0.4" />
           <circle cx="60" cy="58" r="3" fill="#FFAAAA" opacity="0.4" />
        </svg>
     );
  };

  const handleComplete = () => {
    // Map dynamic selections to BookConfig
    // For now, we map "child" tab to legacy fields if possible for compatibility
    const childTab = selections['child'] || {};
    
    const config: BookConfig = {
      childName: childTab['name'] || 'Enfant',
      age: 5, // Default
      gender: childTab['gender'] === 'girl' ? Gender.Girl : Gender.Boy,
      theme: book.theme,
      appearance: {
        hairColor: childTab['hairColor'] || 'Brun',
        eyeColor: 'Marrons', // Default
        skinTone: childTab['skinTone'] || 'Claire',
        hairStyle: childTab['hairStyle'] || 'Court',
        outfit: 'Salopette', // Default
        activity: 'Aucune',
        glasses: childTab['glasses'] !== 'None',
        glassesStyle: childTab['glasses'] === 'None' ? 'None' : childTab['glasses'],
        grayHair: false,
      },
      dedication: '',
      characters: selections // Store full dynamic data here
    };
    
    onComplete(config);
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
       
       if (skinVariant && skinToneId) {
         const opt = skinVariant.options.find(o => o.id === skinToneId);
         if (opt?.resource) skinHex = opt.resource;
       }
       if (hairVariant && hairColorId) {
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
          <div className="w-full lg:w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[600px] lg:h-[700px] sticky top-24">
             
             <div className="p-4 border-b border-gray-100 shrink-0">
                <div className="text-xs font-bold text-brand-coral uppercase tracking-wider mb-1">
                   Personnalisation du livre
                </div>
                <h2 className="text-xl font-display font-black text-cloud-dark leading-tight">
                   {book.name}
                </h2>
             </div>

             {/* TABS */}
             <div className="flex border-b border-gray-200 overflow-x-auto shrink-0">
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
             <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {activeTab && activeTab.variants.map(variant => {
                  const currentValue = selections[activeTabId]?.[variant.id];

                  // --- RENDER: TEXT INPUT ---
                  if (variant.type === 'text') {
                    return (
                      <div key={variant.id} className="space-y-1">
                         <label className="font-bold text-gray-600 text-sm">
                            {variant.label} *
                         </label>
                         <input 
                           type="text" 
                           value={currentValue || ''}
                           onChange={(e) => handleSelectionChange(activeTabId, variant.id, e.target.value)}
                           className="w-full bg-[#FFFBEB] border border-gray-200 rounded-md px-4 py-2 text-cloud-dark focus:border-cloud-dark focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-sm font-medium"
                           placeholder={`Entrez ${variant.label.toLowerCase()}...`}
                           maxLength={variant.maxLength}
                         />
                      </div>
                    );
                  }

                  // --- RENDER: VISUAL OPTIONS (Colors/Icons) ---
                  // Check if options have 'resource' (colors/images) or just labels
                  const isColorPicker = variant.options.some(o => o.resource && o.resource.startsWith('#'));
                  const hasThumbnails = variant.options.some(o => o.thumbnail);
                  const isGrid = variant.options.length > 6 && !isColorPicker;

                  if (isColorPicker) {
                    return (
                      <div key={variant.id} className="space-y-2">
                         <label className="font-bold text-gray-600 text-sm">{variant.label}</label>
                         <div className="flex gap-3 flex-wrap">
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
                     return (
                       <div key={variant.id} className="space-y-2">
                          <label className="font-bold text-gray-600 text-sm">{variant.label}</label>
                          <div className="flex gap-3 flex-wrap">
                             {variant.options.map((opt) => (
                               <button
                                 key={opt.id}
                                 onClick={() => handleSelectionChange(activeTabId, variant.id, opt.id)}
                                 className={`w-14 h-14 rounded-full transition-all border border-gray-200 overflow-hidden flex items-center justify-center bg-white ${currentValue === opt.id ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                                 title={opt.label}
                               >
                                  {opt.thumbnail ? (
                                     <img src={opt.thumbnail} alt={opt.label} className="w-full h-full object-cover" />
                                  ) : (
                                     <span className="text-sm font-bold text-gray-400">{opt.label[0]}</span>
                                  )}
                               </button>
                             ))}
                          </div>
                       </div>
                     );
                  }

                  // Default Button Grid/List
                  return (
                    <div key={variant.id} className="space-y-2">
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
          <div className="hidden lg:flex flex-col gap-6 flex-1 h-[700px] sticky top-24 bg-stone-100 rounded-lg shadow-2xl border-[8px] border-white overflow-hidden relative items-center justify-center p-8">
             
             {/* Avatar Visualization (Above Book) */}
             <div className="flex flex-col items-center animate-drop-in z-20">
                <div className="w-48 h-48 rounded-full bg-white border-[6px] border-white shadow-xl overflow-hidden relative hover:scale-105 transition-transform duration-300">
                   {renderCharacterAvatar('child')}
                </div>
                <div className="mt-4 bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm border border-white/50">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Héros</span>
                   <span className="font-display font-black text-brand-coral text-lg">
                      {selections['child']?.['name'] || 'Votre Enfant'}
                   </span>
                </div>
             </div>

             {/* Book Cover Simulation */}
             <div className="relative w-[60%] aspect-[3/4] shadow-2xl rounded-r-xl overflow-hidden transform rotate-1 hover:rotate-0 transition-duration-500 bg-white group">
                {/* Background Image */}
                <img src={book.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                
                {/* Overlay Title */}
                <div className="absolute top-8 left-0 right-0 text-center px-4 z-20">
                   <h1 className="font-display font-black text-2xl text-cloud-dark drop-shadow-md text-white mix-blend-overlay opacity-90 leading-tight">
                      {book.name}
                   </h1>
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
