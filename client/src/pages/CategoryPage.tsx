import React from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, BookOpen, Star, Heart, ShoppingBag } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBooks } from '../context/BooksContext';

interface CategoryPageProps {
  onSelectBook?: (title: string) => void;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ onSelectBook }) => {
  const [location, setLocation] = useLocation();
  const { books } = useBooks();
  const category = decodeURIComponent(location.split('/').pop() || 'Catalogue');

  // Filter books based on category if needed (simple keyword match for now)
  // In a real app, we would have categories in the data model
  const displayBooks = books.length > 0 ? books : [
    // Fallback if no books in context
    { id: '1', name: 'Le Voyage Magique', description: 'Une aventure extraordinaire...', price: 29.90, coverImage: '' },
    { id: '2', name: 'Mon Ami le Dragon', description: 'Une histoire fantastique...', price: 24.90, coverImage: '' },
    { id: '3', name: 'La Forêt Enchantée', description: 'Découverte de la nature...', price: 27.90, coverImage: '' },
  ];

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
                    <span className="font-bold text-slate-800 text-lg">{book.price} €</span>
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
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
