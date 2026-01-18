import React from 'react';
import { BookConfig } from '../types';
import { BookProduct, ImageElement } from '../types/admin';

interface BookCoverProps {
  book: BookProduct;
  config: BookConfig;
  className?: string;
}

const BookCover: React.FC<BookCoverProps> = ({ book, config, className }) => {
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
                  // Try scoped key first (tabId:optionIds), then fallback to legacy key (optionIds only)
                  const legacyKey = optionIds.join('_');
                  const scopedKey = `${tabId}:${legacyKey}`;
                  const avatarUrl = book?.wizardConfig?.avatarMappings?.[scopedKey] ?? book?.wizardConfig?.avatarMappings?.[legacyKey];
                  if (avatarUrl) {
                      return avatarUrl;
                  }
              }
          }
      }
      return el.url; // Fallback
  };

  // Find configured cover elements if available
  const coverTexts = book?.contentConfig?.texts?.filter(t => t.position.pageIndex === 0) || [];
  const coverImages = book?.contentConfig?.imageElements?.filter(i => i.position.pageIndex === 0) || [];
  // Also check for background image specifically for page 0
  const coverBg = book?.contentConfig?.images?.find(i => i.pageIndex === 0 && (i.combinationKey === currentCombinationKey || i.combinationKey === 'default'));

  // Check if we have a custom cover configuration from Admin
  const hasCustomCover = coverTexts.length > 0 || coverImages.length > 0 || !!coverBg;

  if (hasCustomCover) {
     return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Background */}
            {coverBg ? (
                    <img src={coverBg.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Cover Background" />
            ) : (
                    book?.coverImage && (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${book.coverImage})` }}></div>
                    )
            )}

            <div className="absolute inset-0 z-10">
                {/* Stickers */}
                {coverImages.map(el => {
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
                {coverTexts.map(text => (
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
                        <div 
                            className="font-display font-medium text-lg leading-relaxed text-balance text-center" 
                            style={{ color: text.style?.color || 'inherit', fontSize: text.style?.fontSize ? `${text.style.fontSize}px` : undefined }}
                            dangerouslySetInnerHTML={{ __html: resolveTextVariable(text.content).replace(/\n/g, '<br/>') }}
                        />
                    </div>
                ))}
            </div>
        </div>
     );
  }

  // FALLBACK: If no custom config, show generic cover image
  return (
    <div className={`relative overflow-hidden bg-cloud-blue ${className}`}>
        {book?.coverImage ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${book.coverImage})` }}></div>
        ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs text-center p-2 font-bold bg-cloud-light">
                {book.name}
            </div>
        )}
    </div>
  );
};

export default BookCover;
