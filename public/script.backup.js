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

  // Handle clicks on view-switching links
  const viewLinks = document.querySelectorAll("[data-view]");
  viewLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;

      if (view === "menu") {
        body.classList.remove("view-home");
        body.classList.add("view-menu");
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (!menuLoaded.current) {
          loadMenu();
          menuLoaded.current = true;
        }
      } else if (view === "home") {
        body.classList.remove("view-menu");
        body.classList.add("view-home");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Close mobile nav if open
      const navLinks = document.querySelector(".nav-links");
      if (navLinks) navLinks.classList.remove("open");
    });
  });

  // Handle in-page section scrolling (About, Signature, Location)
  const sectionLinks = document.querySelectorAll("[data-section]");
  sectionLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sectionId = link.dataset.section;
      const target = document.getElementById(sectionId);
      if (target) {
        // Make sure we're on home view
        body.classList.remove("view-menu");
        body.classList.add("view-home");

        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }

      // Close mobile nav if open
      const navLinks = document.querySelector(".nav-links");
      if (navLinks) navLinks.classList.remove("open");
    });
  });

  // Brand click → home
  const brandLink = document.getElementById("nav-brand");
  if (brandLink) {
    brandLink.addEventListener("click", (e) => {
      e.preventDefault();
      body.classList.remove("view-menu");
      body.classList.add("view-home");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
});

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
