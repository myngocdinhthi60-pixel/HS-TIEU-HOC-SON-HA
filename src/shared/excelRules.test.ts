import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeExportCell, validateImportRows } from './excelRules';

test('Import validation handles duplicate names, leading-zero PIN, numeric Excel PIN error, formula injection, and out-of-scope class', () => {
  const existing = new Map<string, { uid: string; fullName: string }>([
    ['4A2__HS001', { uid: 'u1', fullName: 'Nguyễn Minh An' }],
  ]);

  const result = validateImportRows(
    [
      // Valid create with leading zero PIN
      { rowNumber: 2, studentCode: 'HS002', fullName: 'Nguyễn Minh An', gender: 'Nữ', classCode: '4A2', pin: '012345' },
      // Valid update with blank PIN (keeps old PIN)
      { rowNumber: 3, studentCode: 'HS001', fullName: 'Nguyễn Minh An', gender: '', classCode: '4A2', pin: '' },
      // Excel stripped leading zero / numeric cell
      { rowNumber: 4, studentCode: 'HS003', fullName: 'Trần Gia Huy', gender: 'Nam', classCode: '4A2', pin: '12345', pinWasNumericCell: true },
      // Duplicate studentCode in file
      { rowNumber: 5, studentCode: 'HS002', fullName: 'Lê Bảo Ngọc', gender: 'Nữ', classCode: '4A2', pin: '009876' },
      // Out of scope class
      { rowNumber: 6, studentCode: 'HS009', fullName: 'Phạm Khoa', gender: 'Nam', classCode: '5C9', pin: '045678' },
      // Formula injection
      { rowNumber: 7, studentCode: 'HS010', fullName: '=CMD|calc', gender: '', classCode: '4A2', pin: '011223' },
    ],
    ['4A2', '5A1'],
    existing,
  );

  assert.equal(result.createCount, 1);
  assert.equal(result.updateCount, 1);
  assert.equal(result.errorCount, 4);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.rows[0].pinMasked, '••••••');
  assert.equal(result.rows[2].action, 'error');
  assert.match(result.rows[2].errors[0], /định dạng Số/);
  assert.equal(result.rows[3].action, 'error');
  assert.match(result.rows[3].errors[0], /Trùng Mã học sinh/);
  assert.equal(result.rows[4].action, 'error');
  assert.match(result.rows[4].errors[0], /không thuộc phạm vi/);
  assert.equal(result.rows[5].action, 'error');
  assert.match(result.rows[5].errors[0], /công thức/);
});

test('Export cell sanitization prefixes leading formula characters', () => {
  assert.equal(sanitizeExportCell('=1+1'), "'=1+1");
  assert.equal(sanitizeExportCell('+cmd'), "'+cmd");
  assert.equal(sanitizeExportCell('012345'), '012345');
});
