#!/usr/bin/env node

/**
 * Script de test pour vérifier le mapping EPUB ↔ IDML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractEpubFromBuffer } from './server/replit_integrations/object_storage/epubExtractor.js';
import { parseIdmlBuffer } from './server/replit_integrations/object_storage/idmlParser.js';
import { mergeEpubWithIdml } from './server/replit_integrations/object_storage/idmlMerger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMapping() {
  console.log('=== Test du mapping EPUB ↔ IDML ===\n');
  
  // Lecture des fichiers
  const epubPath = path.join(__dirname, 'Sans titre-4.epub');
  const idmlPath = path.join(__dirname, 'Sans titre-4.idml');
  
  console.log('Lecture des fichiers...');
  const epubBuffer = fs.readFileSync(epubPath);
  const idmlBuffer = fs.readFileSync(idmlPath);
  console.log(`✓ EPUB: ${epubBuffer.length} bytes`);
  console.log(`✓ IDML: ${idmlBuffer.length} bytes\n`);
  
  // Extraction EPUB
  console.log('Extraction EPUB...');
  const testBookId = 'test-' + Date.now();
  const epubResult = await extractEpubFromBuffer(epubBuffer, testBookId);
  console.log(`✓ EPUB extrait: ${epubResult.textPositions.length} positions de texte\n`);
  
  // Parsing IDML
  console.log('Parsing IDML...');
  const idmlData = await parseIdmlBuffer(idmlBuffer);
  console.log(`✓ IDML parsé: ${idmlData.textFrames.length} text frames\n`);
  
  // Affichage des text frames IDML pour vérification
  console.log('=== Text Frames IDML ===');
  idmlData.textFrames.forEach((tf, idx) => {
    console.log(`[${idx}] Frame ${tf.id}:`);
    console.log(`    Page: ${tf.pageIndex}`);
    console.log(`    Order: ${tf.layoutOrder}`);
    console.log(`    Story: ${tf.parentStory}`);
    console.log(`    Content: "${tf.content}"`);
    if (tf.position) {
      console.log(`    Position: (${tf.position.x.toFixed(1)}, ${tf.position.y.toFixed(1)})`);
    }
  });
  
  // Merge
  console.log('\n=== Fusion EPUB + IDML ===');
  const mergedTexts = mergeEpubWithIdml(
    epubResult.textPositions,
    idmlData,
    testBookId
  );
  
  console.log(`\n✓ Fusion complète: ${mergedTexts.length} textes fusionnés\n`);
  
  // Affichage des résultats du merge
  console.log('=== Résultats du mapping ===');
  mergedTexts.forEach((text, idx) => {
    console.log(`[${idx}] ${text.label} (page ${text.position.pageIndex}):`);
    console.log(`    IDML Frame: ${text.idmlFrameId}`);
    console.log(`    Content: "${text.content}"`);
  });
  
  // Nettoyage (supprimer les assets créés)
  const assetsDir = path.join(__dirname, 'server', 'assets', 'books', testBookId);
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
    console.log(`\n✓ Nettoyage: dossier ${assetsDir} supprimé`);
  }
  
  console.log('\n=== Test terminé ===');
}

testMapping().catch(err => {
  console.error('Erreur lors du test:', err);
  process.exit(1);
});
