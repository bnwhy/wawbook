# ✅ Fix complet des espacements IDML

## 🎉 Résolution complète

Tous les espacements IDML sont maintenant détectés et appliqués fidèlement au rendu HTML.

## 🐛 Problèmes corrigés

### 1. Letter-spacing (Tracking)
**Problème** : Tracking de 141 interprété comme 0.141em au lieu de 1.41em

**Solution** : Détection automatique
- Si `@_Tracking > 100` → pourcentage (141 → 1.41em)
- Si `@_Tracking ≤ 100` → 1/1000 em (50 → 0.05em)

**Fichiers** : `idmlParser.ts` lignes ~565-571, ~1036-1039, ~1320-1333

### 2. HorizontalScale (Étirement horizontal)
**Problème** : HorizontalScale 141% non appliqué au rendu, texte trop compact et décalé

**Solution** : Application via `scaleX()` avec compensation de position
- Extraction : `paraHorizontalScale = 141`
- CSS : `transform: ... scaleX(1.41)` + `font-stretch: extra-expanded`
- **Recentrage** : `finalPosX = posX - (width × (scaleX - 1) / 2)`

**Fichiers** :
- `idmlParser.ts` ligne ~1052 (extraction)
- `idmlMerger.ts` lignes ~514-540 (calcul fontStretch et transform)
- `routes.ts` lignes ~606-640 (application au HTML avec compensation)

### 3. VerticalScale (Étirement vertical)
**Problème** : VerticalScale non appliqué

**Solution** : Application via `scaleY()` avec compensation de position
- Extraction : `verticalScale` depuis CharacterStyle
- CSS : `transform: ... scaleY(value)`
- **Recentrage** : `finalPosY = posY - (height × (scaleY - 1) / 2)`

**Fichiers** :
- `idmlParser.ts` ligne ~574 (CharacterStyle)
- `idmlMerger.ts` ligne ~545 (stockage)
- `routes.ts` lignes ~606-640 (application avec compensation)

### 4. Propriétés locales (SpaceBefore, etc.)
**Problème** : Propriétés locales sur ParagraphStyleRange non capturées

**Solution** : Extraction complète dans `extractLocalParagraphStyle()`
- SpaceBefore → marginTop
- SpaceAfter → marginBottom
- FirstLineIndent → textIndent
- LeftIndent, RightIndent
- Leading → lineHeight

**Fichiers** : `idmlMerger.ts` lignes ~423-483

### 5. Propriétés inline (tracking, scales inline)
**Problème** : Propriétés sur CharacterStyleRange non capturées

**Solution** : Extraction de toutes les propriétés inline
- Tracking inline
- HorizontalScale, VerticalScale, Skew inline
- Couleur inline (FillColor)

**Fichiers** : `idmlParser.ts` lignes ~1320-1360

## 📊 Hiérarchie d'application finale

```
inline > local > style > défaut
```

1. **Inline** (CharacterStyleRange) - priorité maximale
2. **Local** (ParagraphStyleRange Properties) - priorité haute
3. **Style** (CharacterStyle ou ParagraphStyle) - priorité normale
4. **Défaut** - fallback

## 🔧 Code final - Application des scales

### Dans `server/routes.ts` (lignes ~606-640)

```typescript
// Appliquer HorizontalScale et VerticalScale
let transformValue = `rotate(${rotation}deg) scale(${1/scaleFactor}, ${1/scaleFactor})`;
let finalPosX = pos.x;
let finalPosY = pos.y;

if (style.idmlHorizontalScale && style.idmlHorizontalScale !== 100) {
  const scaleXValue = style.idmlHorizontalScale / 100;
  const scaleYValue = style.idmlVerticalScale ? style.idmlVerticalScale / 100 : 1;
  
  transformValue = `rotate(...) scale(...) scaleX(${scaleXValue}) scaleY(${scaleYValue})`;
  
  // Compensation pour texte centré
  if (textAlign === 'center') {
    const extraWidth = pos.width * (scaleXValue - 1);
    finalPosX = pos.x - (extraWidth / 2);
  }
  
  if (scaleYValue !== 1) {
    const extraHeight = pos.height * (scaleYValue - 1);
    finalPosY = pos.y - (extraHeight / 2);
  }
} else if (style.idmlVerticalScale && style.idmlVerticalScale !== 100) {
  // VerticalScale seul
  const scaleYValue = style.idmlVerticalScale / 100;
  transformValue = `rotate(...) scale(...) scaleY(${scaleYValue})`;
  
  const extraHeight = pos.height * (scaleYValue - 1);
  finalPosY = pos.y - (extraHeight / 2);
}

// Utiliser finalPosX et finalPosY
const containerStyle = `...left:${finalPosX}px;top:${finalPosY}px;...transform:${transformValue};...`;
```

## 📚 Documentation mise à jour

Tous les espacements IDML sont maintenant documentés et implémentés :

1. **Letter-spacing** (tracking) - ✅ Détection automatique pourcentage vs 1/1000 em
2. **HorizontalScale** - ✅ scaleX() avec compensation de position
3. **VerticalScale** - ✅ scaleY() avec compensation de position
4. **SpaceBefore/After** - ✅ marginTop/Bottom
5. **FirstLineIndent** - ✅ textIndent
6. **LeftIndent/RightIndent** - ✅ paddingLeft/Right
7. **Leading** - ✅ lineHeight
8. **Skew** - ✅ font-style oblique
9. **Transformations inline** - ✅ Toutes capturées

## 🎯 Tests de validation

Pour tester les scales :
1. HorizontalScale 141% → texte étiré horizontalement, centré
2. VerticalScale (si présent) → texte étiré verticalement, centré
3. Combination des deux → étirement dans les deux dimensions
4. Texte aligné à gauche/droite → pas de compensation X (seulement pour center)

## 📝 Référence

Voir aussi :
- `PARSER_IMPROVEMENTS.md` - Améliorations du parser
- `IDML_PROPERTIES_REFERENCE.md` - Référence complète des propriétés
- `IMPLEMENTATION_SUMMARY.md` - Résumé de l'implémentation
