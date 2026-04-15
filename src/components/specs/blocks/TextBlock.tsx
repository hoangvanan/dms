'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { useEffect } from 'react'
import type { TextContent } from '@/types/specs'

interface Props {
  content: TextContent
  onChange: (content: TextContent) => void
  disabled: boolean
}

export default function TextBlockEditor({ content, onChange, disabled }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
    ],
    content: content.html || '<p></p>',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange({ html: editor.getHTML() })
    },
  })

  // Sync editable state if disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) return null

  const toolbarBtnStyle = (isActive: boolean) => ({
    background: isActive ? 'rgba(79,143,247,0.15)' : 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 6px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  })

  return (
    <div>
      {/* Toolbar */}
      {!disabled && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={toolbarBtnStyle(editor.isActive('bold'))}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={toolbarBtnStyle(editor.isActive('italic'))}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={toolbarBtnStyle(editor.isActive('underline'))}
            title="Underline"
          >
            <UnderlineIcon size={14} />
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '4px',
          background: 'var(--bg-primary)',
          minHeight: '80px',
          padding: '8px 10px',
          fontSize: '13px',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={() => !disabled && editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Tiptap styles */}
      <style>{`
        .tiptap {
          outline: none;
        }
        .tiptap p {
          margin: 0 0 4px 0;
        }
        .tiptap p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  )
}
