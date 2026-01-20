# Architecture Technique - NuageBook

## Vue d'ensemble

NuageBook est une plateforme e-commerce full-stack pour des livres personnalisés avec traitement EPUB/IDML.

## Stack Technique

### Backend
- **Runtime**: Node.js avec TypeScript
- **Framework**: Express.js
- **Base de données**: PostgreSQL avec Drizzle ORM
- **Validation**: Zod
- **Logging**: Pino
- **Paiements**: Stripe
- **Tests**: Vitest

### Frontend
- **Framework**: React 19
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI**: Radix UI + Tailwind CSS
- **Build**: Vite

## Structure du Projet

```
/
├── client/               # Application React
│   ├── src/
│   │   ├── components/   # Composants UI
│   │   ├── context/      # Context providers
│   │   ├── hooks/        # Custom hooks
│   │   ├── pages/        # Pages
│   │   └── utils/        # Utilitaires
│
├── server/               # Application Express
│   ├── config/           # Configuration (env)
│   ├── middleware/       # Middlewares Express
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   └── validation.ts
│   ├── routes/           # Routes modulaires
│   │   ├── books.routes.ts
│   │   ├── customers.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── checkout.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── utils/            # Utilitaires
│   │   ├── errors.ts     # Classes d'erreurs
│   │   ├── logger.ts     # Logger structuré
│   │   └── path-validator.ts
│   ├── db.ts             # Configuration DB
│   ├── storage.ts        # Couche d'accès aux données
│   └── index.ts          # Point d'entrée
│
├── shared/               # Code partagé
│   └── schema.ts         # Schémas Drizzle et Zod
│
└── .github/
    └── workflows/        # CI/CD
        └── ci.yml
```

## Principes d'Architecture

### 1. Type Safety

- **Zero `any`**: Tout le code applicatif est strictement typé
- **Validation Zod**: Toutes les entrées utilisateur sont validées
- **Types partagés**: Les types sont partagés entre client et serveur via `@shared`

### 2. Gestion d'Erreurs

Hiérarchie des erreurs personnalisées:
- `AppError`: Classe de base
- `NotFoundError`: Ressource non trouvée (404)
- `ValidationError`: Données invalides (400)
- `UnauthorizedError`: Non autorisé (401)
- `ForbiddenError`: Interdit (403)
- `DatabaseError`: Erreur DB (500)

Middleware centralisé dans `error-handler.ts` qui:
- Gère les erreurs Zod automatiquement
- Log toutes les erreurs avec contexte
- Masque les détails en production

### 3. Logging Structuré

Utilisation de Pino pour un logging structuré avec:
- Niveaux de log: debug, info, warn, error
- Contexte enrichi (userId, requestId, etc.)
- Format JSON en production
- Pretty print en développement

### 4. Sécurité

- **Rate Limiting**: 4 limiteurs différents (API, upload, strict, render)
- **Validation**: Middleware de validation centralisé
- **Path Traversal**: Protection via `path-validator`
- **Variables d'env**: Validation au démarrage avec Zod

### 5. Routes Modulaires

Les routes sont organisées par domaine métier:
- `books.routes.ts`: CRUD livres
- `customers.routes.ts`: CRUD clients
- `orders.routes.ts`: CRUD commandes
- `checkout.routes.ts`: Paiement Stripe
- `health.routes.ts`: Monitoring

Chaque module:
- Gère ses propres erreurs
- Log ses opérations
- Utilise le storage layer

### 6. Performance

- **Compression**: Compression gzip des réponses
- **Cache**: Headers de cache pour les assets
- **Rate Limiting**: Protection contre les abus

## Endpoints Principaux

### Health Check
- `GET /health` - Status complet
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### API
- `GET /api/books` - Liste des livres
- `POST /api/books/:id/render-pages` - Rendu des pages
- `POST /api/checkout/create-session` - Créer session Stripe
- `POST /api/checkout/verify-payment` - Vérifier paiement

## Base de Données

### Tables Principales
- `books`: Livres avec `wizardConfig` et `contentConfig`
- `customers`: Clients
- `orders`: Commandes avec items et statut paiement
- `shipping_zones`: Zones d'expédition
- `printers`: Imprimeurs
- `menus`: Menus du site
- `settings`: Paramètres

### Types JSON Stricts
- `WizardConfig`: Configuration du wizard de personnalisation
- `ContentConfig`: Configuration du contenu (pages, images, textes)
- `BookConfiguration`: Sélections utilisateur

## Tests

### Configuration
- **Framework**: Vitest
- **Coverage**: V8
- **Tests**: `npm test`
- **UI**: `npm run test:ui`

### Structure
```
__tests__/
├── utils/
│   └── errors.test.ts
└── routes/
    └── books.test.ts
```

## CI/CD

### GitHub Actions
- Type checking avec `tsc`
- Tests avec Vitest
- Build de production
- Upload de coverage

### Pre-commit Hooks
- Husky + lint-staged
- Type checking sur fichiers modifiés

## Monitoring

### Health Checks
- Database connectivity
- Uptime tracking
- Environment info

### Logs
- Logs structurés avec contexte
- Niveaux appropriés
- Rotation automatique (production)

## Variables d'Environnement

Toutes validées au démarrage via `server/config/env.ts`:

```typescript
NODE_ENV=development|production|test
PORT=5000
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
LOG_LEVEL=debug|info|warn|error
```

## Flux de Données EPUB/IDML

1. **Upload**: EPUB + IDML via object storage
2. **Parsing**: Extraction des textes (IDML) et positions (EPUB)
3. **Merge**: Fusion dans `contentConfig`
4. **Render**: Génération HTML avec Playwright
5. **Storage**: Images rendues dans object storage

## Déploiement

### Production
```bash
npm run build
npm start
```

### Développement
```bash
npm run dev        # Backend
npm run dev:client # Frontend (port 5000)
```

## Best Practices

1. **Toujours valider** les entrées utilisateur avec Zod
2. **Toujours logger** les erreurs avec contexte
3. **Toujours typer** avec TypeScript strict
4. **Jamais exposer** les détails d'erreur en production
5. **Toujours tester** les nouvelles fonctionnalités

## Améliorations Futures

- [ ] Cache Redis pour les livres
- [ ] Métriques Prometheus
- [ ] Documentation Swagger/OpenAPI
- [ ] Tests d'intégration E2E
- [ ] Extraction du service PageRenderer
