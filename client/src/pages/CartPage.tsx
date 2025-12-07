import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, total } = useCart();
  const [, setLocation] = useLocation();

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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-32 pb-20">
        <h1 className="font-display font-black text-4xl text-stone-900 mb-8">Votre Panier</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex gap-6 relative overflow-hidden">
                {/* Book Thumbnail */}
                <div className="w-24 h-32 bg-cloud-blue rounded-lg shadow-inner flex-shrink-0 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/10 z-10"></div>
                    {item.coverImage ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImage})` }}></div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs text-center p-2 font-bold">
                            {item.bookTitle}
                        </div>
                    )}
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-display font-bold text-xl text-stone-800">{item.bookTitle}</h3>
                            <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <p className="text-stone-500 text-sm mt-1">
                            Une aventure de {item.config.childName} • {item.format === 'hardcover' ? 'Couverture Rigide' : 'Couverture Souple'}
                        </p>
                        {item.dedication && (
                            <p className="text-stone-400 text-xs mt-2 italic line-clamp-2">"{item.dedication}"</p>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                        <div className="flex items-center bg-stone-100 rounded-lg p-1">
                            <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-stone-600 transition-colors"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-bold text-stone-800">{item.quantity}</span>
                            <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-stone-600 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="font-black text-xl text-brand-coral">
                            {(item.price * item.quantity).toFixed(2)}€
                        </div>
                    </div>
                </div>
              </div>
            ))}
            
            <button 
                onClick={() => setLocation('/')}
                className="text-stone-500 font-bold flex items-center gap-2 hover:text-cloud-blue transition-colors mt-4"
            >
                <ArrowLeft size={18} /> Continuer vos achats
            </button>
          </div>
          
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-100 sticky top-32">
                <h3 className="font-display font-bold text-2xl text-stone-800 mb-6">Récapitulatif</h3>
                
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-stone-600">
                        <span>Sous-total</span>
                        <span className="font-bold">{total.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                        <span>Livraison</span>
                        <span className="text-green-600 font-bold">Gratuite</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                        <span>Taxes estimées</span>
                        <span className="font-bold">{(total * 0.2).toFixed(2)}€</span>
                    </div>
                </div>
                
                <div className="border-t border-stone-100 pt-6 mb-8">
                    <div className="flex justify-between items-end">
                        <span className="font-bold text-lg text-stone-800">Total</span>
                        <span className="font-black text-3xl text-brand-coral">{total.toFixed(2)}€</span>
                    </div>
                </div>
                
                <button 
                    onClick={() => setLocation('/checkout')}
                    className="w-full bg-cloud-blue text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-cloud-deep hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    Paiement <ArrowRight size={20} />
                </button>
                
                <div className="mt-6 flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                    {/* Payment Icons Mock */}
                    <div className="h-6 w-10 bg-stone-200 rounded"></div>
                    <div className="h-6 w-10 bg-stone-200 rounded"></div>
                    <div className="h-6 w-10 bg-stone-200 rounded"></div>
                    <div className="h-6 w-10 bg-stone-200 rounded"></div>
                </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CartPage;
