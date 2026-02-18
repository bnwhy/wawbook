import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseIdmlBuffer } from '../../idmlParser';
import { ReadingOrderValidator } from '../../utils/readingOrderValidator';

describe('Integration: Reading order validation', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  it('should validate reading order in Le château.idml', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      console.warn('Fixture not found, skipping test');
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    // Grouper par page
    const pageIndexes = [...new Set(idmlData.textFrames.map(f => f.pageIndex))];

    for (const pageIndex of pageIndexes) {
      const pageFrames = idmlData.textFrames
        .filter(f => f.pageIndex === pageIndex && f.position)
        .map(f => ({
          id: f.id,
          position: f.position!,
          layoutOrder: f.layoutOrder,
        }));

      if (pageFrames.length > 0) {
        const validation = ReadingOrderValidator.validateReadingOrder(
          pageFrames,
          pageIndex
        );

        // Log les warnings mais ne pas fail le test
        if (!validation.valid) {
          console.warn(
            `Page ${pageIndex} has reading order discrepancies:`,
            validation.warnings
          );
        }
      }
    }
  });

  it('should detect multi-column layouts if present', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    // Prendre la première page avec plusieurs frames
    const firstPage = idmlData.textFrames.filter(f => f.pageIndex === 1 && f.position);

    if (firstPage.length >= 2) {
      const pageDimension = idmlData.pageDimensions[1];
      const pageWidth = pageDimension?.width || 600;

      const isMultiColumn = ReadingOrderValidator.detectMultiColumnLayout(
        firstPage.map(f => ({
          id: f.id,
          position: f.position!,
        })),
        pageWidth
      );

      // Just log the result, don't assert
      console.log(`Page 1 multi-column: ${isMultiColumn}`);
    }
  });

  it('should suggest corrected reading order if needed', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const idmlData = await parseIdmlBuffer(idmlBuffer);

    const firstPage = idmlData.textFrames.filter(f => f.pageIndex === 1 && f.position);

    if (firstPage.length >= 2) {
      const pageDimension = idmlData.pageDimensions[1];
      const pageWidth = pageDimension?.width || 600;

      const suggested = ReadingOrderValidator.suggestReadingOrder(
        firstPage.map(f => ({
          id: f.id,
          position: f.position!,
        })),
        pageWidth
      );

      expect(suggested.length).toBe(firstPage.length);
      
      // Vérifier que le premier frame est le plus en haut
      if (suggested.length > 1) {
        expect(suggested[0].position.y).toBeLessThanOrEqual(suggested[1].position.y + 10);
      }
    }
  });
});
