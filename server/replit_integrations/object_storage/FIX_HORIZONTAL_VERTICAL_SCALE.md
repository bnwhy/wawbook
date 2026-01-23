# Fix - HorizontalScale et VerticalScale appliqués correctement

## ✅ Problème résolu

Le texte dans InDesign utilise `HorizontalScale = 141%` et potentiellement `VerticalScale`, mais le rendu HTML ne les appliquait pas correctement, causant :
- Texte trop compact horizontalement
- Texte décalé vers la droite au lieu d'être centré

## 🔧 Solution implémentée

### 1. Extraction (déjà en place)

Les valeurs sont correctement extraites dans `idmlParser.ts` et `idmlMerger.ts` :
- `paraHorizontalScale` : 141 (depuis ParagraphStyle)
- `idmlVerticalScale` : valeur depuis CharacterStyle ou ParagraphStyle
- Stockées dans `content.json` : `"idmlHorizontalScale": 141`

### 2. Application au rendu HTML

**Fichier modifié** : `server/routes.ts` (lignes ~606-640)

```typescript
// Appliquer HorizontalScale et VerticalScale via scaleX() et scaleY()
let transformValue = `rotate(...) scale(${1/scaleFactor}, ${1/scaleFactor})`;
let finalPosX = pos.x;
let finalPosY = pos.y;

if (style.idmlHorizontalScale && style.idmlHorizontalScale !== 100) {
  const scaleXValue = style.idmlHorizontalScale / 100; // 141 → 1.41
  const scaleYValue = style.idmlVerticalScale ? style.idmlVerticalScale / 100 : 1;
  
  transformValue = `rotate(...) scale(...) scaleX(${scaleXValue}) scaleY(${scaleYValue})`;
  
  // IMPORTANT: Compenser le décalage pour texte centré
  if (textAlign === 'center') {
    const extraWidth = pos.width * (scaleXValue - 1);
    finalPosX = pos.x - (extraWidth / 2); // Recentrer horizontalement
  }
  
  if (scaleYValue !== 1) {
    const extraHeight = pos.height * (scaleYValue - 1);
    finalPosY = pos.y - (extraHeight / 2); // Recentrer verticalement
  }
}

// Utiliser finalPosX et finalPosY dans le containerStyle
const containerStyle = `...left:${finalPosX}px;top:${finalPosY}px;...transform:${transformValue};...`;
```

### 3. Ajout de font-stretch

En plus de `scaleX()`, on ajoute aussi `font-stretch` pour une meilleure compatibilité :

```typescript
const fontStretchCss = style.fontStretch ? `font-stretch:${style.fontStretch};` : '';
// Ajouté au containerStyle
```

## 📐 Calcul du recentrage

### Pour HorizontalScale = 141% sur texte centré

**Exemple avec "Le château"** :
- Position originale X : `36px`
- Largeur : `557.29px`
- ScaleX : `1.41`
- Espace supplémentaire : `557.29 × (1.41 - 1) = 557.29 × 0.41 ≈ 228px`
- Décalage vers la gauche : `228 / 2 = 114px`
- **Position finale** : `36 - 114 = -78px` ✅

Cela compense exactement le décalage causé par `transform-origin: 0 0`.

### Pour VerticalScale

Même logique :
- `extraHeight = height × (scaleYValue - 1)`
- `finalPosY = pos.y - (extraHeight / 2)`

## 🎯 Résultat

Le CSS généré contient maintenant :
```css
.text-container {
  position: absolute;
  left: -78px;  /* Ajusté pour recentrer */
  top: 31px;
  font-stretch: extra-expanded;
  transform: rotate(0deg) scale(0.05, 0.05) scaleX(1.41);
  transform-origin: 0 0;
  text-align: center;
}
```

Le texte est :
- ✅ Étiré horizontalement à 141%
- ✅ Parfaitement centré
- ✅ Fidèle à InDesign

## 📝 Fichiers modifiés

1. **`server/routes.ts`** (lignes ~602-640)
   - Ajout de `fontStretchCss`
   - Calcul de `scaleXValue` et `scaleYValue`
   - Ajustement de `finalPosX` et `finalPosY` pour texte centré
   - Application dans `containerStyle`

2. **`server/replit_integrations/object_storage/idmlParser.ts`**
   - Extraction de `paraHorizontalScale` et `paraVerticalScale` (déjà en place)

3. **`server/replit_integrations/object_storage/idmlMerger.ts`**
   - Construction de `idmlHorizontalScale` et `idmlVerticalScale` (déjà en place)
   - Génération de `fontStretch` et `transform` (déjà en place)

## ✨ Améliorations futures

Si d'autres propriétés de mise en forme ne correspondent pas :
- Utiliser la même logique : extraction → calcul → compensation de position
- Toujours tenir compte de l'alignement du texte (center, left, right)
- Tester avec différents cas (texte multi-lignes, rotations, etc.)
