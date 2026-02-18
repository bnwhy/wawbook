import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { IdmlValidator } from '../../validators/IdmlValidator';
import { IdmlParseError } from '../../errors/IdmlErrors';

describe('IdmlValidator', () => {
  describe('validatePackage', () => {
    it('should validate correct IDML structure', async () => {
      const zip = new JSZip();
      zip.file('designmap.xml', '<?xml version="1.0"?><idPkg:Manifest></idPkg:Manifest>');
      zip.file('Resources/Styles.xml', '<Styles><CharacterStyle/></Styles>');
      zip.file('Stories/Story_u1.xml', '<Story/>');
      zip.file('Spreads/Spread_u1.xml', '<Spread/>');

      const result = await IdmlValidator.validatePackage(zip);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required files', async () => {
      const zip = new JSZip();
      // Missing designmap.xml and Styles.xml

      const result = await IdmlValidator.validatePackage(zip);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('designmap.xml'))).toBe(true);
    });

    it('should warn about missing stories', async () => {
      const zip = new JSZip();
      zip.file('designmap.xml', '<?xml version="1.0"?><idPkg:Manifest></idPkg:Manifest>');
      zip.file('Resources/Styles.xml', '<Styles/>');
      zip.file('Spreads/Spread_u1.xml', '<Spread/>');
      // No Stories/

      const result = await IdmlValidator.validatePackage(zip);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Story'))).toBe(true);
    });

    it('should detect invalid designmap.xml', async () => {
      const zip = new JSZip();
      zip.file('designmap.xml', 'Not valid XML');
      zip.file('Resources/Styles.xml', '<Styles/>');
      zip.file('Spreads/Spread_u1.xml', '<Spread/>');

      const result = await IdmlValidator.validatePackage(zip);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('designmap.xml'))).toBe(true);
    });
  });

  describe('validateStyle', () => {
    it('should validate correct style', () => {
      const style = {
        '@_Self': 'CharacterStyle/Bold',
        '@_Name': 'Bold',
      };

      expect(() =>
        IdmlValidator.validateStyle(style, 'CharacterStyle')
      ).not.toThrow();
    });

    it('should throw on missing @_Self', () => {
      const style = {
        '@_Name': 'Bold',
      };

      expect(() =>
        IdmlValidator.validateStyle(style, 'CharacterStyle')
      ).toThrow(IdmlParseError);
    });

    it('should throw on missing @_Name', () => {
      const style = {
        '@_Self': 'CharacterStyle/Bold',
      };

      expect(() =>
        IdmlValidator.validateStyle(style, 'CharacterStyle')
      ).toThrow(IdmlParseError);
    });
  });

  describe('validateTextFrame', () => {
    it('should validate correct TextFrame', () => {
      const frame = {
        ParagraphStyleRange: {},
      };

      expect(() =>
        IdmlValidator.validateTextFrame(frame, 'u123')
      ).not.toThrow();
    });

    it('should throw on missing ParagraphStyleRange', () => {
      const frame = {};

      expect(() =>
        IdmlValidator.validateTextFrame(frame, 'u123')
      ).toThrow(IdmlParseError);
    });

    it('should throw on null frame', () => {
      expect(() =>
        IdmlValidator.validateTextFrame(null, 'u123')
      ).toThrow(IdmlParseError);
    });
  });
});
