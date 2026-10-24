import { useState } from 'react';

export default function DataTable({
  columns = [],
  data = [],
  rows,
  searchKeys = [],
  filter,
  emptyTitle = 'No records found',
  emptyMessage = '',
}) {
  const tableRows = rows ?? data;
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Search
  let visible = tableRows;
  if (search.trim() && searchKeys.length) {
    const q = search.trim().toLowerCase();
    visible = visible.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }

  // Filter
  if (filter && filterValue) {
    visible = visible.filter((row) => String(row[filter.key] ?? '') === filterValue);
  }

  // Sort
  if (sortKey) {
    visible = [...visible].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const hasToolbar = searchKeys.length > 0 || filter;

  return (
    <div>
      {hasToolbar && (
        <div className="dt-toolbar">
          {searchKeys.length > 0 && (
            <input
              className="dt-search"
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {filter && (
            <select
              className="dt-filter"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="">{filter.label ?? 'All'}</option>
              {(filter.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="dt-wrap">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map((col, i) => {
                const key = typeof col === 'string' ? col : col.key ?? col.accessor;
                const label = typeof col === 'string' ? col : col.label ?? col.header ?? key;
                const sortable = typeof col === 'object' && col.sortable;
                const active = sortKey === key;

                return (
                  <th
                    key={key ?? i}
                    className={sortable ? 'dt-th sortable' : 'dt-th'}
                    onClick={sortable ? () => handleSort(key) : undefined}
                  >
                    {label}
                    {sortable && (
                      <span className="dt-sort-icon">
                        {active ? (sortAsc ? ' ▲' : ' ▼') : ' ⇅'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="dt-empty">
                  <div className="empty-state">
                    <h3>{emptyTitle}</h3>
                    {emptyMessage && <p>{emptyMessage}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((item, rowIdx) => (
                <tr key={item?.id ?? rowIdx} className="dt-row">
                  {columns.map((col, colIdx) => {
                    const key = typeof col === 'string' ? col : col.key ?? col.accessor;
                    const render = typeof col === 'object' ? col.render : undefined;
                    return (
                      <td key={key ?? colIdx} className="dt-td">
                        {render
                          ? render(item, item)
                          : item?.[key] ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visible.length > 0 && (
        <p className="dt-count">{visible.length} record{visible.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
