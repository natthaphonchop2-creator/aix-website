(() => {
  const cardSelector = [
    ".answer-list article",
    ".path-card",
    ".course-card",
    ".resource-card",
    ".membership-card",
    ".signup-card",
    ".auth-copy",
    ".auth-card",
    ".payment-summary",
    ".payment-panel",
    ".payment-result-card",
    ".dashboard-continue-card",
    ".member-overview-card",
    ".member-resource-card",
    ".payment-history-card",
    ".member-alert-card",
    ".member-schedule-card",
    ".tools-stat-card",
    ".tools-category-card",
    ".tools-topic-panel",
    ".tools-resource-row",
    ".classroom-panel",
    ".classroom-video-player",
    ".classroom-replay-card",
    ".learn-video-card",
    ".learn-reading-card",
    ".learn-ai-card",
    ".detail-info-grid article",
    ".syllabus-item",
    ".enroll-card",
    ".instructor-panel",
  ].join(", ");

  const iconSelector = [
    "i",
    ".brand-mark",
    ".payment-history-icon",
    ".result-icon",
    ".syllabus-number",
    ".member-overview-card span",
    ".member-resource-card span",
    ".tools-card-icon",
    ".tools-resource-icon",
  ].join(", ");

  const seenCards = new WeakSet();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getCards = (root = document) => {
    const cards = [];
    if (root instanceof Element && root.matches(cardSelector)) {
      cards.push(root);
    }
    if (root.querySelectorAll) {
      cards.push(...root.querySelectorAll(cardSelector));
    }
    return cards;
  };

  const prepareCards = (root = document) => {
    const cards = getCards(root).filter((card) => {
      if (seenCards.has(card)) return false;
      seenCards.add(card);
      card.classList.add("gsap-hover-card");
      return true;
    });

    if (!cards.length || reduceMotion || !window.gsap) return;

    gsap.from(cards, {
      autoAlpha: 0,
      y: 14,
      scale: 0.99,
      duration: 0.46,
      ease: "power2.out",
      stagger: { each: 0.035, from: "start" },
      clearProps: "opacity,visibility,transform",
    });
  };

  const getCard = (event) => {
    if (!(event.target instanceof Element)) return null;
    return event.target.closest(cardSelector);
  };

  const animateCardIn = (card) => {
    card.classList.add("card-accent-active");
    if (reduceMotion || !window.gsap) return;

    gsap.to(card, {
      y: -4,
      scale: 1.006,
      duration: 0.24,
      ease: "power2.out",
      overwrite: "auto",
    });

    const icon = card.querySelector(iconSelector);
    if (icon) {
      gsap.to(icon, {
        y: -2,
        scale: 1.04,
        duration: 0.24,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  };

  const animateCardOut = (card) => {
    card.classList.remove("card-accent-active");
    if (reduceMotion || !window.gsap) return;

    gsap.to(card, {
      y: 0,
      scale: 1,
      duration: 0.26,
      ease: "power2.out",
      overwrite: "auto",
      clearProps: "transform",
    });

    const icon = card.querySelector(iconSelector);
    if (icon) {
      gsap.to(icon, {
        y: 0,
        scale: 1,
        duration: 0.22,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "transform",
      });
    }
  };

  document.addEventListener("pointerover", (event) => {
    const card = getCard(event);
    const from = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!card || card.contains(from)) return;
    animateCardIn(card);
  });

  document.addEventListener("pointerout", (event) => {
    const card = getCard(event);
    const to = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!card || card.contains(to)) return;
    animateCardOut(card);
  });

  document.addEventListener("focusin", (event) => {
    const card = getCard(event);
    if (card) animateCardIn(card);
  });

  document.addEventListener("focusout", (event) => {
    const card = getCard(event);
    const to = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (card && !card.contains(to)) animateCardOut(card);
  });

  const start = () => {
    prepareCards();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            prepareCards(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
