import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const html = await readFile(join(root, "index.html"), "utf8");
const css = await readFile(join(root, "homepage-component-fidelity.css"), "utf8");
const colorTheme = await readFile(join(root, "homepage-color-theme.css"), "utf8");
const script = await readFile(join(root, "script.js"), "utf8");
const glowScript = await readFile(join(root, "member-resource-glow.js"), "utf8");

test("homepage loads the component fidelity layer and fresh runtimes", () => {
  assert.match(html, /homepage-component-fidelity\.css\?v=aix-component-fidelity-v1-20260725/);
  assert.match(html, /script\.js\?v=aix-homepage-copy-v73-20260725/);
  assert.match(html, /member-resource-glow\.js\?v=aix-member-glow-v2-20260725/);
});

test("hero title stays typographic without a decorative backing panel", () => {
  assert.match(html, /homepage-color-theme\.css\?v=aix-home-color-theme-v2-20260725/);
  assert.match(colorTheme, /\.aix-stack-hero \.aix-hero-title::before\s*\{[\s\S]*?content:\s*none;/);
});

test("stack hero counter-rotates logos and respects reduced motion", () => {
  assert.match(css, /\.aix-orbit-node\s*\{[\s\S]*?animation:\s*aixOrbitCounterSpin/);
  assert.match(css, /@keyframes aixOrbitCounterSpin/);
  assert.match(css, /\.aix-stack-orbit-stage:hover \.aix-orbit-ring,[\s\S]*?animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.aix-orbit-ring,[\s\S]*?\.aix-orbit-node,[\s\S]*?animation:\s*none/);
});

test("navigation, highlight, animated hero, and bento use real runtime states", () => {
  assert.match(script, /function initHoverGradientNav\(\)/);
  assert.match(script, /item\.style\.setProperty\("--nav-pointer-x"/);
  assert.match(script, /item\.classList\.toggle\("is-nav-current"/);
  assert.match(script, /function initBentoGrid\(\)/);
  assert.match(script, /card\.style\.setProperty\("--bento-x"/);
  assert.match(script, /section\?\.setAttribute\("data-animated-hero-ready",\s*"true"\)/);
  assert.match(script, /section\?\.setAttribute\("data-animated-running",\s*"true"\)/);
  assert.match(script, /revealComponentOnce\(highlight,\s*"is-highlight-in-view"/);
  assert.match(css, /\.aix-hero-highlight\.is-highlight-in-view \.aix-highlight-mark/);
  assert.match(css, /\.aix-animated-hero\.is-entered :where/);
  assert.match(css, /\.aix-bento-grid\.is-bento-in-view \.aix-bento-card/);
});

test("glowing cards use source-like proximity instead of card-only pointer enter", () => {
  assert.match(glowScript, /const proximity = 64;/);
  assert.match(glowScript, /const inactiveZone = 0\.01;/);
  assert.match(glowScript, /distanceToCard <= proximity/);
  assert.match(glowScript, /window\.addEventListener\("pointermove",\s*requestPointerSync/);
  assert.doesNotMatch(glowScript, /card\.addEventListener\("pointerenter"/);
});

test("pricing rotation pauses offscreen or during reading and cross-slides quotes", () => {
  assert.match(script, /card\.setAttribute\("data-pricing-running",\s*"true"\)/);
  assert.match(script, /rotationTimer = window\.setInterval/);
  assert.match(script, /\},\s*5000\);/);
  assert.match(script, /card\.addEventListener\("pointerenter"[\s\S]*?stopRotation\(\)/);
  assert.match(script, /card\.addEventListener\("focusin"[\s\S]*?stopRotation\(\)/);
  assert.match(css, /\.aix-pricing-testimonials\s*\{[\s\S]*?grid-template-areas:/);
  assert.match(css, /\.aix-pricing-quote\.is-exiting/);
});

test("image comparison supports hover on desktop and preserves vertical touch scroll", () => {
  assert.match(script, /if \(!isDragging && event\.pointerType !== "mouse"\) return;/);
  assert.match(script, /if \(event\.pointerType !== "touch"\) event\.preventDefault\(\);/);
  assert.match(script, /handle\.setAttribute\("aria-valuetext"/);
  assert.match(css, /\.aix-workproof-stage,[\s\S]*?\.aix-workproof-handle\s*\{[\s\S]*?touch-action:\s*pan-y;/);
});

test("FAQ exposes open and closed runtime state with component-scoped entrance", () => {
  assert.match(script, /accordion\.setAttribute\("data-faq-runtime-ready",\s*"true"\)/);
  assert.match(script, /item\.dataset\.state = shouldOpen \? "open" : "closed"/);
  assert.match(script, /revealComponentOnce\(accordion,\s*"is-faq-in-view"/);
  assert.match(css, /\.aix-faq-list\.is-faq-in-view \.aix-faq-item/);
  assert.match(css, /\.aix-faq-trigger:focus-visible\s*\{[\s\S]*?outline-offset:\s*-4px;/);
  assert.match(css, /\.aix-faq-answer\[aria-hidden="true"\] > p\s*\{[\s\S]*?padding-block-end:\s*0;/);
});
