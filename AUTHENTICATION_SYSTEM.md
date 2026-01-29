# Système d'Authentification Client - Documentation

## Vue d'ensemble

Le système de compte client a été implémenté avec succès en suivant les meilleures pratiques e-commerce 2025-2026.

## Caractéristiques principales

### ✅ Fonctionnalités implémentées

- **Inscription classique** (`/signup`)
- **Connexion** (`/login`)
- **Déconnexion**
- **Mot de passe oublié** (`/forgot-password`)
- **Réinitialisation du mot de passe** (`/reset-password`)
- **Création de compte post-achat** (sur la page de confirmation)
- **Espace client** (`/account`) avec:
  - Dashboard principal
  - Profil client (`/account/profile`)
  - Historique des commandes (`/account/orders`)
  - Détail de commande (`/account/orders/:id`)
- **Checkout intelligent**:
  - Pré-remplissage si connecté
  - Option guest checkout (achat sans compte)
  - Lien de connexion visible

### 🔒 Sécurité

- Passwords hashés avec **bcrypt** (10 rounds)
- Sessions stockées en PostgreSQL via **connect-pg-simple**
- Authentification Passport.js (LocalStrategy)
- Rate limiting sur les routes auth (strictLimiter)
- Password jamais exposé via l'API
- Tokens de reset avec expiration (1h)
- Cookies sécurisés (httpOnly, sameSite: lax)

## Architecture

### Backend

**Nouveaux fichiers:**
- `server/config/passport.ts` - Configuration Passport.js
- `server/middleware/auth.ts` - Middleware requireAuth/optionalAuth
- `server/routes/auth.routes.ts` - Routes d'authentification
- `server/types/express.d.ts` - Types TypeScript pour req.user
- `server/scripts/clean-old-customers.ts` - Script de nettoyage

**Fichiers modifiés:**
- `shared/schema.ts` - Ajout de password, resetPasswordToken, resetPasswordExpires
- `server/storage.ts` - Exclusion password des retours, nouvelle méthode getCustomerByEmailWithPassword
- `server/config/env.ts` - Ajout SESSION_SECRET
- `server/index.ts` - Configuration session + Passport
- `server/routes/index.ts` - Enregistrement routes auth
- `server/routes/customers.routes.ts` - Routes /me protégées
- `server/routes/orders.routes.ts` - Route /my-orders protégée

### Frontend

**Nouveaux fichiers:**
- `client/src/context/AuthContext.tsx` - Gestion état authentification
- `client/src/components/ProtectedRoute.tsx` - Protection des routes
- `client/src/pages/LoginPage.tsx` - Page de connexion
- `client/src/pages/SignupPage.tsx` - Page d'inscription
- `client/src/pages/ForgotPasswordPage.tsx` - Mot de passe oublié
- `client/src/pages/ResetPasswordPage.tsx` - Réinitialisation
- `client/src/pages/AccountPage.tsx` - Dashboard client
- `client/src/pages/AccountProfilePage.tsx` - Profil
- `client/src/pages/AccountOrdersPage.tsx` - Liste commandes
- `client/src/pages/AccountOrderDetailPage.tsx` - Détail commande

**Fichiers modifiés:**
- `client/src/apps/PublicApp.tsx` - AuthProvider + nouvelles routes
- `client/src/components/Navigation.tsx` - Menu utilisateur
- `client/src/pages/CheckoutPage.tsx` - Support auth + pré-remplissage
- `client/src/pages/CheckoutSuccessPage.tsx` - Création compte post-achat

## Routes API

### Authentification

| Méthode | Route | Protection | Description |
|---------|-------|-----------|-------------|
| POST | `/api/auth/signup` | Publique | Inscription nouveau client |
| POST | `/api/auth/login` | Publique | Connexion |
| POST | `/api/auth/logout` | - | Déconnexion |
| GET | `/api/auth/me` | - | Récupérer session actuelle |
| POST | `/api/auth/set-password` | Publique | Définir password (post-achat) |
| POST | `/api/auth/forgot-password` | Publique | Demander reset |
| POST | `/api/auth/reset-password` | Publique | Reset avec token |

### Client

| Méthode | Route | Protection | Description |
|---------|-------|-----------|-------------|
| GET | `/api/customers/me` | requireAuth | Profil du client connecté |
| PATCH | `/api/customers/me` | requireAuth | Mettre à jour profil |
| GET | `/api/orders/my-orders` | requireAuth | Commandes du client |

## Migration des données

### Avant le déploiement

⚠️ **Important**: Exécuter ce script pour supprimer les anciennes données (comme demandé):

```bash
tsx server/scripts/clean-old-customers.ts
```

Ce script:
1. Supprime toutes les commandes (contrainte FK)
2. Supprime tous les clients
3. Reset les séquences

## Variables d'environnement

Ajouter dans `.env`:

```env
SESSION_SECRET=votre_secret_aleatoire_32_caracteres_minimum
```

Pour la production, générer un secret fort:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Tests manuels

### 1. Inscription
1. Aller sur `/signup`
2. Remplir le formulaire (email, password, nom, prénom)
3. Valider → Redirection vers `/account`
4. Vérifier que le user menu apparaît dans la navigation

### 2. Connexion
1. Se déconnecter
2. Aller sur `/login`
3. Entrer email et password
4. Valider → Redirection vers `/account`

### 3. Mot de passe oublié
1. Sur `/login`, cliquer "Mot de passe oublié"
2. Entrer email → Message de succès
3. **Dans la console serveur**, copier le lien de reset
4. Ouvrir le lien → Page `/reset-password?token=xxx`
5. Définir nouveau password → Redirection vers `/account`

### 4. Checkout connecté
1. Se connecter
2. Ajouter un livre au panier
3. Aller sur `/checkout`
4. Vérifier que le formulaire est pré-rempli avec les données du profil
5. Vérifier "Connecté en tant que email@example.com" en haut

### 5. Checkout invité (guest)
1. Se déconnecter
2. Ajouter un livre au panier
3. Aller sur `/checkout`
4. Remplir le formulaire → Checkout normal
5. Sur la page de confirmation → Voir le formulaire "Créer un compte"
6. Définir un password → Compte créé automatiquement

### 6. Espace client
1. Se connecter
2. `/account` → Voir le dashboard avec les dernières commandes
3. `/account/profile` → Modifier nom/téléphone
4. `/account/orders` → Voir toutes les commandes
5. Cliquer sur une commande → Voir le détail

### 7. Routes protégées
1. Se déconnecter
2. Essayer d'accéder `/account` → Redirection vers `/login?redirect=/account`
3. Se connecter → Redirection automatique vers `/account`

## Flux e-commerce optimisé

### Parcours client type

```
Visiteur
  ↓
Découvre un livre → Personnalise → Ajoute au panier
  ↓
Checkout SANS compte (guest)
  ↓
Paiement → Page de confirmation
  ↓
[Best Practice] Proposition: "Créer un compte pour suivre vos commandes"
  ↓
Définit un password en 1 clic
  ↓
Devient client authentifié
  ↓
Prochains achats: checkout pré-rempli + suivi commandes
```

### Statistiques appliquées

- ✅ **19% abandonnent** si compte obligatoire → Guest checkout maintenu
- ✅ **64% conversion** des clients avec compte → Création post-achat proposée
- ✅ **57% des sites** n'expliquent pas les bénéfices → Messages de valeur ajoutés

## Prochaines étapes (hors scope actuel)

1. **Email transactionnel**
   - Confirmation d'inscription
   - Reset password par email
   - Confirmation de commande

2. **Protection admin**
   - Middleware requireAdmin
   - Protéger `/api/customers` et `/api/orders`

3. **Adresses multiples**
   - Carnet d'adresses
   - Adresse par défaut

4. **Fonctionnalités avancées**
   - Wishlist
   - Programme de fidélité
   - Historique de navigation

## Notes techniques

### Compatibilité

- ✅ Compatible avec l'architecture existante (wouter, react-query)
- ✅ Pas de modification de `EcommerceContext` (utilisé par AdminDashboard)
- ✅ Sessions PostgreSQL (pas de Redis requis)
- ✅ Password exclus automatiquement des API responses

### Sécurité des routes

**Routes publiques** (pas d'auth):
- `/api/auth/*` - Authentification
- `/api/books` - Catalogue
- `/api/shipping-zones` - Zones de livraison
- `/api/checkout/create-session` - Checkout

**Routes protégées client** (requireAuth):
- `/api/customers/me` - Profil
- `/api/orders/my-orders` - Commandes du client

**Routes admin** (⚠️ à protéger ultérieurement):
- `/api/customers` - Liste tous les clients
- `/api/orders` - Liste toutes les commandes

## Support

Le serveur démarre correctement avec le message:
```
[INFO]: Session and authentication middleware configured
```

Tous les tests TypeScript passent (warnings existants non bloquants).
