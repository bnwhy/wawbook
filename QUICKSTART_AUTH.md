# Guide Démarrage Rapide - Système d'Authentification

**Version:** 1.1.0  
**Pour:** Développeurs rejoignant le projet

---

## ⚡ En 5 Minutes

### 1. Installation

```bash
# Les dépendances sont déjà installées
npm install

# Vérifier que bcryptjs est bien installé
npm list bcryptjs
# devrait afficher: bcryptjs@2.4.3
```

### 2. Configuration

```bash
# Copier .env.example vers .env (si pas déjà fait)
cp .env.example .env

# Ajouter SESSION_SECRET dans .env
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

### 3. Migration Base de Données

```bash
# Appliquer les nouveaux champs (password, resetPasswordToken, resetPasswordExpires)
npm run db:push

# La table session sera créée automatiquement au premier démarrage
```

### 4. (Optionnel) Nettoyer Anciennes Données

```bash
# ⚠️ ATTENTION: Supprime TOUTES les commandes et clients
tsx server/scripts/clean-old-customers.ts
```

### 5. Démarrer

```bash
# Démarrer le serveur
npm run dev

# Vérifier dans les logs:
# "Session and authentication middleware configured"
```

**C'est tout ! Le système est prêt.**

---

## 🧭 Navigation Rapide

### URLs Principales

| Page | URL | Accessible |
|------|-----|-----------|
| Connexion | http://localhost:5000/login | Tous |
| Inscription | http://localhost:5000/signup | Tous |
| Mot de passe oublié | http://localhost:5000/forgot-password | Tous |
| Espace client | http://localhost:5000/account | Connectés uniquement |
| Profil | http://localhost:5000/account/profile | Connectés uniquement |
| Commandes | http://localhost:5000/account/orders | Connectés uniquement |

### Endpoints API

| Endpoint | Méthode | Protection |
|----------|---------|-----------|
| `/api/auth/signup` | POST | Rate limit |
| `/api/auth/login` | POST | Rate limit |
| `/api/auth/me` | GET | - |
| `/api/customers/me` | GET | requireAuth |
| `/api/orders/my-orders` | GET | requireAuth |

---

## 🔍 Comprendre le Code

### Architecture en 3 Couches

```
┌─────────────────────────────────────┐
│  FRONTEND (React)                   │
│  - AuthContext                      │
│  - Pages: Login, Signup, Account... │
│  - ProtectedRoute                   │
└──────────────┬──────────────────────┘
               │ fetch /api/auth/*
               ↓
┌─────────────────────────────────────┐
│  BACKEND (Express)                  │
│  - Routes: auth.routes.ts           │
│  - Middleware: requireAuth          │
│  - Passport.js LocalStrategy        │
└──────────────┬──────────────────────┘
               │ bcrypt.compare()
               ↓
┌─────────────────────────────────────┐
│  DATABASE (PostgreSQL)              │
│  - Table: customers (+ password)    │
│  - Table: session                   │
└─────────────────────────────────────┘
```

### Flux Requête Authentifiée

```typescript
// 1. Client fait une requête
fetch('/api/customers/me', { credentials: 'include' })

// 2. Express extrait cookie session
req.sessionID = "abc123..."

// 3. connect-pg-simple récupère session depuis DB
SELECT sess FROM session WHERE sid = 'abc123'

// 4. Passport deserialize user
const userId = req.session.passport.user;  // "customer-uuid"
const customer = await storage.getCustomer(userId);
req.user = customer;

// 5. Middleware requireAuth vérifie
if (!req.isAuthenticated()) return res.status(401);

// 6. Route handler s'exécute
res.json(req.user);
```

### Fichiers Clés à Connaître

#### Backend

1. **`server/config/passport.ts`** - **START HERE**
   ```typescript
   // Configure la stratégie d'authentification
   passport.use(new LocalStrategy({
     usernameField: 'email',  // On utilise email au lieu de username
     passwordField: 'password'
   }, async (email, password, done) => {
     // Logique vérification credentials
   }));
   ```

2. **`server/middleware/auth.ts`** - Protège les routes
   ```typescript
   export function requireAuth(req, res, next) {
     if (req.isAuthenticated()) return next();
     res.status(401).json({ error: "Non authentifié" });
   }
   ```

3. **`server/routes/auth.routes.ts`** - Toutes les routes auth
   - Ligne 41: POST /signup
   - Ligne 93: POST /login
   - Ligne 124: POST /logout
   - Ligne 143: GET /me
   - Ligne 155: POST /set-password (post-achat)
   - Ligne 189: POST /forgot-password
   - Ligne 227: POST /reset-password

#### Frontend

1. **`client/src/context/AuthContext.tsx`** - **START HERE**
   ```typescript
   // Hook principal
   const { user, isAuthenticated, login, logout } = useAuth();
   
   // État global accessible partout
   user?.email          // Email du client connecté
   user?.firstName      // Prénom
   isAuthenticated      // true/false
   ```

2. **`client/src/components/ProtectedRoute.tsx`** - Protège les routes
   ```typescript
   // Usage
   <Route path="/account">
     <ProtectedRoute>
       <AccountPage />
     </ProtectedRoute>
   </Route>
   ```

3. **`client/src/apps/PublicApp.tsx`** - Enregistrement routes
   - Ligne 23: Wrap AuthProvider
   - Lignes 88-115: Routes auth + account

---

## 🐛 Debugging

### Vérifier Session Active

```bash
# Dans psql
SELECT * FROM session WHERE expire > NOW();

# Devrait montrer les sessions actives avec sid + sess JSON
```

### Vérifier Password Hashé

```bash
# Dans psql
SELECT id, email, 
  CASE 
    WHEN password IS NOT NULL THEN 'HAS PASSWORD' 
    ELSE 'NO PASSWORD' 
  END as password_status
FROM customers;

# Le password ne doit JAMAIS être lisible en clair
```

### Logs Importants

```bash
# Démarrage serveur
[INFO]: Session and authentication middleware configured

# Login réussi
[INFO]: User authenticated successfully (customerId: "uuid")

# Login échoué
[WARN]: Unauthorized access attempt (path: "/api/customers/me")

# Reset password
[INFO]: Password reset requested (customerId: "uuid", resetLink: "http://...")
```

### Erreurs Courantes

**1. "Non authentifié" sur route protégée**
```
Cause: Cookie session non envoyé ou expiré
Solution: Vérifier credentials: 'include' dans fetch
```

**2. "Token invalide ou expiré"**
```
Cause: Token reset expiré (> 1h) ou déjà utilisé
Solution: Redemander un nouveau lien reset
```

**3. "Un compte existe déjà avec cet email"**
```
Cause: Email déjà en DB
Solution: Utiliser /login ou /forgot-password
```

**4. req.user undefined**
```
Cause: Session middleware pas configuré ou passport pas initialisé
Solution: Vérifier ordre middlewares dans server/index.ts
```

---

## 💡 Patterns Utiles

### Protéger une Nouvelle Route

```typescript
// server/routes/example.routes.ts
import { requireAuth } from '../middleware/auth';

router.get('/my-data', requireAuth, async (req, res) => {
  const userId = req.user!.id;  // req.user garanti présent
  // ... votre logique
});
```

### Accéder User dans un Composant

```typescript
// client/src/pages/MyPage.tsx
import { useAuth } from '../context/AuthContext';

const MyPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  
  return <div>Hello {user?.firstName}!</div>;
};
```

### Pre-fill Formulaire avec User Data

```typescript
const [formData, setFormData] = useState({
  email: user?.email || '',
  firstName: user?.firstName || '',
  // ...
});

// Re-sync si user change
useEffect(() => {
  if (user) {
    setFormData(prev => ({
      ...prev,
      email: user.email,
      firstName: user.firstName,
    }));
  }
}, [user]);
```

---

## 🎓 Concepts Clés

### Passport.js serialize/deserialize

```typescript
// serialize: Session → Store uniquement l'ID
passport.serializeUser((user, done) => {
  done(null, user.id);  // Stocke juste "uuid" en session
});

// deserialize: ID → Récupère customer complet
passport.deserializeUser(async (id, done) => {
  const customer = await storage.getCustomer(id);  // Query DB
  done(null, customer);  // Attache à req.user
});
```

**Pourquoi ?** Économise mémoire - session stocke juste un ID, pas l'objet complet.

### Password Exclusion Pattern

```typescript
// ❌ JAMAIS FAIRE
const customer = await db.select().from(customers).where(...);
// Retourne TOUS les champs y compris password

// ✅ TOUJOURS FAIRE
const safeFields = { id, email, firstName, lastName, ... };  // Sans password
const customer = await db.select(safeFields).from(customers).where(...);
```

### Rate Limiting sur Auth

```typescript
import { strictLimiter } from '../middleware/rate-limit';

// Limite à 5 requêtes / 15 minutes / IP
router.post('/login', strictLimiter, (req, res) => { ... });
```

**Pourquoi ?** Protection contre brute force attacks.

---

## 📞 Support

### Où Trouver de l'Aide

1. **Documentation complète:** [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)
2. **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) - Section "Système d'Authentification"
3. **PRD:** [PRD.md](PRD.md) - Section 2.4
4. **Changelog:** [CHANGELOG_AUTH_v1.1.md](CHANGELOG_AUTH_v1.1.md)

### Questions Fréquentes

**Q: Comment tester le reset password sans email ?**  
R: Le lien est loggé en console serveur. Chercher "PASSWORD RESET LINK" dans les logs.

**Q: Pourquoi SESSION_SECRET a une valeur par défaut ?**  
R: Pour faciliter le développement. En production, DOIT être défini avec valeur forte.

**Q: Les anciennes commandes seront-elles perdues ?**  
R: Seulement si vous exécutez clean-old-customers.ts. Sinon, elles restent.

**Q: Comment protéger les routes admin ?**  
R: Créer middleware `requireAdmin` (hors scope v1.1, prévu v1.2).

**Q: Peut-on utiliser JWT au lieu de sessions ?**  
R: Oui mais nécessite refonte. Sessions PostgreSQL choisies car infrastructure déjà en place.

---

**Bon développement ! 🚀**
