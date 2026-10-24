import { useLocation } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

function Placeholder() {
  const { pathname } = useLocation();
  const last = pathname.split('/').filter(Boolean).pop() || '';
  const title = last.charAt(0).toUpperCase() + last.slice(1);

  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      <div className="panel">
        <EmptyState
          title="This page is not built yet"
          message="It will be implemented in a later phase."
        />
      </div>
    </>
  );
}

export default Placeholder;