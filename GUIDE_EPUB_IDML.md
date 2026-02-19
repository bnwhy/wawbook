# Guide Import EPUB + IDML

## 📋 Référence Rapide (30 secondes)

### Règle d'or

```
EPUB = Images + Conteneurs vides + Positions (OÙ)
IDML = Texte + Mise en forme complète (QUOI + COMMENT)
```

### Où trouve-t-on... ?

| Information | EPUB | IDML |
|------------|------|------|
| **Contenu textuel** | ❌ | ✅ |
| **Polices (fontFamily)** | ❌ | ✅ |
| **Styles (fontSize, color, etc.)** | ❌ | ✅ |
| **Positions (x, y, w, h)** | ✅ | ❌ |
| **Images** | ✅ | ❌ |
| **Dimensions pages** | ✅ | ❌ |

### Code rapide

```typescript
// ❌ FAUX - L'EPUB contient des conteneurs VIDES
const text = epubPosition.content;      // undefined
const font = epubPosition.fontFamily;   // undefined

// ✅ CORRECT - Tout vient de l'IDML
const text = idmlFrame.content;         // "Bonjour {{nom_enfant}} !"
const font = idmlFrame.inlineCharProperties?.fontFamily 
  || idmlCharStyles[styleId]?.fontFamily 
  || idmlParaStyles[paraId]?.fontFamily;  // "Minion Pro"
```

---

## 🏗️ Architecture Détaillée

### Vue d'ensemble

L'EPUB ne contient **AUCUNE information sur le texte ni les polices**. Toutes ces informations proviennent exclusivement de l'IDML.

### Répartition des données

#### EPUB - Images, Positions et Conteneurs vides uniquement

L'EPUB fournit :
- ✅ **Images** : toutes les images du storyboard
- ✅ **Conteneurs de texte VIDES** : positions uniquement (x, y, width, height, rotation, scaleX, scaleY)
- ✅ **Dimensions des pages** : largeur et hauteur de chaque page
- ✅ **CSS** : pour extraire les positions et transformations des conteneurs

L'EPUB ne contient PAS :
- ❌ **Contenu textuel** (les conteneurs sont vides)
- ❌ **Polices / fontFamily** (vient de l'IDML)
- ❌ **Mise en forme** (fontSize, color, fontWeight, textAlign, etc. - vient de l'IDML)

#### IDML - Texte et mise en forme complète (source unique)

L'IDML fournit **toutes** les informations textuelles et de mise en forme :
- ✅ **Contenu textuel complet** avec variables ({nom_enfant}, {age}, etc.)
- ✅ **Polices (fontFamily)** pour chaque zone de texte
- ✅ **Character Styles** : fontSize, fontWeight, fontStyle, color, letterSpacing, baselineShift, textDecoration, textTransform
- ✅ **Paragraph Styles** : textAlign, lineHeight, whiteSpace, marginTop, marginBottom, textIndent
- ✅ **Palette de couleurs** InDesign (convertie en hex)

### Processus de fusion

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPORT STORYBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 EPUB                           📦 IDML                      │
│  ├─ Images                         ├─ Texte complet            │
│  ├─ Conteneurs vides               ├─ Mise en forme complète : │
│  ├─ Positions (x, y, w, h)         │  • Polices (fontFamily)   │
│  └─ Dimensions pages               │  • Character Styles       │
│                                    │  • Paragraph Styles       │
│                                    └  • Couleurs               │
│                                                                 │
│                    ⬇️  FUSION  ⬇️                                │
│                                                                 │
│  📝 Zones de texte complètes                                    │
│  ├─ Position ← EPUB (conteneur vide)                           │
│  ├─ Contenu ← IDML (texte)                                     │
│  ├─ Police ← IDML (fontFamily)                                 │
│  └─ Styles ← IDML (mise en forme)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Exemple concret

#### Données dans l'EPUB

```typescript
{
  containerId: "_idContainer005",
  pageIndex: 1,
  position: {
    x: 194.645,
    y: 33.659,
    width: 326.93,
    height: 105.29,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  }
  // ⚠️ Conteneur VIDE : pas de contenu, pas de police, pas de styles
}
```

#### Données dans l'IDML

```typescript
{
  id: "u121",
  content: "Bonjour {{nom_enfant}} !",
  variables: ["nom_enfant"],
  appliedCharacterStyle: "CharacterStyle/$ID/BoldStyle",
  appliedParagraphStyle: "ParagraphStyle/$ID/CenterAlign",
  inlineCharProperties: {
    fontFamily: "Minion Pro",
    fontSize: 24
  }
}
```

#### Résultat fusionné

```typescript
{
  id: "text-bookId-1-_idContainer005",
  type: "variable",
  content: "Bonjour {{nom_enfant}} !",
  variables: ["nom_enfant"],
  style: {
    fontFamily: "Minion Pro",        // ← depuis IDML
    fontSize: "24pt",                 // ← depuis IDML
    fontWeight: "bold",               // ← depuis IDML Character Style
    color: "#000000",                 // ← depuis IDML
    textAlign: "center",              // ← depuis IDML Paragraph Style
    lineHeight: "1.2"                 // ← depuis IDML
  },
  position: {
    pageIndex: 1,
    x: 194.645,                       // ← depuis EPUB
    y: 33.659,                        // ← depuis EPUB
    width: 326.93,                    // ← depuis EPUB
    height: 105.29,                   // ← depuis EPUB
    rotation: 0,                      // ← depuis EPUB
    scaleX: 1,                        // ← depuis EPUB
    scaleY: 1,                        // ← depuis EPUB
    layer: 50,
    zoneId: "body"
  }
}
```

---

## 🎨 Guide des Polices

### Règle absolue

```
LES POLICES (fontFamily) DOIVENT OBLIGATOIREMENT ÊTRE DANS L'IDML
```

**Il n'y a AUCUN fallback vers le CSS de l'EPUB.**

### Hiérarchie des polices (IDML UNIQUEMENT)

Les polices sont résolues selon cette priorité (de la plus haute à la plus basse) :

1. **Inline Character Properties** (IDML)
   - Propriétés appliquées directement sur le texte dans InDesign
   - Le plus spécifique, priorité absolue

2. **Applied Character Style** (IDML)
   - Style de caractère nommé appliqué au texte
   - Contient fontFamily, fontSize, color, etc.

3. **Paragraph Style** (IDML)
   - Style de paragraphe (contient aussi fontFamily)
   - Utilisé quand aucun Character Style n'est appliqué

**⚠️ IMPORTANT : Si aucune police n'est trouvée dans l'IDML, c'est une ERREUR.**

Le navigateur utilisera sa police par défaut (généralement Times New Roman ou Arial), ce qui est incorrect.

### Rôle du CSS de l'EPUB

Le CSS de l'EPUB sert **UNIQUEMENT** à :
- Extraire les positions et transformations (width, height, translate, rotate, scale)
- Charger les fichiers de polices TTF/OTF dans le navigateur via `@font-face`

Le CSS **NE SERT PAS** à :
- ❌ Définir quelle police utiliser pour une zone de texte
- ❌ Servir de fallback si l'IDML n'a pas de police

### Checklist avant export depuis InDesign

- [ ] Tous les textes ont un style appliqué (Character ou Paragraph)
- [ ] Tous les styles définissent une police
- [ ] Vérifier dans InDesign : Panneau "Styles" → vérifier que chaque style a une police
- [ ] Exporter IDML
- [ ] Vérifier les logs après import

### Vérification après import

Logs du serveur à surveiller :

```bash
[createMergedText]   CharStyle fontFamily: Minion Pro  ✅ OK
[createMergedText]   CharStyle fontFamily: UNDEFINED   ❌ ERREUR
```

Si vous voyez "UNDEFINED", c'est que l'IDML ne contient pas la police.

---

## 📁 Modules du Code Source

### Extraction et parsing

#### `epubExtractor.ts`
- Fonction principale : `extractEpubFromBuffer()`
- Extrait : images, textPositions (sans contenu), pages, cssFontMapping (non utilisé)
- Retourne des conteneurs VIDES avec positions uniquement

#### `idmlParser.ts`
- Fonction principale : `parseIdmlBuffer()`
- Extrait : textFrames (avec contenu + polices), characterStyles, paragraphStyles, colors
- Source UNIQUE de toutes les informations textuelles

### Fusion

#### `idmlMerger.ts`
- Fonction principale : `mergeEpubWithIdml()`
- Associe chaque position EPUB avec le texte et les styles correspondants de l'IDML
- Résout la police selon la hiérarchie IDML

### Configuration

#### `wizardConfigBuilder.ts`
- Génère la configuration wizard depuis les caractéristiques d'images

### Utilitaires

- `colorConverter.ts` - Conversion couleurs IDML → Hex
- `cssHelpers.ts` - Nettoyage CSS et détection problèmes polices
- `filenameParser.ts` - Parsing noms de fichiers avec caractéristiques
- `fontNameParser.ts` - Parsing noms de fichiers de polices
- `fontPreflight.ts` - Vérification disponibilité polices
- `contentTypeHelpers.ts` - Gestion types MIME et chemins

### Routes API

#### `routes.ts`
- POST `/api/books/import-storyboard` - Import complet EPUB + IDML
- POST `/api/books/check-import` - Vérification avant import
- POST `/api/books/test-idml` - Test parsing IDML (diagnostic)

---

## 🔧 Guide d'Import

### 1. Préparation dans InDesign

1. Créer le storyboard dans InDesign
2. Appliquer des styles à tous les textes
3. Vérifier que chaque style définit une police
4. Exporter en **EPUB (Fixed Layout)**
5. Exporter en **IDML**

### 2. Fichiers nécessaires

- ✅ Fichier EPUB (.epub)
- ✅ Fichier IDML (.idml)
- ✅ Fichiers de polices TTF/OTF utilisés

### 3. Upload via l'API

```typescript
POST /api/books/import-storyboard

FormData:
- epub: fichier .epub
- idml: fichier .idml
- fonts[]: fichiers .ttf/.otf
- bookId: ID du livre
```

### 4. Mapping automatique EPUB ↔ IDML

Le mapping est **automatique et déterministe** :
- Ordre de lecture : haut → bas, gauche → droite
- Sur chaque page séparément
- 1ère zone EPUB → 1er texte IDML
- 2ème zone EPUB → 2ème texte IDML
- etc.

---

## 🐛 Débogage

### Problème : Texte vide

**Cause** : Chercher le texte dans l'EPUB  
**Solution** : Le texte vient UNIQUEMENT de l'IDML

```typescript
// ❌ FAUX
const text = epubPosition.content;  // undefined

// ✅ CORRECT
const text = idmlFrame.content;  // "Bonjour {{nom_enfant}} !"
```

### Problème : Police manquante ou incorrecte

**Cause** : Police non définie dans l'IDML  
**Solution** :

1. Vérifier que la police est OBLIGATOIREMENT dans l'IDML
2. Vérifier les logs : `[createMergedText] CharStyle fontFamily:`
3. Dans InDesign, appliquer un style avec police à tous les textes
4. Re-exporter l'IDML

### Problème : Mapping incorrect

**Cause** : Ordre des zones différent entre EPUB et IDML  
**Solution** :

1. Vérifier les logs `[merge]` pour voir le mapping
2. Dans InDesign, réorganiser les zones dans l'ordre de lecture
3. Re-exporter EPUB et IDML

### Logs utiles

```bash
# Mapping EPUB → IDML
[merge] Mapping EPUB → IDML: page 1
[merge]   EPUB #0 → IDML #0 (u121)

# Résolution des polices
[createMergedText] Resolving font for text u121
[createMergedText]   CharStyle fontFamily: Minion Pro

# Extraction EPUB
[epub] Extracted 15 text positions (empty containers)
[epub] Extracted 8 images

# Parsing IDML
[idml] Parsed 15 text frames
[idml] Extracted 12 character styles
[idml] Extracted 8 paragraph styles
```

---

## ❓ FAQ

### Q : Où se trouve le texte des zones de texte ?

**R :** Dans l'IDML uniquement. L'EPUB ne contient que les positions des conteneurs vides.

### Q : Comment les polices sont-elles déterminées ?

**R :** Depuis l'IDML UNIQUEMENT selon cette hiérarchie :
1. Inline Character Properties
2. Applied Character Style
3. Paragraph Style

Il n'y a **AUCUN fallback** vers le CSS de l'EPUB.

### Q : Pourquoi mes polices ne s'affichent pas ?

**R :** Vérifiez que :
1. Les polices (fontFamily) sont OBLIGATOIREMENT définies dans l'IDML
2. Les fichiers TTF/OTF ont été uploadés
3. Les logs ne montrent pas "UNDEFINED" pour fontFamily

### Q : Comment fonctionne le mapping EPUB ↔ IDML ?

**R :** Automatique par ordre de lecture (haut → bas, gauche → droite) sur chaque page séparément.

### Q : Que contient vraiment l'EPUB ?

**R :** 
- ✅ Images
- ✅ Positions des zones (x, y, w, h)
- ✅ Dimensions des pages
- ❌ Aucun texte (conteneurs vides)
- ❌ Aucune police
- ❌ Aucun style

---

## 📚 Résumé

### Points clés à retenir

1. **L'EPUB ne contient AUCUNE information sur le texte ni les polices**
2. **Toutes les informations textuelles viennent de l'IDML**
3. **Les polices sont résolues selon une hiérarchie IDML stricte**
4. **Le mapping EPUB ↔ IDML est automatique et déterministe**
5. **Les fichiers de polices doivent être uploadés séparément**

### En une phrase

```
EPUB = Conteneurs vides + Positions (OÙ mettre les choses)
IDML = Texte + Mise en forme (QUOI mettre et COMMENT)
```

---

**Documentation complète** : Voir aussi `server/services/object_storage/IDML_IMPORT.md` pour plus de détails techniques.

**Dernière mise à jour** : Janvier 2026
