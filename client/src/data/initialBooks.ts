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
import birthImage from '@assets/generated_images/children\'s_book_cover_for_birth_occasion_with_french_title.png';
import birthdayImage from '@assets/generated_images/children\'s_book_cover_for_birthday_occasion_with_french_title.png';
import fathersDayImage from '@assets/generated_images/children\'s_book_cover_for_father\'s_day_occasion_with_french_title.png';
import mothersDayImage from '@assets/generated_images/children\'s_book_cover_for_mother\'s_day_occasion_with_french_title.png';
import boyBlondAvatar from '@assets/generated_images/watercolor_boy_avatar_light_skin_blond_hair_short.png';
import boyBlondLightAvatar from '@assets/generated_images/watercolor_avatar_of_a_boy_with_blond_hair_and_light_skin.png';
import boyBlondRoundGlassesAvatar from '@assets/generated_images/watercolor_avatar_of_the_same_boy_with_short_blond_hair_and_round_glasses.png';
import boyBlondSquareGlassesAvatar from '@assets/generated_images/watercolor_avatar_of_the_same_boy_with_short_blond_hair_and_square_glasses.png';
import boyBlondSpikyAvatar from '@assets/generated_images/watercolor_avatar_of_the_same_boy_with_spiky_blond_hair_and_no_glasses.png';
import boyBlondSpikyRoundGlassesAvatar from '@assets/generated_images/watercolor_avatar_of_the_same_boy_with_spiky_blond_hair_and_round_glasses.png';

// Wizard Assets
import hairBald from '@assets/generated_images/bald_hairstyle_icon.png';
import hairShort from '@assets/generated_images/short_hairstyle_icon.png';
import hairSpiky from '@assets/generated_images/spiky_hairstyle_icon.png';
import hairCurly from '@assets/generated_images/curly_hairstyle_icon.png';
import hairLong from '@assets/generated_images/long_hairstyle_icon.png';
import beardMustache from '@assets/generated_images/mustache_beard_icon.png';
import beardGoatee from '@assets/generated_images/goatee_beard_icon.png';
import beardFull from '@assets/generated_images/full_beard_icon.png';

const SHARED_AVATAR_MAPPINGS = {
  'Blond_Claire_Court_None_boy': boyBlondLightAvatar,
  'Blond_Claire_Court_Round_boy': boyBlondRoundGlassesAvatar,
  'Blond_Claire_Court_Square_boy': boyBlondSquareGlassesAvatar,
  'Blond_Claire_Hérissé_None_boy': boyBlondSpikyAvatar,
  'Blond_Claire_Hérissé_Round_boy': boyBlondSpikyRoundGlassesAvatar
};

const SHARED_CHILD_TAB = {
  id: 'child',
  label: 'Enfant',
  type: 'character' as const,
  options: [],
  variants: [
    {
      id: 'gender',
      label: 'Genre',
      type: 'options' as const,
      options: [
        { id: 'boy', label: 'Garçon' },
        { id: 'girl', label: 'Fille' }
      ]
    },
    {
      id: 'name',
      label: 'Prénom',
      type: 'text' as const,
      minLength: 2,
      maxLength: 20
    },
    {
      id: 'skinTone',
      label: 'Peau',
      type: 'options' as const,
      options: [
        { id: 'Claire', label: 'Claire', resource: '#f6d6c8' },
        { id: 'Beige', label: 'Beige', resource: '#f9cca4' },
        { id: 'Muscade', label: 'Muscade', resource: '#edb17f' },
        { id: 'Marron', label: 'Marron', resource: '#d19f79' },
        { id: 'MarronFonce', label: 'Marron foncé', resource: '#ae836c' },
        { id: 'Noir', label: 'Noir', resource: '#6a4730' }
      ]
    },
    {
      id: 'hairColor',
      label: 'Cheveux',
      type: 'options' as const,
      options: [
        { id: 'Blond', label: 'Blond', resource: '#f7e48c' },
        { id: 'BlondFonce', label: 'Blond foncé', resource: '#ba9a0d' },
        { id: 'Chatain', label: 'Châtain', resource: '#a76635' },
        { id: 'Noir', label: 'Noir', resource: '#302e34' },
        { id: 'Roux', label: 'Roux', resource: '#ef6c2a' },
        { id: 'Gris', label: 'Gris', resource: '#b9b9bd' },
        { id: 'Blanc', label: 'Blanc', resource: '#fefefe' }
      ]
    },
    {
      id: 'hairStyle',
      label: 'Coiffure',
      type: 'options' as const,
      options: [
        { id: 'Court', label: 'Court' },
        { id: 'Hérissé', label: 'Hérissé' },
        { id: 'Carré', label: 'Carré' },
        { id: 'Long', label: 'Long' },
        { id: 'Chignon', label: 'Chignon' },
        { id: 'Nattes', label: 'Nattes' },
        { id: 'Bouclé', label: 'Bouclé' },
        { id: 'QueueCheval', label: 'Queue' }
      ]
    },
    {
      id: 'glasses',
      label: 'Lunettes',
      type: 'options' as const,
      options: [
        { id: 'None', label: 'Aucune' },
        { id: 'Round', label: 'Rondes' },
        { id: 'Square', label: 'Carrées' }
      ]
    }
  ]
};

const FAMILY_WIZARD_CONFIG = {
  avatarStyle: 'watercolor' as const,
  avatarMappings: SHARED_AVATAR_MAPPINGS,
  tabs: [
    SHARED_CHILD_TAB,
    {
      id: 'adult',
      label: 'Adulte',
      type: 'character' as const,
      options: [],
      variants: [
        {
          id: 'role',
          label: 'Rôle',
          type: 'options' as const,
          options: [
            { id: 'dad', label: 'Papa' },
            { id: 'mom', label: 'Maman' },
            { id: 'grandpa', label: 'Papi' },
            { id: 'grandma', label: 'Mamie' }
          ]
        },
        {
          id: 'name',
          label: 'Surnom',
          type: 'text' as const,
          minLength: 2,
          maxLength: 20
        },
        {
          id: 'skinTone',
          label: 'Peau',
          type: 'options' as const,
          options: [
            { id: 'Claire', label: 'Claire', resource: '#f6d6c8' },
            { id: 'Beige', label: 'Beige', resource: '#f9cca4' },
            { id: 'Muscade', label: 'Muscade', resource: '#edb17f' },
            { id: 'Marron', label: 'Marron', resource: '#d19f79' },
            { id: 'MarronFonce', label: 'Marron foncé', resource: '#ae836c' },
            { id: 'Noir', label: 'Noir', resource: '#6a4730' }
          ]
        },
         {
          id: 'hairColor',
          label: 'Cheveux',
          type: 'options' as const,
          options: [
            { id: 'Blond', label: 'Blond', resource: '#f7e48c' },
            { id: 'BlondFonce', label: 'Blond foncé', resource: '#ba9a0d' },
            { id: 'Chatain', label: 'Châtain', resource: '#a76635' },
            { id: 'Noir', label: 'Noir', resource: '#302e34' },
            { id: 'Roux', label: 'Roux', resource: '#ef6c2a' },
            { id: 'Gris', label: 'Gris', resource: '#b9b9bd' },
            { id: 'Blanc', label: 'Blanc', resource: '#fefefe' }
          ]
        },
        {
          id: 'hairStyle',
          label: 'Coiffure',
          type: 'options' as const,
          options: [
            { id: 'Chauve', label: 'Chauve', thumbnail: hairBald },
            { id: 'Court', label: 'Court', thumbnail: hairShort },
            { id: 'Hérissé', label: 'Hérissé', thumbnail: hairSpiky },
            { id: 'Bouclé', label: 'Bouclé', thumbnail: hairCurly },
            { id: 'Long', label: 'Long', thumbnail: hairLong },
            { id: 'Carré', label: 'Carré', thumbnail: hairLong } // Reusing long for now or could generate specific
          ]
        },
        {
           id: 'beard',
           label: 'Barbe',
           type: 'options' as const,
           options: [
             { id: 'None', label: 'Rasé' }, // No thumbnail for clean shaven or use a generic face
             { id: 'Moustache', label: 'Moustache', thumbnail: beardMustache },
             { id: 'Bouc', label: 'Bouc', thumbnail: beardGoatee },
             { id: 'Barbe', label: 'Barbe', thumbnail: beardFull }
           ]
        }
      ]
    }
  ]
};

const SIMPLE_CHILD_TAB = {
  id: 'child',
  label: 'Enfant',
  type: 'character' as const,
  options: [],
  variants: [
    {
      id: 'name',
      label: 'Prénom',
      type: 'text' as const,
      minLength: 2,
      maxLength: 20
    }
  ]
};

const DEFAULT_WIZARD_CONFIG = {
  avatarStyle: 'watercolor' as const,
  avatarMappings: SHARED_AVATAR_MAPPINGS,
  tabs: [SIMPLE_CHILD_TAB]
};

const DEFAULT_CONTENT_CONFIG = {
  pages: [],
  texts: [],
  images: [],
  imageElements: []
};

const FAMILY_CONTENT_CONFIG = {
    ...DEFAULT_CONTENT_CONFIG,
    images: [
        {
            id: 'avatar-boy-blond',
            combinationKey: 'Blond_Claire_Court_None_boy',
            pageIndex: 1, // Assume page 1 for now or as needed
            imageUrl: boyBlondAvatar
        }
    ]
};

const DEFAULT_FEATURES = {
  languages: ['Français', 'Allemand', 'Anglais', 'Espagnol', 'Italien', 'Norvégien', 'Suédois', 'Luxembourgeois', 'Turc', 'Portugais', 'Catalan', 'Galicien', 'Basque', 'Néerlandais'],
  customization: ['Nom', 'Genre', 'Couleur de peau', 'Cheveux', 'Coiffure', 'Barbe', 'Vêtements', 'Lunettes'],
  pages: 40,
  formats: ['Broché : 21,5 x 25,8 cm', 'Relié : 22,2 x 26,5 cm'],
  dimensions: { width: 210, height: 210 },
  printConfig: {
    bindingType: 'hardcover',
    cover: {
      bleedMm: 20, 
      safeMarginMm: 8,
      paperType: 'coated_standard',
      spineWidthMm: 8.5
    },
    interior: {
      bleedMm: 3,
      safeMarginMm: 10,
      paperType: 'coated_standard'
    }
  }
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
    features: DEFAULT_FEATURES,
    wizardConfig: DEFAULT_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG,
    associatedPaths: ['/products/Nouveau', '/products/Bestsellers']
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
    contentConfig: DEFAULT_CONTENT_CONFIG,
    associatedPaths: ['/products/Nouveau']
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
  {
    id: 'dad',
    name: 'Mon Papa & Moi',
    description: "Un livre plein d'amour pour dire à son papa combien on l'aime.",
    price: 29.90,
    oldPrice: 34.90,
    category: 'family',
    theme: Theme.Bedtime,
    coverImage: dadImage,
    badgeText: 'Famille',
    wizardConfig: FAMILY_WIZARD_CONFIG,
    contentConfig: FAMILY_CONTENT_CONFIG,
    associatedPaths: ['/for/Papa']
  },
  {
    id: 'mom',
    name: 'Ma Maman & Moi',
    category: 'family',
    theme: Theme.Bedtime,
    badgeText: 'Famille',
    coverImage: momImage,
    price: 29.90,
    oldPrice: 34.90,
    description: "Une histoire tendre et douce à partager avec la meilleure des mamans.",
    wizardConfig: FAMILY_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },
  {
    id: 'grandpa',
    name: 'Papi & Moi',
    category: 'family',
    theme: Theme.Bedtime,
    badgeText: 'Famille',
    coverImage: grandpaImage,
    price: 29.90,
    oldPrice: 34.90,
    description: "Des souvenirs précieux et des aventures rigolotes avec Papi.",
    wizardConfig: FAMILY_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },
  {
    id: 'grandma',
    name: 'Mamie & Moi',
    category: 'family',
    theme: Theme.Bedtime,
    badgeText: 'Famille',
    coverImage: grandmaImage,
    price: 29.90,
    oldPrice: 34.90,
    description: "Les câlins, les gâteaux et les histoires de Mamie sont les meilleurs.",
    wizardConfig: FAMILY_WIZARD_CONFIG,
    contentConfig: DEFAULT_CONTENT_CONFIG
  },

  // OCCASIONS
  { id: 'birth', name: 'Bienvenue Bébé', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Naissance', coverImage: birthImage, price: 29.90, oldPrice: 34.90, description: "Un souvenir inoubliable pour célébrer l'arrivée d'un nouveau-né.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'birthday', name: 'Joyeux Anniversaire', category: 'occasion', theme: Theme.Adventure, badgeText: 'Anniversaire', coverImage: birthdayImage, price: 29.90, oldPrice: 34.90, description: "Le cadeau parfait pour souffler ses bougies avec magie.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'fathersDay', name: 'Bonne Fête Papa', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Fête des Pères', coverImage: fathersDayImage, price: 29.90, oldPrice: 34.90, description: "Pour dire je t'aime au meilleur papa du monde.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
  { id: 'mothersDay', name: 'Bonne Fête Maman', category: 'occasion', theme: Theme.Bedtime, badgeText: 'Fête des Mères', coverImage: mothersDayImage, price: 29.90, oldPrice: 34.90, description: "Une histoire pleine de tendresse pour la reine de la famille.", wizardConfig: DEFAULT_WIZARD_CONFIG, contentConfig: DEFAULT_CONTENT_CONFIG },
];
