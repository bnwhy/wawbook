import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { ImageExtractor } from '../../extractors/imageExtractor';

describe('ImageExtractor', () => {
  describe('checkEmbeddedImages', () => {
    it('should detect embedded images in Links/', async () => {
      const zip = new JSZip();
      zip.file('Links/image1.jpg', 'fake image data');
      zip.file('Links/image2.png', 'fake image data');
      zip.file('Links/document.pdf', 'fake pdf data');
      zip.file('Stories/Story_u1.xml', '<Story/>');

      const embedded = await ImageExtractor.checkEmbeddedImages(zip);

      expect(embedded).toContain('Links/image1.jpg');
      expect(embedded).toContain('Links/image2.png');
      expect(embedded).toContain('Links/document.pdf');
      expect(embedded).not.toContain('Stories/Story_u1.xml');
    });

    it('should detect embedded images in Resources/', async () => {
      const zip = new JSZip();
      zip.file('Resources/photo.tif', 'fake image data');
      zip.file('Resources/Styles.xml', '<Styles/>');

      const embedded = await ImageExtractor.checkEmbeddedImages(zip);

      expect(embedded).toContain('Resources/photo.tif');
      expect(embedded).not.toContain('Resources/Styles.xml');
    });

    it('should return empty array when no images', async () => {
      const zip = new JSZip();
      zip.file('Stories/Story_u1.xml', '<Story/>');

      const embedded = await ImageExtractor.checkEmbeddedImages(zip);

      expect(embedded).toHaveLength(0);
    });

    it('should detect various image formats', async () => {
      const zip = new JSZip();
      const formats = ['jpg', 'jpeg', 'png', 'gif', 'tif', 'tiff', 'psd', 'ai', 'eps', 'pdf'];

      for (const format of formats) {
        zip.file(`Links/image.${format}`, 'data');
      }

      const embedded = await ImageExtractor.checkEmbeddedImages(zip);

      expect(embedded.length).toBe(formats.length);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(ImageExtractor.getMimeType('jpg')).toBe('image/jpeg');
      expect(ImageExtractor.getMimeType('png')).toBe('image/png');
      expect(ImageExtractor.getMimeType('gif')).toBe('image/gif');
      expect(ImageExtractor.getMimeType('tiff')).toBe('image/tiff');
      expect(ImageExtractor.getMimeType('psd')).toBe('image/vnd.adobe.photoshop');
      expect(ImageExtractor.getMimeType('pdf')).toBe('application/pdf');
    });

    it('should handle uppercase extensions', () => {
      expect(ImageExtractor.getMimeType('JPG')).toBe('image/jpeg');
      expect(ImageExtractor.getMimeType('PNG')).toBe('image/png');
    });

    it('should return default for unknown types', () => {
      expect(ImageExtractor.getMimeType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('extractImageMetadata', () => {
    it('should extract metadata from embedded image', async () => {
      const zip = new JSZip();
      const imageData = Buffer.from('fake image data');
      zip.file('Links/photo.jpg', imageData);

      const metadata = await ImageExtractor.extractImageMetadata(zip, 'Links/photo.jpg');

      expect(metadata).toBeDefined();
      expect(metadata!.path).toBe('Links/photo.jpg');
      expect(metadata!.size).toBe(imageData.length);
      expect(metadata!.type).toBe('jpg');
    });

    it('should return null for non-existent image', async () => {
      const zip = new JSZip();

      const metadata = await ImageExtractor.extractImageMetadata(zip, 'Links/missing.jpg');

      expect(metadata).toBeNull();
    });
  });
});
