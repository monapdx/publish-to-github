import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { useCallback, useState } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { ImageDialog } from './ImageDialog'

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

export function BlogEditor({ content, onChange, onRequestSourceMode }) {
  const [imageOpen, setImageOpen] = useState(false)
  const [imageDialogKey, setImageDialogKey] = useState(0)

  function openImageDialog() {
    setImageDialogKey((k) => k + 1)
    setImageOpen(true)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
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
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

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

  if (!editor) {
    return <div className="editor-loading">Loading editor…</div>
  }

  return (
    <div className="blog-editor">
      <EditorToolbar
        editor={editor}
        onImage={openImageDialog}
        onSource={onRequestSourceMode}
      />
      <EditorContent editor={editor} />
      <ImageDialog
        key={imageDialogKey}
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onInsert={insertImage}
      />
    </div>
  )
}
