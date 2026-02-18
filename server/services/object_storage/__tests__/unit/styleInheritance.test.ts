import { describe, it, expect } from 'vitest';
import {
  resolveInheritance,
  detectStyleCycles,
  buildInheritanceTree,
} from '../../utils/styleInheritance';
import { IdmlInheritanceCycleError, IdmlStyleNotFoundError } from '../../errors/IdmlErrors';

describe('resolveInheritance', () => {
  it('should resolve simple inheritance', () => {
    const stylesMap = new Map([
      [
        'Base',
        {
          '@_Self': 'Base',
          '@_Name': 'Base',
          '@_AppliedFont': 'Helvetica',
          '@_PointSize': '12',
        },
      ],
      [
        'Derived',
        {
          '@_Self': 'Derived',
          '@_Name': 'Derived',
          '@_BasedOn': 'Base',
          '@_PointSize': '16', // Override
        },
      ],
    ]);

    const resolver = (style: any) => ({
      fontFamily: style['@_AppliedFont'],
      fontSize: parseFloat(style['@_PointSize'] || '12'),
    });

    const result = resolveInheritance('Derived', stylesMap, resolver, 'character');

    expect(result).toEqual({
      fontFamily: 'Helvetica', // Inherited
      fontSize: 16, // Overridden
    });
  });

  it('should resolve multi-level inheritance', () => {
    const stylesMap = new Map([
      [
        'Base',
        {
          '@_Self': 'Base',
          '@_AppliedFont': 'Arial',
          '@_PointSize': '10',
        },
      ],
      [
        'Middle',
        {
          '@_Self': 'Middle',
          '@_BasedOn': 'Base',
          '@_PointSize': '12',
        },
      ],
      [
        'Final',
        {
          '@_Self': 'Final',
          '@_BasedOn': 'Middle',
          '@_AppliedFont': 'Times', // Override
        },
      ],
    ]);

    const resolver = (style: any) => ({
      fontFamily: style['@_AppliedFont'],
      fontSize: parseFloat(style['@_PointSize'] || '12'),
    });

    const result = resolveInheritance('Final', stylesMap, resolver, 'character');

    expect(result).toEqual({
      fontFamily: 'Times', // Overridden
      fontSize: 12, // From Middle
    });
  });

  it('should throw on circular inheritance', () => {
    const stylesMap = new Map([
      [
        'A',
        {
          '@_Self': 'A',
          '@_BasedOn': 'B',
        },
      ],
      [
        'B',
        {
          '@_Self': 'B',
          '@_BasedOn': 'A',
        },
      ],
    ]);

    const resolver = (style: any) => ({});

    expect(() =>
      resolveInheritance('A', stylesMap, resolver, 'character')
    ).toThrow(IdmlInheritanceCycleError);
  });

  it('should throw when style not found', () => {
    const stylesMap = new Map();

    const resolver = (style: any) => ({});

    expect(() =>
      resolveInheritance('NonExistent', stylesMap, resolver, 'character')
    ).toThrow(IdmlStyleNotFoundError);
  });

  it('should stop at base styles', () => {
    const stylesMap = new Map([
      [
        '$ID/[No character style]',
        {
          '@_Self': '$ID/[No character style]',
        },
      ],
      [
        'MyStyle',
        {
          '@_Self': 'MyStyle',
          '@_BasedOn': '$ID/[No character style]',
          '@_AppliedFont': 'Arial',
        },
      ],
    ]);

    const resolver = (style: any) => ({
      fontFamily: style['@_AppliedFont'],
    });

    const result = resolveInheritance('MyStyle', stylesMap, resolver, 'character');

    expect(result).toEqual({
      fontFamily: 'Arial',
    });
  });
});

describe('detectStyleCycles', () => {
  it('should detect simple cycle', () => {
    const stylesMap = new Map([
      ['A', { '@_Self': 'A', '@_BasedOn': 'B' }],
      ['B', { '@_Self': 'B', '@_BasedOn': 'A' }],
    ]);

    const cycles = detectStyleCycles(stylesMap);

    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain('A');
    expect(cycles[0]).toContain('B');
  });

  it('should detect no cycles in valid hierarchy', () => {
    const stylesMap = new Map([
      ['Base', { '@_Self': 'Base' }],
      ['Derived', { '@_Self': 'Derived', '@_BasedOn': 'Base' }],
    ]);

    const cycles = detectStyleCycles(stylesMap);

    expect(cycles).toHaveLength(0);
  });
});

describe('buildInheritanceTree', () => {
  it('should build tree representation', () => {
    const stylesMap = new Map([
      ['Base', { '@_Self': 'Base', '@_Name': 'Base Style' }],
      [
        'Derived',
        {
          '@_Self': 'Derived',
          '@_Name': 'Derived Style',
          '@_BasedOn': 'Base',
        },
      ],
    ]);

    const tree = buildInheritanceTree('Derived', stylesMap);

    expect(tree).toContain('Derived Style');
    expect(tree).toContain('Base Style');
  });
});
