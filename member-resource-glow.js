(function () {
  const section = document.querySelector("[data-aix-glow-section]");

  if (!section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cardsSelector = ".aix-resource-stack article, .resource-card";
  const proximity = 64;
  const inactiveZone = 0.01;
  let cards = [];
  let pointerFrame = 0;
  let latestPointer = null;

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

  function setCardActive(card, isActive) {
    card.style.setProperty("--aix-glow-active", isActive ? "1" : "0");
    card.classList.toggle("is-aix-glow-active", isActive);
  }

  function updateCardGlow(card, clientX, clientY) {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const angle = (180 * Math.atan2(clientY - centerY, clientX - centerX)) / Math.PI + 90;
    const outsideX = clientX < rect.left
      ? rect.left - clientX
      : clientX > rect.right
        ? clientX - rect.right
        : 0;
    const outsideY = clientY < rect.top
      ? rect.top - clientY
      : clientY > rect.bottom
        ? clientY - rect.bottom
        : 0;
    const distanceToCard = Math.hypot(outsideX, outsideY);
    const normalizedCenterDistance = Math.hypot(
      (clientX - centerX) / Math.max(rect.width * 0.5, 1),
      (clientY - centerY) / Math.max(rect.height * 0.5, 1)
    );
    const hasFocus = card.dataset.aixGlowFocus === "true";
    const isActive = hasFocus || (
      distanceToCard <= proximity &&
      normalizedCenterDistance > inactiveZone
    );

    card.style.setProperty("--aix-glow-start", String(angle));
    setCardActive(card, isActive);
  }

  function syncPointer() {
    pointerFrame = 0;
    if (!latestPointer) return;
    cards.forEach((card) => {
      updateCardGlow(card, latestPointer.clientX, latestPointer.clientY);
    });
  }

  function requestPointerSync(event) {
    latestPointer = {
      clientX: event.clientX,
      clientY: event.clientY
    };
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(syncPointer);
  }

  function deactivateCards() {
    latestPointer = null;
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    cards.forEach((card) => {
      if (card.dataset.aixGlowFocus !== "true") setCardActive(card, false);
    });
  }

  function prepareCard(card, index) {
    if (card.dataset.aixGlowReady === "true") return;

    card.dataset.aixGlowReady = "true";
    card.dataset.aixGlowProximity = String(proximity);
    card.dataset.aixGlowInactiveZone = String(inactiveZone);
    card.classList.add("aix-glowing-card");
    card.style.setProperty("--aix-glow-start", String((index * 58) % 360));
    card.style.setProperty("--aix-glow-active", "0");
    ensureLayer(card);

    card.addEventListener("focusin", () => {
      card.dataset.aixGlowFocus = "true";
      setCardActive(card, true);
    });

    card.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      card.dataset.aixGlowFocus = "false";
      if (latestPointer && !reduceMotion) {
        updateCardGlow(card, latestPointer.clientX, latestPointer.clientY);
      } else {
        setCardActive(card, false);
      }
    });
  }

  function decorateCards() {
    cards = [...section.querySelectorAll(cardsSelector)];
    cards.forEach(prepareCard);
    if (latestPointer && !reduceMotion) syncPointer();
  }

  decorateCards();

  if (!reduceMotion) {
    window.addEventListener("pointermove", requestPointerSync, { passive: true });
    window.addEventListener("blur", deactivateCards);
    document.documentElement.addEventListener("pointerleave", deactivateCards);
  }

  const observer = new MutationObserver(decorateCards);
  observer.observe(section, { childList: true, subtree: true });
})();
