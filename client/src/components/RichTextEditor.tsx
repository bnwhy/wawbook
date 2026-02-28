import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR_BTN = 'px-2 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40';
const ACTIVE = 'bg-gray-200';

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class:
          'min-h-[96px] max-h-64 overflow-y-auto w-full border border-gray-300 rounded-b px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-coral prose prose-sm max-w-none',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync value from outside (e.g. when draft is loaded)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded border border-gray-300 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`${TOOLBAR_BTN} ${editor.isActive('bold') ? ACTIVE : ''}`}
          title="Gras"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`${TOOLBAR_BTN} ${editor.isActive('italic') ? ACTIVE : ''}`}
          title="Italique"
        >
          <i>I</i>
        </button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`${TOOLBAR_BTN} ${editor.isActive('bulletList') ? ACTIVE : ''}`}
          title="Liste à puces"
        >
          ≡
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={`${TOOLBAR_BTN} ${editor.isActive('orderedList') ? ACTIVE : ''}`}
          title="Liste numérotée"
        >
          1.
        </button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run(); }}
          className={TOOLBAR_BTN}
          title="Supprimer la mise en forme"
        >
          ✕
        </button>
      </div>
      {/* Editor area */}
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <span className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none">{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
