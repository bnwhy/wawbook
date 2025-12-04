
import { BookConfig, Story, Theme, Activity } from "../types";

// --- ACTIVITÉ INTROS ---
const ACTIVITY_INTROS: Record<Activity, string> = {
  Sport: "{name} venait de finir sa séance de sport et débordait d'énergie.",
  Danse: "{name} esquissait quelques pas de danse joyeux dans sa chambre.",
  Theatre: "{name} s'amusait à imiter ses personnages préférés devant le miroir.",
  Musique: "{name} chantonnait une douce mélodie inventée ce matin-là.",
  Peinture: "{name} avait encore un peu de peinture colorée sur le bout des doigts.",
  Lecture: "{name} referma doucement son livre d'images favori.",
  Jardinage: "{name} rentrait du jardin, les joues rosies par le grand air.",
  Cuisine: "{name} sentait bon la vanille après avoir aidé à préparer un gâteau.",
  Aucune: "{name} rêvassait tranquillement dans sa chambre."
};

// --- IMAGES STATIQUES PAR THEME (Unsplash IDs) ---
const THEME_IMAGES: Record<Theme, string[]> = {
  [Theme.Adventure]: [
    "https://images.unsplash.com/photo-1596395819057-d372232333cc?auto=format&fit=crop&w=1000&q=80", // Map/Room
    "https://images.unsplash.com/photo-1590001006509-06484675715e?auto=format&fit=crop&w=1000&q=80", // Jungle
    "https://images.unsplash.com/photo-1598556836338-9e585e825d48?auto=format&fit=crop&w=1000&q=80", // Monkey/Nature
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80", // Mountain/View
    "https://images.unsplash.com/photo-1589820296156-2454bb8a6d54?auto=format&fit=crop&w=1000&q=80", // Treasure/Chest
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=1000&q=80"  // Happy/Butterfly
  ],
  [Theme.Magic]: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80", // Owl
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80", // Clouds/Fantasy
    "https://images.unsplash.com/photo-1598335624170-17449a5d346b?auto=format&fit=crop&w=1000&q=80", // Castle
    "https://images.unsplash.com/photo-1535581652167-3d6b98c364c7?auto=format&fit=crop&w=1000&q=80", // Candy/Magic
    "https://images.unsplash.com/photo-1502622796232-e88458466c33?auto=format&fit=crop&w=1000&q=80", // Rainbow
    "https://images.unsplash.com/photo-1516575150278-77136aed6920?auto=format&fit=crop&w=1000&q=80"  // Sparkles
  ],
  [Theme.Space]: [
    "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=1000&q=80", // Rocket toy
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80", // Space
    "https://images.unsplash.com/photo-1614728853913-1e2221eb8310?auto=format&fit=crop&w=1000&q=80", // Planet
    "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1000&q=80", // Moon
    "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1000&q=80", // Galaxy
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1000&q=80"  // Astronaut
  ],
  [Theme.Animals]: [
    "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=1000&q=80", // Mouse
    "https://images.unsplash.com/photo-1579267130635-a773721345d3?auto=format&fit=crop&w=1000&q=80", // Rabbit
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1000&q=80", // Fox/Forest
    "https://images.unsplash.com/photo-1501786223405-6d024d7c3b8d?auto=format&fit=crop&w=1000&q=80", // Birds
    "https://images.unsplash.com/photo-1437622645530-1887486fa208?auto=format&fit=crop&w=1000&q=80", // Turtle
    "https://images.unsplash.com/photo-1550948537-130a1ce83314?auto=format&fit=crop&w=1000&q=80"  // Fireflies
  ],
  [Theme.SuperHero]: [
    "https://images.unsplash.com/photo-1560132174-a69888258320?auto=format&fit=crop&w=1000&q=80", // Cape/Hero
    "https://images.unsplash.com/photo-1478479405421-ce83c92fb3ba?auto=format&fit=crop&w=1000&q=80", // City
    "https://images.unsplash.com/photo-1535378437323-9555f3e7f6ae?auto=format&fit=crop&w=1000&q=80", // Villain/Concept
    "https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&w=1000&q=80", // Paint/Color
    "https://images.unsplash.com/photo-1496360938681-982d846196a0?auto=format&fit=crop&w=1000&q=80", // Fireworks
    "https://images.unsplash.com/photo-1531685250784-75699ddc9f5a?auto=format&fit=crop&w=1000&q=80"  // Celebration
  ],
  [Theme.Bedtime]: [
    "https://images.unsplash.com/photo-1532509854226-a2d9d8e01082?auto=format&fit=crop&w=1000&q=80", // Train/Toy
    "https://images.unsplash.com/photo-1570570626315-95c19358f053?auto=format&fit=crop&w=1000&q=80", // Bear
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1000&q=80", // Stars
    "https://images.unsplash.com/photo-1627254593455-8933b91275d8?auto=format&fit=crop&w=1000&q=80", // Plushies
    "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1000&q=80", // Lake/Calm
    "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&w=1000&q=80"  // Sleeping
  ]
};

// --- TEMPLATES DES HISTOIRES ---
const STORY_TEMPLATES: Record<Theme, Story> = {
  [Theme.Adventure]: {
    title: "Le Secret de la Jungle Perdue",
    pages: [
      {
        text: "{activityIntro} Soudain, une petite carte ancienne tomba de l'étagère. Elle brillait d'une lueur dorée étrange.",
        imagePrompt: "Map",
      },
      {
        text: "{name} toucha la carte et... ZOUUUP ! En un clin d'œil, la chambre disparut. {name} se retrouva au milieu d'une jungle immense, avec des arbres qui chatouillaient les nuages.",
        imagePrompt: "Jungle",
      },
      {
        text: "Un petit singe bleu s'approcha. 'Bonjour ! Je m'appelle Coco. Tu cherches le Trésor des Sourires ?' demanda-t-il en sautillant.",
        imagePrompt: "Monkey",
      },
      {
        text: "Guidé par Coco, {name} traversa un pont de lianes. Sous ses pieds, une rivière de limonade pétillante coulait joyeusement.",
        imagePrompt: "Bridge",
      },
      {
        text: "Au sommet de la colline, ils trouvèrent un coffre. À l'intérieur ? Pas de l'or, mais des milliers de papillons lumineux qui s'envolèrent en riant.",
        imagePrompt: "Treasure",
      },
      {
        text: "L'un des papillons se posa sur le nez de {name}. 'Merci pour l'aventure !' murmura l'enfant avant de se réveiller, sourire aux lèvres, dans son lit douillet.",
        imagePrompt: "Bed",
      }
    ]
  },
  [Theme.Magic]: {
    title: "L'École des Nuages Magiques",
    pages: [
      {
        text: "{activityIntro} Par la fenêtre, une chouette violette toqua au carreau. Elle tenait une enveloppe pailletée dans son bec.",
        imagePrompt: "Owl",
      },
      {
        text: "L'invitation disait : 'Bienvenue à l'École des Nuages !'. {name} ferma les yeux et sentit ses pieds décoller du sol. Il volait !",
        imagePrompt: "Flying",
      },
      {
        text: "Là-haut, le château était fait de barbe à papa. Un vieux magicien à barbe blanche l'accueillit. 'Ah, te voilà enfin, {name} !'",
        imagePrompt: "Castle",
      },
      {
        text: "Pour son premier cours, {name} apprit à transformer les gouttes de pluie en bonbons. Ploc, ploc... Miam ! Des fraises tagada tombaient du ciel.",
        imagePrompt: "Candy",
      },
      {
        text: "Mais le plus beau restait à venir. Avec sa baguette, {name} dessina un arc-en-ciel géant sur lequel tous les élèves glissèrent comme sur un toboggan.",
        imagePrompt: "Rainbow",
      },
      {
        text: "De retour dans sa chambre, {name} trouva un bonbon brillant sur son oreiller. La magie était bien réelle !",
        imagePrompt: "Sparkle",
      }
    ]
  },
  [Theme.Space]: {
    title: "Mission: Planète Rigolote",
    pages: [
      {
        text: "{activityIntro} En regardant les étoiles, {name} remarqua que sa cabane de jardin s'était transformée en une magnifique fusée argentée.",
        imagePrompt: "Rocket",
      },
      {
        text: "3, 2, 1... Décollage ! La fusée traversa l'atmosphère en laissant une traînée d'étincelles multicolores. {name} était en route pour l'aventure.",
        imagePrompt: "Space",
      },
      {
        text: "{name} atterrit sur une planète toute rose. Les habitants étaient des petites boules de poils vertes qui roulaient pour se déplacer.",
        imagePrompt: "Planet",
      },
      {
        text: "Les habitants avaient un problème : leur lune avait le hoquet ! À chaque 'HIC', toute la planète tremblait. {name} eut une idée.",
        imagePrompt: "Moon",
      },
      {
        text: "{name} raconta la blague la plus drôle de la Terre à la lune. La lune rit si fort qu'elle en oublia son hoquet. Tout redevint calme.",
        imagePrompt: "Galaxy",
      },
      {
        text: "Les petits extraterrestres offrirent à {name} une cape d'étoiles pour le remercier. 'À bientôt, capitaine {name} !'",
        imagePrompt: "Astronaut",
      }
    ]
  },
  [Theme.Animals]: {
    title: "Le Grand Concert de la Forêt",
    pages: [
      {
        text: "{activityIntro} Une petite souris en costume toqua au carreau. 'Vite {name} ! Le concert va commencer et le chef d'orchestre a disparu !'",
        imagePrompt: "Mouse",
      },
      {
        text: "{name} suivit la souris jusqu'à une clairière enchantée. Des lapins accordaient leurs violons et un ours soufflait dans un tuba.",
        imagePrompt: "Rabbits",
      },
      {
        text: "'Nous avons besoin de toi !' dirent les animaux. {name} saisit une baguette magique en bois de saule et monta sur la souche.",
        imagePrompt: "Forest",
      },
      {
        text: "Au premier coup de baguette, les oiseaux chantèrent une mélodie si douce que les feuilles des arbres se mirent à danser.",
        imagePrompt: "Birds",
      },
      {
        text: "Les écureuils battaient le rythme avec des noisettes. Tout le monde dansait, même les vieilles tortues !",
        imagePrompt: "Animals",
      },
      {
        text: "Le concert fini, les lucioles raccompagnèrent {name} chez lui. C'était la plus belle soirée que la forêt ait jamais connue.",
        imagePrompt: "Fireflies",
      }
    ]
  },
  [Theme.SuperHero]: {
    title: "Le Sauveur des Couleurs",
    pages: [
      {
        text: "{activityIntro} Tout à coup, {name} remarqua quelque chose d'étrange : toutes les couleurs de sa chambre commençaient à disparaître !",
        imagePrompt: "Bedroom",
      },
      {
        text: "Il enfila sa cape préférée. 'Pas de panique ! Super-{name} est là !' Il sortit et vit que la ville entière devenait grise.",
        imagePrompt: "City",
      },
      {
        text: "Le méchant Dr. Grisouille aspirait les couleurs avec son gros aspirateur nuageux. Il fallait l'arrêter !",
        imagePrompt: "Villain",
      },
      {
        text: "{name} utilisa son super-pouvoir : le Rire-Coloré. À chaque éclat de rire, une vague de peinture magique explosait.",
        imagePrompt: "Paint",
      },
      {
        text: "Touché par la joie de {name}, le Dr. Grisouille commença à rire aussi. Son aspirateur explosa en feux d'artifice !",
        imagePrompt: "Fireworks",
      },
      {
        text: "Le monde était plus coloré que jamais. Les habitants portèrent {name} en triomphe. Quel héros !",
        imagePrompt: "Celebration",
      }
    ]
  },
  [Theme.Bedtime]: {
    title: "Le Train des Rêves Doux",
    pages: [
      {
        text: "{activityIntro} La lune brillait fort ce soir. Une locomotive à vapeur, faite de nuages moelleux, s'arrêta devant la fenêtre de {name}.",
        imagePrompt: "Train",
      },
      {
        text: "'Tchou tchou ! En voiture pour le Pays des Rêves !' cria le conducteur, un grand ours en pyjama.",
        imagePrompt: "Bear",
      },
      {
        text: "{name} monta à bord. Les sièges étaient des marshmallows géants. Le train s'envola doucement vers les étoiles.",
        imagePrompt: "Stars",
      },
      {
        text: "Ils traversèrent la Vallée des Doudous, où les peluches poussaient comme des fleurs. {name} fit coucou à un lapin géant.",
        imagePrompt: "Plushies",
      },
      {
        text: "Le train ralentit près du Lac du Sommeil. L'eau était si calme qu'elle reflétait tous les rêves heureux du monde.",
        imagePrompt: "Lake",
      },
      {
        text: "{name} se sentit lourd de sommeil. Le train le déposa doucement dans son lit. 'Bonne nuit, petit voyageur...'",
        imagePrompt: "Sleep",
      }
    ]
  }
};

/**
 * Génère l'histoire complète avec texte et images (Statiques)
 */
export async function generateStoryText(config: BookConfig): Promise<Story> {
  const template = STORY_TEMPLATES[config.theme];
  if (!template) throw new Error(`Aucun template trouvé pour le thème ${config.theme}`);

  const activityIntro = ACTIVITY_INTROS[config.appearance.activity] || ACTIVITY_INTROS['Aucune'];

  const newStory: Story = JSON.parse(JSON.stringify(template));

  newStory.pages = newStory.pages.map((page, index) => {
    // Remplacement du texte
    const text = page.text.replace(/{name}/g, config.childName).replace(/{activityIntro}/g, activityIntro);
    
    // Sélection image statique
    const images = THEME_IMAGES[config.theme];
    const imageUrl = images[index % images.length];

    return {
      ...page,
      text,
      imageUrl,
      isLoadingImage: false
    };
  });

  // Petit délai pour simuler le chargement (UX)
  await new Promise(r => setTimeout(r, 2000));

  return newStory;
}
