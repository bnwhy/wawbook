# Référence complète des propriétés IDML extraites

Ce document liste toutes les propriétés IDML extraites par notre parseur et leur équivalent CSS/HTML.

**Date de mise à jour** : Janvier 2026  
**Spécification IDML** : Version 8.0 + Extensions Creative Cloud 2024-2026  
**Niveau d'implémentation** : Priorités 1, 2 et 3 (50+ propriétés)

---

## Table des matières

1. [Propriétés de caractère (CharacterStyle)](#propriétés-de-caractère)
2. [Propriétés de paragraphe (ParagraphStyle)](#propriétés-de-paragraphe)
3. [Équivalences CSS](#équivalences-css)
4. [Propriétés IDML sans équivalent CSS](#propriétés-sans-équivalent-css)
5. [Notes d'implémentation](#notes-dimplémentation)

---

## Propriétés de caractère

### ✅ Priorité 1 : ESSENTIEL (Impact visuel majeur)

| Propriété IDML | Attribut XML | Type | CSS Équivalent | Notes |
|----------------|--------------|------|----------------|-------|
| **Font Family** | `@_AppliedFont` | String | `font-family` | Police de caractère |
| **Font Size** | `@_PointSize` | Number | `font-size` | Taille en points |
| **Font Weight** | `@_FontStyle` | String | `font-weight` | Dérivé du style (Bold, etc.) |
| **Font Style** | `@_FontStyle` | String | `font-style` | Dérivé du style (Italic, etc.) |
| **Fill Color** | `@_FillColor` | String | `color` | Couleur de remplissage |
| **Fill Tint** | `@_FillTint` | Number | `opacity` (partiel) | Teinte de couleur (0-100%) |
| **Stroke Color** | `@_StrokeColor` | String | `-webkit-text-stroke-color` | Couleur du contour |
| **Stroke Weight** | `@_StrokeWeight` | Number | `-webkit-text-stroke-width` | Épaisseur du contour |
| **Stroke Tint** | `@_StrokeTint` | Number | - | Teinte du contour (stocké pour référence) |
| **Tracking** | `@_Tracking` | Number | `letter-spacing` | Espacement lettres (1/1000 em) |
| **Baseline Shift** | `@_BaselineShift` | Number | `baseline-shift` | Décalage vertical |
| **Horizontal Scale** | `@_HorizontalScale` | Number | `font-stretch` | Échelle horizontale (%) |
| **Vertical Scale** | `@_VerticalScale` | Number | - | Échelle verticale (stocké) |
| **Skew** | `@_Skew` | Number | `font-style: oblique Xdeg` | Inclinaison en degrés |
| **Kerning Method** | `@_KerningMethod` | Enum | `font-kerning` | Optical/Metrics/None |
| **Ligatures** | `@_Ligatures` | Boolean | `font-variant-ligatures` | Ligatures activées/désactivées |
| **No Break** | `@_NoBreak` | Boolean | `white-space: nowrap` | Empêcher coupure de ligne |
| **Position** | `@_Position` | Enum | `vertical-align` | Superscript/Subscript/Normal |
| **Underline** | `@_Underline` | Boolean | `text-decoration` | Soulignement |
| **Underline Color** | `@_UnderlineColor` | String | `text-decoration-color` | Couleur du soulignement |
| **Underline Weight** | `@_UnderlineWeight` | Number | `text-decoration-thickness` | Épaisseur soulignement |
| **Underline Offset** | `@_UnderlineOffset` | Number | `text-underline-offset` | Décalage vertical |
| **Underline Type** | `@_UnderlineType` | Enum | `text-decoration-style` | Solid/Dashed/Dotted/Wavy |
| **Strike Through** | `@_StrikeThru` | Boolean | `text-decoration` | Barré |
| **Strike Through Color** | `@_StrikeThroughColor` | String | - | Couleur barré (stocké) |
| **Strike Through Weight** | `@_StrikeThroughWeight` | Number | - | Épaisseur barré (stocké) |
| **Strike Through Offset** | `@_StrikeThroughOffset` | Number | - | Décalage barré (stocké) |
| **Strike Through Type** | `@_StrikeThroughType` | Enum | - | Type de ligne barré (stocké) |
| **Text Decoration** | `@_Underline`, `@_StrikeThru` | Boolean | `text-decoration` | Dérivé |
| **Capitalization** | `@_Capitalization` | Enum | `text-transform` | AllCaps/SmallCaps/Normal |
| **Overprint Fill** | `@_OverprintFill` | Boolean | - | Surimpression remplissage |
| **Overprint Stroke** | `@_OverprintStroke` | Boolean | - | Surimpression contour |

### 🟡 Priorité 2 : IMPORTANT (Améliore la fidélité)

| Propriété IDML | Attribut XML | Type | CSS Équivalent | Notes |
|----------------|--------------|------|----------------|-------|
| **OTF Contextual Alternate** | `@_OTFContextualAlternate` | Boolean | `font-feature-settings: "calt"` | Alternates contextuelles |
| **OTF Discretionary Ligature** | `@_OTFDiscretionaryLigature` | Boolean | `font-feature-settings: "dlig"` | Ligatures discrétionnaires |
| **OTF Fraction** | `@_OTFFraction` | Boolean | `font-feature-settings: "frac"` | Fractions OpenType |
| **OTF Historical** | `@_OTFHistorical` | Boolean | `font-feature-settings: "hist"` | Formes historiques |
| **OTF Ordinal** | `@_OTFOrdinal` | Boolean | `font-feature-settings: "ordn"` | Ordinaux (1st, 2nd, etc.) |
| **OTF Slashed Zero** | `@_OTFSlashedZero` | Boolean | `font-feature-settings: "zero"` | Zéro barré |
| **OTF Swash** | `@_OTFSwash` | Boolean | `font-feature-settings: "swsh"` | Caractères ornés |
| **OTF Titling** | `@_OTFTitling` | Boolean | `font-feature-settings: "titl"` | Formes de titrage |
| **OTF Stylistic Sets** | `@_OTFStylisticSets` | String | `font-feature-settings: "ss01", "ss03"` | Sets stylistiques (ex: "ss01 ss03") |
| **Glyph Form** | `@_GlyphForm` | Enum | - | JIS78/JIS83/Traditional/Expert (stocké) |

---

## Propriétés de paragraphe

### ✅ Priorité 1 : ESSENTIEL

| Propriété IDML | Attribut XML | Type | CSS Équivalent | Notes |
|----------------|--------------|------|----------------|-------|
| **Justification** | `@_Justification` | Enum | `text-align` | LeftAlign/Center/RightAlign/Justify |
| **Leading** | `@_Leading` | Number | `line-height` | Interlignage en points |
| **Space Before** | `@_SpaceBefore` | Number | `margin-top` | Espace avant paragraphe |
| **Space After** | `@_SpaceAfter` | Number | `margin-bottom` | Espace après paragraphe |
| **First Line Indent** | `@_FirstLineIndent` | Number | `text-indent` | Retrait première ligne |
| **Left Indent** | `@_LeftIndent` | Number | `padding-left` | Retrait gauche |
| **Right Indent** | `@_RightIndent` | Number | `padding-right` | Retrait droit |
| **Hyphenate** | `@_Hyphenate` | Boolean | `hyphens` | Césure auto/none |
| **Applied Language** | `@_AppliedLanguage` | String | `lang` attribute | Langue ($ID/French → fr) |
| **Composer** | `@_Composer` | String | - | Moteur de composition (stocké) |
| **Keep Lines Together** | `@_KeepLinesTogether` | Boolean | `white-space` | Garder lignes ensemble |

### 🟡 Priorité 2 : IMPORTANT

| Propriété IDML | Attribut XML | Type | CSS Équivalent | Notes |
|----------------|--------------|------|----------------|-------|
| **Auto Leading** | `@_AutoLeading` | Number | - | % de fontSize (défaut 120%) |
| **Leading Model** | `@_LeadingModel` | Enum | - | TopDown/Baseline/CenterDown |
| **Drop Cap Characters** | `@_DropCapCharacters` | Number | `::first-letter` | Nb de caractères en lettrine |
| **Drop Cap Lines** | `@_DropCapLines` | Number | `::first-letter` | Nb de lignes de hauteur |
| **Keep With Next** | `@_KeepWithNext` | Boolean | `page-break-after: avoid` | Garder avec paragraphe suivant |
| **Keep First Lines** | `@_KeepFirstLines` | Number | - | Nb lignes à garder au début |
| **Keep Last Lines** | `@_KeepLastLines` | Number | - | Nb lignes à garder à la fin |
| **Keep All Lines Together** | `@_KeepAllLinesTogether` | Boolean | `page-break-inside: avoid` | Forcer toutes lignes ensemble |
| **Desired Letter Spacing** | `@_DesiredLetterSpacing` | Number | - | Espacement lettres désiré (%) |
| **Desired Word Spacing** | `@_DesiredWordSpacing` | Number | `word-spacing` | Espacement mots désiré (%) |
| **Desired Glyph Scaling** | `@_DesiredGlyphScaling` | Number | - | Échelle glyphes désirée (%) |
| **Single Word Justification** | `@_SingleWordJustification` | Enum | - | Comment justifier un mot seul |
| **Balance Ragged Lines** | `@_BalanceRaggedLines` | Boolean | - | Équilibrer lignes non justifiées |

### 🔵 Priorité 3 : AVANCÉ

| Propriété IDML | Attribut XML | Type | CSS Équivalent | Notes |
|----------------|--------------|------|----------------|-------|
| **Paragraph Direction** | `@_ParagraphDirection` | Enum | `direction` | LTR/RTL |
| **Minimum Letter Spacing** | `@_MinimumLetterSpacing` | Number | - | Min espacement lettres (%) |
| **Maximum Letter Spacing** | `@_MaximumLetterSpacing` | Number | - | Max espacement lettres (%) |
| **Minimum Word Spacing** | `@_MinimumWordSpacing` | Number | - | Min espacement mots (%) |
| **Maximum Word Spacing** | `@_MaximumWordSpacing` | Number | - | Max espacement mots (%) |
| **Minimum Glyph Scaling** | `@_MinimumGlyphScaling` | Number | - | Min échelle glyphes (%) |
| **Maximum Glyph Scaling** | `@_MaximumGlyphScaling` | Number | - | Max échelle glyphes (%) |
| **Hyphenate Before Last** | `@_HyphenateBeforeLast` | Number | `hyphenate-limit-chars` | Nb caractères avant dernier trait |
| **Hyphenate After First** | `@_HyphenateAfterFirst` | Number | `hyphenate-limit-chars` | Nb caractères après premier trait |
| **Hyphenate Capitalized Words** | `@_HyphenateCapitalizedWords` | Boolean | - | Césure des mots capitalisés |
| **Hyphenate Ladder Limit** | `@_HyphenateLadderLimit` | Number | `hyphenate-limit-lines` | Nb max traits d'union consécutifs |
| **Hyphenate Words Longer Than** | `@_HyphenateWordsLongerThan` | Number | - | Longueur min des mots à couper |
| **Hyphenation Zone** | `@_HyphenationZone` | Number | - | Zone de césure en points |
| **Hyphen Weight** | `@_HyphenWeight` | Number | - | Poids de la césure |

---

## Équivalences CSS

### Transformations de texte

```css
/* Horizontal Scale */
font-stretch: ultra-condensed | extra-condensed | condensed | semi-condensed | 
              normal | semi-expanded | expanded | extra-expanded | ultra-expanded;

/* Skew */
font-style: oblique 15deg; /* CSS Fonts Level 4 */

/* Kerning */
font-kerning: none | normal | auto;

/* Ligatures */
font-variant-ligatures: none | common-ligatures;
```

### OpenType Features

```css
/* Multiple features */
font-feature-settings: "calt", "dlig", "frac", "ss01", "ss03";

/* Position alternatives */
font-feature-settings: "numr"; /* OTNumerator */
font-feature-settings: "dnom"; /* OTDenominator */
```

### Soulignement avancé

```css
text-decoration: underline;
text-decoration-color: #ff0000;
text-decoration-thickness: 2pt;
text-underline-offset: 3pt;
text-decoration-style: solid | dashed | dotted | wavy;
```

### Direction et langue

```css
direction: ltr | rtl;
unicode-bidi: embed;
```

```html
<p lang="fr">Texte en français</p>
```

### Césure

```css
hyphens: auto | none | manual;
-webkit-hyphens: auto;
hyphenate-limit-chars: 6 3 auto;
hyphenate-limit-lines: 2;
```

### Pagination

```css
page-break-after: avoid;
page-break-inside: avoid;
break-after: avoid;
break-inside: avoid;
```

---

## Propriétés IDML sans équivalent CSS

Ces propriétés sont extraites et stockées avec le préfixe `idml` pour référence, mais n'ont pas d'équivalent CSS direct :

| Propriété | Raison | Stockage |
|-----------|--------|----------|
| **Vertical Scale** | Pas d'équivalent CSS sans `transform` | `idmlVerticalScale` |
| **Stroke Tint** | CSS ne supporte pas les teintes de contour | `idmlStrokeTint` |
| **Fill Tint** | Nécessite manipulation de couleur | `idmlFillTint` |
| **Strike Through Color/Weight/Offset** | CSS ne permet pas de customiser le barré | `idmlStrikeThroughColor`, etc. |
| **Glyph Form** | Spécifique CJK, pas d'équivalent | `idmlGlyphForm` |
| **Composer** | Algorithme de composition | `idmlComposer` |
| **Auto Leading** | Calcul automatique de l'interlignage | `idmlAutoLeading` |
| **Leading Model** | Modèle d'interlignage | `idmlLeadingModel` |
| **Min/Max Letter/Word/Glyph Spacing** | CSS n'a pas de notion de min/max | `idmlMinimumLetterSpacing`, etc. |
| **Keep First/Last Lines** | Contrôle précis de pagination | `idmlKeepFirstLines`, etc. |
| **Single Word Justification** | Comportement spécifique InDesign | `idmlSingleWordJustification` |
| **Overprint Fill/Stroke** | Spécifique impression | `idmlOverprintFill`, etc. |

---

## Notes d'implémentation

### 1. Hiérarchie des styles

Les styles sont appliqués dans cet ordre (du plus général au plus spécifique) :

1. **ParagraphStyle** → Styles de base du paragraphe
2. **CharacterStyle** → Styles de caractère appliqués
3. **Inline Properties** → Surcharges locales (priorité maximale)
4. **Local Paragraph Properties** → Justification locale, etc.

### 2. Gestion de l'héritage

Les styles peuvent hériter d'autres styles via `@_BasedOn`. Le parseur résout récursivement l'héritage jusqu'à trouver toutes les propriétés.

### 3. Valeurs par défaut

Pour optimiser la taille du JSON, seules les valeurs différentes des défauts sont stockées :

- `horizontalScale` : 100
- `verticalScale` : 100
- `skew` : 0
- `autoLeading` : 120
- `fillTint` : 100
- `strokeTint` : 100
- `hyphenate` : false

### 4. Drop Caps

Les lettrines nécessitent un traitement spécial côté client :

```javascript
// Exemple de génération de style pour lettrine
if (style.dropCap) {
  const { characters, lines } = style.dropCap;
  element.style.setProperty('--drop-cap-lines', lines);
  element.classList.add('has-drop-cap');
}
```

```css
.has-drop-cap::first-letter {
  float: left;
  font-size: calc(var(--drop-cap-lines) * 1em);
  line-height: var(--drop-cap-lines);
  padding-right: 0.1em;
}
```

### 5. Conversion de langues

```typescript
const langMap: Record<string, string> = {
  '$ID/French': 'fr',
  '$ID/English': 'en',
  '$ID/Spanish': 'es',
  '$ID/German': 'de',
  '$ID/Italian': 'it',
  '$ID/Portuguese': 'pt',
  '$ID/Dutch': 'nl',
  '$ID/Japanese': 'ja',
  '$ID/Chinese': 'zh',
  '$ID/Korean': 'ko',
  '$ID/Russian': 'ru',
  '$ID/Arabic': 'ar',
  '$ID/Hebrew': 'he'
};
```

### 6. Font-stretch mapping

```typescript
// HorizontalScale (%) → font-stretch
if (scalePercent < 62.5) return 'ultra-condensed';
else if (scalePercent < 75) return 'extra-condensed';
else if (scalePercent < 87.5) return 'condensed';
else if (scalePercent < 93.75) return 'semi-condensed';
else if (scalePercent <= 106.25) return 'normal';
else if (scalePercent < 112.5) return 'semi-expanded';
else if (scalePercent < 125) return 'expanded';
else if (scalePercent < 150) return 'extra-expanded';
else return 'ultra-expanded';
```

### 7. Limitations connues

1. **Vertical Scale** : Pas d'équivalent CSS sans utiliser `transform: scaleY()` qui affecte le layout
2. **Min/Max spacing** : CSS ne supporte que les valeurs fixes pour `letter-spacing` et `word-spacing`
3. **Strike Through customization** : CSS ne permet pas de personnaliser la couleur, épaisseur et décalage du barré
4. **Glyph Scaling** : Pas d'équivalent CSS pour l'échelle horizontale des glyphes en justification
5. **Keep Lines** : `page-break-inside: avoid` est approximatif comparé au contrôle précis InDesign

---

## Propriétés CJK non implémentées

Les propriétés suivantes sont définies dans la spécification IDML mais **non implémentées** dans notre parseur (car non nécessaires pour le contenu occidental) :

- Tatechuyoko (caractères horizontaux dans texte vertical)
- AutoTcy (rotation automatique)
- Warichu (notes latérales inline)
- Kenten (marques d'accentuation)
- Ruby (annotations phonétiques)
- Kinsoku (règles de coupure de ligne japonaises)
- Tsume, Jidori, Shatai (propriétés typographiques japonaises)
- Grid properties (alignement sur grille CJK)

Ces propriétés peuvent être ajoutées ultérieurement si nécessaire.

---

## Références

- **IDML File Format Specification Version 8.0** (Adobe, 2012)
- **Adobe InDesign DOM API** (developer.adobe.com/indesign/dom/api)
- **Common Text Properties** (paperzz.com IDML spec)
- **OpenType Feature Registry** (Microsoft Typography)
- **CSS Fonts Module Level 4** (W3C)

---

**Dernière mise à jour** : Janvier 2026  
**Version du parseur** : 2.0  
**Propriétés extraites** : 50+ (Priorités 1, 2 et 3)
