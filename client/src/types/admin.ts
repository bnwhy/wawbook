import { Theme } from '../types';

export interface BookProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  promoCode?: string;
  coverImage: string;
  theme: Theme;
  category: 'family' | 'theme' | 'activity' | 'occasion';
  badgeText?: string;
  associatedPaths?: string[]; // List of paths where this book should appear
  oldPrice?: number;
  isHidden?: boolean;
  features?: {
    languages?: string[];
    customization?: string[];
    pages?: number;
    formats?: string[];
  };
  wizardConfig: WizardConfiguration;
  contentConfig: ContentConfiguration;
}

export interface WizardConfiguration {
  avatarStyle: 'watercolor' | 'cartoon' | 'realistic';
  tabs: WizardTab[];
  avatarMappings?: Record<string, string>; // key: "optId1_optId2" (sorted), value: "url"
}

export interface WizardOption {
  id: string;
  label: string;
  thumbnail?: string;
  resource?: string;
}

export interface WizardVariant {
  id: string;
  label: string; // Internal name
  title?: string; // Public display title
  type: 'options' | 'text';
  minLength?: number;
  maxLength?: number;
  thumbnail?: string;
  resource?: string;
  options: WizardOption[];
}

export interface WizardTab {
  id: string;
  label: string; // e.g., "Héros", "Compagnon"
  type: 'character' | 'element';
  options: string[]; // Legacy/Metadata options
  variants: WizardVariant[]; // e.g., [{id: 'v1', label: 'Garçon', options: [...]}, {id: 'v2', label: 'Fille', options: [...]}]
}

export interface ContentConfiguration {
  pages: PageDefinition[];
  texts: TextElement[];
  images: ImageVariant[];
  imageElements?: ImageElement[];
}

export interface PageDefinition {
  id: string;
  pageNumber: number;
  label: string; // e.g. "Page 1", "Cover"
  description?: string; // e.g. "Introduction in the bedroom"
}

export interface TextElement {
  id: string;
  label: string; // Internal label
  type: 'fixed' | 'variable';
  content: string; // Default content or variable key
  style?: React.CSSProperties;
  position: {
    pageIndex: number;
    zoneId: string; // e.g., "header", "body", "footer"
    layer?: number;
    x?: number; // Percentage 0-100
    y?: number; // Percentage 0-100
    width?: number; // Percentage
    rotation?: number;
  };
}

export interface ImageElement {
  id: string;
  label: string;
  type: 'static' | 'variable';
  url?: string;
  variableKey?: string;
  position: {
    pageIndex: number;
    layer?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
}

export interface ImageVariant {
  id: string;
  pageIndex: number;
  combinationKey: string; // e.g., "gender:boy|style:A"
  imageUrl: string;
}
