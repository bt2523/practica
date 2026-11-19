/* Адмін-панель: додавання, редагування, видалення товарів */
(function () {
  const $ = id => document.getElementById(id);
  const CAT_UA = { clothing: "Одяг", footwear: "Взуття", accessories: "Аксесуари" };
  const GEN_UA = { men: "Чоловічий", women: "Жіночий" };
  let editingId = null;
  let uploadedData = ""; // dataURL завантаженого файлу

  /* ---------- Таблиця ---------- */
  function render() {
    const list = Store.all();
    const q = $("aSearch").value.trim().toLowerCase();
    const cat = $("aCat").value;
    const rows = list.filter(p =>
      (cat === "all" || p.category === cat) &&
      (!q || (p.name + " " + p.brand).toLowerCase().includes(q))
    );

    /* статистика */
    const rich = Store.priciest(list), cheap = Store.cheapest(list);
    $("stats").innerHTML = `
      <div class="stat"><small>Усього товарів</small><b>${list.length}</b></div>
      <div class="stat"><small>Одяг / Взуття / Аксесуари</small><b>${["clothing", "footwear", "accessories"].map(c => list.filter(p => p.category === c).length).join(" / ")}</b></div>
      <div class="stat"><small>Найдорожчий</small><b>${rich ? escapeHtml(rich.name) + " — " + money(rich.price) : "—"}</b></div>
      <div class="stat"><small>Найдешевший</small><b>${cheap ? escapeHtml(cheap.name) + " — " + money(cheap.price) : "—"}</b></div>`;

    $("tbody").innerHTML = rows.length ? rows.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><img src="${imgSrc(p.image, 200)}" alt="${escapeHtml(p.name)}" onerror="imgFail(this)"></td>
        <td><b>${escapeHtml(p.name)}</b></td>
        <td>${escapeHtml(p.brand)}</td>
        <td><span class="pill">${CAT_UA[p.category] || p.category}</span></td>
        <td>${GEN_UA[p.gender] || p.gender}</td>
        <td>${p.sizes.map(escapeHtml).join(", ")}</td>
        <td>${escapeHtml(p.color)}</td>
        <td>${escapeHtml(p.material)}</td>
        <td><b>${money(p.price)}</b></td>
        <td><div class="row-actions">
          <button class="ibtn" data-edit="${p.id}">Змінити</button>
          <button class="ibtn danger" data-del="${p.id}">Видалити</button>
        </div></td>
      </tr>`).join("")
      : `<tr><td colspan="11" style="text-align:center;padding:40px;color:#777">Товарів не знайдено</td></tr>`;
  }

  /* ---------- Форма ---------- */
  function openForm(p) {
    editingId = p ? p.id : null;
    uploadedData = "";
    $("formTitle").textContent = p ? "Редагування товару #" + p.id : "Новий товар";
    $("pName").value = p ? p.name : "";
    $("pBrand").value = p ? p.brand : "";
    $("pCat").value = p ? p.category : "clothing";
    $("pGender").value = p ? p.gender : "women";
    $("pPrice").value = p ? p.price : "";
    $("pSizes").value = p ? p.sizes.join(", ") : "";
    $("pColor").value = p ? p.color : "";
    $("pMaterial").value = p ? p.material : "";
    $("pImage").value = p ? (p.image.startsWith("data:") ? "(завантажений файл)" : p.image) : "";
    $("pDesc").value = p ? p.description : "";
    $("pFile").value = "";
    $("formErr").textContent = "";
    updatePreview();
    $("formOverlay").classList.add("open");
    $("pName").focus();
  }
  const closeForm = () => $("formOverlay").classList.remove("open");

  function currentImageValue() {
    if (uploadedData) return uploadedData;
    const v = $("pImage").value.trim();
    if (v === "(завантажений файл)" && editingId) {
      const old = Store.all().find(x => x.id === editingId);
      return old ? old.image : "";
    }
    return v;
  }
  function updatePreview() {
    const v = currentImageValue();
    $("pPreview").src = v ? imgSrc(v, 300) : placeholder("Фото");
  }
  $("pPreview").onerror = function () { this.onerror = null; this.src = placeholder("Фото"); };
  $("pImage").addEventListener("input", () => { uploadedData = ""; updatePreview(); });

  /* зменшуємо завантажене фото, щоб не переповнити localStorage */
  $("pFile").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 700, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        uploadedData = c.toDataURL("image/jpeg", 0.8);
        $("pImage").value = "(завантажений файл)";
        updatePreview();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });

  $("pForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("pName").value.trim();
    const brand = $("pBrand").value.trim();
    const price = parseFloat($("pPrice").value);
    const sizes = $("pSizes").value.split(",").map(s => s.trim()).filter(Boolean);
    const color = $("pColor").value.trim();
    const material = $("pMaterial").value.trim();
    const image = currentImageValue();

    let err = "";
    if (!name) err = "Вкажіть назву товару.";
    else if (!brand) err = "Вкажіть бренд.";
    else if (isNaN(price) || price < 0) err = "Вкажіть коректну ціну.";
    else if (!sizes.length) err = "Вкажіть хоча б один розмір.";
    else if (!color) err = "Вкажіть колір.";
    else if (!material) err = "Вкажіть матеріал.";
    else if (!image) err = "Додайте фото (посилання, ID Unsplash або файл).";
    if (err) { $("formErr").textContent = err; return; }

    const data = {
      name, brand, price: Math.round(price), sizes, color, material, image,
      category: $("pCat").value, gender: $("pGender").value, description: $("pDesc").value.trim()
    };
    if (editingId) { data.id = editingId; Store.update(data); toast("Товар оновлено"); }
    else { Store.add(data); toast("Товар додано"); }
    closeForm();
    render();
  });

  /* ---------- Події ---------- */
  $("addBtn").onclick = () => openForm(null);
  $("formClose").onclick = closeForm;
  $("formCancel").onclick = closeForm;
  $("formOverlay").addEventListener("click", e => { if (e.target === $("formOverlay")) closeForm(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeForm(); });
  $("aSearch").addEventListener("input", render);
  $("aCat").addEventListener("change", render);

  $("tbody").addEventListener("click", e => {
    const ed = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (ed) openForm(Store.all().find(p => p.id === +ed.dataset.edit));
    if (del) {
      const p = Store.all().find(x => x.id === +del.dataset.del);
      if (p && confirm('Видалити товар "' + p.name + '"?')) { Store.remove(p.id); toast("Товар видалено"); render(); }
    }
  });

  $("resetBtn").onclick = () => {
    if (confirm("Скинути всі зміни та повернути 30 початкових товарів?")) { Store.reset(); render(); toast("Дані скинуто"); }
  };
  /* ---------- Імпорт JSON ---------- */
  const CATS = ["clothing", "footwear", "accessories"], GENS = ["men", "women"];
  function normalize(r, i) {
    const sizes = Array.isArray(r.sizes) ? r.sizes : String(r.sizes || "").split(",");
    const p = {
      name: String(r.name || "").trim(), brand: String(r.brand || "").trim(),
      category: CATS.includes(r.category) ? r.category : "", gender: GENS.includes(r.gender) ? r.gender : "",
      price: Math.round(Number(r.price)), sizes: sizes.map(s => String(s).trim()).filter(Boolean),
      color: String(r.color || "").trim(), material: String(r.material || "").trim(),
      image: String(r.image || "").trim(), description: String(r.description || "").trim()
    };
    const bad = !p.name ? "назва" : !p.brand ? "бренд" : !p.category ? "категорія (clothing/footwear/accessories)" :
      !p.gender ? "стать (men/women)" : !(p.price >= 0) ? "ціна" : !p.sizes.length ? "розміри" :
      !p.color ? "колір" : !p.material ? "матеріал" : !p.image ? "фото" : "";
    if (bad) throw new Error("Товар №" + (i + 1) + ": некоректне поле — " + bad);
    return p;
  }
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").addEventListener("change", e => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data) || !data.length) throw new Error("Файл має містити непорожній масив товарів [ {...}, {...} ]");
        const items = data.map(normalize);
        const replace = confirm("Імпортовано товарів: " + items.length + ".\n\nOK — замінити весь поточний каталог.\nСкасувати — додати до наявних товарів.");
        let list = replace ? [] : Store.all();
        let id = Store.nextId(list);
        items.forEach(p => { p.id = id++; list.push(p); });
        Store.save(list);
        render();
        toast("Імпортовано товарів: " + items.length);
      } catch (err) {
        alert("Не вдалося імпортувати JSON.\n" + err.message);
      }
    };
    reader.readAsText(f, "utf-8");
  });

  $("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jolly-products.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---------- Замовлення ---------- */
  const ST = { new: "Нове", processing: "В обробці", done: "Виконано", cancel: "Скасовано" };
  function renderOrders() {
    const list = Orders.all().slice().reverse();
    $("ordCount").textContent = list.length;
    $("ordBody").innerHTML = list.length ? list.map(o => `
      <tr>
        <td><b>${o.id}</b></td>
        <td>${new Date(o.date).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" })}</td>
        <td>${escapeHtml(o.customer.name)}<br><small>${escapeHtml(o.customer.phone)}<br>${escapeHtml(o.customer.email)}</small></td>
        <td>${escapeHtml(o.delivery)}<br><small>${escapeHtml(o.customer.city)}, ${escapeHtml(o.address)}<br>${escapeHtml(o.payment)}</small>${o.comment ? "<br><small><i>" + escapeHtml(o.comment) + "</i></small>" : ""}</td>
        <td>${o.items.map(i => escapeHtml(i.name) + " × " + i.qty).join("<br>")}</td>
        <td><b>${money(o.total)}</b></td>
        <td><select class="st" data-st="${o.id}">${Object.keys(ST).map(k => `<option value="${k}" ${o.status === k ? "selected" : ""}>${ST[k]}</option>`).join("")}</select></td>
        <td><button class="ibtn danger" data-odel="${o.id}">Видалити</button></td>
      </tr>`).join("")
      : `<tr><td colspan="8" style="text-align:center;padding:40px;color:#777">Замовлень поки немає</td></tr>`;
  }
  $("ordBody").addEventListener("change", e => {
    const s = e.target.closest("[data-st]");
    if (s) { Orders.setStatus(+s.dataset.st, s.value); toast("Статус оновлено"); }
  });
  $("ordBody").addEventListener("click", e => {
    const d = e.target.closest("[data-odel]");
    if (d && confirm("Видалити замовлення №" + d.dataset.odel + "?")) { Orders.remove(+d.dataset.odel); renderOrders(); }
  });

  render();
  renderOrders();
})();
