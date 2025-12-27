import React from 'react';
import { BarChart3, Globe, ChevronRight } from 'lucide-react';
import { useEcommerce } from '../../context/EcommerceContext';
import { useBooks } from '../../context/BooksContext';

interface AdminHomeProps {
  setActiveTab: (tab: any) => void;
  setSelectedOrderId: (id: string | null) => void;
}

const AdminHome: React.FC<AdminHomeProps> = ({ setActiveTab, setSelectedOrderId }) => {
  const { orders } = useEcommerce();
  const { books } = useBooks();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ventes Totales</h3>
            <div className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">+12%</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {orders.reduce((acc, order) => acc + order.totalAmount, 0).toFixed(2)} €
          </div>
          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Commandes</h3>
            <div className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">+5%</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {orders.length}
          </div>
          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Panier Moyen</h3>
            <div className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold">-2%</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {orders.length > 0 ? (orders.reduce((acc, order) => acc + order.totalAmount, 0) / orders.length).toFixed(2) : '0.00'} €
          </div>
          <div className="text-xs text-slate-400">Sur les 30 derniers jours</div>
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
                {orders.slice(0, 5).map(order => (
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
                    <td className="px-6 py-4 text-right font-bold">{order.totalAmount.toFixed(2)} €</td>
                  </tr>
                ))}
                {orders.length === 0 && (
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
                  <div className="text-xs font-bold text-slate-700">{book.price} €</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
