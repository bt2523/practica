/* Головна сторінка: категорії, карусель колекції, Instagram */
(function () {
  const products = Store.all();

  /* --- Категорії --- */
  const cats = [
    { key: "clothing", title: "Одяг", text: "Джинси, куртки, худі, блузи, сукні та пальта з якісних тканин.", img: "1w7Z_BzML2Y" },
    { key: "footwear", title: "Взуття", text: "Кросівки, черевики та щоденне взуття від брендів, яким ви довіряєте.", img: "NUoPWImmjCU" },
    { key: "accessories", title: "Аксесуари", text: "Шкіряні сумки, сонцезахисні окуляри та гаманці, що ідеально пасують до образів.", img: "5gLGirjCf7Q" }
  ];
  document.getElementById("categoryCards").innerHTML = cats.map(c => {
    const n = products.filter(p => p.category === c.key).length;
    return `<a class="cat-card" href="catalog.html?category=${c.key}">
      <img src="${imgSrc(c.img, 700)}" alt="${c.title}" loading="lazy" onerror="imgFail(this)">
      <h3>${c.title}</h3><p>${c.text}</p><span class="count">${n} товарів →</span></a>`;
  }).join("");

  /* --- Карусель колекції (6 обраних товарів) --- */
  const featuredIds = [7, 5, 10, 11, 25, 16];
  let featured = featuredIds.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (featured.length < 3) featured = products.slice(0, 6);
  const track = document.getElementById("colTrack");
  track.innerHTML = featured.map(p => `
    <article class="product">
      <div class="pimg"><img src="${imgSrc(p.image, 700)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="imgFail(this)"></div>
      <div class="brand">${escapeHtml(p.brand)}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="price">${money(p.price)}</div>
      <button class="btn small" data-add="${p.id}">У кошик</button>
    </article>`).join("");
  track.addEventListener("click", e => {
    const b = e.target.closest("[data-add]");
    if (b) { Cart.add(+b.dataset.add); toast("Додано до кошика"); }
  });

  let pos = 0;
  const prev = document.getElementById("colPrev"), next = document.getElementById("colNext");
  const perView = () => (innerWidth <= 560 ? 1 : innerWidth <= 860 ? 2 : 3);
  function slide() {
    const max = Math.max(0, featured.length - perView());
    pos = Math.min(Math.max(pos, 0), max);
    const item = track.children[0];
    const step = item ? item.getBoundingClientRect().width + 30 : 0;
    track.style.transform = `translateX(${-pos * step}px)`;
    prev.disabled = pos === 0;
    next.disabled = pos >= max;
  }
  prev.onclick = () => { pos--; slide(); };
  next.onclick = () => { pos++; slide(); };
  addEventListener("resize", slide);
  slide();

  /* --- Instagram --- */
  const insta = ["yZZh_QrHpY0", "BtHgu3sUwXY", "wOrA2uWstYg", "3f4Rhe70Vj4", "sf-6E5vq9ng", "9-PjWSJnYN0"];
  document.getElementById("instaTrack").innerHTML =
    insta.map((id, i) => `<img src="${imgSrc(id, 700)}" alt="Jolly House в Instagram ${i + 1}" loading="lazy" onerror="imgFail(this)">`).join("");
})();
