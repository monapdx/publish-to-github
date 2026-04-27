import { useEditorState } from '@tiptap/react'

function parseTableSizeInput(raw) {
  if (raw == null || typeof raw !== 'string') return { rows: 3, cols: 3 }
  const normalized = raw.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
  const parts = normalized
    .split(/[x,]/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
  const rows = Math.min(20, Math.max(1, parts[0] || 3))
  const cols = Math.min(12, Math.max(1, parts[1] ?? parts[0] ?? 3))
  return { rows, cols }
}

export function EditorToolbar({ editor, onImage, onCodeSnippet, onSource }) {
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  })

  if (!editor) return null

  function insertTable() {
    const raw = window.prompt(
      'Table size: rows and columns (e.g. 3x3 or 4,2). First row will be a header.',
      '3x3',
    )
    if (raw === null) return
    const { rows, cols } = parseTableSizeInput(raw)
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }

  function setLink() {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Link URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const inTable = editor.isActive('table')

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      <button
        type="button"
        className={editor.isActive('bold') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        aria-pressed={editor.isActive('bold')}
      >
        Bold
      </button>
      <button
        type="button"
        className={editor.isActive('italic') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-pressed={editor.isActive('italic')}
      >
        Italic
      </button>
      <button
        type="button"
        className={editor.isActive('underline') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-pressed={editor.isActive('underline')}
      >
        Underline
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button
        type="button"
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-pressed={editor.isActive('heading', { level: 1 })}
      >
        H1
      </button>
      <button
        type="button"
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-pressed={editor.isActive('heading', { level: 2 })}
      >
        H2
      </button>
      <button
        type="button"
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-pressed={editor.isActive('heading', { level: 3 })}
      >
        H3
      </button>
      <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>
        ¶
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button
        type="button"
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-pressed={editor.isActive('bulletList')}
      >
        • List
      </button>
      <button
        type="button"
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-pressed={editor.isActive('orderedList')}
      >
        1. List
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button
        type="button"
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        aria-pressed={editor.isActive('blockquote')}
      >
        Quote
      </button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        HR
      </button>
      <button
        type="button"
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
        onClick={onCodeSnippet}
        title="Insert fenced code snippet (shown with ``` in the editor)"
        aria-pressed={editor.isActive('codeBlock')}
      >
        Snippet
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button type="button" onClick={insertTable} title="Insert HTML table">
        Table
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        disabled={!inTable || !editor.can().chain().focus().addColumnBefore().run()}
        title="Add column before"
      >
        +Col ←
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!inTable || !editor.can().chain().focus().addColumnAfter().run()}
        title="Add column after"
      >
        +Col →
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!inTable || !editor.can().chain().focus().deleteColumn().run()}
        title="Delete column"
      >
        −Col
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        disabled={!inTable || !editor.can().chain().focus().addRowBefore().run()}
        title="Add row above"
      >
        +Row ↑
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!inTable || !editor.can().chain().focus().addRowAfter().run()}
        title="Add row below"
      >
        +Row ↓
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!inTable || !editor.can().chain().focus().deleteRow().run()}
        title="Delete row"
      >
        −Row
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!inTable || !editor.can().chain().focus().deleteTable().run()}
        title="Remove table"
      >
        Remove table
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button type="button" onClick={setLink}>
        Link
      </button>
      <button type="button" onClick={onImage}>
        Image
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        Redo
      </button>
      <span className="toolbar-sep" aria-hidden />
      <button type="button" onClick={onSource} title="Switch to raw HTML">
        Source
      </button>
    </div>
  )
}
