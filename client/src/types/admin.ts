import { Theme } from '../types';

export interface FeatureSection {
  title: string;
  text: string;
  imageUrl: string;
  reverse: boolean;
}

export interface ReviewItem {
  name: string;
  comment: string;
  rating: number; // 1–5
}

export interface FaqItem {
  sectionTitle?: string; // vide ou absent = pas de titre affiché
  question: string;
  answer: string;
  order: number;
}

export interface ProductPageConfig {
  featureSections?: FeatureSection[];
  reviews?: ReviewItem[];
  faqItems?: FaqItem[];
}

export interface GalleryImage {
  url: string;
  use3DEffect: boolean;
}

export interface BookProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  promoCode?: string;
  coverImage: string; // Deprecated - utiliser galleryImages[0]
  galleryImages?: GalleryImage[]; // Toutes les images avec option effet 3D
  theme: Theme;
  category: 'family' | 'theme' | 'activity' | 'occasion';
  badgeText?: string;
  associatedPaths?: string[]; // List of paths where this book should appear
  oldPrice?: number;
  isHidden?: boolean;
  thumbnailBackground?: string; // Fond pastel pour la miniature (ex: linear-gradient(...))
  features?: {
    languages?: { code: string; label: string; }[];
    customization?: string[];
    pages?: number;
    coverTypes?: { label: string; price: number }[];
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
  productPage?: ProductPageConfig;
}

export interface WizardConfiguration {
  avatarStyle: 'watercolor' | 'cartoon' | 'realistic';
  tabs: WizardTab[];
  avatarMappings?: Record<string, string>;
  previewFields?: { id: string; label: string; enabled: boolean; textElementId?: string }[];
}

export interface WizardOption {
  id: string;
  label: string;
  thumbnail?: string;
  resource?: string;
}

export interface WizardVariant {
  id: string;
  label: string;
  title?: string;
  type: 'options' | 'text' | 'checkbox' | 'color';
  showLabel?: boolean;
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

export interface ConditionalSegment {
  text: string;
  condition?: string;
  parsedCondition?: { character: string; variant: string; option: string };
  variables?: string[];
  appliedCharacterStyle?: string;
}

export interface TextElement {
  id: string;
  label: string;
  type: 'fixed' | 'variable';
  content: string;
  combinationKey?: string;
  style?: React.CSSProperties;
  conditionalSegments?: ConditionalSegment[];
  availableConditions?: string[];
  position: {
    pageIndex: number;
    zoneId: string;
    layer?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
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

export interface RawHtmlPage {
  pageIndex: number;
  html: string;
  width: number;
  height: number;
}

export interface FeatureSection {
  title: string;
  text: string;
  imageUrl: string;
  reverse: boolean;
}

export interface ReviewItem {
  name: string;
  comment: string;
  rating: number; // 1–5
}

export interface FaqItem {
  sectionTitle?: string; // vide ou absent = pas de titre affiché
  question: string;
  answer: string;
  order: number;
}

export interface FeaturedReview {
  author: string;
  text: string;
}

export interface ProductPageConfig {
  featureSections?: FeatureSection[];
  reviews?: ReviewItem[];
  faqItems?: FaqItem[];
  faqTitle?: string;
  featuredReview?: FeaturedReview;
}

export interface Printer {
  id: string;
  name: string;
  contactEmail?: string;
  countryCodes: string[]; // List of ISO country codes handled by this printer (e.g., ['FR', 'BE'])
  productionDelayDays?: number;
}
