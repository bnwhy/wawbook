import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, HelpCircle, Info, Mail, FileText } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBooks } from '../context/BooksContext';
import BookCard from '../components/BookCard';

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
    setLocation(`/create?bookTitle=${encodeURIComponent(title)}`);
  };

  const getCategoryIcon = () => {
    switch(displayCategory.toLowerCase()) {
      case 'aide': return <HelpCircle size={48} className="text-cloud-blue" />;
      case 'à propos': return <Info size={48} className="text-cloud-blue" />;
      default: return <FileText size={48} className="text-cloud-sky" />;
    }
  };

  const getContent = () => {
    const t = displayTitle.toLowerCase();
    
    if (t.includes('faq')) return (
      <div className="space-y-6">
        <div className="bg-cloud-lightest rounded-xl p-6 border border-cloud-light">
          <h3 className="font-display font-black text-lg text-cloud-dark mb-2">Combien de temps prend la livraison ?</h3>
          <p className="text-cloud-dark/70">Nos livres sont imprimés à la demande. Comptez 3 à 5 jours ouvrés pour la production, puis 48h pour la livraison standard.</p>
        </div>
        <div className="bg-cloud-lightest rounded-xl p-6 border border-cloud-light">
          <h3 className="font-display font-black text-lg text-cloud-dark mb-2">Puis-je modifier ma commande ?</h3>
          <p className="text-cloud-dark/70">Vous disposez de 2 heures après la validation pour nous contacter en cas d'erreur. Passé ce délai, le livre part en impression.</p>
        </div>
        <div className="bg-cloud-lightest rounded-xl p-6 border border-cloud-light">
          <h3 className="font-display font-black text-lg text-cloud-dark mb-2">Quelle est la qualité du papier ?</h3>
          <p className="text-cloud-dark/70">Nous utilisons du papier premium 170g/m² certifié FSC (forêts gérées durablement) pour un rendu des couleurs éclatant et une grande durabilité.</p>
        </div>
      </div>
    );

    if (t.includes('contact')) return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-cloud-lightest p-6 rounded-xl border border-cloud-light">
          <Mail className="text-cloud-blue mb-4" size={32} />
          <h3 className="font-display font-black text-lg text-cloud-dark mb-1">Email</h3>
          <p className="text-cloud-dark/70 mb-4">Réponse sous 24h ouvrées</p>
          <a href="mailto:hello@nuagebook.com" className="text-cloud-blue font-bold hover:underline">hello@nuagebook.com</a>
        </div>
      </div>
    );

    return (
      <div className="prose prose-lg max-w-none">
        <p className="lead text-xl text-cloud-dark/60 font-medium mb-8">
          Contenu pour "{displayTitle}" en cours de rédaction.
        </p>
        <p className="text-cloud-dark/70">
          Chez nuagebook, nous nous efforçons de créer les meilleures histoires pour vos enfants. 
          Cette page détaillera bientôt tout ce que vous devez savoir sur <strong>{displayTitle}</strong>.
        </p>
        <div className="p-6 bg-cloud-lightest rounded-xl border border-cloud-light my-8">
            <h3 className="font-display font-black text-cloud-dark mb-2">Notre engagement</h3>
            <p className="text-sm text-cloud-dark/70">
            Chaque livre est unique, imprimé avec amour et envoyé avec soin. Nous mettons un point d'honneur à satisfaire petits et grands lecteurs.
            </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans">
      <Navigation onStart={() => setLocation('/')} />
      
      <div className="pt-32 pb-16 px-6 max-w-4xl mx-auto">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-cloud-dark/60 hover:text-cloud-blue mb-8 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-cloud border border-cloud-light">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 pb-8 border-b border-cloud-light/50">
            <div className="w-20 h-20 bg-cloud-lightest rounded-2xl flex items-center justify-center flex-shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-cloud-lighter text-cloud-deep font-bold text-xs uppercase tracking-wider mb-2">
                {displayCategory}
              </span>
              <h1 className="text-3xl md:text-4xl font-display font-black text-cloud-dark">
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
              <div className="h-px bg-cloud-light flex-1"></div>
              <h2 className="text-2xl font-display font-black text-cloud-dark">Nos livres pour {displayTitle}</h2>
              <div className="h-px bg-cloud-light flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {associatedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => handleBookClick(book.name)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticPage;
