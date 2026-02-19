/**
 * BookPreview - Aperçu du livre personnalisé avec animation de chargement intégrée
 * 
 * Génération en 2 phases :
 * - Phase 1 (0-30%) : Génération du texte (si story non fourni)
 * - Phase 2 (30-100%) : Génération des pages (3 priorités : EPUB → Serveur → Client)
 * 
 * Animation intégrée : affichée au centre avec livre grisé/flouté en arrière-plan
 * - Icônes animées : BookOpen (flip 3D) → PenTool → Image → Sparkles
 * - Barre de progression bleue avec effets shimmer et brillance
 * - Couleur : bleu clair du site (#0EA5E9)
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Cloud, BookOpen, Check, ArrowRight, Loader2, PenTool, Image, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { Story, BookConfig, Theme } from '../types';
import { BookProduct, TextElement } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useCart } from '../context/CartContext';
import { generateBookPages, getCombinationKey as getCombinationKeyUtil } from '../utils/imageGenerator';
import { generateStoryText } from '../services/geminiService';
import Navigation from './Navigation';
import FlipbookViewer from './FlipbookViewer';
import Footer from './Footer';
import { formatPrice } from '../utils/formatPrice';

const hardcoverIcon = null;
const softcoverIcon = null;

/**
 * LoadingAnimation - Affichée au centre pendant isGenerating=true
 * Icônes : BookOpen (flip 3D) → PenTool → Image → Sparkles
 * Barre : dégradé bleu avec shimmer + brillance animés
 */
interface LoadingAnimationProps {
  progress: number;
  message: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ progress, message }) => {
  const getCurrentIcon = () => {
    if (progress < 20) return <BookOpen className="w-16 h-16" />;
    if (progress < 40) return <PenTool className="w-16 h-16" />;
    if (progress < 90) return <Image className="w-16 h-16" />;
    return <Sparkles className="w-16 h-16" />;
  };
  
  const getCurrentColor = () => {
    return "#0EA5E9"; // Bleu clair du site (cloud-blue)
  };
  
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Contenu centré */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Icône animée qui change selon la progression */}
        <div 
          className="mb-6"
          style={{ 
            color: getCurrentColor(),
            animation: progress < 20 ? 'book-flip 2s ease-in-out infinite' : 'bounce 1s ease-in-out infinite'
          }}
        >
          {getCurrentIcon()}
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-4 font-display text-center drop-shadow-sm">
          {message}
        </h3>
        
        {/* Bandeau de chargement (barre de progression) */}
        <div className="w-80 max-w-md mb-4">
          <div className="h-3 bg-white/40 backdrop-blur-sm rounded-full overflow-hidden relative shadow-inner">
            {/* Effet shimmer pour donner l'impression de mouvement */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            ></div>
            
            {/* Barre de progression réelle */}
            <div 
              className="h-full bg-gradient-to-r from-cloud-blue via-cloud-sky to-cloud-lighter rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              {/* Effet de brillance qui se déplace */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{
                  animation: 'slide-shine 1.5s ease-in-out infinite'
                }}
              ></div>
            </div>
          </div>
        </div>
        
        <p className="text-slate-600 font-hand text-lg font-medium text-center drop-shadow-sm">
          Un instant, la magie opère !
        </p>
      </div>
    </div>
  );
};

interface BookPreviewProps {
  story?: Story;
  config: BookConfig;
  bookProduct?: BookProduct;
  onReset: () => void;
  onStart: () => void;
  editingCartItemId?: string;
  isModal?: boolean;
  bookTitle?: string;
  initialTheme?: Theme;
}

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, bookProduct, onReset: _onReset, onStart, editingCartItemId, isModal = false, bookTitle, initialTheme }) => {
  const { books } = useBooks();
  const { addToCart, updateItem } = useCart();
  const [, setLocation] = useLocation();
  const [localStory, setLocalStory] = useState<Story | undefined>(story);
  const currentStory = localStory || story;
  const book = bookProduct || books.find(b => b.name === currentStory?.title || b.name === bookTitle);
  

  const [, setCurrentView] = useState(0);
  const [dedication, setDedication] = useState(config.dedication || '');
  const [author, setAuthor] = useState(config.author || '');
  const [initialDedication, setInitialDedication] = useState(config.dedication || '');
  const [initialAuthor, setInitialAuthor] = useState(config.author || '');
  const [selectedFormat, setSelectedFormat] = useState<'hardcover' | 'softcover'>('hardcover');
  const [generatedPages, setGeneratedPages] = useState<Record<number, string>>({});
  const [flipbookKey, setFlipbookKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Chargement...");
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applySuccess, setApplySuccess] = useState(false);
  
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

  const currentCombinationKey = useMemo(() => {
    return book ? getCombinationKeyUtil(book, config) : 'default';
  }, [book, config.characters]);

  // Phase 1 (0-30%) : Génération du texte - sauté si story déjà fourni
  useEffect(() => {
    if (!currentStory && bookTitle) {
      setIsGenerating(true);
      setLoadingProgress(0);
      setLoadingMessage("On ouvre le grimoire...");
      
      const generateText = async () => {
        try {
          setLoadingProgress(10);
          await new Promise(resolve => setTimeout(resolve, 150));
          
          setLoadingProgress(20);
          setLoadingMessage("Personnalisation de l'histoire...");
          
          const generatedStory = await generateStoryText(config, bookTitle, initialTheme);
          setLocalStory(generatedStory);
          
          setLoadingProgress(30);
          setLoadingMessage("Chargement du livre...");
        } catch (err) {
          console.error("Failed to generate story text", err);
          setIsGenerating(false);
        }
      };
      
      generateText();
    }
  }, [bookTitle, config, currentStory, initialTheme]);

  // Phase 2 (30-100%) : Génération des pages - 3 priorités (EPUB → Serveur → Client)
  useEffect(() => {
    if (book && currentStory) {
        setIsGenerating(true);
        setGeneratedPages({});
        setLoadingProgress(30);
        setLoadingMessage("Chargement du livre...");
        
        const timer = setTimeout(async () => {
            try {
                // Priorité 1 : Pages pré-rendues (EPUB import)
                const pageImages = book.contentConfig?.pageImages;
                
                if (pageImages && pageImages.length > 0) {
                    setLoadingProgress(50);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    setLoadingProgress(100);
                    setLoadingMessage("Terminé !");
                    
                    const pages: Record<number, string> = {};
                    pageImages.forEach(pi => {
                        pages[pi.pageIndex] = pi.imageUrl;
                    });
                    setGeneratedPages(pages);
                    
                    await new Promise(resolve => setTimeout(resolve, 250));
                    setIsGenerating(false);
                    return;
                }
                
                // Priorité 2 : Rendu serveur (API /render-pages)
                const bookPages = book.contentConfig?.pages;                
                if (bookPages && bookPages.length > 0) {
                    try {                        
                        setLoadingProgress(40);
                        await new Promise(resolve => setTimeout(resolve, 150));
                        
                        setLoadingProgress(60);
                        setLoadingMessage("Chargement du livre...");
                        const response = await fetch(`/api/books/${book.id}/render-pages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                config: {
                                    childName: config.childName,
                                    age: config.age,
                                    dedication: config.dedication,
                                    author: config.author,
                                    gender: config.gender,
                                },
                                characters: config.characters,
                                combinationKey: currentCombinationKey,
                            }),
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            
                            if (result.pages && result.pages.length > 0) {
                                setLoadingProgress(100);
                                setLoadingMessage("Terminé !");
                                
                                const pages: Record<number, string> = {};
                                const cacheBust = Date.now();
                                result.pages.forEach((p: { pageIndex: number; imageUrl: string }) => {
                                    pages[p.pageIndex] = `${p.imageUrl}?t=${cacheBust}`;
                                });
                                setGeneratedPages(pages);
                                
                                await new Promise(resolve => setTimeout(resolve, 250));
                                setIsGenerating(false);
                                return;
                            }
                        }
                    } catch (renderErr) {
                        console.error('Server render failed:', renderErr);
                    }
                }
                
                // Priorité 3 : Génération client (fallback)                
                setLoadingProgress(50);
                setLoadingMessage("Assemblage des pages...");
                const pages = await generateBookPages(book, config, currentCombinationKey, (pageProgress) => {
                  // Map page progress (0-100) to overall progress (50-100)
                  const overallProgress = 50 + (pageProgress * 0.50);
                  setLoadingProgress(Math.min(100, overallProgress));
                  if (overallProgress >= 95) {
                    setLoadingMessage("Terminé !");
                  } else {
                    setLoadingMessage("Assemblage des pages...");
                  }
                });
                setLoadingProgress(100);
                setLoadingMessage("Terminé !");
                setGeneratedPages(pages);
                await new Promise(resolve => setTimeout(resolve, 250));
                setIsGenerating(false);
            } catch (err) {
                console.error("Failed to load pages", err);
                setIsGenerating(false);
            }
        }, 100);
        return () => clearTimeout(timer);
    }
    return;
  }, [book, currentCombinationKey, currentStory]);

  // --- DIMENSIONS & SCALE ---
  // Use EPUB dimensions if available, otherwise fall back to features or default
  const getBookDimensions = () => {
    // Priority 1: Use pages dimensions (EPUB import)
    if (book?.contentConfig?.pages?.length) {
      const firstPage = book.contentConfig.pages[0];
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
            // Extract primary font name (before comma for fallbacks)
            let fontName = text.style.fontFamily.split(',')[0].trim();
            // Remove quotes if present
            fontName = fontName.replace(/["']/g, '');
            if (fontName) usedFonts.add(fontName);
        }
    });
    

    // Local/system fonts that are NOT on Google Fonts - skip loading these
    const nonGoogleFonts = new Set([
      'Agency FB', 'Chiller', 'Arial', 'Helvetica', 'Times New Roman', 
      'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS', 'Impact',
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'
    ]);

    
    usedFonts.forEach(font => {
         // Skip non-Google fonts
         if (nonGoogleFonts.has(font)) return;
         
         const fontEncoded = encodeURIComponent(font.replace(/ /g, '+'));
         const href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
         
         // Use try-catch to avoid querySelector errors with special characters
         try {
           const existingLink = document.querySelector(`link[href*="family=${fontEncoded}"]`);
           if (!existingLink) {
               const link = document.createElement('link');
               link.href = href;
               link.rel = 'stylesheet';
               document.head.appendChild(link);
           }
         } catch (e) {
           // Skip fonts with special characters that break querySelector
         }
    });
  }, [book]);

  const handleApplyChanges = async () => {
    if (!book) return;
    
    setIsApplying(true);
    setApplyProgress(20);
    
    // Update config with new values
    config.dedication = dedication;
    config.author = author;
    
    try {
      // Call API to regenerate pages
      const response = await fetch(`/api/books/${book.id}/render-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            childName: config.childName,
            age: config.age,
            dedication: config.dedication,
            author: config.author,
            gender: config.gender,
          },
          characters: config.characters,
          combinationKey: currentCombinationKey,
          dedicationOnly: true,
        }),
      });
      
      setApplyProgress(60);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.pages && result.pages.length > 0) {
          setApplyProgress(90);
          // Update generatedPages
          const cacheBust = Date.now();
          const updatedPages = { ...generatedPages };
          result.pages.forEach((p: { pageIndex: number; imageUrl: string }) => {
            updatedPages[p.pageIndex] = `${p.imageUrl}?t=${cacheBust}`;
          });
          setGeneratedPages(updatedPages);
          
          // Update initial values
          setInitialDedication(dedication);
          setInitialAuthor(author);
          
          // Force flipbook remount by changing key
          setFlipbookKey(prev => prev + 1);
          setApplyProgress(100);
          setApplySuccess(true);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate pages:', err);
    } finally {
      setIsApplying(false);
      setApplyProgress(0);
    }
  };

  const handleAddToCart = () => {
    const capturedCoverImage = generatedPages[1] || generatedPages[2] || book?.coverImage;
    
    // Add to cart functionality
    const itemData = {
      productId: book?.id,
      bookTitle: currentStory?.title || bookTitle || '',
      config,
      dedication,
      format: selectedFormat,
      price: selectedFormat === 'hardcover' ? 44.99 : 34.99,
      quantity: 1,
      coverImage: capturedCoverImage
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

  // Check for pages (EPUB import) - use max pageIndex
  if (book?.contentConfig?.pages?.length) {
      const bookPagesData = book.contentConfig.pages;
      const maxPageIndex = Math.max(...bookPagesData.map(p => p.pageIndex));
      pageCount = Math.max(pageCount, maxPageIndex);
  }

  // Ensure at least 1 page if we have any content
  if (pageCount === 0 && (book?.contentConfig?.pages?.length || Object.keys(generatedPages).length > 0)) {
      pageCount = Math.max(1, ...Object.keys(generatedPages).map(k => parseInt(k)).filter(n => n < 900));
  }

  // --- MOBILE NAVIGATION ---
  // Build list of actual mobile pages that exist in generatedPages
  const mobilePagesList = useMemo(() => {
    const pages: number[] = [];
    // Check for cover (index 0)
    if (generatedPages[0]) pages.push(0);
    // Content pages (1 to pageCount)
    for (let i = 1; i <= pageCount; i++) {
      if (generatedPages[i]) pages.push(i);
    }
    // Check for back cover (index 999)
    if (generatedPages[999]) pages.push(999);
    return pages;
  }, [generatedPages, pageCount]);
  
  const totalMobilePages = mobilePagesList.length;
  
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
  
  // Get mobile page content - uses mobilePagesList for actual page numbers
  const getMobilePageContent = (index: number) => {
    const actualPageNum = mobilePagesList[index];
    
    // If we don't have this page, show placeholder
    if (actualPageNum === undefined || !generatedPages[actualPageNum]) {
      return (
        <div className="w-full h-full bg-white rounded-lg shadow-xl flex items-center justify-center">
          {isGenerating ? <Loader2 className="animate-spin text-cloud-blue" size={32} /> : <BookOpen size={40} className="text-gray-200" />}
        </div>
      );
    }
    
    // Determine label based on page number
    const altText = actualPageNum === 0 ? 'Cover' : actualPageNum === 999 ? 'Back Cover' : `Page ${actualPageNum}`;
    
    return (
      <div data-page-index={actualPageNum} className="w-full h-full relative overflow-hidden bg-white rounded-lg shadow-xl">
        <img src={generatedPages[actualPageNum]} className="w-full h-full object-contain" alt={altText} />
      </div>
    );
  };
  
  // Get mobile page label for indicator
  const getMobilePageLabel = (index: number) => {
    const actualPageNum = mobilePagesList[index];
    if (actualPageNum === 0) return 'Couverture';
    if (actualPageNum === 999) return 'Dos';
    return `Page ${actualPageNum}`;
  };

  // --- SCENE COMPOSITION ---

  // Convert generatedPages to array for FlipbookViewer
  const flipbookPages = useMemo(() => {
    const pages: string[] = [];
    
    // Get all page indices that exist in generatedPages, sorted
    const existingIndices = Object.keys(generatedPages)
      .map(k => parseInt(k, 10))
      .filter(k => !isNaN(k) && k !== 999) // Exclude back cover for now
      .sort((a, b) => a - b);
    
    // Add all pages in order
    existingIndices.forEach(idx => {
      if (generatedPages[idx]) {
        pages.push(generatedPages[idx]);
      }
    });
    
    // Back cover (index 999) at the end
    if (generatedPages[999]) {
      pages.push(generatedPages[999]);
    }
    
    return pages;
  }, [generatedPages]);

  // CSS from content.json (already cleaned of font declarations during import)
  const cssContent = book?.contentConfig?.cssContent || '';
  
  return (
      <div className={`flex flex-col font-sans bg-stone-100 ${isModal ? 'h-full' : 'min-h-screen'}`}>
          {/* Inject CSS from contentConfig (positions and dimensions only, no fonts) */}
          {cssContent && (
            <style dangerouslySetInnerHTML={{ __html: cssContent }} />
          )}
          <style>{`
            @keyframes float {
              0%, 100% { 
                transform: translateY(0px) translateX(0px); 
              }
              50% { 
                transform: translateY(-20px) translateX(10px); 
              }
            }
          `}</style>
          {/* NAVBAR */}
          {!isModal && <Navigation onStart={onStart} />}
          {/* BOOK PREVIEW AREA */}
          <div className={`flex flex-col items-center justify-center px-4 relative overflow-hidden ${isModal ? 'py-2 h-full' : isMobile ? 'py-4 pt-20' : 'py-1 pt-20'}`} style={{ 
            backgroundColor: '#E0F2FE',
            backgroundImage: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)'
          }}>
              
              {/* Floating Clouds Decoration */}
              <div className="absolute top-32 left-10 text-white opacity-60 pointer-events-none" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <Cloud size={100} fill="currentColor" />
              </div>
              <div className="absolute top-52 right-20 text-white opacity-40 pointer-events-none" style={{ animation: 'float 6s ease-in-out 3s infinite' }}>
                <Cloud size={80} fill="currentColor" />
              </div>
              <div className="absolute bottom-20 left-1/4 text-white opacity-50 pointer-events-none" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <Cloud size={120} fill="currentColor" />
              </div>

              {/* MOBILE SINGLE PAGE VIEW */}
              {isMobile ? (
                <div className="w-full flex flex-col items-center overflow-hidden relative z-10">
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
                      {/* Current page (grisée si génération ou application en cours) */}
                      <div className={(isGenerating || isApplying) ? "opacity-30 blur-sm transition-all duration-500" : "opacity-100 transition-all duration-500"}>
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
                      
                      {/* Animation de chargement */}
                      {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                          <LoadingAnimation progress={loadingProgress} message={loadingMessage} />
                        </div>
                      )}
                      
                      {/* Overlay pendant l'application des modifications */}
                      {isApplying && (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                          <LoadingAnimation 
                            progress={applyProgress} 
                            message={applyProgress < 50 ? "Application de vos modifications..." : applyProgress < 95 ? "Mise à jour des pages..." : "Terminé !"} 
                          />
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
                      {getMobilePageLabel(mobilePageIndex)}
                    </span>
                    <span className="text-xs text-stone-400">
                      ({mobilePageIndex + 1} / {totalMobilePages || 1})
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
              <div className={`relative z-10 flex items-center justify-center w-full max-w-5xl animate-drop-in ${isModal ? '' : ''}`}>
                <div className="relative">
                  {/* FlipBook (toujours affiché) */}
                  <div className={(isGenerating || isApplying) ? "opacity-30 blur-sm pointer-events-none transition-all duration-500" : "opacity-100 transition-all duration-500"}>
                    {flipbookPages.length > 0 ? (
                      <FlipbookViewer
                        key={`flipbook-${flipbookPages.length}-${book?.id || 'default'}-${flipbookKey}`}
                        pages={flipbookPages}
                        width={`${computedW}px`}
                        height={`${computedH}px`}
                        className="mx-auto"
                        onPageTurn={(pageIndex) => setCurrentView(Math.floor(pageIndex / 2))}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full" style={{ width: `${computedW}px`, height: `${computedH}px` }}>
                        <div className="flex flex-col items-center gap-4">
                          <BookOpen size={40} className="text-gray-200" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Animation de chargement superposée */}
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                      <LoadingAnimation progress={loadingProgress} message={loadingMessage} />
                    </div>
                  )}
                  
                  {/* Overlay de chargement pendant l'application des modifications */}
                  {isApplying && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                      <LoadingAnimation 
                        progress={applyProgress} 
                        message={applyProgress < 50 ? "Application de vos modifications..." : applyProgress < 95 ? "Mise à jour des pages..." : "Terminé !"} 
                      />
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
                </>
              )}

          </div>
          {/* ORDER SECTION */}
          {!isModal && (
          <section className="bg-white py-16 px-6 border-t-4 border-cloud-blue/10 relative z-10">
               <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12">
                   {/* COL 1 */}
                   <div>
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-2">1. Ajouter votre touche personnelle <span className="text-gray-400 text-sm font-normal">(optionnel)</span></h3>
                       <p className="text-cloud-dark/60 text-sm font-medium mb-2">Un message imprimé sur la première page pour un souvenir unique.</p>
                       <textarea 
                          className="w-full p-3 border-2 border-cloud-dark/10 rounded-xl font-medium text-cloud-dark focus:border-cloud-blue focus:ring-0 outline-none transition-colors bg-white resize-none text-sm"
                          rows={4}
                          placeholder="Écrivez votre message personnel ici..."
                          value={dedication}
                          onChange={(e) => { setDedication(e.target.value); setApplySuccess(false); }}
                          maxLength={600}
                       />
                       <div className="text-right text-xs text-gray-400 mb-4 mt-1 font-medium">
                           {dedication.length}/600
                       </div>

                       <p className="text-cloud-dark/60 text-sm font-medium mb-2">Nom de l'auteur de cette histoire.</p>
                       <input 
                          type="text"
                          className="w-full p-3 border-2 border-cloud-dark/10 rounded-xl font-medium text-cloud-dark focus:border-cloud-blue focus:ring-0 outline-none transition-colors bg-white text-sm"
                          placeholder="Nom de l'auteur..."
                          value={author}
                          onChange={(e) => { setAuthor(e.target.value); setApplySuccess(false); }}
                          maxLength={20}
                       />
                       <div className="text-right text-xs text-gray-400 mb-4 mt-1 font-medium">
                           {author.length}/20
                       </div>

                       {/* Bouton commun - toujours visible, bleu si modification */}
                       <button 
                           id="apply-changes-btn"
                           onClick={handleApplyChanges}
                           className={`w-full mt-2 py-3 px-4 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
                               applySuccess
                                   ? 'bg-green-500 text-white cursor-default'
                                   : isApplying
                                       ? 'bg-cloud-blue/70 text-white cursor-wait'
                                       : dedication !== initialDedication || author !== initialAuthor
                                           ? 'bg-cloud-blue text-white hover:bg-cloud-deep cursor-pointer'
                                           : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                           }`}
                           disabled={isApplying || applySuccess || (dedication === initialDedication && author === initialAuthor)}
                       >
                           {isApplying ? (
                             <><Loader2 size={16} className="animate-spin" /> Application en cours...</>
                           ) : applySuccess ? (
                             <><Check size={16} strokeWidth={3} /> Appliqué !</>
                           ) : (
                             'Appliquer les modifications'
                           )}
                       </button>
                   </div>

                   {/* COL 2 */}
                   <div>
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-6">2. Le format de votre livre</h3>
                       
                       <div className="space-y-4">
                           {/* Hardcover Option */}
                           <div 
                               onClick={() => setSelectedFormat('hardcover')}
                               className={`w-full p-4 border-2 rounded-xl flex gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md transition-all ${selectedFormat === 'hardcover' ? 'border-cloud-blue bg-cloud-lightest/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                           >
                               <div className="w-16 h-20 rounded-lg shadow-sm border border-gray-100 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                                   {hardcoverIcon ? (
                                     <img src={hardcoverIcon} alt="Couverture rigide" className="w-full h-full object-cover" />
                                   ) : (
                                     <BookOpen size={32} className="text-gray-300" />
                                   )}
                               </div>
                               <div className="flex flex-col flex-1">
                                   <span className="font-bold text-cloud-dark text-sm">Couverture rigide</span>
                                   <span className="text-[10px] text-accent-melon font-black uppercase tracking-wider mb-2">Notre préféré</span>
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
                               <div className="w-16 h-20 rounded-lg shadow-sm border border-gray-100 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                                   {softcoverIcon ? (
                                     <img src={softcoverIcon} alt="Couverture souple" className="w-full h-full object-cover" />
                                   ) : (
                                     <BookOpen size={32} className="text-gray-300" />
                                   )}
                               </div>
                               <div className="flex flex-col flex-1">
                                   <span className="font-bold text-cloud-dark text-sm">Couverture souple</span>
                                   <span className="text-[10px] text-transparent font-black uppercase tracking-wider mb-2 select-none">Standard</span>
                                   <span className="font-black text-cloud-dark">€ 34,99</span>
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
                       <h3 className="font-display font-black text-xl text-cloud-dark mb-6">3. Finaliser votre commande</h3>
                       
                       <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-gray-500">Livre personnalisé</span>
                                <span className="font-bold text-cloud-dark">{selectedFormat === 'hardcover' ? '€ 44,99' : '€ 34,99'}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="text-gray-500">Livraison</span>
                                <span className="font-bold text-cloud-dark">€ 9,99</span>
                            </div>
                            <div className="h-px bg-gray-200 w-full mb-4"></div>
                            <div className="flex justify-between items-center text-lg">
                                <span className="font-black text-cloud-dark">Total</span>
                                <span className="font-black text-brand-coral">
                                    {formatPrice(selectedFormat === 'hardcover' ? 44.99 + 9.99 : 34.99 + 9.99)}
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
            
            /* Loading animation blobs */
            @keyframes float {
              0%, 100% { 
                transform: translateY(0px) translateX(0px); 
              }
              50% { 
                transform: translateY(-20px) translateX(10px); 
              }
            }
            
            @keyframes float-delayed {
              0%, 100% { 
                transform: translateY(0px) translateX(0px); 
              }
              50% { 
                transform: translateY(20px) translateX(-10px); 
              }
            }
            
            @keyframes shimmer {
              0% { 
                transform: translateX(-100%); 
              }
              100% { 
                transform: translateX(200%); 
              }
            }
            
            @keyframes slide-shine {
              0% { 
                transform: translateX(-100%); 
              }
              100% { 
                transform: translateX(200%); 
              }
            }
            
            @keyframes book-flip {
              0%, 100% { 
                transform: rotateY(0deg) scale(1);
              }
              50% { 
                transform: rotateY(20deg) scale(1.1);
              }
            }
            
            @keyframes bounce {
              0%, 100% { 
                transform: translateY(0);
              }
              50% { 
                transform: translateY(-10px);
              }
            }
            
            .animate-float {
              animation: float 6s ease-in-out infinite;
            }
            
            .animate-float-delayed {
              animation: float-delayed 6s ease-in-out infinite 3s;
            }
            
            .animate-shimmer {
              animation: shimmer 2s ease-in-out infinite;
            }
            
            .animate-slide-shine {
              animation: slide-shine 1.5s ease-in-out infinite;
            }
          `}</style>
      </div>
  );
};

export default BookPreview;
