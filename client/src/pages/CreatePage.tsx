import React from 'react';
import { useLocation } from 'wouter';
import Wizard from '../components/Wizard';
import { BookConfig, Theme, Activity } from '../types';

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

const CreatePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);

  const bookTitle = params.get('bookTitle') ? decodeURIComponent(params.get('bookTitle')!) : undefined;
  const theme = params.get('theme') ? (decodeURIComponent(params.get('theme')!) as Theme) : undefined;
  const activity = params.get('activity') ? (decodeURIComponent(params.get('activity')!) as Activity) : undefined;
  const editingId = params.get('editingId') ? decodeURIComponent(params.get('editingId')!) : undefined;
  const dedication = params.get('dedication') ? decodeURIComponent(params.get('dedication')!) : undefined;
  const author = params.get('author') ? decodeURIComponent(params.get('author')!) : undefined;

  const selectionsRaw = params.get('selections');
  const initialSelections = selectionsRaw
    ? decodeBase64<Record<string, Record<string, any>>>(selectionsRaw) ?? undefined
    : undefined;

  const handleComplete = (config: BookConfig, _context?: { theme?: Theme; productId?: string }) => {
    const configWithMeta: BookConfig = {
      ...config,
      ...(dedication !== undefined && { dedication }),
      ...(author !== undefined && { author }),
    };

    const previewParams = new URLSearchParams();
    if (bookTitle) previewParams.set('bookTitle', encodeURIComponent(bookTitle));
    if (theme) previewParams.set('initialTheme', encodeURIComponent(theme));
    if (editingId) previewParams.set('editingId', encodeURIComponent(editingId));
    previewParams.set('config', encodeBase64(configWithMeta));

    setLocation(`/preview?${previewParams.toString()}`);
  };

  const handleCancel = () => {
    if (editingId) {
      setLocation('/cart');
    } else {
      setLocation('/');
    }
  };

  // Fallback if bookTitle is missing
  if (!bookTitle) {
    setLocation('/');
    return null;
  }

  return (
    <Wizard
      onComplete={handleComplete}
      onCancel={handleCancel}
      initialTheme={theme}
      initialActivity={activity}
      bookTitle={bookTitle}
      initialSelections={initialSelections}
      isEditing={!!editingId}
    />
  );
};

export default CreatePage;
