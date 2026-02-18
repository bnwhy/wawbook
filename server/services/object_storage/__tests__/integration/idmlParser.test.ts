import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseIdmlBuffer } from '../../idmlParser';

describe('Integration: IDML Parser', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  it('should parse Le château.idml completely', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      console.warn('Fixture Le château.idml not found, skipping test');
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    // Vérifications de base
    expect(result).toBeDefined();
    expect(result.characterStyles).toBeDefined();
    expect(result.paragraphStyles).toBeDefined();
    expect(result.textFrames).toBeDefined();
    expect(result.colors).toBeDefined();
    expect(result.pageDimensions).toBeDefined();

    // Vérifier qu'on a extrait des styles
    expect(Object.keys(result.characterStyles).length).toBeGreaterThan(0);
    expect(Object.keys(result.paragraphStyles).length).toBeGreaterThan(0);

    // Vérifier qu'on a des TextFrames
    expect(result.textFrames.length).toBeGreaterThan(0);

    // Vérifier structure d'un TextFrame
    const firstFrame = result.textFrames[0];
    expect(firstFrame.id).toBeDefined();
    expect(firstFrame.content).toBeDefined();
    expect(firstFrame.variables).toBeDefined();
    expect(Array.isArray(firstFrame.variables)).toBe(true);
  });

  it('should extract all required style properties', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    // Vérifier qu'au moins un style a toutes les propriétés essentielles
    const styles = Object.values(result.characterStyles);
    const completeStyle = styles.find(
      s =>
        s.fontFamily &&
        s.fontSize &&
        s.fontWeight &&
        s.fontStyle &&
        s.color
    );

    expect(completeStyle).toBeDefined();
  });

  it('should detect variables in text content', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    // Chercher un TextFrame avec des variables
    const frameWithVars = result.textFrames.find(
      f => f.variables.length > 0
    );

    if (frameWithVars) {
      expect(frameWithVars.content).toMatch(/\{[^}]+\}/);
      expect(frameWithVars.variables.length).toBeGreaterThan(0);
    }
  });

  it('should parse page dimensions correctly', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    expect(Object.keys(result.pageDimensions).length).toBeGreaterThan(0);

    const firstPage = Object.values(result.pageDimensions)[0];
    expect(firstPage.width).toBeGreaterThan(0);
    expect(firstPage.height).toBeGreaterThan(0);
  });

  it('should extract colors with valid hex format', async () => {
    const fixturePath = path.join(fixturesDir, 'Le château.idml');

    if (!fs.existsSync(fixturePath)) {
      return;
    }

    const idmlBuffer = fs.readFileSync(fixturePath);
    const result = await parseIdmlBuffer(idmlBuffer);

    const colorValues = Object.values(result.colors);
    
    for (const color of colorValues) {
      // Vérifier que c'est un hex valide
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
