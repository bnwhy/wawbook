# Fix - HorizontalScale 141% appliqué au rendu HTML

## 🐛 Problème identifié

Le texte "LE CHÂTEAU DE {NAME_CHILD}" dans InDesign utilise un `HorizontalScale` de 141% (étirement horizontal), mais le rendu HTML ne l'appliquait pas, résultant en un texte trop compact par rapport à InDesign.

## 🔍 Analyse

### État avant le fix

Le `content.json` contenait correctement :
```json
{
  "fontStretch": "extra-expanded",
  "idmlHorizontalScale": 141
}
```

**MAIS** le HTML généré dans `routes.ts` (ligne ~602) n'utilisait PAS ces propriétés :
- `fontStretch` n'était jamais ajouté au CSS
- `transform: scaleX(1.41)` n'était jamais généré
- Seul `transform: rotate() scale()` était présent (pour rotation et scaleFactor)

### Pourquoi c'était cassé

Le `containerStyle` dans `routes.ts` construisait le CSS inline sans inclure :
1. La propriété `font-stretch` depuis `style.fontStretch`
2. Le `scaleX()` depuis `style.transform` ou `style.idmlHorizontalScale`

## ✅ Solution implémentée

### Modification dans `server/routes.ts` (lignes ~628-647)

**1. Ajout de `font-stretch` au CSS** :
```typescript
const fontStretchCss = style.fontStretch ? `font-stretch:${style.fontStretch};` : '';
```

**2. Ajout de `scaleX()` au `transform`** :
```typescript
let transformValue = `rotate(${pos.rotation || 0}deg) scale(${1 / scaleFactor}, ${1 / scaleFactor})`;

// Si on a un transform scaleX depuis IDML (HorizontalScale), l'ajouter
if (style.transform && style.transform.includes('scaleX')) {
  const scaleXMatch = style.transform.match(/scaleX\(([\d.]+)\)/);
  if (scaleXMatch) {
    const scaleXValue = scaleXMatch[1];
    transformValue = `rotate(...) scale(...) scaleX(${scaleXValue})`;
  }
} else if (style.idmlHorizontalScale && style.idmlHorizontalScale !== 100) {
  // Fallback : utiliser idmlHorizontalScale directement
  const scaleXValue = style.idmlHorizontalScale / 100; // 141 → 1.41
  transformValue = `rotate(...) scale(...) scaleX(${scaleXValue})`;
}
```

**3. Inclusion dans le `containerStyle`** :
```typescript
const containerStyle = `...${fontStretchCss}letter-spacing:...transform:${transformValue};...`;
```

## 🎯 Résultat attendu

Après ré-import du storyboard, le HTML généré contiendra :
```html
<div style="...font-stretch:extra-expanded;...transform:rotate(0deg) scale(0.05, 0.05) scaleX(1.41);...">
  LE CHÂTEAU<br>DE<br>{{name_child}}
</div>
```

Le texte sera maintenant étiré horizontalement de 141%, fidèle au design InDesign.

## 📋 Actions requises

1. ✅ Code corrigé dans `routes.ts`
2. ✅ Logs de debug retirés
3. ✅ Compilation OK (pas d'erreurs TypeScript)
4. ⏳ **RE-IMPORTER le storyboard** pour régénérer le HTML avec le fix

## 🔬 Vérification

Pour vérifier que le fix fonctionne :
1. Ré-importez "Le château.idml" + "Sans titre-1.epub"
2. Inspectez l'élément texte dans le browser
3. Vérifiez la présence de `transform: ... scaleX(1.41)`
4. Le texte devrait maintenant être étiré horizontalement

## 📝 Fichiers modifiés

- `server/routes.ts` - Génération HTML avec fontStretch et scaleX()
- `server/replit_integrations/object_storage/idmlParser.ts` - Logging temporairement désactivé
- `server/replit_integrations/object_storage/idmlMerger.ts` - Pas de changement (déjà correct)
