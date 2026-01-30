export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  isVisible: boolean;
  bookIds: string[]; // IDs des livres dans l'ordre d'affichage
  bookBadges?: Record<string, string>; // bookId -> badge text personnalisé
}

export interface HeroConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  badgeText: string;
}

export interface HomepageConfig {
  hero: HeroConfig;
  sections: HomepageSection[];
  showHowItWorks: boolean;
  showFaq: boolean;
  showReassurance: boolean;
}
