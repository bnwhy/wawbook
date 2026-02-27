import React, { useState } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useCart, CartItem } from '../context/CartContext';
import { useBooks } from '../context/BooksContext';
import { Plus, Lock, Edit2, Eye, X } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import PaymentBadges from '../components/PaymentBadges';
import BookPreview from '../components/BookPreview';
import BookCover3D from '../components/BookCover3D';
import { generateStoryText } from '../services/geminiService';
import { Story } from '../types';
import { formatPrice } from '../utils/formatPrice';

import { useEcommerce } from '../context/EcommerceContext';

function encodeBase64(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

const CartPage: React.FC = () => {
  const { items, removeFromCart, updateQuantity: _updateQuantity, total } = useCart();
  const { defaultShippingRate } = useEcommerce();
  const { books } = useBooks();
  const [, setLocation] = useLocation();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [previewItem, setPreviewItem] = useState<CartItem | null>(null);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  
  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [isPromoInputVisible, setIsPromoInputVisible] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    
    // Mock promo logic
    if (promoCode.toUpperCase() === 'YOUPI40') {
        setDiscount(18.00);
        setPromoError('');
    } else if (promoCode.toUpperCase() === 'BOOK30') {
        setDiscount(total * 0.3); // 30% off
        setPromoError('');
    } else {
        setDiscount(0);
        setPromoError('Code promo invalide');
    }
  };

  const handlePreview = async (item: CartItem) => {
    // Generate story for preview
    const story = await generateStoryText(item.config, item.bookTitle);
    setPreviewStory(story);
    setPreviewItem(item);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-20">
          <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center mb-6 text-stone-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </div>
          <h2 className="font-display font-black text-3xl text-stone-800 mb-2">Votre panier est vide</h2>
          <p className="text-stone-500 mb-8 text-center max-w-md">Il semble que vous n'ayez pas encore créé d'histoire magique. Commencez l'aventure maintenant !</p>
          <button 
            onClick={() => setLocation('/')}
            className="bg-cloud-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cloud-deep transition-colors"
          >
            Créer un livre
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans">
      {ConfirmDialog}
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-32 pb-20">
        <h1 className="font-display font-black text-4xl text-cloud-dark mb-8">Votre panier</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const book = books.find(b => b.id === item.productId || b.name === item.bookTitle);
              
              return (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row gap-6 relative">
                
                {/* Remove Button (Top Right) */}
                <button 
                    onClick={async () => {
                      if (await confirmDialog('', {
                        title: 'Supprimer cet article personnalisé ?',
                        description: 'Toute votre configuration sera perdue. Vous devrez recommencer la personnalisation.',
                        cancelLabel: 'Conserver l\'article',
                        confirmLabel: 'Oui, supprimer',
                        variant: 'front',
                      })) removeFromCart(item.id);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 bg-stone-200 hover:bg-red-50 text-stone-600 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                >
                    <X size={16} strokeWidth={3} />
                </button>

                {/* Book Thumbnail */}
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg shadow-md flex-shrink-0 relative overflow-hidden self-center md:self-start border border-stone-200">
                    {item.coverImage ? (
                        <img 
                            src={item.coverImage} 
                            alt={item.bookTitle}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs text-center p-2 font-bold bg-cloud-light">
                            {item.bookTitle}
                        </div>
                    )}
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start pr-10">
                        <div>
                            <h3 className="font-display font-black text-xl text-cloud-dark mb-1">{item.bookTitle}</h3>
                            
                            <div className="space-y-1 text-sm text-stone-600">
                                {/* Noms des personnages regroupés */}
                                {(() => {
                                    const names: { name: string; role: string }[] = [];
                                    if (book?.wizardConfig) {
                                        book.wizardConfig.tabs.forEach(tab => {
                                            tab.variants.filter(v => v.type === 'text').forEach(v => {
                                                const val = item.config.characters?.[tab.id]?.[v.id];
                                                if (val) names.push({ name: val, role: tab.label });
                                            });
                                        });
                                    } else if (item.config.childName) {
                                        names.push({ name: item.config.childName, role: 'Personnage' });
                                    }
                                    if (!names.length) return null;
                                    return (
                                        <p>
                                            <span className="font-medium">Nom{names.length > 1 ? 's' : ''}:</span>{' '}
                                            <span className="font-bold text-cloud-dark">
                                                {names.map((n, i) => (
                                                    <span key={i}>{i > 0 && ', '}{n.name} <span className="font-normal text-stone-400">({n.role})</span></span>
                                                ))}
                                            </span>
                                        </p>
                                    );
                                })()}

                                <p><span className="font-medium">Langue:</span> Français</p>
                                <p><span className="font-medium">Format:</span> {item.format === 'hardcover' ? 'Couverture rigide' : 'Couverture souple'}</p>
                                {item.config.author && <p><span className="font-medium">Créé par:</span> <span className="font-bold text-cloud-dark">{item.config.author}</span></p>}
                            </div>
                        </div>
                        
                        <div className="font-black text-xl text-cloud-dark mt-2 md:mt-0">
                            {formatPrice(item.price * item.quantity)}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                        <button 
                            onClick={() => {
                              const p = new URLSearchParams();
                              p.set('bookTitle', encodeURIComponent(item.bookTitle));
                              if (item.config.theme) p.set('theme', encodeURIComponent(item.config.theme));
                              if (item.config.appearance?.activity) p.set('activity', encodeURIComponent(item.config.appearance.activity));
                              if (item.id) p.set('editingId', encodeURIComponent(item.id));
                              const dedication = item.dedication || item.config.dedication;
                              if (dedication) p.set('dedication', encodeURIComponent(dedication));
                              if (item.config.author) p.set('author', encodeURIComponent(item.config.author));
                              if (item.config.characters) p.set('selections', encodeBase64(item.config.characters));
                              setLocation(`/create?${p.toString()}`);
                            }}
                            className="flex items-center gap-1 text-sm font-bold text-cloud-blue hover:text-cloud-deep transition-colors"
                        >
                            <Edit2 size={14} /> Modifier
                        </button>
                        <button 
                            onClick={() => handlePreview(item)}
                            className="flex items-center gap-1 text-sm font-bold text-cloud-blue hover:text-cloud-deep transition-colors"
                        >
                            <Eye size={14} /> Aperçu
                        </button>
                    </div>
                </div>
              </div>
              );
            })}
            
            <div className="text-center py-4">
                 <p className="text-cloud-dark font-medium mb-6">Nous vous offrons 30 % de réduction sur votre deuxième livre avec le code <span className="font-black">BOOK30</span></p>
                 
                 <button 
                    onClick={() => setLocation('/')}
                    className="inline-flex items-center gap-2 px-6 py-3 border-2 border-cloud-dark/20 rounded-lg text-cloud-dark font-bold hover:bg-white hover:border-cloud-dark/50 transition-colors"
                >
                    <Plus size={18} strokeWidth={3} /> Ajouter un autre livre
                </button>
            </div>
            
            <div className="mt-12">
                <h3 className="font-display font-black text-2xl text-cloud-dark mb-6 text-center">Cherchez-vous d'autres cadeaux personnalisés ?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {books.filter(b => !b.isHidden && !items.some(i => i.productId === b.id || i.bookTitle === b.name)).slice(0, 3).map(book => (
                        <div
                            key={book.id}
                            onClick={() => setLocation(`/create?bookTitle=${encodeURIComponent(book.name)}`)}
                            className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group"
                        >
                            <div className="aspect-square relative overflow-visible flex items-center justify-center p-2" style={{ background: book.thumbnailBackground || 'linear-gradient(135deg, #fef1f7 0%, #faf5ff 100%)' }}>
                                <div className="w-[90%] h-[90%] relative">
                                    {(() => {
                                        const imgs = (book.galleryImages && book.galleryImages.length > 0)
                                            ? book.galleryImages.map((img: any) => typeof img === 'string' ? { url: img, use3DEffect: false } : img)
                                            : book.coverImage ? [{ url: book.coverImage, use3DEffect: true }] : [];
                                        const img = imgs[0];
                                        if (!img) return <span className="text-cloud-blue text-xs font-bold text-center">{book.name}</span>;
                                        return img.use3DEffect
                                            ? <BookCover3D imageUrl={img.url} alt={book.name} />
                                            : <img src={img.url} alt={book.name} className="w-full h-full object-cover rounded-lg shadow-lg" />;
                                    })()}
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="font-bold text-cloud-dark text-sm leading-tight">{book.name}</p>
                                {book.price && <p className="text-xs text-stone-400 mt-0.5">{formatPrice(book.price)}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

          </div>
          
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-stone-200 sticky top-32">
                <h3 className="font-display font-black text-xl text-cloud-dark mb-6 leading-tight">Récapitulatif de la<br/>commande</h3>
                
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-stone-600 text-sm font-medium">
                        <span>Sous-total :</span>
                        <span className="font-bold text-cloud-dark">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 text-sm font-medium">
                        <span>Livraison :</span>
                        {items.length >= 2 ? (
                            <span className="font-bold text-green-600">OFFERTE</span>
                        ) : (
                            <span className="font-bold text-cloud-dark text-right leading-tight">
                                {formatPrice(defaultShippingRate)}<br />
                                <span className="text-xs font-normal text-stone-400">Gratuite à partir de 2 livres</span>
                            </span>
                        )}
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-sm font-medium text-brand-coral">
                            <span>Réduction :</span>
                            <span className="font-bold">-{formatPrice(discount)}</span>
                        </div>
                    )}
                    
                    <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
                        <span className="font-bold text-lg text-cloud-dark">Total :</span>
                        <span className="font-black text-2xl text-cloud-dark">{formatPrice(total + (items.length >= 2 ? 0 : defaultShippingRate) - discount)}</span>
                    </div>
                </div>
                
                <button 
                    onClick={() => setLocation('/checkout')}
                    className="w-full bg-cloud-deep text-white font-bold text-lg py-3 px-4 rounded-lg shadow-md hover:bg-cloud-dark hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                    <Lock size={18} /> Passer la commande
                </button>
                
                <div className="mt-3 py-2">
                    <PaymentBadges size="small" />
                </div>
                
                <div className="mt-2">
                    {!isPromoInputVisible ? (
                        <button 
                            onClick={() => setIsPromoInputVisible(true)}
                            className="w-full text-sm text-stone-500 underline hover:text-cloud-blue transition-colors text-center"
                        >
                            Vous avez un code promo?
                        </button>
                    ) : (
                        <div className="space-y-2">
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder="Code promo"
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-cloud-blue uppercase"
                                />
                                <button 
                                    onClick={handleApplyPromo}
                                    className="bg-white border border-cloud-dark/20 text-cloud-dark font-bold text-xs px-4 rounded hover:bg-gray-50 transition-colors uppercase"
                                >
                                    Appliquer
                                </button>
                             </div>
                             {promoError && <p className="text-red-500 text-xs">{promoError}</p>}
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />

      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full h-full sm:h-[90vh] sm:max-w-6xl sm:rounded-lg overflow-hidden bg-stone-100"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            {previewStory && (
              <div className="h-full w-full overflow-y-auto">
                <BookPreview
                  story={previewStory}
                  config={previewItem.config}
                  onReset={() => setPreviewItem(null)}
                  onStart={() => setPreviewItem(null)}
                  isModal={true}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
