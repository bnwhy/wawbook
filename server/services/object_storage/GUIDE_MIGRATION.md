# Guide de migration - Utilisation des nouveaux modules

## Vue d'ensemble

Ce guide explique comment utiliser les nouveaux modules créés pour renforcer la robustesse du parser IDML.

## 1. Validation automatique (✅ Déjà intégré)

La validation est maintenant automatique dans `parseIdmlBuffer()` :

```typescript
import { parseIdmlBuffer } from './idmlParser';
import { IdmlCorruptedFileError } from './errors';

try {
  const idmlData = await parseIdmlBuffer(buffer);
  // Le fichier est validé, parsing réussi
} catch (error) {
  if (error instanceof IdmlCorruptedFileError) {
    console.error('Fichier IDML invalide:', error.message);
    // Afficher les erreurs spécifiques à l'utilisateur
  }
}
```

## 2. Utilisation du logger (À intégrer)

### Remplacer console.log par le logger

**Avant** :
```typescript
console.log(`[extractParagraphStyles] Found style: ${name}`);
```

**Après** :
```typescript
import { idmlLogger } from './utils/logger';

idmlLogger.debug({ styleName: name }, 'Found paragraph style');
```

### Logs structurés

```typescript
import { logStyleResolution } from './utils/logger';

logStyleResolution('character', styleId, {
  fontFamily: 'Arial',
  fontSize: 14
});
```

### Configuration du niveau de log

```bash
# En développement
IDML_LOG_LEVEL=debug npm run dev

# En production (par défaut: info)
npm start
```

## 3. Résolution d'héritage robuste (À intégrer)

### Remplacer les boucles while manuelles

**Avant** (dans extractCharacterStyles) :
```typescript
let currentBasedOn = charStyle['@_BasedOn'];
let depth = 0;
const maxDepth = 10;

while (!fontFamily && currentBasedOn && depth < maxDepth) {
  depth++;
  // Code complexe...
}
```

**Après** :
```typescript
import { resolveInheritance } from './utils/styleInheritance';

try {
  const resolved = resolveInheritance(
    styleId,
    rawStylesMap,
    (style) => ({
      fontFamily: style['@_AppliedFont'],
      fontSize: parseFloat(style['@_PointSize'] || '12'),
      // ... autres propriétés
    }),
    'character'
  );
  
  fontFamily = resolved.fontFamily;
  fontSize = resolved.fontSize;
} catch (error) {
  if (error instanceof IdmlInheritanceCycleError) {
    idmlLogger.error({ cycle: error.cycle }, 'Cycle detected in styles');
    // Fallback ou throw selon le contexte
  }
}
```

## 4. Validation de l'ordre de lecture (Optionnel)

### Après extraction des TextFrames

```typescript
import { ReadingOrderValidator } from './utils/readingOrderValidator';

// Grouper par page
const pageGroups = new Map<number, TextFrameData[]>();
for (const frame of textFrames) {
  if (!pageGroups.has(frame.pageIndex)) {
    pageGroups.set(frame.pageIndex, []);
  }
  pageGroups.get(frame.pageIndex)!.push(frame);
}

// Valider chaque page
for (const [pageIndex, frames] of pageGroups) {
  const framesWithPos = frames.filter(f => f.position).map(f => ({
    id: f.id,
    position: f.position!,
    layoutOrder: f.layoutOrder
  }));
  
  const validation = ReadingOrderValidator.validateReadingOrder(
    framesWithPos,
    pageIndex
  );
  
  if (!validation.valid) {
    idmlLogger.warn({ pageIndex, warnings: validation.warnings }, 
      'Reading order issue detected');
  }
}
```

## 5. Gestion des erreurs spécifiques

### Dans les fonctions d'extraction

```typescript
import { IdmlStyleNotFoundError, IdmlMissingFontError } from './errors';

// Au lieu de undefined silencieux
const style = characterStyles[styleId];
if (!style) {
  throw new IdmlStyleNotFoundError(styleId, 'character');
}

// Pour les polices manquantes
if (!fontFamily) {
  throw new IdmlMissingFontError('unknown', `CharacterStyle ${styleId}`);
}
```

### Avec recovery gracieux

```typescript
try {
  const style = getStyle(styleId);
} catch (error) {
  if (error instanceof IdmlStyleNotFoundError) {
    idmlLogger.warn({ styleId }, 'Style not found, using default');
    return defaultStyle;
  }
  throw error; // Autres erreurs non récupérables
}
```

## 6. Flags XML (Pour import XML futur)

Si vous implémentez un système d'import XML :

```typescript
import { parseXmlFlags, shouldProcessContent, applyContentFlags } from './utils/xmlFlags';

function importXmlElement(element: any, parentIgnored: boolean = false) {
  const flags = parseXmlFlags(element.attributes);
  
  // Vérifier si on doit traiter
  if (!shouldProcessContent(flags, parentIgnored)) {
    return null;
  }
  
  // Appliquer les transformations
  const content = applyContentFlags(element.textContent, flags);
  
  if (content === null) {
    // Élément marqué pour suppression
    return null;
  }
  
  // Traiter les enfants
  const childrenIgnored = flags.ignoreContent || parentIgnored;
  for (const child of element.children) {
    importXmlElement(child, childrenIgnored);
  }
}
```

## 7. Extraction d'images (Pour documentation)

### Vérifier les images embarquées

```typescript
import { ImageExtractor } from './extractors/imageExtractor';

const zip = await JSZip.loadAsync(idmlBuffer);
const embedded = await ImageExtractor.checkEmbeddedImages(zip);

if (embedded.length > 0) {
  idmlLogger.info({ count: embedded.length }, 'Embedded images found in IDML');
} else {
  idmlLogger.debug('No embedded images (using EPUB images)');
}
```

## 🔄 Plan de migration progressif

### Étape 1 : Validation (✅ Déjà fait)
- Validation automatique dans `parseIdmlBuffer()`

### Étape 2 : Logger (Recommandé)
1. Remplacer console.log dans `idmlParser.ts`
2. Remplacer console.log dans `idmlMerger.ts`
3. Tester avec `IDML_LOG_LEVEL=debug`

### Étape 3 : Héritage (Optionnel mais recommandé)
1. Refactoriser `extractCharacterStyles()` avec `resolveInheritance()`
2. Refactoriser `extractParagraphStyles()` avec `resolveInheritance()`
3. Supprimer les boucles while manuelles
4. Tester les cas d'héritage complexes

### Étape 4 : Ordre de lecture (Optionnel)
1. Ajouter validation après extraction TextFrames
2. Logger les warnings pour documents problématiques
3. Documenter les cas multi-colonnes

### Étape 5 : Tests continus (Recommandé)
1. Exécuter les tests régulièrement
2. Ajouter nouveaux tests pour nouveaux bugs
3. Maintenir >80% coverage

## 🧪 Tester l'implémentation

```bash
# 1. Copier le fichier de test
cp "Le château.idml" server/services/object_storage/__tests__/fixtures/

# 2. Exécuter tous les tests
npm test server/services/object_storage/__tests__/

# 3. Vérifier le parsing réel
IDML_LOG_LEVEL=debug node -e "
  const { parseIdmlBuffer } = require('./dist/server/services/object_storage/idmlParser.js');
  const fs = require('fs');
  
  (async () => {
    const buffer = fs.readFileSync('Le château.idml');
    const result = await parseIdmlBuffer(buffer);
    console.log('Parsing réussi!');
    console.log('Styles:', Object.keys(result.characterStyles).length);
    console.log('TextFrames:', result.textFrames.length);
  })();
"
```

## ⚠️ Points d'attention

1. **Imports** : Tous les nouveaux modules sont dans des sous-dossiers
2. **Erreurs** : Attraper les erreurs typées spécifiquement
3. **Logger** : Configurer le niveau selon l'environnement
4. **Tests** : Les fixtures doivent être présentes pour les tests d'intégration

## 📚 Documentation de référence

- `RECAP_FINAL.md` - Résumé de tout ce qui a été fait
- `PARSER_IMPROVEMENTS.md` - Détails techniques des améliorations
- `INDEX_NOUVEAUX_FICHIERS.md` - Liste de tous les fichiers créés
- `__tests__/RUN_TESTS.md` - Comment exécuter les tests

---

**Le parser IDML est maintenant ultra-robuste !** 🎉
