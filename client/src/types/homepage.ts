export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  isVisible: boolean;
  bookIds: string[];
  bookBadges?: Record<string, string>;
  badgeType?: string;
}

export interface HeroConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  badgeText: string;
}

export interface BannerConfig {
  text: string;
  backgroundColor: string;
  textColor: string;
  isVisible: boolean;
}

export interface HomepageConfig {
  hero: HeroConfig;
  sections: HomepageSection[];
  banner: BannerConfig;
  showHowItWorks: boolean;
  showFaq: boolean;
  showReassurance: boolean;
}
