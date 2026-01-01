import React from 'react';
import { useLocation } from 'wouter';
import { XCircle, ArrowLeft } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const CheckoutCancelPage = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
        <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <XCircle size={48} />
        </div>
        <h1 className="font-display font-black text-4xl text-stone-900 mb-4">Paiement annulé</h1>
        <p className="text-stone-600 text-lg max-w-lg mb-8">
          Votre paiement a été annulé. Aucun montant n'a été débité. 
          Votre panier a été conservé, vous pouvez reprendre votre commande à tout moment.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => setLocation('/cart')}
            className="bg-cloud-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cloud-deep transition-colors flex items-center gap-2"
            data-testid="button-cart"
          >
            <ArrowLeft size={18} />
            Retour au panier
          </button>
          <button 
            onClick={() => setLocation('/')}
            className="bg-stone-200 text-stone-700 font-bold py-3 px-8 rounded-full hover:bg-stone-300 transition-colors"
            data-testid="button-home"
          >
            Accueil
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutCancelPage;
