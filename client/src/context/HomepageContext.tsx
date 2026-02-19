import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HomepageConfig } from '../types/homepage';
import { useBooks } from './BooksContext';
import { toast } from 'sonner';

interface HomepageContextType {
  homepageConfig: HomepageConfig | null;
  isLoading: boolean;
  updateHomepageConfig: (config: HomepageConfig) => Promise<void>;
}

const HomepageContext = createContext<HomepageContextType | undefined>(undefined);

// Fonction pour générer la config par défaut basée sur les catégories
const generateDefaultConfig = (books: any[]): HomepageConfig => {
  const visibleBooks = books.filter(b => !b.isHidden);
  
  return {
    hero: {
      title: "Des livres personnalisés pour petits et grands",
      subtitle: "Choisissez un univers, créez son avatar, et hop ! Une histoire magique s'écrit sous vos yeux.",
      buttonText: "Commencer l'aventure",
      badgeText: "La magie de la lecture"
    },
    sections: [
      {
        id: 'family',
        title: 'Notre collection pour la famille',
        subtitle: 'Des histoires pour célébrer ceux qu\'on aime',
        isVisible: true,
        bookIds: visibleBooks.filter(b => b.category === 'family').map(b => b.id),
        bookBadges: {}
      },
      {
        id: 'theme',
        title: 'Nos Univers Magiques',
        subtitle: 'Choisissez le monde préféré de votre enfant',
        isVisible: true,
        bookIds: visibleBooks.filter(b => b.category === 'theme').map(b => b.id),
        bookBadges: {}
      },
      {
        id: 'activity',
        title: 'Ou choisissez par Passion',
        subtitle: 'Une histoire qui commence avec ce qu\'ils aiment',
        isVisible: true,
        bookIds: visibleBooks.filter(b => b.category === 'activity').map(b => b.id),
        bookBadges: {}
      },
      {
        id: 'occasion',
        title: 'Pour toutes les occasions',
        subtitle: 'Le cadeau idéal pour marquer les grands moments',
        isVisible: true,
        bookIds: visibleBooks.filter(b => b.category === 'occasion').map(b => b.id),
        bookBadges: {}
      }
    ],
    showHowItWorks: true,
    showFaq: true,
    showReassurance: true
  };
};

export const HomepageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { books, isLoading: booksLoading } = useBooks();

  // Fetch homepage config
  const { data: homepageConfig = null, isLoading: configLoading } = useQuery({
    queryKey: ['homepage-config', books.length],
    queryFn: async () => {
      try {
        const response = await fetch('/api/settings/homepage');
        if (response.status === 404) {
          // Config n'existe pas, utiliser la config par défaut
          const defaultConfig = generateDefaultConfig(books);
          return defaultConfig;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch homepage config');
        }
        const data = await response.json();
        return data.value as HomepageConfig;
      } catch (error) {
        // En cas d'erreur, retourner la config par défaut
        return generateDefaultConfig(books);
      }
    },
    enabled: !booksLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update homepage config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: HomepageConfig) => {
      const response = await fetch('/api/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config }),
      });
      if (!response.ok) {
        throw new Error('Failed to update homepage config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-config'] });
      toast.success('Configuration de la page d\'accueil mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la configuration');
    },
  });

  const updateHomepageConfig = async (config: HomepageConfig) => {
    await updateConfigMutation.mutateAsync(config);
  };

  const isLoading = booksLoading || configLoading;

  return (
    <HomepageContext.Provider value={{ homepageConfig, isLoading, updateHomepageConfig }}>
      {children}
    </HomepageContext.Provider>
  );
};

export const useHomepage = () => {
  const context = useContext(HomepageContext);
  if (context === undefined) {
    throw new Error('useHomepage must be used within a HomepageProvider');
  }
  return context;
};
