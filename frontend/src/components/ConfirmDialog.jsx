export default function ConfirmDialog({
  message = 'Are you sure you want to continue?',
  onConfirm,
  onCancel,
  busy = false,
  // legacy props — still accepted but mapped to the simpler API above
  isOpen,
  open,
  onClose,
  title = 'Confirm',
  children,
}) {
  const visible = isOpen ?? open ?? true;
  const handleCancel = onCancel ?? onClose;

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel} role="presentation">
      <div
        className="modal-box modal-box-sm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="modal-header">
          <h2 id="confirm-title" className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p>{children ?? message}</p>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
