import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBooks } from '../context/BooksContext';
import BookCard from '../components/BookCard';

interface CategoryPageProps {
  onSelectBook?: (title: string) => void;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ onSelectBook }) => {
  const [location, setLocation] = useLocation();
  const { books } = useBooks();
  const category = decodeURIComponent(location.split('/').pop() || 'Catalogue');

  // Filter books based on current path (menu association)
  const displayBooks = React.useMemo(() => {
    const visibleBooks = books.filter(b => !b.isHidden);

    // 1. Try to find books explicitly linked to this menu path
    const linkedBooks = visibleBooks.filter(b => b.associatedPaths?.includes(location));
    
    if (linkedBooks.length > 0) return linkedBooks;

    // 2. Fallback: Filter by category tag (legacy behavior)
    // Map URL category to internal category types
    const categoryMap: Record<string, string> = {
      'products': 'theme',
      'occasion': 'occasion',
      'family': 'family',
      'activity': 'activity'
    };
    
    const urlSection = location.split('/')[1]; // e.g. "products"
    const targetType = categoryMap[urlSection];

    if (targetType) {
       return visibleBooks.filter(b => b.category === targetType);
    }

    return visibleBooks;
  }, [books, location]);

  const handleBookClick = (title: string) => {
    if (onSelectBook) {
      onSelectBook(title);
    } else {
      setLocation('/'); 
    }
  };

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
          <div className="text-slate-300 text-sm">/</div>
          <span className="text-slate-400 text-sm font-medium">{category}</span>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider mb-4">
            Collection
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-black text-slate-800 mb-4 capitalize">
            {category}
          </h1>
          <p className="text-xl text-slate-500">
            Découvrez nos livres personnalisés pour "{category}". <br/>
            Des histoires uniques pour des moments inoubliables.
          </p>
        </div>

        {displayBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Aucun livre trouvé</h3>
            <p className="text-slate-500">Cette catégorie est vide pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => handleBookClick(book.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
