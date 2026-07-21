export function DataTable({ columns, rows, emptyLabel = 'Nothing recorded yet.' }) {
  if (!rows || rows.length === 0) {
    return <div className="muted" style={{ padding: '18px 0' }}>{emptyLabel}</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id || i}>
            {columns.map((col) => (
              <td key={col.key} className={col.text ? 'text' : ''}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
