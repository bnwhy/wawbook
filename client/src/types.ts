export enum Gender {
  Boy = 'Garçon',
  Girl = 'Fille',
  Neutral = 'Neutre'
}

export enum Theme {
  Adventure = 'Aventure & Exploration',
  Magic = 'Magie & Créatures Fantastiques',
  Space = 'Espace & Futurist',
  Animals = 'Animaux & Nature',
  SuperHero = 'Super-Héros',
  Bedtime = 'Douce Nuit & Rêves'
}

export type HairStyle = 'Court' | 'Hérissé' | 'Carré' | 'Long' | 'Chignon' | 'Nattes' | 'Bouclé' | 'QueueCheval';
export type Outfit = 'Salopette' | 'TShirt' | 'Robe' | 'Chemise' | 'Sweat' | 'Sport' | 'Pyjama';
export type Activity = 'Sport' | 'Danse' | 'Theatre' | 'Musique' | 'Peinture' | 'Lecture' | 'Jardinage' | 'Cuisine' | 'Aucune';

export interface CharacterAppearance {
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  hairStyle: HairStyle;
  beard?: string; // Added beard optional field
  outfit: Outfit;
  activity: Activity;
  glasses: boolean;
  glassesStyle?: 'Round' | 'Square' | 'None';
  hearingAid?: 'None' | 'Beige' | 'Black' | 'Blue' | 'Green' | 'Gray';
  grayHair?: boolean;
  distinctiveFeatures?: string; // Kept for backward compatibility or extra details
}

export interface BookConfig {
  childName: string;
  age: number;
  gender: Gender;
  theme: Theme;
  appearance: CharacterAppearance;
  dedication?: string;
  // New dynamic structure
  characters?: Record<string, any>;
}

export interface StoryPage {
  text: string;
  imagePrompt: string;
  imageUrl?: string; // Populated after generation
  isLoadingImage?: boolean;
}

export interface Story {
  title: string;
  pages: StoryPage[];
}

export type AppState = 'HOME' | 'CREATE' | 'GENERATING' | 'READING' | 'ADMIN';