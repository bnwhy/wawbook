import React, { useState } from 'react';
import { ArrowLeft, Wand2, Cloud, Glasses, User, Users, Check } from 'lucide-react';
import { BookConfig, Gender, Theme, HairStyle, Outfit, Activity } from '../types';
import Navigation from './Navigation';
import previewBackground from '@assets/generated_images/watercolor_paper_background_with_soft_pastel_splash.png';

interface WizardProps {
  onComplete: (config: BookConfig) => void;
  onCancel: () => void;
  initialTheme?: Theme;
  initialActivity?: Activity;
}

// --- CONSTANTS ---
const COLORS_HAIR = [
  { label: 'Blond', value: 'Blond', hex: '#f7e48c' },
  { label: 'Blond foncé', value: 'BlondFonce', hex: '#ba9a0d' },
  { label: 'Châtain', value: 'Chatain', hex: '#a76635' },
  { label: 'Noir', value: 'Noir', hex: '#302e34' },
  { label: 'Roux', value: 'Roux', hex: '#ef6c2a' },
  { label: 'Gris', value: 'Gris', hex: '#b9b9bd' },
  { label: 'Blanc', value: 'Blanc', hex: '#fefefe' },
];

const COLORS_SKIN = [
  { label: 'Claire', value: 'Claire', hex: '#f6d6c8' },
  { label: 'Beige', value: 'Beige', hex: '#f9cca4' },
  { label: 'Muscade', value: 'Muscade', hex: '#edb17f' },
  { label: 'Marron', value: 'Marron', hex: '#d19f79' },
  { label: 'Marron foncé', value: 'MarronFonce', hex: '#ae836c' },
  { label: 'Noir', value: 'Noir', hex: '#6a4730' },
];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'Court', label: 'Court' },
  { id: 'Hérissé', label: 'Hérissé' },
  { id: 'Carré', label: 'Carré' },
  { id: 'Long', label: 'Long' },
  { id: 'Chignon', label: 'Chignon' },
  { id: 'Nattes', label: 'Nattes' } as any,
  { id: 'Bouclé', label: 'Bouclé' } as any,
  { id: 'QueueCheval', label: 'Queue' } as any,
];

const BEARDS = [
  { id: 'None', label: 'Aucune' },
  { id: 'Moustache', label: 'Moustache' },
  { id: 'Goatee', label: 'Bouc' },
  { id: 'Short', label: 'Courte' },
  { id: 'Full', label: 'Fournie' },
];

const OUTFITS: { id: Outfit; label: string }[] = [
  { id: 'Salopette', label: 'Salopette' },
  { id: 'TShirt', label: 'T-Shirt' },
  { id: 'Robe', label: 'Robe' },
  { id: 'Chemise', label: 'Chemise' },
  { id: 'Sweat', label: 'Sweat' } as any,
  { id: 'Sport', label: 'Sport' } as any,
  { id: 'Pyjama', label: 'Pyjama' } as any,
];

// --- WATERCOLOR SVG COMPONENTS ---

// Reusable defs for filter and gradients (to be placed once)
const WatercolorDefs = ({ skinHex, hairHex }: { skinHex: string, hairHex: string }) => (
  <defs>
    {/* Watercolor Filter */}
    <filter id="watercolor">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      <feGaussianBlur in="displaced" stdDeviation="0.5" result="blurred" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" in="blurred" result="goo" />
      <feComposite operator="in" in="SourceGraphic" in2="goo" result="composite" />
      <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
    </filter>

    {/* Gradients for more depth */}
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

const HairstyleThumbnail = ({ style }: { style: HairStyle }) => (
  <svg viewBox="10 10 180 180" className="w-full h-full">
    <g filter="url(#watercolor)">
       {/* Head Base for context */}
       <g transform="translate(50, 40)">
          <path d="M10 40 Q 10 95 50 95 Q 90 95 90 40 Q 90 10 50 10 Q 10 10 10 40 Z" fill="url(#skinGradient)" opacity="0.5" />
       </g>

       {/* BACK HAIR */}
       <g transform="translate(50, 40)">
          {style === 'Long' && <path d="M0 50 Q-15 130 10 150 L90 150 Q115 130 100 50 Z" fill="url(#hairGradient)" />}
          {style === 'Carré' && <path d="M-5 50 L-5 110 Q5 115 20 110 L20 50 M105 50 L105 110 Q95 115 80 110 L80 50" stroke="url(#hairGradient)" strokeWidth="28" fill="none" strokeLinecap="round" />}
          {(style as any) === 'Nattes' && <g><path d="M5 60 Q-15 100 10 120" stroke="url(#hairGradient)" strokeWidth="20" fill="none" strokeLinecap="round" /><path d="M95 60 Q115 100 90 120" stroke="url(#hairGradient)" strokeWidth="20" fill="none" strokeLinecap="round" /></g>}
          {(style as any) === 'Bouclé' && <g><circle cx="-5" cy="70" r="18" fill="url(#hairGradient)" /><circle cx="5" cy="90" r="18" fill="url(#hairGradient)" /><circle cx="105" cy="70" r="18" fill="url(#hairGradient)" /><circle cx="95" cy="90" r="18" fill="url(#hairGradient)" /></g>}
          {(style as any) === 'QueueCheval' && <g><path d="M90 40 Q135 60 120 140" stroke="url(#hairGradient)" strokeWidth="24" fill="none" strokeLinecap="round" /></g>}
       </g>

       {/* FRONT HAIR */}
       <g transform="translate(50, 40)">
          {style === 'Court' && <path d="M10 40 Q50 15 90 40" fill="none" stroke="url(#hairGradient)" strokeWidth="12" strokeLinecap="round" />}
          {style === 'Hérissé' && <path d="M10 35 L20 15 L35 30 L50 10 L65 30 L80 15 L90 35" fill="url(#hairGradient)" stroke="url(#hairGradient)" strokeWidth="2" strokeLinejoin="round" />}
          {['Carré', 'Long', 'Chignon', 'Nattes', 'Bouclé', 'QueueCheval'].includes(style) && <path d="M8 40 Q30 55 50 35 Q70 55 92 40 Q90 5 50 5 Q10 5 8 40" fill="url(#hairGradient)" />}
       </g>
    </g>
  </svg>
);

const BeardThumbnail = ({ style }: { style: string }) => (
  <svg viewBox="20 40 160 160" className="w-full h-full">
     <g filter="url(#watercolor)">
        {/* Head Base for context */}
        <g transform="translate(50, 40)">
           <path d="M10 40 Q 10 95 50 95 Q 90 95 90 40 Q 90 10 50 10 Q 10 10 10 40 Z" fill="url(#skinGradient)" opacity="0.5" />
           
           {/* Mouth for context */}
           <path d="M40 72 Q50 78 60 72" stroke="#A1887F" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />

           {/* BEARD */}
           <g opacity="0.9">
              {style === 'Moustache' && <path d="M35 68 Q50 58 65 68" stroke="url(#hairGradient)" strokeWidth="6" fill="none" strokeLinecap="round" />}
              {style === 'Goatee' && <path d="M45 78 Q50 83 55 78 L55 72 H45 Z" fill="url(#hairGradient)" />}
              {style === 'Short' && <path d="M20 60 Q50 100 80 60 L80 70 Q50 110 20 70 Z" fill="url(#hairGradient)" opacity="0.6" />}
              {style === 'Full' && <path d="M12 50 Q50 115 88 50 L88 65 Q50 130 12 65 Z" fill="url(#hairGradient)" />}
           </g>
        </g>
     </g>
  </svg>
);

const OutfitThumbnail = ({ style }: { style: Outfit }) => (
  <svg viewBox="0 100 200 140" className="w-full h-full">
     <g filter="url(#watercolor)">
        <g transform="translate(50, 130)">
            {/* Outfit Base */}
            <g>
                {style === 'Salopette' && <g><path d="M10 0 L90 0 L92 90 L8 90 Z" fill="#93C5FD" /><path d="M18 20 L82 20 L88 110 L12 110 Z" fill="#3B82F6" opacity="0.9" /></g>}
                {style === 'TShirt' && <path d="M15 0 L85 0 L92 100 L8 100 Z" fill="#FDE68A" />}
                {style === 'Robe' && <path d="M25 0 L75 0 L105 110 L-5 110 Z" fill="#A5B4FC" />}
                {style === 'Chemise' && <path d="M15 0 L85 0 L88 100 L12 100 Z" fill="#FDA4AF" />}
                {(style as any) === 'Sweat' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#C4B5FD" />}
                {(style as any) === 'Sport' && <path d="M20 0 L80 0 L85 100 L15 100 Z" fill="#6EE7B7" />}
                {(style as any) === 'Pyjama' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#BAE6FD" />}
            </g>
            {/* Texture Overlay */}
            <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#fff" fillOpacity="0.1" style={{ mixBlendMode: 'overlay' }} pointerEvents="none" />
        </g>
     </g>
  </svg>
);

const Wizard: React.FC<WizardProps> = ({ onComplete, onCancel, initialTheme, initialActivity }) => {
  const [config, setConfig] = useState<BookConfig>({
    childName: '',
    age: 5,
    gender: Gender.Boy,
    theme: initialTheme || Theme.Adventure,
    appearance: {
      hairColor: 'Brun',
      eyeColor: 'Marrons',
      skinTone: 'Claire',
      hairStyle: 'Court',
      outfit: 'Salopette',
      activity: initialActivity || 'Aucune',
      glasses: false,
      glassesStyle: 'None',
      beard: 'None',
      grayHair: false,
      hearingAid: 'None',
      distinctiveFeatures: '',
    },
    dedication: ''
  });

  const [activeTab, setActiveTab] = useState<'child' | 'parent'>('parent'); // Default to Parent to match screenshot

  const getSkinHex = () => COLORS_SKIN.find(c => c.value === config.appearance.skinTone)?.hex || '#FFE0BD';
  const getHairHex = () => config.appearance.grayHair ? '#b9b9bd' : (COLORS_HAIR.find(c => c.value === config.appearance.hairColor)?.hex || '#302e34');
  
  // --- BACKGROUND PATTERN ---
  // A CSS pattern approximating the leaves/geometric shapes
  const bgPattern = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="h-screen bg-stone-50 flex flex-col font-sans relative overflow-hidden">
      
      {/* GLOBAL DEFS for Watercolor Style */}
      <svg width="0" height="0" className="absolute">
         <WatercolorDefs skinHex={getSkinHex()} hairHex={getHairHex()} />
      </svg>

      {/* NAVIGATION (Integrated) */}
      <Navigation onStart={() => {}} />

      {/* WIZARD CONTENT */}
      <div className="flex-1 flex items-start justify-center p-4 pt-20 md:p-8 md:pt-24 relative overflow-hidden w-full" style={{ backgroundImage: bgPattern }}>
        
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start h-full">
          
          {/* --- LEFT COLUMN: CONFIGURATION --- */}
          <div className="w-full lg:w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col lg:h-[calc(100%-2rem)]">
             
             <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-display font-black text-cloud-dark">Créez vos personnages principaux</h2>
             </div>

             {/* TABS */}
             <div className="flex border-b border-gray-200">
                <button 
                   onClick={() => setActiveTab('parent')}
                   className={`flex-1 py-3 font-bold text-sm tracking-wider transition-colors relative ${activeTab === 'parent' ? 'bg-white text-cloud-dark' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                   <span className={activeTab === 'parent' ? "border-b-2 border-cloud-dark pb-3 block w-full" : "pb-3 block w-full"}>Papi/Mamie</span>
                </button>
                <button 
                   onClick={() => setActiveTab('child')}
                   className={`flex-1 py-3 font-bold text-sm tracking-wider transition-colors relative ${activeTab === 'child' ? 'bg-white text-cloud-dark' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                   <span className={activeTab === 'child' ? "border-b-2 border-cloud-dark pb-3 block w-full" : "pb-3 block w-full"}>Enfant</span>
                </button>
             </div>

             {/* FORM CONTENT */}
             <div className="p-4 space-y-4 overflow-y-auto flex-1">
                
                {/* 1. NAME */}
                <div className="space-y-1">
                   <label className="font-bold text-gray-600 text-sm">
                      {activeTab === 'parent' ? "Comment votre enfant appelle-t-il son grand-parent ? *" : "Comment s'appelle l'enfant ? *"}
                   </label>
                   <input 
                     type="text" 
                     value={config.childName}
                     onChange={(e) => setConfig({...config, childName: e.target.value})}
                     className="w-full bg-[#FFFBEB] border border-gray-200 rounded-md px-4 py-2 text-cloud-dark focus:border-cloud-dark focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-sm font-medium"
                     placeholder={activeTab === 'parent' ? "Par exemple : Grand-père, Grand-mère" : "Par exemple : Léo"}
                   />
                </div>

                {/* 1.5 GENDER */}
                <div className="flex gap-8 py-2 px-1">
                    <button 
                      onClick={() => setConfig({...config, gender: Gender.Boy})}
                      className="flex items-center gap-3 group"
                    >
                       <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${config.gender === Gender.Boy ? 'border-[#8DD0C3] bg-[#E8F5F2]' : 'border-gray-200 bg-white group-hover:border-gray-300'}`}>
                          <svg viewBox="0 0 100 100" className="w-8 h-8">
                             {/* Male Head Outline */}
                             <path d="M20 40 Q50 10 80 40" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             <path d="M20 40 Q20 75 50 85 Q80 75 80 40" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             {/* Ears */}
                             <path d="M18 45 Q12 50 18 55" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             <path d="M82 45 Q88 50 82 55" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                          </svg>
                       </div>
                       <span className={`font-bold text-sm ${config.gender === Gender.Boy ? 'text-gray-800' : 'text-gray-500'}`}>Homme</span>
                    </button>
                    
                    <button 
                      onClick={() => setConfig({...config, gender: Gender.Girl})}
                      className="flex items-center gap-3 group"
                    >
                       <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${config.gender === Gender.Girl ? 'border-[#8DD0C3] bg-[#E8F5F2]' : 'border-gray-200 bg-white group-hover:border-gray-300'}`}>
                          <svg viewBox="0 0 100 100" className="w-8 h-8">
                             {/* Female Head Outline */}
                             <path d="M20 35 Q50 5 80 35" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             <path d="M20 35 Q20 75 50 85 Q80 75 80 35" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             {/* Hair Long */}
                             <path d="M20 35 Q10 50 15 80" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                             <path d="M80 35 Q90 50 85 80" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
                          </svg>
                       </div>
                       <span className={`font-bold text-sm ${config.gender === Gender.Girl ? 'text-gray-800' : 'text-gray-500'}`}>Femme</span>
                    </button>
                </div>

                {/* 2. SKIN COLOR */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                   <label className="font-bold text-gray-600 text-sm min-w-[140px]">
                      Couleur de la peau
                   </label>
                   <div className="flex gap-3 flex-wrap justify-end">
                        {COLORS_SKIN.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, skinTone: c.value}})}
                            className={`w-8 h-8 rounded-full transition-all border border-gray-200 ${config.appearance.skinTone === c.value ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                    </div>
                </div>

                {/* 3. HAIR COLOR */}
                <div className="flex items-center justify-between py-2">
                    <label className="font-bold text-gray-600 text-sm min-w-[140px]">
                       Couleur des cheveux
                    </label>
                    <div className="flex gap-3 flex-wrap justify-end">
                        {COLORS_HAIR.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, hairColor: c.value}})}
                            className={`w-8 h-8 rounded-full transition-all border border-gray-200 ${config.appearance.hairColor === c.value ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] scale-110 ring-offset-2' : 'hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                    </div>
                </div>

                {/* 3.5 GRAY HAIR TOGGLE */}
                <div className="flex items-center justify-between border-b border-gray-100 py-3">
                    <div className="flex items-center gap-2">
                       <label className="font-bold text-gray-600 text-sm cursor-pointer" onClick={() => setConfig({...config, appearance: {...config.appearance, grayHair: !config.appearance.grayHair}})}>Teinte grise des cheveux</label>
                       <div className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] flex items-center justify-center cursor-help font-serif italic" title="Ajoute une teinte grise aux cheveux">i</div>
                    </div>
                    <button 
                      onClick={() => setConfig({...config, appearance: {...config.appearance, grayHair: !config.appearance.grayHair}})}
                      className={`w-6 h-6 rounded border transition-colors flex items-center justify-center ${config.appearance.grayHair ? 'bg-[#8DD0C3] border-[#8DD0C3] text-white' : 'bg-white border-gray-300 text-transparent hover:border-gray-400'}`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                </div>

                {/* 4. HAIRSTYLE (Watercolor Grid) */}
                <div className="space-y-2 pt-2">
                    <label className="font-bold text-gray-600 text-sm">Coiffure</label>
                    <div className="grid grid-cols-5 gap-2">
                        {HAIR_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, hairStyle: style.id}})}
                            className={`aspect-square rounded-full border-2 transition-all overflow-hidden ${config.appearance.hairStyle === style.id ? 'border-[#8DD0C3] bg-[#E8F5F2] ring-2 ring-[#E8F5F2] ring-offset-1' : 'border-transparent hover:border-gray-200'}`}
                          >
                             <div className="w-full h-full p-1">
                                <HairstyleThumbnail style={style.id} />
                             </div>
                          </button>
                        ))}
                    </div>
                </div>

                {/* 6. OUTFIT (Watercolor Circles) */}
                <div className="space-y-2 border-t border-gray-100 pt-2 mt-2">
                    <label className="font-bold text-gray-600 text-sm">Vêtements</label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {OUTFITS.map((outfit) => (
                          <button
                            key={outfit.id}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, outfit: outfit.id}})}
                            className={`w-12 h-12 flex-shrink-0 rounded-full border-2 transition-all overflow-hidden relative group ${config.appearance.outfit === outfit.id ? 'border-[#8DD0C3] bg-[#E8F5F2] ring-2 ring-[#E8F5F2] ring-offset-1' : 'border-transparent hover:border-gray-200'}`}
                            title={outfit.label}
                          >
                             <div className="w-full h-full">
                                <OutfitThumbnail style={outfit.id} />
                             </div>
                          </button>
                        ))}
                    </div>
                </div>

                {/* 6.5 HEARING AID */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                    <label className="font-bold text-gray-600 text-sm">Aide auditive</label>
                    <div className="flex gap-3">
                       {['None', 'Beige', 'Black', 'Blue', 'Green'].map((color) => (
                          <button 
                            key={color}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, hearingAid: color as any}})}
                            className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${config.appearance.hearingAid === color ? 'border-[#8DD0C3] ring-2 ring-[#E8F5F2] ring-offset-1' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color === 'None' ? '#fff' : color === 'Beige' ? '#e5e7eb' : color.toLowerCase() }}
                          >
                             {color === 'None' && (
                               <div className="w-full h-full rounded-full border border-gray-300 flex items-center justify-center relative opacity-50">
                                 <div className="absolute w-full h-0.5 bg-gray-300 rotate-45"></div>
                               </div>
                             )}
                          </button>
                       ))}
                    </div>
                </div>

                {/* 7. GLASSES */}
                <div className="flex items-center justify-between pt-4">
                    <label className="font-bold text-gray-600 text-sm">Lunettes</label>
                    <div className="flex gap-3">
                       {['None', 'Round', 'Square'].map((style) => (
                          <button 
                            key={style}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, glasses: style !== 'None', glassesStyle: style as any}})}
                            className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center ${config.appearance.glassesStyle === style ? 'bg-[#E8F5F2] border-[#8DD0C3]' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                          >
                             {style === 'None' && (
                               <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center relative opacity-50">
                                  <div className="absolute w-full h-0.5 bg-gray-300 rotate-45"></div>
                               </div>
                             )}
                             {style === 'Round' && <div className="flex gap-0.5"><div className="w-3 h-3 rounded-full border-2 border-gray-600"></div><div className="w-3 h-3 rounded-full border-2 border-gray-600"></div></div>}
                             {style === 'Square' && <div className="flex gap-0.5"><div className="w-3 h-3 border-2 border-gray-600 rounded-sm"></div><div className="w-3 h-3 border-2 border-gray-600 rounded-sm"></div></div>}
                          </button>
                       ))}
                    </div>
                </div>

                <div className="text-xs text-center text-gray-400 pt-4">
                   Veuillez créer les deux personnages avant de poursuivre
                </div>

                {/* 8. LANGUAGE */}
                <div className="pt-4 mt-4 border-t border-gray-100">
                   <label className="font-bold text-gray-600 text-sm block mb-2">Langue du livre *</label>
                   <select className="w-full bg-white border border-gray-200 rounded-md px-4 py-2 text-cloud-dark font-medium outline-none focus:border-cloud-dark text-sm">
                      <option>Français</option>
                      <option>English</option>
                      <option>Español</option>
                      <option>Deutsch</option>
                   </select>
                </div>

             </div>
          </div>

          {/* --- RIGHT COLUMN: PREVIEW --- */}
          <div className="flex-1 flex flex-col items-center lg:items-start pt-8 lg:pt-0">
             
             {/* CIRCULAR PREVIEW */}
             <div className="relative z-10 mb-8 self-center">
                 <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-white rounded-full shadow-2xl border-8 border-white overflow-hidden flex items-center justify-center relative">
                    
                    {/* Watercolor Background Image */}
                    <img 
                      src={previewBackground} 
                      alt="Background" 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    
                    {/* Paper texture overlay (Multiplied) */}
                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none z-20 mix-blend-multiply"></div>
                    
                    {/* --- ENHANCED SVG AVATAR (Watercolor Style) --- */}
                    <svg viewBox="0 0 200 240" className="w-full h-full transform translate-y-8 scale-110 relative z-10">
                        <g filter="url(#watercolor)">
                            {/* SHADOW */}
                            <ellipse cx="50" cy="140" rx="35" ry="12" fill="#000" fillOpacity="0.1" transform="translate(50, 0)" filter="url(#blur)" />

                            {/* BACK HAIR (Behind head) */}
                            <g transform="translate(50, 40)">
                              {config.appearance.hairStyle === 'Long' && <path d="M0 50 Q-15 130 10 150 L90 150 Q115 130 100 50 Z" fill="url(#hairGradient)" />}
                              {config.appearance.hairStyle === 'Carré' && <path d="M-5 50 L-5 110 Q5 115 20 110 L20 50 M105 50 L105 110 Q95 115 80 110 L80 50" stroke="url(#hairGradient)" strokeWidth="28" fill="none" strokeLinecap="round" />}
                              {(config.appearance.hairStyle as any) === 'Nattes' && <g><path d="M5 60 Q-15 100 10 120" stroke="url(#hairGradient)" strokeWidth="20" fill="none" strokeLinecap="round" /><path d="M95 60 Q115 100 90 120" stroke="url(#hairGradient)" strokeWidth="20" fill="none" strokeLinecap="round" /></g>}
                              {(config.appearance.hairStyle as any) === 'Bouclé' && <g><circle cx="-5" cy="70" r="18" fill="url(#hairGradient)" /><circle cx="5" cy="90" r="18" fill="url(#hairGradient)" /><circle cx="105" cy="70" r="18" fill="url(#hairGradient)" /><circle cx="95" cy="90" r="18" fill="url(#hairGradient)" /></g>}
                              {(config.appearance.hairStyle as any) === 'QueueCheval' && <g><path d="M90 40 Q135 60 120 140" stroke="url(#hairGradient)" strokeWidth="24" fill="none" strokeLinecap="round" /></g>}
                            </g>

                            {/* BODY */}
                            <g transform="translate(50, 130)">
                              {/* Neck */}
                              <rect x="38" y="-30" width="24" height="40" fill="url(#skinGradient)" />
                              
                              {/* Arms */}
                              <path d="M22 5 Q5 50 15 70" stroke="url(#skinGradient)" strokeWidth="20" fill="none" strokeLinecap="round" />
                              <path d="M78 5 Q95 50 85 70" stroke="url(#skinGradient)" strokeWidth="20" fill="none" strokeLinecap="round" />
                              
                              {/* Outfit Base */}
                              <g>
                                  {config.appearance.outfit === 'Salopette' && <g><path d="M10 0 L90 0 L92 90 L8 90 Z" fill="#93C5FD" /><path d="M18 20 L82 20 L88 110 L12 110 Z" fill="#3B82F6" opacity="0.9" /></g>}
                                  {config.appearance.outfit === 'TShirt' && <path d="M15 0 L85 0 L92 100 L8 100 Z" fill="#FDE68A" />}
                                  {config.appearance.outfit === 'Robe' && <path d="M25 0 L75 0 L105 110 L-5 110 Z" fill="#A5B4FC" />}
                                  {config.appearance.outfit === 'Chemise' && <path d="M15 0 L85 0 L88 100 L12 100 Z" fill="#FDA4AF" />}
                                  {(config.appearance.outfit as any) === 'Sweat' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#C4B5FD" />}
                                  {(config.appearance.outfit as any) === 'Sport' && <path d="M20 0 L80 0 L85 100 L15 100 Z" fill="#6EE7B7" />}
                                  {(config.appearance.outfit as any) === 'Pyjama' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#BAE6FD" />}
                              </g>
                              
                              {/* Texture/Pattern Overlay for Clothes */}
                              <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#fff" fillOpacity="0.1" style={{ mixBlendMode: 'overlay' }} pointerEvents="none" />
                            </g>

                            {/* HEAD */}
                            <g transform="translate(50, 40)">
                              {/* Face Shape */}
                              <path d="M10 40 Q 10 95 50 95 Q 90 95 90 40 Q 90 10 50 10 Q 10 10 10 40 Z" fill="url(#skinGradient)" />
                              
                              {/* Ears */}
                              <path d="M8 45 Q -4 50 8 60" fill="url(#skinGradient)" />
                              <path d="M92 45 Q 104 50 92 60" fill="url(#skinGradient)" />
                              
                              {/* Face Features */}
                              <g>
                                {/* Eyes */}
                                <ellipse cx="32" cy="50" rx="5" ry="7" fill="#3E2723" />
                                <circle cx="34" cy="48" r="2" fill="white" opacity="0.9" />
                                
                                <ellipse cx="68" cy="50" rx="5" ry="7" fill="#3E2723" />
                                <circle cx="70" cy="48" r="2" fill="white" opacity="0.9" />
                                
                                {/* Eyebrows (Watercolor stroke style) */}
                                <path d="M26 38 Q34 34 40 38" stroke={getHairHex()} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
                                <path d="M60 38 Q66 34 74 38" stroke={getHairHex()} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
                                
                                {/* Nose */}
                                <path d="M46 60 Q50 65 54 60" stroke="#D7CCC8" strokeWidth="3" strokeLinecap="round" fill="none" />
                                
                                {/* Mouth */}
                                <path d="M40 72 Q50 78 60 72" stroke="#A1887F" strokeWidth="3" strokeLinecap="round" fill="none" />
                                
                                {/* Cheeks (Soft blush) */}
                                <circle cx="22" cy="65" r="8" fill="#FF8A80" fillOpacity="0.2" />
                                <circle cx="78" cy="65" r="8" fill="#FF8A80" fillOpacity="0.2" />
                              </g>

                              {/* FRONT HAIR */}
                              <g>
                                 {config.appearance.hairStyle === 'Court' && <path d="M10 40 Q50 15 90 40" fill="none" stroke="url(#hairGradient)" strokeWidth="12" strokeLinecap="round" />}
                                 {config.appearance.hairStyle === 'Hérissé' && <path d="M10 35 L20 15 L35 30 L50 10 L65 30 L80 15 L90 35" fill="url(#hairGradient)" stroke="url(#hairGradient)" strokeWidth="2" strokeLinejoin="round" />}
                                 {['Carré', 'Long', 'Chignon', 'Nattes', 'Bouclé', 'QueueCheval'].includes(config.appearance.hairStyle) && <path d="M8 40 Q30 55 50 35 Q70 55 92 40 Q90 5 50 5 Q10 5 8 40" fill="url(#hairGradient)" />}
                              </g>

                              {/* BEARD RENDERING */}
                              {config.appearance.beard && config.appearance.beard !== 'None' && activeTab === 'parent' && (
                                <g opacity="0.9">
                                   {config.appearance.beard === 'Moustache' && <path d="M35 68 Q50 58 65 68" stroke="url(#hairGradient)" strokeWidth="6" fill="none" strokeLinecap="round" />}
                                   {config.appearance.beard === 'Goatee' && <path d="M45 78 Q50 83 55 78 L55 72 H45 Z" fill="url(#hairGradient)" />}
                                   {config.appearance.beard === 'Short' && <path d="M20 60 Q50 100 80 60 L80 70 Q50 110 20 70 Z" fill="url(#hairGradient)" opacity="0.6" />}
                                   {config.appearance.beard === 'Full' && <path d="M12 50 Q50 115 88 50 L88 65 Q50 130 12 65 Z" fill="url(#hairGradient)" />}
                                </g>
                              )}

                              {/* GLASSES */}
                              {config.appearance.glasses && (
                                <g stroke="#333" strokeWidth="2" fill="none" opacity="0.8">
                                  {config.appearance.glassesStyle === 'Round' ? (
                                    <>
                                      <circle cx="32" cy="50" r="12" fill="#fff" fillOpacity="0.1" />
                                      <circle cx="68" cy="50" r="12" fill="#fff" fillOpacity="0.1" />
                                      <line x1="44" y1="50" x2="56" y2="50" />
                                    </>
                                  ) : (
                                    <>
                                      {/* Square glasses */}
                                      <rect x="20" y="40" width="24" height="20" rx="4" fill="#fff" fillOpacity="0.1" />
                                      <rect x="56" y="40" width="24" height="20" rx="4" fill="#fff" fillOpacity="0.1" />
                                      <line x1="44" y1="50" x2="56" y2="50" />
                                    </>
                                  )}
                                </g>
                              )}
                              
                              {/* HEARING AID */}
                              {config.appearance.hearingAid && config.appearance.hearingAid !== 'None' && (
                                <g>
                                   {/* Simple hearing aid shape behind ear */}
                                   <path d="M95 45 Q 108 45 108 65 Q 108 75 100 80" stroke={config.appearance.hearingAid === 'Beige' ? '#e5e7eb' : config.appearance.hearingAid?.toLowerCase()} strokeWidth="4" fill="none" />
                                </g>
                              )}
                            </g>
                        </g>
                    </svg>
                 </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Wizard;
