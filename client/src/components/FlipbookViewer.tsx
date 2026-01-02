import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
// @ts-ignore
import FlipBook from 'flipbook-js';
import 'flipbook-js/style.css';

interface FlipbookViewerProps {
  pages: string[];
  width?: string;
  height?: string;
  onPageTurn?: (pageIndex: number) => void;
  className?: string;
}

export interface FlipbookViewerHandle {
  turnPage: (direction: 'forward' | 'back' | number) => void;
  getActivePages: () => number[];
  isFirstPage: () => boolean;
  isLastPage: () => boolean;
}

const FlipbookViewer = forwardRef<FlipbookViewerHandle, FlipbookViewerProps>(
  ({ pages, width = '100%', height = '100%', onPageTurn, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const flipbookRef = useRef<FlipBook | null>(null);
    const prevButtonRef = useRef<HTMLButtonElement>(null);
    const nextButtonRef = useRef<HTMLButtonElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const pagesKey = useMemo(() => {
      if (pages.length === 0) return '';
      return pages.map(p => p.substring(0, 50)).join('|');
    }, [pages]);

    useImperativeHandle(ref, () => ({
      turnPage: (direction) => flipbookRef.current?.turnPage(direction),
      getActivePages: () => flipbookRef.current?.getActivePages() || [],
      isFirstPage: () => flipbookRef.current?.isFirstPage() || false,
      isLastPage: () => flipbookRef.current?.isLastPage() || false,
    }));

    useEffect(() => {
      if (!containerRef.current || pages.length === 0) return;
      
      const flipbookEl = containerRef.current.querySelector('.c-flipbook') as HTMLElement;
      if (!flipbookEl) return;

      if (flipbookRef.current) {
        flipbookRef.current = null;
        setIsInitialized(false);
      }

      const timer = setTimeout(() => {
        try {
          flipbookRef.current = new FlipBook(flipbookEl, {
            canClose: true,
            initialCall: true,
            arrowKeys: true,
            nextButton: nextButtonRef.current,
            previousButton: prevButtonRef.current,
            width,
            height,
            onPageTurn: (el: HTMLElement, context: { pagesActive: NodeListOf<HTMLElement>; children: NodeListOf<HTMLElement> }) => {
              if (onPageTurn) {
                const activePages = context.pagesActive;
                if (activePages.length > 0) {
                  const pageIndex = Array.from(context.children).indexOf(activePages[0]);
                  onPageTurn(pageIndex);
                }
              }
            },
          });
          setIsInitialized(true);
        } catch (error) {
          console.error('[FlipbookViewer] Error initializing flipbook:', error);
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        flipbookRef.current = null;
      };
    }, [pagesKey, width, height]);

    if (pages.length === 0) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          <p className="text-gray-400">Chargement...</p>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`flex flex-col items-center z-50 ${className}`} key={pagesKey}>
        <div className="c-flipbook" style={{ width, height, position: 'relative', zIndex: 50 }}>
          {pages.map((pageUrl, index) => (
            <div key={`page-${index}-${pageUrl.substring(0, 30)}`} className="c-flipbook__page">
              <img
                src={pageUrl}
                alt={`Page ${index + 1}`}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-8 mt-6">
          <button
            ref={prevButtonRef}
            className="w-12 h-12 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:scale-110 transition-all z-20 border border-gray-200"
            aria-label="Page précédente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            ref={nextButtonRef}
            className="w-12 h-12 bg-white text-stone-700 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 hover:scale-110 transition-all z-20 border border-gray-200"
            aria-label="Page suivante"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    );
  }
);

FlipbookViewer.displayName = 'FlipbookViewer';

export default FlipbookViewer;
