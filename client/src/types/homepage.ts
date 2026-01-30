export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  isVisible: boolean;
  bookIds: string[]; // IDs des livres dans l'ordre d'affichage
  badgeType?: 'star' | 'heart' | 'gift' | 'new'; // Badge affiché sur les cartes
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
