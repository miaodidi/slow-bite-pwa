const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('app.js', 'utf8');
function fixture() {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', hidden: false, dataset: {}, classList: {add(){},remove(){}}, addEventListener(){}, querySelector(){return null;} });
    return elements.get(selector);
  };
  const context = vm.createContext({
    localStorage: {getItem(){return null;},setItem(){}},
    document: {querySelector:element, querySelectorAll(){return [];}, addEventListener(){}, body:{classList:{add(){},remove(){}}}},
    navigator:{}, window:{}, setInterval(){}, setTimeout(){}, clearTimeout(){}, Intl, Date: class extends Date {}
  });
  vm.runInContext(source, context);
  return expression => vm.runInContext(expression, context);
}
test('timestamp recovery covers each delivery state even after suspension', () => {
  const run = fixture();
  run('let testOrder = { createdAt: 1000000, cooldown: 15 }; let now = 1000000; Date.now = () => now;');
  for (const [seconds,state] of [[0,0],[180,1],[360,2],[540,3],[720,4],[900,5],[50000,5]]) {
    assert.equal(run(`now = 1000000 + ${seconds} * 1000; statusFor(testOrder)`), state);
  }
  assert.equal(run('remaining(testOrder)'), 0);
});
test('finished delivery remains visible until acknowledged; dismissed orders are excluded', () => {
  const run = fixture();
  run("orders = [{id:'test', createdAt:0, cooldown:15, dismissed:false, archived:false}]");
  assert.equal(run('activeOrder().id'), 'test');
  assert.equal(run('statusLabel(orders[0])'), '模拟配送完成');
  run('orders[0].dismissed=true');
  assert.equal(run('activeOrder()'), null);
  assert.equal(run('statusLabel(orders[0])'), '已结束 · 不想吃了');
});
test('cart total and empty cart close correctly', () => {
  const run=fixture();
  assert.equal(run("cart = {'tomato-noodle':2,'tea':1}; totalCart()"),76);
  run('cart = {}; cartModal()');
  assert.equal(run("$('#modal-backdrop').hidden"),true);
});
