# Implémentation des Textes Conditionnels IDML

## ✅ Fonctionnalité Complète

Le système supporte maintenant les textes conditionnels InDesign avec variables dynamiques.

## 📋 Résumé de l'implémentation

### 1. Extraction (idmlParser.ts)

- Détection des conditions via `AppliedConditions` sur CharacterStyleRange
- Extraction des variables via `TextVariableInstance`
- Parsing automatique du format `TXTCOND_tabId_variantId-optionId`
- Préservation des segments vides pour maintenir la structure

### 2. Propagation (idmlMerger.ts)

- Les segments conditionnels sont propagés depuis l'IDML vers les TextElements
- Conservation des conditions parsées et des variables

### 3. Résolution (conditionalTextResolver.ts)

- Filtrage des segments selon les sélections du wizard
- Remplacement des variables par les valeurs saisies
- Mapping automatique `hero-child` → `child`
- Ajout automatique d'espaces autour des variables (workaround InDesign)

### 4. Rendu (routes.ts)

- Intégration dans l'endpoint `/api/books/:id/render-pages`
- Résolution avant le rendu HTML des pages

### 5. Validation (schema.ts)

- Schémas Zod pour `parsedConditionSchema` et `conditionalSegmentSchema`
- Types TypeScript exportés

## 📝 Formats

### Conditions

```
TXTCOND_tabId_variantId-optionId
```

**Exemples** :
- `TXTCOND_hero-child_gender-boy`
- `TXTCOND_hero-child_gender-girl`

### Variables

```
TXTVAR_tabId_variantId
```

**Exemples** :
- `TXTVAR_hero-child_name`
- `TXTVAR_hero-child_age`

## 🔄 Mapping Automatique

Le système mappe automatiquement les tabIds :

| Condition IDML | Wizard Tab ID |
|----------------|---------------|
| `hero-child`   | `child`       |
| `hero-parent`  | `parent`      |
| `hero-XXX`     | `XXX`         |

## 🎯 Exemple Complet

### InDesign

```
[TXTCOND_hero-child_gender-boy] "Le petit "
[TXTCOND_hero-child_gender-girl] "La petite "
[Variable] TXTVAR_hero-child_name
[TXTCOND_hero-child_gender-boy] " est venu."
[TXTCOND_hero-child_gender-girl] " est venue."
```

### Wizard Config

```json
{
  "id": "child",
  "label": "Hero child",
  "variants": [
    {
      "id": "gender",
      "type": "options",
      "options": [
        { "id": "boy", "label": "Garçon" },
        { "id": "girl", "label": "Fille" }
      ]
    },
    {
      "id": "name",
      "type": "text"
    }
  ]
}
```

### Sélections Utilisateur

```json
{
  "child": {
    "gender": "girl",
    "name": "Lily"
  }
}
```

### Résultat

```
"La petite Lily est venue."
```

## ⚠️ Limitations Connues

1. **Espaces** : InDesign n'exporte pas les espaces entre CharacterStyleRange. Le système ajoute automatiquement des espaces autour des variables.

2. **Conditions multiples** : Un segment ne peut avoir qu'une seule condition (limitation InDesign).

3. **Format strict** : Les noms doivent respecter exactement le format `TXTCOND_` et `TXTVAR_`.

## 🧪 Tests

Script de test disponible :

```bash
npx tsx server/replit_integrations/object_storage/__tests__/testConditionalText.ts
```

## 📚 Documentation

- [CONDITIONAL_TEXT.md](./server/replit_integrations/object_storage/CONDITIONAL_TEXT.md) - Guide utilisateur complet
- [README.md](./server/replit_integrations/object_storage/README.md) - Documentation du module Object Storage
