import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { SaveButton } from './SaveButton';
import { PromoCode, BookProduct } from '../../types/admin';
import { toast } from 'sonner';

interface PromotionsPanelProps {
  books: BookProduct[];
}

const CATEGORY_LABELS: Record<string, string> = {
  family: 'Famille',
  theme: 'Thème',
  activity: 'Activité',
  occasion: 'Occasion',
};

const PromotionsPanel: React.FC<PromotionsPanelProps> = ({ books }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [savedCodes, setSavedCodes] = useState<PromoCode[]>([]);

  const hasChanges = JSON.stringify(promoCodes) !== JSON.stringify(savedCodes);

  useEffect(() => {
    fetch('/api/settings/promoCodes')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value) {
          setPromoCodes(data.value);
          setSavedCodes(data.value);
        }
      })
      .catch(() => {});
  }, []);

  const save = async (codes: PromoCode[]) => {
    try {
      await fetch('/api/settings/promoCodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: codes }),
      });
      setSavedCodes(codes);
      toast.success('Codes promo sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const update = (codes: PromoCode[]) => setPromoCodes(codes);

  const addCode = () => {
    update([...promoCodes, {
      id: crypto.randomUUID(),
      code: '',
      type: 'percentage',
      value: 10,
      scope: 'all',
      isActive: true,
    }]);
  };

  const removeCode = (id: string) => update(promoCodes.filter(p => p.id !== id));

  const patch = (id: string, changes: Partial<PromoCode>) => {
    update(promoCodes.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  return (
    <div className="space-y-6">
      {/* Codes list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Codes promo ({promoCodes.length})</h3>
            <p className="text-sm text-slate-500">Créez et gérez vos codes promo par panier, catégorie ou produit.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addCode}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 shadow-sm transition-colors"
            >
              <Plus size={15} /> Ajouter un code
            </button>
            <SaveButton
              hasChanges={hasChanges}
              isSaving={false}
              onSave={() => save(promoCodes)}
              className="px-4 py-2 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="p-6 space-y-4">
          {promoCodes.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun code promo configuré</p>
              <p className="text-sm mt-1">Cliquez sur "Ajouter un code" pour commencer.</p>
            </div>
          )}
          {promoCodes.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => patch(p.id, { isActive: !p.isActive })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${p.isActive ? 'left-5' : 'left-1'}`} />
                  </button>
                  <span className={`text-xs font-semibold ${p.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                    {p.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCode(p.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Code</label>
                  <input
                    type="text"
                    value={p.code}
                    onChange={e => patch(p.id, { code: e.target.value.toUpperCase() })}
                    placeholder="EX: SOLDES2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-cloud-blue/30 focus:border-cloud-blue uppercase"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                  <select
                    value={p.type}
                    onChange={e => patch(p.id, { type: e.target.value as PromoCode['type'] })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cloud-blue/30 focus:border-cloud-blue"
                  >
                    <option value="percentage">Pourcentage %</option>
                    <option value="fixed">Montant fixe €</option>
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Valeur {p.type === 'percentage' ? '(%)' : '(€)'}
                  </label>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-cloud-blue/30 focus-within:border-cloud-blue bg-white">
                    <input
                      type="number"
                      min={0}
                      max={p.type === 'percentage' ? 100 : undefined}
                      step={p.type === 'percentage' ? 1 : 0.01}
                      value={p.value}
                      onChange={e => patch(p.id, { value: parseFloat(e.target.value) || 0 })}
                      className="flex-1 outline-none text-center font-bold text-sm w-0"
                    />
                    <span className="text-gray-400 text-sm leading-none shrink-0">
                      {p.type === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cible</label>
                  <select
                    value={p.scope}
                    onChange={e => patch(p.id, { scope: e.target.value as PromoCode['scope'], targetCategory: undefined, targetProductId: undefined })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cloud-blue/30 focus:border-cloud-blue"
                  >
                    <option value="all">Tout le panier</option>
                    <option value="category">Une catégorie</option>
                    <option value="product">Un produit</option>
                  </select>
                </div>
              </div>

              {/* Conditional: category or product */}
              {p.scope === 'category' && (
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Catégorie cible</label>
                  <select
                    value={p.targetCategory ?? ''}
                    onChange={e => patch(p.id, { targetCategory: e.target.value as PromoCode['targetCategory'] })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cloud-blue/30 focus:border-cloud-blue"
                  >
                    <option value="">— Choisir une catégorie —</option>
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {p.scope === 'product' && (
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Produit cible</label>
                  <select
                    value={p.targetProductId ?? ''}
                    onChange={e => patch(p.id, { targetProductId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cloud-blue/30 focus:border-cloud-blue"
                  >
                    <option value="">— Choisir un produit —</option>
                    {books.filter(b => !b.isHidden).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary badge */}
              {p.code && (
                <div className="inline-flex items-center gap-2 bg-cloud-lightest rounded-lg px-3 py-1.5 text-xs text-cloud-dark font-semibold">
                  <Tag size={12} />
                  <span>{p.code}</span>
                  <span className="text-cloud-blue">→</span>
                  <span>
                    {p.type === 'percentage' ? `-${p.value}%` : `-${p.value.toFixed(2)}€`}
                    {p.scope === 'all' ? ' sur tout le panier' : p.scope === 'category' ? ` sur ${CATEGORY_LABELS[p.targetCategory ?? ''] ?? 'catégorie'}` : ` sur ${books.find(b => b.id === p.targetProductId)?.name ?? 'produit'}`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

};

export default PromotionsPanel;
