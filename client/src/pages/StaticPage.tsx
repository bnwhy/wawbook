import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, HelpCircle, Info, Mail, Phone, FileText, BookOpen, Star, ShoppingBag } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBooks } from '../context/BooksContext';

interface StaticPageProps {
  title?: string;
  category?: string;
}

const StaticPage: React.FC<StaticPageProps> = ({ title, category }) => {
  const [location, setLocation] = useLocation();
  const { books } = useBooks();
  
  // Extract title from URL if not provided
  const displayTitle = title || decodeURIComponent(location.split('/').pop() || 'Page');
  const displayCategory = category || location.split('/')[1];

  // Find associated books
  const associatedBooks = React.useMemo(() => {
    return books.filter(b => !b.isHidden && b.associatedPaths?.includes(location));
  }, [books, location]);

  const handleBookClick = (title: string) => {
    setLocation('/');
    // In a real app we might pass the title via URL param or context to pre-select it
    // For now, redirecting to home is consistent with CategoryPage behavior in this mockup
    // (Actual selection logic is in App.tsx via onSelectBook prop for CategoryPage, 
    // but StaticPage doesn't have it yet. We'll just go home.)
    // A better way would be to check if we can trigger the startCreation flow.
    // But for this mockup, let's just go home.
    setTimeout(() => {
        // Find the "startCreation" equivalent or just let the user click on home
        // Since we don't have access to startCreation here easily without prop drilling
        // We will just redirect.
    }, 100);
  };

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
          <a href="mailto:hello@nuagebook.com" className="text-blue-600 font-bold hover:underline">hello@nuagebook.com</a>
        </div>
      </div>
    );

    return (
      <div className="prose prose-lg text-slate-600 max-w-none">
        <p className="lead text-xl text-slate-500 font-medium mb-8">
          Contenu pour "{displayTitle}" en cours de rédaction.
        </p>
        <p>
          Chez NuageBook, nous nous efforçons de créer les meilleures histoires pour vos enfants. 
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

        {/* Associated Books Section */}
        {associatedBooks.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px bg-slate-200 flex-1"></div>
              <h2 className="text-2xl font-display font-black text-slate-800">Nos livres pour {displayTitle}</h2>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {associatedBooks.map((book) => (
                <div 
                  key={book.id} 
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
                  onClick={() => handleBookClick(book.name)}
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {(book as any).coverImage ? (
                      <img src={(book as any).coverImage} alt={book.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                          <BookOpen size={48} className="opacity-50" />
                        </div>
                      </>
                    )}
                    
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-brand-coral shadow-sm flex items-center gap-1">
                      <Star size={10} fill="currentColor" />
                      Populaire
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display font-black text-xl text-slate-800 mb-2 group-hover:text-brand-coral transition-colors">
                      {book.name}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">
                      {book.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <span className="font-bold text-slate-800 text-lg">{Number(book.price).toFixed(2)} €</span>
                      <button 
                        className="bg-brand-coral text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500 transition-colors flex items-center gap-2 shadow-sm shadow-brand-coral/20"
                      >
                        <ShoppingBag size={14} />
                        Personnaliser
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticPage;
