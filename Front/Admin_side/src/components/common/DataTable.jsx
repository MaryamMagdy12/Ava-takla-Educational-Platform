function DataTable({ pageKey, columns, rows, keyField = "id" }) {
  return (
    <table className={`${pageKey}-datatable`}>
      <thead>
        <tr className={`${pageKey}-datatable-headrow`}>
          {columns.map((column) => (
            <th key={column.key} className={`${pageKey}-datatable-th`}>
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr
            key={row[keyField] != null && row[keyField] !== "" ? String(row[keyField]) : `row-${rowIndex}`}
            className={`${pageKey}-datatable-row`}
          >
            {columns.map((column) => (
              <td key={column.key} className={`${pageKey}-datatable-td`}>
                {column.render ? column.render(row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataTable;
