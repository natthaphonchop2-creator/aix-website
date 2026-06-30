(() => {
  const isHomePage = /^\/(?:index\.html)?$/.test(window.location.pathname);
  const sectionHref = (id) => (isHomePage ? `#${id}` : `/index.html#${id}`);
  const meteorItems = [
    { left: "8%", top: "6%", delay: "0.15s", duration: "8s", travel: "-430px" },
    { left: "24%", top: "1%", delay: "0.55s", duration: "10s", travel: "-500px" },
    { left: "46%", top: "14%", delay: "1.1s", duration: "9s", travel: "-460px" },
    { left: "72%", top: "4%", delay: "1.8s", duration: "11s", travel: "-520px" },
    { left: "92%", top: "18%", delay: "2.35s", duration: "12s", travel: "-540px" },
    { left: "15%", top: "32%", delay: "2.9s", duration: "10s", travel: "-470px" },
    { left: "38%", top: "42%", delay: "3.4s", duration: "13s", travel: "-560px" },
    { left: "64%", top: "34%", delay: "4.05s", duration: "9s", travel: "-440px" },
    { left: "88%", top: "48%", delay: "4.65s", duration: "12s", travel: "-500px" },
    { left: "28%", top: "62%", delay: "5.1s", duration: "11s", travel: "-520px" },
    { left: "54%", top: "72%", delay: "5.75s", duration: "10s", travel: "-470px" },
    { left: "78%", top: "66%", delay: "6.2s", duration: "14s", travel: "-590px" },
    { left: "12%", top: "84%", delay: "6.75s", duration: "13s", travel: "-520px" },
    { left: "42%", top: "92%", delay: "7.25s", duration: "12s", travel: "-560px" },
    { left: "68%", top: "88%", delay: "7.8s", duration: "10s", travel: "-480px" },
    { left: "96%", top: "78%", delay: "8.35s", duration: "11s", travel: "-510px" }
  ];

  function ensureSiteMeteors() {
    if (document.querySelector(".aix-site-meteor-field")) return;

    const field = document.createElement("div");
    field.className = "aix-site-meteor-field";
    field.setAttribute("aria-hidden", "true");
    field.innerHTML = meteorItems.map((item) => (
      `<span style="--meteor-left: ${item.left}; --meteor-top: ${item.top}; --meteor-delay: ${item.delay}; --meteor-duration: ${item.duration}; --meteor-travel: ${item.travel};"></span>`
    )).join("");

    document.body.insertBefore(field, document.body.firstChild);
  }

  function ensureMobileLumaNav() {
    if (document.querySelector(".luma-mobile-nav")) return;

    const items = [
      { section: "home", href: sectionHref("home"), icon: "fa-house", label: "หน้าแรก" },
      { section: "catalog", href: sectionHref("catalog"), icon: "fa-magnifying-glass", label: "ค้นหา" },
      { section: "member-loop", href: sectionHref("member-loop"), icon: "fa-users", label: "สมาชิก" },
      { section: "learning-system", href: sectionHref("learning-system"), icon: "fa-route", label: "วิธีเรียน" },
      { section: "membership", href: sectionHref("membership"), icon: "fa-tags", label: "ราคา" },
      { section: "account", href: "/dashboard", icon: "fa-user", label: "เข้าสู่ระบบ" }
    ];

    const nav = document.createElement("nav");
    nav.className = "luma-mobile-nav";
    nav.setAttribute("aria-label", "เมนูมือถือ AiX");
    nav.innerHTML = `
      <div class="luma-mobile-shell">
        <span class="luma-mobile-glow" aria-hidden="true"></span>
        ${items.map((item, index) => `
          <a class="luma-mobile-item${index === 0 ? " is-active" : ""}" href="${item.href}" data-luma-index="${index}" data-luma-section="${item.section}" aria-label="${item.label}"${index === 0 ? ' aria-current="page"' : ""}>
            <i class="fa-solid ${item.icon}" aria-hidden="true"></i>
            <span class="luma-mobile-label">${item.label}</span>
          </a>
        `).join("")}
      </div>
    `;

    document.body.appendChild(nav);

    const shell = nav.querySelector(".luma-mobile-shell");
    const links = [...nav.querySelectorAll(".luma-mobile-item")];
    let lastScrollY = window.scrollY;
    let scrollFrame = null;

    const setNavHidden = (hidden) => {
      nav.classList.toggle("is-hidden", hidden);
      nav.setAttribute("aria-hidden", hidden ? "true" : "false");
      links.forEach((link) => {
        link.tabIndex = hidden ? -1 : 0;
      });
    };

    const setActive = (index) => {
      const activeLink = links[index] || links[0];
      links.forEach((link) => {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      });
      activeLink.classList.add("is-active");
      activeLink.setAttribute("aria-current", "page");

      const shellRect = shell.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();
      shell.style.setProperty("--luma-glow-left", `${activeRect.left - shellRect.left + activeRect.width / 2}px`);
    };

    const sectionFromLocation = () => {
      const path = window.location.pathname;
      if (/dashboard|auth|login/i.test(path)) return "account";
      if (/payment/i.test(path)) return "membership";
      return (window.location.hash || "#home").replace("#", "") || "home";
    };

    const syncActive = () => {
      const current = sectionFromLocation();
      const index = Math.max(0, links.findIndex((link) => link.dataset.lumaSection === current));
      setActive(index);
    };

    const syncVisibility = () => {
      scrollFrame = null;
      if (window.innerWidth >= 768) {
        setNavHidden(false);
        lastScrollY = window.scrollY;
        return;
      }

      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 24) {
        setNavHidden(false);
      } else if (delta > 8) {
        setNavHidden(true);
      } else if (delta < -8) {
        setNavHidden(false);
      }

      lastScrollY = currentScrollY;
    };

    const requestVisibilitySync = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(syncVisibility);
    };

    links.forEach((link, index) => {
      link.addEventListener("click", (event) => {
        setNavHidden(false);
        setActive(index);
        const href = link.getAttribute("href") || "";
        if (link.dataset.lumaSection === "account") {
          event.preventDefault();
          const loginButton = document.getElementById("loginBtn");
          if (loginButton) {
            loginButton.click();
            return;
          }
          const modalLoginButton = document.querySelector("[data-open-login]");
          if (modalLoginButton) {
            modalLoginButton.click();
            return;
          }
          window.location.href = href;
          return;
        }
        if (!isHomePage || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", href);
      });
    });

    window.addEventListener("hashchange", syncActive);
    window.addEventListener("resize", () => {
      syncActive();
      requestVisibilitySync();
    });
    window.addEventListener("scroll", requestVisibilitySync, { passive: true });
    window.requestAnimationFrame(syncActive);
    window.requestAnimationFrame(syncVisibility);
  }

  function themeToggleMarkup() {
    return `
      <span class="theme-toggle-track" aria-hidden="true">
        <span class="theme-toggle-idle theme-toggle-idle-moon"><i class="fa-regular fa-moon"></i></span>
        <span class="theme-toggle-idle theme-toggle-idle-sun"><i class="fa-regular fa-sun"></i></span>
        <span class="theme-toggle-thumb">
          <i class="theme-toggle-icon-sun fa-regular fa-sun"></i>
          <i class="theme-toggle-icon-moon fa-regular fa-moon"></i>
        </span>
      </span>
    `;
  }

  function syncThemeToggleButtons() {
    const isDark = document.documentElement.classList.contains("dark");
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด");
    });
  }

  function setSharedTheme(mode, persist = true) {
    const isDark = mode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#0a0a0a" : "#ffffff");
    document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", isDark ? "dark" : "light");
    syncThemeToggleButtons();

    if (!persist) return;
    try {
      localStorage.setItem("aix-theme", isDark ? "dark" : "light");
    } catch (error) {
      // Keep the current-page theme usable when storage is unavailable.
    }
  }

  function ensureSharedThemeToggle() {
    const existing = document.querySelector("[data-theme-toggle]");
    if (existing) {
      syncThemeToggleButtons();
      return;
    }

    const button = document.createElement("button");
    button.className = "theme-toggle aix-shared-theme-toggle";
    button.type = "button";
    button.dataset.themeToggle = "";
    button.innerHTML = themeToggleMarkup();
    button.addEventListener("click", () => {
      setSharedTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
    });
    syncThemeToggleButtons();

    const target = document.querySelector(".site-header:not(.aix-home-header) .nav-actions")
      || document.querySelector(".learn-topbar")
      || document.querySelector(".course-gate-header")
      || document.body;

    target.appendChild(button);
    syncThemeToggleButtons();
  }

  ensureSiteMeteors();
  ensureMobileLumaNav();
  ensureSharedThemeToggle();

  if (document.querySelector(".site-footer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <img class="footer-logo" src="/AiX%20logo/textblack.png" alt="AiX Club" width="232" height="92" loading="lazy" decoding="async">
        <p>สมาชิกเรียน AI ต่อเนื่องทั้งปี พร้อม Live, replay และ resource ที่กลับมาใช้กับงานจริงได้ทันที</p>
        <div class="footer-brand-note" aria-label="AiX learning system">
          <div>
            <strong>AiX Weekly</strong>
            <span>Live, replay, template</span>
          </div>
        </div>
      </div>
      <div>
        <strong>Platform</strong>
        <a href="${sectionHref("member-loop")}">สมาชิกได้อะไร</a>
        <a href="${sectionHref("learning-system")}">วิธีเรียน</a>
        <a href="${sectionHref("catalog")}">หัวข้อเรียน</a>
      </div>
      <div>
        <strong>สมาชิก</strong>
        <a href="${sectionHref("membership")}">สมัครสมาชิก</a>
        <a href="/dashboard">เข้าสู่ระบบ</a>
        <a href="/payment">ชำระเงิน</a>
      </div>
      <div>
        <strong>ติดต่อทีม</strong>
        <a href="tel:0987570796">098-757-0796</a>
        <a href="mailto:natthaphon.chop2@gmail.com">natthaphon.chop2@gmail.com</a>
      </div>
    </div>
  `;

  const anchor = document.querySelector(".toast") || document.body.querySelector("script");
  document.body.insertBefore(footer, anchor || null);
})();
