---
name: Amélioration complète codebase
overview: Plan d'amélioration exhaustif couvrant la qualité du code, la performance, la sécurité, l'architecture et la robustesse de l'application de livres personnalisés EPUB/IDML.
todos:
  - id: type-safety
    content: Éliminer tous les 'as any' et typer strictement les configurations JSON (wizardConfig, contentConfig)
    status: completed
  - id: logging
    content: Remplacer console.* par un système de logging structuré (pino) dans toute l'application
    status: completed
  - id: error-handling
    content: Créer des classes d'erreurs personnalisées et un middleware centralisé de gestion d'erreurs
    status: completed
  - id: env-validation
    content: Valider toutes les variables d'environnement avec Zod au démarrage
    status: completed
  - id: split-routes
    content: Découper routes.ts (1250 lignes) en modules séparés par domaine (books, orders, checkout, etc.)
    status: completed
  - id: services-layer
    content: Extraire la logique métier en services dédiés (BookService, PageRendererService, etc.)
    status: completed
  - id: security
    content: Ajouter rate limiting, validation centralisée et sanitisation des chemins
    status: completed
  - id: performance
    content: Implémenter cache Redis et paralléliser le rendu des pages
    status: completed
  - id: tests
    content: Configurer Vitest et créer tests unitaires pour services + tests d'intégration pour API
    status: completed
  - id: documentation
    content: Ajouter JSDoc partout et générer documentation API avec Swagger
    status: completed
  - id: ci-cd
    content: Mettre en place GitHub Actions pour tests automatiques et pre-commit hooks
    status: completed
  - id: monitoring
    content: Ajouter health check endpoint et métriques Prometheus
    status: completed
---

# Plan d'amélioration complète de la codebase

## Analyse de la situation actuelle

Votre application est une plateforme e-commerce full-stack pour des livres personnalisés avec traitement EPUB/IDML. Analyse quantitative :

- **11 233 usages de `any`** dans 921 fichiers → Faible type safety
- **1 306 console.log/error/warn** dans 97 fichiers → Logging non structuré  
- **365 try/catch** dans 82 fichiers → Gestion d'erreurs à vérifier
- **Fichier routes.ts de 1 250 lignes** → Architecture monolithique
- **Aucun test** visible → Pas de couverture de tests

## 1. Type Safety et TypeScript

### Problèmes identifiés

Le fichier [`server/storage.ts`](server/storage.ts) utilise `as any` aux lignes 121, 126, 179, 183, etc. :

```typescript
// ❌ Mauvais
const result = await db.insert(books).values(book as any).returning();
```

Utilisation généralisée de `any` dans :

- [`server/routes.ts`](server/routes.ts) (ligne 188, 230, etc.) 
- [`server/replit_integrations/object_storage/idmlParser.ts`](server/replit_integrations/object_storage/idmlParser.ts) (ligne 54, etc.)
- [`client/src/components/Wizard.tsx`](client/src/components/Wizard.tsx)

### Améliorations recommandées

**1.1. Éliminer tous les `as any`**

Remplacer par des types stricts dans [`server/storage.ts`](server/storage.ts) :

```typescript
// ✅ Bon - Utiliser les types inférés de Drizzle
async createBook(book: InsertBook): Promise<Book> {
  const result = await db.insert(books).values({
    id: book.id,
    name: book.name,
    description: book.description,
    price: book.price,
    coverImage: book.coverImage,
    theme: book.theme,
    category: book.category,
    // Expliciter tous les champs
    wizardConfig: book.wizardConfig,
    contentConfig: book.contentConfig,
  }).returning();
  return result[0];
}
```

**1.2. Typer les configurations JSON**

Dans [`shared/schema.ts`](shared/schema.ts), créer des types stricts pour `wizardConfig` et `contentConfig` :

```typescript
// Définir les types précis au lieu de jsonb générique
export const wizardConfigSchema = z.object({
  tabs: z.array(z.object({
    id: z.string(),
    title: z.string(),
    variants: z.array(z.object({
      id: z.string(),
      label: z.string(),
      options: z.array(z.object({
        id: z.string(),
        label: z.string(),
        imageUrl: z.string().optional(),
      }))
    }))
  }))
});

export type WizardConfig = z.infer<typeof wizardConfigSchema>;
```

**1.3. Activer TypeScript strict dans tsconfig**

Le [`tsconfig.json`](tsconfig.json) a déjà `strict: true`, mais ajouter :

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 2. Architecture et organisation du code

### Problèmes identifiés

**Fichier monolithique** : [`server/routes.ts`](server/routes.ts) contient 1 250 lignes avec toutes les routes (books, customers, orders, checkout, etc.)

**Logique métier dans les routes** : Traitement EPUB/IDML (lignes 181-723) directement dans le fichier routes

### Améliorations recommandées

**2.1. Découper les routes en modules**

```
server/
  routes/
    index.ts           # Registre principal
    books.routes.ts    # Routes /api/books
    customers.routes.ts
    orders.routes.ts
    checkout.routes.ts
    menus.routes.ts
    printers.routes.ts
    shipping.routes.ts
```

**2.2. Extraire la logique métier en services**

Créer des services dédiés :

```
server/
  services/
    book.service.ts           # CRUD books
    page-renderer.service.ts  # Rendu des pages (lignes 181-723 de routes.ts)
    font.service.ts           # Gestion des polices
    image.service.ts          # Traitement images
```

**2.3. Implémenter le pattern Repository**

Séparer la logique d'accès aux données :

```typescript
// server/repositories/book.repository.ts
export class BookRepository {
  async findAll(): Promise<Book[]> { /* ... */ }
  async findById(id: string): Promise<Book | null> { /* ... */ }
  async create(data: InsertBook): Promise<Book> { /* ... */ }
  async update(id: string, data: Partial<InsertBook>): Promise<Book | null> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
}
```

## 3. Gestion des erreurs et logging

### Problèmes identifiés

**Logging inconsistant** : Mélange de `console.log`, `console.error`, `console.warn` partout

Dans [`server/index.ts`](server/index.ts) :

```typescript
// Ligne 149
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err; // ⚠️ throw après avoir envoyé la réponse !
});
```

### Améliorations recommandées

**3.1. Système de logging structuré**

Remplacer tous les `console.*` par un logger professionnel :

```typescript
// server/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Usage
logger.info({ bookId }, 'Book created successfully');
logger.error({ err, bookId }, 'Failed to create book');
```

**3.2. Classes d'erreurs personnalisées**

```typescript
// server/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} with id ${id} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}
```

**3.3. Middleware de gestion d'erreurs centralisé**

```typescript
// server/middleware/error-handler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path }, err.message);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Erreur non prévue
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
};
```

## 4. Sécurité

### Problèmes identifiés

**Validation Path Traversal** : Le code de [`server/routes.ts`](server/routes.ts) (lignes 112-132) vérifie les path traversal, mais pourrait être amélioré

**Aucune limitation de taux** : Pas de rate limiting visible

**Secrets en dur** : Vérifier que tous les secrets utilisent `process.env`

### Améliorations recommandées

**4.1. Validation centralisée des entrées**

```typescript
// server/middleware/validation.ts
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: err.errors
        });
      }
      next(err);
    }
  };
};

// Usage dans les routes
router.post('/books', validate(insertBookSchema), createBook);
```

**4.2. Rate limiting**

```typescript
// server/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite par IP
  message: 'Too many requests from this IP'
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // max 10 uploads/heure
});
```

**4.3. Sanitisation des chemins**

```typescript
// server/utils/path-validator.ts
import path from 'path';

export function validatePath(userPath: string, basePath: string): string {
  const normalizedPath = path.normalize(userPath);
  
  // Interdire les séquences dangereuses
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new ValidationError('Invalid path');
  }
  
  const fullPath = path.resolve(basePath, normalizedPath);
  
  // Vérifier que le chemin final est bien dans le dossier de base
  if (!fullPath.startsWith(basePath)) {
    throw new ValidationError('Path traversal detected');
  }
  
  return fullPath;
}
```

**4.4. Variables d'environnement validées**

```typescript
// server/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  REPLIT_DOMAINS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

## 5. Performance

### Problèmes identifiés

**Pas de cache** : Aucune mise en cache visible pour les requêtes fréquentes

**Requêtes N+1 potentielles** : Dans [`client/src/context/BooksContext.tsx`](client/src/context/BooksContext.tsx), initialisation avec boucle (lignes 33-39)

**Rendu de pages synchrone** : Dans [`server/routes.ts`](server/routes.ts), boucle `for` synchrone (ligne 411) pour le rendu des pages

### Améliorations recommandées

**5.1. Cache Redis pour les livres**

```typescript
// server/services/cache.service.ts
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export class CacheService {
  private readonly TTL = 3600; // 1 heure

  async getBook(id: string): Promise<Book | null> {
    const cached = await redis.get(`book:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setBook(book: Book): Promise<void> {
    await redis.setEx(`book:${book.id}`, this.TTL, JSON.stringify(book));
  }

  async invalidateBook(id: string): Promise<void> {
    await redis.del(`book:${id}`);
  }
}
```

**5.2. Paralléliser le rendu des pages**

Dans [`server/routes.ts`](server/routes.ts), remplacer la boucle `for` (ligne 411) par :

```typescript
// Rendu parallèle des pages
const renderedPages = await Promise.all(
  pages.map(async (pageData) => {
    // ... logique de rendu
  })
);
```

**5.3. Optimisation des requêtes**

Utiliser les jointures Drizzle au lieu de requêtes multiples :

```typescript
// ❌ Mauvais (N+1)
const orders = await db.select().from(orders);
const ordersWithCustomers = await Promise.all(
  orders.map(async (order) => ({
    ...order,
    customer: await db.select().from(customers).where(eq(customers.id, order.customerId))
  }))
);

// ✅ Bon
const ordersWithCustomers = await db
  .select()
  .from(orders)
  .leftJoin(customers, eq(orders.customerId, customers.id));
```

**5.4. Compression des réponses**

```typescript
// server/index.ts
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
```

## 6. Qualité du code

### Problèmes identifiés

**Code dupliqué** : Logique répétée dans plusieurs composants React

**Fonctions trop longues** : La fonction `render-pages` dans [`server/routes.ts`](server/routes.ts) fait 542 lignes (181-723)

**Commentaires obsolètes** : Nombreux commentaires TODO/FIXME (333 occurrences)

### Améliorations recommandées

**6.1. Extraire les fonctions utilitaires**

```typescript
// server/utils/page-rendering/font-loader.ts
export async function loadSystemFonts(fontNames: string[]): Promise<FontFace[]> {
  const systemFontsDir = path.join(process.env.HOME || '/home/runner', '.fonts');
  const fontFaces: string[] = [];
  
  for (const fontName of fontNames) {
    const fontFile = await findFontFile(fontName, systemFontsDir);
    if (fontFile) {
      const fontBase64 = await embedFontAsBase64(fontFile);
      fontFaces.push(createFontFace(fontName, fontBase64));
    }
  }
  
  return fontFaces;
}
```

**6.2. Hooks React personnalisés**

```typescript
// client/src/hooks/useBookMutations.ts
export function useBookMutations() {
  const queryClient = useQueryClient();
  
  const addBook = useMutation({
    mutationFn: (book: BookProduct) => api.books.create(book),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Livre ajouté');
    }
  });
  
  return { addBook, updateBook, deleteBook };
}
```

**6.3. Constantes centralisées**

```typescript
// shared/constants.ts
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const CACHE_TTL = {
  BOOKS: 3600,
  CUSTOMERS: 1800,
  ORDERS: 300,
} as const;

export const API_ROUTES = {
  BOOKS: '/api/books',
  CUSTOMERS: '/api/customers',
  // ...
} as const;
```

## 7. Tests

### Problèmes identifiés

**Aucun test** visible dans le projet

### Améliorations recommandées

**7.1. Configuration de test**

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "supertest": "^6.3.0"
  }
}
```

**7.2. Tests unitaires des services**

```typescript
// server/services/__tests__/book.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BookService } from '../book.service';

describe('BookService', () => {
  let service: BookService;
  
  beforeEach(() => {
    service = new BookService();
  });
  
  it('should create a book', async () => {
    const book = await service.create({
      id: 'test-1',
      name: 'Test Book',
      // ...
    });
    
    expect(book).toBeDefined();
    expect(book.id).toBe('test-1');
  });
});
```

**7.3. Tests d'intégration des routes**

```typescript
// server/routes/__tests__/books.routes.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

describe('Books API', () => {
  it('GET /api/books should return all books', async () => {
    const response = await request(app)
      .get('/api/books')
      .expect(200);
    
    expect(response.body).toBeInstanceOf(Array);
  });
  
  it('POST /api/books should create a book', async () => {
    const newBook = { /* ... */ };
    
    const response = await request(app)
      .post('/api/books')
      .send(newBook)
      .expect(201);
    
    expect(response.body.id).toBeDefined();
  });
});
```

**7.4. Tests de composants React**

```typescript
// client/src/components/__tests__/Wizard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wizard } from '../Wizard';

describe('Wizard', () => {
  it('should render wizard steps', () => {
    render(<Wizard onComplete={vi.fn()} onCancel={vi.fn()} />);
    
    expect(screen.getByText(/personnalisation/i)).toBeInTheDocument();
  });
});
```

## 8. Documentation

### Améliorations recommandées

**8.1. JSDoc pour toutes les fonctions publiques**

```typescript
/**
 * Crée un nouveau livre dans la base de données
 * @param book - Les données du livre à créer
 * @returns Le livre créé avec son ID généré
 * @throws {ValidationError} Si les données sont invalides
 * @throws {DatabaseError} Si la création échoue
 */
export async function createBook(book: InsertBook): Promise<Book> {
  // ...
}
```

**8.2. Documentation API avec Swagger**

```typescript
// server/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NuageBook API',
      version: '1.0.0',
    },
  },
  apis: ['./server/routes/*.ts'],
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

**8.3. README technique**

Créer `ARCHITECTURE.md` détaillant :

- Structure des dossiers
- Flux de données EPUB/IDML
- Processus de rendu des pages
- Intégration Stripe
- Déploiement

## 9. CI/CD et DevOps

### Améliorations recommandées

**9.1. GitHub Actions**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run build
```

**9.2. Pre-commit hooks**

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 10. Monitoring et observabilité

### Améliorations recommandées

**10.1. Health check endpoint**

```typescript
// server/routes/health.routes.ts
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
  };
  
  const isHealthy = health.database && health.redis;
  res.status(isHealthy ? 200 : 503).json(health);
});
```

**10.2. Métriques Prometheus**

```typescript
// server/middleware/metrics.ts
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

## Priorités d'implémentation

### Phase 1 (Critique - 2 semaines)

1. Éliminer les `any` dans les fichiers critiques (storage, routes)
2. Implémenter le système de logging structuré
3. Ajouter la validation des variables d'environnement
4. Mettre en place la gestion d'erreurs centralisée

### Phase 2 (Important - 3 semaines)  

1. Découper le fichier routes.ts en modules
2. Créer les services et repositories
3. Ajouter les tests unitaires des services
4. Implémenter le rate limiting

### Phase 3 (Améliorations - 4 semaines)

1. Optimisations performance (cache, parallélisation)
2. Tests d'intégration complets
3. Documentation API Swagger
4. CI/CD avec GitHub Actions

### Phase 4 (Maintenance continue)

1. Monitoring et métriques
2. Refactoring progressif des composants React
3. Amélioration de la couverture de tests
4. Revue de code régulière

## Métriques de succès

- **Type safety** : 0 `any` dans le code applicatif (hors dépendances)
- **Tests** : Couverture > 80%
- **Performance** : Temps de réponse API < 200ms (P95)
- **Sécurité** : 0 vulnérabilité critique (npm audit)
- **Code quality** : Note SonarQube > A
- **Logs** : 100% des erreurs tracées avec contexte