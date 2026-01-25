# Textes Conditionnels IDML

Guide d'utilisation des textes conditionnels avec InDesign et le système de parsing IDML.

## Vue d'ensemble

Les textes conditionnels permettent d'avoir plusieurs versions d'un même texte selon les sélections du wizard utilisateur (ex: version garçon/fille, différents noms de personnages, etc.).

## Configuration dans InDesign

### 1. Créer les conditions

Dans InDesign, créez des conditions avec le format suivant :

```
TXTCOND_tabId_variantId-optionId
```

**Exemples** :
- `TXTCOND_hero-child_gender-boy` (version garçon)
- `TXTCOND_hero-child_gender-girl` (version fille)

### 2. Créer les variables de texte

Créez des variables de texte avec le format :

```
TXTVAR_tabId_variantId
```

**Exemples** :
- `TXTVAR_hero-child_name` (nom du héros enfant)
- `TXTVAR_hero-child_age` (âge du héros enfant)

### 3. Appliquer les conditions et variables

1. Sélectionnez le texte conditionnel
2. Appliquez la condition via le panneau "Conditional Text" d'InDesign
3. Pour insérer une variable : Type > Text Variables > Insert Variable

**Exemple de structure** :
```
[Condition: TXTCOND_hero-child_gender-boy] Le petit
[Condition: TXTCOND_hero-child_gender-girl] La petite
[Pas de condition] TXTVAR_hero-child_name
[Condition: TXTCOND_hero-child_gender-boy] est venu.
[Condition: TXTCOND_hero-child_gender-girl] est venue.
```

## Configuration du Wizard

Le wizard doit avoir un tab correspondant avec les mêmes variants :

```typescript
{
  id: "child",  // ou "hero-child" (mapping automatique)
  label: "Hero child",
  type: "character",
  variants: [
    {
      id: "gender",
      label: "Genre",
      type: "options",
      options: [
        { id: "boy", label: "Garçon" },
        { id: "girl", label: "Fille" }
      ]
    },
    {
      id: "name",
      label: "Nom",
      type: "text"
    }
  ]
}
```

## Mapping Automatique

Le système applique automatiquement le mapping suivant :

- `hero-child` → `child`
- `hero-parent` → `parent`
- `hero-XXX` → `XXX`

Cela permet d'utiliser des conditions IDML avec le préfixe `hero-` tout en ayant des wizard avec des IDs plus courts.

## Résolution des Textes

Lors de la génération du livre, le système :

1. **Filtre les segments** selon les conditions actives
2. **Remplace les variables** par les valeurs du wizard
3. **Ajoute automatiquement des espaces** autour des variables (workaround pour InDesign)

### Exemple

**Sélections wizard** :
```json
{
  "child": {
    "gender": "girl",
    "name": "Lily"
  }
}
```

**Segments IDML** :
```
- "Le petit" [TXTCOND_hero-child_gender-boy] → REJETÉ
- "La petite" [TXTCOND_hero-child_gender-girl] → ACCEPTÉ
- "{TXTVAR_hero-child_name}" → REMPLACÉ par " Lily "
- "est venu." [TXTCOND_hero-child_gender-boy] → REJETÉ
- "est venue." [TXTCOND_hero-child_gender-girl] → ACCEPTÉ
```

**Résultat final** : `"La petite Lily est venue."`

## Fichiers Modifiés

- `server/replit_integrations/object_storage/idmlParser.ts` - Extraction des segments conditionnels
- `server/replit_integrations/object_storage/idmlMerger.ts` - Propagation vers les TextElements
- `server/replit_integrations/object_storage/utils/conditionalTextResolver.ts` - Résolution et remplacement
- `server/routes.ts` - Intégration dans le rendu des pages
- `shared/schema.ts` - Schémas Zod pour validation

## Limitations Connues

1. **Espaces** : InDesign n'exporte pas les espaces entre CharacterStyleRange dans le XML. Le système ajoute automatiquement des espaces autour des variables comme workaround.

2. **Complexité** : Les conditions imbriquées ou multiples ne sont pas supportées. Chaque segment a une seule condition.

3. **Format strict** : Le format de nommage doit être respecté exactement (`TXTCOND_` et `TXTVAR_` sont obligatoires).

## Tests

Un script de test est disponible :

```bash
npx tsx server/replit_integrations/object_storage/__tests__/testConditionalText.ts
```

Il valide :
- L'extraction des segments conditionnels
- Le parsing des conditions et variables
- La résolution selon différentes sélections
- La génération de toutes les variantes possibles
