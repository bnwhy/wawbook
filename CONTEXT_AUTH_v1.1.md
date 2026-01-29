# Contexte Système d'Authentification v1.1 - Référence Rapide

**Date:** 29 Janvier 2026  
**Statut:** ✅ Implémenté et Testé

---

## 🎯 En Une Phrase

Système complet d'authentification client avec Passport.js + sessions PostgreSQL, permettant inscription, connexion, espace client et création de compte post-achat (best practice e-commerce).

---

## 📦 Ce Qui a Été Fait

### Backend (10 fichiers - 489 lignes)

```
✅ server/config/passport.ts             (67 lignes)  - LocalStrategy + bcrypt
✅ server/middleware/auth.ts             (26 lignes)  - requireAuth middleware
✅ server/routes/auth.routes.ts          (262 lignes) - 7 routes auth
✅ server/types/express.d.ts             (10 lignes)  - Type req.user
✅ server/scripts/clean-old-customers.ts (49 lignes)  - Script migration

✅ shared/schema.ts                      (+15 lignes) - password, resetToken
✅ server/storage.ts                     (+25 lignes) - Exclusion password
✅ server/config/env.ts                  (+3 lignes)  - SESSION_SECRET
✅ server/index.ts                       (+29 lignes) - Session middleware
✅ server/routes/index.ts                (+2 lignes)  - Route auth
✅ server/routes/customers.routes.ts     (+34 lignes) - Routes /me
✅ server/routes/orders.routes.ts        (+15 lignes) - Route /my-orders
```

### Frontend (14 fichiers - 1,981 lignes)

```
✅ client/src/context/AuthContext.tsx              (189 lignes) - État auth global
✅ client/src/components/ProtectedRoute.tsx        (42 lignes)  - HOC protection
✅ client/src/pages/LoginPage.tsx                  (132 lignes) - Connexion
✅ client/src/pages/SignupPage.tsx                 (176 lignes) - Inscription
✅ client/src/pages/ForgotPasswordPage.tsx         (127 lignes) - Forgot pwd
✅ client/src/pages/ResetPasswordPage.tsx          (144 lignes) - Reset pwd
✅ client/src/pages/AccountPage.tsx                (180 lignes) - Dashboard
✅ client/src/pages/AccountProfilePage.tsx         (146 lignes) - Profil
✅ client/src/pages/AccountOrdersPage.tsx          (127 lignes) - Commandes
✅ client/src/pages/AccountOrderDetailPage.tsx     (164 lignes) - Détail

✅ client/src/apps/PublicApp.tsx                   (+58 lignes) - Routes + AuthProvider
✅ client/src/components/Navigation.tsx            (+63 lignes) - Menu user
✅ client/src/pages/CheckoutPage.tsx               (+25 lignes) - Support auth
✅ client/src/pages/CheckoutSuccessPage.tsx        (+68 lignes) - Création post-achat
```

**Total:** 24 fichiers, ~2,470 lignes ajoutées

---

## 🔑 Points Clés Techniques

### Schéma DB

```typescript
// Table customers - Nouveaux champs (nullable)
password: text                    // Hash bcrypt
resetPasswordToken: text          // Token 32 bytes
resetPasswordExpires: timestamp   // Expiration 1h

// Table session (auto-créée)
sid: varchar (PK)
sess: json
expire: timestamp
```

### Stack Auth

```
bcryptjs (hash) → Passport.js (auth) → express-session (session) → connect-pg-simple (store) → PostgreSQL
```

### Routes Protégées

```typescript
// Middleware
requireAuth  →  req.user garanti  →  200
             →  pas de session    →  401

// Usage
router.get('/my-orders', requireAuth, (req, res) => {
  const userId = req.user!.id;
  // ...
});
```

### AuthContext Frontend

```typescript
const { user, isAuthenticated, login, logout } = useAuth();

// user: Customer | null
// isAuthenticated: boolean
// login(email, password): Promise<void>
// logout(): Promise<void>
```

---

## 🚦 Commandes Essentielles

```bash
# Avant première utilisation
npm run db:push                              # Migration DB
echo "SESSION_SECRET=xxx" >> .env            # Ajouter secret

# Optionnel: Reset données
tsx server/scripts/clean-old-customers.ts    # Supprime tout

# Démarrage
npm run dev                                  # Vérifier log "Session configured"

# Test rapide
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","firstName":"Test","lastName":"User"}'
```

---

## 🔒 Sécurité Résumée

- ✅ Password: bcrypt 10 rounds, jamais en clair, jamais exposé API
- ✅ Session: PostgreSQL, httpOnly cookie, 30j expiration
- ✅ Reset: Token crypto 32 bytes, expiration 1h
- ✅ Rate limit: strictLimiter sur toutes routes auth
- ✅ Validation: Zod schemas serveur

---

## 📊 Meilleures Pratiques E-commerce

| Pratique | Implémentation |
|----------|----------------|
| Guest checkout | ✅ Maintenu (pas de compte obligatoire) |
| Post-purchase account | ✅ CheckoutSuccessPage formulaire |
| Communication valeur | ✅ Messages "Suivez vos commandes" |
| Mot de passe oublié | ✅ Flux complet avec token |
| Pre-fill checkout | ✅ Si connecté |

**Source:** Baymard Institute, Stripe Research 2025-2026

---

## 🗺️ Fichiers Par Fonctionnalité

### Inscription/Connexion
- `server/routes/auth.routes.ts` (signup, login)
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/SignupPage.tsx`

### Mot de Passe Oublié
- `server/routes/auth.routes.ts` (forgot, reset)
- `client/src/pages/ForgotPasswordPage.tsx`
- `client/src/pages/ResetPasswordPage.tsx`

### Espace Client
- `client/src/pages/AccountPage.tsx` (dashboard)
- `client/src/pages/AccountProfilePage.tsx`
- `client/src/pages/AccountOrdersPage.tsx`
- `client/src/pages/AccountOrderDetailPage.tsx`

### Checkout Intelligent
- `client/src/pages/CheckoutPage.tsx` (pré-remplissage)
- `client/src/pages/CheckoutSuccessPage.tsx` (création post-achat)

### Infrastructure
- `server/config/passport.ts` (configuration)
- `server/middleware/auth.ts` (protection)
- `client/src/context/AuthContext.tsx` (état global)
- `client/src/components/ProtectedRoute.tsx` (HOC)

---

## 🎓 Comprendre en 5 Minutes

### Flux Principal

```
1. Client → /signup → email+password
2. Backend → bcrypt.hash(password) → save DB
3. Backend → passport.authenticate() → create session
4. Session → PostgreSQL table 'session'
5. Response → set cookie (sid=xxx)
6. Client → Toutes requêtes futures → send cookie
7. Backend → deserialize session → attach req.user
8. Routes protégées → check req.isAuthenticated()
```

### Architecture 3 Couches

```
┌──────────────────┐
│  AuthContext     │  État global React (user, isAuthenticated)
│  (Frontend)      │  Méthodes: login(), logout(), signup()
└────────┬─────────┘
         │ fetch('/api/auth/*', {credentials: 'include'})
         ↓
┌──────────────────┐
│  auth.routes.ts  │  Routes Express + Passport.js
│  (Backend)       │  Validation Zod + bcrypt + rate limit
└────────┬─────────┘
         │ storage.getCustomerByEmailWithPassword()
         ↓
┌──────────────────┐
│  PostgreSQL      │  customers (password hash)
│  (Database)      │  session (connect-pg-simple)
└──────────────────┘
```

---

## 🐛 Debugging One-Liners

```sql
-- Voir sessions actives
SELECT sid, (sess->>'passport')::json->'user' as user_id, expire 
FROM session WHERE expire > NOW();

-- Voir qui a un password
SELECT id, email, 
  CASE WHEN password IS NOT NULL THEN '✅ HAS PASSWORD' ELSE '❌ NO PASSWORD' END 
FROM customers;

-- Voir tokens reset actifs
SELECT id, email, reset_password_expires 
FROM customers 
WHERE reset_password_token IS NOT NULL 
AND reset_password_expires > NOW();
```

```bash
# Tester login API
curl -v -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d '{"email":"test@test.com","password":"test1234"}'

# Tester route protégée
curl -b /tmp/cookies.txt http://localhost:5000/api/customers/me

# Voir session cookie
cat /tmp/cookies.txt
```

---

## ⚡ Commandes Power User

```bash
# Générer SESSION_SECRET fort
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Compter lignes nouveau code auth
find . -name "*.tsx" -o -name "*.ts" | grep -E "(auth|Auth|login|Login|signup|Signup|account|Account)" | xargs wc -l

# Rechercher usages useAuth
grep -r "useAuth" client/src --include="*.tsx"

# Lister toutes routes protégées
grep -r "requireAuth" server/routes --include="*.ts"

# Voir structure session en DB
psql $DATABASE_URL -c "\d session"

# Tester que password jamais exposé
curl http://localhost:5000/api/customers | jq '.[0] | keys'
# devrait PAS contenir "password"
```

---

## 📚 Documentation Cross-Reference

**Besoin** → **Document**

- Comprendre auth complètement → [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)
- Démarrer rapidement → [QUICKSTART_AUTH.md](QUICKSTART_AUTH.md)
- Voir tous les changements → [CHANGELOG_AUTH_v1.1.md](CHANGELOG_AUTH_v1.1.md)
- Navigation complète docs → [DOCS_INDEX.md](DOCS_INDEX.md)
- Architecture globale → [ARCHITECTURE.md](ARCHITECTURE.md)
- Vision produit → [PRD.md](PRD.md)

---

## ✅ Checklist Validation

### Développeur

- [ ] J'ai lu [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)
- [ ] J'ai configuré SESSION_SECRET dans .env
- [ ] J'ai exécuté `npm run db:push`
- [ ] Le serveur démarre avec "Session configured" dans les logs
- [ ] J'ai testé signup → login → logout
- [ ] Je comprends le flux deserialize user

### Code Review

- [ ] Password jamais retourné par API (vérifier storage.ts)
- [ ] requireAuth utilisé sur routes sensibles
- [ ] Validation Zod sur toutes routes auth
- [ ] Rate limiting sur signup/login/forgot/reset
- [ ] Token reset expire en 1h max
- [ ] Messages d'erreur en français et clairs

### Sécurité

- [ ] SESSION_SECRET configuré en production (pas default)
- [ ] Cookies secure=true en production
- [ ] bcrypt avec 10 rounds minimum
- [ ] Aucun password en logs
- [ ] Token reset généré avec crypto.randomBytes

---

**Ce fichier = référence rapide pour ne jamais perdre le contexte du système d'authentification.**

**Pour détails complets:** [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)  
**Pour démarrage:** [QUICKSTART_AUTH.md](QUICKSTART_AUTH.md)  
**Pour navigation:** [DOCS_INDEX.md](DOCS_INDEX.md)
