const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('catalog.js', 'utf8')+'\n'+fs.readFileSync('app.js', 'utf8');
function fixture(saved={}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML:'',textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelector(){return null;} });
    return elements.get(selector);
  };
  const context = vm.createContext({
    localStorage:{getItem(k){return saved[k]||null;},setItem(k,v){saved[k]=v;}},
    document:{querySelector:element,querySelectorAll(){return [];},addEventListener(){},body:{dataset:{},classList:{add(){},remove(){}}}},
    navigator:{},window:{addEventListener(){},scrollTo(){}},history:{replaceState(){},pushState(){}},location:{pathname:'/',search:''},setInterval(){},setTimeout(){},clearTimeout(){},Intl,Date:class extends Date {}
  });
  vm.runInContext(source,context);
  return expression=>vm.runInContext(expression,context);
}
test('timestamp recovery covers all delivery states after background suspension',()=>{
 const run=fixture();run('let testOrder={createdAt:1000000,cooldown:15};let now=1000000;Date.now=()=>now;');
 for(const [seconds,state] of [[-100,0],[0,0],[180,1],[360,2],[540,3],[720,4],[900,5],[50000,5]])assert.equal(run(`now=1000000+${seconds}*1000;statusFor(testOrder)`),state);
 assert.equal(run('remaining(testOrder)'),0);
});
test('legacy orders and settings remain readable and finished orders remain visible',()=>{
 const run=fixture({'slowbite.orders.v1':JSON.stringify([{id:'old',createdAt:0,cooldown:15,dismissed:false,archived:false,items:[{name:'Old item',shop:'Old shop',price:18,count:1}],total:18}]),'slowbite.settings.v1':JSON.stringify({cooldown:20,contactName:'Existing recipient'})});
 assert.equal(run('settings.contactName'),'Existing recipient');assert.equal(run('settings.cooldown'),20);
 assert.equal(run('activeOrder().id'),'old');assert.equal(run('statusLabel(orders[0])'),'订单已送达');
 assert.match(run('renderOrders()'),/Old item/);run("route={page:'detail',id:'old'}");assert.match(run('renderDetail()'),/Old shop/);
 run('orders[0].dismissed=true');assert.equal(run('activeOrder()'),null);
});
test('cart preserves specifications and refuses implicit cross-store replacement',()=>{
 const run=fixture();run("route={page:'shop',id:'heytea'};addProduct('grape','少冰 / 半糖');addProduct('grape','正常冰 / 全糖');addProduct('grape','少冰 / 半糖')");
 assert.equal(run('cartCount()'),3);assert.equal(run('cartItems().length'),2);assert.equal(run('totalCart()'),57);
 run("route={page:'shop',id:'burger'};addProduct('beef')");assert.equal(run('cartShop'),'heytea');assert.equal(run('totalCart()'),57);
 assert.match(run("$('#modal').innerHTML"),/开始新的购物车/);
});
test('discount thresholds, category rules and decimal totals are accurate',()=>{
 const run=fixture();run("settings.coupons=['welcome','drink'];cartShop='heytea'");
 assert.equal(run('discountFor(19)'),0);assert.equal(run('discountFor(20)'),5);assert.equal(run('discountFor(31.99)'),5);assert.equal(run('discountFor(32)'),13);
 run("cartShop='burger'");assert.equal(run('discountFor(20)'),0);
 run("route={page:'shop',id:'noodles'};cartShop=null;addProduct('all');addProduct('all')");assert.equal(run('totalCart()'),29.48);assert.equal(run('checkoutTotal()'),29.48);
});
test('checkout enforces minimum spend and creates a persisted order snapshot',()=>{
 const run=fixture();run("route={page:'shop',id:'heytea'};addProduct('grape');checkout()");assert.equal(run('route.page'),'shop');
 run("addProduct('grape');settings.coupons=['welcome'];checkoutDraft.remark='少冰';checkout();createOrder()");
 assert.equal(run('orders.length'),1);assert.equal(run('orders[0].total'),26.8);assert.equal(run('orders[0].items[0].count'),2);assert.equal(run('orders[0].remark'),'少冰');assert.equal(run('orders[0].paymentStatus'),'virtual');assert.equal(run('cartCount()'),0);assert.equal(run('route.page'),'detail');
});
test('manual payment does not claim verified receipt or create order before user continuation',()=>{
 const run=fixture();run("route={page:'shop',id:'burger'};addProduct('beef');checkoutDraft.method='manual';submitOrder()");assert.equal(run('orders.length'),0);assert.match(run("$('#modal').innerHTML"),/到账状态：未核验/);
 run('createOrder(true)');assert.equal(run('orders[0].paymentStatus'),'user-confirmed-unverified');assert.equal(run('orders[0].reserveMode'),'manual');
});
test('search, category and delivery filters select matching merchants',()=>{
 const run=fixture();run("filters.query='汉堡'");assert.equal(run('filteredShops().length'),1);assert.equal(run('filteredShops()[0].id'),'burger');
 run("filters.query='';filters.fast=true");assert.equal(run('filteredShops()[0].id'),'luckin');
 run("filters.fast=false;filters.sort='距离最近'");assert.equal(run('filteredShops()[0].id'),'luckin');
});
test('cart is restored on reload and all offline catalog images exist in the cache',()=>{
 const saved={};let run=fixture(saved);run("route={page:'shop',id:'burger'};addProduct('beef');checkoutDraft.remark='少酱';saveCart()");
 run=fixture(saved);assert.equal(run('cartCount()'),1);assert.equal(run('totalCart()'),26);assert.equal(run('checkoutDraft.remark'),'少酱');
 const sw=fs.readFileSync('sw.js','utf8');const assets=JSON.parse(sw.match(/const ASSETS = (\[.*?\]);/)[1]);
 for(const asset of assets)assert.ok(fs.existsSync(asset.split('?')[0]),asset+' must exist');
 const images=JSON.parse(run('JSON.stringify([...SHOPS.flatMap(s=>[s.image,...s.menu.map(p=>p.image)]),...CATEGORIES.map(c=>"cat-"+c[1])])'));
 for(const image of images)assert.ok(assets.includes('./assets/'+image+'.webp'),image+' must be cached');
 assert.ok(assets.includes('./catalog.js'));
});
