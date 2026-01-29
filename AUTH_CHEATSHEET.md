# Authentification - Cheatsheet Développeur

**Version:** 1.1.0 | **Référence ultra-rapide**

---

## 🚀 Setup (1 minute)

```bash
npm install  # bcryptjs déjà installé
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env
npm run db:push
npm run dev
```

---

## 📝 Code Snippets Essentiels

### Protéger une Route (Backend)

```typescript
import { requireAuth } from '../middleware/auth';

router.get('/protected', requireAuth, (req, res) => {
  const userId = req.user!.id;  // Garanti non-null
  res.json({ message: `Hello ${req.user!.firstName}` });
});
```

### Utiliser Auth (Frontend)

```typescript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) return <LoginButton />;
  
  return <div>Welcome {user?.firstName}!</div>;
};
```

### Créer Route Protégée (Frontend)

```typescript
import ProtectedRoute from '../components/ProtectedRoute';

<Route path="/private">
  <ProtectedRoute>
    <PrivatePage />
  </ProtectedRoute>
</Route>
```

### Pre-fill Formulaire avec User

```typescript
const { user } = useAuth();

const [form, setForm] = useState({
  email: user?.email || '',
  firstName: user?.firstName || '',
});

useEffect(() => {
  if (user) {
    setForm(prev => ({ ...prev, email: user.email }));
  }
}, [user]);
```

---

## 🗺️ Routes API

### Auth

| Endpoint | Body | Response |
|----------|------|----------|
| `POST /api/auth/signup` | `{email, password, firstName, lastName}` | `customer + cookie` |
| `POST /api/auth/login` | `{email, password}` | `customer + cookie` |
| `POST /api/auth/logout` | - | `{message}` |
| `GET /api/auth/me` | - | `customer or 401` |
| `POST /api/auth/set-password` | `{email, password}` | `customer + cookie` |
| `POST /api/auth/forgot-password` | `{email}` | `{message}` |
| `POST /api/auth/reset-password` | `{token, password}` | `customer + cookie` |

### Client (Protected)

| Endpoint | Auth | Response |
|----------|------|----------|
| `GET /api/customers/me` | Required | `customer` |
| `PATCH /api/customers/me` | Required | `customer` |
| `GET /api/orders/my-orders` | Required | `order[]` |

---

## 🔍 Debugging

### Vérifier Session DB

```sql
SELECT sid, (sess->>'passport')::json->'user', expire 
FROM session WHERE expire > NOW();
```

### Vérifier Password Hash

```sql
SELECT id, email, 
  LEFT(password, 20) as pwd_preview,
  CASE WHEN password IS NULL THEN 'NO PWD' ELSE 'HAS PWD' END
FROM customers;
```

### Test API

```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"t@t.com","password":"test1234","firstName":"T","lastName":"U"}'

# Login
curl -c cookie.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"t@t.com","password":"test1234"}'

# Me
curl -b cookie.txt http://localhost:5000/api/auth/me
```

---

## ⚠️ Pièges Courants

| Erreur | Cause | Fix |
|--------|-------|-----|
| req.user undefined | Session MW pas avant routes | Vérifier ordre dans index.ts |
| 401 sur route protégée | Cookie pas envoyé | `credentials: 'include'` dans fetch |
| Password exposé | select() sans champs | Utiliser safeCustomerFields |
| Token reset expiré | > 1h depuis génération | Redemander reset |

---

## 📂 Fichiers Clés

### Backend (3 fichiers à connaître)

1. **`server/config/passport.ts`** - Configuration auth
2. **`server/routes/auth.routes.ts`** - Toutes routes auth
3. **`server/middleware/auth.ts`** - requireAuth

### Frontend (3 fichiers à connaître)

1. **`client/src/context/AuthContext.tsx`** - État global
2. **`client/src/components/ProtectedRoute.tsx`** - HOC protection
3. **`client/src/apps/PublicApp.tsx`** - Routes registration

---

## 🎯 Patterns

### Pattern: Auto-login Après Action

```typescript
// Après signup, set-password, reset-password
req.login(customer, (err) => {
  if (err) return next(err);
  res.json(customer);
});
```

### Pattern: Message Générique (Sécurité)

```typescript
// forgot-password - NE JAMAIS révéler si email existe
const customer = await storage.getCustomerByEmail(email);
if (customer) {
  // Générer token, envoyer email
}
// TOUJOURS retourner succès
res.json({ message: "Email envoyé si compte existe" });
```

### Pattern: Exclusion Password

```typescript
// storage.ts
private safeCustomerFields = {
  id: customers.id,
  email: customers.email,
  // ... TOUS sauf password, resetToken
};

async getCustomer(id) {
  return db.select(this.safeCustomerFields).from(customers)...
}
```

---

## 🔐 Valeurs Recommandées

| Config | Valeur | Raison |
|--------|--------|--------|
| bcrypt rounds | 10 | Balance sécurité/perf |
| Session maxAge | 30 jours | Bon compromis UX/sécurité |
| Reset token expire | 1 heure | Assez long, pas trop |
| Password min length | 8 chars | Standard industrie |
| Rate limit auth | 5 req/15min | Anti brute-force |

---

## 📚 Docs Complètes

- **Full Doc:** [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)
- **Quick Start:** [QUICKSTART_AUTH.md](QUICKSTART_AUTH.md)
- **Diagrammes:** [AUTH_ARCHITECTURE_DIAGRAM.md](AUTH_ARCHITECTURE_DIAGRAM.md)
- **Changelog:** [CHANGELOG_AUTH_v1.1.md](CHANGELOG_AUTH_v1.1.md)
- **Index:** [DOCS_INDEX.md](DOCS_INDEX.md)

---

**Ce fichier = copier-coller rapide. Pour comprendre = lire les docs complètes.**
