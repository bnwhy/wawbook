import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useCart } from '../context/CartContext';
import { useEcommerce } from '../context/EcommerceContext';
import { CheckCircle } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const CheckoutSuccessPage = () => {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const { createOrder } = useEcommerce();
  const [orderData, setOrderData] = useState<any>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    const pendingOrder = localStorage.getItem('pendingOrder');
    if (pendingOrder) {
      const data = JSON.parse(pendingOrder);
      setOrderData(data);
      
      createOrder({
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
      }, data.items, data.grandTotal);

      setOrderNumber(Math.random().toString(36).substr(2, 9).toUpperCase());
      clearCart();
      localStorage.removeItem('pendingOrder');
    }
  }, []);

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
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
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
            <span className="font-bold">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="border-t border-stone-100 my-4"></div>
          <div className="flex justify-between">
            <span className="font-bold text-stone-800">Total payé</span>
            <span className="font-black text-brand-coral" data-testid="text-total">{orderData.grandTotal.toFixed(2)}€</span>
          </div>
        </div>
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
};

export default CheckoutSuccessPage;
