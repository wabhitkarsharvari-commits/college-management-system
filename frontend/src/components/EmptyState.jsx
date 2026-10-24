function EmptyState({ title = 'Nothing to show', message }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}

export default EmptyState;