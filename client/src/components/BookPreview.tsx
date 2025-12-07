import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Cloud, Heart, Settings, BookOpen, Check } from 'lucide-react';
import { Story, BookConfig } from '../types';
import { useBooks } from '../context/BooksContext';
import Navigation from './Navigation';

import Footer from './Footer';

interface BookPreviewProps {
  story: Story;
  config: BookConfig;
  onReset: () => void;
  onStart: () => void;
  onAdminClick?: () => void;
}

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, onReset, onStart, onAdminClick }) => {
  const { books } = useBooks();
  const book = books.find(b => b.name === story.title);

  const [currentView, setCurrentView] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [dedication, setDedication] = useState(config.dedication || '');

  const totalSpreads = Math.ceil(story.pages.length / 2); 
  const totalViews = 1 + 1 + totalSpreads + 1; // Cover + Intro + StorySpreads + Back

  const handleNext = () => {
    if (currentView < totalViews - 1 && !isFlipping) {
      setIsFlipping(true);
      setDirection('next');
      setTimeout(() => {
        setCurrentView(c => c + 1);
        setIsFlipping(false);
        setDirection(null);
      }, 1500); // Match CSS duration
    }
  };

  const handlePrev = () => {
    if (currentView > 0 && !isFlipping) {
      setIsFlipping(true);
      setDirection('prev');
      setTimeout(() => {
        setCurrentView(c => c - 1);
        setIsFlipping(false);
        setDirection(null);
      }, 1500);
    }
  };

  // --- CONTENT GENERATORS ---

  const getSpreadContent = (index: number) => {
    // 0: Cover
    if (index === 0) {
      return {
        left: <div className="w-full h-full bg-transparent" />, // Empty space left of cover
        right: (
          <div className="w-full h-full relative flex flex-col items-center justify-center text-white p-6 text-center overflow-hidden bg-cloud-blue shadow-inner">
             {/* Spine Gradient */}
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/30 to-transparent z-20 pointer-events-none"></div>
             
             {book?.coverImage ? (
                <>
                    <div className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-60" style={{ backgroundImage: `url(${book.coverImage})` }}></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                </>
             ) : (
                <div className="absolute inset-0 bg-cloud-blue">
                     <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMCA0MEw0MCAwSDBMNDAgNDBWMHoiLz48L2c+PC9zdmc+')]"></div>
                </div>
             )}
    
             <div className="relative z-10 flex flex-col items-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 text-6xl shadow-xl">✨</div>
                <h1 className="font-display font-black text-4xl md:text-5xl mb-4 drop-shadow-md text-white leading-tight">{story.title}</h1>
                <div className="bg-white/20 px-6 py-2 rounded-full text-lg font-bold backdrop-blur-sm border border-white/30">
                    Une aventure de {config.childName}
                </div>
                <div className="mt-12 animate-pulse text-white/80 font-bold uppercase tracking-widest text-sm">Ouvrir le livre</div>
             </div>
          </div>
        )
      };
    }

    // 1: Intro
    if (index === 1) {
      return {
        left: (
          <div className="w-full h-full flex items-center justify-center p-12 bg-cloud-lightest relative shadow-inner">
             <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
             <div className="text-center opacity-80">
                <h3 className="font-hand text-2xl text-accent-melon mb-2 font-bold">Cette histoire appartient à</h3>
                <div className="font-display text-4xl text-cloud-dark font-black my-4 border-b-2 border-cloud-dark/10 pb-2 inline-block min-w-[200px]">{config.childName}</div>
                <p className="font-display text-lg text-cloud-dark/60 italic mt-8 px-4 whitespace-pre-wrap">
                    "{dedication || config.dedication || `Pour ${config.childName}, que tes rêves soient aussi grands que ton imagination.`}"
                </p>
             </div>
          </div>
        ),
        right: (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white relative shadow-inner">
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
             <h1 className="font-display font-black text-4xl text-cloud-dark mb-4 text-center leading-tight">{story.title}</h1>
             <div className="w-20 h-1.5 bg-accent-sun rounded-full mb-8"></div>
             <div className="text-cloud-blue font-bold text-xl">Écrit pour {config.childName}</div>
          </div>
        )
      };
    }

    // N: Back Cover
    if (index === totalViews - 1) {
      return {
        left: (
          <div className="w-full h-full bg-cloud-blue flex flex-col items-center justify-center text-white p-8 text-center shadow-inner">
             <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
             <h2 className="font-display font-black text-4xl mb-6">Fin</h2>
             <p className="text-white/80 text-lg mb-8">Merci d'avoir lu cette histoire !</p>
             <button onClick={onReset} className="bg-white text-cloud-blue px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                 Créer un autre livre
             </button>
          </div>
        ),
        right: (
          <div className="w-full h-full bg-cloud-dark flex items-center justify-center shadow-inner">
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
             <Cloud size={64} className="text-white/20" />
          </div>
        )
      };
    }

    // Story Spreads
    const storyIndexStart = (index - 2) * 2;
    const leftPage = story.pages[storyIndexStart];
    const rightPage = story.pages[storyIndexStart + 1];

    return {
      left: (
        <div className="w-full h-full bg-white p-6 flex flex-col justify-center relative shadow-inner">
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-10"></div>
            {leftPage ? (
                <>
                    <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-sm bg-cloud-lightest border-4 border-white">
                        {leftPage.imageUrl ? <img src={leftPage.imageUrl} className="w-full h-full object-cover" alt="Illustration" /> : <div className="w-full h-full flex items-center justify-center text-cloud-blue/30"><Cloud size={48} /></div>}
                    </div>
                    <div className="mt-6 font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">{leftPage.text}</div>
                    <div className="absolute bottom-6 left-8 text-cloud-dark/20 font-bold text-xs">Page {storyIndexStart + 1}</div>
                </>
            ) : <div className="w-full h-full flex items-center justify-center text-cloud-dark/20">Page vide</div>}
        </div>
      ),
      right: (
        <div className="w-full h-full bg-white p-6 flex flex-col justify-center relative shadow-inner">
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10"></div>
            {rightPage ? (
                <>
                    <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-sm bg-cloud-lightest border-4 border-white">
                        {rightPage.imageUrl ? <img src={rightPage.imageUrl} className="w-full h-full object-cover" alt="Illustration" /> : <div className="w-full h-full flex items-center justify-center text-cloud-blue/30"><Cloud size={48} /></div>}
                    </div>
                    <div className="mt-6 font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">{rightPage.text}</div>
                    <div className="absolute bottom-6 right-8 text-cloud-dark/20 font-bold text-xs">Page {storyIndexStart + 2}</div>
                </>
            ) : <div className="w-full h-full flex items-center justify-center bg-gray-50/50"><Cloud size={32} className="text-gray-200" /></div>}
        </div>
      )
    };
  };

  // --- SCENE COMPOSITION ---
  
  const currentSpread = getSpreadContent(currentView);
  // For animations, we need the neighbor spread
  const nextSpread = direction === 'next' ? getSpreadContent(currentView + 1) : null;
  const prevSpread = direction === 'prev' ? getSpreadContent(currentView - 1) : null;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-stone-100">
      
      {/* NAVBAR */}
      <Navigation onStart={onStart} onAdminClick={onAdminClick} />

      {/* BOOK PREVIEW AREA */}
      <div className="flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden mt-20 min-h-[800px]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")` }}>
          
          {/* Stage */}
          <div className="relative z-10 flex items-center justify-center w-full max-w-6xl h-[650px] perspective-[2500px]">
            
            {/* Arrows */}
            <button onClick={handlePrev} disabled={currentView === 0 || isFlipping} className="absolute left-4 lg:left-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 disabled:opacity-0 cursor-pointer">
                <ChevronLeft size={32} strokeWidth={2.5} />
            </button>
            <button onClick={handleNext} disabled={currentView === totalViews - 1 || isFlipping} className="absolute right-4 lg:right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 disabled:opacity-0 cursor-pointer">
                <ChevronRight size={32} strokeWidth={2.5} />
            </button>

            {/* BOOK OBJECT */}
            <div className={`relative w-[900px] h-[600px] flex shadow-2xl rounded-md preserve-3d ${currentView === 0 ? 'bg-transparent shadow-none' : 'bg-white'}`}>
                
                {/* 1. STATIC LAYER (Bottom) */}
                <div className="absolute inset-0 flex w-full h-full z-0">
                    {/* LEFT SIDE */}
                    <div className={`w-1/2 h-full border-r border-gray-200 overflow-hidden rounded-l-md ${currentView === 0 ? 'bg-transparent border-none' : 'bg-white'}`}>
                        {direction === 'next' ? currentSpread.left : (prevSpread ? prevSpread.left : currentSpread.left)}
                    </div>
                    {/* RIGHT SIDE */}
                    <div className="w-1/2 h-full bg-white overflow-hidden rounded-r-md">
                        {direction === 'prev' ? currentSpread.right : (nextSpread ? nextSpread.right : currentSpread.right)}
                    </div>
                </div>

                {/* 2. FLIPPING LAYER (Top) */}
                {isFlipping && (
                    <div className="absolute inset-0 z-20 pointer-events-none perspective-[2500px]">
                        {direction === 'next' && (
                            <div className="absolute right-0 w-1/2 h-full transform-style-3d origin-left animate-flip-next shadow-2xl">
                                {/* Front (Visible at start) */}
                                <div className="absolute inset-0 backface-hidden bg-white rounded-r-md overflow-hidden border-l border-gray-100">
                                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/5 z-20"></div>
                                    {currentSpread.right}
                                </div>
                                {/* Back (Visible at end) */}
                                <div className="absolute inset-0 backface-hidden bg-white rounded-l-md overflow-hidden border-r border-gray-100" style={{ transform: 'rotateY(180deg)' }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 z-20"></div>
                                    {nextSpread?.left}
                                </div>
                            </div>
                        )}

                        {direction === 'prev' && (
                            <div className="absolute left-0 w-1/2 h-full transform-style-3d origin-right animate-flip-prev shadow-2xl">
                                {/* Front (Visible at start) */}
                                <div className={`absolute inset-0 backface-hidden rounded-l-md overflow-hidden border-r border-gray-100 ${currentView === 1 ? 'bg-transparent border-none' : 'bg-white'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 z-20"></div>
                                    {currentSpread.left}
                                </div>
                                {/* Back (Visible at end) */}
                                <div className="absolute inset-0 backface-hidden bg-white rounded-r-md overflow-hidden border-l border-gray-100" style={{ transform: 'rotateY(-180deg)' }}>
                                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/5 z-20"></div>
                                    {prevSpread?.right}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. STATIC IDLE LAYER (Only when not flipping to prevent flicker) */}
                {!isFlipping && (
                    <div className="absolute inset-0 flex w-full h-full z-10 pointer-events-none">
                        <div className={`w-1/2 h-full border-r border-gray-200 overflow-hidden rounded-l-md ${currentView === 0 ? 'bg-transparent border-none' : 'bg-white'}`}>
                            {currentSpread.left}
                        </div>
                        <div className="w-1/2 h-full bg-white overflow-hidden rounded-r-md">
                            {currentSpread.right}
                        </div>
                    </div>
                )}

            </div>
          </div>

          {/* Modify Link */}
          <div className="relative z-10 mt-6 flex justify-center">
             <button onClick={onStart} className="text-cloud-blue font-bold text-sm hover:underline flex items-center gap-1 transition-colors hover:text-cloud-deep">
                <ChevronLeft size={16} strokeWidth={3} /> Retour à la personnalisation
             </button>
          </div>

      </div>

      {/* ORDER SECTION */}
      <section className="bg-white py-16 px-6 border-t-4 border-cloud-blue/10 relative z-10">
           <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12">
               {/* COL 1 */}
               <div>
                   <h3 className="font-display font-black text-xl text-cloud-dark mb-2">1. Ajouter une dédicace</h3>
                   <p className="text-cloud-dark/60 text-sm font-medium mb-2">Nous imprimerons votre message spécial dans votre livre</p>
                   <textarea 
                      className="w-full p-3 border-2 border-cloud-dark/10 rounded-xl font-medium text-cloud-dark focus:border-cloud-blue focus:ring-0 outline-none transition-colors bg-white resize-none text-sm mb-4"
                      rows={4}
                      placeholder="Écrivez votre message personnel ici..."
                      value={dedication}
                      onChange={(e) => setDedication(e.target.value)}
                   />
               </div>

               {/* COL 2 */}
               <div>
                   <h3 className="font-display font-black text-xl text-cloud-dark mb-2">2. Choisir le format</h3>
                   <p className="text-cloud-dark/60 text-sm font-medium mb-6 min-h-[40px]">Quel type de couverture souhaitez-vous ?</p>
                   
                   <div className="w-full p-4 border-2 border-cloud-blue bg-cloud-lightest/30 rounded-xl flex gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                       <div className="w-16 h-20 bg-cloud-blue rounded shadow-inner flex items-center justify-center text-white">
                           <BookOpen size={24} />
                       </div>
                       <div className="flex flex-col flex-1">
                           <span className="font-bold text-cloud-dark text-sm">Couverture rigide</span>
                           <span className="text-[10px] text-accent-melon font-black uppercase tracking-wider mb-1">Le plus populaire</span>
                           <p className="text-[11px] text-cloud-dark/60 leading-tight mb-2">Souvenir élégant et durable ; parfait pour des souvenirs mémorables.</p>
                           <span className="font-black text-cloud-dark">€44.99</span>
                       </div>
                       <div className="absolute top-0 right-0 bg-cloud-blue text-white p-1 rounded-bl-lg">
                           <Check size={12} strokeWidth={4} />
                       </div>
                   </div>
               </div>

               {/* COL 3 */}
               <div>
                   <h3 className="font-display font-black text-xl text-cloud-dark mb-2">3. Commande complète</h3>
                   <p className="text-cloud-dark/60 text-sm font-medium mb-6 min-h-[40px]">Veuillez sélectionner un format pour continuer</p>
                   <button className="w-full py-3 px-4 bg-cloud-blue text-white font-black text-lg rounded-xl hover:bg-cloud-deep transition-colors shadow-lg hover:scale-[1.02] active:scale-[0.98]">
                       Ajouter au panier
                   </button>
               </div>
           </div>
      </section>

      {/* FOOTER */}
      <Footer onAdminClick={onAdminClick} />

      <style>{`
        .backface-hidden { backface-visibility: hidden; }
        .transform-style-3d { transform-style: preserve-3d; }
        .perspective-2000 { perspective: 2000px; }
        
        @keyframes flip-next {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(-90deg) scale(1.1); }
            100% { transform: rotateY(-180deg); }
        }
        @keyframes flip-prev {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(90deg) scale(1.1); }
            100% { transform: rotateY(180deg); }
        }
        .animate-flip-next { animation: flip-next 1.2s cubic-bezier(0.645, 0.045, 0.355, 1) forwards; }
        .animate-flip-prev { animation: flip-prev 1.2s cubic-bezier(0.645, 0.045, 0.355, 1) forwards; }
      `}</style>
    </div>
  );
};

export default BookPreview;
