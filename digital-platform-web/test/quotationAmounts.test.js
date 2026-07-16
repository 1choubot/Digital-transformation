import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateLineAmount,
  calculateTotalAmount,
  formatRmbUppercaseFromAmount,
  normalizeQuantity,
  normalizeUnitPrice,
  roundMoney
} from '../src/composables/project-stage/solution-design/quotationAmounts.js';

test('quotation line amount multiplies quantity and unit price', () => {
  assert.equal(calculateLineAmount('2', '3.5'), '7.00');
  assert.equal(normalizeQuantity('2.0000'), '2');
  assert.equal(normalizeUnitPrice('3.5'), '3.50');
});

test('quotation amount supports four quantity decimals and two price decimals', () => {
  assert.equal(normalizeQuantity('1.2345'), '1.2345');
  assert.equal(normalizeQuantity('1.23456'), null);
  assert.equal(normalizeUnitPrice('10.01'), '10.01');
  assert.equal(normalizeUnitPrice('10.001'), null);
  assert.equal(calculateLineAmount('1.2345', '10.01'), '12.36');
});

test('quotation money rounds half up to two decimals', () => {
  assert.equal(roundMoney('1.004'), '1.00');
  assert.equal(roundMoney('1.005'), '1.01');
  assert.equal(roundMoney('0'), '0.00');
});

test('quotation total sums already rounded line amounts', () => {
  const items = [
    { quantity: '0.3333', unitPrice: '1.00' },
    { quantity: '0.3333', unitPrice: '1.00' }
  ];

  assert.equal(calculateLineAmount(items[0].quantity, items[0].unitPrice), '0.33');
  assert.equal(calculateLineAmount(items[1].quantity, items[1].unitPrice), '0.33');
  assert.equal(calculateTotalAmount(items), '0.66');
});

test('quotation empty or invalid line inputs do not produce line amounts', () => {
  assert.equal(calculateLineAmount('', '3.50'), null);
  assert.equal(calculateLineAmount('2', ''), null);
  assert.equal(calculateLineAmount('1.23456', '3.50'), null);
  assert.equal(calculateLineAmount('2', '3.555'), null);
});

test('quotation total ignores removed, empty and invalid rows', () => {
  const items = [
    { quantity: '2', unitPrice: '3.50' },
    { quantity: '', unitPrice: '9.99' },
    { quantity: '1.23456', unitPrice: '10.00' }
  ];

  assert.equal(calculateTotalAmount(items), '7.00');
  assert.equal(calculateTotalAmount(items.slice(1)), '0.00');
});

test('quotation amount uppercase matches backend RMB formatting', () => {
  assert.equal(formatRmbUppercaseFromAmount('0.00'), '零元整');
  assert.equal(formatRmbUppercaseFromAmount('1.00'), '壹元整');
  assert.equal(formatRmbUppercaseFromAmount('1.01'), '壹元零壹分');
  assert.equal(formatRmbUppercaseFromAmount('1.10'), '壹元壹角');
  assert.equal(formatRmbUppercaseFromAmount('10.05'), '壹拾元零伍分');
  assert.equal(formatRmbUppercaseFromAmount('10001.01'), '壹万零壹元零壹分');
});

test('quotation total preview can be formatted as uppercase RMB', () => {
  const totalAmount = calculateTotalAmount([
    { quantity: '2', unitPrice: '3.50' },
    { quantity: '1', unitPrice: '3.05' }
  ]);

  assert.equal(totalAmount, '10.05');
  assert.equal(formatRmbUppercaseFromAmount(totalAmount), '壹拾元零伍分');
});
