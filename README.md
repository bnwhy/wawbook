## Règle de modification

**IMPORTANT : Confirmation obligatoire avant toute modification**

Avant d'effectuer toute modification sur ce projet, une confirmation explicite doit être demandée et obtenue. Cette règle s'applique à :

- ✅ Toutes les modifications de code source
- ✅ Les changements de configuration (fichiers .config.*, package.json, etc.)
- ✅ Les ajouts ou suppressions de fichiers/dossiers
- ✅ Les modifications de dépendances (npm install, package updates)
- ✅ Les changements de base de données ou schémas
- ✅ Toute autre action qui modifie l'état du projet

**Exception :** Les opérations de lecture seule (consultation de fichiers, recherche, analyse) ne nécessitent pas de confirmation.

Pour plus de détails, consultez le fichier [RULES.md](RULES.md).

---

## Architecture Import EPUB + IDML

### Règle d'or

```
EPUB = Images + Conteneurs vides + Positions (OÙ mettre les choses)
IDML = Texte + Mise en forme complète (QUOI mettre et COMMENT)
```

**⚠️ Point clé** : L'EPUB contient uniquement des **conteneurs vides** avec positions. Tout le texte et la mise en forme proviennent de l'IDML.

### 📚 Documentation

**Guide complet** : [GUIDE_EPUB_IDML.md](GUIDE_EPUB_IDML.md)

Ce guide contient :
- Référence rapide (30 secondes)
- Architecture détaillée avec exemples
- Guide des polices
- Modules du code source
- Guide d'import et débogage
- FAQ

**Documentation technique** :
- [IDML_IMPORT.md](server/replit_integrations/object_storage/IDML_IMPORT.md) - Détails techniques d'import
- [README Module](server/replit_integrations/object_storage/README.md) - Structure du code
