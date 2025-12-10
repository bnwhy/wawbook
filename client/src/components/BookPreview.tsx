import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Cloud, Settings, BookOpen, Check, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import HTMLFlipBook from 'react-pageflip';
import { Story, BookConfig } from '../types';
import { BookProduct, TextElement, ImageElement } from '../types/admin';
import { useBooks } from '../context/BooksContext';
import { useCart } from '../context/CartContext';
import Navigation from './Navigation';
import hardcoverIcon from '@assets/generated_images/hardcover_children_book_icon.png';
import softcoverIcon from '@assets/generated_images/softcover_children_book_icon.png';

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

// Page Component for react-pageflip
const Page = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div className={`page ${props.className || ''}`} ref={ref} data-density={props.density || 'soft'}>
            <div className="page-content w-full h-full overflow-hidden relative shadow-inner bg-white">
                {props.children}
            </div>
        </div>
    );
});

const BookPreview: React.FC<BookPreviewProps> = ({ story, config, bookProduct, onReset, onStart, editingCartItemId, isModal = false }) => {
  const { books } = useBooks();
  const { addToCart, updateItem } = useCart();
  const [, setLocation] = useLocation();
  const book = bookProduct || books.find(b => b.name === story.title);
  const bookRef = useRef<any>(null);

  const [currentView, setCurrentView] = useState(0);
  const [dedication, setDedication] = useState(config.dedication || '');
  const [selectedFormat, setSelectedFormat] = useState<'hardcover' | 'softcover'>('hardcover');

  // --- HELPER: Resolve Variables ---
  const resolveTextVariable = (text: string) => {
    return text.replace(/\{([^}]+)\}/g, (match, key) => {
        if (key === 'childName') return config.childName;
        
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
    return optionIds.sort().join('_');
  };

  const currentCombinationKey = getCombinationKey();

  const handleAddToCart = () => {
    // Add to cart functionality
    const itemData = {
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
      if (book?.contentConfig?.pages?.length) {
          return book.contentConfig.pages;
      }
      return story.pages; // Fallback
  };

  const contentPages = getContentPages();

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
                  const key = optionIds.sort().join('_');
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
      // 1. Check if we have Admin Config
      if (book?.contentConfig?.pages) {
          const pageDef = book.contentConfig.pages.find(p => p.pageNumber === pageIndex);
          
          if (!pageDef) {
             return <div className="w-full h-full flex items-center justify-center text-cloud-dark/20">Page vide</div>;
          }

          // Background Image
          const bgImage = book.contentConfig.images.find(
             img => img.pageIndex === pageIndex && 
                   (img.combinationKey === currentCombinationKey || img.combinationKey === 'default')
          );

          // Texts
          const pageTexts = book.contentConfig.texts.filter(t => t.position.pageIndex === pageIndex);

          // Images (Stickers)
          const pageImages = (book.contentConfig.imageElements || []).filter(i => i.position.pageIndex === pageIndex);

          return (
            <div className="w-full h-full relative overflow-hidden bg-white h-full">
                {/* Background */}
                {bgImage?.imageUrl ? (
                    <img src={bgImage.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
                ) : (
                    <div className="absolute inset-0 bg-gray-50 flex items-center justify-center text-gray-300">
                        <Cloud size={48} className="opacity-20" />
                    </div>
                )}

                {/* Stickers */}
                {pageImages.map(el => {
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
                {pageTexts.map(text => (
                    <div 
                        key={text.id}
                        className="absolute z-20"
                        style={{
                            left: `${text.position.x}%`,
                            top: `${text.position.y}%`,
                            width: `${text.position.width || 30}%`,
                            transform: `rotate(${text.position.rotation || 0}deg)`,
                            ...text.style
                        }}
                    >
                        <div className="font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">
                            {resolveTextVariable(text.content)}
                        </div>
                    </div>
                ))}

                {/* Page Number */}
                <div className={`absolute bottom-6 ${isLeft ? 'left-8' : 'right-8'} text-cloud-dark/40 font-bold text-xs z-30`}>
                    Page {pageIndex}
                </div>
            </div>
          );
      }

      // 2. Fallback to Simple Story (Legacy)
      const storyPage = story.pages[pageIndex - 1]; // story.pages is 0-indexed, pageIndex is 1-indexed (starts after intro)
      
      if (!storyPage) return <div className="w-full h-full flex items-center justify-center text-cloud-dark/20">Page vide</div>;

      return (
        <div className="w-full h-full bg-white p-6 flex flex-col justify-center relative shadow-inner h-full">
            <div className={`absolute ${isLeft ? 'right-0' : 'left-0'} top-0 bottom-0 w-6 bg-gradient-to-${isLeft ? 'l' : 'r'} from-black/10 to-transparent pointer-events-none z-10`}></div>
            <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-sm bg-cloud-lightest border-4 border-white">
                {storyPage.imageUrl ? <img src={storyPage.imageUrl} className="w-full h-full object-cover" alt="Illustration" /> : <div className="w-full h-full flex items-center justify-center text-cloud-blue/30"><Cloud size={48} /></div>}
            </div>
            <div className="mt-6 font-display font-medium text-lg leading-relaxed text-cloud-dark text-balance text-center">{storyPage.text}</div>
            <div className={`absolute bottom-6 ${isLeft ? 'left-8' : 'right-8'} text-cloud-dark/20 font-bold text-xs`}>Page {pageIndex}</div>
        </div>
      );
  };

  const onFlip = useCallback((e: any) => {
      // e.data is the new page index (0-indexed)
      // but react-pageflip might return weird indices depending on spread
  }, []);

  return (
    <div className={`flex flex-col font-sans bg-stone-100 ${isModal ? 'h-full' : 'min-h-screen'}`}>
      
      {/* NAVBAR */}
      {!isModal && <Navigation onStart={onStart} />}

      {/* BOOK PREVIEW AREA */}
      <div className={`flex flex-col items-center justify-center px-4 relative overflow-hidden ${isModal ? 'py-4 h-full' : 'py-12 mt-20 min-h-[800px]'}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2384cc16' fill-opacity='0.1'%3E%3Cpath d='M25 10 Q35 0 45 10 Q35 20 25 10 Z' /%3E%3Cpath d='M75 60 Q85 50 95 60 Q85 70 75 60 Z' /%3E%3C/g%3E%3Cg fill='%23fca5a5' fill-opacity='0.1'%3E%3Crect x='10' y='60' width='10' height='10' transform='rotate(45 15 65)' /%3E%3Crect x='80' y='20' width='10' height='10' transform='rotate(45 85 25)' /%3E%3C/g%3E%3C/svg%3E")` }}>
          
          {/* Stage */}
          <div className={`relative z-10 flex items-center justify-center w-full max-w-6xl animate-drop-in ${isModal ? 'h-[500px] scale-[0.85]' : 'h-[650px]'}`}>
            
            {/* Arrows */}
            <button 
                onClick={() => bookRef.current?.pageFlip()?.flipPrev()} 
                className="absolute left-4 lg:left-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 cursor-pointer"
            >
                <ChevronLeft size={32} strokeWidth={2.5} />
            </button>
            <button 
                onClick={() => bookRef.current?.pageFlip()?.flipNext()} 
                className="absolute right-4 lg:right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all z-50 hover:bg-stone-50 cursor-pointer"
            >
                <ChevronRight size={32} strokeWidth={2.5} />
            </button>

            {/* FLIPBOOK COMPONENT */}
            <HTMLFlipBook 
                width={450}
                height={600}
                size="fixed"
                minWidth={300}
                maxWidth={600}
                minHeight={400}
                maxHeight={800}
                maxShadowOpacity={0.5}
                showCover={true}
                mobileScrollSupport={true}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                style={{ margin: '0 auto' }}
                ref={bookRef}
                clickEventForward={true}
                usePortrait={false}
                startZIndex={0}
                autoSize={true}
                drawShadow={true}
                flippingTime={1000}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
            >
                {/* 1. FRONT COVER (Right side usually in spread view, but here page 0 is right in react-pageflip if showCover=true? No, page 0 is Cover, page 1 is inside left) */}
                {/* Wait, react-pageflip logic: Page 0 is Cover (Right). Page 1 is Left, Page 2 is Right. */}
                
                {/* COVER */}
                <Page density="hard" className="cover">
                    <div className="w-full h-full relative flex flex-col items-center justify-center text-white p-6 text-center overflow-hidden bg-cloud-blue shadow-inner border-l-8 border-gray-100/20">
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
                </Page>

                {/* INSIDE COVER (Left - Empty or dedicated pattern) */}
                <Page density="hard">
                    <div className="w-full h-full bg-cloud-lightest flex items-center justify-center pattern-grid-lg opacity-50"></div>
                </Page>

                {/* INTRO (Right) */}
                <Page density="soft">
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white relative shadow-inner h-full">
                         <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                         <h1 className="font-display font-black text-4xl text-cloud-dark mb-4 text-center leading-tight">{story.title}</h1>
                         <div className="w-20 h-1.5 bg-accent-sun rounded-full mb-8"></div>
                         <div className="text-cloud-blue font-bold text-xl">Écrit pour {config.childName}</div>
                    </div>
                </Page>

                {/* DEDICATION (Left) */}
                <Page density="soft">
                    <div className="w-full h-full flex items-center justify-center p-12 bg-cloud-lightest relative shadow-inner h-full">
                         <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                         <div className="text-center opacity-80">
                            <h3 className="font-hand text-2xl text-accent-melon mb-2 font-bold">Cette histoire appartient à</h3>
                            <div className="font-display text-4xl text-cloud-dark font-black my-4 border-b-2 border-cloud-dark/10 pb-2 inline-block min-w-[200px]">{config.childName}</div>
                            <p className="font-display text-lg text-cloud-dark/60 italic mt-8 px-4 whitespace-pre-wrap">
                                "{dedication || config.dedication || `Pour ${config.childName}, que tes rêves soient aussi grands que ton imagination.`}"
                            </p>
                         </div>
                    </div>
                </Page>

                {/* PAGES */}
                {contentPages.map((page, index) => (
                    <Page key={`page-${index}`} density="soft">
                        {/* Page number is 1-based index in array + 1 */}
                        {renderPageContent(page.pageNumber || (index + 1), (index + 1) % 2 !== 0)} 
                        {/* Logic for Left/Right in renderPageContent might need adjustment. 
                           Here we just pass index. 
                           React-pageflip renders pages sequentially.
                           Page 0: Cover
                           Page 1: Inside Cover (Left)
                           Page 2: Intro (Right) - Wait, Page 1 is Left, Page 2 is Right.
                           So:
                           P0 (Cover) - Right (if showCover=true, it starts closed)
                           P1 (Inside Cover) - Left
                           P2 (Intro) - Right
                           P3 (Dedication) - Left
                           P4 (Story 1) - Right
                           ...
                        */}
                    </Page>
                ))}

                {/* BACK COVER INSIDE (Left) */}
                <Page density="hard">
                     <div className="w-full h-full bg-cloud-dark flex items-center justify-center shadow-inner h-full">
                         <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                         <Cloud size={64} className="text-white/20" />
                     </div>
                </Page>

                {/* BACK COVER OUTSIDE (Right) */}
                <Page density="hard" className="cover">
                    <div className="w-full h-full bg-cloud-blue flex flex-col items-center justify-center text-white p-8 text-center shadow-inner h-full border-l-8 border-gray-100/20">
                         <h2 className="font-display font-black text-4xl mb-6">Fin</h2>
                         <p className="text-white/80 text-lg mb-8">Merci d'avoir lu cette histoire !</p>
                         <button onClick={onReset} className="bg-white text-cloud-blue px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                             Créer un autre livre
                         </button>
                    </div>
                </Page>

            </HTMLFlipBook>

          </div>
          
      </div>

      {!isModal && (
        <div className="bg-white border-t border-gray-200 py-6">
            <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800">Format du livre</h3>
                    <div className="flex gap-4 mt-2">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedFormat === 'hardcover' ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="radio" name="format" checked={selectedFormat === 'hardcover'} onChange={() => setSelectedFormat('hardcover')} className="hidden" />
                            <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center">
                                <img src={hardcoverIcon} alt="Rigide" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700">Couverture Rigide</div>
                                <div className="text-xs text-slate-500">44.99 €</div>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedFormat === 'softcover' ? 'border-brand-coral bg-red-50 ring-1 ring-brand-coral' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="radio" name="format" checked={selectedFormat === 'softcover'} onChange={() => setSelectedFormat('softcover')} className="hidden" />
                            <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center">
                                <img src={softcoverIcon} alt="Souple" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700">Couverture Souple</div>
                                <div className="text-xs text-slate-500">34.99 €</div>
                            </div>
                        </label>
                    </div>
                </div>
                
                <button 
                    id="add-to-cart-btn"
                    onClick={handleAddToCart}
                    className="bg-cloud-blue text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-cloud-deep hover:scale-105 transition-all flex items-center gap-2"
                >
                    {editingCartItemId ? 'Enregistrer les modifications' : 'Ajouter au panier'} <ArrowRight size={20} />
                </button>
            </div>
        </div>
      )}

      {/* FOOTER */}
      {!isModal && <Footer />}

    </div>
  );
};

export default BookPreview;