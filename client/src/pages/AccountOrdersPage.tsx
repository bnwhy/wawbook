import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Package, ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { formatDate } from '../utils/formatDate';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  items: any[];
}

const AccountOrdersPage = () => {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders/my-orders', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 pt-32 pb-20">
        <Link href="/account" className="inline-flex items-center gap-2 text-cloud-blue hover:underline font-bold mb-6">
          <ArrowLeft size={16} />
          Retour au compte
        </Link>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-accent-melon/10 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-accent-melon" />
            </div>
            <div>
              <h1 className="font-display font-black text-3xl text-stone-900">
                Mes Commandes
              </h1>
              <p className="text-stone-600">
                {orders.length} commande{orders.length > 1 ? 's' : ''} au total
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cloud-blue animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600 mb-4">Vous n'avez pas encore de commandes</p>
              <Link
                href="/"
                className="inline-block bg-cloud-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-cloud-deep transition-colors"
              >
                Découvrir nos livres
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link key={order.id} href={`/account/orders/${order.id}`}>
                  <a className="block border border-stone-200 rounded-lg p-6 hover:border-cloud-blue hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="font-bold text-stone-900 text-lg mb-1">
                          Commande #{order.id}
                        </div>
                        <div className="text-sm text-stone-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900 text-lg mb-2">
                          {formatPrice(Number(order.totalAmount))}
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <ChevronRight className="text-stone-400 flex-shrink-0" />
                    </div>

                    <div className="pt-4 border-t border-stone-100">
                      <div className="text-sm text-stone-600">
                        {order.items.length} article{order.items.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountOrdersPage;
