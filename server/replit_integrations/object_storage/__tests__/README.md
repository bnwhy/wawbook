# Tests IDML Parser

Suite de tests complète pour le parser IDML, inspirée de SimpleIDML et idml2html-python.

## Structure

```
__tests__/
├── fixtures/           # Fichiers IDML de test
├── unit/              # Tests unitaires des fonctions individuelles
├── integration/       # Tests d'intégration sur flux complets
└── regression/        # Tests de régression pour bugs connus
```

## Fixtures disponibles

- `Le château.idml` - Fichier réel de production avec HorizontalScale 141%
- Autres fixtures à ajouter selon les besoins

## Exécution des tests

```bash
# Tous les tests
npm test

# Tests unitaires uniquement
npm test -- __tests__/unit

# Tests de régression
npm test -- __tests__/regression

# Coverage
npm run test:coverage
```

## Ajout de nouveaux tests

1. **Tests unitaires** : Créer dans `unit/` pour tester une fonction isolée
2. **Tests d'intégration** : Créer dans `integration/` pour tester le flux complet
3. **Tests de régression** : Créer dans `regression/` pour un bug spécifique corrigé
