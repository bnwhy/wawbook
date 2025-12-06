import { BookProduct } from '../types/admin';
import { Theme } from '../types';

import explorerImage from '@assets/generated_images/children\'s_book_cover_for_explorer_theme_with_french_title.png';
import magicianImage from '@assets/generated_images/children\'s_book_cover_for_magician_theme_with_french_title.png';
import astronautImage from '@assets/generated_images/children\'s_book_cover_for_astronaut_theme_with_french_title.png';
import animalsImage from '@assets/generated_images/children\'s_book_cover_for_animal_friend_theme_with_french_title.png';
import sportImage from '@assets/generated_images/children\'s_book_cover_for_sport_theme_with_french_title.png';
import danceImage from '@assets/generated_images/children\'s_book_cover_for_dance_theme_with_french_title.png';
import theaterImage from '@assets/generated_images/children\'s_book_cover_for_theater_theme_with_french_title.png';
import musicImage from '@assets/generated_images/children\'s_book_cover_for_music_theme_with_french_title.png';
import paintingImage from '@assets/generated_images/children\'s_book_cover_for_painting_theme_with_french_title.png';
import readingImage from '@assets/generated_images/children\'s_book_cover_for_reading_theme_with_french_title.png';
import natureImage from '@assets/generated_images/children\'s_book_cover_for_gardening_theme_with_french_title.png';
import cookingImage from '@assets/generated_images/children\'s_book_cover_for_cooking_theme_with_french_title.png';
import dadImage from '@assets/generated_images/children\'s_book_cover_for_dad_and_child_with_french_title.png';
import momImage from '@assets/generated_images/children\'s_book_cover_for_mom_and_child_with_french_title.png';
import grandpaImage from '@assets/generated_images/children\'s_book_cover_for_grandpa_and_child_with_french_title.png';
import grandmaImage from '@assets/generated_images/children\'s_book_cover_for_grandma_and_child_with_french_title.png';
import siblingsImage from '@assets/generated_images/children\'s_book_cover_for_siblings_with_french_title.png';
import birthImage from '@assets/generated_images/children\'s_book_cover_for_birth_occasion_with_french_title.png';
import birthdayImage from '@assets/generated_images/children\'s_book_cover_for_birthday_occasion_with_french_title.png';
import fathersDayImage from '@assets/generated_images/children\'s_book_cover_for_father\'s_day_occasion_with_french_title.png';
import mothersDayImage from '@assets/generated_images/children\'s_book_cover_for_mother\'s_day_occasion_with_french_title.png';

const DEFAULT_WIZARD_CONFIG = {
  avatarStyle: 'watercolor' as const,
  tabs: []
};

const DEFAULT_CONTENT_CONFIG = {
  pages: [],
  texts: [],
  images: []
};

export const INITIAL_BOOKS: BookProduct[] = [
  // THEMES
  {
    id: 'explorer',
    name: 'L\'Aventurier du Monde',
    description: "Un voyage extraordinaire à travers les montagnes, les jungles et les océans.",
    price: 29.90,
    oldPrice: 34.90,
    category: 'theme',
    theme: Theme.Adventure,
    coverImage: explorerImage,
    badgeText: 'Best-seller',
    wizardConfig: DEFAULT_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },
  {
    id: 'magician',
    name: 'L\'École des Sorciers',
    description: "Apprendre des sorts et voler sur un balai magique.",
    price: 29.90,
    oldPrice: 34.90,
    category: 'theme',
    theme: Theme.Magic,
    coverImage: magicianImage,
    badgeText: 'Magique',
    wizardConfig: DEFAULT_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },
  {
    id: 'astronaut',
    name: 'Mission Espace',
    description: "Décollage immédiat pour une aventure parmi les étoiles et les planètes.",
    price: 29.90,
    oldPrice: 34.90,
    category: 'theme',
    theme: Theme.Space,
    coverImage: astronautImage,
    badgeText: 'Cosmique',
    wizardConfig: DEFAULT_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },
  {
    id: 'animals',
    name: 'Les Amis de la Forêt',
    description: "Une promenade douce et poétique en forêt pour se faire plein de nouveaux amis.",
    price: 29.90,
    oldPrice: 34.90,
    category: 'theme',
    theme: Theme.Animals,
    coverImage: animalsImage,
    badgeText: 'Nature',
    wizardConfig: DEFAULT_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },

  // ACTIVITIES
  { id: 'Sport', name: 'Le Petit Sportif', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Sport', coverImage: sportImage, price: 29.90, oldPrice: 34.90, description: "Pour les champions en herbe qui aiment bouger et marquer des buts !", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Danse', name: 'Danseuse Étoile', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Danse', coverImage: danceImage, price: 29.90, oldPrice: 34.90, description: "Une histoire pleine de grâce et de pirouettes sur scène.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Theatre', name: 'En Scène !', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Théâtre', coverImage: theaterImage, price: 29.90, oldPrice: 34.90, description: "Les projecteurs s'allument pour la plus belle pièce de théâtre.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Musique', name: 'Le Petit Musicien', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Musique', coverImage: musicImage, price: 29.90, oldPrice: 34.90, description: "Des notes magiques et une mélodie inoubliable.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Peinture', name: 'L\'Artiste en Herbe', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Peinture', coverImage: paintingImage, price: 29.90, oldPrice: 34.90, description: "Un monde de couleurs et de créativité s'ouvre à l'enfant.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Lecture', name: 'Rat de Bibliothèque', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Lecture', coverImage: readingImage, price: 29.90, oldPrice: 34.90, description: "L'aventure commence dès qu'on ouvre un bon livre.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Jardinage', name: 'Le Petit Jardinier', category: 'activity', theme: Theme.Animals, badgeText: 'Passion Nature', coverImage: natureImage, price: 29.90, oldPrice: 34.90, description: "Découvrir les secrets des plantes et des petites bêtes du jardin.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'Cuisine', name: 'Le Petit Chef', category: 'activity', theme: Theme.Adventure, badgeText: 'Passion Cuisine', coverImage: cookingImage, price: 29.90, oldPrice: 34.90, description: "Miam ! Une histoire gourmande à dévorer sans modération.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },

  // FAMILY
  { id: 'dad', name: 'Mon Papa & Moi', category: 'family', theme: Theme.Bedtime, badgeText: 'Famille', coverImage: dadImage, price: 29.90, oldPrice: 34.90, description: "Un livre plein d'amour pour dire à son papa combien on l'aime.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'mom', name: 'Ma Maman & Moi', category: 'family', theme: Theme.Bedtime, badgeText: 'Famille', coverImage: momImage, price: 29.90, oldPrice: 34.90, description: "Une histoire tendre et douce à partager avec la meilleure des mamans.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'grandpa', name: 'Papi & Moi', category: 'family', theme: Theme.Bedtime, badgeText: 'Famille', coverImage: grandpaImage, price: 29.90, oldPrice: 34.90, description: "Des souvenirs précieux et des aventures rigolotes avec Papi.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'grandma', name: 'Mamie & Moi', category: 'family', theme: Theme.Bedtime, badgeText: 'Famille', coverImage: grandmaImage, price: 29.90, oldPrice: 34.90, description: "Les câlins, les gâteaux et les histoires de Mamie sont les meilleurs.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'siblings', name: 'Les Super Frères & Sœurs', category: 'family', theme: Theme.Adventure, badgeText: 'Famille', coverImage: siblingsImage, price: 29.90, oldPrice: 34.90, description: "Une équipe de choc pour affronter tous les défis ensemble !", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },

  // OCCASIONS
  { id: 'birth', name: 'Bienvenue Bébé', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Naissance', coverImage: birthImage, price: 29.90, oldPrice: 34.90, description: "Un souvenir inoubliable pour célébrer l'arrivée d'un nouveau-né.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'birthday', name: 'Joyeux Anniversaire', category: 'occasion', theme: Theme.Adventure, badgeText: 'Anniversaire', coverImage: birthdayImage, price: 29.90, oldPrice: 34.90, description: "Le cadeau parfait pour souffler ses bougies avec magie.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'fathersDay', name: 'Bonne Fête Papa', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Fête des Pères', coverImage: fathersDayImage, price: 29.90, oldPrice: 34.90, description: "Pour dire je t'aime au meilleur papa du monde.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'mothersDay', name: 'Bonne Fête Maman', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Fête des Mères', coverImage: mothersDayImage, price: 29.90, oldPrice: 34.90, description: "Une histoire pleine de tendresse pour la reine de la famille.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
];
