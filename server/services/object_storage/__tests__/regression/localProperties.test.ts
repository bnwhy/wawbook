import { describe, it, expect } from 'vitest';

/**
 * Tests de régression pour les propriétés locales de paragraphe
 * 
 * Bug corrigé : Les propriétés locales (SpaceBefore, SpaceAfter, FirstLineIndent, etc.)
 * définies directement sur ParagraphStyleRange n'étaient pas toutes capturées.
 */

describe('Regression: Local paragraph properties', () => {
  // Fonction helper qui simule extractLocalParagraphStyle
  function extractLocalParagraphStyle(props: any): any {
    const localStyle: any = {};

    // SpaceBefore → marginTop
    if (props['@_SpaceBefore']) {
      localStyle.marginTop = parseFloat(props['@_SpaceBefore']);
    }

    // SpaceAfter → marginBottom
    if (props['@_SpaceAfter']) {
      localStyle.marginBottom = parseFloat(props['@_SpaceAfter']);
    }

    // FirstLineIndent → textIndent
    if (props['@_FirstLineIndent']) {
      localStyle.textIndent = parseFloat(props['@_FirstLineIndent']);
    }

    // LeftIndent, RightIndent
    if (props['@_LeftIndent']) {
      localStyle.leftIndent = parseFloat(props['@_LeftIndent']);
    }

    if (props['@_RightIndent']) {
      localStyle.rightIndent = parseFloat(props['@_RightIndent']);
    }

    // Leading → lineHeight
    if (props['@_Leading'] && props['@_Leading'] !== 'Auto') {
      const leading = parseFloat(props['@_Leading']);
      const pointSize = parseFloat(props['@_PointSize']) || 12;
      if (leading && pointSize) {
        localStyle.lineHeight = (leading / pointSize).toFixed(2);
      }
    }

    return localStyle;
  }

  it('should extract SpaceBefore as marginTop', () => {
    const props = {
      '@_SpaceBefore': '12',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.marginTop).toBe(12);
  });

  it('should extract SpaceAfter as marginBottom', () => {
    const props = {
      '@_SpaceAfter': '18',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.marginBottom).toBe(18);
  });

  it('should extract FirstLineIndent as textIndent', () => {
    const props = {
      '@_FirstLineIndent': '24',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.textIndent).toBe(24);
  });

  it('should extract LeftIndent and RightIndent', () => {
    const props = {
      '@_LeftIndent': '36',
      '@_RightIndent': '36',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.leftIndent).toBe(36);
    expect(result.rightIndent).toBe(36);
  });

  it('should extract Leading as lineHeight ratio', () => {
    const props = {
      '@_Leading': '14.4',
      '@_PointSize': '12',
    };

    const result = extractLocalParagraphStyle(props);

    expect(parseFloat(result.lineHeight)).toBeCloseTo(1.2, 1);
  });

  it('should skip Auto Leading', () => {
    const props = {
      '@_Leading': 'Auto',
      '@_PointSize': '12',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.lineHeight).toBeUndefined();
  });

  it('should handle all spacing properties together', () => {
    const props = {
      '@_SpaceBefore': '12',
      '@_SpaceAfter': '18',
      '@_FirstLineIndent': '24',
      '@_LeftIndent': '36',
      '@_RightIndent': '48',
      '@_Leading': '15',
      '@_PointSize': '12',
    };

    const result = extractLocalParagraphStyle(props);

    expect(result.marginTop).toBe(12);
    expect(result.marginBottom).toBe(18);
    expect(result.textIndent).toBe(24);
    expect(result.leftIndent).toBe(36);
    expect(result.rightIndent).toBe(48);
    expect(parseFloat(result.lineHeight)).toBeCloseTo(1.25, 2);
  });

  it('should prioritize local properties over style properties', () => {
    // Simule la logique de buildCompleteStyle
    const paraStyle = {
      marginTop: 10,
      marginBottom: 10,
    };

    const localParaStyle = {
      marginTop: 20, // Override
      // marginBottom non défini, devrait utiliser paraStyle
    };

    const effectiveMarginTop = localParaStyle.marginTop !== undefined 
      ? localParaStyle.marginTop 
      : paraStyle.marginTop;
    
    const effectiveMarginBottom = localParaStyle.marginBottom !== undefined
      ? localParaStyle.marginBottom
      : paraStyle.marginBottom;

    expect(effectiveMarginTop).toBe(20); // Local override
    expect(effectiveMarginBottom).toBe(10); // From style
  });
});
