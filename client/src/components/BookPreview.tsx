import React, { useState, useEffect } from 'react';
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
  
  // Logic to build sheets
  // Sheet 0: Front=Cover, Back=InnerLeft
  // Sheet 1: Front=Dedication, Back=Story1Img
  // Sheet 2: Front=Story1Txt, Back=Story2Img
  // ...
  
  const [currentSheet, setCurrentSheet] = useState(0);

  // PREPARE PAGES CONTENT
  const pages: { front: React.ReactNode, back: React.ReactNode }[] = [];

  // Sheet 0: Cover / Inner (Blank/Quote)
  pages.push({
    front: (
      <div className="w-full h-full relative flex flex-col items-center justify-center text-white p-6 text-center overflow-hidden bg-cloud-blue border-[12px] border-white shadow-inner">
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
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 text-6xl shadow-xl animate-bounce">
                  ✨
              </div>
              <h1 className="font-display font-black text-4xl md:text-5xl mb-4 drop-shadow-md text-white leading-tight">{story.title}</h1>
              <div className="bg-white/20 px-6 py-2 rounded-full text-lg font-bold backdrop-blur-sm border border-white/30">
                  Une aventure de {config.childName}
              </div>
              
              <div className="mt-12 animate-pulse">
                  <span className="text-white/80 font-bold uppercase tracking-widest text-sm">Ouvrir le livre</span>
              </div>
          </div>
      </div>
    ),
    back: (
      <div className="w-full h-full flex items-center justify-center p-10 bg-cloud-lightest relative border-[12px] border-white shadow-inner">
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/5 to-transparent"></div>
          <div className="text-center opacity-80">
              <h3 className="font-hand text-2xl text-accent-melon mb-2 font-bold">Cette histoire appartient à</h3>
              <div className="font-display text-4xl text-cloud-dark font-black my-4 border-b-2 border-cloud-dark/10 pb-2 inline-block min-w-[200px]">
                  {config.childName}
              </div>
          </div>
      </div>
    )
  });

  // Sheet 1: Dedication / Story 1 Img
  pages.push({
    front: (
      <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-white relative border-[12px] border-white shadow-inner">
          <h1 className="font-display font-black text-3xl text-cloud-dark mb-4 text-center">{story.title}</h1>
          <div className="w-16 h-1 bg-accent-sun rounded-full mb-8"></div>
          <p className="font-display text-xl text-cloud-dark leading-relaxed italic text-center px-4">
              "{config.dedication || `Pour ${config.childName}, que tes rêves soient aussi grands que ton imagination.`}"
          </p>
      </div>
    ),
    back: (
      <div className="w-full h-full bg-white p-4 flex items-center justify-center border-[12px] border-white relative shadow-inner">
          <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner bg-cloud-lightest flex items-center justify-center border-2 border-cloud-lightest">
            {story.pages[0]?.imageUrl && <img src={story.pages[0].imageUrl} className="w-full h-full object-cover" alt="Page 1" />}
          </div>
          <div className="absolute bottom-6 left-8 text-cloud-dark/20 font-bold text-xs">Page 1</div>
      </div>
    )
  });

  // Story Pages loop
  // We processed Story 1 Img (Page 0) as Back of Sheet 1.
  // Next is Story 1 Text (Right) -> Front of Sheet 2.
  // Story 2 Img (Left) -> Back of Sheet 2.
  
  // Loop through remaining pages
  for (let i = 0; i < story.pages.length; i++) {
     // If it's the first page, we already used its Image on Sheet 1 Back.
     // So we need its Text on Sheet 2 Front.
     
     // Actually, let's map logically.
     // Pair i: [Story[i].Text, Story[i+1]?.Image]
     
     const currentText = story.pages[i].text;
     const nextImage = story.pages[i+1]?.imageUrl;
     
     pages.push({
       front: (
        <div className="w-full h-full bg-white p-8 md:p-12 flex flex-col justify-center relative border-[12px] border-white shadow-inner">
             <p className="font-display font-medium text-lg md:text-xl leading-loose text-cloud-dark text-balance">
                {currentText}
             </p>
             <div className="absolute bottom-6 right-8 text-cloud-dark/20 font-bold text-xs">Page {i * 2 + 2}</div>
        </div>
       ),
       back: nextImage ? (
        <div className="w-full h-full bg-white p-4 flex items-center justify-center border-[12px] border-white relative shadow-inner">
             <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner bg-cloud-lightest flex items-center justify-center border-2 border-cloud-lightest">
                <img src={nextImage} className="w-full h-full object-cover" alt={`Page ${i * 2 + 3}`} />
             </div>
             <div className="absolute bottom-6 left-8 text-cloud-dark/20 font-bold text-xs">Page {i * 2 + 3}</div>
        </div>
       ) : (
         // End of story back page
         <div className="w-full h-full bg-cloud-blue flex items-center justify-center text-white border-[12px] border-white shadow-inner">
            <h2 className="font-display font-black text-4xl">Fin</h2>
         </div>
       )
     });
  }

  // Final Sheet: Back Cover
  pages.push({
    front: (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center border-[12px] border-white shadow-inner p-8 text-center">
         <h2 className="font-display font-black text-2xl text-cloud-dark mb-4">Merci d'avoir lu !</h2>
         <button onClick={onReset} className="bg-brand-coral text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
             Créer un autre livre
         </button>
      </div>
    ),
    back: (
      <div className="w-full h-full bg-cloud-dark border-[12px] border-white flex items-center justify-center shadow-inner">
         <Cloud size={48} className="text-white/20" />
      </div>
    )
  });

  const totalSheets = pages.length;

  const nextSheet = () => {
    if (currentSheet < totalSheets) setCurrentSheet(c => c + 1);
  };

  const prevSheet = () => {
    if (currentSheet > 0) setCurrentSheet(c => c - 1);
  };

  return (
    <div className="min-h-screen bg-cloud-light flex flex-col items-center justify-center py-4 px-4 relative overflow-hidden font-sans">
      
      {/* Background Clouds */}
      <div className="absolute top-10 left-10 text-white opacity-40 animate-float"><Cloud size={100} fill="currentColor" /></div>
      <div className="absolute bottom-20 right-20 text-white opacity-60 animate-float-delayed"><Cloud size={150} fill="currentColor" /></div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <button onClick={onReset} className="pointer-events-auto flex items-center text-cloud-dark/60 hover:text-cloud-blue transition-colors gap-2 text-sm font-black bg-white/50 px-4 py-2 rounded-full hover:bg-white backdrop-blur-sm">
            <ArrowLeft size={18} /> Quitter
        </button>
      </div>

      {/* STAGE */}
      <div className="relative z-10 flex items-center justify-center h-[600px] w-full perspective-[1500px]">
        
        {/* Nav Buttons */}
        <button 
            onClick={prevSheet} 
            disabled={currentSheet === 0}
            className="absolute left-4 lg:left-20 top-1/2 -translate-y-1/2 w-12 h-12 bg-white text-cloud-blue rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-50 disabled:opacity-50 disabled:scale-100"
        >
            <ChevronLeft size={28} strokeWidth={3} />
        </button>
        <button 
            onClick={nextSheet} 
            disabled={currentSheet === totalSheets}
            className="absolute right-4 lg:right-20 top-1/2 -translate-y-1/2 w-12 h-12 bg-white text-cloud-blue rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-50 disabled:opacity-50 disabled:scale-100"
        >
            <ChevronRight size={28} strokeWidth={3} />
        </button>

        {/* BOOK CONTAINER */}
        <div className="relative w-[400px] h-[600px] preserve-3d">
            {pages.map((page, index) => {
                const zIndex = index < currentSheet ? index : totalSheets - index;
                const flipped = index < currentSheet;
                
                return (
                    <div 
                        key={index}
                        className="absolute inset-0 w-full h-full transform-style-3d transition-transform duration-700 ease-in-out origin-left"
                        style={{ 
                            transform: flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                            zIndex: zIndex
                        }}
                    >
                        {/* FRONT FACE */}
                        <div 
                            className="absolute inset-0 w-full h-full backface-hidden bg-white"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            {page.front}
                        </div>

                        {/* BACK FACE */}
                        <div 
                            className="absolute inset-0 w-full h-full backface-hidden bg-white"
                            style={{ 
                                backfaceVisibility: 'hidden', 
                                transform: 'rotateY(180deg)' 
                            }}
                        >
                            {page.back}
                        </div>
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
};

export default BookPreview;
