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
    languages?: { code: string; label: string; }[];
    customization?: string[];
    pages?: number;
    formats?: string[];
    dimensions?: { width: number; height: number }; // Dimensions in mm (width x height)
    printConfig?: {
        bindingType: 'hardcover' | 'softcover' | 'saddle_stitch' | 'coil';
        cover: {
            widthMm?: number; // Spread width (flat)
            heightMm?: number; // Height
            bleedMm: number;
            safeMarginMm: number;
            paperType?: 'coated_standard' | 'coated_premium';
            spineWidthMm?: number;
        };
        interior: {
            bleedMm: number;
            safeMarginMm: number;
            paperType: '80g_white' | '80g_cream' | '100g_white' | 'coated_standard' | 'coated_premium';
        };
    };
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
  type: 'options' | 'text' | 'checkbox';
  minLength?: number;
  maxLength?: number;
  unit?: string;
  thumbnail?: string;
  resource?: string;
  options?: WizardOption[];
}

export interface WizardTab {
  id: string;
  label: string; // e.g., "Héros", "Compagnon"
  type: 'character' | 'element';
  options: string[]; // Legacy/Metadata options
  variants: WizardVariant[]; // e.g., [{id: 'v1', label: 'Garçon', options: [...]}, {id: 'v2', label: 'Fille', options: [...]}]
}

export interface PageImage {
  pageIndex: number;
  imageUrl: string;
}

export interface PageDimension {
  pageIndex: number;
  width: number;
  height: number;
}

export interface ContentConfiguration {
  pages: PageDimension[];
  texts: TextElement[];
  images: ImageVariant[];
  imageElements?: ImageElement[];
  cssContent?: string;
  pageImages?: PageImage[];
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
  combinationKey?: string; // Optional: restrict to specific variant
  style?: React.CSSProperties;
  position: {
    pageIndex: number;
    zoneId: string; // e.g., "header", "body", "footer"
    layer?: number;
    x?: number; // Percentage 0-100
    y?: number; // Percentage 0-100
    width?: number; // Percentage
    height?: number; // Percentage
    rotation?: number;
  };
}

export interface ImageCondition {
  variantId: string;  // ID of the variant (e.g., "hair_color", "has_cape")
  optionId: string;   // ID of the option (e.g., "blonde", "true" for checkbox)
}

export interface ImageElement {
  id: string;
  label: string;
  type: 'static' | 'variable';
  url?: string;
  variableKey?: string;
  variantImages?: Record<string, string>; // Maps option ID to image URL
  conditions?: ImageCondition[]; // List of conditions that must all match for this image to show
  combinationKey?: string; // Optional: restrict to specific variant
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

export interface Printer {
  id: string;
  name: string;
  contactEmail?: string;
  countryCodes: string[]; // List of ISO country codes handled by this printer (e.g., ['FR', 'BE'])
  productionDelayDays?: number;
}
