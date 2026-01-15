# Import Storyboard EPUB + IDML

## Vue d'ensemble

Ce système permet d'importer un storyboard complet en combinant deux fichiers :
- **EPUB** : Contient les images et les positions des zones de texte
- **IDML** : Contient les textes complets avec toute leur mise en forme

## Architecture

```
EPUB (images + positions) + IDML (textes + styles) → ContentConfiguration complète
```

### Répartition des sources

| Donnée | Source | Description |
|--------|--------|-------------|
| Images | EPUB | Toutes les images du storyboard |
| Positions des zones de texte | EPUB | x, y, width, height, rotation, scale |
| Textes complets | IDML | Contenu texte avec variables préservées |
| Styles de texte | IDML | Character Styles + Paragraph Styles complets |
| Dimensions des pages | EPUB | Largeur et hauteur de chaque page |

## Utilisation

### Endpoint

```
POST /api/books/import-storyboard
```

### Request Body (JSON)

```json
{
  "epub": "base64_encoded_epub_file",
  "idml": "base64_encoded_idml_file",
  "bookId": "unique_book_id"
}
```

### Response

```json
{
  "success": true,
  "bookId": "unique_book_id",
  "contentConfig": {
    "pages": [
      { "pageIndex": 1, "width": 595, "height": 842 }
    ],
    "texts": [
      {
        "id": "text-bookId-1-_idContainer001",
        "type": "variable",
        "content": "{{nom_enfant}} adore...",
        "variables": ["nom_enfant"],
        "style": {
          "fontFamily": "Minion Pro",
          "fontSize": "600pt",
          "color": "#000000",
          "letterSpacing": "0.024em",
          "textAlign": "left",
          "lineHeight": "1"
        },
        "position": {
          "pageIndex": 1,
          "x": 194.645,
          "y": 33.659,
          "width": 326.93,
          "height": 105.29,
          "rotation": 0,
          "scaleX": 1,
          "scaleY": 1,
          "layer": 50,
          "zoneId": "body"
        }
      }
    ],
    "imageElements": [...],
    "cssContent": "..."
  },
  "wizardConfig": [...],
  "fontWarnings": [...],
  "stats": {
    "pages": 10,
    "texts": 25,
    "images": 50,
    "fonts": 3
  }
}
```

## Processus d'import

### 1. Export depuis InDesign

#### EPUB (pour images et positions)
- Fichier > Exporter > EPUB (Fixed Layout)
- Options :
  - ✅ Fixed Layout
  - ✅ Inclure les images
  - ✅ Préserver la structure CSS
  - Exporter

#### IDML (pour textes et styles)
- Fichier > Enregistrer sous > InDesign Markup (IDML)
- Sauvegarder

### 2. Import via API

```typescript
// Exemple en TypeScript/JavaScript
const epub = await fileToBase64(epubFile);
const idml = await fileToBase64(idmlFile);

const response = await fetch('/api/books/import-storyboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    epub,
    idml,
    bookId: 'my-book-123'
  })
});

const result = await response.json();
console.log('Import réussi:', result.contentConfig);
```

## Mapping EPUB ↔ IDML

Le mapping entre les zones de texte EPUB et les text frames IDML se fait **automatiquement** par ordre de lecture :

### Algorithme de mapping automatique

1. **Tri des conteneurs EPUB** : par numéro de page, puis par position Y (haut vers bas)
2. **Tri des text frames IDML** : par numéro de page, puis par position Y (haut vers bas)
3. **Association 1:1 dans l'ordre** :
   - 1er conteneur EPUB → 1er text frame IDML
   - 2e conteneur EPUB → 2e text frame IDML
   - 3e conteneur EPUB → 3e text frame IDML
   - Et ainsi de suite...

Cela respecte l'ordre naturel de lecture du document (de haut en bas, de gauche à droite).

### Exemple

**EPUB Page 1 (trié par Y) :**
- [0] `_idContainer001` à y=33.659
- [1] `_idContainer005` à y=49.241
- [2] `_idContainer012` à y=120.500

**IDML (trié par Y) :**
- [0] Story `u121` à y=33.0 : "Ceci est un titre"
- [1] Story `u171` à y=50.0 : "Page 1"
- [2] Story `u189` à y=121.0 : "Il était une fois..."

**Résultat fusionné automatiquement :**
- Zone `_idContainer001` (y=33.659) ← Texte Story `u121` "Ceci est un titre"
- Zone `_idContainer005` (y=49.241) ← Texte Story `u171` "Page 1"
- Zone `_idContainer012` (y=120.500) ← Texte Story `u189` "Il était une fois..."

### Avantages

✅ **Aucune configuration manuelle** nécessaire  
✅ **Fonctionne immédiatement** après l'export InDesign  
✅ **Respecte l'ordre de lecture** du document  
✅ **Indépendant des IDs** InDesign (qui peuvent changer)

### Logs de débogage

Les logs du serveur affichent le mapping effectué pour vérification :

```
[merge] Sorted EPUB containers (by page, then Y):
  [0] Page 1, Container: _idContainer001, Y: 33.7
  [1] Page 1, Container: _idContainer005, Y: 49.2

[merge] Sorted IDML text frames (by page, then Y):
  [0] Page 1, Story ID: u121, Y: 33.0
       Content: "Ceci est un titre..."
  [1] Page 1, Story ID: u171, Y: 50.0
       Content: "Page 1..."

[merge] Starting automatic matching by order...

✓ [merge] AUTO-MATCHED [0]: _idContainer001 (page 1) → Story u121 (page 1)
  Content: "Ceci est un titre..."
✓ [merge] AUTO-MATCHED [1]: _idContainer005 (page 1) → Story u171 (page 1)
  Content: "Page 1..."
```

## Styles extraits de l'IDML

### Character Styles (CharOverride)
- `fontFamily` : Nom de la police
- `fontSize` : Taille en points (pt)
- `fontWeight` : normal, bold
- `fontStyle` : normal, italic
- `color` : Couleur en hex (#RRGGBB)
- `letterSpacing` : Espacement lettres en em
- `baselineShift` : Décalage baseline en pt
- `textDecoration` : none, underline, line-through
- `textTransform` : none, uppercase

### Paragraph Styles (ParaOverride)
- `textAlign` : left, center, right, justify
- `lineHeight` : Interlignage (ratio)
- `whiteSpace` : normal, nowrap, pre-wrap
- `marginTop` : Espace avant en pt
- `marginBottom` : Espace après en pt
- `textIndent` : Retrait 1ère ligne en pt

## Variables de texte

Les variables sont préservées au format `{nom_variable}` dans l'IDML et converties en `{{nom_variable}}` dans le résultat final.

Variables supportées :
- `{nom_enfant}` → `{{nom_enfant}}`
- `{age}` → `{{age}}`
- `{dedication}` → `{{dedication}}`
- Toutes les variables personnalisées

## Textes conditionnels

Les textes conditionnels InDesign sont extraits depuis l'IDML avec leurs conditions d'affichage.

Structure :
```json
{
  "conditions": [
    { "name": "Condition_Boy", "visible": true },
    { "name": "Condition_Girl", "visible": false }
  ]
}
```

## Gestion des erreurs

| Erreur | Action |
|--------|--------|
| IDML manquant | Retourne erreur 400 |
| EPUB manquant | Retourne erreur 400 |
| Mapping impossible | Log warning, ignore la zone |
| Styles incomplets | Utilise valeurs par défaut |
| Text frame manquant | Ignore la zone EPUB |

## Fichiers modifiés

- `server/replit_integrations/object_storage/idmlParser.ts` (nouveau)
- `server/replit_integrations/object_storage/routes.ts` (modifié)
- `package.json` (dépendance fast-xml-parser ajoutée)
