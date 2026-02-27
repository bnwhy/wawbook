import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  variant?: 'admin' | 'front';
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const EMPTY_STATE: ConfirmState = { isOpen: false, message: '', options: {}, resolve: null };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(EMPTY_STATE);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, message, options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve?.(true);
    setState(EMPTY_STATE);
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState(EMPTY_STATE);
  };

  const { message, options } = state;
  const title = options.title ?? message;
  const description = options.description;
  const cancelLabel = options.cancelLabel ?? 'Annuler';
  const confirmLabel = options.confirmLabel ?? 'Confirmer';
  const isFront = options.variant === 'front';

  const ConfirmDialog = state.isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {isFront ? (
        /* Style frontend public — cohérent avec CartPage / Navigation */
        <div className="bg-white rounded-2xl shadow-xl mx-4 w-full max-w-md border border-stone-200 overflow-hidden font-sans">
          <div className="p-6 flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mt-0.5">
              <AlertTriangle size={20} className="text-stone-500" />
            </div>
            <div>
              <h3 className="font-display font-black text-stone-800 text-lg leading-snug">{title}</h3>
              {description && (
                <p className="text-sm text-stone-500 mt-2 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 px-6 pb-6">
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl bg-red-400 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-sm"
            >
              {confirmLabel}
            </button>
            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-xl border-2 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50 font-bold text-sm transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      ) : (
        /* Style admin */
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200">
          <div className="flex items-start gap-3 mb-5">
            <div className="shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-slate-700 font-medium leading-snug pt-1">{title}</p>
              {description && (
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-medium text-sm"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-bold text-sm shadow-sm"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
