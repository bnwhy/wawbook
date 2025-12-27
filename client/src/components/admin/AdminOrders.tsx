import React, { useState } from 'react';
import { Book, Plus, Download, Search, ArrowUp, ArrowDown, User, MapPin, ChevronRight, Package, Truck, Check } from 'lucide-react';
import { useEcommerce } from '../../context/EcommerceContext';
import { useBooks } from '../../context/BooksContext';
import { toast } from 'sonner';

const AdminOrders: React.FC = () => {
  const { orders, customers, createOrder, updateOrderStatus, updateOrderTracking, addOrderLog, getOrdersByCustomer } = useEcommerce();
  const { books } = useBooks();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showFulfillment, setShowFulfillment] = useState(false);
  
  // Filters & Sorting
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Create Order State
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newOrderForm, setNewOrderForm] = useState({
      customer: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: {
              street: '',
              zipCode: '',
              city: '',
              country: 'France'
          }
      },
      items: [
          {
              bookId: books[0]?.id || '',
              quantity: 1,
              config: '{\n  "name": "",\n  "gender": "boy"\n}'
          }
      ]
  });

  // Fulfillment State
  const [fulfillmentTracking, setFulfillmentTracking] = useState('');

  // Draft Comment State
  const [newComment, setNewComment] = useState('');

  const submitNewOrder = () => {
      if (!newOrderForm.customer.lastName || !newOrderForm.customer.email) {
          toast.error("Veuillez remplir les informations client obligatoires");
          return;
      }
      
      let itemConfig = {};
      try {
        // @ts-ignore
        itemConfig = JSON.parse(newOrderForm.items[0].config);
      } catch (e) {
        toast.error("La configuration doit être un JSON valide");
        return;
      }

      const orderItems = newOrderForm.items.map(item => {
          const book = books.find(b => b.id === item.bookId) || books[0];
          return {
              productId: book.id,
              bookTitle: book.name,
              quantity: item.quantity,
              price: book.price,
              config: itemConfig
          };
      });

      const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      createOrder(newOrderForm.customer, orderItems, totalAmount);
      toast.success("Commande créée avec succès !");
      setIsCreatingOrder(false);
      
      // Reset form
      setNewOrderForm({
          customer: {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              address: {
                  street: '',
                  zipCode: '',
                  city: '',
                  country: 'France'
              }
          },
          items: [
              {
                  bookId: books[0]?.id || '',
                  quantity: 1,
                  config: '{\n  "name": "",\n  "gender": "boy"\n}'
              }
          ]
      });
  };

  const handleExport = () => {
    const ordersToExport = selectedOrderIds.size > 0 
      ? orders.filter(o => selectedOrderIds.has(o.id))
      : orders;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Date,Client,Email,Statut,Total,Tracking\n"
      + ordersToExport.map(o => `${o.id},${o.createdAt},${o.customerName},${o.customerEmail},${o.status},${o.totalAmount},${o.trackingNumber || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `commandes_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${ordersToExport.length} commandes exportées avec succès`);
  };

  return (
    <>
      {/* --- VIEW: ORDERS LIST --- */}
      {!selectedOrderId && !isCreatingOrder && (
        <div className="space-y-4">
           <div className="flex flex-col gap-4">
              <div className="flex justify-end items-center">
                 <div className="flex gap-2">
                    <button 
                       onClick={handleExport}
                       className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                       <Download size={16} />
                       Exporter {selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''}
                    </button>
                    <button 
                       onClick={() => setIsCreatingOrder(true)}
                       className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800 flex items-center gap-2"
                    >
                       <Plus size={16} />
                       Créer une commande
                    </button>
                 </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                 <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 px-2">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                       <button 
                          onClick={() => setOrderFilter(null)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${!orderFilter ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}
                       >
                          Tout
                       </button>
                       {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                           <button 
                              key={status}
                              onClick={() => setOrderFilter(status)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${orderFilter === status ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
                           >
                              {status === 'pending' ? 'En attente' : status === 'processing' ? 'En cours' : status === 'shipped' ? 'Expédiée' : status === 'delivered' ? 'Livrée' : 'Annulée'}
                           </button>
                       ))}
                    </div>
                    <div className="relative">
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       <input 
                          type="text" 
                          placeholder="Rechercher..." 
                          className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 outline-none focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all"
                       />
                    </div>
                 </div>
                 
                 {/* Table */}
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-gray-100">
                          <tr>
                             <th className="px-4 py-3 w-8">
                                <input 
                                   type="checkbox" 
                                   className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                                   checked={orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id))}
                                   onChange={(e) => {
                                      if (e.target.checked) {
                                         const allIds = orders.map(o => o.id);
                                         setSelectedOrderIds(new Set(allIds));
                                      } else {
                                         setSelectedOrderIds(new Set());
                                      }
                                   }}
                                />
                             </th>
                             <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id')}>
                                 <div className="flex items-center gap-1">
                                     Commande
                                     {sortConfig?.key === 'id' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                             <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                                 <div className="flex items-center gap-1">
                                     Date
                                     {sortConfig?.key === 'createdAt' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                             <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('customerName')}>
                                 <div className="flex items-center gap-1">
                                     Client
                                     {sortConfig?.key === 'customerName' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                             <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalAmount')}>
                                 <div className="flex items-center justify-end gap-1">
                                     Total
                                     {sortConfig?.key === 'totalAmount' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                             <th className="px-4 py-3 font-semibold">Statut paiement</th>
                             <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                                 <div className="flex items-center gap-1">
                                     Statut traitement
                                     {sortConfig?.key === 'status' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                             <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('items')}>
                                 <div className="flex items-center gap-1">
                                     Articles
                                     {sortConfig?.key === 'items' && (
                                         sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                     )}
                                 </div>
                             </th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {orders
                             .filter(order => !orderFilter || order.status === orderFilter)
                             .sort((a, b) => {
                                if (!sortConfig) return 0;
                                const { key, direction } = sortConfig;
                                
                                // Handle specific fields
                                let aValue: any = a[key as keyof typeof a];
                                let bValue: any = b[key as keyof typeof b];

                                if (key === 'items') {
                                    aValue = a.items.length;
                                    bValue = b.items.length;
                                }
                                
                                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                                return 0;
                             })
                             .map(order => {
                             // Mock statuses for the view
                             const isPaid = order.status !== 'pending' && order.status !== 'cancelled';
                             const paymentStatus = isPaid ? 'Payé' : 'En attente';
                             const paymentColor = isPaid ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-800';
                             
                             const fulfillmentStatus = 
                                order.status === 'delivered' ? 'Livré' :
                                order.status === 'shipped' ? 'Expédié' :
                                order.status === 'processing' ? 'En cours' :
                                order.status === 'cancelled' ? 'Annulé' : 'Non traité';
                                
                             const fulfillmentColor = 
                                order.status === 'delivered' ? 'bg-slate-100 text-slate-700' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                                order.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-800';

                             return (
                                <tr key={order.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => setSelectedOrderId(order.id)}>
                                   <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                         type="checkbox" 
                                         className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                                         checked={selectedOrderIds.has(order.id)}
                                         onChange={(e) => {
                                            e.stopPropagation(); // Prevent row click
                                            const newSelected = new Set(selectedOrderIds);
                                            if (e.target.checked) {
                                               newSelected.add(order.id);
                                            } else {
                                               newSelected.delete(order.id);
                                            }
                                            setSelectedOrderIds(newSelected);
                                         }}
                                      />
                                   </td>
                                   <td className="px-4 py-3 font-bold text-slate-900 group-hover:underline">#{order.id.slice(0,8)}</td>
                                   <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                      <span className="text-slate-400 ml-1 text-[10px]">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                   </td>
                                   <td className="px-4 py-3">
                                      <div className="font-medium text-slate-900">{order.customerName}</div>
                                   </td>
                                   <td className="px-4 py-3 text-right font-medium text-slate-900">
                                      {order.totalAmount.toFixed(2)} €
                                   </td>
                                   <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${paymentColor}`}>
                                         <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPaid ? 'bg-slate-500' : 'bg-orange-500'}`}></div>
                                         {paymentStatus}
                                      </span>
                                   </td>
                                   <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${fulfillmentColor}`}>
                                         {fulfillmentStatus}
                                      </span>
                                   </td>
                                   <td className="px-4 py-3 text-slate-500">{order.items.length} article{order.items.length > 1 ? 's' : ''}</td>
                                </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- VIEW: CREATE ORDER --- */}
      {isCreatingOrder && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => setIsCreatingOrder(false)} className="text-slate-400 hover:text-slate-600">
                  <ArrowUp className="-rotate-90" size={20} />
               </button>
               <h2 className="text-2xl font-bold text-slate-800">Nouvelle Commande</h2>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Customer Info */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <User size={18} className="text-indigo-600" />
                                Informations Client
                            </h3>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button 
                                    onClick={() => setIsNewCustomer(true)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isNewCustomer ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Nouveau
                                </button>
                                <button 
                                    onClick={() => setIsNewCustomer(false)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isNewCustomer ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Existant
                                </button>
                            </div>
                        </div>

                        {!isNewCustomer && (
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Sélectionner un client..."
                                            value={newOrderForm.customer.email ? `${newOrderForm.customer.firstName} ${newOrderForm.customer.lastName}` : ''}
                                            className="w-full text-sm border-gray-300 rounded-lg pl-10 focus:ring-brand-coral focus:border-brand-coral px-3 py-2 cursor-pointer bg-slate-50"
                                        />
                                        <select 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const c = customers.find(c => c.id === e.target.value);
                                                if (c) {
                                                    setNewOrderForm({
                                                        ...newOrderForm,
                                                        customer: {
                                                            firstName: c.firstName,
                                                            lastName: c.lastName,
                                                            email: c.email,
                                                            phone: c.phone || '',
                                                            address: c.address || { street: '', zipCode: '', city: '', country: 'France' }
                                                        }
                                                    });
                                                }
                                            }}
                                        >
                                            <option value="">Choisir...</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom</label>
                                <input 
                                    type="text" 
                                    value={newOrderForm.customer.firstName}
                                    onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, firstName: e.target.value}})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom</label>
                                <input 
                                    type="text" 
                                    value={newOrderForm.customer.lastName}
                                    onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, lastName: e.target.value}})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input 
                                type="email" 
                                value={newOrderForm.customer.email}
                                onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, email: e.target.value}})}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="font-bold text-slate-700 mb-3 text-sm">Adresse de livraison</h4>
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="Rue"
                                    value={newOrderForm.customer.address.street}
                                    onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, street: e.target.value}}})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Code Postal"
                                        value={newOrderForm.customer.address.zipCode}
                                        onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, zipCode: e.target.value}}})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Ville"
                                        value={newOrderForm.customer.address.city}
                                        onChange={(e) => setNewOrderForm({...newOrderForm, customer: {...newOrderForm.customer, address: {...newOrderForm.customer.address, city: e.target.value}}})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Package size={18} className="text-indigo-600" />
                            Articles
                        </h3>
                        
                        {newOrderForm.items.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-gray-200 mb-4">
                                <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livre</label>
                                        <select 
                                            value={item.bookId}
                                            onChange={(e) => {
                                                const newItems = [...newOrderForm.items];
                                                newItems[idx].bookId = e.target.value;
                                                setNewOrderForm({...newOrderForm, items: newItems});
                                            }}
                                            className="w-full text-sm border-gray-300 rounded-lg px-3 py-2"
                                        >
                                            {books.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} - {b.price}€</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantité</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...newOrderForm.items];
                                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                                setNewOrderForm({...newOrderForm, items: newItems});
                                            }}
                                            className="w-full text-sm border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Configuration (JSON)</label>
                                    <textarea 
                                        value={item.config}
                                        onChange={(e) => {
                                            const newItems = [...newOrderForm.items];
                                            newItems[idx].config = e.target.value;
                                            setNewOrderForm({...newOrderForm, items: newItems});
                                        }}
                                        className="w-full text-xs font-mono border-gray-300 rounded-lg px-3 py-2 h-20"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary & Action */}
                <div className="col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                        <h3 className="font-bold text-slate-800 mb-4">Résumé</h3>
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Articles ({newOrderForm.items.reduce((acc, i) => acc + i.quantity, 0)})</span>
                                <span className="font-medium">
                                    {newOrderForm.items.reduce((acc, item) => {
                                        const book = books.find(b => b.id === item.bookId);
                                        return acc + ((book?.price || 0) * item.quantity);
                                    }, 0).toFixed(2)} €
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Livraison</span>
                                <span className="font-medium">4.90 €</span>
                            </div>
                            <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                                <span className="font-bold text-slate-800">Total</span>
                                <span className="text-xl font-bold text-indigo-600">
                                    {(newOrderForm.items.reduce((acc, item) => {
                                        const book = books.find(b => b.id === item.bookId);
                                        return acc + ((book?.price || 0) * item.quantity);
                                    }, 0) + 4.90).toFixed(2)} €
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={submitNewOrder}
                            className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-colors"
                        >
                            Créer la commande
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* --- VIEW: ORDER DETAIL & FULFILLMENT --- */}
      {selectedOrderId && !showFulfillment && (
         <div className="max-w-4xl mx-auto space-y-6">
            {(() => {
               const order = orders.find(o => o.id === selectedOrderId);
               if (!order) return <div>Commande introuvable</div>;

               return (
                  <>
                     <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setSelectedOrderId(null)} className="text-slate-400 hover:text-slate-600">
                           <ArrowUp className="-rotate-90" size={20} />
                        </button>
                        <div>
                           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                              Commande #{order.id}
                              <span className={`text-sm px-2 py-1 rounded-full font-bold uppercase ${
                                 order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                 order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                 order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                                 'bg-slate-100 text-slate-600'
                              }`}>
                                 {order.status}
                              </span>
                           </h2>
                           <div className="text-slate-500 text-sm mt-1">
                              Passée le {new Date(order.createdAt).toLocaleDateString()} à {new Date(order.createdAt).toLocaleTimeString()}
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-slate-700 flex justify-between items-center">
                                 <span>Articles ({order.items.length})</span>
                                 <span className="text-sm font-normal text-slate-500">ID: {order.id}</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                 {order.items.map((item, idx) => (
                                    <div key={idx} className="p-4 flex gap-4">
                                       <div className="w-16 h-20 bg-slate-100 rounded border border-gray-200 shrink-0"></div>
                                       <div className="flex-1">
                                          <div className="flex justify-between items-start">
                                             <div>
                                                <h4 className="font-bold text-slate-800">{item.bookTitle}</h4>
                                                <div className="text-sm text-slate-500 mt-1">
                                                   Quantité: {item.quantity} • Prix: {item.price.toFixed(2)} €
                                                </div>
                                             </div>
                                             <div className="font-bold text-slate-900">
                                                {(item.quantity * item.price).toFixed(2)} €
                                             </div>
                                          </div>
                                          <div className="mt-3 text-xs bg-slate-50 p-2 rounded text-slate-600 font-mono">
                                             {JSON.stringify(item.configuration)}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end">
                                 <div className="text-right">
                                    <div className="text-sm text-slate-500">Sous-total: {(order.totalAmount - 4.90).toFixed(2)} €</div>
                                    <div className="text-sm text-slate-500">Livraison: 4.90 €</div>
                                    <div className="text-xl font-bold text-slate-900 mt-1">Total: {order.totalAmount.toFixed(2)} €</div>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                              <h3 className="font-bold text-slate-800 mb-4">Activité</h3>
                              <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 ml-3">
                                 {order.logs?.map(log => (
                                    <div key={log.id} className="relative">
                                       <div className={`absolute -left-[23px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                                          log.type === 'status_change' ? 'bg-indigo-500' : 
                                          log.type === 'system' ? 'bg-slate-300' : 'bg-amber-400'
                                       }`}></div>
                                       <div className="flex justify-between items-start">
                                          <div>
                                             <div className="text-sm font-medium text-slate-900">{log.message}</div>
                                             <div className="text-xs text-slate-500 mt-0.5">par {log.author}</div>
                                          </div>
                                          <div className="text-xs text-slate-400">
                                             {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              
                              <div className="mt-6 pt-4 border-t border-gray-100">
                                 <div className="flex gap-2">
                                    <input 
                                       type="text" 
                                       placeholder="Ajouter une note privée..." 
                                       className="flex-1 text-sm border-gray-300 rounded-lg px-3 py-2"
                                       value={newComment}
                                       onChange={(e) => setNewComment(e.target.value)}
                                       onKeyDown={(e) => {
                                          if (e.key === 'Enter' && newComment.trim()) {
                                             addOrderLog(order.id, newComment, 'comment');
                                             setNewComment('');
                                          }
                                       }}
                                    />
                                    <button 
                                       onClick={() => {
                                          if (newComment.trim()) {
                                             addOrderLog(order.id, newComment, 'comment');
                                             setNewComment('');
                                          }
                                       }}
                                       className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-200"
                                    >
                                       Ajouter
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="col-span-1 space-y-6">
                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                              <h3 className="font-bold text-slate-800 mb-4">Client</h3>
                              <div className="flex items-center gap-3 mb-4">
                                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                    {order.customerName.charAt(0)}
                                 </div>
                                 <div>
                                    <div className="font-bold text-sm text-slate-900">{order.customerName}</div>
                                    <div className="text-xs text-slate-500">{order.customerEmail}</div>
                                 </div>
                              </div>
                              <div className="space-y-3 pt-4 border-t border-gray-100">
                                 <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Adresse de livraison</label>
                                    <div className="text-sm text-slate-600 mt-1">
                                       {order.shippingAddress.street}<br/>
                                       {order.shippingAddress.zipCode} {order.shippingAddress.city}<br/>
                                       {order.shippingAddress.country}
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                              <h3 className="font-bold text-slate-800 mb-4">Actions</h3>
                              <div className="space-y-2">
                                 {order.status === 'pending' && (
                                    <button 
                                       onClick={() => updateOrderStatus(order.id, 'processing')}
                                       className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                                    >
                                       Lancer la production
                                    </button>
                                 )}
                                 {order.status === 'processing' && (
                                    <button 
                                       onClick={() => setShowFulfillment(true)}
                                       className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                                    >
                                       Expédier la commande
                                    </button>
                                 )}
                                 {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                    <button 
                                       onClick={() => {
                                          if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                                             updateOrderStatus(order.id, 'cancelled');
                                          }
                                       }}
                                       className="w-full py-2 bg-white border border-gray-300 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors"
                                    >
                                       Annuler la commande
                                    </button>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </>
               );
            })()}
         </div>
      )}

      {/* --- VIEW: FULFILLMENT --- */}
      {selectedOrderId && showFulfillment && (
         <div className="max-w-2xl mx-auto mt-12">
            {(() => {
               const order = orders.find(o => o.id === selectedOrderId);
               if (!order) return null;

               return (
                  <>
                     <button onClick={() => setShowFulfillment(false)} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-2">
                        <ArrowUp className="-rotate-90" size={16} /> Retour à la commande
                     </button>
                     <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 bg-slate-900 text-white">
                           <h2 className="text-xl font-bold flex items-center gap-3">
                              <Truck className="text-brand-coral" />
                              Expédition de la commande
                           </h2>
                           <p className="text-slate-400 text-sm mt-1">Commande #{order.id} • {order.customerName}</p>
                        </div>
                        <div className="p-8 space-y-6">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Transporteur</label>
                              <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
                                 <option>Colissimo</option>
                                 <option>Mondial Relay</option>
                                 <option>DHL Express</option>
                              </select>
                           </div>
                           
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Numéro de suivi</label>
                              <input 
                                 type="text" 
                                 value={fulfillmentTracking}
                                 onChange={(e) => setFulfillmentTracking(e.target.value)}
                                 placeholder="ex: 8J00123456789"
                                 className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono"
                              />
                           </div>

                           <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-3">
                              <div className="shrink-0">
                                 <input type="checkbox" defaultChecked className="mt-1 rounded text-orange-600 focus:ring-orange-500" />
                              </div>
                              <div>
                                 <div className="font-bold text-orange-800 text-sm">Notifier le client</div>
                                 <p className="text-orange-700/80 text-xs">Un email sera envoyé à {order.customerEmail} avec le lien de suivi.</p>
                              </div>
                           </div>

                           <div className="pt-4">
                              <button 
                                 onClick={() => {
                                    if (fulfillmentTracking) {
                                       updateOrderTracking(order.id, fulfillmentTracking);
                                       toast.success(`Commande expédiée avec le suivi ${fulfillmentTracking}`);
                                       setShowFulfillment(false);
                                    } else {
                                       toast.error("Veuillez entrer un numéro de suivi");
                                    }
                                 }}
                                 disabled={!fulfillmentTracking}
                                 className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                    !fulfillmentTracking 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                 }`}
                              >
                                 Confirmer l'expédition
                              </button>
                           </div>
                        </div>
                     </div>
                  </>
               );
            })()}
         </div>
      )}
    </>
  );
};

export default AdminOrders;
