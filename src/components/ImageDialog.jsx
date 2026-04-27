import { useId, useRef, useState } from 'react'

const defaultForm = {
  src: '',
  alt: '',
  width: '',
  height: 'auto',
  align: 'center',
}

const MAX_IMAGE_MB = 20
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

export function ImageDialog({ open, onClose, onInsert }) {
  const [form, setForm] = useState(defaultForm)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const fileInputId = useId()

  if (!open) return null

  function handleFileChange(e) {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    setUploadError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(
        `That file is too large (max ${MAX_IMAGE_MB} MB). Use a smaller image or paste a URL instead.`,
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
      setForm((f) => ({
        ...f,
        src: result,
        alt: f.alt.trim() ? f.alt : baseName,
      }))
    }
    reader.onerror = () => setUploadError('Could not read that file.')
    reader.readAsDataURL(file)
  }

  function submit(e) {
    e.preventDefault()
    if (!form.src.trim()) {
      setUploadError('Add an image URL or upload a file.')
      return
    }
    onInsert({
      src: form.src.trim(),
      alt: form.alt.trim(),
      width: form.width.trim(),
      height: form.height.trim() || 'auto',
      align: form.align,
    })
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--image"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-dialog-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="image-dialog-title">Insert image</h2>
        <p className="dialog-hint">
          Paste a URL or upload from your device. Uploaded images are embedded in the draft as data (no server
          required).
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <span id={`${fileInputId}-label`}>Upload</span>
            <div className="dialog-upload-row">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/*"
                className="dialog-file-input"
                aria-labelledby={`${fileInputId}-label`}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose image…
              </button>
            </div>
            {uploadError ? <p className="dialog-error">{uploadError}</p> : null}
          </div>
          {form.src.startsWith('data:') ? (
            <div className="field">
              <span>Uploaded image</span>
              <div className="dialog-upload-preview">
                <img src={form.src} alt="" />
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    setForm((f) => ({ ...f, src: '' }))
                    setUploadError('')
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="field">
              <span>Image URL</span>
              <input
                type="text"
                value={form.src}
                onChange={(e) => {
                  setUploadError('')
                  setForm((f) => ({ ...f, src: e.target.value }))
                }}
                placeholder="https://example.com/photo.jpg or /images/photo.jpg"
                autoFocus
              />
            </label>
          )}
          <label className="field">
            <span>Alt text</span>
            <input
              type="text"
              value={form.alt}
              onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
              placeholder="Describe the image"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Width</span>
              <input
                type="text"
                value={form.width}
                onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
                placeholder="400 or 100%"
              />
            </label>
            <label className="field">
              <span>Height</span>
              <input
                type="text"
                value={form.height}
                onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                placeholder="auto"
              />
            </label>
          </div>
          <label className="field">
            <span>Alignment</span>
            <select
              value={form.align}
              onChange={(e) => setForm((f) => ({ ...f, align: e.target.value }))}
            >
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
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
