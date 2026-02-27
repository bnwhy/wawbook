import React, { Dispatch, SetStateAction, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Book, Package, Users, AlertTriangle } from 'lucide-react';
import { SaveButton } from './SaveButton';

interface SettingsState {
  general: { storeName: string; supportEmail: string; currency: string; language: string };
  payment: { stripeEnabled: boolean; stripeKey: string; stripeSecretKey: string; paypalEnabled: boolean; acceptedPaymentMethods: string[] };
  notifications: { orderConfirmation: boolean; shippingUpdate: boolean };
}

interface SettingsPanelProps {
  settings: SettingsState;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  handleSaveSettings: (section: string) => Promise<void>;
  savedSettings: SettingsState;
}

type DangerAction = { label: string; endpoint: string; successMsg: string; word: string; colorClass: string };

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, handleSaveSettings, savedSettings }) => {
  const [modal, setModal] = useState<{ action: DangerAction; typed: string } | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const handleSave = async (section: string) => {
    setSavingSection(section);
    try { await handleSaveSettings(section); } finally { setSavingSection(null); }
  };

  const openModal = (action: DangerAction) => setModal({ action, typed: '' });
  const closeModal = () => setModal(null);

  const handleConfirm = async () => {
    if (!modal || modal.typed !== modal.action.word) return;
    closeModal();
    try {
      const r = await fetch(modal.action.endpoint, { method: 'DELETE' });
      if (r.ok) { toast.success(modal.action.successMsg); window.location.reload(); }
      else { toast.error('Erreur lors de la suppression'); }
    } catch { toast.error('Erreur de connexion'); }
  };

  const hasChangesGeneral = JSON.stringify(settings.general) !== JSON.stringify(savedSettings.general);
  const hasChangesPayment = JSON.stringify(settings.payment) !== JSON.stringify(savedSettings.payment);
  const hasChangesNotifications = JSON.stringify(settings.notifications) !== JSON.stringify(savedSettings.notifications);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Général</h3>
            <p className="text-sm text-slate-500">Informations de base de votre boutique</p>
          </div>
          <SaveButton
            hasChanges={hasChangesGeneral}
            isSaving={savingSection === 'Général'}
            onSave={() => handleSave('Général')}
            className="px-4 py-2 rounded-lg text-sm"
          />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de la boutique</label>
              <input type="text" value={settings.general.storeName} onChange={(e) => setSettings({...settings, general: {...settings.general, storeName: e.target.value}})} className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de contact</label>
              <input type="email" value={settings.general.supportEmail} onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})} className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
              <select value={settings.general.currency} onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})} className="w-full text-sm border border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2">
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GBP">Livre (£)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Paiement</h3>
            <p className="text-sm text-slate-500">Fournisseurs et passerelles de paiement</p>
          </div>
          <SaveButton
            hasChanges={hasChangesPayment}
            isSaving={savingSection === 'Paiement'}
            onSave={() => handleSave('Paiement')}
            className="px-4 py-2 rounded-lg text-sm"
          />
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.payment.stripeEnabled} onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeEnabled: e.target.checked}})} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Stripe</h4>
              <p className="text-sm text-slate-500 mb-2">Accepter les cartes bancaires via Stripe.</p>
              {settings.payment.stripeEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clé API Publique <span className="text-slate-400 normal-case font-normal">(pk_...)</span></label>
                    <input type="text" value={settings.payment.stripeKey} onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeKey: e.target.value}})} className="w-full text-sm border border-gray-300 rounded-lg bg-slate-50 font-mono text-slate-600 px-3 py-2" placeholder="pk_live_..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clé Secrète <span className="text-slate-400 normal-case font-normal">(sk_...)</span></label>
                    <input type="password" value={settings.payment.stripeSecretKey || ''} onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeSecretKey: e.target.value}})} className="w-full text-sm border border-gray-300 rounded-lg bg-slate-50 font-mono text-slate-600 px-3 py-2" placeholder="sk_live_..." />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.payment.paypalEnabled} onChange={(e) => setSettings({...settings, payment: {...settings.payment, paypalEnabled: e.target.checked}})} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">PayPal</h4>
              <p className="text-sm text-slate-500">Accepter les paiements via PayPal.</p>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-700 mb-3">Badges des moyens de paiement affichés</h4>
            <p className="text-sm text-slate-500 mb-4">Sélectionnez les badges à afficher sur les pages de paiement.</p>
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase">Cartes bancaires</div>
              <div className="grid grid-cols-2 gap-3">
                {[{id:'visa',label:'Visa'},{id:'mastercard',label:'Mastercard'},{id:'amex',label:'American Express'},{id:'discover',label:'Discover'}].map(method => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral" />
                    <span className="text-sm text-slate-700">{method.label}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-4">Portefeuilles digitaux</div>
              <div className="grid grid-cols-2 gap-3">
                {[{id:'applepay',label:'Apple Pay'},{id:'googlepay',label:'Google Pay'}].map(method => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral" />
                    <span className="text-sm text-slate-700">{method.label}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-4">Autres moyens</div>
              <div className="grid grid-cols-2 gap-3">
                {[{id:'paypal',label:'PayPal'},{id:'klarna',label:'Klarna'}].map(method => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral" />
                    <span className="text-sm text-slate-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Notifications</h3>
            <p className="text-sm text-slate-500">Emails transactionnels</p>
          </div>
          <SaveButton
            hasChanges={hasChangesNotifications}
            isSaving={savingSection === 'Notifications'}
            onSave={() => handleSave('Notifications')}
            className="px-4 py-2 rounded-lg text-sm"
          />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.notifications.orderConfirmation} onChange={(e) => setSettings({...settings,notifications:{...settings.notifications,orderConfirmation:e.target.checked}})} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Confirmation de commande</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de la commande.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.notifications.shippingUpdate} onChange={(e) => setSettings({...settings,notifications:{...settings.notifications,shippingUpdate:e.target.checked}})} className="rounded border border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Mise à jour d'expédition</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de l'expédition.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
          <div>
            <h3 className="font-bold text-red-700 text-lg flex items-center gap-2"><AlertTriangle size={18} /> Zone Dangereuse</h3>
            <p className="text-sm text-red-500">Actions irréversibles sur les données</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <button onClick={() => openModal({ label: "Supprimer TOUTES les données", endpoint: '/api/admin/reset/all', successMsg: 'Toutes les données ont été supprimées', word: 'SUPPRIMER', colorClass: 'red' })} className="w-full bg-white border-2 border-red-500 text-red-600 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
            <Trash2 size={16} /> Supprimer TOUTES les données
          </button>
          <button onClick={() => openModal({ label: "Supprimer tous les livres", endpoint: '/api/admin/reset/books', successMsg: 'Tous les livres ont été supprimés', word: 'LIVRES', colorClass: 'orange' })} className="w-full bg-white border border-orange-300 text-orange-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors">
            <Book size={16} /> Supprimer tous les livres
          </button>
          <button onClick={() => openModal({ label: "Supprimer toutes les commandes", endpoint: '/api/admin/reset/orders', successMsg: 'Toutes les commandes ont été supprimées', word: 'COMMANDES', colorClass: 'blue' })} className="w-full bg-white border border-blue-300 text-blue-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
            <Package size={16} /> Supprimer toutes les commandes
          </button>
          <button onClick={() => openModal({ label: "Supprimer tous les clients", endpoint: '/api/admin/reset/customers', successMsg: 'Tous les clients ont été supprimés', word: 'CLIENTS', colorClass: 'purple' })} className="w-full bg-white border border-purple-300 text-purple-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors">
            <Users size={16} /> Supprimer tous les clients
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-2">{modal.action.label}</h3>
            <p className="text-sm text-slate-500 mb-4">
              Tapez <span className="font-bold text-red-600">{modal.action.word}</span> pour confirmer cette action irréversible.
            </p>
            <input
              type="text"
              value={modal.typed}
              onChange={(e) => setModal({ ...modal, typed: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none"
              placeholder={`Tapez ${modal.action.word}`}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={modal.typed !== modal.action.word}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${modal.typed === modal.action.word ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
