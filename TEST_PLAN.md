# Plan de test - Correction des styles de caractères IDML

## Objectif
Vérifier que les styles de caractères appliqués au niveau des segments (CharacterStyleRange) sont correctement appliqués au style global du texte fusionné.

## Cas de test

### Test 1 : Texte avec premier segment stylé

**Données d'entrée** :
```
TextFrame avec conditionalSegments:
- Segment 1: "Le château\n" 
  - appliedCharacterStyle: "CharacterStyle/Style château"
  - Style résolu: fontSize=42pt, color=#6f1d76, textTransform=uppercase
- Segment 2: "de la petite" (condition: gender-girl)
  - appliedCharacterStyle: "[No character style]"
- Segment 3: "Du petit\n" (condition: gender-boy)
  - appliedCharacterStyle: "[No character style]"
```

**Résultat attendu** :
```json
{
  "style": {
    "fontFamily": "Sue Ellen Francisco",
    "fontSize": "42pt",
    "color": "#6f1d76",
    "textTransform": "uppercase",
    "horizontalScale": 141
  }
}
```

**Critères de validation** :
- ✅ Le style global utilise les propriétés du premier segment "Le château"
- ✅ fontSize = 42pt (pas 12pt du ParagraphStyle)
- ✅ color = #6f1d76 (pas #000000 par défaut)
- ✅ textTransform = uppercase (pas "none")

### Test 2 : Texte sans segment stylé

**Données d'entrée** :
```
TextFrame avec conditionalSegments:
- Segment 1: "Texte simple"
  - appliedCharacterStyle: "[No character style]"
```

**Résultat attendu** :
```json
{
  "style": {
    "fontFamily": "Arial",
    "fontSize": "12pt",
    "color": "#000000"
  }
}
```

**Critères de validation** :
- ✅ Le style global utilise le ParagraphStyle (fallback)
- ✅ Pas de style de segment appliqué (comportement par défaut)

### Test 3 : Texte avec segments vides avant le premier segment stylé

**Données d'entrée** :
```
TextFrame avec conditionalSegments:
- Segment 1: "" (vide)
  - appliedCharacterStyle: "[No character style]"
- Segment 2: "Mot stylé"
  - appliedCharacterStyle: "CharacterStyle/Bold"
  - Style résolu: fontWeight=bold
```

**Résultat attendu** :
```json
{
  "style": {
    "fontWeight": "bold"
  }
}
```

**Critères de validation** :
- ✅ Les segments vides sont ignorés
- ✅ Le premier segment non-vide avec un style est utilisé

### Test 4 : Texte avec propriétés inline sur le segment

**Données d'entrée** :
```
TextFrame avec conditionalSegments:
- Segment 1: "Texte coloré"
  - appliedCharacterStyle: "CharacterStyle/Style1"
  - inlineCharProperties: { fillColor: "Color/u144" }
  - Style résolu: color=#ff0000 (résolu via inline + dictionnaire de couleurs)
```

**Résultat attendu** :
```json
{
  "style": {
    "color": "#ff0000"
  }
}
```

**Critères de validation** :
- ✅ Les propriétés inline du segment sont prioritaires
- ✅ La résolution de couleur via le dictionnaire fonctionne

## Procédure de test

### Méthode 1 : Test unitaire (rapide)
```bash
cd /home/runner/workspace
npx tsx server/replit_integrations/object_storage/__tests__/testSegmentStyleApplication.ts
```

**Résultat attendu** :
```
✓ TEST RÉUSSI: Le style du premier segment sera appliqué au style global
```

### Méthode 2 : Test d'intégration (complet)

1. **Préparer un fichier IDML de test** avec :
   - Un TextFrame contenant plusieurs segments
   - Le premier segment avec un CharacterStyle appliqué
   - Des styles de caractères définis dans Styles.xml

2. **Uploader le fichier IDML** via l'API :
   ```bash
   POST /api/uploads/import-storyboard
   ```

3. **Vérifier les logs console** :
   ```
   [createMergedText] ✓ Found styled segment: "Le château" with style: CharacterStyle/Style château
   [createMergedText] Segment style resolved: font=Sue Ellen Francisco, size=42pt, color=#6f1d76
   [createMergedText] ✓ Applied segment fontFamily: Sue Ellen Francisco
   [createMergedText] ✓ Applied segment fontSize: 42
   [createMergedText] ✓ Applied segment color: #6f1d76
   ```

4. **Vérifier le fichier content.json généré** :
   ```bash
   cat server/assets/books/{bookId}/content.json | grep -A 20 "conditionalSegments"
   ```

5. **Comparer les styles** :
   - Style global du texte (`.style`)
   - Style résolu du premier segment (`.conditionalSegments[0].resolvedStyle`)
   - Ils doivent correspondre

## Régression à vérifier

### Cas qui ne doivent PAS être affectés

1. **Textes sans segments conditionnels** :
   - Le comportement existant doit être préservé
   - Utilisation du CharacterStyle global ou ParagraphStyle

2. **Textes avec tous les segments ayant "[No character style]"** :
   - Fallback sur ParagraphStyle doit fonctionner

3. **Propriétés inline globales** :
   - Les propriétés inline du TextFrame global doivent rester prioritaires (Priority 1)

## Checklist de validation

- [x] ✅ Code compile sans erreur TypeScript
- [x] ✅ Aucune erreur de linting
- [x] ✅ Build du projet réussi
- [x] ✅ Test unitaire de logique réussi
- [ ] ⏳ Test d'intégration avec fichier IDML réel (à faire par l'utilisateur)
- [ ] ⏳ Vérification du content.json généré (à faire par l'utilisateur)
- [ ] ⏳ Tests de non-régression (à faire par l'utilisateur)

## Fichiers de test

- `__tests__/testSegmentStyleApplication.ts` : Test de logique (créé)
- `__tests__/testConditionalText.ts` : Test existant pour les segments conditionnels

## Notes

- Les logs de débogage sont activés pour faciliter le diagnostic
- La modification est non-invasive : elle s'insère entre les priorités existantes
- Aucune modification des fonctions existantes (`resolveSegmentStyle`, `resolveStyleId`)
