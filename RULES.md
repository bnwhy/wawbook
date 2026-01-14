# Règles du projet NuageBook

## 🛡️ Règle de confirmation obligatoire

### Principe général

**Toute modification du projet doit faire l'objet d'une confirmation explicite avant d'être exécutée.**

Cette règle s'applique à toutes les interactions avec le projet, qu'elles soient effectuées par des développeurs, des outils d'automatisation, ou des assistants IA.

### Modifications nécessitant une confirmation

#### 1. Modifications de code source
- Modification de fichiers TypeScript/JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- Modification de fichiers de style (`.css`, `.scss`)
- Modification de fichiers HTML
- Ajout ou suppression de fichiers de code

#### 2. Modifications de configuration
- Fichiers de configuration (`vite.config.ts`, `tsconfig.json`, `drizzle.config.ts`, etc.)
- Fichiers de build et déploiement (`.replit`, `package.json`)
- Variables d'environnement (`.env`, `.env.local`)
- Configuration des outils (ESLint, Prettier, PostCSS, etc.)

#### 3. Gestion des dépendances
- Installation de nouveaux packages (`npm install`)
- Mise à jour de packages existants (`npm update`)
- Suppression de packages (`npm uninstall`)
- Modification de `package.json` ou `package-lock.json`

#### 4. Modifications de base de données
- Changements de schéma (`shared/schema.ts`)
- Migrations de base de données
- Ajout ou suppression de tables/colonnes
- Modifications des relations entre tables

#### 5. Modifications de fichiers système
- Ajout ou suppression de dossiers
- Modification de la structure du projet
- Changements dans les assets (`server/assets/`)
- Modification de fichiers de documentation (sauf lecture)

#### 6. Opérations Git
- Commits
- Push vers le dépôt distant
- Création ou suppression de branches
- Merge ou rebase

### Exceptions : Opérations autorisées sans confirmation

Les opérations suivantes peuvent être effectuées sans demander de confirmation :

- ✅ Lecture de fichiers
- ✅ Recherche dans le code (grep, search)
- ✅ Consultation de l'historique Git
- ✅ Visualisation du statut Git
- ✅ Analyse et exploration du code
- ✅ Exécution de linters en lecture seule

### Processus de confirmation

1. **Proposition** : Présenter clairement ce qui sera modifié et pourquoi
2. **Attente** : Attendre la confirmation explicite de l'utilisateur
3. **Exécution** : Une fois confirmé, procéder aux modifications
4. **Vérification** : Confirmer que les modifications ont été appliquées correctement

### Exemple de workflow

```
Assistant: Je propose de modifier le fichier README.md pour ajouter...
         Souhaitez-vous que je procède à cette modification ?
         
Utilisateur: Oui, vas-y