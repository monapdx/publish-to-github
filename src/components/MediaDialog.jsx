import { useId, useRef, useState } from 'react'

const defaultForm = {
  src: '',
  kind: 'audio',
}

const MAX_MEDIA_MB = 35
const MAX_MEDIA_BYTES = MAX_MEDIA_MB * 1024 * 1024

export function MediaDialog({ open, onClose, onInsert }) {
  const [form, setForm] = useState(defaultForm)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const fileInputId = useId()

  if (!open) return null

  function kindFromMime(type) {
    if (typeof type !== 'string') return null
    if (type.startsWith('audio/')) return 'audio'
    if (type.startsWith('video/')) return 'video'
    return null
  }

  function handleFileChange(e) {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    setUploadError('')
    if (!file) return
    const inferredKind = kindFromMime(file.type)
    if (!inferredKind) {
      setUploadError('Please choose an audio or video file.')
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setUploadError(
        `That file is too large (max ${MAX_MEDIA_MB} MB). Use a shorter clip or paste a URL instead.`,
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return
      setForm((f) => ({ ...f, src: result, kind: inferredKind }))
    }
    reader.onerror = () => setUploadError('Could not read that media file.')
    reader.readAsDataURL(file)
  }

  function submit(e) {
    e.preventDefault()
    const src = form.src.trim()
    if (!src) {
      setUploadError('Add a media URL or upload a file.')
      return
    }
    onInsert({ src, kind: form.kind })
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--media"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-dialog-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="media-dialog-title">Insert media</h2>
        <p className="dialog-hint">
          Upload MP3s and short video clips or paste a direct URL. Uploaded files are embedded in draft
          content as data.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <span id={`${fileInputId}-label`}>Upload</span>
            <div className="dialog-upload-row">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="audio/*,video/*"
                className="dialog-file-input"
                aria-labelledby={`${fileInputId}-label`}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose media…
              </button>
            </div>
            {uploadError ? <p className="dialog-error">{uploadError}</p> : null}
          </div>
          <label className="field">
            <span>Type</span>
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label className="field">
            <span>Media URL</span>
            <input
              type="text"
              value={form.src}
              onChange={(e) => {
                setUploadError('')
                setForm((f) => ({ ...f, src: e.target.value }))
              }}
              placeholder="https://example.com/clip.mp3 or /media/clip.mp4"
              autoFocus
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
