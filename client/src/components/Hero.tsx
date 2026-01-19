import React, { useState } from 'react';
import { ArrowRight, Star, Sparkles, Cloud, CheckCircle, ChevronDown, ChevronUp, PenTool, BookOpen, Heart, ShieldCheck, Zap, Compass, Wand2, Rocket, Rabbit, Settings, Gift } from 'lucide-react';
import { Theme, Activity } from '../types';
import Navigation from './Navigation';
import Banner from './Banner';
import { useBooks } from '../context/BooksContext';
import { formatPrice } from '../utils/formatPrice';

interface HeroProps {
  onStart: (theme?: Theme, activity?: Activity, bookTitle?: string) => void;
  onAdminClick?: () => void;
}

const FAQS = [
  {
    question: "Est-ce un livre physique ?",
    answer: "Absolument ! C'est un véritable album relié de haute qualité (couverture rigide ou souple) que vous recevrez par la poste."
  },
  {
    question: "Pour quel âge ?",
    answer: "C'est parfait pour les enfants de 1 à 10 ans. Les histoires sont douces, positives et faciles à comprendre."
  },
  {
    question: "Puis-je voir le résultat avant d'acheter ?",
    answer: "Oui ! Vous pouvez prévisualiser l'intégralité du livre personnalisé gratuitement sur votre écran avant de commander."
  }
];

const STEPS = [
  {
    icon: <PenTool size={32} className="text-white" />,
    title: "1. Tu configures",
    desc: "Choisis le prénom, l'âge et l'apparence du personnage.",
    color: "bg-accent-sun"
  },
  {
    icon: <Sparkles size={32} className="text-white" />,
    title: "2. Tu prévisualises",
    desc: "Découvre instantanément ton histoire personnalisée à l'écran.",
    color: "bg-accent-melon"
  },
  {
    icon: <Gift size={32} className="text-white" />,
    title: "3. Tu reçois ton livre",
    desc: "Un magnifique album papier imprimé avec soin, livré dans ta boîte aux lettres.",
    color: "bg-cloud-sky"
  }
];

const CloudLogo = () => (
  <div className="relative w-12 h-12 flex items-center justify-center">
     <div className="absolute inset-0 text-cloud-blue drop-shadow-lg">
        <Cloud fill="currentColor" size={48} strokeWidth={0} />
     </div>
     <div className="relative z-10 text-white font-display font-black text-xl mb-1">
        W
     </div>
     <div className="absolute -top-1 -right-1 text-accent-sun animate-pulse">
        <Sparkles size={16} fill="currentColor" />
     </div>
  </div>
);

interface BookCardInfoProps {
  features?: {
    languages?: (string | { code: string; label: string })[];
    customization?: string[];
    pages?: number;
    formats?: string[];
    dimensions?: { width: number; height: number };
    printConfig?: any;
  };
}

const BookCardInfo: React.FC<BookCardInfoProps> = ({ features }) => {
  if (!features) return null;

  const getLanguageLabels = (languages: (string | { code: string; label: string })[]) => {
    return languages.map(lang => typeof lang === 'string' ? lang : lang.label).join(', ');
  };

  return (
  <div className="mb-4" onClick={(e) => e.stopPropagation()}>
    <details className="group/info">
      <summary className="cursor-pointer text-[11px] font-bold text-cloud-dark/60 hover:text-cloud-blue flex items-center justify-between transition-colors list-none outline-none select-none py-1">
         <span>Plus d'informations</span>
         <ChevronDown size={14} className="group-open/info:rotate-180 transition-transform" />
      </summary>
      <div className="mt-2 text-[10px] text-cloud-dark/60 space-y-2 pb-2 border-t border-dashed border-gray-100 pt-2 leading-relaxed animate-fade-in cursor-text">
         {features.languages && features.languages.length > 0 && (
           <div>
             <span className="font-bold block text-cloud-dark/80 mb-0.5">Langues:</span>
             {getLanguageLabels(features.languages)}
           </div>
         )}
         {features.customization && features.customization.length > 0 && (
           <div>
             <span className="font-bold block text-cloud-dark/80 mb-0.5">Personnalisation:</span>
             {features.customization.join(', ')}
           </div>
         )}
         <div className="grid grid-cols-2 gap-2">
             {features.pages && (
               <div>
                 <span className="font-bold block text-cloud-dark/80 mb-0.5">Pages:</span> {features.pages}
               </div>
             )}
             {features.formats && features.formats.length > 0 && (
               <div>
                 <span className="font-bold block text-cloud-dark/80 mb-0.5">Format:</span>
                 {features.formats.map((f, i) => <div key={i}>{f}</div>)}
               </div>
             )}
         </div>
      </div>
    </details>
  </div>
  );
};

const Hero: React.FC<HeroProps> = ({ onStart, onAdminClick }) => {
  const { books } = useBooks(); // Use the context to get the books
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const visibleBooks = books.filter(b => !b.isHidden);
  const themeCards = visibleBooks.filter(b => b.category === 'theme');
  const activityCards = visibleBooks.filter(b => b.category === 'activity');
  const familyCards = visibleBooks.filter(b => b.category === 'family');
  const occasionCards = visibleBooks.filter(b => b.category === 'occasion');

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
     <div className="min-h-screen flex flex-col font-sans overflow-x-hidden">
        {/* --- NAVBAR --- */}
        <Navigation onStart={() => onStart()} />
        {/* --- BANNER --- */}
        <Banner />
        {/* --- HERO SECTION --- */}
        <header className="pt-11 pb-[90px] px-6 max-w-7xl mx-auto w-full relative">
          {/* Floating Clouds Decoration */}
          <div className="absolute top-32 left-10 text-white opacity-60 animate-float pointer-events-none"><Cloud size={100} fill="currentColor" /></div>
          <div className="absolute top-52 right-20 text-white opacity-40 animate-float-delayed pointer-events-none"><Cloud size={80} fill="currentColor" /></div>
          <div className="absolute bottom-20 left-1/4 text-white opacity-50 animate-float pointer-events-none"><Cloud size={120} fill="currentColor" /></div>

          <div className="text-center max-w-4xl mx-auto relative z-10">
             <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white text-cloud-blue text-sm font-bold uppercase tracking-wider mb-8 shadow-cloud animate-fade-in-up border border-cloud-light">
                <Star size={16} className="text-accent-sun" fill="currentColor" /> La magie de la lecture
             </div>
             
             <h1 className="text-5xl md:text-8xl font-display font-black text-cloud-dark mb-8 leading-[0.9] text-balance tracking-tight drop-shadow-sm" style={{ fontSize: '50px' }}>
               Des livres <span className="text-cloud-blue relative inline-block">
                 personnalisés
                 <svg className="absolute w-full h-4 -bottom-1 left-0 text-accent-sun opacity-100" viewBox="0 0 100 10" preserveAspectRatio="none">
                   <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                 </svg>
               </span> pour petits et grands
             </h1>
             
             <p className="text-xl md:text-2xl text-cloud-dark/70 font-medium mb-12 leading-relaxed text-balance max-w-2xl mx-auto">Choisissez un univers, créez son avatar, et hop ! 
             Une histoire magique s'écrit sous vos yeux.</p>
             
             <button 
               onClick={() => onStart()}
               className="inline-flex items-center gap-3 px-10 py-6 bg-cloud-blue text-white rounded-full text-2xl font-display font-black hover:bg-cloud-deep hover:scale-105 transition-all shadow-cloud-hover group"
             >
               Commencer l'aventure <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
             </button>
             
             <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm font-bold text-cloud-dark/50">
                <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full"><CheckCircle size={20} className="text-accent-mint" /> 100% Personnalisé</span>
                <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full"><CheckCircle size={20} className="text-accent-mint" /> Magie Instantanée</span>
             </div>
          </div>
        </header>
        {/* --- WAVE SEPARATOR --- */}
        <div className="relative">
           <div className="cloud-separator-bottom">
              <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
              </svg>
           </div>
        </div>
        {/* --- STOREFRONT SECTION (Themes & Activities) --- */}
        <section id="themes" className="py-24 px-6 bg-white relative z-10">
          <div className="max-w-7xl mx-auto">
            
            {/* FAMILY COLLECTION */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-display font-black text-cloud-dark mb-4" style={{ fontSize: '35px' }}>Notre collection pour la famille</h2>
              <p className="text-xl text-cloud-dark/60 font-medium">Des histoires pour célébrer ceux qu'on aime</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 max-w-7xl mx-auto justify-center">
              {familyCards.map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => onStart(undefined, undefined, card.name)}
                  className="group flex flex-col bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full cursor-pointer hover:-translate-y-1"
                >
                  {/* Image Container */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                      {card.coverImage ? (
                        <img 
                          src={card.coverImage} 
                          alt={card.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300">
                          <BookOpen size={48} />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cloud-dark shadow-sm flex items-center gap-1">
                          <Heart size={12} className="text-accent-melon fill-current" />
                          Nouveau
                      </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-grow">
                     <div className="text-xs font-bold text-cloud-blue uppercase tracking-wider mb-1">{card.badgeText}</div>
                     <h3 className="text-2xl font-display font-black text-cloud-dark leading-tight mb-2">{card.name}</h3>
                     <p className="text-cloud-dark/60 text-sm font-medium mb-4 leading-relaxed">
                        {card.description}
                     </p>
                     
                     <BookCardInfo features={card.features} />
                     
                     <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-bold line-through">{card.oldPrice && formatPrice(card.oldPrice)}</span>
                            <span className="text-xl font-black text-accent-melon">{formatPrice(card.price)}</span>
                        </div>
                        <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex items-center gap-2">
                            <PenTool size={14} />
                            Créer
                        </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* THEMES */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-display font-black text-cloud-dark mb-4" style={{ fontSize: '35px' }}>Nos Univers Magiques</h2>
              <p className="text-xl text-cloud-dark/60 font-medium">Choisissez le monde préféré de votre enfant</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 max-w-7xl mx-auto">
              {themeCards.map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => onStart(card.theme, undefined, card.name)}
                  className="group flex flex-col bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full cursor-pointer hover:-translate-y-1"
                >
                  {/* Image Container */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                      {card.coverImage ? (
                        <img 
                          src={card.coverImage} 
                          alt={card.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300">
                          <BookOpen size={48} />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cloud-dark shadow-sm flex items-center gap-1">
                          <Star size={12} className="text-accent-sun fill-current" />
                          Best-seller
                      </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-grow">
                     <div className="text-xs font-bold text-cloud-blue uppercase tracking-wider mb-1">{card.badgeText}</div>
                     <h3 className="text-2xl font-display font-black text-cloud-dark leading-tight mb-2">{card.name}</h3>
                     <p className="text-cloud-dark/60 text-sm font-medium mb-4 leading-relaxed">
                        {card.description}
                     </p>
                     
                     <BookCardInfo features={card.features} />
                     
                     <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-bold line-through">{card.oldPrice && formatPrice(card.oldPrice)}</span>
                            <span className="text-xl font-black text-accent-melon">{formatPrice(card.price)}</span>
                        </div>
                        <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex items-center gap-2">
                            <PenTool size={14} />
                            Créer
                        </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ACTIVITIES */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-black text-cloud-dark mb-4" style={{ fontSize: '35px' }}>Ou choisissez par Passion</h2>
              <p className="text-xl text-cloud-dark/60 font-medium">Une histoire qui commence avec ce qu'ils aiment</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
               {activityCards.map((activity, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onStart(undefined, activity.id as any, activity.name)}
                    className="group flex flex-col bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full cursor-pointer hover:-translate-y-1"
                  >
                    {/* Image Container */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                        {activity.coverImage ? (
                          <img 
                            src={activity.coverImage} 
                            alt={activity.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300">
                            <BookOpen size={48} />
                          </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow">
                       <div className="text-xs font-bold text-cloud-blue uppercase tracking-wider mb-1">{activity.badgeText}</div>
                       <h3 className="text-2xl font-display font-black text-cloud-dark leading-tight mb-2">{activity.name}</h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-4 leading-relaxed">
                          {activity.description}
                       </p>
                       
                       <BookCardInfo features={activity.features} />
                       
                       <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex flex-col">
                              <span className="text-xs text-gray-400 font-bold line-through">{activity.oldPrice && formatPrice(activity.oldPrice)}</span>
                              <span className="text-xl font-black text-accent-melon">{formatPrice(activity.price)}</span>
                          </div>
                          <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex items-center gap-2">
                              <PenTool size={14} />
                              Créer
                          </button>
                       </div>
                    </div>
                  </div>
               ))}
            </div>

            {/* OCCASIONS */}
            <div className="text-center mb-16 mt-24">
              <h2 className="text-3xl md:text-4xl font-display font-black text-cloud-dark mb-4" style={{ fontSize: '35px' }}>Pour toutes les occasions</h2>
              <p className="text-xl text-cloud-dark/60 font-medium">Le cadeau idéal pour marquer les grands moments</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
               {occasionCards.map((occasion, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onStart(undefined, undefined, occasion.name)}
                    className="group flex flex-col bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full cursor-pointer hover:-translate-y-1"
                  >
                    {/* Image Container */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                        {occasion.coverImage ? (
                          <img 
                            src={occasion.coverImage} 
                            alt={occasion.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300">
                            <BookOpen size={48} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cloud-dark shadow-sm flex items-center gap-1">
                            <Gift size={12} className="text-accent-melon fill-current" />
                            Célébration
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow">
                       <div className="text-xs font-bold text-cloud-blue uppercase tracking-wider mb-1">{occasion.badgeText}</div>
                       <h3 className="text-2xl font-display font-black text-cloud-dark leading-tight mb-2">{occasion.name}</h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-4 leading-relaxed">
                          {occasion.description}
                       </p>
                       
                       <BookCardInfo features={occasion.features} />
                       
                       <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex flex-col">
                              <span className="text-xs text-gray-400 font-bold line-through">{occasion.oldPrice && formatPrice(occasion.oldPrice)}</span>
                              <span className="text-xl font-black text-accent-melon">{formatPrice(occasion.price)}</span>
                          </div>
                          <button className="bg-[#0c4a6e] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex items-center gap-2">
                              <PenTool size={14} />
                              Créer
                          </button>
                       </div>
                    </div>
                  </div>
               ))}
            </div>

          </div>
        </section>
        {/* --- HOW IT WORKS SECTION --- */}
        <section id="how-it-works" className="py-24 px-6 bg-cloud-lightest relative overflow-hidden">
          {/* Top Wave */}
          <div className="cloud-separator-top">
               <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                   <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
               </svg>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 pt-10">
             <div className="text-center mb-20">
               <h2 className="text-4xl md:text-5xl font-display font-black text-cloud-dark mb-4" style={{ fontSize: '35px' }}>C'est facile comme tout !</h2>
               <p className="text-xl text-cloud-dark/60 font-medium">Trois petites étapes et l'histoire commence.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-white border-b-2 border-dashed border-cloud-sky z-0"></div>

                {STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center relative z-10">
                     <div className={`w-24 h-24 ${step.color} rounded-full flex items-center justify-center shadow-cloud mb-8 transform hover:scale-110 transition-transform`}>
                        {step.icon}
                     </div>
                     <h3 className="text-2xl font-display font-black text-cloud-dark mb-3">{step.title}</h3>
                     <p className="text-lg text-cloud-dark/60 font-bold leading-relaxed max-w-xs">{step.desc}</p>
                  </div>
                ))}
             </div>
          </div>
        </section>
        {/* --- FEATURES / REASSURANCE --- */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="bg-cloud-lightest rounded-[3rem] p-12 md:p-16 relative overflow-hidden">
               {/* Decor */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-cloud-blue/10 rounded-full -mr-20 -mt-20"></div>
               <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent-melon/10 rounded-full -ml-10 -mb-10"></div>

               <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                  <div>
                     <h2 className="text-3xl md:text-4xl font-display font-black text-cloud-dark mb-6">Pourquoi les parents et les enfants nous adorent ?</h2>
                     <div className="space-y-6">
                        <div className="flex gap-4">
                           <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><ShieldCheck className="text-cloud-blue" /></div>
                           <div>
                              <h4 className="font-bold text-xl text-cloud-dark mb-1">Contenu Bienveillant</h4>
                              <p className="text-cloud-dark/60 font-medium">Nos histoires sont soigneusement écrites pour être positives, douces et adaptées aux enfants.</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Heart className="text-accent-melon" /></div>
                           <div>
                              <h4 className="font-bold text-xl text-cloud-dark mb-1">Estime de soi</h4>
                              <p className="text-cloud-dark/60 font-medium">Chacun est au cœur de l'histoire, ce qui renforce le plaisir de la lecture.</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Zap className="text-accent-sun" /></div>
                           <div>
                              <h4 className="font-bold text-xl text-cloud-dark mb-1">Magie Instantanée</h4>
                              <p className="text-cloud-dark/60 font-medium">Pas besoin d'attendre la livraison. L'histoire est prête à lire tout de suite.</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-8 shadow-cloud rotate-2 hover:rotate-0 transition-transform duration-500 border-4 border-cloud-lightest">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-accent-melon rounded-full"></div>
                        <div>
                           <div className="font-bold text-cloud-dark">Sophie, maman de Léo</div>
                           <div className="flex text-accent-sun"><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
                        </div>
                     </div>
                     <p className="text-lg text-cloud-dark/70 italic font-medium">
                        "C'est incroyable ! Léo a adoré se voir en astronaute. Il m'a demandé de lui relire l'histoire 3 fois de suite avant de dormir."
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </section>
        {/* --- FAQ SECTION --- */}
        <section className="py-24 px-6 bg-white relative">
          <div className="max-w-3xl mx-auto">
             <div className="text-center mb-16">
                <h2 className="text-4xl font-display font-black text-cloud-dark mb-4">Petites Curiosités</h2>
                <p className="text-xl text-cloud-dark/60 font-medium">On répond à vos questions</p>
             </div>
             
             <div className="space-y-4">
                {FAQS.map((faq, index) => (
                  <div key={index} className="bg-cloud-lightest rounded-2xl overflow-hidden transition-all duration-300">
                     <button 
                        onClick={() => toggleFaq(index)}
                        className="w-full px-8 py-6 flex items-center justify-between text-left font-bold text-xl text-cloud-dark hover:text-cloud-blue transition-colors"
                     >
                        {faq.question}
                        {openFaq === index ? <ChevronUp className="text-cloud-blue" /> : <ChevronDown className="text-cloud-dark/30" />}
                     </button>
                     {openFaq === index && (
                        <div className="px-8 pb-8 text-lg text-cloud-dark/70 font-medium leading-relaxed animate-fade-in">
                           {faq.answer}
                        </div>
                     )}
                  </div>
                ))}
             </div>
          </div>
        </section>
        {/* --- FOOTER --- */}
        <footer className="bg-cloud-dark text-cloud-lightest py-20 px-6 mt-auto">
           <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2">
                 <div className="flex items-center gap-2 mb-6 text-white">
                    <Cloud fill="currentColor" /> <span className="font-display font-black text-2xl">NuageBook</span>
                 </div>
                 <p className="text-cloud-light/60 font-medium text-lg max-w-sm mb-8">
                    Nous créons des moments magiques de lecture pour les enfants du monde entier.
                 </p>
                 <div className="flex gap-4">
                    {/* Social Placeholders */}
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 cursor-pointer"><span className="font-black">I</span></div>
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 cursor-pointer"><span className="font-black">F</span></div>
                 </div>
              </div>
              
              <div>
                 <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Explorer</h4>
                 <ul className="space-y-4 font-medium text-cloud-light/60">
                    <li className="hover:text-white cursor-pointer transition-colors">Accueil</li>
                    <li className="hover:text-white cursor-pointer transition-colors">Histoires</li>
                    <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
                    <li className="hover:text-white cursor-pointer transition-colors">À propos</li>
                 </ul>
              </div>

              <div>
                 <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Légal</h4>
                 <ul className="space-y-4 font-medium text-cloud-light/60">
                    <li className="hover:text-white cursor-pointer transition-colors">Confidentialité</li>
                    <li className="hover:text-white cursor-pointer transition-colors">CGU</li>
                    <li className="hover:text-white cursor-pointer transition-colors">Mentions Légales</li>
                 </ul>
              </div>
           </div>
           <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center text-cloud-light/40 font-bold text-sm">
              © 2024 NuageBook. Fait avec <Heart size={14} className="inline mx-1 text-accent-melon" fill="currentColor" /> pour les rêveurs.
           </div>
        </footer>
     </div>
  );
};

export default Hero;
