import React from 'react';
import { BarChart3, Globe } from 'lucide-react';

const AnalyticsPanel: React.FC = () => (
  <div className="space-y-8">
    <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-3xl font-bold mb-2">Performances</h2>
        <p className="text-slate-400 max-w-xl">
          Analysez vos ventes, le comportement de vos clients et la performance de vos produits pour optimiser votre boutique.
        </p>
      </div>
      <BarChart3 className="absolute right-8 top-8 text-slate-800 opacity-20 w-64 h-64 -rotate-12" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-64 flex flex-col items-center justify-center text-center">
        <BarChart3 size={48} className="text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-800">Graphique des ventes</h3>
        <p className="text-sm text-slate-500 mt-2">Données simulées pour la démo.</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-64 flex flex-col items-center justify-center text-center">
        <Globe size={48} className="text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-800">Ventes par région</h3>
        <p className="text-sm text-slate-500 mt-2">Données simulées pour la démo.</p>
      </div>
    </div>
  </div>
);

export default AnalyticsPanel;
