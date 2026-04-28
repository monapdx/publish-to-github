import { useEditor, EditorContent } from '@tiptap/react'
import { Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { ImageDialog } from './ImageDialog'
import { CodeSnippetDialog } from './CodeSnippetDialog'
import { MediaDialog } from './MediaDialog'

const BlogImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    }
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        },
      },
    }
  },
})

const AudioClip = Node.create({
  name: 'audioClip',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      class: { default: 'blog-audio' },
    }
  },
  parseHTML() {
    return [{ tag: 'audio[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['audio', { ...HTMLAttributes, controls: 'controls' }]
  },
})

const VideoClip = Node.create({
  name: 'videoClip',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      class: { default: 'blog-video' },
    }
  },
  parseHTML() {
    return [{ tag: 'video[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', { ...HTMLAttributes, controls: 'controls', preload: 'metadata' }]
  },
})

export function BlogEditor({
  content,
  onChange,
  onRequestSourceMode,
  documentKey = 'new',
}) {
  const [imageOpen, setImageOpen] = useState(false)
  const [imageDialogKey, setImageDialogKey] = useState(0)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [snippetDialogKey, setSnippetDialogKey] = useState(0)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaDialogKey, setMediaDialogKey] = useState(0)
  /** Last `content` prop we successfully applied to the editor (avoids clobbering local edits). */
  const lastSyncedFromProps = useRef(null)

  function openImageDialog() {
    setImageDialogKey((k) => k + 1)
    setImageOpen(true)
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          codeBlock: {
            HTMLAttributes: { class: 'blog-code-block' },
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer nofollow',
          },
        }),
        Placeholder.configure({
          placeholder: 'Write your post…',
        }),
        BlogImage,
        AudioClip,
        VideoClip,
        Table.configure({
          resizable: false,
          HTMLAttributes: { class: 'blog-table' },
        }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content,
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML()
        lastSyncedFromProps.current = html
        onChange(html)
      },
    },
    [documentKey],
  )

  /** TipTap v3 may not replace the document when `content` arrives after async load; sync explicitly. */
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (lastSyncedFromProps.current === content) return
    const current = editor.getHTML()
    if (current === content) {
      lastSyncedFromProps.current = content
      return
    }
    editor.commands.setContent(content, { emitUpdate: false })
    lastSyncedFromProps.current = content
  }, [editor, content])

  const insertCodeSnippet = useCallback(
    ({ code, language }) => {
      if (!editor) return
      const attrs = language ? { language } : {}
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs,
          content: [{ type: 'text', text: code }],
        })
        .run()
    },
    [editor],
  )

  const insertImage = useCallback(
    ({ src, alt, width, height, align }) => {
      if (!editor) return
      const alignClass = `blog-image align-${align}`
      editor
        .chain()
        .focus()
        .setImage({
          src,
          alt: alt || undefined,
          title: undefined,
          width: width || undefined,
          height: height || undefined,
          class: alignClass,
        })
        .run()
    },
    [editor],
  )

  const insertMedia = useCallback(
    ({ src, kind }) => {
      if (!editor) return
      if (kind === 'video') {
        editor.chain().focus().insertContent({ type: 'videoClip', attrs: { src } }).run()
        return
      }
      editor.chain().focus().insertContent({ type: 'audioClip', attrs: { src } }).run()
    },
    [editor],
  )

  if (!editor) {
    return <div className="editor-loading">Loading editor…</div>
  }

  return (
    <div className="blog-editor">
      <EditorToolbar
        editor={editor}
        onImage={openImageDialog}
        onMedia={() => {
          setMediaDialogKey((k) => k + 1)
          setMediaOpen(true)
        }}
        onCodeSnippet={() => {
          setSnippetDialogKey((k) => k + 1)
          setSnippetOpen(true)
        }}
        onSource={onRequestSourceMode}
      />
      <EditorContent editor={editor} />
      <ImageDialog
        key={imageDialogKey}
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onInsert={insertImage}
      />
      <CodeSnippetDialog
        key={snippetDialogKey}
        open={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={insertCodeSnippet}
      />
      <MediaDialog
        key={mediaDialogKey}
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onInsert={insertMedia}
      />
    </div>
  )
}
