import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, HelpCircle, Info, Mail, Phone, FileText } from 'lucide-react';
import { useLocation } from 'wouter';

interface StaticPageProps {
  title?: string;
  category?: string;
}

const StaticPage: React.FC<StaticPageProps> = ({ title, category }) => {
  const [location, setLocation] = useLocation();
  
  // Extract title from URL if not provided
  const displayTitle = title || decodeURIComponent(location.split('/').pop() || 'Page');
  const displayCategory = category || location.split('/')[1];

  const getCategoryIcon = () => {
    switch(displayCategory.toLowerCase()) {
      case 'aide': return <HelpCircle size={48} className="text-brand-coral" />;
      case 'à propos': return <Info size={48} className="text-blue-500" />;
      default: return <FileText size={48} className="text-slate-400" />;
    }
  };

  const getContent = () => {
    const t = displayTitle.toLowerCase();
    
    if (t.includes('faq')) return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg mb-2">Combien de temps prend la livraison ?</h3>
          <p className="text-slate-600">Nos livres sont imprimés à la demande. Comptez 3 à 5 jours ouvrés pour la production, puis 48h pour la livraison standard.</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg mb-2">Puis-je modifier ma commande ?</h3>
          <p className="text-slate-600">Vous disposez de 2 heures après la validation pour nous contacter en cas d'erreur. Passé ce délai, le livre part en impression.</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg mb-2">Quelle est la qualité du papier ?</h3>
          <p className="text-slate-600">Nous utilisons du papier premium 170g/m² certifié FSC (forêts gérées durablement) pour un rendu des couleurs éclatant et une grande durabilité.</p>
        </div>
      </div>
    );

    if (t.includes('contact')) return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <Mail className="text-blue-500 mb-4" size={32} />
          <h3 className="font-bold text-lg mb-1">Email</h3>
          <p className="text-slate-600 mb-4">Réponse sous 24h ouvrées</p>
          <a href="mailto:hello@wawbook.com" className="text-blue-600 font-bold hover:underline">hello@wawbook.com</a>
        </div>
        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
          <Phone className="text-green-500 mb-4" size={32} />
          <h3 className="font-bold text-lg mb-1">Téléphone</h3>
          <p className="text-slate-600 mb-4">Du Lundi au Vendredi, 9h-18h</p>
          <a href="tel:+33100000000" className="text-green-600 font-bold hover:underline">01 00 00 00 00</a>
        </div>
      </div>
    );

    return (
      <div className="prose prose-lg text-slate-600 max-w-none">
        <p className="lead text-xl text-slate-500 font-medium mb-8">
          Contenu pour "{displayTitle}" en cours de rédaction.
        </p>
        <p>
          Chez WawBook, nous nous efforçons de créer les meilleures histoires pour vos enfants. 
          Cette page détaillera bientôt tout ce que vous devez savoir sur <strong>{displayTitle}</strong>.
        </p>
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 my-8">
            <h3 className="font-bold text-slate-800 mb-2">Notre engagement</h3>
            <p className="text-sm">
            Chaque livre est unique, imprimé avec amour et envoyé avec soin. Nous mettons un point d'honneur à satisfaire petits et grands lecteurs.
            </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      <Navigation onStart={() => setLocation('/')} />
      
      <div className="pt-32 pb-16 px-6 max-w-4xl mx-auto">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-brand-coral mb-8 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-card border-2 border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 pb-8 border-b border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-brand-yellow/20 text-yellow-800 font-bold text-xs uppercase tracking-wider mb-2">
                {displayCategory}
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-black text-slate-800">
                {displayTitle}
              </h1>
            </div>
          </div>
          
          {getContent()}
          
        </div>
      </div>
    </div>
  );
};

export default StaticPage;
