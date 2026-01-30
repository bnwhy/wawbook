# Configuration OAuth (Google & Apple)

Ce guide explique comment configurer l'authentification OAuth avec Google et Apple Sign In.

## ✅ Google OAuth (Déjà configuré)

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Activez l'API Google+ (Google People API)

### 2. Configurer l'écran de consentement OAuth

1. Allez dans **APIs & Services** > **OAuth consent screen**
2. Choisissez **External** (ou Internal si vous avez un workspace)
3. Remplissez les informations requises :
   - Nom de l'application
   - Email de support
   - Logo (optionnel)
   - Domaines autorisés

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth 2.0 Client ID**
3. Type d'application : **Web application**
4. Ajoutez les **Authorized redirect URIs** :
   - Développement : `http://localhost:5000/api/auth/google/callback`
   - Production : `https://votre-domaine.com/api/auth/google/callback`
5. Copiez le **Client ID** et **Client Secret**

### 4. Ajouter les variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
```

---

## 🍎 Apple Sign In (Nouvelle configuration)

### 1. Créer un App ID

1. Allez sur [Apple Developer Portal](https://developer.apple.com/account/)
2. Allez dans **Certificates, Identifiers & Profiles**
3. Cliquez sur **Identifiers** > **+** (nouveau)
4. Sélectionnez **App IDs** et cliquez sur **Continue**
5. Remplissez :
   - Description : Nom de votre app
   - Bundle ID : `com.votreentreprise.votreapp` (ex: `com.bookclub.web`)
6. Cochez **Sign In with Apple** dans les Capabilities
7. Cliquez sur **Continue** puis **Register**

### 2. Créer un Service ID

1. Dans **Identifiers**, cliquez sur **+** (nouveau)
2. Sélectionnez **Services IDs** et cliquez sur **Continue**
3. Remplissez :
   - Description : Nom de votre service web
   - Identifier : `com.votreentreprise.votreapp.web` (ex: `com.bookclub.web.service`)
4. Cochez **Sign In with Apple**
5. Cliquez sur **Configure** à côté de "Sign In with Apple"
6. Configurez :
   - **Primary App ID** : Sélectionnez l'App ID créé précédemment
   - **Domains and Subdomains** : Ajoutez votre domaine (ex: `votredomaine.com`)
   - **Return URLs** : Ajoutez les URLs de callback :
     - Développement : `http://localhost:5000/api/auth/apple/callback`
     - Production : `https://votre-domaine.com/api/auth/apple/callback`
7. Cliquez sur **Save** puis **Continue** puis **Register**

### 3. Créer une clé privée (Private Key)

1. Dans **Keys**, cliquez sur **+** (nouveau)
2. Donnez un nom à la clé (ex: "Apple Sign In Key")
3. Cochez **Sign In with Apple**
4. Cliquez sur **Configure** et sélectionnez votre **Primary App ID**
5. Cliquez sur **Save** puis **Continue** puis **Register**
6. **IMPORTANT** : Téléchargez la clé (fichier `.p8`) - vous ne pourrez la télécharger qu'une seule fois !
7. Notez le **Key ID** affiché

### 4. Récupérer le Team ID

1. En haut à droite de l'Apple Developer Portal, cliquez sur votre nom
2. Notez votre **Team ID** (format : 10 caractères alphanumériques)

### 5. Préparer la clé privée pour l'environnement

Ouvrez le fichier `.p8` téléchargé et copiez tout son contenu. Il ressemble à :

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...plusieurs lignes...
-----END PRIVATE KEY-----
```

### 6. Ajouter les variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
APPLE_CLIENT_ID=com.votreentreprise.votreapp.web
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=XYZ9876543
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...
-----END PRIVATE KEY-----"
```

**Note** : La clé privée doit être sur plusieurs lignes avec les guillemets.

---

## 🧪 Test en développement

### Google OAuth

1. Démarrez votre serveur : `npm run dev`
2. Allez sur `http://localhost:5000/login`
3. Cliquez sur "Continuer avec Google"
4. Connectez-vous avec votre compte Google
5. Vous devriez être redirigé vers `/account`

### Apple Sign In

1. **Important** : Apple Sign In ne fonctionne qu'en HTTPS en production
2. Pour tester en local, vous devez :
   - Soit utiliser un tunnel HTTPS (ngrok, cloudflared, etc.)
   - Soit déployer sur un environnement de staging avec HTTPS
3. Une fois configuré, cliquez sur "Continuer avec Apple"
4. Connectez-vous avec votre Apple ID
5. Vous devriez être redirigé vers `/account`

---

## 🚀 Déploiement en production

### Checklist

- [ ] Ajouter les URLs de production dans Google Cloud Console
- [ ] Ajouter les URLs de production dans Apple Developer Portal
- [ ] Configurer les variables d'environnement sur votre serveur de production
- [ ] Vérifier que HTTPS est activé (obligatoire pour Apple)
- [ ] Tester les deux flux OAuth en production

### Variables d'environnement production

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-prod-client-secret

# Apple Sign In
APPLE_CLIENT_ID=com.votreentreprise.votreapp.web
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=XYZ9876543
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...votre clé privée...
-----END PRIVATE KEY-----"
```

---

## 🔧 Dépannage

### Google OAuth

**Erreur "redirect_uri_mismatch"**
- Vérifiez que l'URL de callback est exactement la même dans Google Cloud Console et votre application
- N'oubliez pas le protocole (http:// ou https://)

**Erreur "Access blocked: This app's request is invalid"**
- Vérifiez que l'écran de consentement OAuth est configuré
- Assurez-vous que l'API Google+ est activée

### Apple Sign In

**Erreur "invalid_client"**
- Vérifiez que le Service ID est correct
- Vérifiez que la clé privée est valide et complète

**Erreur "invalid_request"**
- Vérifiez que l'URL de callback est configurée dans Apple Developer Portal
- Assurez-vous d'utiliser HTTPS en production

**La clé privée ne fonctionne pas**
- Vérifiez que vous avez copié TOUTE la clé, y compris les lignes BEGIN et END
- Vérifiez qu'il n'y a pas d'espaces supplémentaires
- La clé doit être entre guillemets doubles dans le fichier .env

---

## 📚 Ressources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Passport.js Documentation](http://www.passportjs.org/)
