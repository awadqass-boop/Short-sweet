// Short & Sweet menu — the one place to change products, flavours and retail prices (AED).
// The order page builds itself from this, and the home + menu pages fill any [data-price] from it.
window.SS_MENU = (function () {
  const P = 'assets/products/';
  const FLAVOURS = [
    {id: 'cc-dark',   name: 'Coconut Cream (Dark Chocolate)',  short: 'Coconut · Dark',  dot: '#4a2a1d'},
    {id: 'cc-white',  name: 'Coconut Cream (White Chocolate)', short: 'Coconut · White', dot: '#f6ecd9'},
    {id: 'cc-mixed',  name: 'Coconut Cream (Mixed Dark & White Chocolate)', short: 'Coconut · Mixed', dot: 'linear-gradient(90deg,#4a2a1d 50%,#f6ecd9 50%)'},
    {id: 'pistachio', name: 'Salted Pistachio', short: 'Pistachio', dot: '#9db06a'},
    {id: 'caramel',   name: 'Salted Caramel',   short: 'Caramel',   dot: '#c4823a'},
  ];
  const PRODUCTS = [
    {id: 'khaliya', name: 'Khaliya', sub: 'Emirati cheese balls', pick: 'Size', img: P + 'khaliya-regular.webp',
     variants: [
       {id: 'mini',    name: 'Mini',    price: 15,  img: P + 'khaliya-mini.webp'},
       {id: 'regular', name: 'Regular', price: 80,  img: P + 'khaliya-regular.webp'},
       {id: 'family',  name: 'Family',  price: 150, img: P + 'khaliya-family.webp'},
     ]},
    {id: 'shorties', name: 'Shorties', sub: 'Salted caramel shortbread', pick: 'Type', img: P + 'shorties-box4.webp',
     variants: [
       {id: 'jar',   name: 'Shortie Pop Jar', price: 35, img: P + 'shortie-pop-jar.webp', flavour: true},
       {id: 'box4',  name: 'Box of 4',        price: 35, img: P + 'shorties-box4.webp'},
       {id: 'box10', name: 'Box of 10',       price: 80, img: P + 'shorties-box10.webp'},
     ]},
    {id: 'bowl', name: 'Glass Bowls', sub: 'Stackable · pick your flavour', img: P + 'bowl-medium.webp',
     // prices are [Single, Set of 2, Set of 3]
     sizes: [
       {id: 'large',  name: 'Large',  pops: 100, prices: [265, 500, 710], img: P + 'bowl-large.webp'},
       {id: 'medium', name: 'Medium', pops: 60,  prices: [190, 360, 500], img: P + 'bowl-medium.webp'},
       {id: 'small',  name: 'Small',  pops: 25,  prices: [150, 300, 400], img: P + 'bowl-small.webp'},
       {id: 'mini',   name: 'Mini',   pops: 6,   prices: [60, 120, 160],  img: P + 'bowl-mini.webp'},
     ],
     packs: [{n: 1, name: 'Single'}, {n: 2, name: 'Set of 2'}, {n: 3, name: 'Set of 3'}]},
    {id: 'voucher', name: 'Gift Voucher', sub: 'A sweet gift for anyone', pick: 'Amount', img: 'assets/gift-voucher.jpg',
     variants: [
       {id: '50',  name: 'AED 50',  price: 50,  img: 'assets/gift-voucher.jpg'},
       {id: '100', name: 'AED 100', price: 100, img: 'assets/gift-voucher.jpg'},
       {id: '150', name: 'AED 150', price: 150, img: 'assets/gift-voucher.jpg'},
     ]},
    {id: 'custom', name: 'Something else', sub: 'Custom order or packaging', img: null},
  ];
  // Pre-order notice (from the menu): 10–20 pieces 48 hours, above 20 pieces 5 days, customised 7 days.
  // Smaller orders still need to be placed at least a day ahead.
  const LEAD = {base: 1, mid: 2, large: 5, custom: 7};

  const PROD = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  function price(key) {
    const [kind, a, b] = String(key).split('.');
    const p = PROD[kind]; if (!p) return 0;
    if (kind === 'bowl') { const s = p.sizes.find(x => x.id === a); return s ? s.prices[(+b || 1) - 1] || 0 : 0; }
    const v = (p.variants || []).find(x => x.id === a); return v ? v.price : 0;
  }
  function fill(root) {
    (root || document).querySelectorAll('[data-price]').forEach(el => {
      const n = price(el.dataset.price); if (n) el.textContent = (el.dataset.bare != null ? '' : 'AED ') + n;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fill()); else fill();
  return {FLAVOURS, PRODUCTS, PROD, LEAD, price, fill};
})();
