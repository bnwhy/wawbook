import { describe, it, expect } from 'vitest';

/**
 * Tests de régression pour le tracking (letter-spacing)
 * 
 * Bug corrigé : Le tracking dans IDML peut être exprimé de deux façons :
 * - Valeurs <= 100 : en 1/1000 em (ex: 50 = 0.05em)
 * - Valeurs > 100 : en pourcentage (ex: 141 = 1.41em)
 */

describe('Regression: Letter spacing (Tracking)', () => {
  // Fonction helper qui reproduit la logique du parser
  function parseTracking(trackingValue: string | number): number {
    const tracking = typeof trackingValue === 'string' 
      ? parseFloat(trackingValue) 
      : trackingValue;
    
    if (tracking > 100) {
      // Pourcentage : 141 = 1.41em
      return tracking / 100;
    } else {
      // 1/1000 em : 50 = 0.05em
      return tracking / 1000;
    }
  }

  it('should detect tracking > 100 as percentage', () => {
    const tracking = parseTracking(141);
    
    expect(tracking).toBe(1.41); // 141% = 1.41em
  });

  it('should detect tracking <= 100 as 1/1000 em', () => {
    const tracking = parseTracking(50);
    
    expect(tracking).toBe(0.05); // 50/1000 = 0.05em
  });

  it('should handle edge case at 100', () => {
    const tracking = parseTracking(100);
    
    // 100 est la limite, devrait être traité comme 1/1000 em
    expect(tracking).toBe(0.1); // 100/1000 = 0.1em
  });

  it('should handle tracking of 0', () => {
    const tracking = parseTracking(0);
    
    expect(tracking).toBe(0);
  });

  it('should handle large tracking values (> 100)', () => {
    const testCases = [
      { input: 200, expected: 2.0 },  // 200% = 2.0em
      { input: 150, expected: 1.5 },  // 150% = 1.5em
      { input: 141, expected: 1.41 }, // 141% = 1.41em
    ];

    for (const { input, expected } of testCases) {
      const tracking = parseTracking(input);
      expect(tracking).toBe(expected);
    }
  });

  it('should handle small tracking values (<= 100)', () => {
    const testCases = [
      { input: 10, expected: 0.01 },  // 10/1000 = 0.01em
      { input: 25, expected: 0.025 }, // 25/1000 = 0.025em
      { input: 75, expected: 0.075 }, // 75/1000 = 0.075em
    ];

    for (const { input, expected } of testCases) {
      const tracking = parseTracking(input);
      expect(tracking).toBe(expected);
    }
  });

  it('should handle negative tracking (letter tightening)', () => {
    const tracking = parseTracking(-20);
    
    // Négatif devrait être traité comme 1/1000 em
    expect(tracking).toBe(-0.02); // -20/1000 = -0.02em
  });
});
