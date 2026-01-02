import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Cloud, Heart, Settings, BookOpen, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { Story, BookConfig } from '../types';
import { BookProduct, TextElement, ImageElement } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useCart } from '../context/CartContext';
import { generateBookPages } from '../utils/imageGenerator';
import { renderAllPages } from '../utils/pageRenderer';
import Navigation from './Navigation';
import FlipbookViewer from './FlipbookViewer';
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
  
  // Mobile single-page mode
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePageIndex, setMobilePageIndex] = useState(0); // 0 = cover, 1-N = pages, N+1 = back cover
  const [mobileSlideDirection, setMobileSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  
  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- HELPER: Resolve Variables ---
  const resolveTextVariable = (text: string) => {
    // 1. Handle {{variable}} style
    let content = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const k = key.trim();
        if (k === 'childName') return config.childName || "l'enfant";
        if (k === 'dedication') return config.dedication || '';
        if (k === 'age') return config.age?.toString() || '';
        if (k === 'heroName') return config.childName || 'Héros';
        if (k === 'city') return config.city || '';
        if (k === 'gender') return config.gender === 'girl' ? 'Fille' : 'Garçon';

        return match;
    });

    // 2. Legacy {variable} style
    content = content.replace(/\{([^}]+)\}/g, (match, key) => {
        if (key === 'childName') return config.childName || "l'enfant";
        
        // Handle {tabId.variantId}
        const [tabId, variantId] = key.split('.');
        if (tabId && variantId && config.characters?.[tabId]) {
            return config.characters[tabId][variantId] || match;
        }
        return match;
    });
    
    return content;
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

  // --- LOAD PAGE IMAGES ---
  useEffect(() => {
    if (book) {
        setIsGenerating(true);
        const timer = setTimeout(async () => {
            try {
                // Priority 1: Use pre-rendered page images from server (EPUB import)
                const pageImages = book.contentConfig?.pageImages;
                
                if (pageImages && pageImages.length > 0) {
                    console.log(`Using ${pageImages.length} pre-rendered page images from server`);
                    const pages: Record<number, string> = {};
                    pageImages.forEach(pi => {
                        pages[pi.pageIndex] = pi.imageUrl;
                    });
                    setGeneratedPages(pages);
                    setIsGenerating(false);
                    return;
                }
                
                // Priority 2: Render raw HTML pages with html2canvas (EPUB fixed layout)
                const rawPages = book.contentConfig?.rawHtmlPages;
                const cssContent = book.contentConfig?.cssContent || '';
                
                console.log('[BookPreview] rawPages:', rawPages?.length, 'cssContent length:', cssContent?.length);
                
                if (rawPages && rawPages.length > 0) {
                    console.log(`[BookPreview] Rendering ${rawPages.length} EPUB fixed layout pages with html2canvas...`);
                    console.log('[BookPreview] First page HTML preview:', rawPages[0].html?.substring(0, 200));
                    try {
                        const pages = await renderAllPages(
                            rawPages,
                            cssContent,
                            config,
                            config.characters,
                            undefined,
                            (current, total) => console.log(`[BookPreview] Rendered page ${current}/${total}`),
                            book.contentConfig?.imageElements
                        );
                        console.log('[BookPreview] Rendered pages count:', Object.keys(pages).length);
                        // Debug: log each page's dataUrl info
                        Object.entries(pages).forEach(([idx, dataUrl]) => {
                            console.log(`[BookPreview] Page ${idx} dataUrl length:`, dataUrl?.length, 'starts with:', dataUrl?.substring(0, 80));
                        });
                        setGeneratedPages(pages);
                        setIsGenerating(false);
                        return;
                    } catch (renderErr) {
                        console.error('[BookPreview] html2canvas render failed:', renderErr);
                    }
                }
                
                // Priority 3: Fallback to canvas-based generation for non-EPUB books
                const pages = await generateBookPages(book, config, currentCombinationKey);
                setGeneratedPages(pages);
                setIsGenerating(false);
            } catch (err) {
                console.error("Failed to load pages", err);
                setIsGenerating(false);
            }
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [book, config, currentCombinationKey]);

  // --- DIMENSIONS & SCALE ---
  // Use EPUB dimensions if available, otherwise fall back to features or default
  const getBookDimensions = () => {
    // Priority 1: Use rawHtmlPages dimensions (EPUB import)
    if (book?.contentConfig?.rawHtmlPages?.length) {
      const firstPage = book.contentConfig.rawHtmlPages[0];
      if (firstPage.width && firstPage.height) {
        return { width: firstPage.width, height: firstPage.height };
      }
    }
    // Priority 2: Use configured features dimensions
    if (book?.features?.dimensions) {
      return book.features.dimensions;
    }
    // Default to Square 210x210
    return { width: 210, height: 210 };
  };
  const dims = getBookDimensions();
  console.log('[BookPreview] Using dimensions:', dims);
  
  // Spread aspect ratio = (Single Page Width * 2) / Page Height
  const spreadAspectRatio = (dims.width * 2) / dims.height;
  
  // Max dimensions for the book preview container
  const MAX_W = 800;
  const MAX_H = 550;

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

  // Check for rawHtmlPages first (EPUB import)
  if (book?.contentConfig?.rawHtmlPages?.length) {
      // Use rawHtmlPages count if available
      const rawPages = book.contentConfig.rawHtmlPages;
      const maxPageIndex = Math.max(...rawPages.map(p => p.pageIndex));
      pageCount = Math.max(pageCount, maxPageIndex);
  } else if (book?.contentConfig?.pages?.length) {
      // If using admin config, find the highest page number (excluding back cover 999)
      const validPages = book.contentConfig.pages.filter(p => p.pageNumber < 900);
      if (validPages.length > 0) {
          pageCount = Math.max(...validPages.map(p => p.pageNumber));
      }
  }

  // Ensure at least 1 page if we have any content
  if (pageCount === 0 && (book?.contentConfig?.rawHtmlPages?.length || Object.keys(generatedPages).length > 0)) {
      pageCount = Math.max(1, ...Object.keys(generatedPages).map(k => parseInt(k)).filter(n => n < 900));
  }

  const totalSpreads = Math.ceil(pageCount / 2); 
  
  // 0: Cover
  // [Offset]: Spreads
  // N+1: Closed Back
  const totalViews = 1 + totalSpreads + 1;

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

  // --- MOBILE NAVIGATION ---
  // Total mobile pages: cover (0) + content pages (1 to pageCount) + back cover (pageCount + 1)
  const totalMobilePages = pageCount + 2; // cover + pages + back cover
  
  const handleMobileNext = () => {
    if (mobilePageIndex < totalMobilePages - 1 && !isSliding) {
      setIsSliding(true);
      setMobileSlideDirection('left');
      setTimeout(() => {
        setMobilePageIndex(p => p + 1);
        setMobileSlideDirection(null);
        setIsSliding(false);
      }, 350);
    }
  };
  
  const handleMobilePrev = () => {
    if (mobilePageIndex > 0 && !isSliding) {
      setIsSliding(true);
      setMobileSlideDirection('right');
      setTimeout(() => {
        setMobilePageIndex(p => p - 1);
        setMobileSlideDirection(null);
        setIsSliding(false);
      }, 350);
    }
  };
  
  // Touch handlers for swipe with live offset tracking
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSliding) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setSwipeOffset(0);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSliding || touchStartX.current === null) return;
    touchEndX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    // Limit swipe offset for visual feedback
    const maxOffset = 120;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    setSwipeOffset(clampedOffset);
  };
  
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) {
      setSwipeOffset(0);
      return;
    }
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && mobilePageIndex < totalMobilePages - 1) {
        // Swipe left -> next page
        handleMobileNext();
      } else if (diff < 0 && mobilePageIndex > 0) {
        // Swipe right -> previous page
        handleMobilePrev();
      }
    }
    
    setSwipeOffset(0);
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  // Get mobile page content
  const getMobilePageContent = (index: number) => {
    // index 0 = cover
    if (index === 0) {
      if (generatedPages[0]) {
        return (
          <div className="w-full h-full relative overflow-hidden bg-white rounded-lg shadow-xl">
            <img src={generatedPages[0]} className="w-full h-full object-contain" alt="Cover" />
          </div>
        );
      }
      return (
        <div className="w-full h-full bg-white rounded-lg shadow-xl flex items-center justify-center">
          {isGenerating ? <Loader2 className="animate-spin text-cloud-blue" size={32} /> : <BookOpen size={40} className="text-gray-200" />}
        </div>
      );
    }
    
    // index = totalMobilePages - 1 = back cover
    if (index === totalMobilePages - 1) {
      if (generatedPages[999]) {
        return (
          <div className="w-full h-full relative overflow-hidden bg-white rounded-lg shadow-xl">
            <img src={generatedPages[999]} className="w-full h-full object-contain" alt="Back Cover" />
          </div>
        );
      }
      return <div className="w-full h-full bg-white rounded-lg shadow-xl" />;
    }
    
    // Content pages: index 1 corresponds to page 1, etc.
    const pageNum = index;
    if (generatedPages[pageNum]) {
      return (
        <div className="w-full h-full relative overflow-hidden bg-white rounded-lg shadow-xl">
          <img src={generatedPages[pageNum]} className="w-full h-full object-contain" alt={`Page ${pageNum}`} />
        </div>
      );
    }
    
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-xl flex items-center justify-center">
        {isGenerating ? <Loader2 className="animate-spin text-cloud-blue" size={32} /> : <BookOpen size={40} className="text-gray-200" />}
      </div>
    );
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
      console.log('[BookPreview] renderPageContent called for page:', pageIndex, 'hasGeneratedPage:', !!generatedPages[pageIndex], 'availablePages:', Object.keys(generatedPages));
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
      // ... (Cover Logic preserved) ...
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
                    {coverBg && (
                         <img src={coverBg.imageUrl} className="absolute inset-0 w-full h-full object-cover" style={{ marginLeft: '12px', width: 'calc(100% - 12px)' }} alt="Cover Background" />
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
                     ) : null}
            
                     {/* Branding removed as per strict config requirement */}
                     <div className="relative z-10 flex flex-col items-center pr-4">
                     </div>
                  </div>
            ),
            right: <div className="w-full h-full bg-transparent" />
        };
    }

    // Story Spreads
    // index starts at 1 (0=cover)
    // Spread 1: Page 1 (Left), Page 2 (Right)
    const spreadOffset = 1;
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

  // Convert generatedPages to array for FlipbookViewer
  const flipbookPages = useMemo(() => {
    const pages: string[] = [];
    // Cover (index 0)
    if (generatedPages[0]) pages.push(generatedPages[0]);
    // Content pages (1 to pageCount)
    for (let i = 1; i <= pageCount; i++) {
      if (generatedPages[i]) pages.push(generatedPages[i]);
    }
    // Back cover (index 999)
    if (generatedPages[999]) pages.push(generatedPages[999]);
    return pages;
  }, [generatedPages, pageCount]);

  return (
      <div className={`flex flex-col font-sans bg-stone-100 ${isModal ? 'h-full' : 'min-h-screen'}`}>
          {/* NAVBAR */}
          {!isModal && <Navigation onStart={onStart} />}
          {/* BOOK PREVIEW AREA */}
          <div className={`flex flex-col items-center justify-center px-4 relative overflow-hidden ${isModal ? 'py-4 h-full' : isMobile ? 'py-6 mt-16' : 'py-2 mt-2 min-h-[800px]'}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")` }}>
              
              {/* MOBILE SINGLE PAGE VIEW */}
              {isMobile ? (
                <div className="w-full flex flex-col items-center overflow-hidden">
                  {/* Mobile Book Container with swipe */}
                  <div 
                    ref={bookContainerRef}
                    className="relative w-full max-w-sm mx-auto overflow-hidden"
                    style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Pages carousel container */}
                    <div className="relative w-full h-full">
                      {/* Current page */}
                      <div 
                        className={`absolute inset-0 w-full h-full transition-transform duration-350 ease-out ${
                          mobileSlideDirection === 'left' ? 'animate-slide-out-left' : 
                          mobileSlideDirection === 'right' ? 'animate-slide-out-right' : ''
                        }`}
                        style={{ 
                          transform: !isSliding && swipeOffset !== 0 ? `translateX(${-swipeOffset}px)` : undefined,
                          transition: swipeOffset !== 0 ? 'none' : undefined
                        }}
                      >
                        {getMobilePageContent(mobilePageIndex)}
                      </div>
                      
                      {/* Next page (preview when sliding left) */}
                      {mobileSlideDirection === 'left' && mobilePageIndex < totalMobilePages - 1 && (
                        <div className="absolute inset-0 w-full h-full animate-slide-in-left">
                          {getMobilePageContent(mobilePageIndex + 1)}
                        </div>
                      )}
                      
                      {/* Previous page (preview when sliding right) */}
                      {mobileSlideDirection === 'right' && mobilePageIndex > 0 && (
                        <div className="absolute inset-0 w-full h-full animate-slide-in-right">
                          {getMobilePageContent(mobilePageIndex - 1)}
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation arrows (smaller on mobile) */}
                    <button 
                      onClick={handleMobilePrev} 
                      disabled={mobilePageIndex === 0 || isSliding}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 text-stone-700 rounded-full flex items-center justify-center shadow-lg disabled:opacity-0 transition-opacity z-20"
                    >
                      <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={handleMobileNext} 
                      disabled={mobilePageIndex === totalMobilePages - 1 || isSliding}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 text-stone-700 rounded-full flex items-center justify-center shadow-lg disabled:opacity-0 transition-opacity z-20"
                    >
                      <ChevronRight size={24} strokeWidth={2.5} />
                    </button>
                  </div>
                  
                  {/* Page indicator */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-stone-600">
                      {mobilePageIndex === 0 ? 'Couverture' : mobilePageIndex === totalMobilePages - 1 ? 'Dos' : `Page ${mobilePageIndex}`}
                    </span>
                    <span className="text-xs text-stone-400">
                      ({mobilePageIndex + 1} / {totalMobilePages})
                    </span>
                  </div>
                  
                  {/* Swipe hint */}
                  <p className="mt-2 text-xs text-stone-400 text-center">
                    Glissez pour tourner les pages
                  </p>
                  
                  {/* Modify Link */}
                  {!isModal && (
                    <div className="mt-4 flex justify-center">
                      <button onClick={onStart} className="text-cloud-blue font-bold text-sm hover:underline flex items-center gap-1 transition-colors hover:text-cloud-deep">
                        <ChevronLeft size={16} strokeWidth={3} /> Retour à la personnalisation
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* DESKTOP FLIPBOOK VIEW */
                <>
              {/* Stage */}
              <div className={`relative z-10 flex items-center justify-center w-full max-w-5xl animate-drop-in ${isModal ? 'h-[600px]' : 'h-[750px]'}`}>
                {flipbookPages.length > 0 ? (
                  <FlipbookViewer
                    pages={flipbookPages}
                    width={`${computedW}px`}
                    height={`${computedH}px`}
                    className="mx-auto"
                    onPageTurn={(pageIndex) => setCurrentView(Math.floor(pageIndex / 2))}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-cloud-blue" size={48} />
                      <p className="text-stone-500 font-medium">Génération des pages...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modify Link */}
              {!isModal && (
              <div className="relative z-10 mt-6 flex justify-center">
                 <button onClick={onStart} className="text-cloud-blue font-bold text-sm hover:underline flex items-center gap-1 transition-colors hover:text-cloud-deep">
                    <ChevronLeft size={16} strokeWidth={3} /> Retour à la personnalisation
                 </button>
              </div>
              )}
                </>
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
            
            /* Mobile slide animations */
            @keyframes slide-out-left {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(-100%); opacity: 0; }
            }
            @keyframes slide-out-right {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            @keyframes slide-in-left {
                0% { transform: translateX(100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes slide-in-right {
                0% { transform: translateX(-100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-out-left { animation: slide-out-left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-slide-out-right { animation: slide-out-right 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-slide-in-left { animation: slide-in-left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .animate-slide-in-right { animation: slide-in-right 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
          `}</style>
      </div>
  );
};

export default BookPreview;
