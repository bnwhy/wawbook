import React from 'react';
import Navigation from '../components/Navigation';
import { Home } from 'lucide-react';
import { useLocation } from 'wouter';

const NotFound: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-brand-cream font-sans flex flex-col">
      <Navigation onStart={() => setLocation('/')} />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-20">
        <h1 className="text-9xl font-display font-black text-slate-200 mb-4">404</h1>
        <h2 className="text-3xl font-display font-black text-slate-800 mb-6">Page introuvable</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Oups ! Il semblerait que la page que vous cherchez se soit envolée vers d'autres cieux.
        </p>
        <button 
          onClick={() => setLocation('/')}
          className="px-6 py-3 bg-brand-coral text-white rounded-full font-bold hover:bg-red-500 transition-colors flex items-center gap-2 shadow-lg shadow-brand-coral/20"
        >
          <Home size={18} />
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

export default NotFound;
