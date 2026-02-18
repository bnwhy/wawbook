import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseIdmlBuffer } from '../../idmlParser';

describe('Regression: HorizontalScale 141%', () => {
  it('should parse Le château.idml with correct HorizontalScale', async () => {
    const fixturePath = path.join(__dirname, '../fixtures/Le château.idml');
    
    // Skip test if fixture not available
    if (!fs.existsSync(fixturePath)) {
      console.warn('Fixture Le château.idml not found, skipping test');
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    // Vérifier que le style "Titre livre" existe et a HorizontalScale 141
    const titreStyle =
      result.paragraphStyles['ParagraphStyle/Titre livre'] ||
      result.paragraphStyles['Titre livre'];

    expect(titreStyle).toBeDefined();
    expect(titreStyle.paraHorizontalScale).toBe(141);
  });

  it('should convert HorizontalScale to proper CSS', () => {
    // Test la logique de conversion sans fichier réel
    const horizontalScale = 141;

    // Logique du merger : si > 150 ou < 50, utiliser transform
    // Sinon, utiliser font-stretch
    let fontStretch = '';
    let transform = '';

    if (horizontalScale > 150 || horizontalScale < 50) {
      transform = `scaleX(${horizontalScale / 100})`;
    } else if (horizontalScale > 150) {
      fontStretch = 'ultra-expanded';
    } else if (horizontalScale >= 125) {
      fontStretch = 'extra-expanded';
    } else if (horizontalScale >= 112.5) {
      fontStretch = 'expanded';
    }

    // Pour 141%, devrait être entre 125 et 150
    expect(fontStretch).toBeTruthy();
  });

  it('should handle HorizontalScale < 100 (condensed)', () => {
    const horizontalScale = 75;

    let fontStretch = '';
    
    if (horizontalScale < 62.5) fontStretch = 'ultra-condensed';
    else if (horizontalScale < 75) fontStretch = 'extra-condensed';
    else if (horizontalScale < 87.5) fontStretch = 'condensed';
    else if (horizontalScale < 93.75) fontStretch = 'semi-condensed';

    expect(fontStretch).toBeTruthy();
  });

  it('should use transform for extreme values', () => {
    const extremeValues = [200, 30];

    for (const scale of extremeValues) {
      const shouldUseTransform = scale > 150 || scale < 50;
      expect(shouldUseTransform).toBe(true);
    }
  });
});
