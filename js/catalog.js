/* Каталог: пошук, фільтри, сортування, найдорожчий/найдешевший товар */
(function () {
  const all = Store.all();
  const $ = id => document.getElementById(id);

  const state = { cat: "all", gender: "all", brands: new Set(), size: "", color: "", material: "", min: "", max: "", q: "", sort: "default" };

  /* початкова категорія з URL: catalog.html?category=footwear */
  const urlCat = new URLSearchParams(location.search).get("category");
  if (urlCat && CATEGORY_LABELS[urlCat]) state.cat = urlCat;

  /* ---------- Побудова варіантів фільтрів ---------- */
  const sizeOrder = ["XS", "S", "M", "L", "XL", "Один розмір"];
  function sortSizes(a, b) {
    const ia = sizeOrder.indexOf(a), ib = sizeOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return Number(a) - Number(b);
  }
  const uniq = arr => [...new Set(arr)];

  function buildOptions() {
    const scope = all.filter(p => state.cat === "all" || p.category === state.cat);

    const brands = uniq(scope.map(p => p.brand)).sort((a, b) => a.localeCompare(b));
    state.brands.forEach(b => { if (!brands.includes(b)) state.brands.delete(b); });
    $("fBrands").innerHTML = brands.map(b => {
      const n = scope.filter(p => p.brand === b).length;
      return `<label><input type="checkbox" value="${escapeHtml(b)}" ${state.brands.has(b) ? "checked" : ""}> ${escapeHtml(b)} <span style="color:#999">(${n})</span></label>`;
    }).join("");

    fillSelect("fSize", uniq(scope.flatMap(p => p.sizes)).sort(sortSizes), "Будь-який розмір", "size");
    fillSelect("fColor", uniq(scope.map(p => p.color)).sort(), "Будь-який колір", "color");
    fillSelect("fMaterial", uniq(scope.map(p => p.material)).sort(), "Будь-який матеріал", "material");
  }

  function fillSelect(id, values, anyLabel, key) {
    if (state[key] && !values.includes(state[key])) state[key] = "";
    $(id).innerHTML = `<option value="">${anyLabel}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}" ${state[key] === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
  }

  /* ---------- Фільтрація і сортування ---------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    const min = state.min === "" ? null : Number(state.min);
    const max = state.max === "" ? null : Number(state.max);
    let list = all.filter(p => {
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (state.gender !== "all" && p.gender !== state.gender) return false;
      if (state.brands.size && !state.brands.has(p.brand)) return false;
      if (state.size && !p.sizes.includes(state.size)) return false;
      if (state.color && p.color !== state.color) return false;
      if (state.material && p.material !== state.material) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (q) {
        const hay = [p.name, p.brand, CATEGORY_LABELS[p.category], p.category].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (state.sort === "asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  /* ---------- Відмальовування ---------- */
  function render() {
    const list = filtered();
    const cheap = Store.cheapest(list), rich = Store.priciest(list);

    $("foundText").textContent = "Знайдено товарів: " + list.length;

    /* найдорожчий / найдешевший */
    $("extremes").innerHTML = list.length > 1 && cheap.id !== rich.id
      ? [[rich, "Найдорожчий"], [cheap, "Найдешевший"]].map(([p, label]) => `
        <div class="ext" data-open="${p.id}">
          <img src="${imgSrc(p.image, 300)}" alt="${escapeHtml(p.name)}" onerror="imgFail(this)">
          <div><small>${label}</small><b>${escapeHtml(p.name)}</b><span>${money(p.price)}</span></div>
        </div>`).join("")
      : "";

    if (!list.length) {
      $("grid").innerHTML = `<div class="empty"><p>За вашими фільтрами товарів не знайдено.</p><button class="link-btn" id="emptyReset">Скинути фільтри</button></div>`;
      const b = $("emptyReset"); if (b) b.onclick = resetAll;
      return;
    }

    $("grid").innerHTML = list.map(p => {
      let badge = "";
      if (list.length > 1 && cheap.id !== rich.id) {
        if (p.id === rich.id) badge = '<span class="badge">Найдорожчий</span>';
        else if (p.id === cheap.id) badge = '<span class="badge cheap">Найдешевший</span>';
      }
      return `
      <article class="product">
        ${badge}
        <div class="pimg" data-open="${p.id}" style="cursor:pointer"><img src="${imgSrc(p.image, 600)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="imgFail(this)"></div>
        <div class="brand">${escapeHtml(p.brand)}</div>
        <h3 data-open="${p.id}" style="cursor:pointer">${escapeHtml(p.name)}</h3>
        <div class="meta">${GENDER_LABELS[p.gender]} · ${escapeHtml(p.color)} · ${escapeHtml(p.material)}</div>
        <div class="price">${money(p.price)}</div>
        <button class="btn small" data-add="${p.id}">У кошик</button>
      </article>`;
    }).join("");
  }

  /* ---------- Деталі товару ---------- */
  function openDetail(id) {
    const p = all.find(x => x.id === id);
    if (!p) return;
    $("detailModal").innerHTML = `
      <button class="close" aria-label="Закрити">×</button>
      <div class="detail">
        <img src="${imgSrc(p.image, 900)}" alt="${escapeHtml(p.name)}" onerror="imgFail(this)">
        <div class="detail-body">
          <div class="eyebrow">${CATEGORY_LABELS[p.category]} · ${GENDER_LABELS[p.gender]}</div>
          <h2>${escapeHtml(p.name)}</h2>
          <div class="price">${money(p.price)}</div>
          <p>${escapeHtml(p.description)}</p>
          <table class="specs">
            <tr><td>Бренд</td><td>${escapeHtml(p.brand)}</td></tr>
            <tr><td>Категорія</td><td>${CATEGORY_LABELS[p.category]}</td></tr>
            <tr><td>Розмір</td><td>${p.sizes.map(escapeHtml).join(", ")}</td></tr>
            <tr><td>Колір</td><td>${escapeHtml(p.color)}</td></tr>
            <tr><td>Матеріал</td><td>${escapeHtml(p.material)}</td></tr>
          </table>
          <button class="btn" data-add="${p.id}">У кошик</button>
        </div>
      </div>`;
    $("detailOverlay").classList.add("open");
  }
  const closeDetail = () => $("detailOverlay").classList.remove("open");

  function resetAll() {
    Object.assign(state, { gender: "all", size: "", color: "", material: "", min: "", max: "", q: "", sort: "default" });
    state.brands.clear();
    $("fSearch").value = ""; $("fMin").value = ""; $("fMax").value = ""; $("sortSelect").value = "default";
    setGender("all");
    buildOptions(); render();
  }

  function setGender(g) {
    state.gender = g;
    document.querySelectorAll("#fGender button").forEach(b => b.classList.toggle("active", b.dataset.g === g));
  }

  /* ---------- Події ---------- */
  $("catTabs").addEventListener("click", e => {
    const t = e.target.closest(".tab"); if (!t) return;
    state.cat = t.dataset.cat;
    document.querySelectorAll("#catTabs .tab").forEach(x => x.classList.toggle("active", x === t));
    buildOptions(); render();
  });
  $("fSearch").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("fGender").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; setGender(b.dataset.g); render(); });
  $("fBrands").addEventListener("change", e => {
    if (e.target.checked) state.brands.add(e.target.value); else state.brands.delete(e.target.value);
    render();
  });
  $("fSize").addEventListener("change", e => { state.size = e.target.value; render(); });
  $("fColor").addEventListener("change", e => { state.color = e.target.value; render(); });
  $("fMaterial").addEventListener("change", e => { state.material = e.target.value; render(); });
  $("fMin").addEventListener("input", e => { state.min = e.target.value; render(); });
  $("fMax").addEventListener("input", e => { state.max = e.target.value; render(); });
  $("sortSelect").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("fReset").addEventListener("click", resetAll);
  $("filterToggle").addEventListener("click", () => $("filters").classList.toggle("open"));

  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) { Cart.add(+add.dataset.add); toast("Додано до кошика"); return; }
    const op = e.target.closest("[data-open]");
    if (op) { openDetail(+op.dataset.open); return; }
    if (e.target.closest(".modal .close") || e.target === $("detailOverlay")) closeDetail();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

  /* старт */
  document.querySelectorAll("#catTabs .tab").forEach(x => x.classList.toggle("active", x.dataset.cat === state.cat));
  buildOptions();
  render();
})();
