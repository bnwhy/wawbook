import React from 'react';
import { Save, Loader2 } from 'lucide-react';

interface SaveButtonProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  className?: string;
  label?: string;
  savedLabel?: string;
}

interface CreateButtonProps {
  canSubmit: boolean;
  isSaving: boolean;
  label: string;
  onSubmit: () => void;
  className?: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  hasChanges,
  isSaving,
  onSave,
  className = '',
  label = 'Sauvegarder',
  savedLabel = 'Enregistré',
}) => {
  const active = hasChanges && !isSaving;
  return (
    <button
      onClick={onSave}
      disabled={!hasChanges || isSaving}
      className={`flex items-center justify-center gap-2 font-bold transition-colors shadow-sm ${
        active
          ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
          : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
      } ${className}`}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {hasChanges ? label : savedLabel}
    </button>
  );
};

export const CreateButton: React.FC<CreateButtonProps> = ({
  canSubmit,
  isSaving,
  label,
  onSubmit,
  className = '',
}) => {
  return (
    <button
      onClick={onSubmit}
      disabled={!canSubmit || isSaving}
      className={`flex items-center justify-center gap-2 font-bold transition-colors shadow-sm ${
        canSubmit && !isSaving
          ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
          : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
      } ${className}`}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {label}
    </button>
  );
};
