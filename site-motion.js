(() => {
  const cardSelector = [
    ".answer-list article",
    ".path-card",
    ".course-card",
    ".resource-card",
    ".testimonial-grid article",
    ".business-case-card",
    ".final-cta",
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
    ".live-class-main",
    ".live-class-side",
    ".live-note-card",
    ".live-support-card",
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

  const revealSelector = [
    ".section-head",
    ".catalog-toolbar",
    ".learning-preview .lesson-sidebar",
    ".learning-preview .lesson-window",
    ".code-card",
    ".progress-card",
    ".final-cta-copy",
    ".footer-brand",
  ].join(", ");

  const seenCards = new WeakSet();
  const seenReveals = new WeakSet();
  const seenAccents = new WeakSet();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealObserver;
  let accentObserver;

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
      card.style.setProperty("--accent-progress", "0");
      card.style.setProperty("--accent-opacity", "0");
      card.querySelectorAll(":scope > .gsap-card-glow").forEach((glow) => glow.remove());
      return true;
    });

    observeAccentElements(cards);

    if (!cards.length || reduceMotion || !window.gsap) return;

    gsap.from(cards, {
      autoAlpha: 0,
      y: 8,
      scale: 0.996,
      duration: 0.36,
      ease: "power2.out",
      stagger: { each: 0.028, from: "start" },
      clearProps: "opacity,visibility,transform",
    });
  };

  const flashAccent = (element) => {
    if (reduceMotion || !window.gsap) return;

    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(element, {
        "--accent-progress": 1,
        "--accent-opacity": 0.85,
        duration: 0.24,
        ease: "power2.out",
      })
      .to(element, {
        "--accent-progress": 0,
        "--accent-opacity": 0,
        duration: 0.42,
        ease: "power2.inOut",
      }, "+=0.22");
  };

  const getRevealElements = (root = document) => {
    const elements = [];
    if (root instanceof Element && root.matches(revealSelector)) {
      elements.push(root);
    }
    if (root.querySelectorAll) {
      elements.push(...root.querySelectorAll(revealSelector));
    }
    return elements;
  };

  const ensureRevealObserver = () => {
    if (revealObserver || reduceMotion || !window.gsap || !("IntersectionObserver" in window)) {
      return revealObserver;
    }

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        gsap.from(entry.target, {
          autoAlpha: 0,
          y: 12,
          duration: 0.38,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
        });
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });

    return revealObserver;
  };

  const observeRevealElements = (root = document) => {
    const observer = ensureRevealObserver();
    if (!observer) return;

    getRevealElements(root).forEach((element) => {
      if (seenReveals.has(element)) return;
      seenReveals.add(element);
      observer.observe(element);
    });
  };

  const ensureAccentObserver = () => {
    if (accentObserver || reduceMotion || !window.gsap || !("IntersectionObserver" in window)) {
      return accentObserver;
    }

    accentObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        accentObserver.unobserve(entry.target);
        flashAccent(entry.target);
      });
    }, { threshold: 0.28, rootMargin: "0px 0px -12% 0px" });

    return accentObserver;
  };

  const observeAccentElements = (elements = []) => {
    const observer = ensureAccentObserver();
    if (!observer) return;

    elements.forEach((element) => {
      if (!(element instanceof Element) || seenAccents.has(element)) return;
      seenAccents.add(element);
      observer.observe(element);
    });
  };

  const startAmbientDecor = () => {
    if (reduceMotion || !window.gsap) return;
    document.documentElement.dataset.decorMotion = "on";

    const previewBits = [
      ".floating-chip",
      ".window-dots span",
      ".lesson-sidebar span",
      ".code-card code",
      ".progress-card",
    ].flatMap((selector) => Array.from(document.querySelectorAll(selector)));

    if (previewBits.length) {
      gsap.from(previewBits, {
        autoAlpha: 0,
        y: 7,
        duration: 0.3,
        ease: "power2.out",
        stagger: { each: 0.025, from: "start" },
        delay: 0.12,
        clearProps: "opacity,visibility,transform",
      });
    }

    const floatingChips = Array.from(document.querySelectorAll(".floating-chip"));
    if (floatingChips.length) {
      gsap.to(floatingChips, {
        y: -5,
        rotation: (index) => index % 2 === 0 ? 2 : -2,
        duration: 2.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.22, from: "center" },
      });
    }

    const progressBars = Array.from(document.querySelectorAll(".progress-card i"));
    if (progressBars.length) {
      gsap.set(progressBars, { transformOrigin: "left center" });
      gsap.to(progressBars, {
        scaleX: 1.16,
        duration: 1.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }

    const trustIcons = Array.from(document.querySelectorAll(".trust-grid article > i"));
    if (trustIcons.length) {
      gsap.to(trustIcons, {
        y: -2,
        scale: 1.06,
        duration: 2.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.18, from: "start" },
      });
    }

    const trustGrids = Array.from(document.querySelectorAll(".trust-grid"));
    if (trustGrids.length) {
      gsap.set(trustGrids, { "--trust-flow": -44, "--trust-veil": 0.36 });
      gsap.to(trustGrids, {
        "--trust-flow": 172,
        "--trust-veil": 0.54,
        duration: 5.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }
  };

  const getCard = (event) => {
    if (!(event.target instanceof Element)) return null;
    return event.target.closest(cardSelector);
  };

  const animateCardIn = (card) => {
    card.classList.add("card-accent-active");
    if (reduceMotion || !window.gsap) return;

    gsap.to(card, {
      "--accent-progress": 1,
      "--accent-opacity": 1,
      y: -2,
      scale: 1.003,
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });

    const icon = Array.from(card.querySelectorAll(iconSelector)).find((element) => !element.classList.contains("gsap-card-glow"));
    if (icon) {
      gsap.to(icon, {
        y: -1,
        scale: 1.02,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  };

  const animateCardOut = (card) => {
    card.classList.remove("card-accent-active");
    if (reduceMotion || !window.gsap) return;

    gsap.to(card, {
      "--accent-progress": 0,
      "--accent-opacity": 0,
      y: 0,
      scale: 1,
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
      clearProps: "transform",
    });

    const icon = Array.from(card.querySelectorAll(iconSelector)).find((element) => !element.classList.contains("gsap-card-glow"));
    if (icon) {
      gsap.to(icon, {
        y: 0,
        scale: 1,
        duration: 0.18,
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
    document.documentElement.dataset.gsapMotion = window.gsap ? "on" : "fallback";

    if (!reduceMotion && window.gsap) {
      const heroItems = [
        ".hero-pill",
        ".hero h1",
        ".hero-lead",
        ".hero-rating",
        ".hero-actions",
        ".hero-join",
        ".learning-preview",
        ".trust-grid article",
      ].flatMap((selector) => Array.from(document.querySelectorAll(selector)));

      if (heroItems.length) {
        gsap.from(heroItems, {
          autoAlpha: 0,
          y: 10,
          duration: 0.42,
          ease: "power3.out",
          stagger: { each: 0.036, from: "start" },
          clearProps: "opacity,visibility,transform",
        });
      }
    }

    startAmbientDecor();
    observeRevealElements();
    prepareCards();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            observeRevealElements(node);
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
