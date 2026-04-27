export function EditorToolbar({ editor, onImage, onSource }) {
  if (!editor) return null

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
