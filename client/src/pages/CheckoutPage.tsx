import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useEcommerce } from '../context/EcommerceContext';
import { ArrowLeft, CheckCircle, CreditCard, Truck, ShieldCheck, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
  const { createOrder } = useEcommerce();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zip: '',
    country: 'France',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Create Order in Ecommerce Backend
      createOrder({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        address: {
            street: formData.address,
            city: formData.city,
            zipCode: formData.zip,
            country: formData.country
        }
      }, items, total);

      setIsLoading(false);
      setStep('confirmation');
      setOrderNumber(Math.random().toString(36).substr(2, 9).toUpperCase());
      clearCart();
      window.scrollTo(0, 0);
    }, 2000);
  };

  if (items.length === 0 && step !== 'confirmation') {
    setLocation('/');
    return null;
  }

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle size={48} />
          </div>
          <h1 className="font-display font-black text-4xl text-stone-900 mb-4">Commande Confirmée !</h1>
          <p className="text-stone-600 text-lg max-w-lg mb-8">
            Merci {formData.firstName} ! Votre livre est en route vers l'imprimerie. 
            Un email de confirmation a été envoyé à <span className="font-bold">{formData.email}</span>.
          </p>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 max-w-md w-full mb-8 text-left">
            <div className="flex justify-between mb-2">
                <span className="text-stone-500">Numéro de commande</span>
                <span className="font-mono font-bold">#{orderNumber}</span>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-stone-500">Date</span>
                <span className="font-bold">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="border-t border-stone-100 my-4"></div>
            <div className="flex justify-between">
                <span className="font-bold text-stone-800">Total payé</span>
                <span className="font-black text-brand-coral">{total.toFixed(2)}€</span>
            </div>
          </div>
          <button 
            onClick={() => setLocation('/')}
            className="bg-cloud-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cloud-deep transition-colors"
          >
            Retour à l'accueil
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-32 pb-20">
        <div className="flex items-center gap-2 mb-8 text-sm font-bold text-stone-400">
            <span className={step === 'details' ? 'text-cloud-blue' : 'text-green-600'}>1. Livraison</span>
            <span className="text-stone-300">/</span>
            <span className={step === 'payment' ? 'text-cloud-blue' : ''}>2. Paiement</span>
            <span className="text-stone-300">/</span>
            <span>3. Confirmation</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form Area */}
            <div className="lg:col-span-2">
                {step === 'details' ? (
                    <form onSubmit={handleDetailsSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 space-y-6">
                        <h2 className="font-display font-black text-2xl text-stone-800 flex items-center gap-3">
                            <Truck className="text-cloud-blue" /> Adresse de livraison
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">Prénom</label>
                                <input required name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="Jean" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">Nom</label>
                                <input required name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="Dupont" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-stone-600">Email</label>
                            <input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="jean.dupont@email.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-stone-600">Adresse</label>
                            <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="123 Rue des Lilas" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">Ville</label>
                                <input required name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="Paris" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">Code Postal</label>
                                <input required name="zip" value={formData.zip} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none" placeholder="75001" />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="w-full bg-cloud-blue text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-cloud-deep hover:scale-[1.01] active:scale-[0.99] transition-all">
                                Continuer vers le paiement
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handlePaymentSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 space-y-6">
                         <div className="flex items-center gap-2 mb-6 cursor-pointer text-stone-500 hover:text-stone-800 transition-colors" onClick={() => setStep('details')}>
                            <ArrowLeft size={16} /> Retour aux détails
                        </div>
                        
                        <h2 className="font-display font-black text-2xl text-stone-800 flex items-center gap-3">
                            <CreditCard className="text-cloud-blue" /> Paiement sécurisé
                        </h2>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                            <Lock size={16} className="mt-0.5 flex-shrink-0" />
                            <p>Toutes les transactions sont sécurisées et cryptées. Nous ne stockons pas vos informations bancaires.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-stone-600">Numéro de carte</label>
                            <div className="relative">
                                <input required name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} type="text" className="w-full p-3 pl-12 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none font-mono" placeholder="0000 0000 0000 0000" />
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">Expiration</label>
                                <input required name="expiry" value={formData.expiry} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none font-mono" placeholder="MM/YY" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-600">CVC</label>
                                <input required name="cvc" value={formData.cvc} onChange={handleInputChange} type="text" className="w-full p-3 border-2 border-stone-200 rounded-xl focus:border-cloud-blue focus:ring-0 outline-none font-mono" placeholder="123" />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" disabled={isLoading} className="w-full bg-brand-coral text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-orange-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait">
                                {isLoading ? (
                                    <>Traitement en cours...</>
                                ) : (
                                    <>Payer {total.toFixed(2)}€</>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
                <div className="bg-stone-100 rounded-2xl p-6 sticky top-32">
                    <h3 className="font-display font-bold text-xl text-stone-800 mb-4">Votre commande</h3>
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                        {items.map(item => (
                            <div key={item.id} className="flex gap-3">
                                <div className="w-12 h-16 bg-white rounded border border-stone-200 flex-shrink-0 overflow-hidden relative">
                                    {item.coverImage && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImage})` }}></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-stone-800 text-sm truncate">{item.bookTitle}</h4>
                                    <p className="text-xs text-stone-500">{item.format === 'hardcover' ? 'Rigide' : 'Souple'} x {item.quantity}</p>
                                </div>
                                <div className="font-bold text-stone-800 text-sm">
                                    {(item.price * item.quantity).toFixed(2)}€
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="border-t border-stone-200 pt-4 space-y-2">
                         <div className="flex justify-between text-stone-600 text-sm">
                            <span>Sous-total</span>
                            <span className="font-bold">{total.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-stone-600 text-sm">
                            <span>Livraison</span>
                            <span className="text-green-600 font-bold">Gratuite</span>
                        </div>
                        <div className="border-t border-stone-200 pt-4 mt-4 flex justify-between items-center">
                            <span className="font-bold text-stone-800">Total</span>
                            <span className="font-black text-2xl text-brand-coral">{total.toFixed(2)}€</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-2 text-xs text-stone-500 justify-center">
                        <ShieldCheck size={14} /> Paiement 100% sécurisé
                    </div>
                </div>
            </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutPage;
