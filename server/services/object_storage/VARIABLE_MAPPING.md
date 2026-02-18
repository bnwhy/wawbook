# Mapping des variables IDML vers attributs Wizard

## Vue d'ensemble

Les variables dans les fichiers IDML utilisent le format `{attribute_hero}` ou `{hero_attribute}`, tandis que le système wizard utilise le format `heroID_attributID`.

Ce module permet de mapper automatiquement entre les deux formats.

## Formats

### Format IDML (InDesign)
```
{name_child}
{hero_father}
{skin_light}
```

### Format Wizard (système)
```
child_name
father_hero
light_skin
```

## Exemples de mapping

| Variable IDML | Hero ID | Attribut ID | Variable Wizard | Type |
|---------------|---------|-------------|-----------------|------|
| `{name_child}` | child | name | `child_name` | text |
| `{hero_father}` | father | hero | `father_hero` | text |
| `{skin_mother}` | mother | skin | `mother_skin` | characteristic |
| `{hair_boy}` | boy | hair | `boy_hair` | characteristic |

## Utilisation

### Parser une variable IDML

```typescript
import { parseIdmlVariable } from './utils/variableMapper';

const parsed = parseIdmlVariable('name_child');
// { heroId: 'child', attributeId: 'name' }
```

### Convertir IDML → Wizard

```typescript
import { idmlToWizardVariable } from './utils/variableMapper';

const wizardVar = idmlToWizardVariable('name_child');
// "child_name"
```

### Convertir Wizard → IDML

```typescript
import { wizardToIdmlVariable } from './utils/variableMapper';

const idmlVar = wizardToIdmlVariable('child_name');
// "{name_child}"
```

### Mapper toutes les variables d'un document

```typescript
import { mapIdmlVariables } from './utils/variableMapper';

const idmlVars = ['name_child', 'hero_father'];
const mappings = mapIdmlVariables(idmlVars);

// [
//   {
//     idmlVariable: 'name_child',
//     wizardAttribute: 'child_name',
//     heroId: 'child',
//     attributeId: 'name',
//     type: 'text'
//   },
//   {
//     idmlVariable: 'hero_father',
//     wizardAttribute: 'father_hero',
//     heroId: 'father',
//     attributeId: 'hero',
//     type: 'text'
//   }
// ]
```

### Créer configuration wizard depuis variables IDML

```typescript
import { createWizardOptionsFromIdmlVariables } from './utils/variableMapper';

const idmlVars = ['name_child', 'skin_child', 'hair_child'];
const wizardOptions = createWizardOptionsFromIdmlVariables(idmlVars);

// [
//   { id: 'child_name', label: 'name (child)', type: 'text' },
//   { id: 'child_skin', label: 'skin (child)', type: 'options' },
//   { id: 'child_hair', label: 'hair (child)', type: 'options' }
// ]
```

## Logique de détection

### Héros connus
- child, father, mother, boy, girl, grandpa, grandma, baby, teen

### Attributs connus
- name, hero, skin, hair, eyes, gender, outfit, accessory, age

### Algorithme

1. Séparer la variable par `_`
2. Si 2 parties :
   - Vérifier si part1 est un héros connu → `hero_attribute`
   - Sinon vérifier si part2 est un héros connu → `attribute_hero`
   - Sinon vérifier si part1 est un attribut connu → `attribute_hero`
   - Sinon vérifier si part2 est un attribut connu → `hero_attribute`
   - Par défaut : `attribute_hero`

## Intégration

### Dans le parser IDML

Les variables sont déjà extraites dans `idmlParser.ts` :

```typescript
// Détection automatique
const variables: string[] = [];
const varMatches = content.match(/\{([^}]+)\}/g);
if (varMatches) {
  varMatches.forEach(m => {
    variables.push(m.replace(/[{}]/g, ''));
  });
}
```

### Utilisation dans l'import

Après extraction, mapper vers le format wizard :

```typescript
import { mapIdmlVariables } from './utils/variableMapper';

const idmlData = await parseIdmlBuffer(buffer);
const textFrame = idmlData.textFrames[0];

// Variables IDML : ["name_child"]
const mappings = mapIdmlVariables(textFrame.variables);

// Utiliser wizardAttribute pour le wizard
const wizardVars = mappings.map(m => m.wizardAttribute);
// ["child_name"]
```

## Cas d'usage : "Le château.idml"

**Variable IDML détectée** : `{name_child}`

**Mapping** :
- Hero ID : `child`
- Attribut ID : `name`
- Variable wizard : `child_name`
- Type : `text`

**Utilisation dans le template** :
```
Le château
de
{{child_name}}
```

## Extension

Pour ajouter de nouveaux héros ou attributs, modifier les listes dans `parseIdmlVariable()` :

```typescript
const knownHeroes = [..., 'newHero'];
const knownAttributes = [..., 'newAttribute'];
```

## Tests

Voir `__tests__/unit/variableMapper.test.ts` pour tous les cas de test.
