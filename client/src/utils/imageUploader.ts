export interface PageImage {
  pageIndex: number;
  imageUrl: string;
}

export interface ExtractZipResult {
  images: Record<string, string>;
  htmlFiles: string[];
  htmlContent: Record<string, string>;
  cssContent: Record<string, string>;
  sessionId: string;
  pageImages: PageImage[];
}

export async function extractZipOnServer(file: File): Promise<ExtractZipResult> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  const response = await fetch('/api/uploads/extract-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64, filename: file.name }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to extract ZIP on server');
  }
  
  return response.json();
}

export async function uploadBlobToStorage(blobUrl: string, filename?: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    const uploadResponse = await fetch('/api/uploads/base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: base64,
        contentType: blob.type || 'image/png',
        filename: filename,
      }),
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await uploadResponse.json();
    return result.objectPath;
  } catch (error) {
    console.error('Error uploading blob:', error);
    throw error;
  }
}

export async function uploadMultipleBlobs(
  images: Array<{ url?: string; id: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const blobImages = images.filter(img => img.url && img.url.startsWith('blob:')) as Array<{ url: string; id: string }>;
  
  for (let i = 0; i < blobImages.length; i++) {
    const img = blobImages[i];
    try {
      const permanentUrl = await uploadBlobToStorage(img.url, `image_${img.id}`);
      urlMap.set(img.url, permanentUrl);
      if (onProgress) {
        onProgress(i + 1, blobImages.length);
      }
    } catch (error) {
      console.error(`Failed to upload image ${img.id}:`, error);
    }
  }
  
  return urlMap;
}

export function replaceBlobUrls<T extends { url?: string }>(
  items: T[],
  urlMap: Map<string, string>
): T[] {
  return items.map(item => {
    if (!item.url) return item;
    const permanentUrl = urlMap.get(item.url);
    if (permanentUrl) {
      return { ...item, url: permanentUrl };
    }
    return item;
  });
}
