# Deploiement Wawbook

## Architecture

- **Hebergement** : Railway (Node.js + PostgreSQL)
- **Stockage fichiers** : Cloudflare R2 (images, EPUB, fonts, previews)
- **SSL** : Automatique via Railway

## Prerequis

- Compte [GitHub](https://github.com)
- Compte [Railway](https://railway.app) (plan Hobby ~$5/mois)
- Compte [Cloudflare](https://dash.cloudflare.com) (R2 gratuit jusqu'a 10 Go)
- Un nom de domaine

---

## Etape 1 : Repo GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/votre-user/wawbook.git
git push -u origin main
```

---

## Etape 2 : Cloudflare R2 (stockage)

1. Aller sur https://dash.cloudflare.com > **R2 Object Storage**
2. Creer un bucket (ex: `wawbook`)
3. **Manage R2 API Tokens** > creer un token avec acces lecture/ecriture
4. Noter les valeurs :
   - **Account ID** (visible dans l'URL du dashboard)
   - **Access Key ID**
   - **Secret Access Key**
5. (Optionnel) Activer un domaine public pour le bucket sous **Settings > Public access**

---

## Etape 3 : Railway (hebergement)

1. Aller sur https://railway.app, se connecter avec GitHub
2. **New Project** > **Deploy from GitHub repo** > selectionner le repo
3. Railway detecte le `Dockerfile` automatiquement
4. Ajouter PostgreSQL : cliquer **+ New** > **Database** > **PostgreSQL**
5. Lier la base au service : Railway remplit `DATABASE_URL` automatiquement

---

## Etape 4 : Variables d'environnement

Dans Railway > votre service > **Variables**, ajouter :

### Obligatoires

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `SESSION_SECRET` | Generer avec `openssl rand -base64 32` |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Votre cle R2 |
| `R2_SECRET_ACCESS_KEY` | Votre secret R2 |
| `R2_BUCKET_NAME` | `wawbook` |
| `R2_PUBLIC_URL` | URL publique du bucket R2 |

> `DATABASE_URL` est auto-remplie si PostgreSQL est lie au service.

### Optionnelles

| Variable | Quand |
|----------|-------|
| `STRIPE_SECRET_KEY` | Quand pret pour les paiements |
| `STRIPE_PUBLISHABLE_KEY` | Quand pret pour les paiements |
| `GOOGLE_CLIENT_ID` | Si OAuth Google active |
| `GOOGLE_CLIENT_SECRET` | Si OAuth Google active |
| `APPLE_CLIENT_ID` | Si Apple Sign In active |
| `LOG_LEVEL` | `info` par defaut, `debug` pour troubleshoot |

---

## Etape 5 : Migrer la base de donnees

Apres le premier deploiement, dans Railway > service > **Settings > Deploy** :

Ajouter une commande de build custom ou lancer manuellement :

```bash
npm run db:push
```

Alternative : utiliser le Railway CLI en local :

```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run db:push
```

---

## Etape 6 : Domaine custom

1. Dans Railway : **Settings** > **Networking** > **Custom Domain**
2. Entrer votre domaine (ex: `app.wawbook.com`)
3. Configurer le DNS chez votre registrar :
   - Type : `CNAME`
   - Nom : `app` (ou `@` pour le domaine racine)
   - Valeur : celle fournie par Railway
4. SSL est provisionne automatiquement (quelques minutes)

---

## Etape 7 : Configuration post-deploiement

### Stripe (paiements)

1. Passer en mode Live sur https://dashboard.stripe.com
2. Copier les cles live `sk_live_*` et `pk_live_*` dans les variables Railway
3. Configurer le webhook : **Developers > Webhooks > Add endpoint**
   - URL : `https://votre-domaine.com/api/stripe/webhook`
   - Events : `checkout.session.completed`, `payment_intent.succeeded`

### Google OAuth

1. Console Google Cloud > **APIs & Services > Credentials**
2. Ajouter `https://votre-domaine.com/api/auth/google/callback` aux URIs de redirection

### Apple Sign In

1. Apple Developer Portal > **Certificates, Identifiers & Profiles**
2. Mettre a jour les redirect URIs avec votre nouveau domaine

---

## Deploiements suivants

Chaque `git push origin main` declenche un redeploiement automatique (~1-2 min).

```bash
git add .
git commit -m "Description du changement"
git push
```

---

## Developpement local

```bash
# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env
# Editer .env avec vos valeurs locales

# Migrer la base de donnees locale
npm run db:push

# Lancer le serveur
npm run dev
```

Ou avec Docker :

```bash
docker compose up
```

---

## Troubleshooting

| Probleme | Solution |
|----------|----------|
| `relation "X" does not exist` | Lancer `npm run db:push` |
| `EADDRINUSE: port 5000` | Un autre process utilise le port. Tuer le process. |
| Erreur R2 `AccessDenied` | Verifier les cles R2 et les permissions du token |
| Webhook Stripe ne fonctionne pas | Verifier l'URL du webhook et le secret |
