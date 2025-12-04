import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Home, ArrowLeft, Cloud } from 'lucide-react';
import { Story, BookConfig } from '../types';

interface BookPreviewProps {
  story: Story;
  config: BookConfig;
  onReset: () => void;
}

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, onReset }) => {
  const [pageIndex, setPageIndex] = useState(0); 
  const totalPages = story.pages.length + 2;

  const handleNext = () => {
    if (pageIndex < totalPages - 1) setPageIndex(p => p + 1);
  };

  const handlePrev = () => {
    if (pageIndex > 0) setPageIndex(p => p - 1);
  };

  return (
    <div className="min-h-screen bg-cloud-light flex flex-col items-center justify-center py-8 px-4 relative overflow-hidden font-sans">
      
      {/* Background Clouds */}
      <div className="absolute top-10 left-10 text-white opacity-40 animate-float"><Cloud size={100} fill="currentColor" /></div>
      <div className="absolute bottom-20 right-20 text-white opacity-60 animate-float-delayed"><Cloud size={150} fill="currentColor" /></div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <button onClick={onReset} className="flex items-center text-cloud-dark/60 hover:text-cloud-blue transition-colors gap-2 text-sm font-black bg-white/50 px-4 py-2 rounded-full hover:bg-white backdrop-blur-sm">
            <ArrowLeft size={18} /> Quitter
        </button>
      </div>

      {/* Book Stage */}
      <div className="relative w-full max-w-6xl aspect-[16/10] flex items-center justify-center z-10 perspective-1000">
        
        {/* Nav Buttons (Floating) */}
        <button 
            onClick={handlePrev} 
            disabled={pageIndex === 0}
            className="absolute left-4 lg:-left-12 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-cloud-blue rounded-full flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-0 disabled:scale-0 transition-all z-50"
        >
            <ChevronLeft size={32} strokeWidth={3} />
        </button>
        <button 
            onClick={handleNext} 
            disabled={pageIndex === totalPages - 1}
            className="absolute right-4 lg:-right-12 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-cloud-blue rounded-full flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-0 disabled:scale-0 transition-all z-50"
        >
            <ChevronRight size={32} strokeWidth={3} />
        </button>

        {/* THE BOOK */}
        <div className="relative w-full h-full bg-white shadow-2xl rounded-3xl overflow-hidden flex transition-all duration-500 border-8 border-white">
            
            {/* CONTENT LOGIC */}
            <div className="w-full h-full flex">
                
                {/* --- COVER VIEW --- */}
                {pageIndex === 0 && (
                    <div className="w-full h-full bg-cloud-blue flex flex-col items-center justify-center text-white relative p-10 text-center">
                        <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMCA0MEw0MCAwSDBMNDAgNDBWMHoiLz48L2c+PC9zdmc+')]"></div>
                        
                        <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mb-8 text-7xl shadow-xl animate-bounce">
                            ✨
                        </div>
                        <h1 className="font-serif font-black text-5xl md:text-7xl mb-6 drop-shadow-md">{story.title}</h1>
                        <div className="bg-white/20 px-8 py-2 rounded-full text-xl font-bold backdrop-blur-sm">
                            Une aventure de {config.childName}
                        </div>
                        
                        <div className="mt-12">
                            <button onClick={handleNext} className="bg-accent-sun text-yellow-900 px-8 py-4 rounded-2xl font-black text-xl hover:scale-105 hover:shadow-lg transition-all shadow-md">
                                Ouvrir le livre
                            </button>
                        </div>
                    </div>
                )}

                {/* --- DEDICATION VIEW --- */}
                {pageIndex === 1 && (
                    <div className="w-full h-full flex items-center justify-center p-12 bg-cloud-lightest relative">
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/5 to-transparent"></div>
                        <div className="bg-white p-12 rounded-[3rem] shadow-sm max-w-2xl text-center border-4 border-cloud-light/30">
                            <h3 className="font-serif text-4xl text-accent-melon mb-6 font-bold">Pour toi...</h3>
                            <p className="font-serif text-3xl text-cloud-dark leading-relaxed">
                                "{config.dedication || `Voici une histoire magique créée spécialement pour ${config.childName}.`}"
                            </p>
                            <div className="mt-8 text-cloud-dark/40 font-bold uppercase tracking-widest text-sm">Bonne lecture</div>
                        </div>
                    </div>
                )}

                {/* --- STORY PAGES --- */}
                {pageIndex >= 2 && (
                    <>
                        {/* LEFT: IMAGE */}
                        <div className="w-full md:w-1/2 h-full bg-white p-6 flex items-center justify-center relative border-r-2 border-slate-100">
                             <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-inner bg-cloud-lightest flex items-center justify-center border-4 border-cloud-lightest">
                                {story.pages[pageIndex - 2].imageUrl ? (
                                    <img 
                                        src={story.pages[pageIndex - 2].imageUrl} 
                                        className="w-full h-full object-cover" 
                                        alt="Illustration" 
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-cloud-blue/50">
                                        <Cloud size={64} className="animate-pulse mb-4" />
                                        <span className="font-bold text-lg animate-pulse">Magie en cours...</span>
                                    </div>
                                )}
                             </div>
                             <div className="absolute bottom-4 left-8 text-cloud-dark/20 font-bold text-sm">Page {pageIndex - 1}</div>
                        </div>

                        {/* RIGHT: TEXT */}
                        <div className="w-full md:w-1/2 h-full bg-white p-8 md:p-16 flex flex-col justify-center relative">
                             <p className="font-serif font-medium text-2xl md:text-3xl leading-loose text-cloud-dark text-balance">
                                {story.pages[pageIndex - 2].text}
                             </p>
                             <div className="absolute bottom-4 right-8 text-cloud-dark/20 font-bold text-sm">Page {pageIndex}</div>
                        </div>
                    </>
                )}

            </div>
        </div>
      </div>
      
      {/* Progress Dots */}
      <div className="mt-8 flex gap-3 relative z-10 bg-white/30 px-6 py-3 rounded-full backdrop-blur-sm">
         {Array.from({ length: totalPages }).map((_, i) => (
             <div 
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i === pageIndex ? 'bg-cloud-blue scale-125' : 'bg-white'}`}
             />
         ))}
      </div>

    </div>
  );
};

export default BookPreview;
