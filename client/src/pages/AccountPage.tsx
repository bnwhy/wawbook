import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { User, Package, LogOut, ChevronRight, Loader2, BookOpen, Gift, Cloud } from 'lucide-react';
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
      const response = await fetch('/api/orders/my-orders', { credentials: 'include' });
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
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'shipped': return 'text-blue-600 bg-blue-50';
      case 'processing': return 'text-orange-600 bg-orange-50';
      default: return 'text-stone-600 bg-stone-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livré';
      case 'shipped': return 'Expédié';
      case 'processing': return 'En préparation';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const memberSince = user?.createdAt ? formatDate(user.createdAt) : '—';

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation onStart={() => setLocation('/')} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-28 pb-14 px-6 bg-sky-100">
        {/* Floating clouds — identiques à la page d'accueil */}
        <div className="absolute top-32 left-10 text-white opacity-60 animate-float pointer-events-none"><Cloud size={100} fill="currentColor" /></div>
        <div className="absolute top-52 right-20 text-white opacity-40 animate-float-delayed pointer-events-none"><Cloud size={80} fill="currentColor" /></div>
        <div className="absolute bottom-10 left-1/4 text-white opacity-50 animate-float pointer-events-none"><Cloud size={120} fill="currentColor" /></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-cloud-blue mb-3">Espace membre</p>

          <h1 className="font-display font-black text-4xl md:text-5xl text-cloud-dark leading-tight mb-6">
            Bienvenue au nuage<span className="text-cloud-blue relative inline-block">club
              <svg className="absolute w-full h-4 -bottom-1 left-0 text-accent-sun" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            <br />
            {user?.firstName}
          </h1>

        </div>
      </section>

      {/* ── BODY ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pb-20 flex flex-col lg:flex-row gap-6 items-start">

        {/* ── SIDEBAR ── */}
        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0">

          {/* Avatar + navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            {/* Avatar */}
            <div className="p-5 text-center border-b border-stone-100">
              <div className="w-16 h-16 bg-cloud-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="font-black text-xl text-cloud-blue">{initials}</span>
              </div>
              <div className="font-bold text-stone-900">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-stone-400 mt-0.5">{user?.email}</div>
            </div>

            {/* Nav links */}
            <div className="p-2">
              <Link href="/account/profile">
                <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sky-50 hover:text-cloud-blue transition-colors group">
                  <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                    <User size={16} className="text-cloud-blue" />
                  </div>
                  <span className="font-semibold text-sm text-stone-700 group-hover:text-cloud-blue">Mon profil</span>
                  <ChevronRight size={15} className="ml-auto text-stone-300 group-hover:text-cloud-blue" />
                </a>
              </Link>

              <div className="h-px bg-stone-100 my-1" />

              <Link href="/account/orders">
                <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sky-50 hover:text-cloud-blue transition-colors group">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <Package size={16} className="text-accent-melon" />
                  </div>
                  <span className="font-semibold text-sm text-stone-700 group-hover:text-cloud-blue">Mes commandes</span>
                  <ChevronRight size={15} className="ml-auto text-stone-300 group-hover:text-cloud-blue" />
                </a>
              </Link>

              <div className="h-px bg-stone-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="font-semibold text-sm text-stone-700 group-hover:text-red-600">Déconnexion</span>
              </button>
            </div>
          </div>

          {/* Avantages */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Vos avantages nuageclub</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package size={17} className="text-cloud-blue" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900">Suivi en temps réel</div>
                  <div className="text-xs text-stone-400 leading-relaxed">Suivez chaque étape de vos créations</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <Gift size={17} className="text-green-600" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900">Promotions exclusives</div>
                  <div className="text-xs text-stone-400 leading-relaxed">Offres réservées aux membres du club</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Promo banner */}
          <div className="bg-cloud-lightest rounded-3xl p-6 relative overflow-hidden">
            {/* Décors */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-cloud-blue/10 rounded-full -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-accent-sun/10 rounded-full -ml-8 -mb-8 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-11 h-11 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                <Gift size={20} className="text-cloud-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-cloud-dark text-base leading-tight">-15% sur votre prochain livre</div>
                <div className="text-cloud-dark/70 text-sm mt-0.5">Code exclusif membre : <span className="font-black text-cloud-blue">CLUB15</span> — valable jusqu'au 31 mars</div>
              </div>
              <Link href="/" className="shrink-0 bg-cloud-blue hover:bg-cloud-blue/80 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">
                Utiliser
              </Link>
            </div>
          </div>

          {/* Commandes récentes */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-stone-900">Commandes récentes</h2>
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
                <Package className="w-14 h-14 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-500 mb-5 text-sm">Vous n'avez pas encore de commandes</p>
                <Link href="/" className="inline-block bg-cloud-blue text-white font-bold py-2.5 px-6 rounded-lg hover:bg-cloud-deep transition-colors text-sm">
                  Découvrir nos livres
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link key={order.id} href={`/account/orders/${order.id}`}>
                    <a className="flex items-center gap-4 p-4 border border-stone-200 rounded-xl hover:border-cloud-blue hover:shadow-sm transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-stone-900 truncate">Commande #{order.id}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{formatDate(order.createdAt)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-stone-900">{formatPrice(Number(order.totalAmount))}</div>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 inline-block ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-stone-300 shrink-0" />
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;
