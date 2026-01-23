import { describe, it, expect } from 'vitest';
import { ReadingOrderValidator } from '../../utils/readingOrderValidator';

describe('ReadingOrderValidator', () => {
  describe('validateReadingOrder', () => {
    it('should validate correct top-to-bottom order', () => {
      const frames = [
        { id: 'frame1', position: { x: 100, y: 100 }, layoutOrder: 0 },
        { id: 'frame2', position: { x: 100, y: 200 }, layoutOrder: 1 },
        { id: 'frame3', position: { x: 100, y: 300 }, layoutOrder: 2 },
      ];

      const result = ReadingOrderValidator.validateReadingOrder(frames, 1);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect reading order discrepancy', () => {
      const frames = [
        { id: 'frame1', position: { x: 100, y: 100 }, layoutOrder: 2 }, // Wrong order
        { id: 'frame2', position: { x: 100, y: 200 }, layoutOrder: 0 },
        { id: 'frame3', position: { x: 100, y: 300 }, layoutOrder: 1 },
      ];

      const result = ReadingOrderValidator.validateReadingOrder(frames, 1);

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.correctedOrder).toBeDefined();
    });

    it('should handle left-to-right on same line', () => {
      const frames = [
        { id: 'frame1', position: { x: 100, y: 100 }, layoutOrder: 0 },
        { id: 'frame2', position: { x: 300, y: 105 }, layoutOrder: 1 }, // ~same Y
        { id: 'frame3', position: { x: 500, y: 100 }, layoutOrder: 2 },
      ];

      const result = ReadingOrderValidator.validateReadingOrder(frames, 1, 10);

      expect(result.valid).toBe(true);
    });

    it('should handle empty frames array', () => {
      const result = ReadingOrderValidator.validateReadingOrder([], 1);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('detectMultiColumnLayout', () => {
    it('should detect multi-column layout', () => {
      const frames = [
        { id: 'col1-1', position: { x: 100, y: 100 } },
        { id: 'col1-2', position: { x: 100, y: 300 } },
        { id: 'col2-1', position: { x: 400, y: 100 } },
        { id: 'col2-2', position: { x: 400, y: 300 } },
      ];

      const isMultiColumn = ReadingOrderValidator.detectMultiColumnLayout(
        frames,
        600
      );

      expect(isMultiColumn).toBe(true);
    });

    it('should not detect multi-column for single column', () => {
      const frames = [
        { id: 'frame1', position: { x: 100, y: 100 } },
        { id: 'frame2', position: { x: 110, y: 300 } }, // Close X
      ];

      const isMultiColumn = ReadingOrderValidator.detectMultiColumnLayout(
        frames,
        600
      );

      expect(isMultiColumn).toBe(false);
    });
  });

  describe('suggestReadingOrder', () => {
    it('should suggest correct order for simple layout', () => {
      const frames = [
        { id: 'frame3', position: { x: 100, y: 300 } },
        { id: 'frame1', position: { x: 100, y: 100 } },
        { id: 'frame2', position: { x: 100, y: 200 } },
      ];

      const ordered = ReadingOrderValidator.suggestReadingOrder(frames, 600);

      expect(ordered[0].id).toBe('frame1');
      expect(ordered[1].id).toBe('frame2');
      expect(ordered[2].id).toBe('frame3');
    });

    it('should handle multi-column correctly', () => {
      const frames = [
        { id: 'col2', position: { x: 400, y: 100 } },
        { id: 'col1', position: { x: 100, y: 100 } },
      ];

      const ordered = ReadingOrderValidator.suggestReadingOrder(frames, 600);

      // Multi-column: left column first
      expect(ordered[0].id).toBe('col1');
      expect(ordered[1].id).toBe('col2');
    });
  });
});
