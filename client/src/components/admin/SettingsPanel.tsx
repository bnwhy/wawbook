import React, { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { Save, Trash2, Book, Package, Users } from 'lucide-react';

interface SettingsState {
  general: { storeName: string; supportEmail: string; currency: string; language: string };
  payment: { stripeEnabled: boolean; stripeKey: string; paypalEnabled: boolean; acceptedPaymentMethods: string[] };
  shipping: { freeShippingThreshold: number; standardRate: number; expressRate: number };
  notifications: { orderConfirmation: boolean; shippingUpdate: boolean };
}

interface SettingsPanelProps {
  settings: SettingsState;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  handleSaveSettings: (section: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, handleSaveSettings }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Général</h3>
            <p className="text-sm text-slate-500">Informations de base de votre boutique</p>
          </div>
          <button onClick={() => handleSaveSettings('Général')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de la boutique</label>
              <input type="text" value={settings.general.storeName} onChange={(e) => setSettings({...settings, general: {...settings.general, storeName: e.target.value}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de contact</label>
              <input type="email" value={settings.general.supportEmail} onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
              <select value={settings.general.currency} onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2">
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
          <button onClick={() => handleSaveSettings('Paiement')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.payment.stripeEnabled} onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeEnabled: e.target.checked}})} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Stripe</h4>
              <p className="text-sm text-slate-500 mb-2">Accepter les cartes bancaires via Stripe.</p>
              {settings.payment.stripeEnabled && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clé API Publique</label>
                  <input type="text" value={settings.payment.stripeKey} onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeKey: e.target.value}})} className="w-full text-sm border-gray-300 rounded-lg bg-slate-50 font-mono text-slate-600" />
                </div>
              )}
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.payment.paypalEnabled} onChange={(e) => setSettings({...settings, payment: {...settings.payment, paypalEnabled: e.target.checked}})} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
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
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
                    <span className="text-sm text-slate-700">{method.label}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-4">Portefeuilles digitaux</div>
              <div className="grid grid-cols-2 gap-3">
                {[{id:'applepay',label:'Apple Pay'},{id:'googlepay',label:'Google Pay'}].map(method => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
                    <span className="text-sm text-slate-700">{method.label}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-4">Autres moyens</div>
              <div className="grid grid-cols-2 gap-3">
                {[{id:'paypal',label:'PayPal'},{id:'klarna',label:'Klarna'}].map(method => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.payment.acceptedPaymentMethods?.includes(method.id)||false} onChange={(e) => { const methods=settings.payment.acceptedPaymentMethods||[]; setSettings({...settings,payment:{...settings.payment,acceptedPaymentMethods:e.target.checked?[...methods,method.id]:methods.filter(m=>m!==method.id)}}); }} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral" />
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
            <h3 className="font-bold text-slate-800 text-lg">Expédition</h3>
            <p className="text-sm text-slate-500">Tarifs et règles de livraison</p>
          </div>
          <button onClick={() => handleSaveSettings('Expédition')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Standard (€)</label>
              <input type="number" step="0.1" value={settings.shipping.standardRate} onChange={(e) => setSettings({...settings,shipping:{...settings.shipping,standardRate:parseFloat(e.target.value)}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Express (€)</label>
              <input type="number" step="0.1" value={settings.shipping.expressRate} onChange={(e) => setSettings({...settings,shipping:{...settings.shipping,expressRate:parseFloat(e.target.value)}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil Gratuité (€)</label>
              <input type="number" value={settings.shipping.freeShippingThreshold} onChange={(e) => setSettings({...settings,shipping:{...settings.shipping,freeShippingThreshold:parseFloat(e.target.value)}})} className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2" />
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
          <button onClick={() => handleSaveSettings('Notifications')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.notifications.orderConfirmation} onChange={(e) => setSettings({...settings,notifications:{...settings.notifications,orderConfirmation:e.target.checked}})} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Confirmation de commande</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de la commande.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input type="checkbox" checked={settings.notifications.shippingUpdate} onChange={(e) => setSettings({...settings,notifications:{...settings.notifications,shippingUpdate:e.target.checked}})} className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Mise à jour d'expédition</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de l'expédition.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-red-100 flex justify-between items-center bg-red-50/50">
          <div>
            <h3 className="font-bold text-red-800 text-lg">Zone de Danger</h3>
            <p className="text-sm text-red-500">Nettoyage de la base de données</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6">⚠️ <strong>Attention :</strong> Ces actions suppriment définitivement les données de la base de données PostgreSQL. Cette opération est <strong>irréversible</strong>.</p>
          <div className="space-y-3">
            <button onClick={async () => { if (confirm("⚠️ DANGER : Toutes les données seront supprimées définitivement (livres, commandes, clients, zones d'expédition). Voulez-vous vraiment continuer ?")) { try { const r=await fetch('/api/admin/reset/all',{method:'DELETE'}); if(r.ok){toast.success('Toutes les données ont été supprimées');window.location.reload();}else{toast.error('Erreur lors de la suppression');} } catch { toast.error('Erreur de connexion'); } } }} className="w-full bg-white border-2 border-red-500 text-red-600 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
              <Trash2 size={16} /> Supprimer TOUTES les données
            </button>
            <button onClick={async () => { if (confirm('Tous les livres seront supprimés de la base de données. Voulez-vous continuer ?')) { try { const r=await fetch('/api/admin/reset/books',{method:'DELETE'}); if(r.ok){toast.success('Tous les livres ont été supprimés');window.location.reload();}else{toast.error('Erreur lors de la suppression');} } catch { toast.error('Erreur de connexion'); } } }} className="w-full bg-white border border-orange-300 text-orange-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors">
              <Book size={16} /> Supprimer tous les livres
            </button>
            <button onClick={async () => { if (confirm('Toutes les commandes seront supprimées de la base de données. Voulez-vous continuer ?')) { try { const r=await fetch('/api/admin/reset/orders',{method:'DELETE'}); if(r.ok){toast.success('Toutes les commandes ont été supprimées');window.location.reload();}else{toast.error('Erreur lors de la suppression');} } catch { toast.error('Erreur de connexion'); } } }} className="w-full bg-white border border-blue-300 text-blue-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
              <Package size={16} /> Supprimer toutes les commandes
            </button>
            <button onClick={async () => { if (confirm('Tous les clients seront supprimés de la base de données. Voulez-vous continuer ?')) { try { const r=await fetch('/api/admin/reset/customers',{method:'DELETE'}); if(r.ok){toast.success('Tous les clients ont été supprimés');window.location.reload();}else{toast.error('Erreur lors de la suppression');} } catch { toast.error('Erreur de connexion'); } } }} className="w-full bg-white border border-purple-300 text-purple-600 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors">
              <Users size={16} /> Supprimer tous les clients
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
