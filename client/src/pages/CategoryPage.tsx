import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, BookOpen, Star, Heart } from 'lucide-react';
import { useLocation } from 'wouter';

const CategoryPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const category = decodeURIComponent(location.split('/').pop() || 'Catalogue');

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      <Navigation onStart={() => setLocation('/')} />
      
      <div className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 text-slate-500 hover:text-brand-coral transition-colors font-bold text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider mb-4">
            Collection
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-black text-slate-800 mb-4">
            {category}
          </h1>
          <p className="text-xl text-slate-500">
            Découvrez nos livres personnalisés spécialement conçus pour cette occasion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1">
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                  <BookOpen size={48} className="opacity-50" />
                </div>
                <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-xs font-bold text-brand-coral shadow-sm flex items-center gap-1">
                  <Star size={10} fill="currentColor" />
                  Bestseller
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display font-black text-xl text-slate-800 mb-2 group-hover:text-brand-coral transition-colors">
                  Le Voyage Magique #{item}
                </h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                  Une aventure extraordinaire où votre enfant devient le héros de sa propre histoire.
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="font-bold text-slate-800">29,90 €</span>
                  <button className="text-brand-coral font-bold text-sm hover:underline">
                    Personnaliser &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
