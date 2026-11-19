const STORAGE = {
  orders: 'slowbite.orders.v1',
  settings: 'slowbite.settings.v1'
};

const FOOD = [
  { id: 'tomato-noodle', name: '番茄肥牛面', shop: '小满面馆', price: 29, tag: '热乎乎', category: '面食', emoji: '🍜', color: '#f4b4a0', desc: '番茄汤底 · 肥牛 · 溏心蛋' },
  { id: 'crispy-chicken', name: '脆皮炸鸡饭', shop: '一口满足', price: 36, tag: '人气王', category: '盖饭', emoji: '🍗', color: '#e9c56b', desc: '脆皮鸡腿 · 海苔 · 温泉蛋' },
  { id: 'green-bowl', name: '牛油果能量碗', shop: '青柠日常', price: 42, tag: '轻盈', category: '轻食', emoji: '🥗', color: '#b8d9ac', desc: '牛油果 · 鸡胸 · 藜麦' },
  { id: 'taco', name: '炙烤牛肉塔可', shop: '南风小馆', price: 32, tag: '微辣', category: '小食', emoji: '🌮', color: '#f2c18d', desc: '炙烤牛肉 · 玉米饼 · 酸奶油' },
  { id: 'sushi', name: '三文鱼手握', shop: '日和寿司', price: 58, tag: '新鲜', category: '日料', emoji: '🍣', color: '#efb6b5', desc: '三文鱼 · 赤身 · 玉子烧' },
  { id: 'tea', name: '桂花乌龙奶茶', shop: '慢慢茶事', price: 18, tag: '少糖', category: '饮品', emoji: '🧋', color: '#cbb7a0', desc: '乌龙茶底 · 桂花 · 厚乳' }
];
const CATEGORIES = ['全部', '面食', '盖饭', '轻食', '小食', '日料', '饮品'];
const STATUS = [
  { key: 'placed', label: '模拟下单', sub: '订单已记录，未向任何平台提交', icon: '✓' },
  { key: 'accepted', label: '模拟商家接单', sub: '店家正在准备你的想象', icon: '◌' },
  { key: 'cooking', label: '模拟制作中', sub: '香味正在路上', icon: '✦' },
  { key: 'rider', label: '模拟骑手接单', sub: '骑手已接到这份模拟任务', icon: '⌁' },
  { key: 'delivering', label: '模拟配送中', sub: '还有一点时间，先喝口水', icon: '→' },
  { key: 'arrived', label: '模拟配送完成', sub: '现在重新问自己：还想吃吗？', icon: '♡' }
];

let orders = read(STORAGE.orders, []);
if (!Array.isArray(orders)) orders = [];
let settings = { cooldown: 15, reserveMode: 'virtual', contactName: '', contactNote: '', qr: '', ...read(STORAGE.settings, {}) };
settings.cooldown = Math.min(45, Math.max(3, Number(settings.cooldown) || 15));
let activeCategory = '全部';
let cart = {};
let timer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save() {
  try {
    localStorage.setItem(STORAGE.orders, JSON.stringify(orders));
    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    return true;
  } catch {
    toast('本地存储空间不足，未能保存。请先导出记录或换一张较小的图片。');
    return false;
  }
}
function money(value) { return `¥${Number(value).toFixed(0)}`; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }
function uid() { return `SB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }
function formatTime(timestamp) { return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp)); }
function daysAgo(timestamp) { const diff = Date.now() - timestamp; if (diff < 86400000) return '今天'; if (diff < 172800000) return '昨天'; return `${Math.floor(diff / 86400000)}天前`; }
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(node._t); node._t = setTimeout(() => node.classList.remove('show'), 2800); }
function openModal(html) { delete $('#modal').dataset.orderId; $('#modal').innerHTML = html; $('#modal-backdrop').hidden = false; document.body.classList.add('modal-open'); }
function closeModal() { $('#modal-backdrop').hidden = true; document.body.classList.remove('modal-open'); }
function totalCart() { return Object.entries(cart).reduce((sum, [id, count]) => sum + (FOOD.find(item => item.id === id)?.price || 0) * count, 0); }
function cartCount() { return Object.values(cart).reduce((sum, count) => sum + count, 0); }

function renderFilters() { $('#category-filters').innerHTML = CATEGORIES.map(category => `<button class="filter-chip ${activeCategory === category ? 'selected' : ''}" data-category="${category}">${category}</button>`).join(''); }
function renderFood() {
  const list = FOOD.filter(item => activeCategory === '全部' || item.category === activeCategory);
  $('#food-grid').innerHTML = list.map(item => {
    const count = cart[item.id] || 0;
    return `<article class="food-card" style="--card-color:${item.color}">
      <div class="food-image"><span class="food-emoji">${item.emoji}</span><span class="food-tag">${item.tag}</span></div>
      <div class="food-info"><p class="food-shop">${item.shop}</p><h3>${item.name}</h3><p class="food-desc">${item.desc}</p><div class="food-bottom"><strong>${money(item.price)}</strong><button class="add-btn ${count ? 'has-count' : ''}" data-add="${item.id}" aria-label="${count ? '已加入' + count + '份' : '加入购物车'}">${count ? count : '+'}</button></div></div>
    </article>`;
  }).join('');
  renderCartSummary();
}

function statusFor(order) {
  const elapsed = Math.max(0, Date.now() - order.createdAt);
  const cooldownMs = order.cooldown * 60000;
  if (elapsed >= cooldownMs) return 5;
  const slice = cooldownMs / 5;
  return Math.min(4, Math.floor(elapsed / slice));
}
function remaining(order) { return Math.max(0, order.createdAt + order.cooldown * 60000 - Date.now()); }
function fmtRemaining(ms) { const minutes = Math.floor(ms / 60000); const seconds = Math.floor((ms % 60000) / 1000); return `${minutes}分 ${String(seconds).padStart(2, '0')}秒`; }
function statusLabel(order) { return order.dismissed ? '已结束 · 不想吃了' : order.archived ? '已完成' : STATUS[statusFor(order)].label; }
function activeOrder() { return [...orders].reverse().find(order => !order.archived && !order.dismissed) || null; }

function renderActiveOrder() {
  const wrap = $('#active-order-wrap'); const order = activeOrder();
  if (!order) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const index = statusFor(order); const current = STATUS[index]; const progress = Math.min(100, ((Date.now() - order.createdAt) / (order.cooldown * 60000)) * 100);
  wrap.innerHTML = `<div class="section-head order-head"><div><p class="eyebrow">SIMULATED ORDER ${esc(order.id)}</p><h2>${esc(order.items[0].name)}${order.items.length > 1 ? ` 等 ${order.items.length} 件` : ''}</h2></div><button class="text-btn" data-action="open-order" data-id="${order.id}">详情 →</button></div>
    <div class="order-card"><div class="order-status-top"><div><span class="status-pill coral"><span class="pulse"></span>${statusLabel(order)}</span><p class="order-sub">${current.sub}</p></div><div class="countdown"><small>冷静期剩余</small><strong data-countdown="${order.id}">${remaining(order) > 0 ? fmtRemaining(remaining(order)) : '已送达'}</strong></div></div>
      <div class="progress-track"><span style="width:${progress}%"></span></div><div class="step-row">${STATUS.map((step, stepIndex) => `<div class="step ${stepIndex <= index ? 'done' : ''} ${stepIndex === index ? 'current' : ''}"><span>${stepIndex < index ? '✓' : step.icon}</span><small>${step.label.replace('模拟', '')}</small></div>`).join('')}</div>
      <div class="order-actions"><button class="secondary-btn" data-action="archive-order" data-id="${order.id}">我不想吃了</button><button class="primary-btn compact" data-action="open-order" data-id="${order.id}">查看订单</button></div></div>`;
}
function updateTimers() {
  const order = activeOrder();
  const key = order ? `${order.id}:${statusFor(order)}` : '';
  const wrap = $('#active-order-wrap');
  if (wrap.dataset.orderKey !== key) { renderActiveOrder(); wrap.dataset.orderKey = key; }
  if (order) {
    const node = document.querySelector(`[data-countdown="${order.id}"]`);
    if (node) node.textContent = remaining(order) > 0 ? fmtRemaining(remaining(order)) : '已送达';
    const bar = wrap.querySelector('.progress-track span');
    if (bar) bar.style.width = `${Math.min(100, (Date.now() - order.createdAt) / (order.cooldown * 60000) * 100)}%`;
  }
  const detailId = $('#modal').dataset.orderId;
  if (!$('#modal-backdrop').hidden && detailId) {
    const detailOrder = orders.find(item => item.id === detailId);
    if (detailOrder && $('#modal').dataset.status !== String(statusFor(detailOrder))) orderDetail(detailId);
  }
  renderBadge();
}
function renderBadge() { const badge = $('#order-badge'); const count = orders.filter(order => !order.dismissed && !order.archived).length; badge.hidden = !count; badge.textContent = count; }

function renderOrders() {
  const sorted = [...orders].sort((a, b) => b.createdAt - a.createdAt);
  const html = sorted.length ? sorted.map(order => `<div class="history-row"><div class="history-icon">${order.items[0]?.emoji || '✦'}</div><div class="history-main"><strong>${esc(order.items[0]?.name || '模拟订单')}${order.items.length > 1 ? ` 等 ${order.items.length} 件` : ''}</strong><small>${daysAgo(order.createdAt)} · ${formatTime(order.createdAt)} · ${statusLabel(order)}</small></div><div class="history-right"><b>${money(order.total)}</b><button class="row-link" data-action="open-order" data-id="${order.id}">查看</button></div></div>`).join('') : '<div class="empty-state"><span>◌</span><h3>还没有模拟订单</h3><p>把今晚想吃的东西放进冷静期。</p></div>';
  openModal(`<div class="modal-header"><div><p class="eyebrow">YOUR PAUSE LOG</p><h2 id="modal-title">订单记录</h2></div><button class="close-btn" data-action="close-modal">×</button></div><div class="history-list">${html}</div><div class="modal-footnote">所有记录只保存在这台设备上。</div>`);
}
function renderWallet() {
  const used = orders.reduce((sum, order) => sum + order.total, 0);
  const saved = orders.filter(order => order.dismissed).reduce((sum, order) => sum + order.total, 0);
  openModal(`<div class="modal-header"><div><p class="eyebrow">PAUSE FUND</p><h2 id="modal-title">冷静金</h2></div><button class="close-btn" data-action="close-modal">×</button></div>
    <div class="wallet-hero"><div><small>模拟累计拦截</small><strong>${money(saved)}</strong><p>这些钱本来可能变成一次冲动外卖。</p></div><span>◒</span></div>
    <div class="wallet-stat-row"><div><small>模拟订单总额</small><b>${money(used)}</b></div><div><small>冷静期</small><b>${settings.cooldown} 分钟</b></div></div>
    <div class="wallet-section"><h3>转账模式</h3><p class="help-text">可选。转账会离开本 PWA，由你在微信里手动完成。</p><label class="radio-row"><input type="radio" name="reserveMode" value="virtual" ${settings.reserveMode === 'virtual' ? 'checked' : ''}/> <span><b>虚拟冷静金</b><small>只记录，不发生真实转账（推荐）</small></span></label><label class="radio-row"><input type="radio" name="reserveMode" value="manual" ${settings.reserveMode === 'manual' ? 'checked' : ''}/> <span><b>微信手动转入</b><small>展示收款码；支付结果需你自己核对</small></span></label></div>
    <div class="wallet-section"><h3>收款对象（可选）</h3><input class="text-input" id="contact-name" value="${esc(settings.contactName)}" placeholder="例如：家人 / 小明"/><input class="text-input" id="contact-note" value="${esc(settings.contactNote)}" placeholder="备注或微信号（仅本地保存）"/></div>
    <div class="wallet-section"><h3>收款码图片</h3><div class="qr-upload">${settings.qr ? `<img src="${settings.qr}" alt="已保存的收款码"/><button class="secondary-btn" data-action="remove-qr">移除图片</button>` : '<div class="qr-placeholder">添加收款人的微信收款码截图<br/><small>图片只保存在本设备</small></div>'}<input type="file" id="qr-file" accept="image/png,image/jpeg,image/webp" aria-label="选择收款码图片" /></div></div>
    <div class="modal-actions"><button class="primary-btn full" data-action="save-wallet">保存设置</button></div>`);
}
function orderDetail(id) {
  const order = orders.find(item => item.id === id); if (!order) return;
  const index = statusFor(order); const canReal = remaining(order) <= 0;
  const ended = order.dismissed || order.archived;
  openModal(`<div class="modal-header"><div><p class="eyebrow">ORDER ${esc(order.id)}</p><h2 id="modal-title">${esc(order.items[0].name)}</h2><p class="help-text">${statusLabel(order)}</p></div><button class="close-btn" data-action="close-modal">×</button></div>
    <div class="detail-total"><span>${order.items.map(item => `${esc(item.name)} × ${item.count}`).join('、')}</span><strong>${money(order.total)}</strong></div>
    <div class="detail-timeline">${STATUS.map((step, i) => `<div class="timeline-item ${i <= index ? 'done' : ''}"><span>${i <= index ? '✓' : step.icon}</span><div><b>${step.label}</b><small>${i < index ? '已完成' : i === index ? step.sub : '等待冷静期推进'}</small></div></div>`).join('')}</div>
    <div class="truth-box"><strong>这是模拟订单</strong><p>没有真实商家、骑手或外卖正在处理它。冷静期结束后，确认还想吃，再去真实平台下单。</p></div>
    ${order.reserveMode === 'manual' ? `<button class="secondary-btn full" data-action="manual-transfer" data-id="${order.id}">查看收款码与金额</button><p class="tiny-note">微信转账情况：未核验，以微信账单为准。</p>` : ''}
    <div class="modal-actions">${ended ? '<button class="primary-btn full" data-action="close-modal">完成</button>' : `<button class="secondary-btn full" data-action="archive-order" data-id="${order.id}">我不想吃了</button>${canReal ? `<button class="primary-btn full" data-action="finish-order" data-id="${order.id}">收下这份满足</button>` : ''}`}</div>`);
  $('#modal').dataset.orderId = id;
  $('#modal').dataset.status = String(index);
}
function cartModal() {
  const items = Object.entries(cart).map(([id, count]) => ({ ...FOOD.find(item => item.id === id), count })).filter(item => item.name);
  if (!items.length) { closeModal(); return; }
  openModal(`<div class="modal-header"><div><p class="eyebrow">ONE LAST CHECK</p><h2 id="modal-title">今晚想吃的</h2></div><button class="close-btn" data-action="close-modal">×</button></div><div class="cart-list">${items.map(item => `<div class="cart-row"><span class="cart-emoji">${item.emoji}</span><div><b>${item.name}</b><small>${money(item.price)} / 份</small></div><div class="stepper"><button data-cart-minus="${item.id}">−</button><b>${item.count}</b><button data-cart-plus="${item.id}">＋</button></div></div>`).join('')}</div><div class="cart-total"><span>模拟订单金额</span><strong>${money(totalCart())}</strong></div><div class="cart-hint">下一步只会创建本地模拟订单，不会扣款。</div><button class="primary-btn full" data-action="checkout">进入冷静期</button>`);
}
function checkout() {
  const items = Object.entries(cart).map(([id, count]) => ({ ...FOOD.find(item => item.id === id), count })).filter(item => item.name);
  if (!items.length) return toast('先选一份想吃的吧');
  const order = { id: uid(), createdAt: Date.now(), cooldown: Number(settings.cooldown), items, total: totalCart(), reserveMode: settings.reserveMode, dismissed: false, archived: false };
  orders.push(order); if (!save()) { orders.pop(); return; } cart = {}; closeModal(); renderAll(); toast(`模拟订单已创建，给自己 ${order.cooldown} 分钟冷静一下`);
  if (settings.reserveMode === 'manual') setTimeout(() => showManualTransfer(order), 220);
}
function showManualTransfer(order) {
  const contact = settings.contactName || '你配置的收款对象';
  openModal(`<div class="modal-header"><div><p class="eyebrow">OPTIONAL · MANUAL TRANSFER</p><h2 id="modal-title">微信冷静金</h2></div><button class="close-btn" data-action="close-modal">×</button></div><div class="transfer-warning"><strong>这一步会离开 PWA</strong><p>请在微信中手动转账给「${esc(contact)}」${settings.contactNote ? `（${esc(settings.contactNote)}）` : ''}。本页面无法读取或验证微信支付结果。</p></div>${settings.qr ? `<img class="qr-large" src="${settings.qr}" alt="微信收款码"/>` : '<div class="qr-missing">你还没有上传收款码。可在「冷静金」中添加。</div>'}<div class="transfer-amount">建议转入 <strong>${money(order.total)}</strong></div><p class="help-text transfer-instructions">同一台 iPhone：长按收款码存储到“照片”，切换微信 → 扫一扫 → 相册，选择收款码。如微信不支持识别，请直接在好友聊天中转账。金额需在微信中核对、输入。</p><div class="modal-actions"><button class="secondary-btn full" data-action="copy-amount" data-amount="${order.total}">复制金额</button><a class="secondary-btn full link-btn" href="weixin://">尝试打开微信</a></div><p class="tiny-note">无法跳转时请手动打开微信；此按钮不能选择好友、自动填入金额或确认到账。</p><button class="primary-btn full" data-action="close-modal">返回模拟订单</button>`);
}

function archiveOrder(id) { const order = orders.find(item => item.id === id); if (!order) return; if (order.dismissed) return; order.dismissed = true; order.endedAt = Date.now(); if (!save()) { order.dismissed = false; return; } closeModal(); renderAll(); toast(`已记录未下单金额 ${money(order.total)}`); }
function showSettings() {
  openModal(`<div class="modal-header"><div><p class="eyebrow">PERSONAL SETTINGS</p><h2 id="modal-title">设置</h2></div><button class="close-btn" data-action="close-modal">×</button></div><div class="settings-form"><label>冷静期时长 <strong><span id="cooldown-value">${settings.cooldown}</span> 分钟</strong><input type="range" id="cooldown" min="3" max="45" step="1" value="${settings.cooldown}"/></label></div><div class="truth-box"><strong>隐私说明</strong><p>订单、设置和收款码只写入当前浏览器的本地存储。清除 Safari 网站数据后会丢失。</p></div><button class="primary-btn full" data-action="save-settings">保存</button><button class="secondary-btn full backup-button" data-action="export-records">导出订单记录</button>`);
}
function renderAll() { renderFilters(); renderFood(); renderActiveOrder(); renderBadge(); }

$('#app-main').addEventListener('click', event => {
  const category = event.target.closest('[data-category]')?.dataset.category; if (category) { activeCategory = category; renderFilters(); renderFood(); return; }
  const add = event.target.closest('[data-add]')?.dataset.add; if (add) { cart[add] = (cart[add] || 0) + 1; renderFood(); toast(`${FOOD.find(item => item.id === add).name} 已加入`); renderCartSummary(); return; }
  const action = event.target.closest('[data-action]'); if (action) handleAction(action.dataset.action, action.dataset); 
});
$('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); const action = event.target.closest('[data-action]'); if (action) handleAction(action.dataset.action, action.dataset); });
document.addEventListener('click', event => { const action = event.target.closest('[data-action]'); if (action && !event.target.closest('#app-main') && !event.target.closest('#modal-backdrop')) handleAction(action.dataset.action, action.dataset); });
function handleAction(action, data) {
  if (action === 'close-modal') closeModal();
  if (action === 'scroll-menu') $('#menu-section').scrollIntoView({ behavior: 'smooth' });
  if (action === 'open-settings') showSettings();
  if (action === 'open-orders') renderOrders();
  if (action === 'open-wallet') renderWallet();
  if (action === 'open-order') orderDetail(data.id);
  if (action === 'archive-order') archiveOrder(data.id);
  if (action === 'checkout') checkout();
  if (action === 'open-cart') cartModal();
  if (action === 'nav-home') { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'manual-transfer') { const order = orders.find(item => item.id === data.id); if (order) showManualTransfer(order); }
  if (action === 'copy-amount') navigator.clipboard.writeText(data.amount).then(() => toast('金额已复制，请在微信中核对后付款')).catch(() => toast('无法复制，请手动输入金额'));
  if (action === 'finish-order') { const order = orders.find(item => item.id === data.id); if (order) { order.archived = true; if (!save()) { order.archived = false; return; } closeModal(); renderAll(); } }
  if (action === 'export-records') {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), orders }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'slow-bite-orders.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (action === 'show-all') { activeCategory = '全部'; renderFilters(); renderFood(); $('#menu-section').scrollIntoView({ behavior: 'smooth' }); }
  if (action === 'remove-qr') { captureWallet(); settings.qr = ''; renderWallet(); }
  if (action === 'save-wallet') { captureWallet(); if (save()) { closeModal(); toast('冷静金设置已保存'); } }
  if (action === 'save-settings') { settings.cooldown = Number($('#cooldown')?.value || settings.cooldown); if (save()) { closeModal(); renderAll(); toast('设置已保存'); } }
}
document.addEventListener('click', event => { const plus = event.target.closest('[data-cart-plus]')?.dataset.cartPlus; const minus = event.target.closest('[data-cart-minus]')?.dataset.cartMinus; if (plus) { cart[plus] = (cart[plus] || 0) + 1; renderFood(); cartModal(); } if (minus) { cart[minus] = Math.max(0, (cart[minus] || 0) - 1); if (!cart[minus]) delete cart[minus]; renderFood(); cartModal(); } });
document.addEventListener('input', event => { if (event.target.id === 'cooldown') $('#cooldown-value').textContent = event.target.value; if (event.target.id === 'budget') $('#budget-value').textContent = event.target.value; });
function captureWallet() {
  settings.reserveMode = document.querySelector('input[name="reserveMode"]:checked')?.value || 'virtual';
  settings.contactName = $('#contact-name')?.value.trim() || '';
  settings.contactNote = $('#contact-note')?.value.trim() || '';
}
function renderCartSummary() {
  const summary = $('#cart-summary');
  summary.hidden = !cartCount();
  summary.textContent = `查看购物车 · ${cartCount()} 份 · ${money(totalCart())}`;
}
document.addEventListener('change', event => {
  if (event.target.id !== 'qr-file' || !event.target.files?.[0]) return;
  const file = event.target.files[0];
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) return toast('请选择 12 MB 以内的 PNG、JPEG 或 WebP 图片');
  captureWallet();
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(img, 0, 0, canvas.width, canvas.height);
    settings.qr = canvas.toDataURL('image/jpeg', 0.9);
    URL.revokeObjectURL(url); renderWallet(); toast('收款码已选好，点击保存设置后生效');
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('无法读取图片，请换用 PNG 或 JPEG 截图'); };
  img.src = url;
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateTimers(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
renderAll(); timer = setInterval(updateTimers, 1000);
