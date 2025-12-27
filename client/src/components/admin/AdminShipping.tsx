import React, { useState } from 'react';
import { Globe, Plus, X, Trash2, Save, Zap, Truck, Edit2, Package } from 'lucide-react';
import { useEcommerce } from '../../context/EcommerceContext';
import { ShippingZone, ShippingMethod } from '../../types/ecommerce';

const AdminShipping: React.FC = () => {
  const { shippingZones, addShippingZone, updateShippingZone, deleteShippingZone } = useEcommerce();
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expédition et Livraison</h2>
          <p className="text-slate-500 mt-1">Configurez les zones, tarifs et délais de livraison.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const newZone: ShippingZone = {
                id: `zone-${Date.now()}`,
                name: 'Nouvelle Zone',
                countries: [],
                methods: []
              };
              addShippingZone(newZone);
              setEditingZoneId(newZone.id);
            }}
            className="bg-white border border-gray-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Plus size={18} /> Ajouter une zone
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Globe size={20} className="text-indigo-600" />
            Zones d'expédition
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {shippingZones.map(zone => (
            <div key={zone.id} className="p-6">
              {editingZoneId === zone.id ? (
                <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-indigo-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nom de la zone</label>
                      <input 
                        type="text" 
                        value={zone.name}
                        onChange={(e) => updateShippingZone(zone.id, { name: e.target.value })}
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: France Métropolitaine"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pays (Codes ISO ou Noms)</label>
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white border border-gray-300 rounded min-h-[42px]">
                        {zone.countries.map(country => (
                          <span key={country} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            {country}
                            <button onClick={() => updateShippingZone(zone.id, { countries: zone.countries.filter(c => c !== country) })}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <input 
                          type="text" 
                          placeholder={zone.countries.length === 0 ? "Ajouter (Entrée)" : ""}
                          className="bg-transparent border-none p-0 text-sm focus:ring-0 min-w-[100px] flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim();
                              if (val && !zone.countries.includes(val)) {
                                updateShippingZone(zone.id, { countries: [...zone.countries, val] });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-700">Méthodes de livraison</label>
                      <button 
                        onClick={() => {
                          const newMethod: ShippingMethod = {
                            id: `method-${Date.now()}`,
                            name: 'Nouvelle méthode',
                            price: 0,
                            estimatedDelay: '2-3 jours'
                          };
                          updateShippingZone(zone.id, { methods: [...zone.methods, newMethod] });
                        }}
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} /> Ajouter une méthode
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {zone.methods.map((method, mIdx) => (
                        <div key={method.id} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded border border-gray-200 items-start md:items-center">
                          <div className="flex-1 w-full">
                            <input 
                              type="text" 
                              value={method.name}
                              onChange={(e) => {
                                const newMethods = [...zone.methods];
                                newMethods[mIdx] = { ...method, name: e.target.value };
                                updateShippingZone(zone.id, { methods: newMethods });
                              }}
                              className="w-full text-sm font-bold border-none p-0 focus:ring-0 text-slate-800 placeholder-gray-400"
                              placeholder="Nom de la méthode"
                            />
                            <input 
                              type="text" 
                              value={method.estimatedDelay || ''}
                              onChange={(e) => {
                                const newMethods = [...zone.methods];
                                newMethods[mIdx] = { ...method, estimatedDelay: e.target.value };
                                updateShippingZone(zone.id, { methods: newMethods });
                              }}
                              className="w-full text-xs text-slate-500 border-none p-0 focus:ring-0 placeholder-gray-300"
                              placeholder="Délai estimé (ex: 48h)"
                            />
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                              <input 
                                type="number" 
                                value={method.price}
                                onChange={(e) => {
                                  const newMethods = [...zone.methods];
                                  newMethods[mIdx] = { ...method, price: parseFloat(e.target.value) || 0 };
                                  updateShippingZone(zone.id, { methods: newMethods });
                                }}
                                className="w-20 text-sm border border-gray-200 rounded pl-6 pr-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 text-right font-bold"
                              />
                            </div>
                            <button 
                              onClick={() => {
                                const newMethods = zone.methods.filter((_, i) => i !== mIdx);
                                updateShippingZone(zone.id, { methods: newMethods });
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {zone.methods.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-2">Aucune méthode configurée pour cette zone.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                    <button 
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
                          deleteShippingZone(zone.id);
                        }
                      }}
                      className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 size={14} /> Supprimer la zone
                    </button>
                    <button 
                      onClick={() => setEditingZoneId(null)}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Save size={16} /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                        {zone.countries.length > 0 ? zone.countries[0].substring(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{zone.name}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-md">
                          {zone.countries.length > 0 ? zone.countries.join(', ') : 'Aucun pays défini'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingZoneId(zone.id)}
                      className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1"
                    >
                      <Edit2 size={14} /> Modifier
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-gray-100 space-y-3">
                    {zone.methods.map(method => (
                      <div key={method.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {method.name.toLowerCase().includes('express') || method.price > 10 ? (
                            <Zap size={16} className="text-amber-500" />
                          ) : (
                            <Truck size={16} className="text-slate-400" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">{method.name}</span>
                            {method.estimatedDelay && (
                              <span className="text-[10px] text-slate-400">{method.estimatedDelay}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{method.price.toFixed(2)} €</div>
                      </div>
                    ))}
                    {zone.methods.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Aucune méthode de livraison configurée.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {shippingZones.length === 0 && (
            <div className="p-12 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-bold mb-2">Aucune zone d'expédition</h3>
              <p className="text-slate-500 text-sm mb-6">Configurez les zones où vous livrez vos produits.</p>
              <button 
                onClick={() => {
                  const newZone: ShippingZone = {
                    id: `zone-${Date.now()}`,
                    name: 'Nouvelle Zone',
                    countries: [],
                    methods: []
                  };
                  addShippingZone(newZone);
                  setEditingZoneId(newZone.id);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
              >
                Créer une première zone
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            Règles d'emballage
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Poids par livre (g)</label>
              <input 
                type="number" 
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                defaultValue={350}
              />
              <p className="text-xs text-slate-500 mt-1">Poids moyen utilisé pour le calcul des frais de port.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Frais de manutention (€)</label>
              <input 
                type="number" 
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
                defaultValue={0}
              />
              <p className="text-xs text-slate-500 mt-1">Ajouté automatiquement à chaque commande.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminShipping;
