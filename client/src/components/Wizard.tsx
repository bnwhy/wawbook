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
  { label: 'Blond', value: 'Blond', hex: '#F0E68C' },
  { label: 'Roux', value: 'Roux', hex: '#C2571A' },
  { label: 'Châtain', value: 'Châtain', hex: '#8D6E63' },
  { label: 'Brun', value: 'Brun', hex: '#5D4037' },
  { label: 'Noir', value: 'Noir', hex: '#212121' },
];

const COLORS_SKIN = [
  { label: 'Claire', value: 'Claire', hex: '#FFE0BD' },
  { label: 'Beige', value: 'Beige', hex: '#EAC086' },
  { label: 'Matte', value: 'Matte', hex: '#D1A376' },
  { label: 'Foncée', value: 'Foncée', hex: '#8D5524' },
  { label: 'Noire', value: 'Noire', hex: '#523422' },
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

// --- LINE DRAWING ICONS ---
const HairstyleLineIcon = ({ style }: { style: HairStyle }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current stroke-[3] stroke-linecap-round stroke-linejoin-round">
    <circle cx="50" cy="50" r="35" strokeWidth="2" className="text-gray-300" /> {/* Face outline placeholder */}
    {style === 'Court' && <path d="M25 40 Q50 10 75 40" />}
    {style === 'Hérissé' && <path d="M25 40 L35 20 L45 35 L50 15 L55 35 L65 20 L75 40" />}
    {style === 'Carré' && <path d="M20 40 Q20 20 50 20 Q80 20 80 40 L80 70 L20 70 Z" />}
    {style === 'Long' && <path d="M20 40 Q20 10 50 10 Q80 10 80 40 L85 80 L15 80 L20 40 Z" />}
    {style === 'Chignon' && <g><circle cx="50" cy="20" r="12" /><path d="M25 40 Q50 20 75 40" /></g>}
    {(style as any) === 'Nattes' && <g><path d="M20 40 L10 70 M80 40 L90 70" /><path d="M25 40 Q50 15 75 40" /></g>}
    {(style as any) === 'Bouclé' && <g><circle cx="30" cy="30" r="8" /><circle cx="50" cy="25" r="10" /><circle cx="70" cy="30" r="8" /></g>}
    {(style as any) === 'QueueCheval' && <g><circle cx="80" cy="30" r="8" /><path d="M25 40 Q50 15 75 40" /></g>}
  </svg>
);

const BeardLineIcon = ({ style }: { style: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current stroke-[3] stroke-linecap-round stroke-linejoin-round">
    <circle cx="50" cy="50" r="35" strokeWidth="2" className="text-gray-300" /> {/* Face outline */}
    {style === 'Moustache' && <path d="M35 60 Q50 50 65 60" />}
    {style === 'Goatee' && <path d="M45 75 Q50 80 55 75 L55 70 H45 Z" />}
    {style === 'Short' && <path d="M30 55 Q50 90 70 55" />}
    {style === 'Full' && <path d="M25 50 Q50 100 75 50" strokeWidth="5" />}
    {style === 'None' && <line x1="30" y1="70" x2="70" y2="70" stroke="transparent" />} {/* Invisible spacer */}
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
      beard: 'None',
      distinctiveFeatures: '',
    },
    dedication: ''
  });

  const [activeTab, setActiveTab] = useState<'child' | 'parent'>('parent'); // Default to Parent to match screenshot

  const getSkinHex = () => COLORS_SKIN.find(c => c.value === config.appearance.skinTone)?.hex || '#FFE0BD';
  const getHairHex = () => COLORS_HAIR.find(c => c.value === config.appearance.hairColor)?.hex || '#5D4037';
  
  // --- BACKGROUND PATTERN ---
  // A CSS pattern approximating the leaves/geometric shapes
  const bgPattern = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* NAVIGATION (Integrated) */}
      <Navigation onStart={() => {}} />

      {/* WIZARD CONTENT */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8 pt-28 md:pt-32 relative" style={{ backgroundImage: bgPattern }}>
        
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start">
          
          {/* --- LEFT COLUMN: CONFIGURATION --- */}
          <div className="w-full lg:w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col">
             
             <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-display font-black text-cloud-dark">Créez vos personnages principaux</h2>
             </div>

             {/* TABS */}
             <div className="flex border-b border-gray-200">
                <button 
                   onClick={() => setActiveTab('parent')}
                   className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === 'parent' ? 'bg-white text-cloud-dark border-b-2 border-cloud-dark' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                   Père
                </button>
                <button 
                   onClick={() => setActiveTab('child')}
                   className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === 'child' ? 'bg-white text-cloud-dark border-b-2 border-cloud-dark' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                   Enfant
                </button>
             </div>

             {/* FORM CONTENT */}
             <div className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
                
                {/* 1. NAME */}
                <div className="space-y-2">
                   <label className="font-bold text-gray-600 text-sm">
                      {activeTab === 'parent' ? "Comment votre enfant appelle-t-il son père ? *" : "Comment s'appelle l'enfant ? *"}
                   </label>
                   <input 
                     type="text" 
                     value={config.childName}
                     onChange={(e) => setConfig({...config, childName: e.target.value})}
                     className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-cloud-dark focus:border-cloud-dark focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-sm"
                     placeholder={activeTab === 'parent' ? "Par exemple : papa, papa" : "Par exemple : Léo"}
                   />
                </div>

                {/* 2. SKIN COLOR */}
                <div className="space-y-2">
                   <label className="font-bold text-gray-600 text-sm">
                      Couleur de la peau
                   </label>
                   <div className="flex gap-3 flex-wrap">
                        {COLORS_SKIN.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, skinTone: c.value}})}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${config.appearance.skinTone === c.value ? 'border-cloud-dark scale-110 ring-1 ring-white' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                    </div>
                </div>

                {/* 3. HAIR COLOR */}
                <div className="space-y-2">
                    <label className="font-bold text-gray-600 text-sm">
                       Couleur des cheveux
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {COLORS_HAIR.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, hairColor: c.value}})}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${config.appearance.hairColor === c.value ? 'border-cloud-dark scale-110 ring-1 ring-white' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                    </div>
                </div>

                {/* 4. HAIRSTYLE (Grid of Line Icons) */}
                <div className="space-y-2">
                    <label className="font-bold text-gray-600 text-sm">Coiffure</label>
                    <div className="grid grid-cols-5 gap-2">
                        {HAIR_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, hairStyle: style.id}})}
                            className={`aspect-square rounded-full border transition-all flex items-center justify-center p-1 ${config.appearance.hairStyle === style.id ? 'border-cloud-dark bg-[#D4E157] text-cloud-dark' : 'border-gray-300 text-gray-400 hover:border-gray-400'}`}
                          >
                             <div className="w-full h-full">
                                <HairstyleLineIcon style={style.id} />
                             </div>
                          </button>
                        ))}
                    </div>
                </div>

                {/* 5. BEARD (Parent Only) */}
                {activeTab === 'parent' && (
                  <div className="space-y-2">
                      <label className="font-bold text-gray-600 text-sm">Barbe</label>
                      <div className="grid grid-cols-5 gap-2">
                          {BEARDS.map((beard) => (
                            <button
                              key={beard.id}
                              onClick={() => setConfig({...config, appearance: {...config.appearance, beard: beard.id}})}
                              className={`aspect-square rounded-full border transition-all flex items-center justify-center p-1 ${config.appearance.beard === beard.id ? 'border-cloud-dark bg-[#D4E157] text-cloud-dark' : 'border-gray-300 text-gray-400 hover:border-gray-400'}`}
                            >
                               <div className="w-full h-full">
                                  <BeardLineIcon style={beard.id} />
                               </div>
                            </button>
                          ))}
                      </div>
                  </div>
                )}

                {/* 6. OUTFIT (Simplified Circles) */}
                <div className="space-y-2">
                    <label className="font-bold text-gray-600 text-sm">Vêtements</label>
                    <div className="flex gap-3 flex-wrap">
                        {OUTFITS.map((outfit) => (
                          <button
                            key={outfit.id}
                            onClick={() => setConfig({...config, appearance: {...config.appearance, outfit: outfit.id}})}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${config.appearance.outfit === outfit.id ? 'border-cloud-dark scale-110 ring-1 ring-white' : 'border-gray-200 hover:border-gray-300'}`}
                            title={outfit.label}
                            // Use pseudo-colors for outfit circles to match screenshot style
                            style={{ backgroundColor: outfit.id === 'Salopette' ? '#93C5FD' : outfit.id === 'TShirt' ? '#FDE68A' : outfit.id === 'Robe' ? '#A5B4FC' : '#E5E7EB' }}
                          />
                        ))}
                    </div>
                </div>

                {/* 7. GLASSES */}
                <div className="flex items-center justify-between pt-2">
                    <label className="font-bold text-gray-600 text-sm">Lunettes</label>
                    <button 
                      onClick={() => setConfig({...config, appearance: {...config.appearance, glasses: !config.appearance.glasses}})}
                      className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${config.appearance.glasses ? 'bg-cloud-dark border-cloud-dark text-white' : 'border-gray-300 text-gray-300 hover:border-gray-400'}`}
                    >
                      {config.appearance.glasses && <Check size={16} />}
                    </button>
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
                             <stop offset="0%" stopColor={getSkinHex()} stopOpacity="1" />
                             <stop offset="100%" stopColor={getSkinHex()} stopOpacity="0.9" />
                          </linearGradient>
                          
                          <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                             <stop offset="0%" stopColor={getHairHex()} stopOpacity="0.9" />
                             <stop offset="100%" stopColor={getHairHex()} stopOpacity="1" />
                          </linearGradient>
                        </defs>

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
                                  <circle cx="32" cy="50" r="12" fill="#fff" fillOpacity="0.1" />
                                  <circle cx="68" cy="50" r="12" fill="#fff" fillOpacity="0.1" />
                                  <line x1="44" y1="50" x2="56" y2="50" />
                                </g>
                              )}
                            </g>
                        </g>
                    </svg>
                 </div>
             </div>
             {/* PRODUCT INFO CARD */}
             <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full border-t-4 border-cloud-dark self-center">
                 <h3 className="text-2xl font-display font-black text-cloud-dark mb-1">Nos mots à nous</h3>
                 <div className="text-xl font-bold text-accent-melon mb-3">€34.99</div>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Un livre chaleureux qui met en avant le lien spécial entre un père et ses enfants. Une réflexion sincère et drôle sur la vie de famille telle qu'elle est.
                 </p>
                 <button 
                   onClick={() => config.childName ? onComplete(config) : alert("N'oublie pas le prénom !")}
                   className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all ${config.childName ? 'bg-cloud-dark hover:bg-slate-800' : 'bg-gray-300'}`}
                 >
                   Prévisualisez votre livre
                 </button>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Wizard;
