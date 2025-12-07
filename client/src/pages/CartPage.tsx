import React, { useState } from 'react';
import { useCart, CartItem } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft, Lock, Edit2, Eye, X } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import BookPreview from '../components/BookPreview';
import { generateStoryText } from '../services/geminiService';
import { Story } from '../types';

interface CartPageProps {
  onEdit?: (item: CartItem) => void;
}

const CartPage: React.FC<CartPageProps> = ({ onEdit }) => {
  const { items, removeFromCart, updateQuantity, total } = useCart();
  const [, setLocation] = useLocation();
  const [previewItem, setPreviewItem] = useState<CartItem | null>(null);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);

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
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-32 pb-20">
        <h1 className="font-display font-black text-4xl text-cloud-dark mb-8">Votre panier</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 flex flex-col md:flex-row gap-6 relative">
                
                {/* Remove Button (Top Right) */}
                <button 
                    onClick={() => removeFromCart(item.id)}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                >
                    <X size={16} strokeWidth={3} />
                </button>

                {/* Book Thumbnail */}
                <div className="w-full md:w-32 md:h-32 bg-cloud-blue rounded-full shadow-inner flex-shrink-0 relative overflow-hidden self-center md:self-start border-4 border-white shadow-lg">
                    {item.coverImage ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImage})` }}></div>
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
                            <p className="text-stone-500 italic text-sm mb-3">({item.dedication || "C'est un endroit étrange"})</p>
                            
                            <div className="space-y-1 text-sm text-stone-600">
                                <p>
                                    <span className="font-medium">Noms:</span> <span className="font-bold text-cloud-dark">
                                        {item.config.childName} ({item.config.gender === 'Garçon' ? 'Garçon' : 'Fille'})
                                        {item.config.characters && Object.entries(item.config.characters)
                                            .filter(([key]) => key !== 'child')
                                            .map(([_, char]: [string, any]) => char.name ? `, ${char.name} (${char.gender === 'boy' || char.role === 'dad' ? 'Garçon' : 'Fille'})` : '')
                                            .join('')}
                                    </span>
                                </p>
                                <p><span className="font-medium">Langue:</span> Français</p>
                                <p><span className="font-medium">Format:</span> {item.format === 'hardcover' ? 'Couverture rigide' : 'Couverture souple'}</p>
                            </div>
                        </div>
                        
                        <div className="font-black text-xl text-cloud-dark mt-2 md:mt-0">
                            {(item.price * item.quantity).toFixed(2)}€
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                        <button 
                            onClick={() => onEdit && onEdit(item)}
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
            ))}
            
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
                <h3 className="font-display font-black text-2xl text-cloud-dark mb-6">Cherchez-vous d'autres cadeaux personnalisés ?</h3>
                {/* Placeholder for upsell items */}
            </div>

          </div>
          
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-stone-100 sticky top-32">
                <h3 className="font-display font-black text-xl text-cloud-dark mb-6 leading-tight">Récapitulatif de la<br/>commande</h3>
                
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-stone-600 text-sm font-medium">
                        <span>Sous-total :</span>
                        <span className="font-bold text-cloud-dark">{total.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-stone-600 text-sm font-medium">
                        <span>Expédition :</span>
                        <span className="font-bold text-cloud-dark">9.99€</span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
                        <span className="font-bold text-lg text-cloud-dark">Total :</span>
                        <span className="font-black text-2xl text-cloud-dark">{(total + 9.99).toFixed(2)}€</span>
                    </div>
                </div>
                
                <button 
                    onClick={() => setLocation('/checkout')}
                    className="w-full bg-cloud-deep text-white font-bold text-lg py-3 px-4 rounded-lg shadow-md hover:bg-cloud-dark hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                    <Lock size={18} /> Paiement
                </button>
                
                <div className="mt-4 text-center">
                    <button className="text-sm text-stone-500 underline hover:text-cloud-blue transition-colors">
                        Vous avez un code promo?
                    </button>
                </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 overflow-hidden bg-stone-100 border-none">
            {previewItem && previewStory && (
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CartPage;
