import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { User, Package, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';
import { formatDate } from '../utils/formatDate';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number;
}

const AccountPage = () => {
  const { user, logout } = useAuth();
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
        setOrders(data.slice(0, 5));
      } else if (response.status === 401) {
        setLocation('/auth/login');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/');
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
        <div className="mb-8">
          <h1 className="font-display font-black text-4xl text-stone-900 mb-2">
            Mon Compte
          </h1>
          <p className="text-stone-600">
            Bienvenue {user?.firstName} !
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <Link href="/account/profile">
            <a className="block bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-cloud-blue hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-cloud-blue/10 rounded-full flex items-center justify-center group-hover:bg-cloud-blue/20 transition-colors">
                  <User className="w-6 h-6 text-cloud-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-900">Profil</h3>
                  <p className="text-sm text-stone-500">Informations personnelles</p>
                </div>
                <ChevronRight className="text-stone-400 group-hover:text-cloud-blue transition-colors" />
              </div>
            </a>
          </Link>

          {/* Orders Card */}
          <Link href="/account/orders">
            <a className="block bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-cloud-blue hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent-melon/10 rounded-full flex items-center justify-center group-hover:bg-accent-melon/20 transition-colors">
                  <Package className="w-6 h-6 text-accent-melon" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-900">Mes Commandes</h3>
                  {isLoading ? (
                    <div className="h-3 bg-stone-200 rounded animate-pulse w-20 mt-1"></div>
                  ) : (
                    <p className="text-sm text-stone-500">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>
                  )}
                </div>
                <ChevronRight className="text-stone-400 group-hover:text-cloud-blue transition-colors" />
              </div>
            </a>
          </Link>

          {/* Settings Card */}
          <button
            onClick={handleLogout}
            className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-stone-900">Déconnexion</h3>
                <p className="text-sm text-stone-500">Se déconnecter</p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-stone-900">
              Commandes récentes
            </h2>
            <Link href="/account/orders" className="text-cloud-blue hover:underline font-bold text-sm">
              Voir toutes
            </Link>
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
                  <a className="block border border-stone-200 rounded-lg p-4 hover:border-cloud-blue hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-stone-900 mb-1">
                          Commande #{order.id}
                        </div>
                        <div className="text-sm text-stone-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900 mb-1">
                          {formatPrice(Number(order.totalAmount))}
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <ChevronRight className="text-stone-400" />
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

export default AccountPage;
