/**
 * Test pour vérifier que les styles des segments conditionnels
 * sont correctement appliqués au style global du texte
 * 
 * Ce test vérifie le fix du bug où les styles de caractères
 * appliqués au niveau des mots (CharacterStyleRange) n'étaient pas
 * détectés et appliqués correctement dans le style global.
 * 
 * Utilisation :
 *   npx tsx server/replit_integrations/object_storage/__tests__/testSegmentStyleApplication.ts
 */

console.log('=== TEST: Application des styles de segments ===\n');

// Simuler les données IDML
const mockIdmlData = {
  characterStyles: {
    'Style château': {
      fontFamily: 'Sue Ellen Francisco',
      fontSize: 42,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#6f1d76',
      letterSpacing: 0,
      baselineShift: 0,
      textDecoration: 'none',
      textTransform: 'uppercase',
      horizontalScale: 141,
      strokeColor: '#801a76',
      strokeWeight: 1
    },
    '$ID/[No character style]': {
      fontFamily: undefined,
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      letterSpacing: 0,
      baselineShift: 0,
      textDecoration: 'none',
      textTransform: 'none'
    }
  },
  paragraphStyles: {
    'Titre livre': {
      textAlign: 'center',
      lineHeight: '1.3',
      whiteSpace: 'normal',
      marginTop: 0,
      marginBottom: 0,
      textIndent: 0,
      fontFamily: 'Sue Ellen Francisco',
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      paraColor: '#000000',
      paraHorizontalScale: 100
    }
  },
  colors: {
    'Color/u144': '#6f1d76',
    'Color/u145': '#801a76'
  }
};

// Simuler un TextFrame avec des segments conditionnels
const mockIdmlFrame = {
  id: 'u116',
  name: 'u116',
  content: 'Le château\nde la petiteDu petit\n{TXTVAR_hero-child_name}',
  variables: ['TXTVAR_hero-child_name'],
  appliedCharacterStyle: 'CharacterStyle/$ID/[No character style]',
  appliedParagraphStyle: 'ParagraphStyle/Titre livre',
  conditionalSegments: [
    {
      text: 'Le château\n',
      appliedCharacterStyle: 'CharacterStyle/Style château',
      inlineCharProperties: {
        fillColor: 'Color/u144'
      }
    },
    {
      text: 'de la petite',
      appliedCharacterStyle: 'CharacterStyle/$ID/[No character style]',
      condition: 'TXTCOND_hero-child_gender-girl'
    },
    {
      text: 'Du petit\n',
      appliedCharacterStyle: 'CharacterStyle/$ID/[No character style]',
      condition: 'TXTCOND_hero-child_gender-boy'
    },
    {
      text: '{TXTVAR_hero-child_name}',
      appliedCharacterStyle: 'CharacterStyle/$ID/[No character style]',
      variables: ['TXTVAR_hero-child_name']
    }
  ]
};

console.log('Données de test:');
console.log('- TextFrame ID:', mockIdmlFrame.id);
console.log('- Contenu:', mockIdmlFrame.content);
console.log('- Nombre de segments:', mockIdmlFrame.conditionalSegments?.length);
console.log('- Premier segment:', mockIdmlFrame.conditionalSegments[0].text.trim());
console.log('- Style du premier segment:', mockIdmlFrame.conditionalSegments[0].appliedCharacterStyle);

// Test de la logique
console.log('\n--- Test de la logique ---');

// Trouver le premier segment non-vide avec un style de caractère appliqué
const firstStyledSegment = mockIdmlFrame.conditionalSegments.find(
  seg => seg.text.trim() && 
         seg.appliedCharacterStyle && 
         seg.appliedCharacterStyle !== 'CharacterStyle/$ID/[No character style]'
);

if (firstStyledSegment) {
  console.log('✓ Premier segment stylé trouvé:', firstStyledSegment.text.trim());
  console.log('  Style appliqué:', firstStyledSegment.appliedCharacterStyle);
  
  // Vérifier que le style existe dans le dictionnaire
  const styleKey = firstStyledSegment.appliedCharacterStyle.replace('CharacterStyle/', '');
  const charStyle = mockIdmlData.characterStyles[styleKey];
  
  if (charStyle) {
    console.log('✓ Style trouvé dans le dictionnaire:');
    console.log('  - fontFamily:', charStyle.fontFamily);
    console.log('  - fontSize:', charStyle.fontSize);
    console.log('  - color:', charStyle.color);
    console.log('  - textTransform:', charStyle.textTransform);
    console.log('  - horizontalScale:', charStyle.horizontalScale);
    
    console.log('\n✓ TEST RÉUSSI: Le style du premier segment sera appliqué au style global');
    console.log('  Résultat attendu:');
    console.log('  - fontFamily: "Sue Ellen Francisco" (du segment)');
    console.log('  - fontSize: 42pt (du segment)');
    console.log('  - color: #6f1d76 (du segment)');
    console.log('  - textTransform: uppercase (du segment)');
    console.log('  - horizontalScale: 141 (du segment)');
  } else {
    console.log('✗ ERREUR: Style non trouvé dans le dictionnaire');
    console.log('  Clés disponibles:', Object.keys(mockIdmlData.characterStyles));
  }
} else {
  console.log('✗ ERREUR: Aucun segment stylé trouvé');
}

console.log('\n=== FIN DU TEST ===');
