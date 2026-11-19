/* Спільний модуль: сховище товарів (localStorage), кошик, допоміжні функції */
const STORE_KEY = "jolly_products_v3";
const CART_KEY = "jolly_cart_v1";

const CATEGORY_LABELS = { clothing: "Одяг", footwear: "Взуття", accessories: "Аксесуари" };
const GENDER_LABELS = { men: "Чоловічий", women: "Жіночий" };

const Store = {
  all() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  },
  save(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { alert("Не вдалося зберегти дані"); }
  },
  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  },
  nextId(list) {
    return list.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  },
  add(p) {
    const list = this.all();
    p.id = this.nextId(list);
    list.push(p);
    this.save(list);
    return p;
  },
  update(p) {
    const list = this.all().map(x => (x.id === p.id ? p : x));
    this.save(list);
  },
  remove(id) {
    this.save(this.all().filter(x => x.id !== id));
  },
  cheapest(list) {
    return list.length ? list.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  },
  priciest(list) {
    return list.length ? list.reduce((a, b) => (b.price > a.price ? b : a)) : null;
  }
};

/* ---------- Кошик ---------- */
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } },
  set(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } this.render(); },
  add(id) {
    const c = this.get();
    const row = c.find(r => r.id === id);
    if (row) row.qty++; else c.push({ id, qty: 1 });
    this.set(c);
  },
  setQty(id, qty) {
    let c = this.get();
    if (qty <= 0) c = c.filter(r => r.id !== id);
    else c.forEach(r => { if (r.id === id) r.qty = Math.min(qty, 99); });
    this.set(c);
  },
  remove(id) { this.set(this.get().filter(r => r.id !== id)); },
  clear() { this.set([]); },
  /* рядки кошика разом з даними товару (видалені з каталогу товари пропускаються) */
  items() {
    const all = Store.all();
    return this.get().map(r => ({ product: all.find(p => p.id === r.id), qty: r.qty })).filter(r => r.product);
  },
  total() { return this.items().reduce((s, r) => s + r.product.price * r.qty, 0); },
  count() { return this.items().reduce((s, r) => s + r.qty, 0); },
  render() {
    document.querySelectorAll("[data-cart-count]").forEach(el => (el.textContent = this.count()));
  }
};

/* ---------- Замовлення ---------- */
const ORDERS_KEY = "jolly_orders_v2";
const Orders = {
  all() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; } },
  add(order) {
    const list = this.all();
    order.id = list.reduce((m, o) => Math.max(m, o.id), 1000) + 1;
    order.date = new Date().toISOString();
    list.push(order);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    return order;
  },
  remove(id) {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(this.all().filter(o => o.id !== id))); } catch (e) { /* ignore */ }
  },
  setStatus(id, status) {
    const list = this.all(); list.forEach(o => { if (o.id === id) o.status = status; });
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
};

/* ---------- Допоміжні ---------- */
function money(v) {
  return String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + "\u00A0грн";
}

function imgSrc(v, w) {
  w = w || 800;
  if (!v) return placeholder("Jolly House");
  if (/^(https?:|data:|\.\/|\/)/.test(v)) return v;
  return "https://unsplash.com/photos/" + v + "/download?force=true&w=" + w;
}

function placeholder(text) {
  const t = String(text || "").slice(0, 28).replace(/[<>&"]/g, "");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">' +
    '<rect width="600" height="750" fill="#F8F3F1"/>' +
    '<text x="300" y="360" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#C2A18A">Jólly.</text>' +
    '<text x="300" y="410" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#383838">' + t + "</text></svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* Якщо фото не завантажилось — показуємо заглушку */
function imgFail(img) {
  img.onerror = null;
  img.src = placeholder(img.alt);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* Мобільне меню + лічильник кошика */
document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".burger");
  const nav = document.querySelector(".nav");
  if (burger && nav) burger.addEventListener("click", () => nav.classList.toggle("open"));
  nav && nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  Cart.render();
});
