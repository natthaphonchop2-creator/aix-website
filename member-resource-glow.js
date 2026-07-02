(function () {
  const section = document.querySelector("[data-aix-glow-section]");

  if (!section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cardsSelector = ".aix-resource-stack article, .resource-card";

  function ensureLayer(card) {
    if (card.querySelector(":scope > .aix-glowing-effect")) return;

    const layer = document.createElement("div");
    layer.className = "aix-glowing-effect";
    layer.setAttribute("aria-hidden", "true");

    const glow = document.createElement("div");
    glow.className = "aix-glow";
    layer.append(glow);
    card.prepend(layer);
  }

  function updateCardGlow(card, clientX, clientY) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const angle = (180 * Math.atan2(clientY - centerY, clientX - centerX)) / Math.PI + 90;

    card.style.setProperty("--aix-glow-start", String(angle));
    card.style.setProperty("--aix-glow-active", "1");
    card.classList.add("is-aix-glow-active");
  }

  function prepareCard(card, index) {
    if (card.dataset.aixGlowReady === "true") return;

    card.dataset.aixGlowReady = "true";
    card.classList.add("aix-glowing-card");
    card.style.setProperty("--aix-glow-start", String((index * 58) % 360));
    card.style.setProperty("--aix-glow-active", "0");
    ensureLayer(card);

    if (reduceMotion) return;

    let frame = 0;

    card.addEventListener("pointermove", (event) => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateCardGlow(card, event.clientX, event.clientY);
      });
    });

    card.addEventListener("pointerenter", (event) => {
      updateCardGlow(card, event.clientX, event.clientY);
    });

    card.addEventListener("pointerleave", () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      card.style.setProperty("--aix-glow-active", "0");
      card.classList.remove("is-aix-glow-active");
    });

    card.addEventListener("focusin", () => {
      card.style.setProperty("--aix-glow-active", "1");
      card.classList.add("is-aix-glow-active");
    });

    card.addEventListener("focusout", () => {
      card.style.setProperty("--aix-glow-active", "0");
      card.classList.remove("is-aix-glow-active");
    });
  }

  function decorateCards() {
    section.querySelectorAll(cardsSelector).forEach(prepareCard);
  }

  decorateCards();

  const observer = new MutationObserver(decorateCards);
  observer.observe(section, { childList: true, subtree: true });
})();
