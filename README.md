# NuageBook - Plateforme de Livres Personnalisés

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

NuageBook est une plateforme e-commerce full-stack permettant de créer, personnaliser et vendre des livres personnalisés pour enfants. Le système s'appuie sur l'import de templates EPUB/IDML depuis Adobe InDesign, offre un wizard de personnalisation interactif, et intègre un système complet de paiement Stripe.

## 🎯 Fonctionnalités Principales

- **📚 Catalogue Livres** - Navigation par catégories avec filtrage avancé
- **🎨 Wizard Personnalisation** - Interface multi-étapes généré dynamiquement
- **👤 Personnalisation Avatar** - Genre, teint, cheveux, yeux, tenues
- **📖 Preview Flipbook** - Visualisation interactive avec effet page tournante
- **🛒 Panier & Checkout** - Intégration Stripe complète avec guest checkout
- **🔐 Comptes Clients** - Authentification complète, espace client, historique commandes
- **📦 Import EPUB/IDML** - Transformation templates InDesign → livres personnalisables
- **🎯 Génération Automatique** - Wizard créé depuis noms fichiers images
- **👨‍💼 Admin Dashboard** - Gestion complète livres, commandes, clients

## 📚 Documentation

**🗂️ INDEX COMPLET:** Voir **[DOCS_INDEX.md](DOCS_INDEX.md)** pour naviguer dans toute la documentation

### Documentation Produit
- **[PRD.md](PRD.md)** - Product Requirements Document complet
  - Vision et objectifs business
  - Fonctionnalités détaillées avec user stories
  - Roadmap et métriques de succès
  - Exigences non-fonctionnelles

### Documentation Technique
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique complète
  - Stack technique détaillé avec versions
  - Flux métier étape par étape
  - Sécurité et performance
  - State management

- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Diagrammes visuels
  - Architecture globale Mermaid
  - Flux import EPUB/IDML
  - Flux personnalisation utilisateur
  - Modèle de données ERD

### Guides Spécialisés

- **[AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)** - Système d'authentification ⭐ NOUVEAU
  - Comptes clients et sessions
  - Meilleures pratiques e-commerce
  - Guide de test complet
  - Routes API et sécurité

- **[QUICKSTART_AUTH.md](QUICKSTART_AUTH.md)** - Guide démarrage rapide auth ⭐ NOUVEAU
  - Setup en 5 minutes
  - Patterns de code
  - Debugging

- **[CHANGELOG_AUTH_v1.1.md](CHANGELOG_AUTH_v1.1.md)** - Changelog v1.1 ⭐ NOUVEAU
  - Détails implémentation
  - Fichiers modifiés
  - Flux utilisateur

- **[GUIDE_EPUB_IDML.md](GUIDE_EPUB_IDML.md)** - Guide import storyboards
  - Règle d'or : EPUB = positions, IDML = texte + styles
  - Architecture fusion détaillée
  - Guide des polices
  - FAQ et débogage

- **[RULES.md](RULES.md)** - Règles du projet
  - Processus de confirmation modifications
  - Standards de code

## 🚀 Quick Start

### Prérequis

- Node.js 24+
- PostgreSQL 14+ (ou Railway)
- Chromium (pour rendu serveur)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-org/nuagebook.git
cd nuagebook

# Installer les dépendances
npm install

# Configuration environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Migrations base de données
npm run db:push
```

### Développement

```bash
npm run dev
```

Le serveur démarre sur http://localhost:5000 (API + client Vite en dev).

### Déploiement en production

```bash
# 1. Vérifier que le build passe AVANT de pousser
npm run predeploy

# 2. Pousser — Railway rebuild via Dockerfile automatiquement
git push
```

Le Dockerfile inclut un **HEALTHCHECK** qui vérifie `/health/live` toutes les 30s.

### Build manuel (sans deploy)

```bash
npm run build     # Build client + serveur
npm start         # Démarrer en mode production
```

## 🏗️ Architecture

### Vue d'ensemble

```
Frontend (React + Vite) ←→ Backend (Express) ←→ PostgreSQL (Neon)
        ↓                           ↓
   TanStack Query           Stripe + Object Storage
```

**Détails :** Voir [ARCHITECTURE.md](ARCHITECTURE.md) et [diagrammes complets](ARCHITECTURE_DIAGRAMS.md#1-architecture-globale)

## 🎨 Règle de modification

**IMPORTANT : Confirmation obligatoire avant toute modification**

Avant d'effecter toute modification sur ce projet, une confirmation explicite doit être demandée et obtenue. Cette règle s'applique à :

- ✅ Toutes les modifications de code source
- ✅ Les changements de configuration (fichiers .config.*, package.json, etc.)
- ✅ Les ajouts ou suppressions de fichiers/dossiers
- ✅ Les modifications de dépendances (npm install, package updates)
- ✅ Les changements de base de données ou schémas
- ✅ Toute autre action qui modifie l'état du projet

**Exception :** Les opérations de lecture seule (consultation de fichiers, recherche, analyse) ne nécessitent pas de confirmation.

Pour plus de détails, consultez le fichier [RULES.md](RULES.md).

### Structure du Projet

```
/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── apps/           # PublicApp, AdminApp
│   │   ├── components/     # Composants UI
│   │   ├── context/        # Context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Pages routing
│   │   └── utils/          # Utilitaires
│   └── index.html
│
├── server/                 # Backend Express
│   ├── config/             # Configuration env
│   ├── middleware/         # Validation, rate-limit, errors
│   ├── routes/             # Routes modulaires
│   ├── utils/              # Utilitaires serveur
│   ├── services/
│   │   └── object_storage/ # Import EPUB/IDML
│   └── index.ts
│
├── shared/                 # Code partagé
│   └── schema.ts           # Schémas Drizzle + Zod
│
├── PRD.md                  # Product Requirements
├── ARCHITECTURE.md         # Architecture technique
├── ARCHITECTURE_DIAGRAMS.md # Diagrammes visuels
└── GUIDE_EPUB_IDML.md     # Guide import
```

## 💡 Concepts Clés

### Import EPUB/IDML

**Règle d'or :**
```
EPUB = Images + Conteneurs vides + Positions (OÙ mettre les choses)
IDML = Texte + Mise en forme complète (QUOI mettre et COMMENT)
```

**⚠️ Point clé** : L'EPUB contient uniquement des **conteneurs vides** avec positions. Tout le texte et la mise en forme proviennent de l'IDML.

**Documentation complète :** [GUIDE_EPUB_IDML.md](GUIDE_EPUB_IDML.md)

**Diagramme flux import :** [Flux Import EPUB/IDML](ARCHITECTURE_DIAGRAMS.md#2-flux-import-epubidml)

### Wizard Dynamique

Le wizard de personnalisation est **généré automatiquement** depuis les noms de fichiers d'images :

```
page1_hero-father_skin-light_hair-brown.png
  ↓
Génère automatiquement :
- Onglet "Héros"
- Variant "hero" : father, mother, child...
- Variant "skin" : light, medium, dark
- Variant "hair" : brown, blond, black...
```

### Rendu Pages

**Deux modes :**

- **Client-side (Canvas)** : Preview rapide (~500ms/page)
- **Server-side (Playwright)** : Haute qualité (~2s/page)

**Diagramme détaillé :** [Flux Rendu Pages](ARCHITECTURE_DIAGRAMS.md#9-flux-rendu-pages)

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Mode watch
npm test -- --watch

# Avec couverture
npm run test:coverage

# Interface UI
npm run test:ui
```

## 📦 Scripts Disponibles

```bash
# Développement
npm run dev              # Serveur + client Vite (port 5000)

# Build & Deploy
npm run predeploy        # Vérification pré-déploiement (build client + serveur)
npm run build            # Build complet
npm run check            # Type checking TypeScript

# Base de données
npm run db:push          # Sync schema → DB

# Tests
npm test                 # Run tests
npm run test:coverage    # Tests avec coverage

# Production
npm start                # Démarrer production (après build)
```

## 🔐 Variables d'Environnement

Copier `.env.example` et adapter :

```bash
cp .env.example .env
```

Variables principales :

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Oui | URL PostgreSQL (Railway en prod) |
| `SESSION_SECRET` | Oui | Secret de session (32+ caractères) |
| `PORT` | Non | Port serveur (défaut: 5000) |
| `STRIPE_SECRET_KEY` | Non (dev) | Clé Stripe |
| `R2_*` | Non (dev) | Cloudflare R2 pour le stockage |

**⚠️ Important :** En local, `.env` pointe vers la DB de dev. Les variables de production sont configurées directement dans Railway (Dashboard → Variables).

**Validation :** Toutes les variables sont validées au démarrage via Zod. Voir [`server/config/env.ts`](server/config/env.ts)

## 🛠️ Stack Technique

### Backend
- **Runtime** : Node.js 24+ avec TypeScript 5.6
- **Framework** : Express.js 4.21
- **Database** : PostgreSQL (Neon) avec Drizzle ORM
- **Validation** : Zod 3.25
- **Logging** : Pino 8.21
- **Paiements** : Stripe 20.0
- **Rendu** : Playwright 1.40

### Frontend
- **Framework** : React 19.2
- **Build** : Vite 7.1
- **Routing** : Wouter 3.3
- **State** : TanStack Query 5.60 + Context API
- **UI** : Radix UI + Tailwind CSS 4.1
- **Formulaires** : react-hook-form 7.66 + Zod

**Détails complets :** [ARCHITECTURE.md - Stack Technique](ARCHITECTURE.md#stack-technique)

## 🚦 Endpoints API Principaux

### Public
- `GET /api/books` - Liste livres
- `GET /api/books/:id` - Détail livre
- `POST /api/checkout/create-session` - Créer session Stripe
- `POST /api/checkout/verify-payment` - Vérifier paiement

### Authentification Client
- `POST /api/auth/signup` - Inscription client
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Session actuelle
- `POST /api/auth/set-password` - Définir password (post-achat)
- `POST /api/auth/forgot-password` - Demander reset password
- `POST /api/auth/reset-password` - Reset avec token

### Espace Client (protégé)
- `GET /api/customers/me` - Profil du client connecté
- `PATCH /api/customers/me` - Mettre à jour profil
- `GET /api/orders/my-orders` - Commandes du client

### Admin
- `POST /api/books` - Créer livre
- `PATCH /api/books/:id` - Modifier livre
- `POST /api/books/import-storyboard` - Import EPUB/IDML
- `POST /api/books/:id/render-pages` - Rendu serveur
- `GET /api/orders` - Liste commandes
- `GET /api/customers` - Liste clients

### Health
- `GET /health` - Status complet
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:5000/health
```

### Logs Structurés
Les logs sont en JSON (production) ou pretty (dev) :
```
[2026-01-21 10:30:00] INFO: Book created (bookId: "123")
[2026-01-21 10:30:05] ERROR: Import failed (error: "Font missing")
```

## 🚀 Workflow de déploiement

```
1. npm run predeploy        ← Le build passe ? OK, continue
2. git add . && git commit  ← Commit tes changements
3. git push                 ← Railway rebuild via Dockerfile
4. Railway: /health/live    ← HEALTHCHECK auto toutes les 30s
```

**Points clés :**
- Le Dockerfile utilise **Node 24** (aligné avec le dev local)
- Le HEALTHCHECK Docker vérifie `/health/live` (3 retries avant unhealthy)
- Les variables de prod sont dans **Railway Dashboard**, pas dans le repo

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. **Lancer `npm run predeploy`** pour vérifier le build
4. Commit (`git commit -m "Add amazing feature"`)
5. Push (`git push origin feature/amazing`)
6. Ouvrir une Pull Request

**Important :** Respecter les règles de [RULES.md](RULES.md)

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

---

## 📖 Documentation Complète

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Vision produit, fonctionnalités, user stories |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture technique complète |
| [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) | Diagrammes visuels Mermaid |
| [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md) | Système d'authentification client (Nouveau) |
| [GUIDE_EPUB_IDML.md](GUIDE_EPUB_IDML.md) | Guide import storyboards InDesign |
| [RULES.md](RULES.md) | Règles du projet |

---

**Version :** 1.1.0  
**Dernière mise à jour :** 19 Février 2026  
**Status :** 🟢 Production Ready

**🎉 Nouveautés v1.1 - [Release Notes](RELEASE_NOTES_v1.1.md):**
- ✅ Système complet d'authentification client (Passport.js + bcrypt)
- ✅ Espace client avec historique commandes (4 pages)
- ✅ Création de compte post-achat (best practice e-commerce 2025)
- ✅ Mot de passe oublié / réinitialisation sécurisée
- ✅ Checkout intelligent avec pré-remplissage automatique
- ✅ Sessions PostgreSQL (30 jours, httpOnly cookies)
- ✅ 8 nouveaux documents de référence (2,660 lignes)

**📚 Documentation Auth:** Voir [DOCS_INDEX.md](DOCS_INDEX.md) section "Authentification"
