/**
 * Script de test pour vérifier la correction des styles de caractères IDML
 * Test avec le fichier "Le château 5.idml"
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseIdmlBuffer } from './server/replit_integrations/object_storage/idmlParser';

async function testChateauFix() {
  console.log('=== TEST: Correction des styles de caractères IDML ===\n');
  
  const idmlPath = path.join(process.cwd(), 'Le château 5.idml');
  console.log(`Fichier IDML: ${idmlPath}`);
  
  if (!fs.existsSync(idmlPath)) {
    console.error('ERREUR: Fichier IDML non trouvé');
    return;
  }
  
  const idmlBuffer = fs.readFileSync(idmlPath);
  console.log(`Taille du fichier: ${idmlBuffer.length} bytes\n`);
  
  console.log('Parsing du fichier IDML...');
  const idmlData = await parseIdmlBuffer(idmlBuffer);
  
  console.log(`\n✓ Parsing terminé:`);
  console.log(`  - ${idmlData.textFrames.length} TextFrames`);
  console.log(`  - ${Object.keys(idmlData.characterStyles).length} CharacterStyles`);
  console.log(`  - ${Object.keys(idmlData.paragraphStyles).length} ParagraphStyles`);
  console.log(`  - ${Object.keys(idmlData.colors).length} Couleurs`);
  
  // Chercher le TextFrame avec les segments conditionnels
  const frameWithSegments = idmlData.textFrames.find(f => 
    f.conditionalSegments && f.conditionalSegments.length > 0
  );
  
  if (!frameWithSegments) {
    console.error('\n❌ ERREUR: Aucun TextFrame avec segments conditionnels trouvé');
    return;
  }
  
  console.log(`\n✓ TextFrame trouvé: ${frameWithSegments.id}`);
  console.log(`  Contenu: "${frameWithSegments.content}"`);
  console.log(`  Nombre de segments: ${frameWithSegments.conditionalSegments.length}`);
  
  // Vérifier le premier segment "Le château"
  const firstSegment = frameWithSegments.conditionalSegments[0];
  console.log(`\n=== Premier segment ===`);
  console.log(`  Texte: "${firstSegment.text}"`);
  console.log(`  Style appliqué: ${firstSegment.appliedCharacterStyle}`);
  
  // Vérifier le CharacterStyle dans le dictionnaire
  const charStyleKey = firstSegment.appliedCharacterStyle.replace('CharacterStyle/', '');
  const charStyle = idmlData.characterStyles[charStyleKey];
  
  console.log(`\n=== CharacterStyle dans le dictionnaire ===`);
  if (charStyle) {
    console.log(`  ✓ Style trouvé: "${charStyleKey}"`);
    console.log(`  - fontFamily: ${charStyle.fontFamily || 'NON DÉFINI'}`);
    console.log(`  - fontSize: ${charStyle.fontSize || 'NON DÉFINI'}`);
    console.log(`  - color: ${charStyle.color || 'NON DÉFINI'}`);
    console.log(`  - textTransform: ${charStyle.textTransform || 'NON DÉFINI'}`);
    console.log(`  - horizontalScale: ${charStyle.horizontalScale || 'NON DÉFINI'}`);
  } else {
    console.log(`  ❌ Style "${charStyleKey}" NON TROUVÉ dans le dictionnaire`);
  }
  
  // Vérifier le ParagraphStyle
  const paraStyleKey = frameWithSegments.appliedParagraphStyle.replace('ParagraphStyle/', '');
  const paraStyle = idmlData.paragraphStyles[paraStyleKey];
  
  console.log(`\n=== ParagraphStyle "${paraStyleKey}" ===`);
  if (paraStyle) {
    console.log(`  ✓ Style trouvé`);
    console.log(`  - fontFamily: ${paraStyle.fontFamily || 'NON DÉFINI'}`);
    console.log(`  - fontSize: ${paraStyle.fontSize || 'NON DÉFINI'}`);
    console.log(`  - paraColor: ${paraStyle.paraColor || 'NON DÉFINI'}`);
    console.log(`  - paraTextTransform: ${paraStyle.paraTextTransform || 'NON DÉFINI'}`);
    console.log(`  - paraHorizontalScale: ${paraStyle.paraHorizontalScale || 'NON DÉFINI'}`);
  }
  
  console.log(`\n=== RÉSULTAT ATTENDU (après resolveSegmentStyle) ===`);
  console.log(`Le premier segment devrait hériter du ParagraphStyle:`);
  console.log(`  - fontSize: 42pt (du ParagraphStyle)`);
  console.log(`  - textTransform: uppercase (du ParagraphStyle)`);
  console.log(`  - horizontalScale: 141 (du ParagraphStyle)`);
  console.log(`  - color: du CharacterStyle via fillColor`);
  console.log(`  - strokeColor: du CharacterStyle`);
  
  console.log(`\n=== FIN DU TEST ===`);
}

testChateauFix().catch(console.error);
