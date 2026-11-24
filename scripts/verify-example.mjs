import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describeTransaction, parseRows, reconcile, totals, withoutFullyRefunded } from '../assets/dashboard/ledger.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('../assets/dashboard/vendor/xlsx.full.min.js');
const filenames = ['支付宝-示例历史.txt', '微信-示例账单.csv', '银行卡-示例账单.csv', '美团-示例订单.csv'];

function importedRows(filename) {
  const text = readFileSync(new URL('../assets/examples/' + filename, import.meta.url), 'utf8');
  const workbook = XLSX.read(text, { type: 'string', raw: true });
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1, defval: '', raw: true
  });
  const result = parseRows(sheet, filename);
  assert.equal(result.unknown, 0, filename);
  assert.equal(result.skipped, 0, filename);
  return result.rows;
}

const imported = filenames.flatMap(importedRows);
const repeated = [...imported, ...filenames.flatMap(importedRows)];
const saved = [...new Map(repeated.map(row => [row.key, row])).values()];
assert.equal(saved.length, imported.length, '重复导入应具有稳定键');

const rows = reconcile(saved);
const find = id => rows.find(row => row.id === id);
assert.equal(find('demo-bank-duplicate'), undefined, '已核实的银行卡镜像只计一次');
assert.equal(find('demo-bank-direct').kind, 'expense');
assert.equal(find('demo-alipay-transfer').kind, 'movement');
assert.equal(find('demo-alipay-failed'), undefined);
assert.equal(find('demo-alipay-beans_partial').date, '2026-02-05T17:00:07');
assert.equal(describeTransaction(find('demo-wechat-1')).availability, 'missing');
assert.deepEqual(find('demo-alipay-meal').products.map(product => product.name), ['拿铁', '三明治']);
assert.equal(find('demo-alipay-meal').amount, 2900);
assert.equal(find('demo-alipay-meal').orderMerchant, '示例餐厅');
assert.equal(find('demo-alipay-meal').subcategory, '外卖');

const bankWithoutReference = { ...find('demo-bank-direct'), id: 'demo-bank-unlinked', amount: 2900 };
assert.ok(reconcile([...saved, bankWithoutReference]).some(row => row.id === bankWithoutReference.id),
  '银行卡只同日同额时应保留待核');


assert.deepEqual(totals(rows), { expense: 17800, refund: 4500, net: 13300, outCount: 5, refundCount: 3 });
const visible = withoutFullyRefunded(rows);
assert.deepEqual(totals(visible), { expense: 14800, refund: 1500, net: 13300, outCount: 4, refundCount: 1 });
assert.ok(visible.some(row => row.id === 'demo-alipay-beans_partial'), '部分退款仍显示');

const manualEdit = saved.map(row => row.id === 'demo-alipay-meal' ? {
  ...row, customCategory: '餐饮', customDetail: '工作午餐'
} : row);
assert.equal(reconcile(manualEdit).find(row => row.id === 'demo-alipay-meal').subcategory, '工作午餐');
console.log('样例通过。实付 ¥178.00，到账退款 ¥45.00，净支出 ¥133.00。全退隐藏后净支出一致。');
