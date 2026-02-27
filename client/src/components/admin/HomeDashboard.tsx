import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPrice } from '../../utils/formatPrice';
import type { Order } from '../../types/ecommerce';
import type { BookProduct } from '../../types/admin';

type AdminTab = 'home' | 'books' | 'wizard' | 'avatars' | 'content' | 'menus' | 'customers' | 'orders' | 'printers' | 'settings' | 'analytics' | 'shipping' | 'homepage';

interface HomeDashboardProps {
  orders: Order[];
  books: BookProduct[];
  ordersLoading: boolean;
  setActiveTab: (tab: AdminTab) => void;
  setSelectedOrderId: (id: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  orders,
  books,
  ordersLoading,
  setActiveTab,
  setSelectedOrderId,
}) => {
  const totalSales = orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ventes Totales</h3>
          </div>
          {ordersLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-slate-200 rounded w-32"></div>
              <div className="h-3 bg-slate-100 rounded w-24"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900">{totalSales.toFixed(2)} €</div>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Commandes</h3>
          </div>
          {ordersLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-slate-200 rounded w-16"></div>
              <div className="h-3 bg-slate-100 rounded w-24"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900">{totalOrders}</div>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Panier Moyen</h3>
          </div>
          {ordersLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-slate-200 rounded w-28"></div>
              <div className="h-3 bg-slate-100 rounded w-24"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900">{avgOrder.toFixed(2)} €</div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Dernières commandes</h3>
              <button onClick={() => setActiveTab('orders')} className="text-indigo-600 text-sm font-bold hover:underline">Tout voir</button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Commande</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordersLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse w-28"></div></td>
                      <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded-full animate-pulse w-16"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded animate-pulse w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setActiveTab('orders'); setSelectedOrderId(order.id); }}>
                    <td className="px-6 py-4 font-bold text-slate-900">{order.id}</td>
                    <td className="px-6 py-4">{order.customerName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status === 'pending' ? 'En attente' :
                         order.status === 'processing' ? 'En cours' :
                         order.status === 'shipped' ? 'Expédiée' :
                         order.status === 'delivered' ? 'Livrée' : 'Annulée'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{Number(order.totalAmount).toFixed(2)} €</td>
                  </tr>
                ))}
                {!ordersLoading && orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Aucune commande récente</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4">À faire</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-orange-800">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>
                <span className="text-sm font-medium">{orders.filter(o => o.status === 'pending').length} commandes à traiter</span>
                <ChevronRight size={16} className="ml-auto opacity-50" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <span className="text-sm font-medium">{orders.filter(o => o.status === 'processing').length} en cours de production</span>
                <ChevronRight size={16} className="ml-auto opacity-50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4">Top Produits</h3>
            <div className="space-y-4">
              {books.slice(0, 3).map((book, i) => (
                <div key={book.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{book.name}</div>
                    <div className="text-xs text-slate-500">{book.wizardConfig.tabs.length} options</div>
                  </div>
                  <div className="text-xs font-bold text-slate-700">{formatPrice(book.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
