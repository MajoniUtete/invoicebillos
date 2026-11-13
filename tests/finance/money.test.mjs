import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, decimalToMinor, minorToDecimal, divideRounded } from '../../lib/finance/money.mjs';

test('exact cents without floating point drift', () => {
  assert.equal(decimalToMinor('0.10') + decimalToMinor('0.20'), 30n);
  assert.equal(minorToDecimal(30n), '0.30');
});
test('subtotal, tax and discount have deterministic rounding', () => {
  assert.deepEqual(calculateInvoice({lines:[{quantity:3,unitPrice:'19.99'}],taxBasisPoints:2550,discount:'2.00'}), {subtotal:'59.97',tax:'15.29',discount:'2.00',total:'73.26'});
});
test('rejects invalid inputs instead of silently clamping totals', () => {
  assert.throws(() => decimalToMinor('-1'));
  assert.throws(() => decimalToMinor('1.001'));
  assert.throws(() => calculateInvoice({lines:[{quantity:1,unitPrice:'1.00'}],discount:'3.00'}));
  assert.throws(() => calculateInvoice({lines:[{quantity:0,unitPrice:'1.00'}]}));
});
test('currency scales', () => {
  assert.equal(decimalToMinor('100',0),100n);
  assert.equal(minorToDecimal(decimalToMinor('1.250',3),3),'1.250');
});
test('half-up round', () => assert.equal(divideRounded(1n,2n),1n));

test('fractional quantities round each line half up', () => {
  assert.equal(calculateInvoice({lines:[{quantity:'1.25',unitPrice:'0.10'}]}).total, '0.13');
  assert.throws(() => calculateInvoice({lines:[{quantity:'1.001',unitPrice:'1.00'}]}));
});
test('zero-decimal currency rounds fractional quantities', () => {
  assert.equal(calculateInvoice({lines:[{quantity:'1.50',unitPrice:'101'}],scale:0}).total, '152');
});

test('keeps currencies separate and adds cents exactly in summaries', async () => {
  const {currencyTotals}=await import('../../lib/finance/money.mjs');
  assert.equal(currencyTotals([{currency:'EUR',total:'0.10'},{currency:'EUR',total:'0.20'},{currency:'USD',total:'1.00'},{currency:'JPY',total:'100'}]), 'EUR 0.30 · JPY 100 · USD 1.00');
  assert.equal(currencyTotals([{currency:'EUR',total:'invalid'}]),'EUR unavailable');
  assert.equal(currencyTotals([]),'—');
});
