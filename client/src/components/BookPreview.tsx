import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Cloud } from 'lucide-react';
import { Story, BookConfig } from '../types';
import { useBooks } from '../context/BooksContext';

interface BookPreviewProps {
  story: Story;
  config: BookConfig;
  onReset: () => void;
}

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, onReset }) => {
  const { books } = useBooks();
  const book = books.find(b => b.name === story.title);

  // VIEW LOGIC
  // 0 = Closed Cover
  // 1 = Inner Dedication + Title Page
  // 2 = Story Spread 1
  // ...
  // Last = Back Cover
  
  const [currentView, setCurrentView] = useState(0);
  const totalSpreads = Math.ceil(story.pages.length / 2); // Pair pages
  const totalViews = 1 + 1 + totalSpreads + 1; // Cover + Intro + StorySpreads + Back

  const nextView = () => {
    if (currentView < totalViews - 1) setCurrentView(c => c + 1);
  };

  const prevView = () => {
    if (currentView > 0) setCurrentView(c => c - 1);
  };

  // --- RENDERERS ---

  const renderCover = () => (
    <div className="w-[450px] h-[600px] relative flex flex-col items-center justify-center text-white p-6 text-center overflow-hidden bg-cloud-blue rounded-r-2xl rounded-l-md shadow-2xl border-l-[16px] border-l-black/20 z-10">
        {/* Spine Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent z-20"></div>
        <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-black/10 to-transparent z-20"></div>

        {/* Dynamic Background */}
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
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 text-6xl shadow-xl">
                ✨
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl mb-4 drop-shadow-md text-white leading-tight">{story.title}</h1>
            <div className="bg-white/20 px-6 py-2 rounded-full text-lg font-bold backdrop-blur-sm border border-white/30">
                Une aventure de {config.childName}
            </div>
            
            <div className="mt-12">
                <button onClick={nextView} className="bg-white text-cloud-blue px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform animate-pulse">
                    Ouvrir le livre
                </button>
            </div>
        </div>
    </div>
  );

  const renderSpread = (leftContent: React.ReactNode, rightContent: React.ReactNode) => (
    <div className="flex shadow-2xl rounded-md overflow-hidden relative">
        {/* LEFT PAGE */}
        <div className="w-[450px] h-[600px] bg-white relative flex flex-col border-r border-gray-200">
             {/* Page Shadow Gradient (Spine) */}
             <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-10"></div>
             <div className="w-full h-full overflow-hidden">
                {leftContent}
             </div>
        </div>

        {/* RIGHT PAGE */}
        <div className="w-[450px] h-[600px] bg-white relative flex flex-col">
             {/* Page Shadow Gradient (Spine) */}
             <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-10"></div>
             <div className="w-full h-full overflow-hidden">
                {rightContent}
             </div>
        </div>
    </div>
  );

  const renderCurrentView = () => {
    // 0: Cover
    if (currentView === 0) {
        return renderCover();
    }

    // 1: Intro Spread (Dedication + Title)
    if (currentView === 1) {
        return renderSpread(
            // Left: Dedication
            <div className="w-full h-full flex items-center justify-center p-12 bg-cloud-lightest relative">
                <div className="text-center opacity-80">
                    <h3 className="font-hand text-2xl text-accent-melon mb-2 font-bold">Cette histoire appartient à</h3>
                    <div className="font-display text-4xl text-cloud-dark font-black my-4 border-b-2 border-cloud-dark/10 pb-2 inline-block min-w-[200px]">
                        {config.childName}
                    </div>
                    <p className="font-display text-lg text-cloud-dark/60 italic mt-8 px-4">
                        "{config.dedication || `Pour ${config.childName}, que tes rêves soient aussi grands que ton imagination.`}"
                    </p>
                </div>
            </div>,
            // Right: Title Page
            <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white relative">
                <h1 className="font-display font-black text-4xl text-cloud-dark mb-4 text-center leading-tight">{story.title}</h1>
                <div className="w-20 h-1.5 bg-accent-sun rounded-full mb-8"></div>
                <div className="text-cloud-blue font-bold text-xl">Écrit pour {config.childName}</div>
            </div>
        );
    }

    // N: Back Cover Spread
    if (currentView === totalViews - 1) {
        return renderSpread(
            // Left: End Message
            <div className="w-full h-full bg-cloud-blue flex flex-col items-center justify-center text-white p-8 text-center">
                 <h2 className="font-display font-black text-4xl mb-6">Fin</h2>
                 <p className="text-white/80 text-lg mb-8">Merci d'avoir lu cette histoire !</p>
                 <button onClick={onReset} className="bg-white text-cloud-blue px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                     Créer un autre livre
                 </button>
            </div>,
            // Right: Back Cover Inside (Blank/Logo)
            <div className="w-full h-full bg-cloud-dark flex items-center justify-center">
                <Cloud size={64} className="text-white/20" />
            </div>
        );
    }

    // 2..N-1: Story Spreads
    // View 2 corresponds to Story Pages 0 & 1
    // View 3 corresponds to Story Pages 2 & 3
    // Formula: storyIndexStart = (currentView - 2) * 2
    const storyIndexStart = (currentView - 2) * 2;
    const leftPage = story.pages[storyIndexStart];
    const rightPage = story.pages[storyIndexStart + 1];

    return renderSpread(
        // Left Page
        <div className="w-full h-full bg-white p-6 flex flex-col justify-center relative">
            {leftPage ? (
                <>
                    <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-sm bg-cloud-lightest border-4 border-white">
                        {leftPage.imageUrl ? (
                            <img src={leftPage.imageUrl} className="w-full h-full object-cover" alt="Illustration" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-cloud-blue/30">
                                <Cloud size={48} />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">
                        {leftPage.text}
                    </div>
                    <div className="absolute bottom-6 left-8 text-cloud-dark/20 font-bold text-xs">Page {storyIndexStart + 1}</div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-cloud-dark/20">Fin du chapitre</div>
            )}
        </div>,
        // Right Page
        <div className="w-full h-full bg-white p-6 flex flex-col justify-center relative">
             {rightPage ? (
                <>
                    <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-sm bg-cloud-lightest border-4 border-white">
                        {rightPage.imageUrl ? (
                            <img src={rightPage.imageUrl} className="w-full h-full object-cover" alt="Illustration" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-cloud-blue/30">
                                <Cloud size={48} />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">
                        {rightPage.text}
                    </div>
                    <div className="absolute bottom-6 right-8 text-cloud-dark/20 font-bold text-xs">Page {storyIndexStart + 2}</div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                    <Cloud size={32} className="text-gray-200" />
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center py-4 px-4 relative overflow-hidden font-sans">
      
      {/* Background Texture - Wood/Table effect */}
      <div className="absolute inset-0 bg-[#E5E0D8] opacity-100" style={{ backgroundImage: 'radial-gradient(#D6D1C9 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <button onClick={onReset} className="pointer-events-auto flex items-center text-stone-600 hover:text-stone-900 transition-colors gap-2 text-sm font-bold bg-white/80 px-4 py-2 rounded-full hover:bg-white shadow-sm">
            <ArrowLeft size={18} /> Quitter la lecture
        </button>
      </div>

      {/* STAGE */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-6xl">
        
        {/* Nav Buttons */}
        {currentView > 0 && (
            <button 
                onClick={prevView} 
                className="absolute left-4 lg:left-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50"
            >
                <ChevronLeft size={32} strokeWidth={2.5} />
            </button>
        )}

        {currentView < totalViews - 1 && (
            <button 
                onClick={nextView} 
                className="absolute right-4 lg:right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50"
            >
                <ChevronRight size={32} strokeWidth={2.5} />
            </button>
        )}

        {/* BOOK CONTAINER */}
        <div className="transition-all duration-500 ease-in-out">
            {renderCurrentView()}
        </div>

      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-stone-500 shadow-sm">
          Vue {currentView + 1} / {totalViews}
      </div>

    </div>
  );
};

export default BookPreview;
