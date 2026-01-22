import React, { useState } from 'react';
import { Search, ChevronDown, RotateCcw } from 'lucide-react';
import { Theme } from '../types';
import { CatalogueFilters } from '../pages/CataloguePage';
import { MenuItem } from '../types/menu';

interface BookFiltersProps {
  filters: CatalogueFilters;
  onFiltersChange: (filters: CatalogueFilters) => void;
  priceRange: { min: number; max: number };
  mainMenu: MenuItem[];
}

const BookFilters: React.FC<BookFiltersProps> = ({
  filters,
  onFiltersChange,
  priceRange,
  mainMenu
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'categories',
    'themes'
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const categoryOptions = [
    { id: 'family', label: 'Famille' },
    { id: 'theme', label: 'Thèmes' },
    { id: 'activity', label: 'Activités' },
    { id: 'occasion', label: 'Occasions' }
  ];

  const themeOptions = Object.entries(Theme).map(([key, value]) => ({
    id: value,
    label: value
  }));

  // Extract audiences from "Pour qui ?" menu
  const audiencesMenu = mainMenu.find(m => m.id === 'for');
  const audiences = audiencesMenu?.columns
    ?.flatMap(col => col.items.map(item => ({
      label: item,
      path: `${audiencesMenu.basePath}/${encodeURIComponent(item)}`
    }))) || [];

  // Extract occasions from "Occasions" menu
  const occasionsMenu = mainMenu.find(m => m.id === 'occasions');
  const occasions = (occasionsMenu?.items || []).map(item => ({
    label: item as string,
    path: `${occasionsMenu.basePath}/${encodeURIComponent(item as string)}`
  }));

  const handleReset = () => {
    onFiltersChange({
      search: '',
      categories: [],
      themes: [],
      priceRange: priceRange,
      audiences: [],
      occasions: [],
      sortBy: 'popular'
    });
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(c => c !== categoryId)
      : [...filters.categories, categoryId];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleTheme = (theme: Theme) => {
    const newThemes = filters.themes.includes(theme)
      ? filters.themes.filter(t => t !== theme)
      : [...filters.themes, theme];
    onFiltersChange({ ...filters, themes: newThemes });
  };

  const toggleAudience = (audiencePath: string) => {
    const newAudiences = filters.audiences.includes(audiencePath)
      ? filters.audiences.filter(a => a !== audiencePath)
      : [...filters.audiences, audiencePath];
    onFiltersChange({ ...filters, audiences: newAudiences });
  };

  const toggleOccasion = (occasionPath: string) => {
    const newOccasions = filters.occasions.includes(occasionPath)
      ? filters.occasions.filter(o => o !== occasionPath)
      : [...filters.occasions, occasionPath];
    onFiltersChange({ ...filters, occasions: newOccasions });
  };

  const FilterSection: React.FC<{
    id: string;
    title: string;
    children: React.ReactNode;
  }> = ({ id, title, children }) => {
    const isExpanded = expandedSections.includes(id);
    
    return (
      <div className="border-b border-slate-200 pb-4 mb-4 last:border-b-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between py-2 text-left"
        >
          <h3 className="font-bold text-slate-800">{title}</h3>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isExpanded && <div className="mt-3">{children}</div>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-black text-lg text-slate-800">Filtres</h2>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-sm text-brand-coral hover:text-red-600 font-bold transition-colors"
        >
          <RotateCcw size={14} />
          Réinitialiser
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Rechercher un livre..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-coral text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <FilterSection id="categories" title="Catégories">
        <div className="space-y-2">
          {categoryOptions.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
                className="w-4 h-4 text-brand-coral border-slate-300 rounded focus:ring-brand-coral"
              />
              <span className="text-sm text-slate-700 group-hover:text-brand-coral transition-colors">
                {category.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Themes */}
      <FilterSection id="themes" title="Thèmes">
        <div className="space-y-2">
          {themeOptions.map((theme) => (
            <label
              key={theme.id}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.themes.includes(theme.id as Theme)}
                onChange={() => toggleTheme(theme.id as Theme)}
                className="w-4 h-4 text-brand-coral border-slate-300 rounded focus:ring-brand-coral"
              />
              <span className="text-sm text-slate-700 group-hover:text-brand-coral transition-colors">
                {theme.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Audiences */}
      {audiences.length > 0 && (
        <FilterSection id="audiences" title="Pour qui ?">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {audiences.map((audience) => (
              <label
                key={audience.path}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.audiences.includes(audience.path)}
                  onChange={() => toggleAudience(audience.path)}
                  className="w-4 h-4 text-brand-coral border-slate-300 rounded focus:ring-brand-coral"
                />
                <span className="text-sm text-slate-700 group-hover:text-brand-coral transition-colors">
                  {audience.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Occasions */}
      {occasions.length > 0 && (
        <FilterSection id="occasions" title="Occasions">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {occasions.map((occasion) => (
              <label
                key={occasion.path}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.occasions.includes(occasion.path)}
                  onChange={() => toggleOccasion(occasion.path)}
                  className="w-4 h-4 text-brand-coral border-slate-300 rounded focus:ring-brand-coral"
                />
                <span className="text-sm text-slate-700 group-hover:text-brand-coral transition-colors">
                  {occasion.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
};

export default BookFilters;
