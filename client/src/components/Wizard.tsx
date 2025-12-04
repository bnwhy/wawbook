import React, { useState } from 'react';
import { ArrowLeft, Wand2, Cloud, Glasses } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-cloud-blue rounded-b-[50%] scale-150 -z-10"></div>
      <div className="absolute top-10 right-10 text-white/30 animate-float"><Cloud size={80} fill="currentColor" /></div>
      <div className="absolute top-20 left-10 text-white/20 animate-float-delayed"><Cloud size={60} fill="currentColor" /></div>

      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-[700px]">
        
        {/* --- LEFT COLUMN: AVATAR PREVIEW --- */}
        <div className="lg:w-5/12 bg-[#E0F2FE] relative flex flex-col items-center justify-center p-8 border-r border-cloud-light">
           <div className="absolute top-6 left-6 z-20">
              <button onClick={onCancel} className="text-cloud-dark/50 hover:text-cloud-blue transition-colors flex items-center gap-2 font-bold text-sm bg-white/50 px-3 py-1 rounded-full">
                <ArrowLeft size={16} /> Retour
              </button>
           </div>
           
           {/* Huge Circular Avatar Background */}
           <div className="relative w-80 h-80 lg:w-96 lg:h-96 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8)] flex items-center justify-center border-8 border-white group overflow-hidden">
               
               {/* Paper texture overlay (Multiplied) */}
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none z-20 mix-blend-multiply"></div>
               
               {/* --- ENHANCED SVG AVATAR (Pure Vector) --- */}
               <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-xl transform translate-y-6">
                  <defs>
                    {/* Filter for rough pencil edges */}
                    <filter id="pencil" x="-20%" y="-20%" width="140%" height="140%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    
                    {/* Filter for watercolor texture fill */}
                    <filter id="watercolor">
                      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
                      <feComposite operator="in" in="noise" in2="SourceGraphic" result="textured" />
                      <feBlend mode="multiply" in="textured" in2="SourceGraphic" />
                    </filter>

                     {/* Soft Shadow Gradient */}
                    <radialGradient id="softShadow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#000" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Apply Pencil Filter to Everything */}
                  <g filter="url(#pencil)">
                      
                      {/* === SHADOW UNDER HEAD (Neck area) === */}
                       <ellipse cx="50" cy="140" rx="25" ry="10" fill="url(#softShadow)" transform="translate(50, 0)" />

                      {/* === BACK HAIR LAYER (Behind Head) === */}
                      <g transform="translate(50, 40)">
                        {config.appearance.hairStyle === 'Long' && (
                            <path d="M0 50 Q-10 120 10 140 L90 140 Q110 120 100 50 Z" fill={getHairHex()} stroke="#4A342E" strokeWidth="1" />
                        )}
                        {config.appearance.hairStyle === 'Carré' && (
                            <path d="M-5 50 L-5 110 Q5 115 20 110 L20 50 M105 50 L105 110 Q95 115 80 110 L80 50" stroke={getHairHex()} strokeWidth="25" fill="none" strokeLinecap="round" />
                        )}
                        {(config.appearance.hairStyle as any) === 'Nattes' && (
                            <g>
                              <path d="M5 60 Q-15 100 10 120" stroke={getHairHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                              <path d="M95 60 Q115 100 90 120" stroke={getHairHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                              <circle cx="10" cy="115" r="6" fill="#F472B6" />
                              <circle cx="90" cy="115" r="6" fill="#F472B6" />
                            </g>
                        )}
                        {(config.appearance.hairStyle as any) === 'Bouclé' && (
                            <g>
                              <circle cx="-5" cy="70" r="16" fill={getHairHex()} />
                              <circle cx="5" cy="90" r="16" fill={getHairHex()} />
                              <circle cx="105" cy="70" r="16" fill={getHairHex()} />
                              <circle cx="95" cy="90" r="16" fill={getHairHex()} />
                            </g>
                        )}
                        {(config.appearance.hairStyle as any) === 'QueueCheval' && (
                            <g>
                              <path d="M90 40 Q130 60 115 130" stroke={getHairHex()} strokeWidth="20" fill="none" strokeLinecap="round" />
                            </g>
                        )}
                      </g>

                      {/* === BODY & OUTFIT === */}
                      <g transform="translate(50, 130)">
                        {/* Neck */}
                        <rect x="38" y="-30" width="24" height="40" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="0.5" rx="5" />
                        
                        {/* Arms (Slightly curved for natural pose) */}
                        <path d="M22 5 Q5 50 15 70" stroke={getSkinHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                        <circle cx="15" cy="70" r="10" fill={getSkinHex()} />

                        <path d="M78 5 Q95 50 85 70" stroke={getSkinHex()} strokeWidth="18" fill="none" strokeLinecap="round" />
                        <circle cx="85" cy="70" r="10" fill={getSkinHex()} />

                        {/* -- OUTFIT RENDERING with DETAILS -- */}
                        <g stroke="#4A342E" strokeWidth="0.8" strokeLinejoin="round">
                            {config.appearance.outfit === 'Salopette' && (
                              <g>
                                <path d="M10 0 L90 0 L90 85 L10 85 Z" fill="#93C5FD" /> {/* Light blue base */}
                                <path d="M18 20 L82 20 L88 110 L12 110 Z" fill="#3B82F6" /> {/* Dark blue overalls */}
                                {/* Stitching details */}
                                <path d="M20 25 L80 25" stroke="#E0F2FE" strokeWidth="1" strokeDasharray="3,3" /> 
                                <path d="M25 0 L25 25" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" />
                                <path d="M75 0 L75 25" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" />
                                {/* Buttons */}
                                <circle cx="25" cy="25" r="4" fill="#FCD34D" stroke="#D97706" />
                                <circle cx="75" cy="25" r="4" fill="#FCD34D" stroke="#D97706" />
                                {/* Pocket */}
                                <path d="M40 40 L60 40 L58 55 L42 55 Z" fill="#2563EB" stroke="#E0F2FE" strokeDasharray="2,2" />
                              </g>
                            )}
                            {config.appearance.outfit === 'TShirt' && (
                              <g>
                                <path d="M15 0 L85 0 L92 100 L8 100 Z" fill="#FDE68A" />
                                <path d="M15 0 L-5 25 L15 35" fill="#FDE68A" />
                                <path d="M85 0 L105 25 L85 35" fill="#FDE68A" />
                                {/* Graphic on Shirt */}
                                <circle cx="50" cy="40" r="12" fill="none" stroke="#F59E0B" strokeWidth="3" />
                                <path d="M40 40 L60 40" stroke="#F59E0B" strokeWidth="3" />
                                <path d="M50 30 L50 50" stroke="#F59E0B" strokeWidth="3" />
                              </g>
                            )}
                            {config.appearance.outfit === 'Robe' && (
                              <g>
                                <path d="M25 0 L75 0 L105 110 L-5 110 Z" fill="#A5B4FC" />
                                <path d="M25 0 L10 20 L25 30" fill="#A5B4FC" />
                                <path d="M75 0 L90 20 L75 30" fill="#A5B4FC" />
                                {/* Polka dots */}
                                <circle cx="40" cy="50" r="3" fill="white" opacity="0.6" />
                                <circle cx="60" cy="60" r="3" fill="white" opacity="0.6" />
                                <circle cx="30" cy="80" r="3" fill="white" opacity="0.6" />
                                <circle cx="70" cy="90" r="3" fill="white" opacity="0.6" />
                                <circle cx="50" cy="20" r="3" fill="white" opacity="0.6" />
                              </g>
                            )}
                            {config.appearance.outfit === 'Chemise' && (
                                <g>
                                  <path d="M15 0 L85 0 L88 100 L12 100 Z" fill="#FDA4AF" />
                                  <path d="M50 0 L50 100" stroke="white" strokeWidth="2" strokeDasharray="4,2" />
                                  <path d="M15 0 L5 25 L20 30" fill="#FDA4AF" />
                                  <path d="M85 0 L95 25 L80 30" fill="#FDA4AF" />
                                  {/* Collar */}
                                  <path d="M50 0 L35 15 L50 25 L65 15 Z" fill="white" />
                                  {/* Buttons */}
                                  <circle cx="50" cy="40" r="1.5" fill="#881337" stroke="none" />
                                  <circle cx="50" cy="60" r="1.5" fill="#881337" stroke="none" />
                                  <circle cx="50" cy="80" r="1.5" fill="#881337" stroke="none" />
                                </g>
                            )}
                            {(config.appearance.outfit as any) === 'Sweat' && (
                                <g>
                                  <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#C4B5FD" />
                                  <path d="M15 0 L-5 35 L15 45" fill="#C4B5FD" />
                                  <path d="M85 0 L105 35 L85 45" fill="#C4B5FD" />
                                  {/* Pocket */}
                                  <path d="M30 50 L70 50 L75 75 L25 75 Z" fill="#A78BFA" opacity="0.8" />
                                  {/* Strings */}
                                  <path d="M42 0 L42 25" stroke="white" strokeWidth="2" />
                                  <path d="M58 0 L58 25" stroke="white" strokeWidth="2" />
                                </g>
                            )}
                            {(config.appearance.outfit as any) === 'Sport' && (
                                <g>
                                  <path d="M20 0 L80 0 L85 100 L15 100 Z" fill="#6EE7B7" />
                                  <path d="M20 0 L0 25 L20 35" fill="#6EE7B7" />
                                  <path d="M80 0 L100 25 L80 35" fill="#6EE7B7" />
                                  {/* Number */}
                                  <path d="M45 30 L50 30 L50 60" stroke="white" strokeWidth="5" strokeLinecap="round" />
                                  <circle cx="50" cy="45" r="18" stroke="white" strokeWidth="2" fill="none" />
                                </g>
                            )}
                            {(config.appearance.outfit as any) === 'Pyjama' && (
                                <g>
                                  <path d="M15 0 L85 0 L90 100 L10 100 Z" fill="#BAE6FD" />
                                  <path d="M15 0 L-2 25 L15 35" fill="#BAE6FD" />
                                  <path d="M85 0 L102 25 L85 35" fill="#BAE6FD" />
                                  {/* Stars pattern */}
                                  <path d="M30 40 L32 45 L37 45 L33 48 L35 53 L30 50 L25 53 L27 48 L23 45 L28 45 Z" fill="white" opacity="0.7" />
                                  <path d="M70 60 L72 65 L77 65 L73 68 L75 73 L70 70 L65 73 L67 68 L63 65 L68 65 Z" fill="white" opacity="0.7" />
                                </g>
                            )}
                        </g>

                        {/* -- PROPS (Props held in hands) -- */}
                        <g filter="url(#pencil)">
                            {config.appearance.activity === 'Sport' && (
                              <circle cx="85" cy="70" r="16" fill="#FB923C" stroke="#C2410C" strokeWidth="2" />
                            )}
                            {config.appearance.activity === 'Peinture' && (
                              <g transform="translate(80, 50) rotate(-15)">
                                  <rect x="0" y="0" width="8" height="35" fill="#C084FC" stroke="#581C87" strokeWidth="0.5" />
                                  <path d="M0 0 L8 0 L8 -12 Q4 -18 0 -12 Z" fill="#FDE047" stroke="#B45309" strokeWidth="0.5" />
                              </g>
                            )}
                            {config.appearance.activity === 'Musique' && (
                              <g transform="translate(75, 50) scale(0.9)">
                                  <path d="M10 30 Q10 40 20 40 Q30 40 30 30 V10 L10 0 V30" fill="#DDD6FE" stroke="#7C3AED" strokeWidth="2" />
                              </g>
                            )}
                            {config.appearance.activity === 'Theatre' && (
                              <g transform="translate(80, 55)">
                                  <circle cx="0" cy="0" r="12" fill="#FDE047" stroke="#B45309" strokeWidth="1" />
                                  <path d="M-6 -2 Q0 4 6 -2" stroke="#B45309" fill="none" strokeWidth="1.5" />
                                  <circle cx="-4" cy="-5" r="1.5" fill="#B45309" />
                                  <circle cx="4" cy="-5" r="1.5" fill="#B45309" />
                              </g>
                            )}
                            {config.appearance.activity === 'Lecture' && (
                              <rect x="70" y="60" width="24" height="30" fill="#60A5FA" rx="2" stroke="#1E3A8A" strokeWidth="1" transform="rotate(10)" />
                            )}
                            {config.appearance.activity === 'Jardinage' && (
                              <path d="M85 80 L85 55 M75 55 Q85 65 95 55" stroke="#16A34A" strokeWidth="4" fill="none" strokeLinecap="round" />
                            )}
                            {config.appearance.activity === 'Danse' && (
                              <g transform="translate(85, 40)">
                                  <path d="M0 0 Q 15 25 -10 50" stroke="#F472B6" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
                              </g>
                            )}
                            {(config.appearance.activity as any) === 'Cuisine' && (
                              <g transform="translate(85, 60) rotate(10)">
                                  <path d="M-6 0 L6 0 L3 18 L-3 18 Z" fill="#D1D5DB" stroke="#4B5563" strokeWidth="1" />
                                  <path d="M0 18 Q 12 30 0 42 Q -12 30 0 18" stroke="#9CA3AF" strokeWidth="3" fill="none" />
                              </g>
                            )}
                        </g>
                      </g>

                      {/* === HEAD GROUP === */}
                      <g transform="translate(50, 40)">
                        {/* Face Shape - Softer chin */}
                        <path d="M10 40 Q 10 95 50 95 Q 90 95 90 40 Q 90 10 50 10 Q 10 10 10 40 Z" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />
                        
                        {/* Ears */}
                        <path d="M8 45 Q -2 50 8 58" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />
                        <path d="M92 45 Q 102 50 92 58" fill={getSkinHex()} stroke="#8D6E63" strokeWidth="1" />

                        {/* Face Features */}
                        <g>
                          {/* Eyes - Larger, darker, with shine */}
                          <ellipse cx="32" cy="50" rx="4" ry="6" fill="#3E2723" />
                          <circle cx="33" cy="48" r="1.5" fill="white" /> {/* Eye shine */}
                          
                          <ellipse cx="68" cy="50" rx="4" ry="6" fill="#3E2723" />
                          <circle cx="69" cy="48" r="1.5" fill="white" /> {/* Eye shine */}
                          
                          {/* Eyebrows */}
                          <path d="M28 40 Q32 38 36 40" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />
                          <path d="M64 40 Q68 38 72 40" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />

                          {/* Nose - Cute button nose */}
                          <path d="M46 60 Q50 64 54 60" stroke="#A1887F" strokeWidth="2" strokeLinecap="round" fill="none" />
                          
                          {/* Mouth - Smiling */}
                          <path d="M40 70 Q50 76 60 70" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />
                          
                          {/* Cheeks - Rosy */}
                          <circle cx="25" cy="65" r="5" fill="#FFCDD2" opacity="0.6" />
                          <circle cx="75" cy="65" r="5" fill="#FFCDD2" opacity="0.6" />

                          {/* Freckles */}
                          {config.appearance.distinctiveFeatures?.includes('freckles') && (
                            <g fill="#8D6E63" opacity="0.6">
                              <circle cx="25" cy="60" r="0.8" />
                              <circle cx="28" cy="62" r="0.8" />
                              <circle cx="22" cy="63" r="0.8" />
                              <circle cx="75" cy="60" r="0.8" />
                              <circle cx="78" cy="62" r="0.8" />
                              <circle cx="72" cy="63" r="0.8" />
                            </g>
                          )}
                        </g>

                        {/* Front Hair / Fringe */}
                        <g>
                           {config.appearance.hairStyle === 'Court' && (
                              <path d="M10 40 Q50 20 90 40" fill="none" stroke={getHairHex()} strokeWidth="1" />
                           )}
                           {config.appearance.hairStyle === 'Hérissé' && (
                              <path d="M10 35 L20 20 L30 35 L40 15 L50 35 L60 15 L70 35 L80 20 L90 35" fill={getHairHex()} stroke={getHairHex()} strokeWidth="1" />
                           )}
                           {/* Generic bangs for most styles */}
                           {['Carré', 'Long', 'Chignon', 'Nattes', 'Bouclé', 'QueueCheval'].includes(config.appearance.hairStyle) && (
                              <path d="M10 40 Q30 50 50 35 Q70 50 90 40 Q90 10 50 10 Q10 10 10 40" fill={getHairHex()} />
                           )}
                        </g>

                        {/* Glasses */}
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
               
               {/* Interactive Toggle Buttons on Avatar */}
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                 <button 
                    onClick={() => setConfig({...config, appearance: {...config.appearance, glasses: !config.appearance.glasses}})}
                    className={`p-2 rounded-full shadow-sm transition-all ${config.appearance.glasses ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    title="Lunettes"
                 >
                    <Glasses size={16} />
                 </button>
                 <button 
                    onClick={toggleFreckles}
                    className={`p-2 rounded-full shadow-sm transition-all ${config.appearance.distinctiveFeatures?.includes('freckles') ? 'bg-orange-400 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    title="Tâches de rousseur"
                 >
                    <span className="font-bold text-xs">:::</span>
                 </button>
               </div>

           </div>

           <div className="mt-6 text-center">
              <h3 className="font-display text-3xl font-black text-cloud-dark">{config.childName || "Le Héros"}</h3>
              <p className="text-cloud-dark/50 font-bold uppercase tracking-wider text-sm mt-1">Prêt pour l'aventure !</p>
           </div>
        </div>

        {/* --- RIGHT COLUMN: CONTROLS --- */}
        <div className="lg:w-7/12 p-8 lg:p-12 overflow-y-auto max-h-[800px]">
           
           <h2 className="text-3xl font-display font-black text-cloud-dark mb-8">Créons ton personnage</h2>

           <div className="space-y-8">
              
              {/* 1. NAME & AGE */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="font-bold text-cloud-dark/70 text-sm uppercase">Prénom</label>
                    <input 
                      type="text" 
                      value={config.childName}
                      onChange={(e) => setConfig({...config, childName: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:border-cloud-blue focus:ring-0 outline-none transition-colors"
                      placeholder="Ex: Léo"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="font-bold text-cloud-dark/70 text-sm uppercase">Âge</label>
                    <div className="flex items-center gap-4">
                       <input 
                         type="range" min="1" max="10" 
                         value={config.age}
                         onChange={(e) => setConfig({...config, age: parseInt(e.target.value)})}
                         className="flex-1 accent-cloud-blue h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                       />
                       <span className="font-black text-2xl text-cloud-blue min-w-[3ch]">{config.age} ans</span>
                    </div>
                 </div>
              </div>

              {/* 2. GENDER */}
              <div className="space-y-2">
                  <label className="font-bold text-cloud-dark/70 text-sm uppercase">Genre</label>
                  <div className="flex gap-3">
                      {Object.values(Gender).filter(g => g !== Gender.Neutral).map((g) => (
                        <button
                          key={g}
                          onClick={() => setConfig({...config, gender: g})}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all ${config.gender === g ? 'bg-cloud-blue text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {g}
                        </button>
                      ))}
                  </div>
              </div>

              {/* 3. HAIR STYLE & COLOR */}
              <div className="space-y-4">
                  <label className="font-bold text-cloud-dark/70 text-sm uppercase">Cheveux</label>
                  
                  {/* Colors */}
                  <div className="flex gap-3 flex-wrap">
                      {COLORS_HAIR.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, hairColor: c.value}})}
                          className={`w-10 h-10 rounded-full border-4 transition-all ${config.appearance.hairColor === c.value ? 'border-cloud-blue scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                  </div>

                  {/* Styles Grid */}
                  <div className="grid grid-cols-4 gap-3">
                      {HAIR_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, hairStyle: style.id}})}
                          className={`aspect-square rounded-xl p-2 border-2 transition-all flex flex-col items-center justify-center gap-1 ${config.appearance.hairStyle === style.id ? 'border-cloud-blue bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                        >
                           <div className="w-10 h-10">
                              <HairstyleIcon style={style.id} color={getHairHex()} />
                           </div>
                           <span className="text-[10px] font-bold text-gray-500 uppercase">{style.label}</span>
                        </button>
                      ))}
                  </div>
              </div>

              {/* 4. OUTFIT */}
              <div className="space-y-4">
                  <label className="font-bold text-cloud-dark/70 text-sm uppercase">Tenue</label>
                  <div className="grid grid-cols-4 gap-3">
                      {OUTFITS.map((outfit) => (
                        <button
                          key={outfit.id}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, outfit: outfit.id}})}
                          className={`aspect-square rounded-xl p-2 border-2 transition-all flex flex-col items-center justify-center gap-1 ${config.appearance.outfit === outfit.id ? 'border-cloud-blue bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                        >
                           <div className="w-10 h-10">
                              <OutfitIcon outfit={outfit.id} />
                           </div>
                           <span className="text-[10px] font-bold text-gray-500 uppercase">{outfit.label}</span>
                        </button>
                      ))}
                  </div>
              </div>

              {/* 5. ACTIVITY (Passion) */}
              <div className="space-y-4">
                  <label className="font-bold text-cloud-dark/70 text-sm uppercase">Passion (pour l'histoire)</label>
                  <div className="grid grid-cols-4 gap-3">
                      {ACTIVITIES.map((act) => (
                        <button
                          key={act.id}
                          onClick={() => setConfig({...config, appearance: {...config.appearance, activity: act.id}})}
                          className={`aspect-square rounded-xl p-2 border-2 transition-all flex flex-col items-center justify-center gap-1 ${config.appearance.activity === act.id ? 'border-accent-sun bg-yellow-50' : 'border-gray-200 hover:border-yellow-100'}`}
                        >
                           <div className="w-10 h-10">
                              <ActivityIcon activity={act.id} />
                           </div>
                           <span className="text-[10px] font-bold text-gray-500 uppercase">{act.label}</span>
                        </button>
                      ))}
                  </div>
              </div>

              {/* 6. DEDICATION */}
              <div className="space-y-2">
                 <label className="font-bold text-cloud-dark/70 text-sm uppercase">Petite Dédicace (Optionnel)</label>
                 <textarea 
                   value={config.dedication}
                   onChange={(e) => setConfig({...config, dedication: e.target.value})}
                   className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-medium text-sm focus:border-cloud-blue focus:ring-0 outline-none transition-colors resize-none h-24"
                   placeholder="Pour mon petit trésor..."
                 />
              </div>

           </div>

           {/* ACTION BAR */}
           <div className="sticky bottom-0 bg-white pt-6 pb-2 mt-8 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => config.childName ? onComplete(config) : alert("N'oublie pas le prénom !")}
                className={`px-8 py-4 rounded-2xl font-display font-black text-xl flex items-center gap-3 shadow-xl transition-all ${config.childName ? 'bg-accent-sun text-yellow-900 hover:scale-105 hover:shadow-2xl' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                 <Wand2 size={24} />
                 Fabriquer mon livre !
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};

export default Wizard;
