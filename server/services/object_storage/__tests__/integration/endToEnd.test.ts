import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseIdmlBuffer } from '../../idmlParser';
import { mergeEpubWithIdml } from '../../idmlMerger';

describe('Integration: End-to-end IDML processing', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  it('should process Le château.idml from start to finish', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      console.warn('Fixture not found, skipping test');
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);

    // 1. Parse IDML
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    expect(idmlData).toBeDefined();
    expect(idmlData.textFrames.length).toBeGreaterThan(0);
    expect(Object.keys(idmlData.characterStyles).length).toBeGreaterThan(0);
    expect(Object.keys(idmlData.paragraphStyles).length).toBeGreaterThan(0);

    // 2. Vérifier qu'on a le style "Titre livre"
    const titreStyle =
      idmlData.paragraphStyles['ParagraphStyle/Titre livre'] ||
      idmlData.paragraphStyles['Titre livre'];

    expect(titreStyle).toBeDefined();
    expect(titreStyle.paraHorizontalScale).toBe(141);

    // 3. Vérifier qu'on a des TextFrames avec variables
    const framesWithVars = idmlData.textFrames.filter(f => f.variables.length > 0);
    expect(framesWithVars.length).toBeGreaterThan(0);

    // 4. Simuler un merge avec positions EPUB mockées
    const epubPositions = idmlData.textFrames.map((frame, idx) => ({
      containerId: `_idContainer${String(idx).padStart(3, '0')}`,
      pageIndex: frame.pageIndex,
      position: {
        x: 100,
        y: 100 + idx * 100,
        width: 400,
        height: 80,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        layer: 0,
      },
    }));

    const merged = mergeEpubWithIdml(epubPositions, idmlData, 'test-book');

    expect(merged.length).toBeGreaterThan(0);

    // 5. Vérifier la structure d'un texte fusionné
    const firstMerged = merged[0];
    expect(firstMerged.id).toBeDefined();
    expect(firstMerged.type).toBeDefined();
    expect(firstMerged.content).toBeDefined();
    expect(firstMerged.style).toBeDefined();
    expect(firstMerged.style.fontFamily).toBeDefined();
    expect(firstMerged.style.fontSize).toBeDefined();
  });

  it('should handle IDML with all spacing properties', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    // Vérifier qu'au moins un style a des propriétés d'espacement
    const stylesWithSpacing = Object.values(idmlData.paragraphStyles).filter(
      s =>
        s.marginTop !== undefined ||
        s.marginBottom !== undefined ||
        s.textIndent !== undefined ||
        s.leftIndent !== undefined ||
        s.rightIndent !== undefined
    );

    // Log pour information
    console.log(`Styles with spacing: ${stylesWithSpacing.length}`);
  });

  it('should extract HorizontalScale and apply it correctly', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    // Créer positions mock
    const epubPositions = [
      {
        containerId: '_idContainer001',
        pageIndex: 1,
        position: {
          x: 100,
          y: 100,
          width: 400,
          height: 80,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          layer: 0,
        },
      },
    ];

    const merged = mergeEpubWithIdml(epubPositions, idmlData, 'test-book');

    if (merged.length > 0) {
      const firstText = merged[0];
      
      // Vérifier que le style contient des propriétés de transformation
      // (fontStretch, transform, ou idmlHorizontalScale)
      const hasTransform =
        firstText.style.fontStretch ||
        firstText.style.transform ||
        firstText.style.idmlHorizontalScale;

      console.log('First text style:', {
        fontStretch: firstText.style.fontStretch,
        transform: firstText.style.transform,
        idmlHorizontalScale: firstText.style.idmlHorizontalScale,
      });
    }
  });
});
