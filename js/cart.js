/* Кошик та оформлення замовлення */
(function () {
  const $ = id => document.getElementById(id);
  const DELIVERY = { np: { label: "Нова пошта (відділення)", price: 200 }, courier: { label: "Кур'єр", price: 320 }, pickup: { label: "Самовивіз з бутика", price: 0 } };
  const PAYMENT = { card: "Карткою онлайн", cod: "Післяплата при отриманні" };
  const FREE_FROM = 6000; // безкоштовна доставка від суми

  function deliveryPrice() {
    const d = $("oDelivery").value;
    return Cart.total() >= FREE_FROM ? 0 : DELIVERY[d].price;
  }

  function renderCart() {
    const items = Cart.items();
    const empty = !items.length;
    $("cartEmpty").style.display = empty ? "" : "none";
    $("cartLayout").style.display = empty ? "none" : "";
    $("cartTitle").textContent = empty ? "Кошик порожній." : "Ваш кошик.";
    if (empty) return;

    $("cartList").innerHTML = items.map(({ product: p, qty }) => `
      <div class="cart-row">
        <img src="${imgSrc(p.image, 240)}" alt="${escapeHtml(p.name)}" onerror="imgFail(this)">
        <div class="info">
          <div class="brand" style="margin:0">${escapeHtml(p.brand)}</div>
          <h4>${escapeHtml(p.name)}</h4>
          <div class="meta">${escapeHtml(p.color)} · ${escapeHtml(p.material)}</div>
          <div class="price" style="margin:6px 0 0">${money(p.price)}</div>
        </div>
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Менше">−</button>
          <span>${qty}</span>
          <button data-inc="${p.id}" aria-label="Більше">+</button>
        </div>
        <div class="line-total">${money(p.price * qty)}</div>
        <button class="rm" data-rm="${p.id}" aria-label="Видалити">×</button>
      </div>`).join("");
    renderSummary();
  }

  function renderSummary() {
    const sub = Cart.total(), del = deliveryPrice();
    $("sumItems").textContent = money(sub);
    $("sumDelivery").textContent = del === 0 ? "Безкоштовно" : money(del);
    $("sumTotal").textContent = money(sub + del);
    $("freeNote").textContent = sub >= FREE_FROM
      ? "Безкоштовна доставка від " + money(FREE_FROM) + " діє."
      : "До безкоштовної доставки залишилось " + money(FREE_FROM - sub) + ".";
  }

  function updateAddressField() {
    const d = $("oDelivery").value;
    $("addressGroup").style.display = d === "pickup" ? "none" : "";
    $("addressLabel").textContent = d === "np" ? "Номер відділення *" : "Адреса доставки (вулиця, будинок, квартира) *";
    $("oAddress").placeholder = d === "np" ? "Наприклад: Відділення №12" : "вул. Хрещатик, 1, кв. 5";
    renderSummary();
  }

  /* ---------- Події кошика ---------- */
  $("cartList").addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
    const find = id => Cart.get().find(r => r.id === +id);
    if (inc) Cart.setQty(+inc.dataset.inc, find(inc.dataset.inc).qty + 1);
    if (dec) Cart.setQty(+dec.dataset.dec, find(dec.dataset.dec).qty - 1);
    if (rm) Cart.remove(+rm.dataset.rm);
    if (inc || dec || rm) renderCart();
  });
  $("clearCart").onclick = () => { if (confirm("Очистити кошик?")) { Cart.clear(); renderCart(); } };
  $("oDelivery").addEventListener("change", updateAddressField);

  /* ---------- Валідація та оформлення ---------- */
  function setErr(id, msg) {
    const el = document.querySelector(`.field-err[data-for="${id}"]`);
    if (el) el.textContent = msg || "";
    $(id).classList.toggle("invalid", !!msg);
    return !msg;
  }

  function validate() {
    let ok = true;
    const name = $("oName").value.trim();
    const phone = $("oPhone").value.trim();
    const digits = phone.replace(/\D/g, "");
    const email = $("oEmail").value.trim();
    ok = setErr("oName", name.split(/\s+/).filter(Boolean).length < 2 ? "Вкажіть імʼя та прізвище" : "") && ok;
    ok = setErr("oPhone", !/^[+\d\s()\-]+$/.test(phone) || digits.length < 10 || digits.length > 13 ? "Вкажіть коректний номер телефону" : "") && ok;
    ok = setErr("oEmail", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "Вкажіть коректний e-mail" : "") && ok;
    ok = setErr("oCity", $("oCity").value.trim().length < 2 ? "Вкажіть місто" : "") && ok;
    if ($("oDelivery").value !== "pickup") ok = setErr("oAddress", $("oAddress").value.trim().length < 2 ? "Вкажіть адресу або відділення" : "") && ok;
    else setErr("oAddress", "");
    return ok;
  }

  $("orderForm").addEventListener("submit", e => {
    e.preventDefault();
    const items = Cart.items();
    if (!items.length) { toast("Кошик порожній"); return; }
    if (!validate()) {
      const bad = document.querySelector(".invalid"); if (bad) bad.focus();
      return;
    }
    const d = $("oDelivery").value;
    const sub = Cart.total(), del = deliveryPrice();
    const order = Orders.add({
      status: "new",
      customer: { name: $("oName").value.trim(), phone: $("oPhone").value.trim(), email: $("oEmail").value.trim(), city: $("oCity").value.trim() },
      delivery: DELIVERY[d].label,
      address: d === "pickup" ? "Бутик, 5th Ave, Нью-Йорк" : $("oAddress").value.trim(),
      payment: PAYMENT[$("oPayment").value],
      comment: $("oComment").value.trim(),
      items: items.map(r => ({ id: r.product.id, name: r.product.name, brand: r.product.brand, price: r.product.price, qty: r.qty })),
      subtotal: sub, deliveryCost: del, total: sub + del
    });
    Cart.clear();
    showDone(order);
  });

  function showDone(o) {
    $("cartLayout").style.display = "none";
    $("cartEmpty").style.display = "none";
    $("cartTitle").textContent = "Дякуємо за замовлення!";
    $("orderDone").style.display = "";
    $("orderDone").innerHTML = `
      <div class="done-mark">✔</div>
      <h2>Замовлення №${o.id} прийнято</h2>
      <p>Ми надіслали підтвердження на <b>${escapeHtml(o.customer.email)}</b> та зателефонуємо на <b>${escapeHtml(o.customer.phone)}</b>, щоб уточнити деталі.</p>
      <table class="specs" style="max-width:520px;margin:26px auto">
        ${o.items.map(i => `<tr><td style="width:auto">${escapeHtml(i.name)} × ${i.qty}</td><td style="text-align:right">${money(i.price * i.qty)}</td></tr>`).join("")}
        <tr><td>Доставка (${escapeHtml(o.delivery)})</td><td style="text-align:right">${o.deliveryCost ? money(o.deliveryCost) : "Безкоштовно"}</td></tr>
        <tr><td><b>Разом</b></td><td style="text-align:right"><b>${money(o.total)}</b></td></tr>
      </table>
      <p style="color:#6f6a67">Оплата: ${escapeHtml(o.payment)}<br>Адреса: ${escapeHtml(o.customer.city)}, ${escapeHtml(o.address)}</p>
      <div class="btn-row" style="justify-content:center"><a href="catalog.html" class="btn">Продовжити покупки</a></div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* прибираємо помилку при введенні */
  ["oName", "oPhone", "oEmail", "oCity", "oAddress"].forEach(id => $(id).addEventListener("input", () => setErr(id, "")));

  updateAddressField();
  renderCart();
})();
