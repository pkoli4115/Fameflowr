export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;

  const replacer = (_key: string, value: any) => (value === null ? '' : value);
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(','),
    ...rows.map(row =>
      header
        .map(fieldName => JSON.stringify(row[fieldName], replacer))
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
