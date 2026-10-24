function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

export default Loader;