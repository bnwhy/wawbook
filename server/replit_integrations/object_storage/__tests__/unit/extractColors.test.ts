import { describe, it, expect } from 'vitest';
import { extractColors } from '../../idmlParser';

describe('extractColors', () => {
  it('should extract CMYK colors from Swatches', () => {
    const swatchesData = {
      idPkg_Swatches: {
        ColorGroup: {
          Color: [
            {
              '@_Self': 'Color/Black',
              '@_Name': 'Black',
              '@_Space': 'CMYK',
              '@_ColorValue': '0 0 0 100',
            },
            {
              '@_Self': 'Color/Red',
              '@_Name': 'Red',
              '@_Space': 'CMYK',
              '@_ColorValue': '0 100 100 0',
            },
          ],
        },
      },
    };

    const colors = extractColors(swatchesData);

    expect(colors['Color/Black']).toBe('#000000');
    expect(colors['Color/Red']).toMatch(/#[0-9a-f]{6}/i);
  });

  it('should extract RGB colors from Swatches', () => {
    const swatchesData = {
      idPkg_Swatches: {
        ColorGroup: {
          Color: {
            '@_Self': 'Color/Blue',
            '@_Name': 'Blue',
            '@_Space': 'RGB',
            '@_ColorValue': '0 0 255',
          },
        },
      },
    };

    const colors = extractColors(swatchesData);

    expect(colors['Color/Blue']).toBe('#0000ff');
  });

  it('should handle empty or missing color data', () => {
    const emptyData = {};
    const colors = extractColors(emptyData);

    expect(Object.keys(colors)).toHaveLength(0);
  });

  it('should skip colors without required attributes', () => {
    const invalidData = {
      idPkg_Swatches: {
        ColorGroup: {
          Color: [
            {
              '@_Self': 'Color/Valid',
              '@_Name': 'Valid',
              '@_Space': 'RGB',
              '@_ColorValue': '255 0 0',
            },
            {
              '@_Self': 'Color/Invalid',
              '@_Name': 'Invalid',
              // Missing @_Space and @_ColorValue
            },
          ],
        },
      },
    };

    const colors = extractColors(invalidData);

    expect(colors['Color/Valid']).toBeDefined();
    expect(colors['Color/Invalid']).toBeUndefined();
  });
});
