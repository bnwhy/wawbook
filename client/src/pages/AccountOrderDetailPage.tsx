import React, { useEffect, useState } from 'react';
import { useLocation, Link, useRoute } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Package, ArrowLeft, Loader2, MapPin, Truck } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  trackingNumber?: string;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    bookTitle: string;
    quantity: number;
    price: number;
  }>;
}

const AccountOrderDetailPage = () => {
  const [, params] = useRoute('/account/orders/:orderId');
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params?.orderId) {
      fetchOrder(params.orderId);
    }
  }, [params?.orderId]);

  const fetchOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'shipped':
        return 'text-blue-600 bg-blue-50';
      case 'processing':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-stone-600 bg-stone-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Livré';
      case 'shipped':
        return 'Expédié';
      case 'processing':
        return 'En préparation';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-cloud-blue animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navigation onStart={() => setLocation('/')} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4">Commande introuvable</p>
            <Link href="/account/orders" className="text-cloud-blue hover:underline font-bold">
              Retour aux commandes
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pt-32 pb-20">
        <Link href="/account/orders" className="inline-flex items-center gap-2 text-cloud-blue hover:underline font-bold mb-6">
          <ArrowLeft size={16} />
          Retour aux commandes
        </Link>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display font-black text-3xl text-stone-900 mb-2">
                Commande #{order.id}
              </h1>
              <p className="text-stone-600">
                Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <span className={`text-sm font-bold px-4 py-2 rounded-full ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          {order.trackingNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-blue-900 text-sm">Numéro de suivi</div>
                <div className="text-blue-700 font-mono">{order.trackingNumber}</div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                <MapPin size={18} />
                Adresse de livraison
              </h3>
              <div className="text-stone-600 text-sm space-y-1">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.zipCode} {order.shippingAddress.city}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 mb-3">Résumé</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Statut du paiement</span>
                  <span className="font-bold text-stone-900">
                    {order.paymentStatus === 'paid' ? 'Payé' : 'En attente'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="font-bold text-stone-900">Total</span>
                  <span className="font-black text-lg text-brand-coral">
                    {formatPrice(Number(order.totalAmount))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
          <h3 className="font-bold text-stone-900 mb-4">Articles commandés</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                <div className="flex-1">
                  <div className="font-bold text-stone-900">{item.bookTitle}</div>
                  <div className="text-sm text-stone-500">Quantité: {item.quantity}</div>
                </div>
                <div className="font-bold text-stone-900">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountOrderDetailPage;
