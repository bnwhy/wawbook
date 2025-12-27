import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('admin_settings');
        return saved ? JSON.parse(saved) : {
            general: {
                storeName: 'NuageBook',
                supportEmail: 'contact@nuagebook.com',
                currency: 'EUR',
                language: 'fr'
            },
            payment: {
                stripeEnabled: true,
                stripeKey: 'pk_test_sample_key_12345',
                paypalEnabled: false
            },
            shipping: {
                freeShippingThreshold: 50,
                standardRate: 4.90,
                expressRate: 9.90
            },
            notifications: {
                orderConfirmation: true,
                shippingUpdate: true
            }
        };
    } catch (e) {
        return {
            general: {
                storeName: 'NuageBook',
                supportEmail: 'contact@nuagebook.com',
                currency: 'EUR',
                language: 'fr'
            },
            payment: {
                stripeEnabled: true,
                stripeKey: 'pk_test_sample_key_12345',
                paypalEnabled: false
            },
            shipping: {
                freeShippingThreshold: 50,
                standardRate: 4.90,
                expressRate: 9.90
            },
            notifications: {
                orderConfirmation: true,
                shippingUpdate: true
            }
        };
    }
  });

  const handleSaveSettings = (section: string) => {
      localStorage.setItem('admin_settings', JSON.stringify(settings));
      toast.success(`Réglages "${section}" sauvegardés avec succès`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Général</h3>
            <p className="text-sm text-slate-500">Informations de base de votre boutique</p>
          </div>
          <button 
            onClick={() => handleSaveSettings('Général')}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom de la boutique</label>
              <input 
                type="text" 
                value={settings.general.storeName}
                onChange={(e) => setSettings({...settings, general: {...settings.general, storeName: e.target.value}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de contact</label>
              <input 
                type="email" 
                value={settings.general.supportEmail}
                onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
              <select 
                value={settings.general.currency}
                onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              >
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
          <button 
            onClick={() => handleSaveSettings('Paiement')}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input 
                type="checkbox" 
                checked={settings.payment.stripeEnabled}
                onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeEnabled: e.target.checked}})}
                className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Stripe</h4>
              <p className="text-sm text-slate-500 mb-2">Accepter les cartes bancaires via Stripe.</p>
              {settings.payment.stripeEnabled && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clé API Publique</label>
                  <input 
                    type="text" 
                    value={settings.payment.stripeKey}
                    onChange={(e) => setSettings({...settings, payment: {...settings.payment, stripeKey: e.target.value}})}
                    className="w-full text-sm border-gray-300 rounded-lg bg-slate-50 font-mono text-slate-600"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full h-px bg-gray-100"></div>

          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input 
                type="checkbox" 
                checked={settings.payment.paypalEnabled}
                onChange={(e) => setSettings({...settings, payment: {...settings.payment, paypalEnabled: e.target.checked}})}
                className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">PayPal</h4>
              <p className="text-sm text-slate-500">Accepter les paiements via PayPal.</p>
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
          <button 
            onClick={() => handleSaveSettings('Expédition')}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Standard (€)</label>
              <input 
                type="number" 
                step="0.1"
                value={settings.shipping.standardRate}
                onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, standardRate: parseFloat(e.target.value)}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Livraison Express (€)</label>
              <input 
                type="number" 
                step="0.1"
                value={settings.shipping.expressRate}
                onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, expressRate: parseFloat(e.target.value)}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seuil Gratuité (€)</label>
              <input 
                type="number" 
                value={settings.shipping.freeShippingThreshold}
                onChange={(e) => setSettings({...settings, shipping: {...settings.shipping, freeShippingThreshold: parseFloat(e.target.value)}})}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-brand-coral focus:border-brand-coral px-3 py-2"
              />
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
          <button 
            onClick={() => handleSaveSettings('Notifications')}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Save size={16} /> Sauvegarder
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input 
                type="checkbox" 
                checked={settings.notifications.orderConfirmation}
                onChange={(e) => setSettings({...settings, notifications: {...settings.notifications, orderConfirmation: e.target.checked}})}
                className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Confirmation de commande</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de la commande.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input 
                type="checkbox" 
                checked={settings.notifications.shippingUpdate}
                onChange={(e) => setSettings({...settings, notifications: {...settings.notifications, shippingUpdate: e.target.checked}})}
                className="rounded border-gray-300 text-brand-coral focus:ring-brand-coral w-4 h-4"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-700">Mise à jour d'expédition</h4>
              <p className="text-sm text-slate-500">Envoyer un email au client lors de l'expédition.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
