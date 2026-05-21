export function DeletePublishedPostDialog({ open, slug, busy, onClose, onConfirm }) {
  if (!open) return null

  const postFile = `blog/posts/${slug}.html`

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="delete-post-title">Delete published post?</h2>
        <p className="dialog-hint">
          Delete this published post from GitHub? This will remove <code>{postFile}</code> and remove it from{' '}
          <code>blog/index.html</code>.
        </p>
        <p className="dialog-hint dialog-hint--soft">
          Your draft and editor content on this computer are not changed — only the files on GitHub.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete from GitHub'}
          </button>
        </div>
      </div>
    </div>
  )
}
