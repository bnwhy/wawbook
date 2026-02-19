import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useCart } from '../context/CartContext';
import { useEcommerce } from '../context/EcommerceContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Loader2, Lock } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { formatPrice } from '../utils/formatPrice';
import { formatDate } from '../utils/formatDate';
import { toast } from 'sonner';

const CheckoutSuccessPage = () => {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const { createOrder, isLoading: ecommerceLoading } = useEcommerce();
  const { isAuthenticated, setPassword } = useAuth();
  const [orderData, setOrderData] = useState<any>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const processedRef = React.useRef(false);

  useEffect(() => {
    const processOrder = async () => {
      // Protection contre la double exécution (React StrictMode)
      if (processedRef.current) {
        return;
      }
      
      // Wait for ecommerce data to be loaded before processing
      if (ecommerceLoading) {
        return;
      }
      
      processedRef.current = true;
      
      const pendingOrder = localStorage.getItem('pendingOrder');
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (pendingOrder) {
        const data = JSON.parse(pendingOrder);
        setOrderData(data);
        
        try {
          const orderId = await createOrder({
            firstName: data.formData.firstName,
            lastName: data.formData.lastName,
            email: data.formData.email,
            phone: data.formData.phone,
            address: {
              street: data.formData.address,
              city: data.formData.city,
              zipCode: data.formData.zip,
              country: data.formData.country
            }
          }, data.items, data.grandTotal, sessionId || undefined);

          setOrderNumber(orderId);

          if (sessionId) {
            await fetch('/api/checkout/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, orderId }),
            });
          }

          clearCart();
          localStorage.removeItem('pendingOrder');

          // Show account creation if not authenticated
          if (!isAuthenticated) {
            setShowAccountCreation(true);
          }
        } catch (error) {
          console.error('Error processing order:', error);
        }
      }
      setIsProcessing(false);
    };

    processOrder();
  }, [isAuthenticated, ecommerceLoading]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsCreatingAccount(true);

    try {
      await setPassword(orderData.formData.email, password);
      setAccountCreated(true);
      setShowAccountCreation(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du compte');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
          <Loader2 className="w-16 h-16 text-cloud-blue animate-spin mb-6" />
          <h1 className="font-display font-black text-2xl text-stone-900 mb-4">Confirmation en cours...</h1>
          <p className="text-stone-600">Veuillez patienter pendant que nous finalisons votre commande.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={48} />
          </div>
          <h1 className="font-display font-black text-4xl text-stone-900 mb-4">Paiement réussi !</h1>
          <p className="text-stone-600 text-lg max-w-lg mb-8">
            Merci pour votre commande ! Un email de confirmation vous a été envoyé.
          </p>
          <button 
            onClick={() => setLocation('/')}
            className="bg-cloud-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cloud-deep transition-colors"
            data-testid="button-home"
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

        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle size={48} />
          </div>
          <h1 className="font-display font-black text-4xl text-stone-900 mb-4">Commande Confirmée !</h1>
        <p className="text-stone-600 text-lg max-w-lg mb-8">
          Merci {orderData.formData.firstName} ! Votre livre est en route vers l'imprimerie. 
          Un email de confirmation a été envoyé à <span className="font-bold">{orderData.formData.email}</span>.
        </p>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 max-w-md w-full mb-8 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-stone-500">Numéro de commande</span>
            <span className="font-mono font-bold" data-testid="text-order-number">#{orderNumber}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-stone-500">Date</span>
            <span className="font-bold">{formatDate(new Date())}</span>
          </div>
          <div className="border-t border-stone-100 my-4"></div>
          <div className="flex justify-between">
            <span className="font-bold text-stone-800">Total payé</span>
            <span className="font-black text-brand-coral" data-testid="text-total">{formatPrice(orderData.grandTotal)}</span>
          </div>
        </div>
        {/* Post-purchase account creation */}
        {showAccountCreation && !accountCreated && (
          <div className="bg-cloud-lightest/50 rounded-xl p-6 max-w-md w-full mb-6">
            <h3 className="font-bold text-lg text-stone-900 mb-2 flex items-center gap-2">
              <Lock size={20} className="text-cloud-blue" />
              Créer un compte pour suivre vos commandes
            </h3>
            <p className="text-sm text-stone-600 mb-4">
              Retrouvez facilement vos livres personnalisés et passez commande plus rapidement.
            </p>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-1">
                  Choisir un mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none text-sm"
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-stone-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none text-sm"
                  placeholder="Répéter le mot de passe"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="flex-1 bg-cloud-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-cloud-deep transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {isCreatingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountCreation(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium text-sm"
                >
                  Non merci
                </button>
              </div>
            </form>
          </div>
        )}

        {accountCreated && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-md w-full mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-green-900">Compte créé !</div>
                <div className="text-sm text-green-700">Vous êtes maintenant connecté</div>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => setLocation(accountCreated ? '/account' : '/')}
          className="bg-cloud-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cloud-deep transition-colors"
          data-testid="button-home"
        >
          {accountCreated ? 'Voir mon compte' : 'Retour à l\'accueil'}
        </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutSuccessPage;
