import { describe, it, expect } from 'vitest';
import {
  parseXmlFlags,
  shouldProcessContent,
  shouldDeleteElement,
  shouldClearContent,
  shouldRemovePreviousBr,
  applyContentFlags,
} from '../../utils/xmlFlags';

describe('xmlFlags', () => {
  describe('parseXmlFlags', () => {
    it('should parse setContent flag', () => {
      const attrs = { 'simpleidml-setcontent': 'false' };
      const flags = parseXmlFlags(attrs);

      expect(flags.setContent).toBe('false');
    });

    it('should parse ignoreContent flag', () => {
      const attrs = { 'simpleidml-ignorecontent': 'true' };
      const flags = parseXmlFlags(attrs);

      expect(flags.ignoreContent).toBe(true);
    });

    it('should parse forceContent flag', () => {
      const attrs = { 'simpleidml-forcecontent': 'true' };
      const flags = parseXmlFlags(attrs);

      expect(flags.forceContent).toBe(true);
    });

    it('should parse multiple flags', () => {
      const attrs = {
        'simpleidml-setcontent': 'delete',
        'simpleidml-ignorecontent': 'true',
      };
      const flags = parseXmlFlags(attrs);

      expect(flags.setContent).toBe('delete');
      expect(flags.ignoreContent).toBe(true);
    });

    it('should handle comma-separated setContent values', () => {
      const attrs = { 'simpleidml-setcontent': 'delete,remove-previous-br' };
      const flags = parseXmlFlags(attrs);

      // Devrait prendre le premier flag
      expect(flags.setContent).toBe('delete');
    });
  });

  describe('shouldProcessContent', () => {
    it('should process by default', () => {
      const flags = {};
      expect(shouldProcessContent(flags)).toBe(true);
    });

    it('should not process when setContent=false', () => {
      const flags = { setContent: 'false' as const };
      expect(shouldProcessContent(flags)).toBe(false);
    });

    it('should not process when ignoreContent=true', () => {
      const flags = { ignoreContent: true };
      expect(shouldProcessContent(flags)).toBe(false);
    });

    it('should not process when parent ignored', () => {
      const flags = {};
      expect(shouldProcessContent(flags, true)).toBe(false);
    });

    it('should force process when forceContent=true', () => {
      const flags = { forceContent: true };
      expect(shouldProcessContent(flags, true)).toBe(true);
    });
  });

  describe('shouldDeleteElement', () => {
    it('should delete when setContent=delete', () => {
      const flags = { setContent: 'delete' as const };
      expect(shouldDeleteElement(flags)).toBe(true);
    });

    it('should not delete by default', () => {
      const flags = {};
      expect(shouldDeleteElement(flags)).toBe(false);
    });
  });

  describe('shouldClearContent', () => {
    it('should clear when setContent=clear', () => {
      const flags = { setContent: 'clear' as const };
      expect(shouldClearContent(flags)).toBe(true);
    });

    it('should not clear by default', () => {
      const flags = {};
      expect(shouldClearContent(flags)).toBe(false);
    });
  });

  describe('shouldRemovePreviousBr', () => {
    it('should remove br when setContent=remove-previous-br', () => {
      const flags = { setContent: 'remove-previous-br' as const };
      expect(shouldRemovePreviousBr(flags)).toBe(true);
    });
  });

  describe('applyContentFlags', () => {
    it('should return null for delete', () => {
      const flags = { setContent: 'delete' as const };
      const result = applyContentFlags('some content', flags);

      expect(result).toBeNull();
    });

    it('should return empty string for clear', () => {
      const flags = { setContent: 'clear' as const };
      const result = applyContentFlags('some content', flags);

      expect(result).toBe('');
    });

    it('should remove leading newlines for remove-previous-br', () => {
      const flags = { setContent: 'remove-previous-br' as const };
      const result = applyContentFlags('\n\nsome content', flags);

      expect(result).toBe('some content');
    });

    it('should return content unchanged by default', () => {
      const flags = {};
      const content = 'some content';
      const result = applyContentFlags(content, flags);

      expect(result).toBe(content);
    });
  });
});
