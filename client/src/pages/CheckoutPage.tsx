import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useEcommerce } from '../context/EcommerceContext';
import { ArrowLeft, CheckCircle, CreditCard, Truck, ShieldCheck, Lock, ChevronDown, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { ShippingMethod } from '../types/ecommerce';
import { ALL_COUNTRIES } from '../data/countries';

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
  const { createOrder, shippingZones } = useEcommerce();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');

  const [billingMode, setBillingMode] = useState<'same' | 'different'>('same');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    zip: '',
    country: 'France',
    phone: '',
  });

  // Shipping State
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);

  // Compute available countries from shipping zones
  const availableCountries = useMemo(() => {
      const countriesInZones = new Set(shippingZones.flatMap(z => z.countries));
      // Filter ALL_COUNTRIES to keep the priority order, or just return the list if ALL_COUNTRIES is not comprehensive enough
      // But since ALL_COUNTRIES is large, intersection is best.
      const filtered = ALL_COUNTRIES.filter(c => countriesInZones.has(c));
      
      // If we have countries in zones that are NOT in our big list (e.g. typos or manual additions), add them at the end
      const knownCountries = new Set(ALL_COUNTRIES);
      const extraCountries = Array.from(countriesInZones).filter(c => !knownCountries.has(c)).sort();
      
      return [...filtered, ...extraCountries];
  }, [shippingZones]);

  // Ensure selected country is valid
  useEffect(() => {
      if (availableCountries.length > 0 && !availableCountries.includes(formData.country)) {
          setFormData(prev => ({ ...prev, country: availableCountries[0] }));
      }
  }, [availableCountries, formData.country]);

  // Find applicable zone based on country
  const applicableZone = shippingZones.find(z => 
      z.countries.some(c => c.toLowerCase() === formData.country.toLowerCase())
  );

  // Set default shipping method when zone changes
  useEffect(() => {
      if (applicableZone && applicableZone.methods.length > 0) {
          // Keep current if valid, otherwise select first
          if (!selectedShippingMethodId || !applicableZone.methods.find(m => m.id === selectedShippingMethodId)) {
              setSelectedShippingMethodId(applicableZone.methods[0].id);
          }
      } else {
          setSelectedShippingMethodId(null);
      }
  }, [applicableZone?.id, formData.country]);

  const selectedMethod = applicableZone?.methods.find(m => m.id === selectedShippingMethodId);
  const shippingCost = selectedMethod ? selectedMethod.price : 0;
  const grandTotal = total + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
        alert("Veuillez sélectionner un mode de livraison valide pour votre pays.");
        return;
    }
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            name: item.bookTitle || 'Livre personnalisé',
            price: item.price + (shippingCost / items.length),
            quantity: item.quantity,
          })),
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          shippingAddress: {
            street: formData.address,
            apartment: formData.apartment,
            city: formData.city,
            zipCode: formData.zip,
            country: formData.country,
            phone: formData.phone,
          },
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        localStorage.setItem('pendingOrder', JSON.stringify({
          formData,
          items,
          grandTotal,
          shippingMethod: selectedMethod,
        }));
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
      setIsLoading(false);
    }
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
                <span className="font-black text-brand-coral">{grandTotal.toFixed(2)}€</span>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
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
                <span className={step === 'details' ? 'text-cloud-blue' : 'text-green-600'}>1. Information</span>
                <span className="text-stone-300">/</span>
                <span className={step === 'payment' ? 'text-cloud-blue' : ''}>2. Livraison</span>
                <span className="text-stone-300">/</span>
                <span>3. Confirmation</span>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Form Area */}
                <div className="lg:col-span-2">
                    {step === 'details' ? (
                       <>
                            <form onSubmit={handleDetailsSubmit} className="space-y-8">
                                {/* Contact Section */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="font-bold text-lg text-stone-800">Contact</h2>
                                        <div className="text-sm text-stone-600">
                                            Déjà un compte ? <a href="#" className="text-cloud-blue hover:underline">Se connecter</a>
                                        </div>
                                    </div>
                                    <input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow" placeholder="Email" />
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="newsletter" className="rounded border-stone-300 text-cloud-blue focus:ring-cloud-blue" />
                                        <label htmlFor="newsletter" className="text-sm text-stone-600 cursor-pointer">M'envoyer les actualités et offres par e-mail</label>
                                    </div>
                                </div>

                                {/* Delivery Section */}
                                <div className="space-y-4">
                                    <h2 className="font-bold text-lg text-stone-800">Livraison</h2>
                                    
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <select 
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none appearance-none bg-white cursor-pointer"
                                            >
                                                {availableCountries.length > 0 ? (
                                                    availableCountries.map(country => (
                                                        <option key={country} value={country}>{country}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Aucun pays de livraison configuré</option>
                                                )}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <input required name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Prénom" />
                                            <input required name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Nom" />
                                        </div>

                                        <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Adresse" />
                                        <input name="apartment" type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Appartement, suite, etc. (facultatif)" />

                                        <div className="grid grid-cols-2 gap-3">
                                            <input required name="zip" value={formData.zip} onChange={handleInputChange} type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Code postal" />
                                            <input required name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Ville" />
                                        </div>
                                        
                                        <input name="phone" type="tel" className="w-full p-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none" placeholder="Téléphone" />
                                    </div>
                                </div>

                                {/* Shipping Method */}
                                <div className="space-y-4">
                                    <h2 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                                        Mode d'expédition
                                    </h2>
                                    
                                    {applicableZone ? (
                                        applicableZone.methods.length > 0 ? (
                                            <div className="border border-stone-300 rounded-lg overflow-hidden">
                                                {applicableZone.methods.map((method) => (
                                                    <label key={method.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors border-b border-stone-200 last:border-b-0">
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type="radio" 
                                                                name="shipping" 
                                                                checked={selectedShippingMethodId === method.id}
                                                                onChange={() => setSelectedShippingMethodId(method.id)}
                                                                className="text-cloud-blue focus:ring-cloud-blue" 
                                                            />
                                                            <div>
                                                                <div className="text-sm font-medium text-stone-800">{method.name}</div>
                                                                {method.estimatedDelay && <div className="text-xs text-stone-500">{method.estimatedDelay}</div>}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-stone-800">
                                                            {Number(method.price) === 0 ? 'Gratuit' : `${Number(method.price).toFixed(2)} €`}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-3 text-sm">
                                                <AlertCircle size={18} />
                                                <p>Aucun mode de livraison disponible pour cette zone.</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-3 text-sm">
                                            <AlertCircle size={18} />
                                            <p>Nous ne livrons pas encore dans ce pays ({formData.country}). Veuillez nous contacter pour plus d'informations.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                                    <a href="/cart" className="flex items-center gap-2 text-cloud-blue hover:text-cloud-deep text-sm font-medium transition-colors">
                                        <ArrowLeft size={16} /> Retour au panier
                                    </a>
                                    <button type="submit" className="w-full sm:w-auto bg-cloud-blue text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg hover:bg-cloud-deep hover:scale-[1.01] active:scale-[0.99] transition-all">
                                        Continuer vers le paiement
                                    </button>
                                </div>
                            </form>
                       </>
                    ) : (
                        <form onSubmit={handlePaymentSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 space-y-6">
                             <div className="flex items-center gap-2 mb-6 cursor-pointer text-stone-500 hover:text-stone-800 transition-colors" onClick={() => setStep('details')}>
                                <ArrowLeft size={16} /> Retour aux détails
                            </div>
                            
                            <h2 className="font-display font-black text-2xl text-stone-800 flex items-center gap-3">
                                <CreditCard className="text-cloud-blue" /> Paiement sécurisé
                            </h2>

                            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-bold text-stone-700">Récapitulatif de livraison</h3>
                                <div className="text-sm text-stone-600 space-y-1">
                                    <p><span className="font-medium">{formData.firstName} {formData.lastName}</span></p>
                                    <p>{formData.address}{formData.apartment ? `, ${formData.apartment}` : ''}</p>
                                    <p>{formData.zip} {formData.city}, {formData.country}</p>
                                    <p>{formData.email}</p>
                                    {formData.phone && <p>{formData.phone}</p>}
                                </div>
                                {selectedMethod && (
                                    <div className="pt-2 border-t border-stone-200 mt-2">
                                        <p className="text-sm text-stone-600">
                                            <span className="font-medium">Livraison :</span> {selectedMethod.name}
                                            {selectedMethod.estimatedDelay && ` (${selectedMethod.estimatedDelay})`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                                <Lock size={16} className="mt-0.5 flex-shrink-0" />
                                <p>Vous allez être redirigé vers la page de paiement sécurisée Stripe. Toutes les transactions sont cryptées.</p>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={isLoading || !selectedMethod} className="w-full bg-cloud-deep text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-cloud-dark hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isLoading ? (
                                        <>Redirection vers Stripe...</>
                                    ) : (
                                        <>Payer {grandTotal.toFixed(2)}€</>
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
                                <span className={shippingCost === 0 ? "text-green-600 font-bold" : "font-bold text-stone-800"}>
                                    {shippingCost === 0 ? "Gratuite" : `${shippingCost.toFixed(2)}€`}
                                </span>
                            </div>
                            <div className="border-t border-stone-200 pt-4 mt-4 flex justify-between items-center">
                                <span className="font-bold text-stone-800">Total</span>
                                <span className="font-black text-2xl text-brand-coral">{grandTotal.toFixed(2)}€</span>
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
