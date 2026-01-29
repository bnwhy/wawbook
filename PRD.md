# Product Requirements Document (PRD) - NuageBook

**Version :** 1.0  
**Date :** Janvier 2026  
**Statut :** Actif

---

## 1. Vision et Objectifs

### 1.1 Vision Produit

NuageBook est une plateforme e-commerce innovante permettant de créer et vendre des livres personnalisés pour enfants. Notre vision est de devenir la référence mondiale pour les livres personnalisés, en combinant la puissance des outils professionnels de design (Adobe InDesign) avec une expérience utilisateur simplifiée et interactive.

### 1.2 Mission

Offrir à chaque enfant une expérience de lecture unique où il devient le héros de sa propre histoire, tout en simplifiant le processus de création pour les auteurs et éditeurs.

### 1.3 Objectifs Business

| Objectif | Métrique | Cible |
|----------|----------|-------|
| Volume de ventes | Livres vendus | 1M+ livres |
| Satisfaction client | Score TrustPilot | 4.9/5 |
| Temps de création | Durée personnalisation | < 5 minutes |
| Taux de conversion | Visiteurs → Acheteurs | 15% |
| Disponibilité système | Uptime | 99.9% |
| Performance | Temps de rendu page | < 2s |

### 1.4 Public Cible

**Primaire :**
- **Parents** (25-45 ans) : Cherchent des cadeaux personnalisés pour leurs enfants
- **Grands-parents** (55-75 ans) : Veulent offrir des cadeaux significatifs à leurs petits-enfants
- **Éducateurs** : Utilisent des livres personnalisés pour l'enseignement

**Secondaire :**
- **Auteurs/Créateurs** : Souhaitent publier leurs propres livres personnalisables
- **Entreprises B2B** : Commandes en gros pour événements

### 1.5 Proposition de Valeur Unique

1. **Personnalisation complète** : Apparence physique, nom, âge, co-personnages
2. **Preview temps réel** : Visualisation immédiate via flipbook interactif
3. **Qualité professionnelle** : Basé sur templates InDesign
4. **Simplicité** : 3 clics pour créer son livre personnalisé
5. **Éco-responsable** : 100% papier recyclé

---

## 2. Fonctionnalités Principales

### 2.1 Catalogue et Découverte

#### Description
Interface de découverte des livres disponibles avec navigation intuitive et recherche avancée.

#### Fonctionnalités détaillées

**Page d'accueil**
- Hero section avec call-to-action principal
- Section features mettant en avant les avantages
- Grille de produits avec livres mis en avant
- Section trust avec statistiques (1M+ livres, 4.9/5, etc.)
- Footer avec liens utiles et réseaux sociaux

**Navigation par catégories**
- **Famille** : Maman, Papa, Grands-parents, Fratrie
- **Thème** : Aventure, Princesses, Dinosaures, Espace, etc.
- **Activité** : Apprentissage, Coucher, Voyage
- **Occasion** : Anniversaire, Noël, Rentrée scolaire

**Fiches produits**
- Image de couverture
- Titre et description
- Prix (avec prix barré si promo)
- Badges : "Nouveau", "Bestseller", "Promo"
- Bouton "Personnaliser maintenant"
- Aperçu pages intérieures

#### Exigences techniques
- Chargement lazy des images
- Filtrage côté client pour performance
- Support multi-langues (30+ langues)

#### User Stories
- US-1.1 : En tant qu'utilisateur, je veux parcourir les livres par catégorie pour trouver celui qui correspond à mon besoin
- US-1.2 : En tant qu'utilisateur, je veux voir les prix et promotions en cours pour prendre une décision d'achat
- US-1.3 : En tant qu'utilisateur, je veux voir un aperçu du livre avant de le personnaliser

---

### 2.2 Wizard de Personnalisation

#### Description
Interface multi-étapes guidant l'utilisateur dans la personnalisation complète de son livre.

#### Architecture du Wizard

Le wizard est **généré dynamiquement** depuis `wizardConfig` stocké dans la base de données pour chaque livre. Cette configuration est elle-même générée automatiquement lors de l'import EPUB/IDML en analysant les caractéristiques des images.

**Structure wizardConfig :**
```json
{
  "tabs": [
    {
      "id": "hero",
      "title": "Héros",
      "icon": "user",
      "variants": [
        {
          "id": "gender",
          "label": "Genre",
          "type": "radio",
          "options": [
            { "id": "boy", "label": "Garçon", "imageUrl": "..." },
            { "id": "girl", "label": "Fille", "imageUrl": "..." }
          ]
        },
        {
          "id": "skin",
          "label": "Teint",
          "type": "radio",
          "options": [...]
        }
      ]
    }
  ]
}
```

#### Fonctionnalités détaillées

**Onglets dynamiques**
- Héros : Genre, teint, couleur cheveux, coiffure, yeux
- Co-héros : Père, mère, frère, sœur, animaux
- Détails : Nom enfant, âge, dédicace personnalisée
- Résumé : Récapitulatif avant ajout au panier

**Preview en temps réel**
- Avatar généré dynamiquement à partir des sélections
- Animation "dessin au crayon" pendant le chargement
- Mise à jour instantanée à chaque changement
- Affichage du nom de l'enfant dans le contexte

**Validation**
- Champs obligatoires marqués
- Validation prénom (2-50 caractères)
- Limite dédicace (0-200 caractères)
- Bouton "Suivant" désactivé si incomplet

#### Génération automatique

Le système analyse les noms de fichiers d'images du storyboard :
```
page1_hero-father_skin-light_hair-brown.png
```

Génère automatiquement :
- Onglet "Héros"
- Variant "hero" avec options : father, mother, child...
- Variant "skin" avec options : light, medium, dark
- Variant "hair" avec options : brown, blond, black...

#### Exigences techniques
- Composants React réutilisables
- State management avec Context API
- Validation côté client avec Zod
- Support mobile responsive
- Sauvegarde progression (localStorage)

#### User Stories
- US-2.1 : En tant que parent, je veux personnaliser l'apparence du héros pour qu'il ressemble à mon enfant
- US-2.2 : En tant qu'utilisateur, je veux ajouter une dédicace personnalisée pour rendre le livre unique
- US-2.3 : En tant qu'utilisateur, je veux voir un aperçu en temps réel de mes choix
- US-2.4 : En tant qu'utilisateur mobile, je veux naviguer facilement dans le wizard sur mon téléphone

---

### 2.3 Système d'Import EPUB/IDML

#### Description
Système professionnel d'import permettant aux administrateurs d'uploader des templates créés dans Adobe InDesign et de les transformer en livres personnalisables.

#### Architecture en Deux Parties

**Règle d'or :**
```
EPUB = Images + Conteneurs vides + Positions (OÙ mettre les choses)
IDML = Texte + Mise en forme complète (QUOI mettre et COMMENT)
```

#### Workflow d'Import

**Étape 1 : Création dans InDesign**
1. Designer crée le storyboard dans InDesign
2. Applique des styles (Character/Paragraph) à tous les textes
3. Insère des variables : `{{nom_enfant}}`, `{{age}}`, etc.
4. Export EPUB (Fixed Layout)
5. Export IDML

**Étape 2 : Upload via Interface Admin**
```
POST /api/books/import-storyboard
FormData:
  - epub: fichier .epub
  - idml: fichier .idml
  - fonts[]: fichiers .ttf/.otf
  - bookId: ID du livre
```

**Étape 3 : Traitement Serveur**

1. **Extraction EPUB** (`epubExtractor.ts`)
   - Décompression ZIP de l'EPUB
   - Extraction images → Object Storage
   - Parsing CSS pour positions (x, y, width, height, rotation)
   - Création conteneurs vides avec positions uniquement

2. **Parsing IDML** (`idmlParser.ts`)
   - Décompression ZIP de l'IDML
   - Parsing `Stories.xml` → extraction textFrames avec contenu
   - Parsing `Graphic.xml` → extraction CharacterStyles
   - Parsing `Graphic.xml` → extraction ParagraphStyles
   - Parsing `Graphic.xml` → extraction palette couleurs
   - Conversion couleurs CMYK/RGB → Hex

3. **Fusion EPUB + IDML** (`idmlMerger.ts`)
   - Mapping automatique par ordre de lecture (haut→bas, gauche→droite)
   - Association positions EPUB ↔ textes IDML
   - Résolution hiérarchie polices :
     1. Inline Character Properties
     2. Applied Character Style
     3. Paragraph Style
   - Application styles complets

4. **Génération wizardConfig**
   - Analyse noms fichiers images
   - Extraction caractéristiques : `hero`, `skin`, `hair`, etc.
   - Génération structure onglets/variants/options
   - Labels français automatiques

5. **Stockage**
   - Sauvegarde `contentConfig` avec texts + images + positions
   - Sauvegarde `wizardConfig`
   - Upload fonts → Object Storage
   - Création entrée DB

#### Points Techniques Critiques

**⚠️ Les polices DOIVENT être dans l'IDML**
- Aucun fallback vers CSS EPUB
- Si police manquante → erreur visible dans logs
- Vérification hiérarchie stricte

**Mapping Déterministe**
- Ordre de lecture automatique
- 1ère zone EPUB → 1er texte IDML
- Par page séparément

**Variables Supportées**
- `{{nom_enfant}}` - Prénom de l'enfant
- `{{age}}` - Âge
- `{{genre}}` - Garçon/Fille
- `{{hero}}` - Type de héros
- Variables custom selon livre

#### Exigences techniques
- Node.js streams pour gros fichiers
- JSZip pour décompression
- Cheerio pour parsing HTML/XML
- Fast-XML-Parser pour IDML
- Sharp pour traitement images
- Google Cloud Storage ou local storage

#### User Stories (Admin)
- US-3.1 : En tant qu'admin, je veux uploader un EPUB+IDML et obtenir automatiquement un livre fonctionnel
- US-3.2 : En tant qu'admin, je veux que les polices soient extraites et converties automatiquement
- US-3.3 : En tant qu'admin, je veux voir des logs détaillés si l'import échoue
- US-3.4 : En tant qu'admin, je veux que le wizard soit généré automatiquement depuis les images

**Documentation détaillée :** Voir [`GUIDE_EPUB_IDML.md`](GUIDE_EPUB_IDML.md)

---

### 2.4 Comptes Clients et Authentification (NOUVEAU v1.1)

#### Description
Système complet d'authentification permettant aux clients de créer un compte, se connecter, gérer leur profil et suivre leurs commandes.

#### Vision Stratégique

**Basé sur recherche e-commerce 2025-2026:**
- 19% des acheteurs abandonnent si compte obligatoire → **Guest checkout maintenu**
- 64% de conversion pour clients avec compte vs 20-30% guest → **Encourager création post-achat**
- 57% des sites n'expliquent pas les bénéfices → **Communication claire de la valeur**
- 7% ne reviennent jamais après mauvaise UX compte → **Priorité sur simplicité**

#### Parcours Client

**Scénario 1: Premier achat (Guest)**
```
Visiteur → Personnalise → Checkout SANS compte → Paiement
  ↓ (Page confirmation)
Proposition: "Créer un compte pour suivre vos commandes"
  ↓ (1 clic: définir password)
Client authentifié → Prochains achats pré-remplis
```

**Scénario 2: Inscription avant achat**
```
Visiteur → Inscription (/signup) → Client authentifié
  ↓
Personnalise → Checkout (pré-rempli) → Paiement
  ↓
Accès direct espace client
```

**Scénario 3: Client existant**
```
Client → Connexion (/login) → Checkout pré-rempli
  ↓
Historique commandes visible dans /account
```

#### Fonctionnalités Authentification

**Inscription (/signup)**
- Formulaire: email, password, prénom, nom, téléphone (optionnel)
- Validation: password min 8 caractères
- Auto-login après inscription
- Redirection vers `/account`

**Connexion (/login)**
- Formulaire: email + password
- Lien "Mot de passe oublié"
- Support query param `?redirect=/checkout` pour retour
- Messages d'erreur clairs

**Mot de passe oublié (/forgot-password)**
- Formulaire avec email uniquement
- Génération token sécurisé (32 bytes, expiration 1h)
- Email avec lien (TODO: intégration email)
- Message générique (sécurité: ne révèle pas si email existe)

**Réinitialisation (/reset-password?token=xxx)**
- Formulaire: nouveau password + confirmation
- Validation token serveur
- Auto-login après reset

**Création post-achat (Best Practice)**
- Formulaire sur CheckoutSuccessPage
- Email déjà connu (du checkout)
- Juste demander password
- Messages: "Suivez vos commandes", "Checkout plus rapide"
- Bouton "Non merci" pour ignorer

#### Espace Client (/account)

**Dashboard Principal**
- Carte résumé profil avec avatar initiales
- Carte commandes avec compteur
- Dernières commandes (5 récentes)
- Bouton déconnexion

**Profil (/account/profile)**
- Édition: prénom, nom, téléphone
- Email non modifiable (affiché, grisé)
- Section future: changement email
- Section future: changement password

**Mes Commandes (/account/orders)**
- Liste complète des commandes
- Tri par date (plus récent en premier)
- Badges statut colorés:
  - En attente (gris)
  - En préparation (orange)
  - Expédié (bleu)
  - Livré (vert)
  - Annulé (rouge)
- Clic → Détail commande

**Détail Commande (/account/orders/:id)**
- Numéro commande, date, statut
- Liste articles avec miniatures
- Adresse de livraison utilisée
- Numéro de suivi si disponible
- Statut paiement
- Total payé

#### Intégration Checkout

**Comportement si connecté:**
- Formulaire pré-rempli avec données profil
- Message "Connecté en tant que email@example.com"
- Commande automatiquement liée au compte
- Pas de proposition création post-achat

**Comportement si guest:**
- Formulaire vide
- Lien "Déjà un compte ? Se connecter"
- Après paiement → Proposition création compte
- Commande liée si compte créé

#### Exigences Techniques

**Backend:**
- Passport.js avec LocalStrategy (email/password)
- Sessions PostgreSQL (connect-pg-simple)
- bcrypt pour hash passwords (10 rounds)
- Rate limiting sur routes auth (strictLimiter)
- Middleware requireAuth pour routes protégées
- Password exclus de tous les API responses

**Frontend:**
- AuthContext global (React Context)
- ProtectedRoute component
- Intégration seamless avec checkout existant
- Toast notifications (sonner)

**Sécurité:**
- Cookie httpOnly + sameSite: lax
- Session 30 jours
- Token reset 1h expiration
- Validation Zod côté serveur
- Messages génériques (ne révèle pas existence email)

#### User Stories

- US-4.1: En tant que client, je veux créer un compte après mon achat pour suivre ma commande sans friction
- US-4.2: En tant que client, je veux me connecter pour que mes informations soient pré-remplies au checkout
- US-4.3: En tant que client, je veux voir l'historique de toutes mes commandes dans un espace dédié
- US-4.4: En tant que client, je veux réinitialiser mon mot de passe si je l'oublie
- US-4.5: En tant que client, je veux modifier mes informations personnelles facilement
- US-4.6: En tant que visiteur, je veux pouvoir acheter sans créer de compte (guest checkout)

#### Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| Taux création compte post-achat | > 40% |
| Taux connexion au checkout | > 60% (clients existants) |
| Taux abandon checkout guest vs auth | Guest < Auth + 5% |
| Temps moyen création compte | < 30 secondes |
| Support tickets auth | < 2% des utilisateurs |

---

### 2.6 Panier et Checkout

#### Description
Visualisation interactive du livre personnalisé avant achat, adaptée desktop et mobile.

#### Mode Desktop : Flipbook

**Bibliothèque utilisée :** `flipbook-js`

**Fonctionnalités :**
- Effet page tournante réaliste
- Navigation clavier (flèches)
- Boutons prev/next
- Indicateur page actuelle
- Zoom sur double-clic
- Plein écran

**Interaction :**
- Clic sur bord droit → page suivante
- Clic sur bord gauche → page précédente
- Drag page → tourner page
- Touches flèches → navigation

#### Mode Mobile : Single Page + Swipe

**Fonctionnalités :**
- Affichage une page à la fois
- Swipe horizontal pour navigation
- Touch gestures optimisés
- Indicateur position (page 3/12)
- Labels pages : "Couverture", "Page 1", "4ème de couverture"

**Animation :**
- Slide smooth entre pages
- Feedback visuel swipe
- Désactivation pendant animation

#### Génération des Pages

**Deux modes de rendu :**

**1. Client-side (Canvas)**
- Utilisé pour preview rapide
- Module : `imageGenerator.ts`
- Technologies : HTML5 Canvas API
- Process :
  1. Crée canvas aux dimensions page
  2. Filtre images selon conditions utilisateur
  3. Dessine images avec transformations
  4. Dessine textes avec styles IDML
  5. Résout variables (nom, âge, etc.)
  6. Export en DataURL

**2. Server-side (Playwright)**
- Utilisé pour rendu final haute qualité
- Module : `routes.ts` → `/api/books/:id/render-pages`
- Technologies : Playwright + Chromium headless
- Process :
  1. Lance navigateur Chromium
  2. Crée page HTML avec tous les éléments
  3. Injecte CSS + fonts (Data URIs)
  4. Screenshot haute résolution
  5. Upload image → Object Storage
  6. Retourne URL

**Pool de Navigateurs :**
- Instance Chromium réutilisée (pas relancée à chaque fois)
- Service `BrowserPool` maintient instance active
- Optimisation mémoire et performance

#### Support Variables Conditionnelles

**Images conditionnelles :**
```json
{
  "id": "img-hero",
  "url": "page1_hero-father.png",
  "conditions": [
    { "variantId": "hero", "optionId": "father" }
  ]
}
```
→ Affichée uniquement si utilisateur a sélectionné "father"

**Textes conditionnels :**
```json
{
  "id": "text-greeting",
  "content": "Bonjour {{nom_enfant}}, aujourd'hui tu as {{age}} ans !",
  "variables": ["nom_enfant", "age"]
}
```
→ Variables remplacées dynamiquement

#### Exigences techniques
- Canvas API pour rendu client
- Playwright pour rendu serveur
- Object Storage pour images générées
- Fonts en Data URI pour rendu exact
- Responsive design mobile/desktop

#### User Stories
- US-4.1 : En tant qu'utilisateur desktop, je veux feuilleter le livre avec un effet réaliste
- US-4.2 : En tant qu'utilisateur mobile, je veux naviguer par swipe entre les pages
- US-4.3 : En tant qu'utilisateur, je veux voir mon prénom et mon avatar sur chaque page
- US-4.4 : En tant qu'utilisateur, je veux voir uniquement les images correspondant à mes choix

---

### 2.7 Administration

#### Description
Interface complète d'administration pour gérer la plateforme.

#### Dashboard

**Métriques affichées :**
- Ventes du jour/semaine/mois
- Commandes en attente
- Revenus totaux
- Graphiques tendances
- Top livres vendus
- Taux de conversion
- Clients actifs

**Widgets :**
- Commandes récentes
- Alertes (stock, erreurs)
- Statistiques temps réel
- Quick actions

#### Gestion Livres

**CRUD Complet :**
- Liste tous les livres avec filtres
- Création nouveau livre
- Édition : nom, description, prix, catégorie, etc.
- Upload cover image
- Modification wizardConfig (interface visuelle)
- Modification contentConfig
- Activation/désactivation
- Suppression (soft delete)

**Import Storyboard :**
- Interface upload EPUB + IDML + fonts
- Vérification pré-import
- Barre progression
- Logs temps réel
- Gestion erreurs détaillées
- Preview résultat

#### Gestion Commandes

**Liste Commandes :**
- Filtres : statut, date, client
- Recherche par ID/email
- Tri par colonne
- Export CSV/Excel
- Actions batch

**Détail Commande :**
- Informations client
- Items commandés avec preview
- Adresse livraison
- Statut paiement Stripe
- Historique statuts
- Notes internes
- Actions : marquer expédiée, annuler, rembourser

**Export Impression :**
- Génération PDF haute qualité
- Téléchargement fichiers sources
- Envoi automatique imprimeur
- Historique exports

#### Gestion Clients

**Liste Clients :**
- Informations contact
- Historique commandes
- Total dépensé
- Date inscription
- Recherche/filtres

**Détail Client :**
- Profil complet
- Commandes associées
- Adresses sauvegardées
- Notes admin

#### Configuration Expédition

**Zones d'Expédition :**
- Création zones géographiques
- Sélection pays par zone
- Configuration tarifs par zone
- Méthodes livraison (Standard, Express)
- Délais estimés

**Imprimeurs :**
- Liste imprimeurs partenaires
- Coordonnées
- Zones desservies
- Tarifs négociés
- API endpoints (si intégration)

#### Configuration Site

**Menus :**
- Gestion header/footer
- Items avec liens
- Sous-menus
- Réorganisation drag & drop
- Activation/désactivation

**Paramètres :**
- Nom site
- Logo
- Couleurs thème
- Emails notifications
- Politiques (CGV, confidentialité)
- Intégrations (Google Analytics, etc.)

#### Object Storage

**Interface Upload :**
- Upload fichiers/dossiers
- Visualisation arborescence
- Gestion permissions
- Génération URLs publiques
- Statistiques usage

#### Exigences techniques
- React Table pour listes
- Recharts pour graphiques
- Formulaires avec react-hook-form
- Validation Zod
- Authentication Passport
- RBAC (admin, editor, viewer)

#### User Stories (Admin)
- US-6.1 : En tant qu'admin, je veux voir les ventes du jour sur le dashboard
- US-6.2 : En tant qu'admin, je veux importer un nouveau livre depuis InDesign
- US-6.3 : En tant qu'admin, je veux marquer une commande comme expédiée
- US-6.4 : En tant qu'admin, je veux configurer les zones d'expédition
- US-6.5 : En tant qu'admin, je veux exporter les commandes pour l'imprimeur

---

## 3. Exigences Non-Fonctionnelles

### 3.1 Performance

**Temps de Réponse :**
- Page d'accueil : < 1s (First Contentful Paint)
- API REST : < 200ms (moyenne)
- Rendu page Canvas : < 500ms par page
- Rendu page Playwright : < 2s par page
- Import EPUB/IDML : < 30s (livre standard 24 pages)

**Optimisations :**
- Compression gzip responses
- Lazy loading images
- Code splitting React
- Cache headers appropriés
- TanStack Query pour cache API
- Object pooling (Playwright)

### 3.2 Scalabilité

**Cibles :**
- 1000 utilisateurs concurrents
- 10 000 requêtes/minute
- 1M+ livres vendus
- 100 000+ livres en catalogue
- 10 To+ assets stockés

**Stratégie :**
- Horizontal scaling (ajout serveurs)
- CDN pour assets statiques
- Database connection pooling
- Job queue pour tâches lourdes (future)
- Caching Redis (future)

### 3.3 Sécurité

**Authentification :**
- Passport.js avec stratégie local
- Sessions sécurisées (express-session)
- Hash passwords (bcrypt)
- HTTPS obligatoire production

**Rate Limiting :**
- API générale : 100 req/15min
- Upload : 10 req/15min
- Render : 50 req/15min
- Strict : 20 req/15min

**Validation :**
- Zod pour toutes les entrées
- Sanitization HTML
- Path traversal protection
- CSRF tokens (future)

**Paiements :**
- Stripe PCI-compliant
- Webhooks signature verification
- Pas de stockage numéros CB

### 3.4 Disponibilité

**Objectifs :**
- Uptime : 99.9% (< 9h downtime/an)
- RTO (Recovery Time) : < 1h
- RPO (Recovery Point) : < 5min

**Monitoring :**
- Health checks : `/health`, `/health/ready`, `/health/live`
- Logs structurés (Pino)
- Alertes erreurs critiques
- Métriques performance

**Backup :**
- Database backup quotidien
- Assets backup (Object Storage)
- Configuration versionnée (Git)

### 3.5 Accessibilité

**Standards :**
- WCAG 2.1 niveau AA (objectif)
- Navigation clavier complète
- Screen readers support
- Contraste couleurs approprié
- Textes alternatifs images

**Responsive :**
- Mobile first design
- Breakpoints : 640px, 768px, 1024px, 1280px
- Touch targets > 44x44px
- Polices scalables

### 3.6 Compatibilité

**Navigateurs :**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari iOS 14+
- Chrome Android 90+

**Systèmes :**
- macOS 10.15+
- Windows 10+
- Linux (Ubuntu 20.04+)
- iOS 14+
- Android 10+

### 3.7 Maintenabilité

**Code Quality :**
- TypeScript strict mode
- ESLint + Prettier
- Tests unitaires (Vitest)
- Coverage > 70%
- Documentation inline

**Architecture :**
- Séparation concerns (MVC-like)
- Modules découplés
- Interfaces bien définies
- Error handling centralisé

---

## 4. User Stories Détaillées

### 4.1 Utilisateur Final

**Découverte**
- **US-10** : En tant qu'utilisateur, je veux voir les livres bestsellers sur la page d'accueil
- **US-11** : En tant qu'utilisateur, je veux filtrer les livres par âge de l'enfant
- **US-12** : En tant qu'utilisateur, je veux voir des aperçus de pages avant de personnaliser

**Personnalisation**
- **US-20** : En tant que parent, je veux que mon enfant ressemble physiquement au héros
- **US-21** : En tant qu'utilisateur, je veux ajouter le prénom de mon enfant dans toute l'histoire
- **US-22** : En tant qu'utilisateur, je veux prévisualiser chaque page avant d'acheter
- **US-23** : En tant qu'utilisateur, je veux modifier mes choix avant d'ajouter au panier
- **US-24** : En tant qu'utilisateur mobile, je veux swiper entre les pages du livre

**Achat**
- **US-30** : En tant qu'utilisateur, je veux ajouter plusieurs livres personnalisés au panier
- **US-31** : En tant qu'utilisateur, je veux choisir entre couverture rigide ou souple
- **US-32** : En tant qu'utilisateur, je veux voir les frais de livraison avant de payer
- **US-33** : En tant qu'utilisateur, je veux payer avec Apple Pay
- **US-34** : En tant qu'utilisateur, je veux recevoir une confirmation par email avec récapitulatif

**Suivi**
- **US-40** : En tant qu'utilisateur, je veux suivre l'état de ma commande
- **US-41** : En tant qu'utilisateur, je veux recevoir une notification quand mon livre est expédié
- **US-42** : En tant qu'utilisateur, je veux voir le numéro de suivi du colis

### 4.2 Administrateur

**Gestion Contenu**
- **US-50** : En tant qu'admin, je veux importer un storyboard InDesign en < 5 clics
- **US-51** : En tant qu'admin, je veux que les polices soient automatiquement extraites
- **US-52** : En tant qu'admin, je veux prévisualiser le livre avant publication
- **US-53** : En tant qu'admin, je veux modifier les prix et descriptions facilement
- **US-54** : En tant qu'admin, je veux désactiver temporairement un livre

**Gestion Commandes**
- **US-60** : En tant qu'admin, je veux voir toutes les commandes du jour
- **US-61** : En tant qu'admin, je veux filtrer les commandes par statut
- **US-62** : En tant qu'admin, je veux marquer plusieurs commandes comme expédiées en batch
- **US-63** : En tant qu'admin, je veux exporter les commandes en PDF pour l'imprimeur
- **US-64** : En tant qu'admin, je veux rembourser une commande depuis l'interface

**Configuration**
- **US-70** : En tant qu'admin, je veux ajouter une nouvelle zone d'expédition
- **US-71** : En tant qu'admin, je veux modifier les tarifs de livraison
- **US-72** : En tant qu'admin, je veux gérer les menus du site
- **US-73** : En tant qu'admin, je veux voir les statistiques de vente sur un dashboard

### 4.3 Créateur de Contenu

**Workflow InDesign**
- **US-80** : En tant que designer, je veux créer un storyboard dans InDesign avec mes outils habituels
- **US-81** : En tant que designer, je veux utiliser des variables pour personnalisation
- **US-82** : En tant que designer, je veux que mes polices custom soient supportées
- **US-83** : En tant que designer, je veux définir les zones personnalisables via nommage fichiers

---

## 5. Contraintes et Dépendances

### 5.1 Contraintes Techniques

**Plateforme :**
- Node.js 20+ requis
- PostgreSQL 14+ requis
- Chromium pour rendu serveur
- 2GB RAM minimum
- 10GB stockage minimum

**Formats Supportés :**
- EPUB 3.0 Fixed Layout uniquement
- IDML (InDesign CS6+)
- Fonts : TTF, OTF
- Images : PNG, JPEG, WebP

**Limitations :**
- Max 100 pages par livre
- Max 50 Mo par upload
- Max 10 fonts par livre
- Max 20 variants par wizard

### 5.2 Dépendances Externes

**Services Cloud :**
- **Neon PostgreSQL** : Base de données principale
  - Connexion via `@neondatabase/serverless`
  - Requiert `DATABASE_URL`
  - Dépendance critique (bloquante)

- **Stripe** : Paiement
  - API v2024
  - Webhooks requis
  - Dépendance critique (bloquante)

- **Google Cloud Storage** (optionnel) :
  - Stockage assets
  - Alternative : stockage local
  - Dépendance non-critique

**Bibliothèques Critiques :**
- Playwright : Rendu serveur
- Drizzle ORM : Base de données
- Express : Serveur HTTP
- React : Frontend
- Vite : Build frontend

### 5.3 Contraintes Business

**Workflow Impression :**
- L'impression finale se fait HORS système
- Export manuel vers imprimeur
- Pas d'intégration API imprimeur (v1)

**Traductions :**
- Interface FR uniquement (v1)
- Support multi-langues prévu (v2)

**Paiements :**
- Stripe uniquement (v1)
- PayPal prévu (v2)

### 5.4 Contraintes Légales

**RGPD :**
- Consentement cookies
- Droit à l'oubli
- Export données personnelles
- Politique confidentialité

**E-commerce :**
- CGV complètes
- Mentions légales
- Droit de rétractation
- Garanties légales

**Propriété Intellectuelle :**
- Licence images/illustrations
- Droits auteur textes
- Licences polices

---

## 6. Hors Périmètre (v1)

Les fonctionnalités suivantes ne sont **PAS** incluses dans la version 1.0 :

### 6.1 Fonctionnalités Utilisateur
- ❌ Comptes utilisateurs avec historique
- ❌ Wishlist / favoris
- ❌ Partage social (Facebook, Twitter)
- ❌ Avis et notes clients
- ❌ Programme fidélité / points
- ❌ Codes promo utilisateur
- ❌ Multi-langue interface (seulement FR)

### 6.2 Fonctionnalités Admin
- ❌ Éditeur WYSIWYG pour pages
- ❌ A/B testing
- ❌ Marketing automation
- ❌ CRM intégré
- ❌ Intégration API imprimeur automatique

### 6.3 Technique
- ❌ Application mobile native
- ❌ Mode offline / PWA
- ❌ Exportation PDF utilisateur (seulement admin)
- ❌ Personnalisation IA/GPT
- ❌ Génération automatique illustrations

---

## 7. Roadmap

### Phase 1 : MVP (v1.0) - ✅ ACTUEL
- ✅ Catalogue livres
- ✅ Wizard personnalisation
- ✅ Import EPUB/IDML
- ✅ Flipbook preview
- ✅ Panier + Stripe
- ✅ Admin dashboard
- ✅ Gestion commandes basique

### Phase 2 : v1.1 (Q1 2026) ✅ COMPLÉTÉ
- ✅ Comptes utilisateurs avec authentification complète
- ✅ Historique commandes dans espace client
- ✅ Création de compte post-achat (best practice)
- ✅ Mot de passe oublié / réinitialisation
- ✅ Checkout intelligent avec pré-remplissage
- ✅ Profil client éditable
- 🔄 Wishlist
- 🔄 Avis clients
- 🔄 Codes promo
- 🔄 Export PDF utilisateur

### Phase 3 : v1.5 (Q2 2026)
- 📋 Email transactionnel (confirmation, reset password)
- 📋 Adresses multiples (carnet d'adresses)
- 📋 Protection routes admin (middleware requireAdmin)
- 📋 Wishlist
- 📋 Avis clients
- 📋 Codes promo

### Phase 3 : v2.0 (Q3 2026)
- 📋 Multi-langue (EN, ES, DE)
- 📋 PayPal integration
- 📋 Intégration API imprimeur
- 📋 A/B testing
- 📋 Marketing automation

### Phase 4 : v2.5 (Q4 2026)
- 📋 Application mobile
- 📋 Mode offline
- 📋 Personnalisation IA
- 📋 Marketplace créateurs

**Légende :** ✅ Terminé | 🔄 En cours | 📋 Planifié

---

## 8. Métriques de Succès

### 8.1 Métriques Produit

| Métrique | Objectif Mois 1 | Objectif Mois 6 | Objectif An 1 |
|----------|----------------|-----------------|---------------|
| Visiteurs uniques | 1 000 | 10 000 | 100 000 |
| Taux conversion | 5% | 10% | 15% |
| Livres vendus | 50 | 1 000 | 50 000 |
| Panier moyen | 35€ | 40€ | 45€ |
| Temps personnalisation | < 10min | < 7min | < 5min |
| Taux abandon panier | < 70% | < 60% | < 50% |

### 8.2 Métriques Techniques

| Métrique | Objectif |
|----------|----------|
| Uptime | > 99.5% |
| Temps réponse API | < 200ms (p95) |
| Temps rendu page | < 2s |
| Erreurs 5xx | < 0.1% |
| Coverage tests | > 70% |

### 8.3 Métriques Qualité

| Métrique | Objectif |
|----------|----------|
| Score TrustPilot | > 4.5/5 |
| Taux retour | < 2% |
| Support tickets | < 5% commandes |
| Délai livraison | < 7 jours |

---

## 9. Risques et Mitigation

### 9.1 Risques Techniques

**Risque : Performance rendu serveur**
- Impact : Élevé
- Probabilité : Moyenne
- Mitigation : Pool navigateurs, cache résultats, queue jobs

**Risque : Corruption polices IDML**
- Impact : Élevé
- Probabilité : Faible
- Mitigation : Validation pré-import, fonts système fallback, logs détaillés

**Risque : Scalabilité base données**
- Impact : Élevé
- Probabilité : Moyenne
- Mitigation : Indexes optimisés, connection pooling, read replicas (future)

### 9.2 Risques Business

**Risque : Coût impression trop élevé**
- Impact : Critique
- Probabilité : Faible
- Mitigation : Négociation imprimeurs, volume pricing

**Risque : Fraude paiement**
- Impact : Moyen
- Probabilité : Faible
- Mitigation : Stripe Radar, monitoring anomalies

**Risque : Saturation marché**
- Impact : Élevé
- Probabilité : Moyenne
- Mitigation : Différenciation produit, innovation continue

### 9.3 Risques Légaux

**Risque : Non-conformité RGPD**
- Impact : Critique
- Probabilité : Faible
- Mitigation : Audit légal, DPO, formation équipe

**Risque : Litiges CGV**
- Impact : Moyen
- Probabilité : Faible
- Mitigation : CGV validées avocat, assurance responsabilité

---

## 10. Support et Documentation

### 10.1 Documentation Technique

- **[README.md](README.md)** : Vue d'ensemble projet
- **[ARCHITECTURE.md](ARCHITECTURE.md)** : Architecture technique
- **[GUIDE_EPUB_IDML.md](GUIDE_EPUB_IDML.md)** : Guide import storyboards
- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** : Diagrammes visuels
- **Inline comments** : Dans le code source

### 10.2 Documentation Utilisateur

- **FAQ** : Questions fréquentes
- **Guide personnalisation** : Tutoriel étape par étape
- **Vidéos démo** : Captures écran workflow
- **CGV** : Conditions générales vente

### 10.3 Support

- **Email** : support@nuagebook.com
- **Chat** : Widget sur site (future)
- **SLA** : 24h jours ouvrés

---

## 11. Glossaire

| Terme | Définition |
|-------|-----------|
| **Wizard** | Interface guidée multi-étapes pour personnalisation |
| **wizardConfig** | Configuration JSON définissant la structure du wizard |
| **contentConfig** | Configuration JSON contenant pages, images, textes du livre |
| **EPUB** | Format livre électronique (conteneurs + positions) |
| **IDML** | Format InDesign (texte + styles complets) |
| **Flipbook** | Livre interactif avec effet page tournante |
| **Canvas** | API HTML5 pour dessin 2D (rendu client) |
| **Playwright** | Framework automatisation navigateur (rendu serveur) |
| **Object Storage** | Stockage fichiers (images, fonts, assets) |
| **Rate Limiting** | Limitation nombre requêtes par IP |
| **Webhook** | Callback HTTP automatique (Stripe → serveur) |

---

## Annexes

### A. Références

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Playwright Documentation](https://playwright.dev/)
- [InDesign Scripting Guide](https://www.adobe.com/devnet/indesign.html)
- [EPUB 3.0 Specification](https://www.w3.org/TR/epub-33/)

### B. Contact

**Product Owner :** À définir  
**Tech Lead :** À définir  
**Designer :** À définir

---

**Document Version :** 1.0  
**Dernière mise à jour :** Janvier 2026  
**Auteur :** Équipe NuageBook
