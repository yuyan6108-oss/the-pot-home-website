// === Scroll-aware Navigation ===
document.addEventListener("DOMContentLoaded", () => {
  fetchSiteInfo();
  fetchSiteData();
  fetchNav();
  const nav = document.getElementById("top-nav");
  if (!nav) return;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        nav.classList.toggle("scrolled", window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
});

// === Language Toggle ===
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const langBtns = document.querySelectorAll(".lang-btn");

  langBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang === "zh") {
        body.classList.remove("lang-en");
        body.classList.add("lang-zh");
      } else {
        body.classList.remove("lang-zh");
        body.classList.add("lang-en");
      }

      langBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
});

// === View Switching (Home / Menu) ===
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const menuLoaded = { current: false };
  let viewSwitching = false;

  function switchToView(hash) {
    const h = (hash || "").replace("#", "");
    if (h === "menu") {
      body.classList.remove("view-home");
      body.classList.add("view-menu");
      if (!menuLoaded.current) {
        loadMenu();
        menuLoaded.current = true;
      }
      window.scrollTo(0, 0);
    } else if (h === "reviews") {
      body.classList.remove("view-menu");
      body.classList.add("view-home");
      const target = document.getElementById("reviews");
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 50);
    } else if (h === "info") {
      body.classList.remove("view-menu");
      body.classList.add("view-home");
      const target = document.getElementById("info");
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 50);
    } else {
      body.classList.remove("view-menu");
      body.classList.add("view-home");
      window.scrollTo(0, 0);
    }
  }

  function closeMobileNav() {
    const navLinks = document.querySelector(".nav-links");
    if (navLinks) navLinks.classList.remove("open");
  }

  // Handle clicks on view-switching links
  const viewLinks = document.querySelectorAll("[data-view]");
  viewLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      viewSwitching = true;
      window.location.hash = view;
      switchToView(view);
      viewSwitching = false;
      closeMobileNav();
    });
  });

  // Handle in-page section scrolling
  const sectionLinks = document.querySelectorAll("[data-section]");
  sectionLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sectionId = link.dataset.section;
      viewSwitching = true;
      window.location.hash = sectionId;
      switchToView(sectionId);
      viewSwitching = false;
      closeMobileNav();
    });
  });

  // Brand click → home
  const brandLink = document.getElementById("nav-brand");
  if (brandLink) {
    brandLink.addEventListener("click", (e) => {
      e.preventDefault();
      viewSwitching = true;
      window.location.hash = "home";
      switchToView("home");
      viewSwitching = false;
    });
  }

  // Mobile nav toggle
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  // Handle hashchange (browser back/forward)
  window.addEventListener("hashchange", () => {
    if (!viewSwitching) {
      switchToView(window.location.hash);
    }
  });

  // Handle hash on initial page load
  switchToView(window.location.hash);
});

// === Gallery & Modal ===
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("gallery-grid");
  const modal = document.getElementById("gallery-modal");
  const imgEl = document.getElementById("gallery-modal-image");
  const player = document.getElementById("gallery-modal-player");
  const closeBtn = modal?.querySelector(".gallery-modal-close");
  const backdrop = modal?.querySelector(".gallery-modal-backdrop");

  if (!grid) return;

  // Fetch and render gallery items
  fetch("/api/gallery")
    .then((res) => res.json())
    .then((items) => renderGallery(items))
    .catch(() => {
      grid.innerHTML = '<p class="gallery-loading">Failed to load gallery.</p>';
    });

  function renderGallery(items) {
    grid.innerHTML = "";

    if (!items || items.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          <div class="gallery-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <p class="gallery-empty-text">
            <span class="zh-only">暂无影像</span>
            <span class="en-only">No gallery items yet</span>
          </p>
        </div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "gallery-item";

      if (item.type === "video") {
        card.classList.add("is-video");
        card.innerHTML = `
          <video src="${item.url}" muted playsinline preload="metadata"></video>
          <div class="gallery-item-overlay">
            <div class="gallery-item-play-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="8 5 19 12 8 19 8 5"/></svg>
            </div>
            <div class="gallery-item-play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span class="zh-only">观看视频</span>
              <span class="en-only">Watch Video</span>
            </div>
            <span class="gallery-item-title">${escapeHtml(item.title)}</span>
          </div>`;
        card.addEventListener("click", () => openModal(item));
      } else {
        card.innerHTML = `
          <img src="${item.url}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <div class="gallery-item-overlay">
            <div class="gallery-item-play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l1 2h3l1-2h-4zM8 3l1 2h3l1-2H8zM5 5h14v16H5V5z" fill="none" stroke="white" stroke-width="1.5"/><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="white" stroke-width="1.5"/><polygon points="9 8 15 12 9 16" fill="white" stroke="none"/></svg>
              <span class="zh-only">查看</span>
              <span class="en-only">View</span>
            </div>
            <span class="gallery-item-title">${escapeHtml(item.title)}</span>
          </div>`;
        card.addEventListener("click", () => openModal(item));
      }

      grid.appendChild(card);
    });
  }

  // Modal functions
  function openModal(item) {
    if (!modal) return;
    if (item.type === "video") {
      imgEl.style.display = "none";
      player.src = item.url;
      player.style.display = "block";
      player.play().catch(() => {});
    } else {
      player.style.display = "none";
      player.pause();
      player.src = "";
      imgEl.src = item.url;
      imgEl.alt = item.title;
      imgEl.style.display = "block";
    }
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
    player.pause();
    player.src = "";
    imgEl.src = "";
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeModal();
    }
  });
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// === Dynamic Site Info ===
function fetchSiteInfo() {
  fetch("/api/site-info")
    .then((res) => res.json())
    .then((data) => {
      // About intro
      const aboutEl = document.querySelector('[data-site-info="about_cn"]');
      if (aboutEl && data.about_cn) aboutEl.textContent = data.about_cn;

      // Address
      const addrEl = document.querySelector('[data-site-info="address"]');
      if (addrEl && data.address) {
        addrEl.innerHTML = data.address.replace(/,\s*/, ",<br>");
      }

      // Phone
      const phoneEl = document.querySelector('[data-site-info="phone"]');
      if (phoneEl && data.phone) {
        phoneEl.textContent = data.phone;
        const digits = data.phone.replace(/\D/g, "");
        if (digits.length) phoneEl.href = "tel:+1" + digits;
      }

      // Social links
      const xhsEl = document.querySelector('[data-site-info="xiaohongshu_url"]');
      if (xhsEl && data.xiaohongshu_url) xhsEl.href = data.xiaohongshu_url;
      else if (xhsEl) xhsEl.style.display = "none";

      const igEl = document.querySelector('[data-site-info="instagram_url"]');
      if (igEl && data.instagram_url) igEl.href = data.instagram_url;
      else if (igEl) igEl.style.display = "none";

      // Hours
      const hoursGrid = document.querySelector('[data-site-info="hours"]');
      if (hoursGrid && data.hours) {
        const days = [
          ["Monday", data.hours.monday],
          ["Tuesday", data.hours.tuesday],
          ["Wednesday", data.hours.wednesday],
          ["Thursday", data.hours.thursday],
          ["Friday", data.hours.friday],
          ["Saturday", data.hours.saturday],
          ["Sunday", data.hours.sunday]
        ].filter(([, t]) => t);
        hoursGrid.innerHTML = days
          .map(([day, time]) => `<div class="hours-row"><span class="hours-day">${day}</span><span class="hours-time">${time}</span></div>`)
          .join("");
      }

      // Google Map
      const mapEl = document.querySelector('[data-site-info="google_map_url"]');
      if (mapEl && data.google_map_url) {
        mapEl.src = data.google_map_url + "&output=embed";
      }
    })
    .catch(() => {
      // Keep HTML defaults if fetch fails
    });
}

// === Dynamic Home Content ===
function fetchSiteData() {
  fetch("/api/site")
    .then((res) => res.json())
    .then((data) => {
      // Helper: resolve nested path like "hero.titleCn" or "about.highlights[0].titleCn"
      function resolve(obj, path) {
        return path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((cur, key) => cur && cur[key], obj);
      }

      document.querySelectorAll('[data-site]').forEach((el) => {
        const val = resolve(data, el.dataset.site);
        if (val && typeof val === "string") {
          el.textContent = val;
        }
      });
    })
    .catch(() => {
      // Keep HTML defaults if fetch fails
    });
}

// === Dynamic Nav Text ===
function fetchNav() {
  fetch("/api/site-content")
    .then((res) => res.json())
    .then((data) => {
      const nav = data.nav || {};
      document.querySelectorAll('[data-nav]').forEach((el) => {
        const keys = el.dataset.nav.split(".");
        const val = keys.reduce((cur, key) => cur && cur[key], nav);
        if (val && typeof val === "string") {
          el.textContent = val;
        }
      });
    })
    .catch(() => {
      // Keep HTML defaults if fetch fails
    });
}

// === Menu Rendering ===
async function loadMenu() {
  const container = document.getElementById("menu-content");
  const navEl = document.getElementById("category-nav");

  if (!container) return;

  try {
    const res = await fetch("/api/menu");
    const categories = await res.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      container.innerHTML =
        '<p class="menu-loading">Menu is not available at the moment.</p>';
      return;
    }

    // Build category navigation
    const hasItems = categories.filter((c) => c.items && c.items.length > 0);
    if (hasItems.length > 1) {
      navEl.innerHTML = `
        <ul class="nav-list">
          ${hasItems
            .map(
              (cat, i) => `
            <li><a class="nav-link" href="#cat-${i}">${cat.category_cn || cat.category}</a></li>
          `
            )
            .join("")}
        </ul>`;
    }

    // Helper: detect add-on / toppings category
    function isAddonCategory(cat) {
      const c = (cat.category || "").toLowerCase();
      const cn = cat.category_cn || "";
      return c.includes("add-on") || c.includes("topping") ||
             cn.includes("配菜") || cn.includes("可单加");
    }

    // Helper: group addon items by price
    function renderAddonCategory(cat) {
      const priceMap = {};
      const noPrice = [];
      cat.items.forEach((item) => {
        const p = item.price || "";
        if (p && p !== "TODO") {
          if (!priceMap[p]) priceMap[p] = [];
          priceMap[p].push(item);
        } else {
          noPrice.push(item);
        }
      });

      // Sort price groups ascending
      const sorted = Object.keys(priceMap).sort((a, b) => {
        return parseFloat(a.replace(/[^0-9.]/g, "")) -
               parseFloat(b.replace(/[^0-9.]/g, ""));
      });

      let itemsHtml = "";

      // Price-grouped items
      sorted.forEach((price) => {
        const itemCells = priceMap[price]
          .map(
            (item) =>
              `<span class="addon-item-name">
                <span class="addon-cn">${escapeHtml(item.name_cn || "")}</span>
                <span class="addon-en">${escapeHtml(item.name || "")}</span>
              </span>`
          )
          .join("");

        itemsHtml += `
          <div class="addon-price-group">
            <div class="addon-items-wrap">${itemCells}</div>
            <span class="addon-price-block">${price}</span>
          </div>`;
      });

      // Items without a fixed price
      if (noPrice.length > 0) {
        const itemCells = noPrice
          .map(
            (item) =>
              `<span class="addon-item-name">
                <span class="addon-cn">${escapeHtml(item.name_cn || "")}</span>
                <span class="addon-en">${escapeHtml(item.name || "")}</span>
              </span>`
          )
          .join("");

        itemsHtml += `
          <div class="addon-price-group">
            <div class="addon-items-wrap">${itemCells}</div>
            <span class="addon-price-block">
              <span class="price-todo">Ask Server</span>
            </span>
          </div>`;
      }

      return itemsHtml;
    }

    // Build menu content
    container.innerHTML = categories
      .map((cat, idx) => {
        if (!cat.items || cat.items.length === 0) {
          return `
            <div class="menu-category" id="cat-${idx}">
              <h3 class="menu-category-title">
                <span class="cat-cn">${cat.category_cn || ""}</span>
                <span class="cat-en">${cat.category || ""}</span>
              </h3>
              <p class="menu-loading" style="padding: 16px 0;">Coming soon</p>
            </div>`;
        }

        if (isAddonCategory(cat)) {
          const label = cat.category_cn.includes("可单加") ? "Toppings" : "Add-ons";
          return `
            <div class="menu-category" id="cat-${idx}">
              <div class="addon-category-header">
                <span class="addon-label">${label}</span>
                <h3 class="menu-category-title" style="border-bottom:none;margin:0;padding:0;">
                  <span class="cat-cn">${cat.category_cn || ""}</span>
                  <span class="cat-en">${cat.category || ""}</span>
                </h3>
              </div>
              <div class="addon-layout">
                ${renderAddonCategory(cat)}
              </div>
            </div>`;
        }

        const items = cat.items
          .map(
            (item) => `
            <div class="menu-item">
              <div class="menu-item-info">
                <div class="menu-item-top">
                  <span class="menu-item-name">${item.name}</span>
                  ${item.name_cn ? `<span class="menu-item-cn">${item.name_cn}</span>` : ""}
                </div>
                ${item.description ? `<div class="menu-item-desc">${item.description}</div>` : ""}
              </div>
              <span class="menu-item-price">
                ${item.price === "TODO" ? '<span class="price-todo">Ask Server</span>' : item.price}
              </span>
            </div>`
          )
          .join("");

        return `
          <div class="menu-category" id="cat-${idx}">
            <h3 class="menu-category-title">
              <span class="cat-cn">${cat.category_cn || ""}</span>
              <span class="cat-en">${cat.category || ""}</span>
            </h3>
            ${items}
          </div>`;
      })
      .join("");
  } catch (err) {
    console.error("Failed to load menu:", err);
    container.innerHTML =
      '<p class="menu-loading">Failed to load menu. Please try again later.</p>';
  }
}
