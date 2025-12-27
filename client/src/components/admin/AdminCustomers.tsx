import React, { useState } from 'react';
import { Download, Plus, ArrowUp, User, MapPin, Edit2 } from 'lucide-react';
import { useEcommerce } from '../../context/EcommerceContext';
import { toast } from 'sonner';

const AdminCustomers: React.FC = () => {
  const { customers, addCustomer, getOrdersByCustomer } = useEcommerce();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // New Customer Form
  const [newCustomerForm, setNewCustomerForm] = useState({
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
  });

  // Edit Customer Form
  const [editCustomerForm, setEditCustomerForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
          street: '',
          zipCode: '',
          city: '',
          country: ''
      }
  });

  const handleCreateCustomer = () => {
      setIsCreatingCustomer(true);
  };

  const submitNewCustomer = () => {
      if (!newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email) {
          toast.error("Veuillez remplir les informations obligatoires");
          return;
      }

      const newCustomer = {
          id: Date.now().toString(),
          firstName: newCustomerForm.firstName,
          lastName: newCustomerForm.lastName,
          email: newCustomerForm.email,
          phone: newCustomerForm.phone,
          address: newCustomerForm.address,
          createdAt: new Date().toISOString(),
          orderCount: 0,
          totalSpent: 0
      };

      addCustomer(newCustomer);
      toast.success("Client créé avec succès !");
      setIsCreatingCustomer(false);
      setNewCustomerForm({
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
      });
  };

  const handleExportCustomers = () => {
    const customersToExport = customers;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Nom,Email,Téléphone,Ville,Commandes,Total Dépensé\n"
      + customersToExport.map(c => `${c.id},${c.firstName} ${c.lastName},${c.email},${c.phone || ''},${c.address?.city || ''},${c.orderCount},${c.totalSpent}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${customersToExport.length} clients exportés avec succès`);
  };

  return (
    <>
      {/* --- VIEW: CUSTOMERS LIST --- */}
      {!selectedCustomerId && !isCreatingCustomer && (
         <div className="space-y-6">
            <div className="flex justify-end items-center">
                 <div className="flex gap-2">
                    <button 
                       onClick={handleExportCustomers}
                       className="bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                       <Download size={16} />
                       Exporter
                    </button>
                    <button 
                       onClick={handleCreateCustomer}
                       className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800 flex items-center gap-2"
                    >
                       <Plus size={16} />
                       Ajouter un client
                    </button>
                 </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 font-medium">
                     <tr>
                        <th className="px-6 py-4">Nom</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Ville</th>
                        <th className="px-6 py-4 text-center">Commandes</th>
                        <th className="px-6 py-4 text-right">Total dépensé</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {customers.map(customer => (
                        <tr key={customer.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                           <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{customer.firstName} {customer.lastName}</div>
                              <div className="text-xs text-slate-400">Inscrit le {new Date(customer.createdAt).toLocaleDateString()}</div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="text-slate-600">{customer.email}</div>
                              <div className="text-xs text-slate-400">{customer.phone || '-'}</div>
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                              {customer.address?.city || '-'}
                           </td>
                           <td className="px-6 py-4 text-center font-medium text-slate-900">
                              {customer.orderCount}
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-slate-900">
                              {customer.totalSpent.toFixed(2)} €
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {/* --- VIEW: CREATE CUSTOMER --- */}
      {isCreatingCustomer && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => setIsCreatingCustomer(false)} className="text-slate-400 hover:text-slate-600">
                  <ArrowUp className="-rotate-90" size={20} />
               </button>
               <h2 className="text-2xl font-bold text-slate-800">Nouveau Client</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <User size={18} className="text-indigo-600" />
                        Informations Client
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                value={newCustomerForm.firstName}
                                onChange={(e) => setNewCustomerForm({...newCustomerForm, firstName: e.target.value})}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                value={newCustomerForm.lastName}
                                onChange={(e) => setNewCustomerForm({...newCustomerForm, lastName: e.target.value})}
                                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                        <input 
                            type="email" 
                            value={newCustomerForm.email}
                            onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone <span className="text-red-500">*</span></label>
                        <input 
                            type="tel" 
                            value={newCustomerForm.phone}
                            onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                        />
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            Adresse
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rue <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={newCustomerForm.address.street}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, street: e.target.value}})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code Postal <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.address.zipCode}
                                        onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, zipCode: e.target.value}})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.address.city}
                                        onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, city: e.target.value}})}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays</label>
                                <select 
                                    value={newCustomerForm.address.country}
                                    onChange={(e) => setNewCustomerForm({...newCustomerForm, address: {...newCustomerForm.address, country: e.target.value}})}
                                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                                >
                                    <option value="France">France</option>
                                    <option value="Belgique">Belgique</option>
                                    <option value="Suisse">Suisse</option>
                                    <option value="Canada">Canada</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsCreatingCustomer(false)}
                        className="px-6 py-2.5 border border-gray-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={submitNewCustomer}
                        disabled={!newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email || !newCustomerForm.phone || !newCustomerForm.address.street || !newCustomerForm.address.zipCode || !newCustomerForm.address.city}
                        className={`px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20 ${
                          !newCustomerForm.firstName || !newCustomerForm.lastName || !newCustomerForm.email || !newCustomerForm.phone || !newCustomerForm.address.street || !newCustomerForm.address.zipCode || !newCustomerForm.address.city
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        Créer le client
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* --- VIEW: CUSTOMER DETAIL --- */}
      {selectedCustomerId && (
         <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => setSelectedCustomerId(null)} className="text-slate-400 hover:text-slate-600">
                  <ArrowUp className="-rotate-90" size={20} />
               </button>
               <h2 className="text-2xl font-bold text-slate-800">Fiche Client</h2>
            </div>

            {(() => {
               const customer = customers.find(c => c.id === selectedCustomerId);
               if (!customer) return <div>Client introuvable</div>;
               const customerOrders = getOrdersByCustomer(customer.id);

               return (
                  <div className="grid grid-cols-3 gap-6">
                     {/* Profile Info */}
                     <div className="col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                           {!isEditingCustomer ? (
                               <>
                                   <div className="flex justify-end mb-2 -mt-2">
                                        <button 
                                            onClick={() => {
                                                setEditCustomerForm({
                                                    firstName: customer.firstName,
                                                    lastName: customer.lastName,
                                                    email: customer.email,
                                                    phone: customer.phone || '',
                                                    address: {
                                                        street: customer.address?.street || '',
                                                        zipCode: customer.address?.zipCode || '',
                                                        city: customer.address?.city || '',
                                                        country: customer.address?.country || ''
                                                    }
                                                });
                                                setIsEditingCustomer(true);
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                                            title="Modifier le profil"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                   </div>
                                   <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-slate-400">
                                      {customer.firstName.charAt(0)}
                                   </div>
                                   <h3 className="text-xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h3>
                                   <p className="text-slate-500 text-sm mb-4">Client depuis {new Date(customer.createdAt).toLocaleDateString()}</p>
                                   
                                   <div className="border-t border-gray-100 pt-4 text-left space-y-3">
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                         <div className="text-sm font-medium text-slate-700 break-all">{customer.email}</div>
                                      </div>
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Téléphone</label>
                                         <div className="text-sm font-medium text-slate-700">{customer.phone || '-'}</div>
                                      </div>
                                      <div>
                                         <label className="text-xs font-bold text-slate-400 uppercase">Adresse</label>
                                         <div className="text-sm font-medium text-slate-700">
                                            {customer.address?.street}<br/>
                                            {customer.address?.zipCode} {customer.address?.city}<br/>
                                            {customer.address?.country}
                                         </div>
                                      </div>
                                   </div>
                               </>
                           ) : (
                               <div className="text-left space-y-4">
                                    <div className="text-center font-bold text-slate-800 mb-4">Modifier le Profil</div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Prénom <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={editCustomerForm.firstName}
                                                onChange={(e) => setEditCustomerForm({...editCustomerForm, firstName: e.target.value})}
                                                className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nom <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={editCustomerForm.lastName}
                                                onChange={(e) => setEditCustomerForm({...editCustomerForm, lastName: e.target.value})}
                                                className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email <span className="text-red-500">*</span></label>
                                        <input 
                                            type="email" 
                                            value={editCustomerForm.email}
                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                                            className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Téléphone</label>
                                        <input 
                                            type="tel" 
                                            value={editCustomerForm.phone}
                                            onChange={(e) => setEditCustomerForm({...editCustomerForm, phone: e.target.value})}
                                            className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 mt-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Adresse</label>
                                        <div className="space-y-2">
                                            <input 
                                                type="text" 
                                                placeholder="Rue"
                                                value={editCustomerForm.address.street}
                                                onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, street: e.target.value}})}
                                                className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Code Postal"
                                                    value={editCustomerForm.address.zipCode}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, zipCode: e.target.value}})}
                                                    className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Ville"
                                                    value={editCustomerForm.address.city}
                                                    onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, city: e.target.value}})}
                                                    className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Pays"
                                                value={editCustomerForm.address.country}
                                                onChange={(e) => setEditCustomerForm({...editCustomerForm, address: {...editCustomerForm.address, country: e.target.value}})}
                                                className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={() => setIsEditingCustomer(false)}
                                            className="flex-1 py-1.5 bg-gray-100 text-slate-600 rounded text-xs font-bold hover:bg-gray-200"
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            onClick={() => {
                                                // Handle update (mock)
                                                toast.success('Profil mis à jour');
                                                setIsEditingCustomer(false);
                                            }}
                                            className="flex-1 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"
                                        >
                                            Enregistrer
                                        </button>
                                    </div>
                               </div>
                           )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                           <h3 className="font-bold text-slate-800 mb-4">Statistiques</h3>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                 <div className="text-2xl font-bold text-indigo-600">{customer.orderCount}</div>
                                 <div className="text-xs text-slate-500 uppercase font-bold">Commandes</div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg text-center">
                                 <div className="text-2xl font-bold text-green-600">{customer.totalSpent.toFixed(2)} €</div>
                                 <div className="text-xs text-slate-500 uppercase font-bold">Dépensé</div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Orders History */}
                     <div className="col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                           <div className="p-4 border-b border-gray-100 font-bold text-slate-700">
                              Historique des commandes
                           </div>
                           {customerOrders.length > 0 ? (
                              <div className="divide-y divide-gray-100">
                                 {customerOrders.map(order => (
                                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                                       <div className="flex justify-between items-start mb-2">
                                          <div>
                                             <div className="font-bold text-slate-900">Commande #{order.id}</div>
                                             <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                             order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                             order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                             order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                                             order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                             'bg-slate-100 text-slate-600'
                                          }`}>
                                             {order.status}
                                          </span>
                                       </div>
                                       <div className="flex justify-between items-end">
                                          <div className="text-sm text-slate-600">
                                             {order.items.length} article(s) : {order.items.map(i => i.bookTitle).join(', ')}
                                          </div>
                                          <div className="font-bold text-slate-900">{order.totalAmount.toFixed(2)} €</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="p-8 text-center text-slate-400 italic">
                                 Aucune commande pour ce client.
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               );
            })()}
         </div>
      )}
    </>
  );
};

export default AdminCustomers;
