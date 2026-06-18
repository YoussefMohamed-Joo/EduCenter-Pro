import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  label: string;
}

export function exportToExcel(data: any[], columns: ExcelColumn[], filename: string): void {
  const wb = XLSX.utils.book_new();
  const rows = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      row[col.label] = item[col.key] ?? '';
    });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseStudentRow(row: any) {
  return {
    full_name: row['الاسم'] || row['full_name'] || row['name'] || row['اسم'] || '',
    phone: String(row['الهاتف'] || row['phone'] || row['موبايل'] || ''),
    parent_phone: String(row['ولي الأمر'] || row['parent_phone'] || row['parent'] || ''),
  };
}
