(function () {
  'use strict';

  var LANG = (document.documentElement.getAttribute('lang') || 'vi').indexOf('en') === 0 ? 'en' : 'vi';
  var STORAGE_KEY = 'oa_cart_v1';
  var WHATSAPP_NUMBER = '84856789190';
  var VND_RATE = 30000;

  var STR = {
    vi: {
      cartLabel: 'Giỏ hàng',
      cartTitle: 'Giỏ hàng của bạn',
      empty: 'Giỏ hàng đang trống. Chọn khoá học hoặc gói bạn muốn, bấm "Thêm vào giỏ".',
      addBtn: 'Thêm vào giỏ',
      added: 'Đã thêm ✓',
      remove: 'Xoá',
      subtotal: 'Tạm tính',
      checkout: 'Đặt hàng qua WhatsApp',
      checkoutNote: 'Không thanh toán trên web — đơn được gửi qua WhatsApp, thầy Hải xác nhận và hướng dẫn thanh toán trực tiếp.',
      close: 'Đóng',
      clear: 'Xoá hết',
      waIntro: 'Chào Oui Academy, mình muốn đăng ký:',
      waTotal: 'Tổng tạm tính',
      waOutro: 'Mình muốn được tư vấn thêm về cách thanh toán và lịch học.'
    },
    en: {
      cartLabel: 'Cart',
      cartTitle: 'Your Cart',
      empty: 'Your cart is empty. Pick a course or package and hit "Add to cart".',
      addBtn: 'Add to cart',
      added: 'Added ✓',
      remove: 'Remove',
      subtotal: 'Subtotal',
      checkout: 'Order via WhatsApp',
      checkoutNote: "No payment happens on the site — your order is sent via WhatsApp, and Hải confirms details and payment directly with you.",
      close: 'Close',
      clear: 'Clear all',
      waIntro: "Hi Oui Academy, I'd like to sign up for:",
      waTotal: 'Estimated total',
      waOutro: "I'd like more details on payment and scheduling."
    }
  }[LANG];

  function formatVND(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) { /* storage unavailable, cart just won't persist */ }
  }

  var cart = loadCart();

  function findItem(id) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) return cart[i];
    }
    return null;
  }

  function addItem(data) {
    var existing = findItem(data.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: data.id, name: data.name, price: data.price, unit: data.unit || '', qty: 1 });
    }
    saveCart(cart);
    renderBadge();
    renderDrawer();
  }

  function setQty(id, qty) {
    var item = findItem(id);
    if (!item) return;
    if (qty <= 0) {
      cart = cart.filter(function (i) { return i.id !== id; });
    } else {
      item.qty = qty;
    }
    saveCart(cart);
    renderBadge();
    renderDrawer();
  }

  function removeItem(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart(cart);
    renderBadge();
    renderDrawer();
  }

  function clearCart() {
    cart = [];
    saveCart(cart);
    renderBadge();
    renderDrawer();
  }

  function getTotal() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) total += cart[i].price * cart[i].qty;
    return total;
  }

  function getCount() {
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += cart[i].qty;
    return count;
  }

  // ---------- UI injection ----------

  var CSS = '' +
    '#oa-cart-fab{position:fixed; right:20px; bottom:20px; z-index:76; width:50px; height:50px; border-radius:50%;' +
    ' background:var(--ink,#141311); color:var(--yellow,#F4E600); border:2px solid var(--ink,#141311); cursor:pointer;' +
    ' display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.22); transition:transform .15s ease;}' +
    '#oa-cart-fab:hover{transform:translateY(-3px);}' +
    '#oa-cart-fab svg{width:22px; height:22px;}' +
    '#oa-cart-badge{position:absolute; top:-6px; right:-6px; min-width:20px; height:20px; padding:0 4px; border-radius:10px;' +
    ' background:var(--yellow,#F4E600); color:var(--ink,#141311); border:1.5px solid var(--ink,#141311);' +
    ' font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:11px; display:flex; align-items:center; justify-content:center;}' +
    '#oa-cart-badge[data-empty="true"]{display:none;}' +
    '@media (max-width:680px){#oa-cart-fab{bottom:78px;}}' +
    '#oa-cart-backdrop{position:fixed; inset:0; background:rgba(20,19,17,0.5); z-index:98; display:none;}' +
    '#oa-cart-backdrop.open{display:block;}' +
    '#oa-cart-drawer{position:fixed; top:0; right:0; bottom:0; width:min(400px,92vw); background:var(--cream,#FFFDF6); z-index:99;' +
    ' border-left:2px solid var(--ink,#141311); box-shadow:-4px 0 20px rgba(0,0,0,0.18); transform:translateX(100%); transition:transform .22s ease;' +
    ' display:flex; flex-direction:column; font-family:"Be Vietnam Pro",sans-serif;}' +
    '#oa-cart-drawer.open{transform:translateX(0);}' +
    '#oa-cart-head{display:flex; align-items:center; justify-content:space-between; padding:20px 22px; border-bottom:1px solid var(--line,#EAE5D2);}' +
    '#oa-cart-head h2{font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:18px; margin:0; color:var(--ink,#141311);}' +
    '#oa-cart-close{width:32px; height:32px; border:1.5px solid var(--ink,#141311); background:transparent; cursor:pointer; font-size:16px; line-height:1; color:var(--ink,#141311);}' +
    '#oa-cart-close:hover{background:var(--ink,#141311); color:var(--cream,#FFFDF6);}' +
    '#oa-cart-items{flex:1; overflow-y:auto; padding:14px 22px;}' +
    '#oa-cart-empty{color:var(--grey,#6E6B60); font-size:14px; padding:30px 0; text-align:center;}' +
    '.oa-cart-row{display:flex; gap:12px; align-items:flex-start; padding:14px 0; border-bottom:1px solid var(--line,#EAE5D2);}' +
    '.oa-cart-row-name{font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:14.5px; color:var(--ink,#141311);}' +
    '.oa-cart-row-unit{font-size:12px; color:var(--grey,#6E6B60); margin-top:2px;}' +
    '.oa-cart-row-right{margin-left:auto; text-align:right; flex-shrink:0;}' +
    '.oa-cart-row-price{font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:14px; color:var(--ink,#141311);}' +
    '.oa-cart-qty{display:flex; align-items:center; gap:8px; margin-top:6px; justify-content:flex-end;}' +
    '.oa-cart-qty button{width:22px; height:22px; border:1.5px solid var(--ink,#141311); background:var(--paper,#fff); cursor:pointer; font-size:13px; line-height:1; color:var(--ink,#141311);}' +
    '.oa-cart-qty button:hover{background:var(--yellow,#F4E600);}' +
    '.oa-cart-qty span{font-size:13px; font-weight:600; min-width:14px; text-align:center;}' +
    '.oa-cart-remove{font-size:11.5px; color:var(--grey,#6E6B60); text-decoration:underline; cursor:pointer; margin-top:6px; background:none; border:none; padding:0;}' +
    '.oa-cart-remove:hover{color:var(--ink,#141311);}' +
    '#oa-cart-foot{border-top:2px solid var(--ink,#141311); padding:18px 22px 22px;}' +
    '#oa-cart-subtotal-row{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;}' +
    '#oa-cart-subtotal-row .label{font-size:13.5px; color:var(--grey,#6E6B60); font-weight:600;}' +
    '#oa-cart-subtotal-row .amt{font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:22px; color:var(--ink,#141311);}' +
    '#oa-cart-vnd{text-align:right; font-size:12.5px; color:var(--grey,#6E6B60); margin-bottom:14px;}' +
    '#oa-cart-checkout{display:block; width:100%; text-align:center; background:var(--yellow,#F4E600); color:var(--ink,#141311); font-weight:700;' +
    ' padding:13px; font-size:14.5px; border:2px solid var(--ink,#141311); border-radius:2px; cursor:pointer; text-decoration:none;}' +
    '#oa-cart-checkout:hover{background:var(--ink,#141311); color:var(--yellow,#F4E600);}' +
    '#oa-cart-note{font-size:11.5px; color:var(--grey,#6E6B60); margin-top:10px; line-height:1.5;}' +
    '#oa-cart-clear{display:block; width:100%; text-align:center; background:none; border:none; color:var(--grey,#6E6B60); font-size:12px;' +
    ' text-decoration:underline; cursor:pointer; margin-top:12px; padding:0;}' +
    '#oa-cart-clear:hover{color:var(--ink,#141311);}' +
    '[data-cart-item].oa-added{background:var(--yellow,#F4E600) !important; color:var(--ink,#141311) !important;}';

  var CART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
    '<path d="M2.5 3h2.4l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>';

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function buildUI() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var fab = el(
      '<button type="button" id="oa-cart-fab" aria-label="' + STR.cartLabel + '">' +
        CART_SVG +
        '<span id="oa-cart-badge" data-empty="true">0</span>' +
      '</button>'
    );
    var backdrop = el('<div id="oa-cart-backdrop"></div>');
    var drawer = el(
      '<div id="oa-cart-drawer" role="dialog" aria-label="' + STR.cartTitle + '">' +
        '<div id="oa-cart-head"><h2>' + STR.cartTitle + '</h2>' +
        '<button type="button" id="oa-cart-close" aria-label="' + STR.close + '">✕</button></div>' +
        '<div id="oa-cart-items"></div>' +
        '<div id="oa-cart-foot"></div>' +
      '</div>'
    );

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    document.body.appendChild(fab);

    fab.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('#oa-cart-close').addEventListener('click', closeDrawer);
  }

  function openDrawer() {
    document.getElementById('oa-cart-backdrop').classList.add('open');
    document.getElementById('oa-cart-drawer').classList.add('open');
  }

  function closeDrawer() {
    document.getElementById('oa-cart-backdrop').classList.remove('open');
    document.getElementById('oa-cart-drawer').classList.remove('open');
  }

  function renderBadge() {
    var badge = document.getElementById('oa-cart-badge');
    if (!badge) return;
    var count = getCount();
    badge.textContent = count;
    badge.setAttribute('data-empty', count === 0 ? 'true' : 'false');
  }

  function buildWhatsAppUrl() {
    var lines = [STR.waIntro, ''];
    cart.forEach(function (item) {
      var unitSuffix = item.unit ? ' (' + item.unit + ')' : '';
      lines.push('- ' + item.name + unitSuffix + ' x' + item.qty + ' — ' + (item.price * item.qty) + '€');
    });
    var total = getTotal();
    lines.push('');
    lines.push(STR.waTotal + ': ' + total + '€ (~' + formatVND(total * VND_RATE) + ')');
    lines.push('');
    lines.push(STR.waOutro);
    var text = lines.join('\n');
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  }

  function renderDrawer() {
    var itemsEl = document.getElementById('oa-cart-items');
    var footEl = document.getElementById('oa-cart-foot');
    if (!itemsEl || !footEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<div id="oa-cart-empty">' + STR.empty + '</div>';
      footEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = cart.map(function (item) {
      return '' +
        '<div class="oa-cart-row" data-id="' + item.id + '">' +
          '<div>' +
            '<div class="oa-cart-row-name">' + item.name + '</div>' +
            (item.unit ? '<div class="oa-cart-row-unit">' + item.unit + '</div>' : '') +
            '<button type="button" class="oa-cart-remove" data-remove="' + item.id + '">' + STR.remove + '</button>' +
          '</div>' +
          '<div class="oa-cart-row-right">' +
            '<div class="oa-cart-row-price">' + (item.price * item.qty) + '€</div>' +
            '<div class="oa-cart-qty">' +
              '<button type="button" data-qty-down="' + item.id + '">−</button>' +
              '<span>' + item.qty + '</span>' +
              '<button type="button" data-qty-up="' + item.id + '">+</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    var total = getTotal();
    footEl.innerHTML = '' +
      '<div id="oa-cart-subtotal-row"><span class="label">' + STR.subtotal + '</span><span class="amt">' + total + '€</span></div>' +
      '<div id="oa-cart-vnd">~' + formatVND(total * VND_RATE) + '</div>' +
      '<a id="oa-cart-checkout" href="' + buildWhatsAppUrl() + '" target="_blank" rel="noopener">' + STR.checkout + '</a>' +
      '<div id="oa-cart-note">' + STR.checkoutNote + '</div>' +
      '<button type="button" id="oa-cart-clear">' + STR.clear + '</button>';

    footEl.querySelector('#oa-cart-clear').addEventListener('click', clearCart);
    itemsEl.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () { removeItem(btn.getAttribute('data-remove')); });
    });
    itemsEl.querySelectorAll('[data-qty-up]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = findItem(btn.getAttribute('data-qty-up'));
        if (item) setQty(item.id, item.qty + 1);
      });
    });
    itemsEl.querySelectorAll('[data-qty-down]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = findItem(btn.getAttribute('data-qty-down'));
        if (item) setQty(item.id, item.qty - 1);
      });
    });
  }

  function wireAddButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-cart-item]');
      if (!btn) return;
      var raw = btn.getAttribute('data-cart-item');
      var data;
      try { data = JSON.parse(raw); } catch (err) { return; }
      addItem(data);

      var originalText = btn.getAttribute('data-original-label') || btn.textContent;
      btn.setAttribute('data-original-label', originalText);
      btn.textContent = STR.added;
      btn.classList.add('oa-added');
      setTimeout(function () {
        btn.textContent = originalText;
        btn.classList.remove('oa-added');
      }, 1200);

      openDrawer();
    });
  }

  function init() {
    buildUI();
    renderBadge();
    renderDrawer();
    wireAddButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
