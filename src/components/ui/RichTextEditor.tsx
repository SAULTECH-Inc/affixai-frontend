import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Heading2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  /** When true, only render the typing surface (no toolbar). */
  bare?: boolean;
}

/** A small Tiptap-based rich text editor.
 *
 * Outputs HTML via `onChange`. Designed for things like email bodies where
 * we want bold/italic/lists/links but not the full kitchen sink (no images,
 * no tables — keep emails portable across mail clients).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 140,
  bare = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The default heading levels go up to h6 — overkill for email. Cap at h2.
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: 'text-brand-400 underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write something…',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose-sm max-w-none focus:outline-none px-3 py-2',
          // Match the rest of our inputs visually.
          'text-sm text-fg leading-relaxed'
        ),
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      // Tiptap emits `<p></p>` for an empty editor — normalize that to ''
      // so consumers can treat "empty" as falsy.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Keep the editor in sync if the parent resets the value externally
  // (e.g. opening a fresh modal after a send).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value && value !== editor.getHTML()) {
      // Only set if genuinely different, to avoid clobbering the cursor.
      const incoming = value || '';
      const current = editor.getHTML();
      if (incoming === '' && current === '<p></p>') return;
      if (incoming !== current) {
        // emitUpdate: false → don't recurse back into our onUpdate handler.
        editor.commands.setContent(incoming, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg-base overflow-hidden',
        'focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500/50',
        className
      )}
    >
      {!bare && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    cn(
      'h-7 w-7 grid place-items-center rounded-md text-fg-muted transition',
      'hover:bg-bg-elevated hover:text-fg',
      active && 'bg-bg-elevated text-fg'
    );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-bg-inset">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive('bold'))}
        title="Bold (⌘B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive('italic'))}
        title="Italic (⌘I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={btn(editor.isActive('heading', { level: 2 }))}
        title="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive('bulletList'))}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive('orderedList'))}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive('blockquote'))}
        title="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          // Tiny prompt — fine for a side-feature like this. If users complain,
          // swap to a small popover with a URL input.
          const prev = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('Link URL', prev ?? 'https://');
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        className={btn(editor.isActive('link'))}
        title="Insert link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={cn(btn(false), 'disabled:opacity-30 disabled:hover:bg-transparent')}
        title="Undo"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={cn(btn(false), 'disabled:opacity-30 disabled:hover:bg-transparent')}
        title="Redo"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
