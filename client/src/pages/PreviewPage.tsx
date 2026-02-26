import React from 'react';
import { useLocation } from 'wouter';
import BookPreview from '../components/BookPreview';
import { BookConfig, Theme } from '../types';

function encodeBase64(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function decodeBase64<T>(str: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(atob(str))) as T;
  } catch {
    return null;
  }
}

const PreviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);

  const bookTitle = params.get('bookTitle') ? decodeURIComponent(params.get('bookTitle')!) : undefined;
  const initialTheme = params.get('initialTheme') ? (decodeURIComponent(params.get('initialTheme')!) as Theme) : undefined;
  const editingId = params.get('editingId') ? decodeURIComponent(params.get('editingId')!) : undefined;

  const configRaw = params.get('config');
  const config = configRaw ? decodeBase64<BookConfig>(configRaw) : null;

  // Fallback if required params are missing or corrupted
  if (!bookTitle || !config) {
    setLocation('/');
    return null;
  }

  const handleStart = () => {
    // "Retour à la personnalisation" → re-encode selections from config
    const createParams = new URLSearchParams();
    createParams.set('bookTitle', encodeURIComponent(bookTitle));
    if (initialTheme) createParams.set('theme', encodeURIComponent(initialTheme));
    if (editingId) createParams.set('editingId', encodeURIComponent(editingId));
    if (config.dedication) createParams.set('dedication', encodeURIComponent(config.dedication));
    if (config.author) createParams.set('author', encodeURIComponent(config.author));
    if (config.characters) createParams.set('selections', encodeBase64(config.characters));

    setLocation(`/create?${createParams.toString()}`);
  };

  const handleReset = () => {
    setLocation('/');
  };

  return (
    <BookPreview
      config={config}
      onReset={handleReset}
      onStart={handleStart}
      editingCartItemId={editingId}
      bookTitle={bookTitle}
      initialTheme={initialTheme}
    />
  );
};

export default PreviewPage;
