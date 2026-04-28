import { useEditorState } from '@tiptap/react'
import { useState } from 'react'

export function EditorToolbar({ editor, onImage, onMedia, onCodeSnippet, onSource }) {
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  })
  const [tableOpen, setTableOpen] = useState(false)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')

  if (!editor) return null

  function insertTable() {
    const rows = Math.min(20, Math.max(1, parseInt(tableRows, 10) || 3))
    const cols = Math.min(12, Math.max(1, parseInt(tableCols, 10) || 3))
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setTableOpen(false)
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
    <>
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
      <button type="button" onClick={() => setTableOpen(true)} title="Insert HTML table">
        Table
      </button>
      {inTable ? (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={!editor.can().chain().focus().addColumnBefore().run()}
            title="Add column before"
            aria-label="Add column before"
          >
            +←
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().chain().focus().addColumnAfter().run()}
            title="Add column after"
            aria-label="Add column after"
          >
            +→
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().chain().focus().deleteColumn().run()}
            title="Delete column"
            aria-label="Delete column"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={!editor.can().chain().focus().addRowBefore().run()}
            title="Add row above"
            aria-label="Add row above"
          >
            +↑
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().chain().focus().addRowAfter().run()}
            title="Add row below"
            aria-label="Add row below"
          >
            +↓
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().chain().focus().deleteRow().run()}
            title="Delete row"
            aria-label="Delete row"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().chain().focus().deleteTable().run()}
            title="Remove table"
            aria-label="Remove table"
          >
            ✕
          </button>
        </>
      ) : null}
      <span className="toolbar-sep" aria-hidden />
      <button type="button" onClick={setLink}>
        Link
      </button>
      <button type="button" onClick={onImage}>
        Image
      </button>
      <button type="button" onClick={onMedia} title="Insert audio or video">
        ♪
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
      {tableOpen ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setTableOpen(false)}>
          <div
            className="dialog dialog--table"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-dialog-title"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <h2 id="table-dialog-title">Insert table</h2>
            <p className="dialog-hint">Choose rows and columns. The first row will be a header row.</p>
            <div className="field-row">
              <label className="field">
                <span>Rows</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Columns</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                />
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setTableOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={insertTable}>
                Insert
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
