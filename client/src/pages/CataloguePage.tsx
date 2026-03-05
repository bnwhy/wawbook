import React, { useState, useMemo } from 'react';
import Navigation from '../components/Navigation';
import { ArrowLeft, BookOpen, Filter, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBooks } from '../context/BooksContext';
import { useMenus } from '../context/MenuContext';
import { Theme } from '../types';
import BookFilters from '../components/BookFilters';
import BookCard from '../components/BookCard';


export interface CatalogueFilters {
  search: string;
  categories: string[];
  themes: Theme[];
  priceRange: { min: number; max: number };
  audiences: string[];
  occasions: string[];
  sortBy: 'price_asc' | 'price_desc' | 'name' | 'popular';
}

const CataloguePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { books } = useBooks();
  const { mainMenu } = useMenus();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calculate price range from all books
  const priceRange = useMemo(() => {
    const prices = books.filter(b => !b.isHidden).map(b => b.price);
    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 100
    };
  }, [books]);

  const [filters, setFilters] = useState<CatalogueFilters>({
    search: '',
    categories: [],
    themes: [],
    priceRange: priceRange,
    audiences: [],
    occasions: [],
    sortBy: 'popular'
  });

  // Update price range when books change
  React.useEffect(() => {
    setFilters(prev => ({
      ...prev,
      priceRange: priceRange
    }));
  }, [priceRange]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    let result = books.filter(b => !b.isHidden);

    // Recherche textuelle
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(term) || 
        b.description.toLowerCase().includes(term)
      );
    }

    // Catégories
    if (filters.categories.length > 0) {
      result = result.filter(b => filters.categories.includes(b.category));
    }

    // Thèmes
    if (filters.themes.length > 0) {
      result = result.filter(b => filters.themes.includes(b.theme));
    }

    // Audiences et occasions (via associatedPaths)
    if (filters.audiences.length > 0 || filters.occasions.length > 0) {
      const selectedPaths = [...filters.audiences, ...filters.occasions];
      result = result.filter(b => {
        if (!b.associatedPaths || b.associatedPaths.length === 0) return false;
        return selectedPaths.some(path => b.associatedPaths?.includes(path));
      });
    }

    return result;
  }, [books, filters]);

  const handleBookClick = (title: string) => {
    setLocation(`/create?bookTitle=${encodeURIComponent(title)}`);
  };

  const activeFiltersCount = 
    (filters.search ? 1 : 0) +
    filters.categories.length +
    filters.themes.length +
    filters.audiences.length +
    filters.occasions.length;

  return (
    <div className="min-h-screen font-sans">
      <Navigation onStart={() => setLocation('/')} />
      
      <div className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 text-cloud-dark/60 hover:text-cloud-blue transition-colors font-bold text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-cloud border border-cloud-light p-6 md:p-8">
          {/* Title */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-3xl md:text-4xl font-display font-black text-cloud-dark mb-2">
              Tous nos livres
            </h1>
            <p className="text-base text-cloud-dark/60">
              Découvrez notre collection complète de livres personnalisés. Des histoires uniques pour chaque enfant.
            </p>
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-cloud-lightest px-6 py-3 rounded-xl font-bold text-cloud-dark border border-cloud-light hover:border-cloud-blue transition-colors"
            >
              <Filter size={20} />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-cloud-blue text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex gap-8">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block w-[280px] flex-shrink-0">
              <div className="sticky top-24">
                <BookFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  priceRange={priceRange}
                  mainMenu={mainMenu}
                />
              </div>
            </div>

            {/* Books Grid */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="mb-6 px-2 py-2 border-b border-gray-200">
                <div className="text-cloud-dark/70">
                  <span className="font-bold text-cloud-dark">{filteredBooks.length}</span> livre{filteredBooks.length !== 1 ? 's' : ''} trouvé{filteredBooks.length !== 1 ? 's' : ''}
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-cloud-light rounded-2xl">
                  <BookOpen size={48} className="mx-auto text-cloud-light mb-4" />
                  <h3 className="text-xl font-display font-black text-cloud-dark mb-2">Aucun livre trouvé</h3>
                  <p className="text-cloud-dark/60 mb-4">Essayez de modifier vos critères de recherche.</p>
                  <button
                    onClick={() => setFilters({
                      search: '',
                      categories: [],
                      themes: [],
                      priceRange: priceRange,
                      audiences: [],
                      occasions: [],
                      sortBy: 'popular'
                    })}
                    className="text-cloud-blue font-bold hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBooks.map((book) => (
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
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[320px] bg-white z-50 overflow-y-auto lg:hidden shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display font-black text-xl text-cloud-dark">Filtres</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-cloud-lightest rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <BookFilters
                filters={filters}
                onFiltersChange={setFilters}
                priceRange={priceRange}
                mainMenu={mainMenu}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CataloguePage;
