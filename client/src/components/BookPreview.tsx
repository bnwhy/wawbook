import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Cloud, Heart, Settings, BookOpen, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { Story, BookConfig } from '../types';
import { BookProduct, TextElement, ImageElement } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useCart } from '../context/CartContext';
import { generateBookPages } from '../utils/imageGenerator';
import Navigation from './Navigation';
import hardcoverIcon from '@assets/generated_images/hardcover_teal_book_isometric.png';
import softcoverIcon from '@assets/generated_images/softcover_teal_book_isometric.png';

import Footer from './Footer';

interface BookPreviewProps {
  story: Story;
  config: BookConfig;
  bookProduct?: BookProduct;
  onReset: () => void;
  onStart: () => void;
  editingCartItemId?: string;
  isModal?: boolean;
}

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, bookProduct, onReset, onStart, editingCartItemId, isModal = false }) => {
  const { books } = useBooks();
  const { addToCart, updateItem } = useCart();
  const [, setLocation] = useLocation();
  const book = bookProduct || books.find(b => b.name === story.title);

  const [currentView, setCurrentView] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [dedication, setDedication] = useState(config.dedication || '');
  const [selectedFormat, setSelectedFormat] = useState<'hardcover' | 'softcover'>('hardcover');
  const [generatedPages, setGeneratedPages] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // --- HELPER: Resolve Variables ---
  const resolveTextVariable = (text: string) => {
    return text.replace(/\{([^}]+)\}/g, (match, key) => {
        if (key === 'childName') return config.childName || "l'enfant";
        
        // Handle {tabId.variantId}
        const [tabId, variantId] = key.split('.');
        if (tabId && variantId && config.characters?.[tabId]) {
            return config.characters[tabId][variantId] || match;
        }
        return match;
    });
  };

  const getCombinationKey = () => {
    if (!book?.wizardConfig?.tabs) return 'default';
    
    // Collect all option IDs from character tabs
    const optionIds: string[] = [];
    
    book.wizardConfig.tabs.forEach(tab => {
        if (tab.type === 'character' && config.characters?.[tab.id]) {
            tab.variants.forEach(v => {
                if (v.type === 'options') {
                    const selectedOptId = config.characters![tab.id][v.id];
                    if (selectedOptId) optionIds.push(selectedOptId);
                }
            });
        }
    });
    
    if (optionIds.length === 0) return 'default';
    return optionIds.join('_');
  };

  const currentCombinationKey = getCombinationKey();

  // --- GENERATE PAGES EFFECT ---
  useEffect(() => {
    if (book) {
        setIsGenerating(true);
        // Add a small delay to allow UI to render first
        const timer = setTimeout(() => {
            generateBookPages(book, config, currentCombinationKey)
                .then(pages => {
                    setGeneratedPages(pages);
                    setIsGenerating(false);
                })
                .catch(err => {
                    console.error("Failed to generate pages", err);
                    setIsGenerating(false);
                });
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [book, config, currentCombinationKey]);

  // --- DIMENSIONS & SCALE ---
  // Default to Square 210x210 if not specified
  const dims = book?.features?.dimensions || { width: 210, height: 210 };
  
  // Spread aspect ratio = (Single Page Width * 2) / Page Height
  const spreadAspectRatio = (dims.width * 2) / dims.height;
  
  // Max dimensions for the book preview container
  const MAX_W = 1080;
  const MAX_H = 720;

  let computedW = MAX_H * spreadAspectRatio;
  let computedH = MAX_H;

  // Constrain to max width if it exceeds
  if (computedW > MAX_W) {
      computedW = MAX_W;
      computedH = MAX_W / spreadAspectRatio;
  }

  // Effect to load all fonts used in the book (since BookPreview might be used standalone)
  useEffect(() => {
    // Collect all texts from all pages (and cover/back cover if configured)
    const texts: TextElement[] = [];
    if (book?.contentConfig?.texts) {
        texts.push(...book.contentConfig.texts);
    }
    
    const usedFonts = new Set<string>();
    texts.forEach(text => {
        if (text.style?.fontFamily) {
            usedFonts.add(text.style.fontFamily);
        }
    });

    usedFonts.forEach(font => {
         const href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
         if (!document.querySelector(`link[href="${href}"]`)) {
             const link = document.createElement('link');
             link.href = href;
             link.rel = 'stylesheet';
             document.head.appendChild(link);
         }
    });
  }, [book]);

  const handleAddToCart = () => {
    // Add to cart functionality
    const itemData = {
      productId: book?.id,
      bookTitle: story.title,
      config,
      dedication,
      format: selectedFormat,
      price: selectedFormat === 'hardcover' ? 44.99 : 34.99,
      quantity: 1,
      coverImage: book?.coverImage
    };

    if (editingCartItemId) {
        updateItem(editingCartItemId, itemData);
    } else {
        addToCart(itemData);
    }
    
    // Show success feedback
    const btn = document.getElementById('add-to-cart-btn');
    if(btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="flex items-center gap-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${editingCartItemId ? 'Modifié !' : 'Ajouté !'}</span>`;
        btn.classList.add('bg-green-500', 'hover:bg-green-600');
        btn.classList.remove('bg-cloud-blue', 'hover:bg-cloud-deep');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('bg-green-500', 'hover:bg-green-600');
            btn.classList.add('bg-cloud-blue', 'hover:bg-cloud-deep');
            
            // Redirect to cart
            setLocation('/cart');
        }, 1000);
    }
  };

  // Determine total views based on content source
  const getContentPages = () => {
      return book?.contentConfig?.pages || [];
  };

  const contentPages = getContentPages();
  let pageCount = contentPages.length;

  if (book?.contentConfig?.pages?.length) {
      // If using admin config, find the highest page number (excluding back cover 999)
      const validPages = book.contentConfig.pages.filter(p => p.pageNumber < 900);
      if (validPages.length > 0) {
          pageCount = Math.max(...validPages.map(p => p.pageNumber));
      }
  }

  const totalSpreads = Math.ceil(pageCount / 2); 
  
  // Check if we have custom content to decide on Intro spread visibility
  const hasCustomContent = true; // Always true for strict config mode
  
  // 0: Cover
  // 1: Intro (ONLY if !hasCustomContent)
  // [Offset]: Spreads
  // N+1: End Page (ONLY if !hasCustomContent)
  // N+2: Closed Back
  const introViewCount = hasCustomContent ? 0 : 1;
  const endViewCount = hasCustomContent ? 0 : 1;
  const totalViews = 1 + introViewCount + totalSpreads + endViewCount + 1;

  const handleNext = () => {
    if (currentView < totalViews - 1 && !isFlipping) {
      setIsFlipping(true);
      setDirection('next');
      setTimeout(() => {
        setCurrentView(c => c + 1);
        setIsFlipping(false);
        setDirection(null);
      }, 900); // Match CSS duration
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
      }, 900);
    }
  };

  // --- CONTENT GENERATORS ---

  const resolveImageUrl = (el: ImageElement) => {
      if (el.type === 'static') return el.url;
      
      if (el.type === 'variable' && el.variableKey) {
          // If variableKey is a Tab ID (e.g. "child")
          const tabId = el.variableKey;
          const tab = book?.wizardConfig?.tabs.find(t => t.id === tabId);
          
          if (tab && config.characters?.[tabId]) {
              // Construct combination key for this tab
              const optionIds: string[] = [];
              tab.variants.forEach(v => {
                 if (v.type === 'options') {
                     const selectedOptId = config.characters![tabId][v.id];
                     if (selectedOptId) optionIds.push(selectedOptId);
                 }
              });
              
              if (optionIds.length > 0) {
                  const key = optionIds.join('_');
                  // Look up in avatarMappings
                  if (book?.wizardConfig?.avatarMappings?.[key]) {
                      return book.wizardConfig.avatarMappings[key];
                  }
              }
          }
      }
      return el.url; // Fallback
  };

  const renderPageContent = (pageIndex: number, isLeft: boolean) => {
      // 1. Check if we have generated image
      if (generatedPages[pageIndex]) {
          return (
             <div className="w-full h-full relative overflow-hidden bg-white">
                 <img 
                    src={generatedPages[pageIndex]} 
                    className="w-full h-full object-contain" 
                    alt={`Page ${pageIndex}`} 
                 />
             </div>
          );
      }
      
      // 2. Loading State
      if (isGenerating) {
          return (
             <div className="w-full h-full flex items-center justify-center bg-white text-gray-300">
                <Loader2 className="animate-spin" size={32} />
             </div>
          );
      }

      // 3. Check if we have Admin Config but not yet generated (fallback to empty)
      if (book?.contentConfig?.pages) {
          return <div className="w-full h-full bg-white flex items-center justify-center text-gray-100"><BookOpen size={40} /></div>;
      }

      // 4. Fallback to Simple Story (Legacy)
      // Only if no content config is present at all
      return <div className="w-full h-full bg-white"></div>;
  };

  const getSpreadContent = (index: number) => {
    // 0: Cover
    if (index === 0) {
      // Find configured cover elements if available
      const coverTexts = (book?.contentConfig?.texts?.filter(t => t.position.pageIndex === 0) || [])
        .map(t => ({...t, _kind: 'text'}));
      const coverImages = (book?.contentConfig?.imageElements?.filter(i => i.position.pageIndex === 0) || [])
        .map(i => ({...i, _kind: 'image'}));
      // Also check for background image specifically for page 0
      const coverBg = book?.contentConfig?.images?.find(i => i.pageIndex === 0 && (i.combinationKey === currentCombinationKey || i.combinationKey === 'default'));

      // Check if we have a custom cover configuration from Admin
      const hasCustomCover = coverTexts.length > 0 || coverImages.length > 0 || !!coverBg;

      return {
        left: <div className="w-full h-full bg-transparent" />, // Empty space left of cover
        right: (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center overflow-hidden shadow-inner border-l-8 border-gray-100 bg-white text-slate-900`}>
             {/* Spine / Binding Effect */}
             <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-gray-200 to-white border-r border-black/5 z-30"></div>
             <div className="absolute left-3 top-0 bottom-0 w-1 bg-black/5 z-20 mix-blend-multiply"></div>

             {/* Cover Thickness (Right Edge) */}
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-black/20 to-transparent z-20 pointer-events-none"></div>

             {generatedPages[0] ? (
                 <img 
                    src={generatedPages[0]} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    style={{ marginLeft: '12px', width: 'calc(100% - 12px)' }} 
                    alt="Cover" 
                 />
             ) : hasCustomCover ? (
                /* RENDER CUSTOM ADMIN CONTENT FOR COVER (Fallback if generation pending) */
                (<>
                    {/* Background */}
                    {coverBg ? (
                         <img src={coverBg.imageUrl} className="absolute inset-0 w-full h-full object-cover" style={{ marginLeft: '12px', width: 'calc(100% - 12px)' }} alt="Cover Background" />
                    ) : (
                         book?.coverImage && (
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${book.coverImage})`, marginLeft: '12px', width: 'calc(100% - 12px)' }}></div>
                         )
                    )}
                    {/* Loading overlay if generating */}
                    {isGenerating && (
                        <div className="absolute inset-0 z-50 bg-white/50 flex items-center justify-center" style={{ marginLeft: '12px' }}>
                            <Loader2 className="animate-spin text-cloud-blue" />
                        </div>
                    )}
                </>)
             ) : (
                /* EMPTY COVER IF NOT CONFIGURED */
                (<div className="absolute inset-0 bg-white" style={{ marginLeft: '12px' }}></div>)
             )}
          </div>
        )
      };
    }

    // 1: Intro - Only show if NO custom content is configured (legacy mode)
    if (index === 1 && !hasCustomContent) {
      return {
        left: (
          <div className="w-full h-full flex items-center justify-center p-12 bg-cloud-lightest relative shadow-inner">
             <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/5 to-transparent pointer-events-none"></div>
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
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/5 to-transparent pointer-events-none"></div>
             <h1 className="font-display font-black text-4xl text-cloud-dark mb-4 text-center leading-tight">{story.title}</h1>
             <div className="w-20 h-1.5 bg-accent-sun rounded-full mb-8"></div>
             <div className="text-cloud-blue font-bold text-xl">Écrit pour {config.childName}</div>
          </div>
        )
      };
    }

    // N-1: Back Cover (End Page) - Legacy only
    if (!hasCustomContent && index === totalViews - 2) {
      return {
        left: (
          <div className="w-full h-full bg-cloud-blue flex flex-col items-center justify-center text-white p-8 text-center shadow-inner">
             <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/5 to-transparent pointer-events-none"></div>
             <h2 className="font-display font-black text-4xl mb-6">Fin</h2>
             <p className="text-white/80 text-lg mb-8">Merci d'avoir lu cette histoire !</p>
             <button onClick={onReset} className="bg-white text-cloud-blue px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                 Créer un autre livre
             </button>
          </div>
        ),
        right: (
          <div className="w-full h-full bg-cloud-dark flex items-center justify-center shadow-inner">
             <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/5 to-transparent pointer-events-none"></div>
             <Cloud size={64} className="text-white/20" />
          </div>
        )
      };
    }

    // N: Closed Back Cover
    if (index === totalViews - 1) {
        // Find configured BACK cover elements (Page 999)
        const backCoverTexts = book?.contentConfig?.texts?.filter(t => t.position.pageIndex === 999) || [];
        const backCoverImages = book?.contentConfig?.imageElements?.filter(i => i.position.pageIndex === 999) || [];
        const backCoverBg = book?.contentConfig?.images?.find(i => i.pageIndex === 999 && (i.combinationKey === currentCombinationKey || i.combinationKey === 'default'));
        
        // Also check Front Cover for fallback logic (Page 0) - to determine if we are in "custom mode"
        const frontCoverTexts = book?.contentConfig?.texts?.filter(t => t.position.pageIndex === 0) || [];
        const frontCoverImages = book?.contentConfig?.imageElements?.filter(i => i.position.pageIndex === 0) || [];
        const frontCoverBg = book?.contentConfig?.images?.find(i => i.pageIndex === 0 && (i.combinationKey === currentCombinationKey || i.combinationKey === 'default'));

        // Check if we have a custom BACK cover configuration
        const hasCustomBackCover = backCoverTexts.length > 0 || backCoverImages.length > 0 || !!backCoverBg;
        
        // Check if we have a custom FRONT cover
        const hasCustomFrontCover = frontCoverTexts.length > 0 || frontCoverImages.length > 0 || !!frontCoverBg;

        const showCustomBack = hasCustomBackCover;
        const showCleanBack = !hasCustomBackCover; // Always clean if not configured

        return {
            left: (
                <div className={`w-full h-full relative flex flex-col items-center justify-center text-center overflow-hidden shadow-inner border-r-8 border-gray-100 ${showCustomBack || showCleanBack ? 'bg-white' : 'bg-cloud-blue text-white'}`}>
                     {/* Spine / Binding Effect */}
                     <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-gray-200 to-white border-l border-black/5 z-30"></div>
                     <div className="absolute right-3 top-0 bottom-0 w-1 bg-black/5 z-20 mix-blend-multiply"></div>
        
                     {/* Cover Thickness (Left Edge) */}
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
        
                     {generatedPages[999] ? (
                        <img 
                            src={generatedPages[999]} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            style={{ marginRight: '12px', width: 'calc(100% - 12px)' }} 
                            alt="Back Cover" 
                         />
                     ) : showCustomBack ? (
                        /* Custom Admin Back Cover Content */
                        (<>
                            {/* Background */}
                            {backCoverBg ? (
                               <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backCoverBg.imageUrl})`, marginRight: '12px' }}></div>
                            ) : null}
                            <div className="absolute inset-0 z-10" style={{ marginRight: '12px' }}>
                               {/* Stickers */}
                               {backCoverImages.map(el => {
                                   const imageUrl = resolveImageUrl(el);
                                   return (
                                       <div 
                                           key={el.id}
                                           className="absolute z-10"
                                           style={{
                                               left: `${el.position.x}%`,
                                               top: `${el.position.y}%`,
                                               width: `${el.position.width}%`,
                                               height: el.position.height ? `${el.position.height}%` : 'auto',
                                               transform: `rotate(${el.position.rotation || 0}deg)`
                                           }}
                                       >
                                           {imageUrl && <img src={imageUrl} className="w-full h-full object-contain" alt={el.label} />}
                                       </div>
                                   );
                               })}

                               {/* Texts */}
                               {backCoverTexts.map(text => (
                                   <div 
                                       key={text.id}
                                       className="absolute z-20 text-slate-800 overflow-hidden break-words whitespace-pre-wrap pointer-events-none"
                                       style={{
                                           left: `${text.position.x}%`,
                                           top: `${text.position.y}%`,
                                           width: `${text.position.width || 30}%`,
                                           transform: `rotate(${text.position.rotation || 0}deg)`,
                                           ...text.style
                                       }}
                                   >
                                       <div 
                                           className="font-medium w-full h-full" 
                                           style={{ color: text.style?.color }}
                                           dangerouslySetInnerHTML={{ __html: resolveTextVariable(text.content).replace(/\n/g, '<br/>') }}
                                       />
                                   </div>
                               ))}
                            </div>
                        </>)
                     ) : showCleanBack ? (
                        /* Clean White Back (when front is custom but back is empty) */
                         (null)
                     ) : (
                        /* Default / Legacy Mode */
                        (<>
                            {book?.coverImage ? (
                                <>
                                    <div className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-60" style={{ backgroundImage: `url(${book.coverImage})`, marginRight: '12px' }}></div>
                                    <div className="absolute inset-0 bg-black/20" style={{ marginRight: '12px' }}></div>
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-cloud-blue" style={{ marginRight: '12px' }}>
                                     <div className="absolute inset-0 bg-white/10 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMCA0MEw0MCAwSDBMNDAgNDBWMHoiLz48L2c+PC9zdmc+')]"></div>
                                </div>
                            )}
                        </>)
                     )}
            
                     {/* Branding removed as per strict config requirement */}
                     <div className="relative z-10 flex flex-col items-center pr-4">
                     </div>
                  </div>
            ),
            right: <div className="w-full h-full bg-transparent" />
        };
    }

    // Story Spreads
    // index starts at 2 (0=cover, 1=intro)
    // page 1 is at index 2 (left) if we want spread view
    // But page numbers in book are 1, 2, 3...
    // Spread 1: Page 1 (Left), Page 2 (Right)
    const spreadOffset = hasCustomContent ? 1 : 2;
    const spreadIndex = index - spreadOffset;
    const leftPageNum = spreadIndex * 2 + 1;
    const rightPageNum = spreadIndex * 2 + 2;

    return {
      left: renderPageContent(leftPageNum, true),
      right: renderPageContent(rightPageNum, false)
    };
  };

  // --- SCENE COMPOSITION ---
  
  const currentSpread = getSpreadContent(currentView);
  // For animations, we need the neighbor spread
  const nextSpread = direction === 'next' ? getSpreadContent(currentView + 1) : null;
  const prevSpread = direction === 'prev' ? getSpreadContent(currentView - 1) : null;

  return (
      <div className={`flex flex-col font-sans bg-stone-100 ${isModal ? 'h-full' : 'min-h-screen'}`}>
          {/* NAVBAR */}
          {!isModal && <Navigation onStart={onStart} />}
          {/* BOOK PREVIEW AREA */}
          <div className={`flex flex-col items-center justify-center px-4 relative overflow-hidden ${isModal ? 'py-4 h-full' : 'py-2 mt-2 min-h-[800px]'}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")` }}>
              
              {/* Stage */}
              <div className={`relative z-10 flex items-center justify-center w-full max-w-7xl perspective-[2500px] animate-drop-in ${isModal ? 'h-[600px] scale-[0.85]' : 'h-[850px]'}`}>
                
                {/* Arrows */}
                <button onClick={handlePrev} disabled={currentView === 0 || isFlipping} className="absolute left-4 lg:left-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 disabled:opacity-0 cursor-pointer">
                    <ChevronLeft size={32} strokeWidth={2.5} />
                </button>
                <button onClick={handleNext} disabled={currentView === totalViews - 1 || isFlipping} className="absolute right-4 lg:right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 disabled:opacity-0 cursor-pointer">
                    <ChevronRight size={32} strokeWidth={2.5} />
                </button>

                {/* BOOK OBJECT */}
                <div 
                  className={`relative flex shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-md preserve-3d transition-transform duration-[1500ms] ease-in-out ${(currentView === 0 || (currentView === 1 && direction === 'prev') || (currentView === totalViews - 1 && (!isFlipping || direction !== 'prev')) || (currentView === totalViews - 2 && isFlipping && direction === 'next')) ? 'bg-transparent shadow-none' : 'bg-white'}`}
                  style={{ 
                    width: `${computedW}px`,
                    height: `${computedH}px`,
                    transform: (currentView === 0 && (!isFlipping || direction !== 'next')) || (currentView === 1 && isFlipping && direction === 'prev')
                      ? 'translateX(-25%)'
                      : (currentView === totalViews - 1 && (!isFlipping || direction !== 'prev')) || (currentView === totalViews - 2 && isFlipping && direction === 'next')
                        ? 'translateX(25%)'
                        : 'translateX(0%)'
                  }}
                >
                    {/* 3D Page Thickness Effect (Visible when book is open) */}
                    {currentView > 0 && currentView < totalViews - 1 && !((currentView === 1 && direction === 'prev')) && !((currentView === totalViews - 2 && direction === 'next')) && (
                       <>
                          {/* Left Page Stack - More layers for rigid effect */}
                          <div className="absolute top-1 bottom-1 left-1 w-1 bg-gray-200 rounded-l-sm border-l border-gray-300" style={{ transform: 'translateX(-2px) translateZ(-1px)' }}></div>
                          <div className="absolute top-1.5 bottom-1.5 left-1 w-1 bg-white rounded-l-sm border-l border-gray-200" style={{ transform: 'translateX(-4px) translateZ(-2px)' }}></div>
                          <div className="absolute top-2 bottom-2 left-1 w-1 bg-gray-100 rounded-l-sm border-l border-gray-300" style={{ transform: 'translateX(-6px) translateZ(-3px)' }}></div>
                          <div className="absolute top-2.5 bottom-2.5 left-1 w-1 bg-white rounded-l-sm border-l border-gray-200" style={{ transform: 'translateX(-8px) translateZ(-4px)' }}></div>
                          <div className="absolute top-3 bottom-3 left-1 w-1 bg-gray-50 rounded-l-sm border-l border-gray-100" style={{ transform: 'translateX(-10px) translateZ(-5px)' }}></div>
                          
                          {/* Right Page Stack - More layers for rigid effect */}
                          <div className="absolute top-1 bottom-1 right-1 w-1 bg-gray-200 rounded-r-sm border-r border-gray-300" style={{ transform: 'translateX(2px) translateZ(-1px)' }}></div>
                          <div className="absolute top-1.5 bottom-1.5 right-1 w-1 bg-white rounded-r-sm border-r border-gray-200" style={{ transform: 'translateX(4px) translateZ(-2px)' }}></div>
                          <div className="absolute top-2 bottom-2 right-1 w-1 bg-gray-100 rounded-r-sm border-r border-gray-300" style={{ transform: 'translateX(6px) translateZ(-3px)' }}></div>
                          <div className="absolute top-2.5 bottom-2.5 right-1 w-1 bg-white rounded-r-sm border-r border-gray-200" style={{ transform: 'translateX(8px) translateZ(-4px)' }}></div>
                          <div className="absolute top-3 bottom-3 right-1 w-1 bg-gray-50 rounded-r-sm border-r border-gray-100" style={{ transform: 'translateX(10px) translateZ(-5px)' }}></div>
                       </>
                    )}
                    
                    {/* 1. STATIC LAYER (Bottom) */}
                    <div className="absolute inset-0 flex w-full h-full z-0 perspective-[2500px]">
                        {/* LEFT SIDE */}
                        <div 
                            onClick={() => { if (currentView > 0) handlePrev(); }}
                            className={`w-1/2 h-full border-r border-gray-200 overflow-hidden rounded-l-md origin-right transition-transform duration-500 ease-out hover:[transform:rotateY(5deg)] ${(currentView === 0 || (currentView === 1 && direction === 'prev')) ? 'bg-transparent border-none pointer-events-none' : (currentView === totalViews - 1 ? 'bg-white cursor-pointer hover:bg-gray-50/10 shadow-[0_30px_60px_rgba(0,0,0,0.4)]' : 'bg-white cursor-pointer hover:bg-gray-50/10')}`}
                        >
                            {direction === 'next' ? currentSpread.left : (prevSpread ? prevSpread.left : currentSpread.left)}
                        </div>
                        {/* RIGHT SIDE */}
                        <div 
                            onClick={() => { if (currentView < totalViews - 1) handleNext(); }}
                            className={`w-1/2 h-full overflow-hidden rounded-r-md cursor-pointer hover:bg-gray-50/10 transition-transform duration-500 ease-out origin-left hover:[transform:rotateY(-5deg)] ${(currentView === totalViews - 1 && (!isFlipping || direction !== 'prev')) || (currentView === totalViews - 2 && isFlipping && direction === 'next') ? 'bg-transparent shadow-none pointer-events-none' : (currentView === 0 ? 'bg-white shadow-[0_30px_60px_rgba(0,0,0,0.4)]' : 'bg-white shadow-sm')}`}
                        >
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
                            <div className={`w-1/2 h-full border-r border-gray-200 overflow-hidden rounded-l-md ${currentView === 0 ? 'bg-transparent border-none' : (currentView === totalViews - 1 ? 'bg-white shadow-[0_30px_60px_rgba(0,0,0,0.4)]' : 'bg-white')}`}>
                                {currentSpread.left}
                            </div>
                            <div className={`w-1/2 h-full overflow-hidden rounded-r-md ${currentView === totalViews - 1 ? 'bg-transparent' : (currentView === 0 ? 'bg-white shadow-[0_30px_60px_rgba(0,0,0,0.4)]' : 'bg-white')}`}>
                                {currentSpread.right}
                            </div>
                        </div>
                    )}

                </div>
              </div>

              {/* Modify Link */}
              {!isModal && (
              <div className="relative z-10 mt-6 flex justify-center">
                 <button onClick={onStart} className="text-cloud-blue font-bold text-sm hover:underline flex items-center gap-1 transition-colors hover:text-cloud-deep">
                    <ChevronLeft size={16} strokeWidth={3} /> Retour à la personnalisation
                 </button>
              </div>
              )}

          </div>
          {/* ORDER SECTION */}
          {!isModal && (
          <section className="bg-white py-16 px-6 border-t-4 border-cloud-blue/10 relative z-10">
               <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12">
                   {/* COL 1 */}
                   <div>
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-2">1. Ajouter une dédicace</h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-2">Pour un cadeau encore plus unique. Nous imprimerons votre dédicace sur la première page du livre.</p>
                       <textarea 
                          className="w-full p-3 border-2 border-cloud-dark/10 rounded-xl font-medium text-cloud-dark focus:border-cloud-blue focus:ring-0 outline-none transition-colors bg-white resize-none text-sm"
                          rows={4}
                          placeholder="Écrivez votre message personnel ici..."
                          value={dedication}
                          onChange={(e) => setDedication(e.target.value)}
                          maxLength={600}
                       />
                       <div className="text-right text-xs text-gray-400 mb-4 mt-1 font-medium">
                           {dedication.length}/600
                       </div>
                   </div>

                   {/* COL 2 */}
                   <div>
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-2">2. Choisir le format</h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-6 min-h-[40px]">Quel type de couverture souhaitez-vous ?</p>
                       
                       <div className="space-y-4">
                           {/* Hardcover Option */}
                           <div 
                               onClick={() => setSelectedFormat('hardcover')}
                               className={`w-full p-4 border-2 rounded-xl flex gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md transition-all ${selectedFormat === 'hardcover' ? 'border-cloud-blue bg-cloud-lightest/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                           >
                               <div className="w-16 h-20 rounded-lg shadow-sm border border-gray-100 overflow-hidden bg-white shrink-0">
                                   <img src={hardcoverIcon} alt="Couverture rigide" className="w-full h-full object-cover" />
                               </div>
                               <div className="flex flex-col flex-1">
                                   <span className="font-bold text-cloud-dark text-sm">Couverture rigide</span>
                                   <span className="text-[10px] text-accent-melon font-black uppercase tracking-wider mb-1">Le plus populaire</span>
                                   <p className="text-[11px] text-cloud-dark/60 leading-tight mb-2">Souvenir élégant et durable ; parfait pour des souvenirs mémorables.</p>
                                   <span className="font-black text-cloud-dark">€44.99</span>
                               </div>
                               {selectedFormat === 'hardcover' && (
                                   <div className="absolute top-0 right-0 bg-cloud-blue text-white p-1 rounded-bl-lg">
                                       <Check size={12} strokeWidth={4} />
                                   </div>
                               )}
                           </div>

                           {/* Softcover Option */}
                           <div 
                               onClick={() => setSelectedFormat('softcover')}
                               className={`w-full p-4 border-2 rounded-xl flex gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md transition-all ${selectedFormat === 'softcover' ? 'border-cloud-blue bg-cloud-lightest/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                           >
                               <div className="w-16 h-20 rounded-lg shadow-sm border border-gray-100 overflow-hidden bg-white shrink-0">
                                   <img src={softcoverIcon} alt="Couverture souple" className="w-full h-full object-cover" />
                               </div>
                               <div className="flex flex-col flex-1">
                                   <span className="font-bold text-cloud-dark text-sm">Couverture souple</span>
                                   <span className="text-[10px] text-transparent font-black uppercase tracking-wider mb-1 select-none">Standard</span>
                                   <p className="text-[11px] text-cloud-dark/60 leading-tight mb-2">Léger et flexible, idéal pour la lecture quotidienne.</p>
                                   <span className="font-black text-cloud-dark">€34.99</span>
                               </div>
                               {selectedFormat === 'softcover' && (
                                   <div className="absolute top-0 right-0 bg-cloud-blue text-white p-1 rounded-bl-lg">
                                       <Check size={12} strokeWidth={4} />
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>

                   {/* COL 3 */}
                   <div>
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-2">3. Commande complète</h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-6 min-h-[40px]">Veuillez vérifier votre sélection pour continuer</p>
                       
                       <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-gray-500">Livre personnalisé</span>
                                <span className="font-bold text-cloud-dark">{selectedFormat === 'hardcover' ? '€44.99' : '€34.99'}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="text-gray-500">Livraison</span>
                                <span className="font-bold text-cloud-dark">9.99€</span>
                            </div>
                            <div className="h-px bg-gray-200 w-full mb-4"></div>
                            <div className="flex justify-between items-center text-lg">
                                <span className="font-black text-cloud-dark">Total</span>
                                <span className="font-black text-brand-coral">
                                    {(selectedFormat === 'hardcover' ? 44.99 + 9.99 : 34.99 + 9.99).toFixed(2)}€
                                </span>
                            </div>
                       </div>

                       <button 
                           id="add-to-cart-btn"
                           onClick={handleAddToCart}
                           className="w-full py-4 px-4 bg-cloud-blue text-white font-black text-lg rounded-xl hover:bg-cloud-deep transition-colors shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                       >
                           <span>{editingCartItemId ? "Modifier le panier" : "Ajouter au panier"}</span>
                           <ArrowRight size={20} />
                       </button>
                   </div>
               </div>
          </section>
          )}
          {/* FOOTER */}
          {!isModal && <Footer />}
          <style>{`
            .backface-hidden { backface-visibility: hidden; }
            .transform-style-3d { transform-style: preserve-3d; }
            .perspective-2000 { perspective: 2000px; }
            
            @keyframes flip-next {
                0% { transform: rotateY(0deg) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
                50% { transform: rotateY(-90deg) scale(1.1); box-shadow: -20px 10px 40px rgba(0,0,0,0.1); }
                100% { transform: rotateY(-180deg) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
            }
            @keyframes flip-prev {
                0% { transform: rotateY(0deg) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
                50% { transform: rotateY(90deg) scale(1.1); box-shadow: 20px 10px 40px rgba(0,0,0,0.1); }
                100% { transform: rotateY(180deg) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
            }
            .animate-flip-next { animation: flip-next 0.9s cubic-bezier(0.4, 0.0, 0.2, 1) forwards; }
            .animate-flip-prev { animation: flip-prev 0.9s cubic-bezier(0.4, 0.0, 0.2, 1) forwards; }
            
            @keyframes drop-in {
                0% { transform: translateY(-50px) scale(0.95); opacity: 0; }
                100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            .animate-drop-in { animation: drop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          `}</style>
      </div>
  );
};

export default BookPreview;
