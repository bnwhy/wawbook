import React, { useState } from 'react';
import { ArrowLeft, Wand2, Cloud, Glasses, User, Users } from 'lucide-react';
import { BookConfig, Gender, Theme, HairStyle, Outfit, Activity } from '../types';

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

const COLORS_EYES = [
  { label: 'Marrons', value: 'Marrons', hex: '#6D4C41' },
  { label: 'Bleus', value: 'Bleus', hex: '#42A5F5' },
  { label: 'Verts', value: 'Verts', hex: '#66BB6A' },
  { label: 'Noisette', value: 'Noisette', hex: '#A1887F' },
  { label: 'Gris', value: 'Gris', hex: '#BDBDBD' },
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

const OUTFITS: { id: Outfit; label: string }[] = [
  { id: 'Salopette', label: 'Salopette' },
  { id: 'TShirt', label: 'T-Shirt' },
  { id: 'Robe', label: 'Robe' },
  { id: 'Chemise', label: 'Chemise' },
  { id: 'Sweat', label: 'Sweat' } as any,
  { id: 'Sport', label: 'Sport' } as any,
  { id: 'Pyjama', label: 'Pyjama' } as any,
];

const ACTIVITIES: { id: Activity; label: string }[] = [
  { id: 'Sport', label: 'Sport' },
  { id: 'Danse', label: 'Danse' },
  { id: 'Theatre', label: 'Théâtre' },
  { id: 'Musique', label: 'Musique' },
  { id: 'Peinture', label: 'Peinture' },
  { id: 'Lecture', label: 'Lecture' },
  { id: 'Jardinage', label: 'Nature' },
  { id: 'Cuisine', label: 'Cuisine' } as any,
];

// --- MINI ICONS ---
const HairstyleIcon = ({ style, color }: { style: HairStyle, color: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="40" fill="#f0f0f0" />
    <path d="M30 60 Q50 70 70 60 L70 90 Q50 100 30 90 Z" fill="#EAC086" /> 
    {style === 'Court' && <path d="M25 50 Q50 10 75 50" stroke={color} strokeWidth="15" fill="none" strokeLinecap="round" />}
    {style === 'Hérissé' && <path d="M25 50 L35 20 L45 45 L50 15 L55 45 L65 20 L75 50" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />}
    {style === 'Carré' && <path d="M20 50 Q20 20 50 20 Q80 20 80 50 L80 80 L20 80 Z" fill={color} />}
    {style === 'Long' && <path d="M20 50 Q20 10 50 10 Q80 10 80 50 L85 90 L15 90 L20 50 Z" fill={color} />}
    {style === 'Chignon' && <g><circle cx="50" cy="20" r="15" fill={color} /><path d="M25 50 Q50 20 75 50" stroke={color} strokeWidth="15" fill="none" /></g>}
    {(style as any) === 'Nattes' && <g><path d="M20 50 L10 80 M80 50 L90 80" stroke={color} strokeWidth="8" /><path d="M25 50 Q50 15 75 50" stroke={color} strokeWidth="12" fill="none" /></g>}
    {(style as any) === 'Bouclé' && <g><circle cx="30" cy="40" r="10" fill={color}/><circle cx="50" cy="30" r="12" fill={color}/><circle cx="70" cy="40" r="10" fill={color}/></g>}
    {(style as any) === 'QueueCheval' && <g><circle cx="80" cy="30" r="10" fill={color} /><path d="M25 50 Q50 15 75 50" stroke={color} strokeWidth="12" fill="none" /></g>}
  </svg>
);

const OutfitIcon = ({ outfit }: { outfit: Outfit }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    {outfit === 'Salopette' && (
      <g>
        <rect x="30" y="30" width="40" height="50" rx="5" fill="#60A5FA" />
        <line x1="35" y1="10" x2="35" y2="30" stroke="#60A5FA" strokeWidth="8" />
        <line x1="65" y1="10" x2="65" y2="30" stroke="#60A5FA" strokeWidth="8" />
      </g>
    )}
    {outfit === 'TShirt' && <path d="M20 30 L35 10 L65 10 L80 30 L70 40 L65 30 L65 80 L35 80 L35 30 L30 40 Z" fill="#FCD34D" />}
    {outfit === 'Robe' && <path d="M35 10 L65 10 L80 80 L20 80 Z" fill="#818CF8" />}
    {outfit === 'Chemise' && <g><path d="M25 20 L75 20 L75 80 L25 80 Z" fill="#FDA4AF" /><line x1="50" y1="20" x2="50" y2="80" stroke="white" strokeWidth="2" strokeDasharray="5,5" /></g>}
    {(outfit as any) === 'Sweat' && <g><path d="M20 25 L80 25 L80 80 L20 80 Z" fill="#A78BFA" /><path d="M30 25 Q50 40 70 25" fill="none" stroke="#8B5CF6" strokeWidth="3" /></g>}
    {(outfit as any) === 'Sport' && <g><path d="M25 20 L75 20 L75 80 L25 80 Z" fill="#10B981" /><line x1="25" y1="20" x2="40" y2="80" stroke="white" strokeWidth="4" /></g>}
    {(outfit as any) === 'Pyjama' && <g><path d="M25 20 L75 20 L75 80 L25 80 Z" fill="#93C5FD" /><circle cx="50" cy="50" r="5" fill="white" opacity="0.5" /><circle cx="40" cy="30" r="3" fill="white" opacity="0.5" /></g>}
  </svg>
);

const ActivityIcon = ({ activity }: { activity: Activity }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill="#f8fafc" />
        {activity === 'Sport' && <circle cx="50" cy="50" r="20" fill="#F97316" stroke="#C2410C" strokeWidth="2" />}
        {activity === 'Danse' && <path d="M40 30 L40 70 L60 60 L60 20 Z" fill="#F472B6" />}
        {activity === 'Theatre' && <g><circle cx="40" cy="40" r="15" fill="#FCD34D" /><circle cx="60" cy="60" r="15" fill="#60A5FA" /></g>}
        {activity === 'Musique' && <path d="M35 70 Q30 80 40 80 Q50 80 50 70 V30 L70 20 V60" stroke="#8B5CF6" strokeWidth="5" fill="none" />}
        {activity === 'Peinture' && <g><path d="M30 70 L50 50" stroke="#A855F7" strokeWidth="8" /><circle cx="60" cy="40" r="15" fill="#FCD34D" /></g>}
        {activity === 'Lecture' && <rect x="30" y="30" width="40" height="40" fill="#3B82F6" rx="5" />}
        {activity === 'Jardinage' && <path d="M50 80 L50 40 M30 30 Q50 50 70 30" stroke="#16A34A" strokeWidth="5" fill="none" />}
        {(activity as any) === 'Cuisine' && <g><path d="M30 30 Q50 10 70 30 V60 H30 Z" fill="#FFF" stroke="#DDD" strokeWidth="2" /><rect x="45" y="60" width="10" height="20" fill="#999" /></g>}
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
      distinctiveFeatures: '',
    },
    dedication: ''
  });

  const [activeTab, setActiveTab] = useState<'child' | 'parent'>('child');

  const getSkinHex = () => COLORS_SKIN.find(c => c.value === config.appearance.skinTone)?.hex || '#FFE0BD';
  const getHairHex = () => COLORS_HAIR.find(c => c.value === config.appearance.hairColor)?.hex || '#5D4037';
  const getEyeHex = () => COLORS_EYES.find(c => c.value === config.appearance.eyeColor)?.hex || '#6D4C41';

  const toggleFreckles = () => {
    const hasFreckles = config.appearance.distinctiveFeatures?.includes('freckles');
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        distinctiveFeatures: hasFreckles ? '' : 'freckles'
      }
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* --- HEADER TITLE --- */}
      <div className="mb-8 w-full max-w-6xl">
          <h2 className="text-3xl font-display font-black text-cloud-dark">Créez vos personnages principaux</h2>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col lg:flex-row overflow-hidden min-h-[700px]">
        
        {/* --- LEFT COLUMN: CONFIGURATION (Swapped from previous) --- */}
        <div className="lg:w-5/12 p-8 lg:p-10 overflow-y-auto max-h-[800px] border-r border-gray-100">
           
           {/* TABS */}
           <div className="flex mb-8 bg-gray-50 rounded-xl p-1">
              <button 
                 onClick={() => setActiveTab('parent')}
                 className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'parent' ? 'bg-white shadow-sm text-cloud-dark' : 'text-gray-400 hover:text-gray-600'}`}
                 disabled={true}
                 title="Bientôt disponible"
              >
                 <User size={16} /> Père
              </button>
              <button 
                 onClick={() => setActiveTab('child')}
                 className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'child' ? 'bg-white shadow-sm text-cloud-dark' : 'text-gray-400 hover:text-gray-600'}`}
              >
                 <Users size={16} /> Enfant
              </button>
           </div>

           {/* FORM CONTENT */}
           <div className="space-y-8">
              
              {/* 1. NAME */}
              <div className="space-y-2">
                 <label className="font-bold text-cloud-dark/70 text-sm">Comment s'appelle l'enfant ? *</label>
                 <input 
                   type="text" 
                   value={config.childName}
                   onChange={(e) => setConfig({...config, childName: e.target.value})}
                   className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-cloud-dark focus:border-cloud-blue focus:ring-2 focus:ring-cloud-blue/20 outline-none transition-colors placeholder:text-gray-300"
                   placeholder="Par exemple : Léo"
                 />
              </div>

              {/* 2. SKIN COLOR */}
              <div className="space-y-2">
                 <label className="font-bold text-cloud-dark/70 text-sm">Couleur de la peau</label>
                 <div className="flex gap-3 flex-wrap">
                      {COLORS_SKIN.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, skinTone: c.value}})}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${config.appearance.skinTone === c.value ? 'border-cloud-blue ring-2 ring-cloud-blue/30 scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                  </div>
              </div>

              {/* 3. HAIR COLOR */}
              <div className="space-y-2">
                  <label className="font-bold text-cloud-dark/70 text-sm">Couleur des cheveux</label>
                  <div className="flex gap-3 flex-wrap">
                      {COLORS_HAIR.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, hairColor: c.value}})}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${config.appearance.hairColor === c.value ? 'border-cloud-blue ring-2 ring-cloud-blue/30 scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                  </div>
              </div>

              {/* 4. HAIRSTYLE (Grid) */}
              <div className="space-y-2">
                  <label className="font-bold text-cloud-dark/70 text-sm">Coiffure</label>
                  <div className="grid grid-cols-4 gap-3">
                      {HAIR_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, hairStyle: style.id}})}
                          className={`aspect-square rounded-full p-1 border-2 transition-all flex items-center justify-center overflow-hidden ${config.appearance.hairStyle === style.id ? 'border-cloud-blue bg-blue-50' : 'border-gray-100 hover:border-blue-100'}`}
                        >
                           <div className="w-full h-full transform scale-125 translate-y-1">
                              <HairstyleIcon style={style.id} color={getHairHex()} />
                           </div>
                        </button>
                      ))}
                  </div>
              </div>

              {/* 5. GENDER (Visual) */}
              <div className="space-y-2">
                  <label className="font-bold text-cloud-dark/70 text-sm">Genre</label>
                  <div className="flex gap-3">
                      {Object.values(Gender).filter(g => g !== Gender.Neutral).map((g) => (
                        <button
                          key={g}
                          onClick={() => setConfig({...config, gender: g})}
                          className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition-all ${config.gender === g ? 'border-cloud-blue bg-blue-50 text-cloud-blue' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          {g}
                        </button>
                      ))}
                  </div>
              </div>

              {/* 6. OUTFIT (Simplified Visuals) */}
              <div className="space-y-2">
                  <label className="font-bold text-cloud-dark/70 text-sm">Vêtements</label>
                  <div className="flex gap-3 flex-wrap">
                      {OUTFITS.map((outfit) => (
                        <button
                          key={outfit.id}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, outfit: outfit.id}})}
                          className={`w-10 h-10 rounded-full border-2 p-1 transition-all flex items-center justify-center ${config.appearance.outfit === outfit.id ? 'border-cloud-blue bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                          title={outfit.label}
                        >
                           <div className="w-full h-full">
                              <OutfitIcon outfit={outfit.id} />
                           </div>
                        </button>
                      ))}
                  </div>
              </div>

              {/* 7. GLASSES */}
              <div className="flex items-center justify-between pt-2">
                  <label className="font-bold text-cloud-dark/70 text-sm">Lunettes</label>
                  <button 
                    onClick={() => setConfig({...config, appearance: {...config.appearance, glasses: !config.appearance.glasses}})}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${config.appearance.glasses ? 'bg-cloud-blue border-cloud-blue text-white' : 'border-gray-300 text-transparent hover:border-cloud-blue'}`}
                  >
                    <Glasses size={14} />
                  </button>
              </div>

              {/* 8. LANGUAGE */}
              <div className="pt-4 mt-4 border-t border-gray-100">
                 <label className="font-bold text-cloud-dark/70 text-sm block mb-2">Langue du livre *</label>
                 <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-cloud-dark font-medium outline-none focus:border-cloud-blue">
                    <option>Français</option>
                    <option>English</option>
                    <option>Español</option>
                    <option>Deutsch</option>
                 </select>
              </div>
              
              <button 
                onClick={() => config.childName ? onComplete(config) : alert("N'oublie pas le prénom !")}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg mt-6 shadow-lg transition-all ${config.childName ? 'bg-cloud-dark hover:bg-slate-800' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                 Prévisualisez votre livre
              </button>
              
              <button onClick={onCancel} className="w-full text-center text-gray-400 text-sm font-medium hover:text-gray-600 mt-2">
                Annuler
              </button>

           </div>
        </div>

        {/* --- RIGHT COLUMN: PREVIEW (Swapped) --- */}
        <div className="lg:w-7/12 bg-[url('https://images.unsplash.com/photo-1615800001461-5766c263691c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center relative flex flex-col items-center justify-center p-8">
           {/* Overlay to make text readable if needed, though we have a white card now */}
           <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>
           
           {/* CIRCULAR PREVIEW */}
           <div className="relative z-10 mb-8">
               <div className="w-[350px] h-[350px] lg:w-[450px] lg:h-[450px] bg-white rounded-full shadow-2xl border-8 border-white overflow-hidden flex items-center justify-center relative">
                  
                  {/* Paper texture overlay (Multiplied) */}
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none z-20 mix-blend-multiply"></div>
                  
                  {/* --- ENHANCED SVG AVATAR (Pure Vector) --- */}
                  <svg viewBox="0 0 200 240" className="w-full h-full transform translate-y-8 scale-110">
                      <defs>
                        <filter id="pencil" x="-20%" y="-20%" width="140%" height="140%">
                          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
                          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                        <radialGradient id="softShadow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#000" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#000" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      <g filter="url(#pencil)">
                          {/* SHADOW */}
                          <ellipse cx="50" cy="140" rx="25" ry="10" fill="url(#softShadow)" transform="translate(50, 0)" />

                          {/* BACK HAIR */}
                          <g transform="translate(50, 40)">
                            {config.appearance.hairStyle === 'Long' && <path d="M0 50 Q-10 120 10 140 L90 140 Q110 120 100 50 Z" fill={getHairHex()} stroke="#4A342E" strokeWidth="1" />}
                            {config.appearance.hairStyle === 'Carré' && <path d="M-5 50 L-5 110 Q5 115 20 110 L20 50 M105 50 L105 110 Q95 115 80 110 L80 50" stroke={getHairHex()} strokeWidth="25" fill="none" strokeLinecap="round" />}
                            {(config.appearance.hairStyle as any) === 'Nattes' && <g><path d="M5 60 Q-15 100 10 120" stroke={getHairHex()} strokeWidth="18" fill="none" strokeLinecap="round" /><path d="M95 60 Q115 100 90 120" stroke={getHairHex()} strokeWidth="18" fill="none" strokeLinecap="round" /></g>}
                            {(config.appearance.hairStyle as any) === 'Bouclé' && <g><circle cx="-5" cy="70" r="16" fill={getHairHex()} /><circle cx="5" cy="90" r="16" fill={getHairHex()} /><circle cx="105" cy="70" r="16" fill={getHairHex()} /><circle cx="95" cy="90" r="16" fill={getHairHex()} /></g>}
                            {(config.appearance.hairStyle as any) === 'QueueCheval' && <g><path d="M90 40 Q130 60 115 130" stroke={getHairHex()} strokeWidth="20" fill="none" strokeLinecap="round" /></g>}
                          </g>

                          {/* BODY */}
                          <g transform="translate(50, 130)">
                            <rect x="38" y="-30" width="24" height="40" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="0.5" rx="5" />
                            <path d="M22 5 Q5 50 15 70" stroke={getSkinHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                            <path d="M78 5 Q95 50 85 70" stroke={getSkinHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                            
                            {/* OUTFIT */}
                            <g stroke="#4A342E" strokeWidth="0.8" strokeLinejoin="round">
                                {config.appearance.outfit === 'Salopette' && <g><path d="M10 0 L90 0 L90 85 L10 85 Z" fill="#93C5FD" /><path d="M18 20 L82 20 L88 110 L12 110 Z" fill="#3B82F6" /></g>}
                                {config.appearance.outfit === 'TShirt' && <path d="M15 0 L85 0 L92 100 L8 100 Z" fill="#FDE68A" />}
                                {config.appearance.outfit === 'Robe' && <path d="M25 0 L75 0 L105 110 L-5 110 Z" fill="#A5B4FC" />}
                                {config.appearance.outfit === 'Chemise' && <path d="M15 0 L85 0 L88 100 L12 100 Z" fill="#FDA4AF" />}
                                {(config.appearance.outfit as any) === 'Sweat' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#C4B5FD" />}
                                {(config.appearance.outfit as any) === 'Sport' && <path d="M20 0 L80 0 L85 100 L15 100 Z" fill="#6EE7B7" />}
                                {(config.appearance.outfit as any) === 'Pyjama' && <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#BAE6FD" />}
                            </g>
                          </g>

                          {/* HEAD */}
                          <g transform="translate(50, 40)">
                            <path d="M10 40 Q 10 95 50 95 Q 90 95 90 40 Q 90 10 50 10 Q 10 10 10 40 Z" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />
                            <path d="M8 45 Q -2 50 8 58" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />
                            <path d="M92 45 Q 102 50 92 58" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />
                            
                            {/* Face */}
                            <g>
                              <ellipse cx="32" cy="50" rx="4" ry="6" fill="#3E2723" />
                              <circle cx="33" cy="48" r="1.5" fill="white" />
                              <ellipse cx="68" cy="50" rx="4" ry="6" fill="#3E2723" />
                              <circle cx="69" cy="48" r="1.5" fill="white" />
                              <path d="M28 40 Q32 38 36 40" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />
                              <path d="M64 40 Q68 38 72 40" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />
                              <path d="M46 60 Q50 64 54 60" stroke="#A1887F" strokeWidth="2" strokeLinecap="round" fill="none" />
                              <path d="M40 70 Q50 76 60 70" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />
                              <circle cx="25" cy="65" r="5" fill="#FFCDD2" opacity="0.6" />
                              <circle cx="75" cy="65" r="5" fill="#FFCDD2" opacity="0.6" />
                            </g>

                            {/* FRONT HAIR */}
                            <g>
                               {config.appearance.hairStyle === 'Court' && <path d="M10 40 Q50 20 90 40" fill="none" stroke={getHairHex()} strokeWidth="1" />}
                               {config.appearance.hairStyle === 'Hérissé' && <path d="M10 35 L20 20 L30 35 L40 15 L50 35 L60 15 L70 35 L80 20 L90 35" fill={getHairHex()} stroke={getHairHex()} strokeWidth="1" />}
                               {['Carré', 'Long', 'Chignon', 'Nattes', 'Bouclé', 'QueueCheval'].includes(config.appearance.hairStyle) && <path d="M10 40 Q30 50 50 35 Q70 50 90 40 Q90 10 50 10 Q10 10 10 40" fill={getHairHex()} />}
                            </g>

                            {/* GLASSES */}
                            {config.appearance.glasses && (
                              <g stroke="#333" strokeWidth="1.5" fill="none" opacity="0.8">
                                <circle cx="32" cy="50" r="10" />
                                <circle cx="68" cy="50" r="10" />
                                <line x1="42" y1="50" x2="58" y2="50" />
                              </g>
                            )}
                          </g>
                      </g>
                  </svg>
               </div>
           </div>

           {/* PRODUCT INFO CARD */}
           <div className="relative z-10 bg-white p-6 rounded-2xl shadow-lg max-w-sm w-full border-l-4 border-cloud-blue">
               <h3 className="text-2xl font-display font-black text-cloud-dark mb-2">Nos mots à nous</h3>
               <div className="text-2xl font-bold text-accent-melon mb-2">€34.99</div>
               <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Un livre chaleureux qui met en avant le lien spécial entre un enfant et sa famille. Une réflexion sincère et drôle sur la vie de famille telle qu'elle est.
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
  );
};

export default Wizard;
