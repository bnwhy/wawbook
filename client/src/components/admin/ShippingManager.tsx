import React, { useState, useEffect } from 'react';
import { Plus, Globe, Edit2, Trash2, X, Filter, Package } from 'lucide-react';
import { ShippingZone, ShippingMethod } from '../../types/ecommerce';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { formatPrice } from '../../utils/formatPrice';
import { SaveButton } from './SaveButton';

interface ShippingManagerProps {
  shippingZones: ShippingZone[];
  defaultShippingRate: number;
  updateDefaultShippingRate: (rate: number) => void;
  addShippingZone: (zone: ShippingZone) => void;
  updateShippingZone: (id: string, updates: Partial<ShippingZone>) => void;
  deleteShippingZone: (id: string) => void;
  editingZoneId: string | null;
  setEditingZoneId: (id: string | null) => void;
}

const ShippingManager: React.FC<ShippingManagerProps> = ({
  shippingZones, defaultShippingRate, updateDefaultShippingRate,
  addShippingZone, updateShippingZone, deleteShippingZone,
  editingZoneId, setEditingZoneId,
}) => {
  const [localZones, setLocalZones] = useState<ShippingZone[]>([]);
  const [originalZones, setOriginalZones] = useState<ShippingZone[]>([]);
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);

  // Default rate — local draft with explicit save
  const [localRate, setLocalRate] = useState<number>(defaultShippingRate);
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    setLocalZones(JSON.parse(JSON.stringify(shippingZones)));
    setOriginalZones(JSON.parse(JSON.stringify(shippingZones)));
  }, [shippingZones]);

  useEffect(() => {
    setLocalRate(defaultShippingRate);
  }, [defaultShippingRate]);

  const updateLocalZone = (id: string, updates: Partial<ShippingZone>) => {
    setLocalZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const handleSaveZone = async (zone: ShippingZone) => {
    setSavingZoneId(zone.id);
    try {
      await updateShippingZone(zone.id, {
        name: zone.name,
        countries: zone.countries,
        methods: zone.methods,
      });
      setEditingZoneId(null);
    } finally {
      setSavingZoneId(null);
    }
  };

  const handleSaveRate = async () => {
    setSavingRate(true);
    try {
      await updateDefaultShippingRate(localRate);
    } finally {
      setSavingRate(false);
    }
  };

  return (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Expédition et Livraison</h2>
        <p className="text-slate-500 mt-1">Configurez les zones, tarifs et délais de livraison.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { const newZone: ShippingZone = { id: `zone-${Date.now()}`, name: 'Nouvelle Zone', countries: [], methods: [] }; addShippingZone(newZone); setEditingZoneId(newZone.id); }} className="bg-white border border-gray-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
          <Plus size={18} /> Ajouter une zone
        </button>
      </div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Globe size={20} className="text-indigo-600" />Zones d'expédition</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Tarif par défaut:</label>
          <div className="relative w-24">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input
              type="number"
              value={localRate}
              onChange={(e) => setLocalRate(parseFloat(e.target.value) || 0)}
              className="w-full text-sm border border-gray-300 rounded-lg pl-6 pr-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-bold text-slate-800"
              placeholder="0.00"
            />
          </div>
          <SaveButton
            hasChanges={localRate !== defaultShippingRate}
            isSaving={savingRate}
            onSave={handleSaveRate}
            className="px-3 py-1 rounded-lg text-xs"
            label="Sauvegarder"
            savedLabel="Enregistré"
          />
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {localZones.map(zone => {
          const original = originalZones.find(z => z.id === zone.id);
          const hasZoneChanges = JSON.stringify(zone) !== JSON.stringify(original);
          return (
          <div key={zone.id} className="p-6">
            {editingZoneId === zone.id ? (
              <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-indigo-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom de la zone</label>
                    <input type="text" value={zone.name} onChange={(e) => updateLocalZone(zone.id, { name: e.target.value })} className="w-full text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: France Métropolitaine" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pays (Codes ISO ou Noms)</label>
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white border border-gray-300 rounded min-h-[42px]">
                      {zone.countries.map(country => (
                        <span key={country} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          {country}
                          <button onClick={() => updateLocalZone(zone.id, { countries: zone.countries.filter(c => c !== country) })}><X size={12} /></button>
                        </span>
                      ))}
                      <input type="text" placeholder={zone.countries.length === 0 ? "Ajouter (Entrée)" : ""} className="bg-transparent border-none p-0 text-sm focus:ring-0 min-w-[100px] flex-1"
                        onKeyDown={(e) => { if (e.key === 'Enter') { const val = e.currentTarget.value.trim(); if (val && !zone.countries.includes(val)) { updateLocalZone(zone.id, { countries: [...zone.countries, val] }); e.currentTarget.value = ''; } } }} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">Méthodes de livraison</label>
                    <button onClick={() => { const newMethod: ShippingMethod = { id: `method-${Date.now()}`, name: 'Nouvelle méthode', price: 0, estimatedDelay: '2-3 jours' }; updateLocalZone(zone.id, { methods: [...zone.methods, newMethod] }); }} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Ajouter une méthode
                    </button>
                  </div>
                  <div className="space-y-3">
                    {zone.methods.map((method, mIdx) => (
                      <div key={method.id} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded border border-gray-200 items-start md:items-center">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <input type="text" value={method.name} onChange={(e) => { const nm=[...zone.methods]; nm[mIdx]={...method,name:e.target.value}; updateLocalZone(zone.id,{methods:nm}); }} className="flex-1 text-sm font-bold border-none p-0 focus:ring-0 text-slate-800 placeholder-gray-400" placeholder="Nom de la méthode" />
                            {method.condition && method.condition.type !== 'none' && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                {method.condition.type === 'price' ? 'Prix' : method.condition.type === 'weight' ? 'Poids' : 'Quantité'} {method.condition.operator === 'greater_than' ? '> ' : method.condition.operator === 'less_than' ? '< ' : ''}{method.condition.value}{method.condition.operator === 'between' ? ` - ${method.condition.maxValue}` : ''}{method.condition.type === 'price' ? '€' : method.condition.type === 'weight' ? 'kg' : ''}
                              </span>
                            )}
                          </div>
                          <input type="text" value={method.estimatedDelay || ''} onChange={(e) => { const nm=[...zone.methods]; nm[mIdx]={...method,estimatedDelay:e.target.value}; updateLocalZone(zone.id,{methods:nm}); }} className="w-full text-xs text-slate-500 border-none p-0 focus:ring-0 placeholder-gray-300" placeholder="Délai estimé (ex: 48h)" />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                            <input type="number" value={method.price} onChange={(e) => { const nm=[...zone.methods]; nm[mIdx]={...method,price:parseFloat(e.target.value)||0}; updateLocalZone(zone.id,{methods:nm}); }} className="w-20 text-sm border border-gray-200 rounded pl-6 pr-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 text-right font-bold" />
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={`p-1.5 rounded transition-colors ${method.condition?.type && method.condition.type !== 'none' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}><Filter size={16} /></button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 bg-white">
                              <div className="space-y-4">
                                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Filter size={14} /> Condition d'application</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Type de condition</label>
                                    <select className="w-full text-sm border border-gray-200 rounded p-2" value={method.condition?.type || 'none'} onChange={(e) => { const nm=[...zone.methods]; const type=e.target.value as any; nm[mIdx]={...method,condition:type==='none'?undefined:{type,operator:'greater_than',value:0}}; updateLocalZone(zone.id,{methods:nm}); }}>
                                      <option value="none">Aucune condition (Toujours appliquer)</option>
                                      <option value="price">Basé sur le prix de la commande</option>
                                      <option value="weight">Basé sur le poids de la commande</option>
                                      <option value="quantity">Basé sur la quantité d'articles</option>
                                    </select>
                                  </div>
                                  {method.condition && method.condition.type !== 'none' && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Opérateur</label>
                                        <select className="w-full text-sm border border-gray-200 rounded p-2" value={method.condition.operator} onChange={(e) => { const nm=[...zone.methods]; if(nm[mIdx].condition){(nm[mIdx].condition as any).operator=e.target.value; updateLocalZone(zone.id,{methods:nm});} }}>
                                          <option value="greater_than">Supérieur à ({'>'}</option>
                                          <option value="less_than">Inférieur à ({'<'})</option>
                                          <option value="between">Entre</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Valeur {method.condition.type === 'price' ? '(€)' : method.condition.type === 'weight' ? '(kg)' : '(Qté)'}</label>
                                        <input type="number" className="w-full text-sm border border-gray-200 rounded p-2" value={method.condition.value} onChange={(e) => { const nm=[...zone.methods]; if(nm[mIdx].condition){nm[mIdx].condition.value=parseFloat(e.target.value)||0; updateLocalZone(zone.id,{methods:nm});} }} />
                                      </div>
                                    </div>
                                  )}
                                  {method.condition && method.condition.operator === 'between' && (
                                    <div>
                                      <label className="text-xs font-bold text-slate-500 mb-1 block">Valeur Max {method.condition.type === 'price' ? '(€)' : method.condition.type === 'weight' ? '(kg)' : '(Qté)'}</label>
                                      <input type="number" className="w-full text-sm border border-gray-200 rounded p-2" value={method.condition.maxValue || 0} onChange={(e) => { const nm=[...zone.methods]; if(nm[mIdx].condition){nm[mIdx].condition.maxValue=parseFloat(e.target.value)||0; updateLocalZone(zone.id,{methods:nm});} }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <button onClick={() => updateLocalZone(zone.id, { methods: zone.methods.filter((_, i) => i !== mIdx) })} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    {zone.methods.length === 0 && <p className="text-sm text-gray-400 italic text-center py-2">Aucune méthode configurée pour cette zone.</p>}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                  <button onClick={() => { if (confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) { deleteShippingZone(zone.id); } }} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"><Trash2 size={14} /> Supprimer la zone</button>
                  <SaveButton
                    hasChanges={hasZoneChanges}
                    isSaving={savingZoneId === zone.id}
                    onSave={() => handleSaveZone(zone)}
                    label="Enregistrer"
                    savedLabel="Enregistré"
                    className="px-4 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">{zone.countries.length > 0 ? zone.countries[0].substring(0, 2).toUpperCase() : '??'}</div>
                    <div>
                      <h4 className="font-bold text-slate-900">{zone.name}</h4>
                      <p className="text-xs text-slate-500 truncate max-w-md">{zone.countries.length > 0 ? zone.countries.join(', ') : 'Aucun pays défini'}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingZoneId(zone.id)} className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1"><Edit2 size={14} /> Modifier</button>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-gray-100 space-y-3">
                  {zone.methods.map(method => (
                    <div key={method.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{method.name}</span>
                            {method.condition && method.condition.type !== 'none' && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                {method.condition.type === 'price' ? 'Prix' : method.condition.type === 'weight' ? 'Poids' : 'Quantité'} {method.condition.operator === 'greater_than' ? '> ' : method.condition.operator === 'less_than' ? '< ' : ''}{method.condition.value}{method.condition.operator === 'between' ? ` - ${method.condition.maxValue}` : ''}{method.condition.type === 'price' ? '€' : method.condition.type === 'weight' ? 'kg' : ''}
                              </span>
                            )}
                          </div>
                          {method.estimatedDelay && <span className="text-[10px] text-slate-400">{method.estimatedDelay}</span>}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{formatPrice(method.price)}</div>
                    </div>
                  ))}
                  {zone.methods.length === 0 && <p className="text-xs text-slate-400 italic">Aucune méthode de livraison configurée.</p>}
                </div>
              </>
            )}
          </div>
          );
        })}
        {localZones.length === 0 && (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Globe size={32} className="text-slate-300" /></div>
            <h3 className="text-slate-800 font-bold mb-2">Aucune zone d'expédition</h3>
            <p className="text-slate-500 text-sm mb-6">Configurez les zones où vous livrez vos produits.</p>
            <button onClick={() => { const nz: ShippingZone = { id: `zone-${Date.now()}`, name: 'Nouvelle Zone', countries: [], methods: [] }; addShippingZone(nz); setEditingZoneId(nz.id); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">Créer une première zone</button>
          </div>
        )}
      </div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Package size={20} className="text-indigo-600" />Règles d'emballage</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Poids par livre (g)</label>
            <input type="number" className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" defaultValue={350} />
            <p className="text-xs text-slate-500 mt-1">Poids moyen utilisé pour le calcul des frais de port.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ShippingManager;
