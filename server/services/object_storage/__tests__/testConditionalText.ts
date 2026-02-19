/**
 * Test script pour vérifier l'extraction des textes conditionnels
 * et leur résolution selon les sélections du wizard
 * 
 * Pattern de condition: TXTCOND_tabId_variantId-optionId
 * Exemple : TXTCOND_hero-child_gender-boy
 * 
 * Pattern de variable: TXTVAR_tabId_variantId
 * Exemple : TXTVAR_hero-child_name
 * 
 * Utilisation :
 *   npx tsx server/services/object_storage/__tests__/testConditionalText.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseIdmlBuffer } from '../idmlParser';
import { resolveConditionalText, generateAllVariants } from '../utils/conditionalTextResolver';

async function testConditionalText() {
  const idmlPath = path.join(process.cwd(), 'Dossier textes conditionnels', 'textes conditionnels.idml');
  
  console.log('=== TEST: Extraction des textes conditionnels ===\n');
  console.log(`Fichier IDML: ${idmlPath}`);
  
  if (!fs.existsSync(idmlPath)) {
    console.error('ERREUR: Fichier IDML non trouvé');
    return;
  }
  
  const idmlBuffer = fs.readFileSync(idmlPath);
  const idmlData = await parseIdmlBuffer(idmlBuffer);
  
  console.log(`\nNombre de TextFrames: ${idmlData.textFrames.length}`);
  
  for (const frame of idmlData.textFrames) {
    console.log(`\n--- TextFrame: ${frame.id} ---`);
    console.log(`  Contenu complet: "${frame.content}"`);
    console.log(`  Variables: ${frame.variables.join(', ') || 'aucune'}`);
    
    if (frame.conditionalSegments && frame.conditionalSegments.length > 0) {
      console.log(`  ✓ SEGMENTS CONDITIONNELS (${frame.conditionalSegments.length}):`);
      for (const seg of frame.conditionalSegments) {
        console.log(`    - Texte: "${seg.text.trim()}"`);
        console.log(`      Condition: ${seg.condition || 'aucune'}`);
        if (seg.parsedCondition) {
          console.log(`      Parsed: character=${seg.parsedCondition.character}, variant=${seg.parsedCondition.variant}, option=${seg.parsedCondition.option}`);
        }
        if (seg.variables && seg.variables.length > 0) {
          console.log(`      Variables: ${seg.variables.join(', ')}`);
        }
      }
      console.log(`  Conditions disponibles: ${frame.availableConditions?.join(', ')}`);
      
      // Test de résolution du texte conditionnel
      // Format: { tabId: { variantId: optionId } }
      console.log('\n  --- TEST RÉSOLUTION ---');
      
      // Version garçon (avec mapping automatique hero-child → child)
      const textBoy = resolveConditionalText(frame.conditionalSegments, { 'child': { gender: 'boy', name: 'Tom' } });
      console.log(`  Version garçon: "${textBoy}"`);
      
      // Version fille
      const textGirl = resolveConditionalText(frame.conditionalSegments, { 'child': { gender: 'girl', name: 'Lily' } });
      console.log(`  Version fille: "${textGirl}"`);
      
      // Génération de toutes les variantes
      console.log('\n  --- TOUTES LES VARIANTES ---');
      const allVariants = generateAllVariants(frame.conditionalSegments);
      for (const [key, text] of allVariants) {
        console.log(`  [${key}]: "${text}"`);
      }
    } else {
      console.log(`  Pas de segments conditionnels`);
    }
  }
  
  console.log('\n=== FIN DU TEST ===');
}

testConditionalText().catch(console.error);
