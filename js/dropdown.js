/* Власні випадаючі списки: замінюють стандартні <select>, щоб вони однаково відкривалися в усіх браузерах */
(function () {
  const openLists = new Set();
  function closeAll(except) { openLists.forEach(c => { if (c !== except) c(); }); }

  function enhance(sel) {
    if (sel._cs) return;
    sel._cs = true;

    const wrap = document.createElement("div");
    wrap.className = "cs";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("cs-native");
    sel.tabIndex = -1;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    const list = document.createElement("ul");
    list.className = "cs-list";
    list.setAttribute("role", "listbox");
    wrap.appendChild(btn);
    wrap.appendChild(list);

    let isOpen = false;

    function sync() {
      const o = sel.options[sel.selectedIndex];
      btn.textContent = o ? o.text : "";
      list.querySelectorAll("li").forEach((li, i) => li.classList.toggle("sel", i === sel.selectedIndex));
    }
    function build() {
      list.innerHTML = "";
      Array.from(sel.options).forEach((o, i) => {
        const li = document.createElement("li");
        li.textContent = o.text;
        li.setAttribute("role", "option");
        li.addEventListener("mousedown", e => e.preventDefault());
        li.addEventListener("click", () => {
          sel.selectedIndex = i;
          sync();
          close();
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        });
        list.appendChild(li);
      });
      sync();
    }
    function position() {
      const r = btn.getBoundingClientRect();
      const below = innerHeight - r.bottom;
      const h = Math.min(list.scrollHeight, 280);
      list.style.left = r.left + "px";
      list.style.width = r.width + "px";
      if (below < h + 10 && r.top > below) { list.style.top = "auto"; list.style.bottom = (innerHeight - r.top + 2) + "px"; }
      else { list.style.bottom = "auto"; list.style.top = (r.bottom + 2) + "px"; }
    }
    function open() {
      closeAll(close);
      isOpen = true; wrap.classList.add("open"); position(); openLists.add(close);
      const s = list.querySelector(".sel"); if (s) s.scrollIntoView({ block: "nearest" });
    }
    function close() { isOpen = false; wrap.classList.remove("open"); openLists.delete(close); }

    btn.addEventListener("click", () => (isOpen ? close() : open()));
    btn.addEventListener("keydown", e => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = sel.selectedIndex + (e.key === "ArrowDown" ? 1 : -1);
        if (n >= 0 && n < sel.options.length) { sel.selectedIndex = n; sync(); sel.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    });
    document.addEventListener("click", e => { if (isOpen && !wrap.contains(e.target)) close(); });
    addEventListener("resize", () => isOpen && close());
    document.addEventListener("scroll", e => { if (isOpen && !list.contains(e.target)) close(); }, true);

    /* значення, змінене з коду (sel.value = ...), одразу видно на кнопці */
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); }, configurable: true });

    /* список варіантів перебудовується, якщо <option> змінилися */
    new MutationObserver(build).observe(sel, { childList: true, subtree: true });
    build();
  }

  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("select").forEach(enhance));
})();
