import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft } from 'lucide-react';
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

        <div className="bg-white rounded-2xl p-12 shadow-card border-2 border-slate-100">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-yellow/20 text-yellow-800 font-bold text-xs uppercase tracking-wider mb-4">
            {displayCategory}
          </span>
          
          <h1 className="text-4xl md:text-5xl font-display font-black text-slate-800 mb-8">
            {displayTitle}
          </h1>
          
          <div className="prose prose-lg text-slate-600 max-w-none">
            <p className="lead text-xl text-slate-500 font-medium mb-8">
              Cette page est en cours de construction. Le contenu pour "{displayTitle}" sera bientôt disponible.
            </p>
            
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 my-8">
              <h3 className="font-bold text-slate-800 mb-2">À propos de cette section</h3>
              <p className="text-sm">
                Vous naviguez actuellement dans la section <strong>{displayCategory}</strong> du site WawBook. 
                Nos équipes éditoriales travaillent activement à la rédaction de ce contenu.
              </p>
            </div>
            
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticPage;
