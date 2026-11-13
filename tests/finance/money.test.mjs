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
