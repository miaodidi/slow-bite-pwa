const STORAGE = { orders: 'slowbite.orders.v1', settings: 'slowbite.settings.v1' };
const $ = s => document.querySelector(s);
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money = n => `¥${Number(n).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}`;
const img = (name, cls = '', alt = '') => `<img class="${cls}" src="assets/${name}.webp" alt="${esc(alt)}" loading="lazy" draggable="false">`;
const paths = {
  back:'m15 4-8 8 8 8', search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  pin:'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14Z M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  cart:'M2 3h3l2 13h12l3-10H6 M10 21h.01 M18 21h.01', user:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M7 14q5 6 10 0',
  order:'M7 2h10q3 0 3 3v14q0 3-3 3H7q-3 0-3-3V5q0-3 3-3 M8 8h8 M8 13h6',
  ticket:'M4 3h16v5q-5 4 0 8v5H4v-5q5-4 0-8V3 M12 7v10', chevron:'m9 5 7 7-7 7',
  close:'m6 6 12 12 M6 18 18 6', clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
  bell:'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5l-2 4 M9 21h6', speaker:'M3 9h4l6-5v16l-6-5H3V9 M17 8q4 4 0 8 M20 5q6 7 0 14',
  filter:'M4 5h16 M7 12h10 M10 19h4', check:'m5 12 5 5L20 7', heart:'M12 21S1 14 2 7s8-6 10-1c2-5 11-6 10 1s-10 14-10 14',
  phone:'M5 2 2 6q3 12 16 16l4-4-5-5-3 3q-5-2-6-6l3-3-6-5', settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',
  wallet:'M3 5h18v16H3V5l15-3v3 M21 11h-7v5h7 M17 13.5h.01', refresh:'M20 7a9 9 0 0 0-15-2L2 8 M2 2v6h6 M4 17a9 9 0 0 0 15 2l3-3 M22 22v-6h-6', home:'m2 10 10-8 10 8 M5 9v13h14V9 M10 22v-8h4v8'
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.order}"/></svg>`; }
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let orders = read(STORAGE.orders, []);
if (!Array.isArray(orders)) orders = [];
let settings = {cooldown:15,reserveMode:'virtual',contactName:'',contactNote:'',qr:'',address:'清华同方科技广场',room:'A座 · 一层大厅',recipient:'我',phone:'',coupons:[],...read(STORAGE.settings,{})};
settings.cooldown = Math.min(45, Math.max(3, Number(settings.cooldown) || 15));
if (!Array.isArray(settings.coupons)) settings.coupons = [];
let route = {page:'home'};
const savedCart=read('slowbite.cart.v1',{});
let cart=savedCart.items&&typeof savedCart.items==='object'?savedCart.items:{};
let cartShop=SHOPS.some(s=>s.id===savedCart.shopId)?savedCart.shopId:null;
if(!cartShop)cart={};
let filters = {category:'全部',query:'',sort:'推荐排序',fast:false,deal:false,brand:false};
let storeTab = '点菜';
let selectedGroup = '';
let checkoutDraft = {remark:'',utensils:'无需餐具',coupon:true,method:settings.reserveMode,...read('slowbite.checkout.v1',{})};
let optionDraft = {};
let couponBanner = true;
let lastOrderState = '';
let lastListStates='';
let toastTimer;
const updater = new AppUpdater({
  current: APP_RELEASE,
  baseURL: new URL('./', document.baseURI).href,
  onChange: () => renderUpdateCard(),
  beforeReload: latest => {
    // Preserve the current local data before any worker activation or page reload.
    if (!save()) throw new Error('本地记录保存失败，暂未更新');
    localStorage.setItem('slowbite.cart.v1',JSON.stringify({shopId:cartShop,items:cart}));
    localStorage.setItem('slowbite.checkout.v1',JSON.stringify(checkoutDraft));
    sessionStorage.setItem('slowbite.update.v1',JSON.stringify({target:latest.id}));
  }
});
function releaseLabel(release) { return `v${esc(release.version)} · ${esc(release.build)}`; }
function updateCard() {
  const {phase,latest,checkedAt,error,step}=updater.state;
  const busy=phase==='checking'||phase==='updating';
  const available=latest&&latest.id!==APP_RELEASE.id;
  const titles={idle:'版本更新',checking:'正在检查更新',current:'已是最新版本',available:'发现新版本',updating:'正在更新',error:'暂时未能更新'};
  const message=phase==='updating'?esc(step):phase==='error'?esc(error):available?`最新版 ${releaseLabel(latest)}`:checkedAt?`上次检查 ${time(checkedAt)}，进入本页会自动检查`:'进入本页自动检查，也可以手动同步';
  return `<div class="update-card-head"><span class="update-mark ${busy?'is-checking':''}">${icon('refresh')}</span><div><h3>${titles[phase]}</h3><p>当前版本 <b>${releaseLabel(APP_RELEASE)}</b></p></div>${available?'<span class="new-version-dot">NEW</span>':''}</div><p class="update-status ${phase==='error'?'update-error':''}" role="status">${message}</p><div class="update-buttons"><button class="${available?'yellow-button':'outline-button'}" data-action="${available?'apply-update':'check-update'}" ${busy?'disabled':''}>${phase==='updating'?'正在下载…':phase==='checking'?'检查中…':available?'更新到最新版':'检查更新'}</button>${!available?`<button class="text-button" data-action="apply-update" ${busy?'disabled':''}>同步刷新</button>`:`<button class="text-button" data-action="check-update" ${busy?'disabled':''}>重新检查</button>`}</div><small class="update-preserve">更新保留订单、地址、购物车和收款设置</small>`;
}
function renderUpdateCard() { const card=$('#app-update-card');if(card&&route.page==='mine')card.innerHTML=updateCard(); }
function enterMine() { if(route.page==='mine')updater.check(); }

function save() { try { localStorage.setItem(STORAGE.orders,JSON.stringify(orders));localStorage.setItem(STORAGE.settings,JSON.stringify(settings));return true; } catch {toast('存储空间不足，请导出记录或换一张较小的收款码');return false;} }
function toast(text) { $('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400); }
function openModal(html) { $('#modal').innerHTML=html;$('#modal-backdrop').hidden=false;document.body.classList.add('modal-open'); }
function closeModal() { $('#modal-backdrop').hidden=true;document.body.classList.remove('modal-open'); }
function modalHead(title) { return `<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon('close')}</button></div>`; }
function time(t) { return new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'}).format(new Date(t)); }
function date(t) { return new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t)); }
function getShop(id=route.id) { return SHOPS.find(s=>s.id===id); }
function saveCart(){try{localStorage.setItem('slowbite.cart.v1',JSON.stringify({shopId:cartShop,items:cart}));localStorage.setItem('slowbite.checkout.v1',JSON.stringify(checkoutDraft));}catch{}}
function go(page, extra={}) { saveCart();closeModal();route={page,...extra};history.pushState(route,'','#'+page+(extra.id?'/'+extra.id:''));window.scrollTo(0,0);render();enterMine(); }
function back() { if (route.page==='checkout') go('shop',{id:cartShop});else if(route.page==='detail')go('orders');else go('home'); }
function topbar(title, action='back', right='') { return `<header class="page-header"><button class="icon-button" data-action="${action}" aria-label="返回">${icon('back')}</button><h1>${title}</h1>${right||'<span class="header-spacer"></span>'}</header>`; }
function renderNav() {
  const p=route.page;const hidden=['shop','checkout','detail','search','list'].includes(p);$('#bottom-nav').hidden=hidden;
  const count=orders.filter(o=>!o.dismissed&&!o.archived&&statusFor(o)<5).length;
  $('#bottom-nav').innerHTML=[['home','外卖','home'],['coupons','神券','ticket'],['orders','订单','order'],['mine','我的','user']].map(([page,label,i])=>`<button class="nav-item ${p===page?'active':''}" data-action="nav" data-page="${page}"><span class="nav-symbol">${page==='home'&&p==='home'?'<b>外卖</b>':icon(i)}${page==='coupons'?'<em>神</em>':''}</span><small>${label}</small>${page==='orders'&&count?`<sup>${count}</sup>`:''}</button>`).join('');
  $('#floating-ui').innerHTML=p==='home'?`${couponBanner?`<div class="coupon-banner"><i>神券</i><span>你有一张<b>13元</b>神券未使用</span><button data-action="nav" data-page="coupons">去查看</button><button class="banner-close" data-action="hide-banner" aria-label="关闭优惠提示">×</button></div>`:''}<button class="floating-cart" data-action="floating-cart" aria-label="购物车">${icon('cart')}${cartCount()?`<b>${cartCount()}</b>`:''}</button>`:'';
}
function pageChromeColor() {
  if (['home', 'mine', 'coupons'].includes(route.page)) return '#ffe23b';
  if (route.page === 'shop') {
    return {heytea:'#e6e7bd',luckin:'#142b60',pancake:'#c75226',noodles:'#c75226',burger:'#b23822',fruit:'#08663e',qixian:'#08663e',tea:'#ead9c5',mumou:'#ead9c5',maiji:'#ead9c5'}[route.id] || '#d9e7cf';
  }
  return route.page === 'list' ? '#f5f5f6' : '#ffffff';
}
function render() {
  document.body.dataset.page=route.page;
  // The root canvas is also used by iOS for the status bar and overscroll.
  // Keep it synchronized with the visible page, including installed older web clips.
  const chromeColor = pageChromeColor();
  document.querySelector('meta[name="theme-color"]').content = chromeColor;
  document.documentElement.style.setProperty('--chrome-color', chromeColor);
  const views={home:renderHome,list:renderList,search:renderSearch,shop:renderShop,checkout:renderCheckout,orders:renderOrders,detail:renderDetail,coupons:renderCoupons,mine:renderMine};
  $('#app-main').innerHTML=(views[route.page]||renderHome)();renderNav();lastListStates=orders.map(o=>o.id+statusLabel(o)).join('|');
}
function sectionTabs() { return `<div class="merchant-tabs"><button class="${!filters.deal?'chosen':''}" data-action="nearby">附近商家</button><button class="${filters.deal?'chosen':''}" data-action="deals">特价外卖 <em>一键下单</em></button></div>`; }
function filterBar() { return `<div class="filter-bar"><button data-action="sort">${filters.sort}⌄</button><button class="${filters.deal?'on':''}" data-action="toggle-filter" data-key="deal">满38减13</button><button class="${filters.fast?'on':''}" data-action="toggle-filter" data-key="fast">20分钟</button><button class="${filters.brand?'on':''}" data-action="toggle-filter" data-key="brand">神券商家</button><button data-action="filter" aria-label="筛选">${icon('filter')}</button></div>`; }
function filteredShops() {
 let list=SHOPS.filter(s=>(filters.category==='全部'||s.category===filters.category)&&(!filters.query||(s.name+s.category+s.menu.map(p=>p.name).join('')).toLowerCase().includes(filters.query.toLowerCase()))&&(!filters.fast||s.eta<=20)&&(!filters.brand||s.coupons.length));
 if(filters.deal)list=list.filter(s=>s.menu.some(p=>p.price<20));
 if(filters.sort==='距离最近') list.sort((a,b)=>distance(a)-distance(b));
 if(filters.sort==='销量最高') list.sort((a,b)=>parseSales(b.sales)-parseSales(a.sales));
 if(filters.sort==='配送最快') list.sort((a,b)=>a.eta-b.eta);
 return list;
}
function distance(s) {return parseFloat(s.distance)*(s.distance.includes('km')?1000:1);}
function parseSales(s) {return parseFloat(s)*(s.includes('万')?10000:1);}
function shopCard(s) {return `<article class="shop-card" data-action="shop" data-id="${s.id}" tabindex="0" role="button" aria-label="进入${esc(s.name)}">${img(s.image,'shop-cover',s.name)}<div class="shop-info"><div class="shop-title"><h3>${s.name}</h3><span>⋮</span></div><p class="shop-sales">月售${s.sales}<span>${s.tags[0]}</span></p><div class="shop-delivery"><span>起送 ¥${s.min} 配送 ${s.fee?'约'+money(s.fee):'¥0'}</span><span>${s.distance} ${s.eta}分钟</span></div><div class="shop-ranking"><strong>${s.rating}<small>分</small></strong><span>✦ ${s.rank}</span></div><div class="shop-coupons"><b>神券</b>${s.coupons.map(c=>`<span>${c}</span>`).join('')}</div><div class="shop-tags">${s.tags.slice(1).map(t=>`<span>${t}</span>`).join('')}<span>${s.eta<=20?'附近极速送达':'支持放心吃'}</span></div></div></article>`;}
function renderHome() {
 const active=activeOrder();
 return `<header class="home-header"><div class="home-top"><button class="home-brand" data-action="home-top">${icon('back')}<b>外卖</b></button><div class="home-tabs"><button class="selected" data-action="home-top">首页</button><button data-action="pickup">自取</button></div><button class="icon-button" data-action="nav" data-page="orders" aria-label="订单消息">${icon('bell')}${active?'<i class="notification-dot"></i>':''}</button></div><button class="location" data-action="address">${icon('pin')}<b>${esc(settings.address)}</b>${icon('chevron')}</button><button class="search-box" data-action="search">${icon('search')}<span>袁记云饺</span><b>搜索</b></button></header>
 <section class="category-panel"><button class="announcement" data-action="announcement">${icon('speaker')}<span>好好吃饭，今天也要好好生活</span>${icon('chevron')}</button><div class="category-grid">${CATEGORIES.map(([name,key],i)=>`<button class="category ${i>4?'small-category':''}" data-action="category" data-category="${name}">${img('cat-'+key,'',name)}<span>${name}</span></button>`).join('')}</div><div class="carousel-dots"><i></i><i></i></div></section>
 <section class="promotions"><div class="promo-card"><h2>神抢手 <small>限时秒杀中</small></h2>${PROMOS.slice(0,2).map(promoRow).join('')}</div><div class="promo-card"><h2>拼好饭精选 <small>0元起送</small></h2>${PROMOS.slice(2).map(promoRow).join('')}</div></section>
 <button class="express-banner" data-action="fast"><b>极速送达</b><span>这些商家<strong>20分钟</strong>送达</span><i>马上点</i></button>
 ${active?`<button class="active-order-strip" data-action="detail" data-id="${active.id}">${icon('order')}<span><b>${statusLabel(active)}</b> · ${esc(active.items[0]?.shop||active.items[0]?.name||'我的订单')}</span>${icon('chevron')}</button>`:''}
 <section class="home-merchants">${sectionTabs()}${filterBar()}<div class="merchant-list">${filteredShops().map(shopCard).join('')}</div><p class="list-end">附近的好味道，都在这里了</p></section>`;
}
function promoRow(p) {return `<button class="promo-product" data-action="shop" data-id="${p.shop}">${img(p.image,'',p.sub)}<span class="promo-copy"><b>${p.title}</b><span>${p.sub}</span><strong><small>¥</small>${p.price}<em>${p.note}</em></strong></span></button>`;}
function renderList() { return `<div class="listing-header">${topbar(filters.category==='全部'?'附近商家':esc(filters.category))}<button class="search-box compact-search" data-action="search">${icon('search')}<span>${esc(filters.query)||'搜索商家、商品名称'}</span><b>搜索</b></button>${sectionTabs()}${filterBar()}</div><div class="merchant-list listing-cards">${filteredShops().map(shopCard).join('')||empty('暂时没有找到合适的商家','试试调整筛选，或换一个关键词','reset-filters','查看全部商家')}</div>`; }
function renderSearch() {return `${topbar('搜索')}<form id="search-form" class="search-form"><div>${icon('search')}<input name="query" id="search-input" value="${esc(filters.query)}" placeholder="商家、菜品、品类" autocomplete="off"><button type="submit">搜索</button></div></form><section class="search-discover"><h3>大家都在搜</h3><div class="search-chips">${['奶茶','汉堡','咖啡','炒米粉','鸡蛋灌饼','水果'].map(q=>`<button data-action="query" data-query="${q}">${q}</button>`).join('')}</div><h3>附近人气好店</h3>${SHOPS.slice(0,4).map((s,i)=>`<button class="search-suggestion" data-action="shop" data-id="${s.id}"><b>${i+1}</b>${s.name}${icon('chevron')}</button>`).join('')}</section>`;}
function empty(title,sub,action='nav',label='去逛逛') {return `<div class="empty-state"><div>${icon('order')}</div><h3>${title}</h3><p>${sub}</p><button class="yellow-button" data-action="${action}" data-page="home">${label}</button></div>`;}
function renderShop() {
 const s=getShop();if(!s)return empty('店铺未找到','返回首页看看吧');
 const groups=[...new Set(s.menu.map(p=>p.group))];if(!groups.includes(selectedGroup))selectedGroup=groups[0];
 return `<div class="store-banner banner-${s.id}"><div class="store-top"><button class="round-button" data-action="back" aria-label="返回">${icon('back')}</button><span>${s.brand}</span><div><button class="round-button" data-action="store-search" aria-label="搜索店内商品">${icon('search')}</button><button class="round-button" data-action="favorite" data-id="${s.id}" aria-label="收藏">${icon('heart')}</button></div></div><div class="store-banner-copy"><strong>${s.brand}</strong><span>每一份好味道 · 都值得期待</span></div></div>
 <section class="store-profile">${img(s.image,'store-logo',s.name)}<h1>${s.name}</h1><p><b class="orange">${s.rating}分</b> 月售${s.sales} <span class="delivery-badge">专送</span> 约${s.eta}分钟 <span>${s.distance}</span></p><p class="store-notice">公告：${s.notice}</p><button class="store-voucher" data-action="claim-store"><b>神券</b><span>${s.coupons.join('　')}</span><em>领券</em></button></section>
 <div class="store-tabs">${['点菜','评价','商家'].map(t=>`<button class="${storeTab===t?'selected':''}" data-action="store-tab" data-tab="${t}">${t}${t==='评价'?'<small>999+</small>':''}</button>`).join('')}<span>放心吃 · 品质保障</span></div>
 ${storeTab==='点菜'?`<section class="store-menu"><aside class="menu-categories">${groups.map((g,i)=>`<button class="${selectedGroup===g?'selected':''}" data-action="menu-group" data-group="${g}">${i===0?'<i>热</i>':''}${g}</button>`).join('')}</aside><div class="menu-products"><div class="menu-offer">新客专享好价 <span>好喝好吃，再来一单</span></div>${groups.map(g=>`<section class="menu-group" data-menu-section="${g}"><h2>${g}</h2>${s.menu.filter(p=>p.group===g).map(p=>productCard(s,p)).join('')}</section>`).join('')}<p class="menu-end">本店商品均已展示</p></div></section>`:storeTab==='评价'?renderReviews(s):`<section class="store-about"><h3>商家信息</h3><p>${s.notice}</p><div>营业时间 <b>09:00—23:30</b></div><div>配送服务 <b>商家专送</b></div><div>服务支持 <b>支持订单备注 · 联系商家</b></div></section>`}
 <div class="store-cart" id="store-cart">${cartBar(s)}</div>`;
}
function renderReviews(s){return `<section class="reviews"><div class="review-score"><strong>${s.rating}</strong><span>商家评分<br><small>口味 ${s.rating}　包装 4.9</small></span><b>好评如潮</b></div><div class="review-tags"><span>全部</span><span>味道很赞</span><span>包装用心</span><span>回头客</span></div>${[['匿名用户','味道不错，包装也很仔细，是会再来的一家。'],['一位食客','正好是想吃的味道，这顿很满足。'],['附近的朋友','选择很多，点单方便，喜欢招牌款。']].map(([n,c])=>`<article class="review"><div class="avatar">${icon('user')}</div><div><b>${n}</b><small>★★★★★ <span>近期</span></small><p>${c}</p></div></article>`).join('')}<p class="muted centered">个人体验用示例评价</p></section>`;}
function productCard(s,p) {const count=Object.values(cart).filter(l=>l.productId===p.id&&l.shopId===s.id).reduce((n,l)=>n+l.count,0);return `<article class="product-card">${img(p.image,'product-photo',p.name)}<div class="product-info"><h3>${p.name}</h3><p>${p.desc}</p><small>月售${p.sold} 好评率98%</small><div class="product-price"><strong>${money(p.price)}</strong><del>${money(p.original)}</del>${p.options?`<button class="spec-button" data-action="spec" data-id="${p.id}">选规格${count?`<sup>${count}</sup>`:''}</button>`:`<div class="stepper">${count?`<button data-action="minus-product" data-id="${p.id}" aria-label="减少${p.name}">−</button><span>${count}</span>`:''}<button class="plus" data-action="add" data-id="${p.id}" aria-label="添加${p.name}">+</button></div>`}</div></div></article>`;}
function cartItems(){return Object.values(cart).filter(l=>l.count>0);}
function cartCount(){return cartItems().reduce((sum,l)=>sum+l.count,0);}
function totalCart(){return Math.round(cartItems().reduce((sum,l)=>sum+l.price*l.count,0)*100)/100;}
function cartBar(s){const same=cartShop===s.id;return `<button class="cart-ball ${same&&cartCount()?'filled':''}" data-action="cart" aria-label="查看购物车">${icon('cart')}${same&&cartCount()?`<sup>${cartCount()}</sup>`:''}</button><button class="cart-summary" data-action="cart"><strong>${same&&cartCount()?money(totalCart()):'未选购商品'}</strong><small>另需配送费 ${money(s.fee)}</small></button><button class="checkout-button ${same&&cartCount()?'ready':''}" data-action="checkout">${same&&cartCount()?(totalCart()<s.min?'差'+money(s.min-totalCart())+'起送':'去结算'):`¥${s.min}起送`}</button>`;}
function addProduct(id,options='') {
 const s=getShop(route.page==='shop'?route.id:cartShop);const p=s?.menu.find(p=>p.id===id);if(!p)return;
 if(cartShop&&cartShop!==s.id&&cartCount()){openModal(`${modalHead('开始新的购物车')}<p class="help-text">当前购物车来自另一家店。切换后会清空已选商品。</p><button class="yellow-button full" data-action="switch-cart" data-id="${id}" data-options="${esc(options)}">清空并加入当前店铺</button>`);return;}
 cartShop=s.id;const key=s.id+'-'+p.id+'-'+options;
 cart[key]={...p,key,productId:p.id,shopId:s.id,shop:s.name,options,count:(cart[key]?.count||0)+1};refreshCart();
}
function refreshCart(){saveCart();if(route.page==='shop'){const y=window.scrollY;render();window.scrollTo(0,y);}else renderNav();}
function minusProduct(id){const line=cartItems().find(l=>l.productId===id);if(line){line.count--;if(line.count<=0)delete cart[line.key];refreshCart();}}
function cartModal(){const items=cartItems();if(!items.length){closeModal();toast('还没有选购商品');return;}openModal(`${modalHead('已选商品')}<div class="cart-modal-list">${items.map(l=>`<div class="cart-line">${img(l.image,'',l.name)}<div><b>${l.name}</b><small>${esc(l.options||'默认规格')}</small><strong>${money(l.price)}</strong></div><div class="stepper"><button data-action="cart-minus" data-key="${esc(l.key)}" aria-label="减少">−</button><span>${l.count}</span><button class="plus" data-action="cart-plus" data-key="${esc(l.key)}" aria-label="增加">+</button></div></div>`).join('')}</div><div class="cart-total"><button data-action="clear-cart">清空购物车</button><span>合计 <b>${money(totalCart())}</b></span></div><button class="yellow-button full" data-action="checkout">去结算</button>`);}
function specs(id){const p=getShop()?.menu.find(p=>p.id===id);if(!p)return;optionDraft={id,size:'标准杯',temp:'正常冰',sugar:'七分甜'};renderSpecs();}
function renderSpecs(){const p=getShop().menu.find(p=>p.id===optionDraft.id);openModal(`${modalHead(p.name)}<div class="spec-preview">${img(p.image,'',p.name)}<p>${p.desc}<strong>${money(p.price)}</strong></p></div>${[['杯型','size',['标准杯','大杯']],['温度','temp',['正常冰','少冰','去冰','热']],['甜度','sugar',['全糖','七分甜','半糖','不另加糖']]].map(([label,key,opts])=>`<div class="spec-group"><h3>${label}</h3><div>${opts.map(o=>`<button class="${optionDraft[key]===o?'selected':''}" data-action="option" data-key="${key}" data-value="${o}">${o}</button>`).join('')}</div></div>`).join('')}<button class="yellow-button full" data-action="add-spec">加入购物车 · ${money(p.price)}</button>`);}
function discountFor(subtotal){if(!checkoutDraft.coupon)return 0;const welcome=settings.coupons.includes('welcome')&&subtotal>=32?13:0;const drink=settings.coupons.includes('drink')&&subtotal>=20&&getShop(cartShop)?.category==='甜点饮品'?5:0;return Math.max(welcome,drink);}
function checkoutTotal(){const s=getShop(cartShop);return Math.round((totalCart()+(s?.fee||0)-discountFor(totalCart()))*100)/100;}
function renderCheckout(){const s=getShop(cartShop);if(!s||!cartCount())return `${topbar('确认订单')}${empty('购物车还是空的','选好喜欢的，再来结算')}`;return `${topbar('提交订单')}<section class="checkout-address" data-action="address" role="button" tabindex="0"><div><span class="address-label">外卖配送</span><h2>${esc(settings.address)}</h2><strong>${esc(settings.room)}</strong><p>${esc(settings.recipient)} ${esc(settings.phone)}</p></div>${icon('chevron')}</section><div class="checkout-block delivery-time"><span>立即送出</span><b>预计 ${time(Date.now()+settings.cooldown*60000)} 送达 ${icon('chevron')}</b></div><section class="checkout-block"><h3>${s.name}</h3>${cartItems().map(l=>`<div class="checkout-line">${img(l.image,'',l.name)}<div><b>${l.name}</b><small>${esc(l.options||'标准份')}<br>×${l.count}</small></div><strong>${money(l.price*l.count)}</strong></div>`).join('')}<div class="bill-row"><span>配送费</span><span>${money(s.fee)}</span></div><button class="bill-row" data-action="checkout-coupon"><span>神券 / 红包</span><b class="red">${discountFor(totalCart())?'-'+money(discountFor(totalCart())):settings.coupons.includes('welcome')?'满32元可用':'领取13元神券'} ${icon('chevron')}</b></button><div class="bill-total">已优惠 <b class="red">${money(discountFor(totalCart()))}</b>　小计 <strong>${money(checkoutTotal())}</strong></div></section><section class="checkout-block"><button class="bill-row" data-action="remark"><span>备注</span><span class="muted truncate">${esc(checkoutDraft.remark)||'口味、偏好等要求'} ${icon('chevron')}</span></button><button class="bill-row" data-action="utensils"><span>餐具份数</span><span class="muted">${checkoutDraft.utensils} ${icon('chevron')}</span></button><button class="bill-row" data-action="payment-method"><span>支付方式</span><span>${checkoutDraft.method==='manual'?'<b class="wechat-dot">●</b> 微信手动转账':'余额支付'} ${icon('chevron')}</span></button></section><div class="checkout-footer"><div>合计 <strong>${money(checkoutTotal())}</strong><small>已优惠 ${money(discountFor(totalCart()))}</small></div><button data-action="submit-order">提交订单</button></div>`;}
function checkout(){if(!cartCount()||(route.page==='shop'&&cartShop!==route.id))return toast('先选一份喜欢的商品吧');const s=getShop(cartShop);if(totalCart()<s.min)return toast('还差'+money(s.min-totalCart())+'达到起送价');closeModal();checkoutDraft.method=settings.reserveMode;go('checkout');}
function submitOrder(){if(!cartCount())return;saveCart(); if(checkoutDraft.method==='manual'){showManualTransfer(null);return;}createOrder();}
function createOrder(manualAcknowledged=false){if(!cartCount())return;const s=getShop(cartShop);const order={id:'SB-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase(),createdAt:Date.now(),cooldown:settings.cooldown,shopId:s.id,shop:s.name,items:cartItems().map(l=>({...l})),total:checkoutTotal(),subtotal:totalCart(),fee:s.fee,discount:discountFor(totalCart()),reserveMode:checkoutDraft.method,paymentStatus:manualAcknowledged?'user-confirmed-unverified':'virtual',remark:checkoutDraft.remark,address:{address:settings.address,room:settings.room,recipient:settings.recipient,phone:settings.phone},dismissed:false,archived:false};orders.push(order);if(!save()){orders.pop();return;}cart={};go('detail',{id:order.id});toast('下单成功');}
const STATUS=[{label:'订单已提交',sub:'正在等待商家接单',icon:'order'},{label:'商家已接单',sub:'商家已确认，正在为你准备',icon:'check'},{label:'商家备餐中',sub:'美味正在制作，请耐心等待',icon:'clock'},{label:'骑手已接单',sub:'骑手正在赶往商家取餐',icon:'pin'},{label:'骑手配送中',sub:'骑手已取餐，正在赶往你的地址',icon:'pin'},{label:'订单已送达',sub:'感谢你的耐心等待，祝你用餐愉快',icon:'check'}];
function statusFor(o){return Math.min(5,Math.floor(Math.max(0,Date.now()-o.createdAt)/(o.cooldown*60000/5)));}
function remaining(o){return Math.max(0,o.createdAt+o.cooldown*60000-Date.now());}
function statusLabel(o){return o.dismissed?'订单已取消':o.archived?'订单已完成':STATUS[statusFor(o)].label;}
function activeOrder(){return [...orders].reverse().find(o=>!o.dismissed&&!o.archived)||null;}
function orderImage(o){return o.items[0]?.image||getShop(o.shopId)?.image||'pancake';}
function renderOrders(){const sorted=[...orders].sort((a,b)=>b.createdAt-a.createdAt);return `<header class="simple-heading"><h1>我的订单</h1><button class="icon-button" data-action="search" aria-label="搜索商家">${icon('search')}</button></header><div class="order-tabs"><b>全部</b><span>每一次想吃，都有记录</span></div><section class="order-list">${sorted.map(o=>`<article class="history-card"><button class="history-head" data-action="detail" data-id="${o.id}">${img(getShop(o.shopId)?.image||orderImage(o),'','店铺')}<b>${esc(o.shop||o.items[0]?.shop||'我的外卖')}</b>${icon('chevron')}<span class="${statusFor(o)<5&&!o.dismissed?'orange':''}">${statusLabel(o)}</span></button><button class="history-body" data-action="detail" data-id="${o.id}">${img(orderImage(o),'','商品')}<div><strong>${esc(o.items[0]?.name||'外卖订单')}</strong><p>${date(o.createdAt)}</p><small>共${o.items.reduce((n,l)=>n+l.count,0)}件商品</small></div><b>${money(o.total)}</b></button><div class="history-actions"><button data-action="detail" data-id="${o.id}">查看详情</button><button class="outlined-yellow" data-action="reorder" data-id="${o.id}">再来一单</button></div></article>`).join('')||empty('还没有订单','附近的好味道，等你发现')}</section>`;}
function mapMarkup(o,index){const progress=Math.min(1,Math.max(0,(index-2)/3));return `<div class="delivery-map"><svg viewBox="0 0 402 220" aria-label="配送路线示意图" role="img"><rect width="402" height="220" fill="#edf0e9"/><g fill="#e0e8d7"><rect x="12" y="14" width="85" height="46" rx="8"/><rect x="284" y="140" width="95" height="65" rx="12"/><rect x="165" y="80" width="78" height="59" rx="7"/></g><g stroke="#fff" stroke-width="13" fill="none"><path d="M-10 72 412 152 M108-20 144 240 M293-20 254 240 M0 180 402 53"/></g><g stroke="#d9dbd4" stroke-width="1" fill="none"><path d="M-10 72 412 152 M108-20 144 240 M293-20 254 240 M0 180 402 53"/></g><path d="M85 145 140 137 198 111 270 125 300 73" stroke="#fff" stroke-width="10" fill="none"/><path d="M85 145 140 137 198 111 270 125 300 73" stroke="#ffbe00" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 5" fill="none"/><g font-size="9" fill="#a0a69d"><text x="163" y="181">清华东路</text><text x="19" y="89">五道口</text><text x="310" y="181">社区公园</text><text x="301" y="38">科技广场</text></g><circle cx="85" cy="145" r="14" fill="#fff" stroke="#ffbd00" stroke-width="3"/><text x="85" y="149" font-size="11" text-anchor="middle" fill="#4b4021">店</text><circle cx="300" cy="73" r="14" fill="#313b4d"/><text x="300" y="77" font-size="11" text-anchor="middle" fill="#fff">家</text><g transform="translate(${100+progress*175},${127-progress*35})"><circle r="17" fill="#ffcf16" stroke="#fff" stroke-width="3"/><g transform="translate(-11,-9)" stroke="#5c4816" stroke-width="1.7" fill="none"><circle cx="5" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="m5 15 5-9 8 9H5l7-10h4 M11 3h4 M6 5h5"/></g></g></svg><span class="map-label">配送路线</span></div>`;}
function renderDetail(){const o=orders.find(o=>o.id===route.id);if(!o)return `${topbar('订单详情')}${empty('没有找到该订单','可以在订单列表中重新查看')}`;const i=statusFor(o);const ended=o.dismissed||o.archived;lastOrderState=o.id+':'+i+':'+ended;const address=o.address||settings;return `${topbar('订单详情','back',`<button class="text-button" data-action="help-order">帮助</button>`)}<section class="tracking-status"><h1>${statusLabel(o)} ${icon('chevron')}</h1><p>${o.dismissed?'本次订单已结束':o.archived?'这份好心情，已经收到':STATUS[i].sub}</p>${!ended&&i<5?`<div>预计 <strong>${time(o.createdAt+o.cooldown*60000)}</strong> 送达 <span data-countdown>还需约${Math.ceil(remaining(o)/60000)}分钟</span></div>`:'<div class="delivered-check">谢谢你，给自己一点时间</div>'}</section>${!ended&&i<5?mapMarkup(o,i):''}<section class="tracking-card"><div class="tracking-steps">${['已下单','已接单','备餐中','已取餐','已送达'].map((s,k)=>`<div class="${(k<3?k:k+1)<=i?'done':''}"><i>${(k<3?k:k+1)<=i?'✓':'·'}</i><span>${s}</span></div>`).join('')}</div>${!ended?`<div class="rider-row"><span class="rider-avatar">${icon(i<3?'clock':'user')}</span><div><b>${i<3?'商家正在为你准备':i===3?'骑手正在前往商家':i===4?'骑手正在配送':'配送已完成'}</b><small>${i<3?'新鲜制作，好味道值得等待':'配送进度会自动更新'}</small></div><button class="icon-button" data-action="timeline" data-id="${o.id}" aria-label="查看配送进度">${icon('order')}</button></div>`:''}<div class="tracking-actions"><button data-action="timeline" data-id="${o.id}">订单进度</button>${!ended&&i<5?`<button data-action="cancel-order" data-id="${o.id}">取消订单</button>`:''}${!ended&&i===5?`<button class="yellow-button" data-action="finish-order" data-id="${o.id}">确认收货</button>`:''}<button data-action="reorder" data-id="${o.id}">再来一单</button></div></section><section class="checkout-block detail-products"><h3>${esc(o.shop||o.items[0]?.shop||'我的外卖')} ${icon('chevron')}</h3>${o.items.map(l=>`<div class="checkout-line">${img(l.image||orderImage(o),'',l.name)}<div><b>${esc(l.name)}</b><small>${esc(l.options||'标准份')} ×${l.count}</small></div><strong>${money(l.price*l.count)}</strong></div>`).join('')}<div class="bill-total">实付 <strong>${money(o.total)}</strong></div></section><section class="checkout-block order-info"><h3>配送信息</h3><div><span>配送地址</span><p>${esc(address.address)} ${esc(address.room)}<br>${esc(address.recipient)} ${esc(address.phone)}</p></div><div><span>配送方式</span><p>商家配送</p></div>${o.remark?`<div><span>订单备注</span><p>${esc(o.remark)}</p></div>`:''}</section><section class="checkout-block order-info"><h3>订单信息</h3><div><span>订单号码</span><p>${o.id}</p></div><div><span>下单时间</span><p>${date(o.createdAt)}</p></div><div><span>支付方式</span><p>${o.reserveMode==='manual'?'微信手动转账 · 到账未核验':'余额支付'}</p></div>${o.reserveMode==='manual'?`<button class="row-link" data-action="manual-transfer" data-id="${o.id}">查看收款码与金额</button>`:''}</section>`;}
function timeline(id){const o=orders.find(o=>o.id===id);if(!o)return;const index=statusFor(o);openModal(`${modalHead('订单进度')}<div class="timeline">${STATUS.map((s,i)=>`<div class="${i<=index?'done':''}"><i>${i<=index?'✓':'·'}</i><span><b>${s.label}</b><small>${i<=index?time(o.createdAt+i*o.cooldown*60000/5):'等待中'}</small></span></div>`).join('')}</div>`);}
function renderCoupons(){return `<header class="coupon-page-header"><h1>我的神券</h1><p>好吃不贵，每一餐都实惠</p><div><strong>13<small>元</small></strong><span>专享神券<br><b>吃点好的，犒劳自己</b></span></div></header><section class="coupon-page-list"><h2>为你精选</h2>${couponCard('welcome',13,32,'外卖专享神券','全部店铺可用')}${couponCard('drink',5,20,'下午茶神券','已展示饮品店可用')}<p class="muted centered">神券用于本应用内订单抵扣</p></section>`;}
function couponCard(id,amount,min,title,sub){const claimed=settings.coupons.includes(id);return `<div class="coupon-card"><div><strong><small>¥</small>${amount}</strong><span>满${min}元可用</span></div><section><h3>${title}</h3><p>${sub}</p><small>领取后可使用</small></section><button data-action="claim-coupon" data-id="${id}">${claimed?'去使用':'立即领取'}</button></div>`;}
function renderMine(){const ended=orders.filter(o=>o.dismissed||o.archived);return `<header class="mine-header"><div class="mine-title"><h1>我的</h1><button class="icon-button" data-action="settings" aria-label="设置">${icon('settings')}</button></div><div class="profile"><div class="profile-avatar">${icon('user')}</div><div><h2>今晚吃点什么</h2><p>每一份满足，都刚刚好</p></div><button data-action="address">管理地址 ${icon('chevron')}</button></div></header><section class="mine-stats"><button data-action="nav" data-page="coupons"><strong>${settings.coupons.length}</strong><span>红包神券</span></button><button data-action="nav" data-page="orders"><strong>${orders.length}</strong><span>我的订单</span></button><button data-action="stats"><strong>${money(ended.reduce((n,o)=>n+o.total,0))}</strong><span>已结束订单金额</span></button></section><section id="app-update-card" class="app-update-card">${updateCard()}</section><section class="mine-services"><h3>我的服务</h3>${[['address','pin','收货地址','管理常用地址'],['wallet','wallet','支付设置',settings.reserveMode==='manual'?'微信手动转账':'余额支付'],['settings','clock','订单体验',settings.cooldown+'分钟送达'],['export','order','导出订单记录','保存到本地'],['about','user','关于慢点外卖','个人自用']].map(([a,i,t,sub])=>`<button data-action="${a}">${icon(i)}<b>${t}</b><span>${sub}</span>${icon('chevron')}</button>`).join('')}</section><section class="about-note"><b>给馋意一点缓冲时间</b><p>这是你的私人外卖模拟器。店铺与商品用于浏览体验，接单、备餐、配送和余额均为模拟，不会向真实商家下单。选择微信转账时，资金操作由你在微信中完成。</p><small>订单、地址、收款码只保存在当前设备</small></section>`;}
function addressModal(){openModal(`${modalHead('收货地址')}<form id="address-form" class="form"><label>地址<input name="address" value="${esc(settings.address)}" placeholder="小区 / 写字楼名称" required maxlength="60"></label><label>门牌号<input name="room" value="${esc(settings.room)}" placeholder="楼栋、楼层、房间" maxlength="60"></label><label>联系人<input name="recipient" value="${esc(settings.recipient)}" placeholder="称呼" required maxlength="30"></label><label>手机号<input name="phone" value="${esc(settings.phone)}" inputmode="tel" placeholder="选填，仅保存在本机" maxlength="20"></label><button class="yellow-button full" type="submit">保存地址</button></form>`);}
function wallet(){openModal(`${modalHead('支付设置')}<div class="form"><label class="radio-row"><input type="radio" name="reserveMode" value="virtual" ${settings.reserveMode==='virtual'?'checked':''}><span><b>余额支付</b><small>虚拟余额，只记账，不扣钱</small></span></label><label class="radio-row"><input type="radio" name="reserveMode" value="manual" ${settings.reserveMode==='manual'?'checked':''}><span><b>微信手动转账</b><small>你在微信中付款，本应用无法核验到账</small></span></label><label>收款人备注<input id="contact-name" value="${esc(settings.contactName)}" placeholder="例如：家人 / 朋友" maxlength="40"></label><label>微信号或备注<input id="contact-note" value="${esc(settings.contactNote)}" placeholder="选填，仅保存在本机" maxlength="100"></label><label>微信收款码<input id="qr-file" type="file" accept="image/png,image/jpeg,image/webp"></label>${settings.qr?`<img class="qr-preview" src="${settings.qr}" alt="收款码"><button class="text-button" data-action="remove-qr">移除收款码</button>`:''}<button class="yellow-button full" data-action="save-wallet">保存设置</button></div>`);}
function captureWallet(){settings.reserveMode=document.querySelector('input[name="reserveMode"]:checked')?.value||settings.reserveMode;settings.contactName=$('#contact-name')?.value.trim()||'';settings.contactNote=$('#contact-note')?.value.trim()||'';}
function showManualTransfer(order){const amount=order?order.total:checkoutTotal();openModal(`${modalHead('微信手动转账')}<div class="transfer-heading"><span class="wechat-dot">●</span><h3>${esc(settings.contactName||'指定收款人')}</h3><p>${esc(settings.contactNote)}</p><strong>${money(amount)}</strong></div>${settings.qr?`<img class="qr-large" src="${settings.qr}" alt="微信收款码">`:'<div class="qr-missing">未设置收款码，可自行在微信好友聊天中转账。</div>'}<p class="help-text">同一台 iPhone：长按收款码保存到照片，再打开微信 → 扫一扫 → 相册。也可以直接给好友转账，金额需要在微信中填写。</p><div class="two-buttons"><button class="outline-button" data-action="copy-amount" data-amount="${amount}">复制金额</button><a class="wechat-button" href="weixin://">打开微信</a></div><p class="payment-note">到账状态：未核验。请自行核对微信账单；返回本页不代表付款成功。</p><button class="yellow-button full" data-action="${order?'close-modal':'manual-done'}">${order?'返回订单':'我已操作，继续订单'}</button>`);}
function settingsModal(){openModal(`${modalHead('订单体验')}<div class="settings-duration"><span>下单到送达时长</span><strong><b id="duration-value">${settings.cooldown}</b> 分钟</strong><input id="duration" type="range" min="3" max="45" value="${settings.cooldown}"><div><span>3分钟</span><span>45分钟</span></div></div><p class="help-text">订单按照时间自动经过接单、备餐、骑手取餐、配送和送达。切换微信或锁屏后，再回来会恢复到对应进度。</p><button class="yellow-button full" data-action="save-settings">保存</button>`);}
function updateTimers(){if(['home','orders'].includes(route.page)&&orders.map(o=>o.id+statusLabel(o)).join('|')!==lastListStates){const y=window.scrollY;render();window.scrollTo(0,y);}if(route.page==='detail'){const o=orders.find(o=>o.id===route.id);if(!o)return;const key=o.id+':'+statusFor(o)+':'+(o.dismissed||o.archived);if(key!==lastOrderState){const y=window.scrollY;render();window.scrollTo(0,y);}else if($('[data-countdown]'))$('[data-countdown]').textContent='还需约'+Math.ceil(remaining(o)/60000)+'分钟';}}
function endOrder(id,archive=false){const o=orders.find(o=>o.id===id);if(!o)return;const before={...o};o[archive?'archived':'dismissed']=true;o.endedAt=Date.now();if(!save()){Object.assign(o,before);return;}closeModal();render();toast(archive?'已确认收货':'订单已取消');}
function doQuery(q){filters.query=q.trim();filters.category='全部';go('list');}
function handleAction(a,d){
 if(a==='nav')go(d.page);
 else if(a==='check-update')updater.check();
 else if(a==='apply-update')updater.apply();
 else if(a==='back')back();
 else if(a==='home-top'){filters={category:'全部',query:'',sort:'推荐排序',fast:false,deal:false,brand:false};go('home');}
 else if(a==='search'){go('search');setTimeout(()=>$('#search-input')?.focus(),100);}
 else if(a==='query')doQuery(d.query);
 else if(a==='shop'){storeTab='点菜';selectedGroup='';go('shop',{id:d.id});}
 else if(a==='category'){if(['看病买药','跑腿'].includes(d.category)){openModal(`${modalHead(d.category)}<p class="help-text">当前自用版本提供外卖餐饮、饮品和水果菜单。这个分类暂未收录商品。</p><button class="yellow-button full" data-action="close-modal">知道了</button>`);return;}filters.category=['午餐','拼好饭'].includes(d.category)?'美食':['秒杀','天天津贴'].includes(d.category)?'全部':d.category;filters.query='';filters.fast=false;filters.deal=['秒杀','天天津贴'].includes(d.category);go('list');}
 else if(a==='pickup'){filters.category='全部';filters.query='';filters.sort='距离最近';go('list');toast('已按距离显示附近商家');}
 else if(a==='fast'){filters.fast=true;filters.category='全部';filters.query='';go('list');}
 else if(a==='toggle-filter'){filters[d.key]=!filters[d.key];render();}
 else if(a==='nearby'||a==='deals'){filters.deal=a==='deals';if(route.page==='home')go('list');else render();}
 else if(a==='reset-filters'){filters={category:'全部',query:'',sort:'推荐排序',fast:false,deal:false,brand:false};render();}
 else if(a==='sort')openModal(`${modalHead('商家排序')}<div class="selection-list">${['推荐排序','距离最近','销量最高','配送最快'].map(s=>`<button data-action="set-sort" data-value="${s}">${s}${filters.sort===s?' ✓':''}</button>`).join('')}</div>`);
 else if(a==='set-sort'){filters.sort=d.value;closeModal();render();}
 else if(a==='filter')openModal(`${modalHead('筛选商家')}<div class="selection-list">${['全部','美食','甜点饮品','超市便利','蔬菜水果'].map(c=>`<button data-action="category" data-category="${c}">${c}${filters.category===c?' ✓':''}</button>`).join('')}</div>`);
 else if(a==='hide-banner'){couponBanner=false;renderNav();}
 else if(a==='announcement')openModal(`${modalHead('好好吃饭')}<p class="help-text">在这里逛一逛，选一份喜欢的，等它慢慢送达。把每一次“想吃”留给当下的自己。</p><button class="yellow-button full" data-action="close-modal">开始选餐</button>`);
 else if(a==='close-modal')closeModal();
 else if(a==='store-tab'){storeTab=d.tab;render();}
 else if(a==='menu-group'){selectedGroup=d.group;document.querySelectorAll('.menu-categories button').forEach(b=>b.classList.toggle('selected',b.dataset.group===d.group));document.querySelector(`[data-menu-section="${d.group}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});}
 else if(a==='store-search')openModal(`${modalHead('店内商品')}<div class="selection-list">${getShop().menu.map(p=>`<button data-action="find-product" data-group="${p.group}">${p.name}<span>${money(p.price)}</span></button>`).join('')}</div>`);
 else if(a==='find-product'){selectedGroup=d.group;storeTab='点菜';closeModal();render();}
 else if(a==='favorite'){settings.favorites=settings.favorites||[];const i=settings.favorites.indexOf(d.id);if(i>=0)settings.favorites.splice(i,1);else settings.favorites.push(d.id);save();toast(i>=0?'已取消收藏':'已收藏这家店');}
 else if(a==='add')addProduct(d.id);
 else if(a==='spec')specs(d.id);
 else if(a==='option'){optionDraft[d.key]=d.value;renderSpecs();}
 else if(a==='add-spec'){const o=optionDraft;closeModal();addProduct(o.id,[o.size,o.temp,o.sugar].join(' / '));}
 else if(a==='switch-cart'){cart={};cartShop=null;closeModal();addProduct(d.id,d.options);}
 else if(a==='minus-product')minusProduct(d.id);
 else if(a==='cart'||a==='floating-cart')cartModal();
 else if(a==='cart-plus'||a==='cart-minus'){if(!cart[d.key])return;cart[d.key].count+=a==='cart-plus'?1:-1;if(cart[d.key].count<=0)delete cart[d.key];refreshCart();cartModal();}
 else if(a==='clear-cart'){cart={};closeModal();refreshCart();}
 else if(a==='checkout')checkout();
 else if(a==='submit-order')submitOrder();
 else if(a==='manual-done')createOrder(true);
 else if(a==='detail')go('detail',{id:d.id});
 else if(a==='timeline')timeline(d.id);
 else if(a==='cancel-order')openModal(`${modalHead('取消订单')}<p class="help-text">确定取消这次订单吗？${orders.find(o=>o.id===d.id)?.reserveMode==='manual'?'如已微信转账，需自行联系收款人退回。':''}</p><div class="two-buttons"><button class="outline-button" data-action="close-modal">再等一会</button><button class="yellow-button" data-action="confirm-cancel" data-id="${d.id}">确定取消</button></div>`);
 else if(a==='confirm-cancel')endOrder(d.id);
 else if(a==='finish-order')endOrder(d.id,true);
 else if(a==='reorder'){const o=orders.find(o=>o.id===d.id);const s=getShop(o?.shopId);if(!s){go('home');return;}if(cartCount()){go('shop',{id:s.id});toast('购物车中已有商品，可继续选购');return;}cartShop=s.id;for(const l of o.items){const p=s.menu.find(p=>p.id===l.productId);if(p){const key=s.id+'-'+p.id+'-'+(l.options||'');cart[key]={...p,key,productId:p.id,shopId:s.id,shop:s.name,options:l.options||'',count:l.count};}}storeTab='点菜';go('shop',{id:s.id});toast('已加入上次购买的商品');}
 else if(a==='help-order')openModal(`${modalHead('订单帮助')}<p class="help-text">订单状态按设定的时间自动推进，可随时查看进度或取消。这里不会向真实商家发送订单，也不会联系真实骑手。</p><button class="yellow-button full" data-action="close-modal">知道了</button>`);
 else if(a==='claim-store'){if(!settings.coupons.includes('welcome'))settings.coupons.push('welcome');save();toast('13元神券已领取，满32元可用');}
 else if(a==='claim-coupon'){if(settings.coupons.includes(d.id)){go('home');return;}settings.coupons.push(d.id);save();render();toast('领取成功');}
 else if(a==='checkout-coupon')openModal(`${modalHead('选择神券')}<p class="help-text">商品满32元可用13元神券；饮品满20元可用已领取的5元下午茶券。自动选取最高优惠。</p><button class="yellow-button full" data-action="use-coupon">${settings.coupons.includes('welcome')?'使用13元神券':'领取并使用13元神券'}</button><button class="text-button full" data-action="no-coupon">不使用优惠</button>`);
 else if(a==='use-coupon'){if(!settings.coupons.includes('welcome'))settings.coupons.push('welcome');checkoutDraft.coupon=true;save();closeModal();render();}
 else if(a==='no-coupon'){checkoutDraft.coupon=false;closeModal();render();}
 else if(a==='remark')openModal(`${modalHead('订单备注')}<form id="remark-form"><textarea name="remark" maxlength="160" placeholder="例如：少辣、不放香菜、放门口">${esc(checkoutDraft.remark)}</textarea><button type="submit" class="yellow-button full">确定</button></form>`);
 else if(a==='utensils')openModal(`${modalHead('餐具份数')}<div class="selection-list">${['无需餐具','1份餐具','2份餐具','3份餐具'].map(v=>`<button data-action="set-utensils" data-value="${v}">${v}</button>`).join('')}</div>`);
 else if(a==='set-utensils'){checkoutDraft.utensils=d.value;closeModal();render();}
 else if(a==='payment-method')openModal(`${modalHead('支付方式')}<div class="selection-list"><button data-action="set-payment" data-value="virtual">余额支付 <small>虚拟余额，不扣款</small></button><button data-action="set-payment" data-value="manual">微信手动转账 <small>需在微信自行完成</small></button></div>`);
 else if(a==='set-payment'){checkoutDraft.method=d.value;closeModal();render();}
 else if(a==='address')addressModal();
 else if(a==='wallet')wallet();
 else if(a==='remove-qr'){captureWallet();settings.qr='';wallet();}
 else if(a==='save-wallet'){captureWallet();if(save()){closeModal();render();toast('支付设置已保存');}}
 else if(a==='manual-transfer')showManualTransfer(orders.find(o=>o.id===d.id));
 else if(a==='copy-amount'){if(navigator.clipboard)navigator.clipboard.writeText(d.amount).then(()=>toast('金额已复制')).catch(()=>toast('请手动输入金额：'+d.amount));else toast('请手动输入金额：'+d.amount);}
 else if(a==='settings')settingsModal();
 else if(a==='save-settings'){settings.cooldown=Number($('#duration').value);if(save()){closeModal();render();toast('设置已保存');}}
 else if(a==='about')openModal(`${modalHead('慢点外卖')}<p class="help-text">给自己用的外卖模拟 PWA。按照熟悉的外卖流程浏览、选餐、下单，等待馋意慢慢过去。</p><p class="help-text">商品、价格、销量、评价、配送路线和进度都是本地示例数据，不代表对应商家的实时信息。图片取自你提供的界面参考。余额为虚拟记账，微信转账需自己操作并核对。</p><p class="help-text">添加到 iPhone 主屏幕后可全屏使用。首次缓存完成后可离线打开；本版没有锁屏配送通知。</p><button class="yellow-button full" data-action="close-modal">知道了</button>`);
 else if(a==='stats')openModal(`${modalHead('你的订单记录')}<p class="help-text">已取消、已确认收货的订单总额：${money(orders.filter(o=>o.dismissed||o.archived).reduce((n,o)=>n+o.total,0))}。这个数字是本地订单统计，不代表真实账户余额。</p><button class="yellow-button full" data-action="nav" data-page="orders">查看订单</button>`);
 else if(a==='export'){const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),orders},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='slow-bite-orders.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
document.addEventListener('click',e=>{if(e.target.id==='modal-backdrop'){closeModal();return;}const target=e.target.closest('[data-action]');if(target){if(target.tagName==='BUTTON')e.preventDefault();handleAction(target.dataset.action,target.dataset);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-action]')){e.preventDefault();handleAction(e.target.dataset.action,e.target.dataset);}});
document.addEventListener('submit',e=>{e.preventDefault();const form=new FormData(e.target);if(e.target.id==='search-form')doQuery(String(form.get('query')||''));if(e.target.id==='address-form'){const before={...settings};for(const key of ['address','room','recipient','phone'])settings[key]=String(form.get(key)||'').trim();if(save()){closeModal();render();}else settings=before;}if(e.target.id==='remark-form'){checkoutDraft.remark=String(form.get('remark')||'').trim();closeModal();render();}});
document.addEventListener('input',e=>{if(e.target.id==='duration')$('#duration-value').textContent=e.target.value;});
document.addEventListener('change',e=>{if(e.target.id!=='qr-file'||!e.target.files?.[0])return;const file=e.target.files[0];if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)return toast('请选择12MB以内的PNG、JPEG或WebP图片');captureWallet();const url=URL.createObjectURL(file);const picture=new Image();picture.onload=()=>{const scale=Math.min(1,1200/Math.max(picture.width,picture.height));const canvas=document.createElement('canvas');canvas.width=Math.round(picture.width*scale);canvas.height=Math.round(picture.height*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(picture,0,0,canvas.width,canvas.height);settings.qr=canvas.toDataURL('image/jpeg',.9);URL.revokeObjectURL(url);wallet();toast('收款码已选好，点击保存设置后生效');};picture.onerror=()=>{URL.revokeObjectURL(url);toast('图片读取失败，请更换图片');};picture.src=url;});
window.addEventListener('popstate',e=>{closeModal();route=e.state?.page?e.state:{page:'home'};render();enterMine();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTimers();enterMine();}});
window.addEventListener('load',()=>updater.start());
let updateResult=null;
try { updateResult=JSON.parse(sessionStorage.getItem('slowbite.update.v1'));sessionStorage.removeItem('slowbite.update.v1'); } catch {}
if(updateResult)route={page:'mine'};
history.replaceState(route,'',location.pathname+location.search);
render();setInterval(updateTimers,1000);
if(updateResult){
  if(updateResult.target===APP_RELEASE.id)toast(`已更新至 v${APP_RELEASE.version}`);
  else toast('版本尚未切换成功，请重新检查更新');
  enterMine();
}
