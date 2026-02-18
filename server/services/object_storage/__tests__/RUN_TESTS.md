# Guide d'exécution des tests IDML

## Prérequis

Le fichier `Le château.idml` doit être présent dans `__tests__/fixtures/`.

```bash
# Copier le fichier depuis la racine
cp "Le château.idml" server/replit_integrations/object_storage/__tests__/fixtures/
```

## Exécution des tests

### Tous les tests

```bash
npm test server/replit_integrations/object_storage/__tests__/
```

### Par catégorie

```bash
# Tests unitaires
npx vitest run server/replit_integrations/object_storage/__tests__/unit/

# Tests de régression
npx vitest run server/replit_integrations/object_storage/__tests__/regression/

# Tests d'intégration
npx vitest run server/replit_integrations/object_storage/__tests__/integration/
```

### Tests spécifiques

```bash
# Test HorizontalScale 141%
npx vitest run server/replit_integrations/object_storage/__tests__/regression/horizontalScale.test.ts

# Test letter-spacing
npx vitest run server/replit_integrations/object_storage/__tests__/regression/letterSpacing.test.ts

# Test parsing complet
npx vitest run server/replit_integrations/object_storage/__tests__/integration/idmlParser.test.ts
```

### Mode watch (développement)

```bash
npx vitest server/replit_integrations/object_storage/__tests__/
```

### Coverage

```bash
npx vitest run server/replit_integrations/object_storage/__tests__/ --coverage
```

## Tests créés

### Tests unitaires (7 fichiers)

- ✅ `extractColors.test.ts` - Extraction couleurs CMYK/RGB
- ✅ `styleInheritance.test.ts` - Résolution héritage avec cycles
- ✅ `readingOrderValidator.test.ts` - Validation ordre de lecture
- ✅ `IdmlValidator.test.ts` - Validation package IDML
- ✅ `xmlFlags.test.ts` - Flags XML avancés
- 🔲 `extractCharacterStyles.test.ts` - À créer
- 🔲 `extractParagraphStyles.test.ts` - À créer

### Tests de régression (3 fichiers)

- ✅ `horizontalScale.test.ts` - Bug HorizontalScale 141%
- ✅ `letterSpacing.test.ts` - Bug tracking > 100
- ✅ `localProperties.test.ts` - Bug propriétés locales

### Tests d'intégration (3 fichiers)

- ✅ `idmlParser.test.ts` - Parsing complet
- ✅ `readingOrder.test.ts` - Validation ordre lecture
- ✅ `endToEnd.test.ts` - Flux complet IDML → JSON

## Résultats attendus

Tous les tests devraient passer SAUF ceux qui nécessitent des fixtures manquantes (ils sont skippés automatiquement avec warning).

### Exemple de sortie

```
✓ server/replit_integrations/object_storage/__tests__/unit/xmlFlags.test.ts (8 tests)
✓ server/replit_integrations/object_storage/__tests__/unit/extractColors.test.ts (4 tests)
✓ server/replit_integrations/object_storage/__tests__/regression/letterSpacing.test.ts (7 tests)
...

Test Files  13 passed (13)
     Tests  45 passed (45)
```

## Debugging

### Activer les logs détaillés

```bash
IDML_LOG_LEVEL=debug npm test
```

### Voir les logs Pino

Les logs sont automatiquement formatés en mode développement avec pino-pretty.

### En cas d'échec

1. Vérifier que les fixtures sont présentes
2. Vérifier les imports dans les tests
3. Activer le mode debug
4. Consulter `PARSER_IMPROVEMENTS.md` pour les détails d'implémentation
