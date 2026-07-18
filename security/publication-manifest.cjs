const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_ROOT_FILES = new Set([
  "index.html",
  "class-detail.html",
  "styles.css",
  "aix-api-client.js",
  "script.js",
  "class-detail.js",
  "site-footer.js",
  "member-resource-glow.css",
  "member-resource-glow.js",
  "google-auth-fix.css",
  "reviews-color-polish.css",
  "robots.txt",
  "sitemap.xml"
]);

const PUBLIC_ASSET_DIRECTORIES = new Set(["assets", "AiX logo", "ai logo"]);
const SAFE_ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".woff", ".woff2", ".avif"
]);

function decodePathname(pathname) {
  try {
    const decoded = decodeURIComponent(String(pathname || "/"));
    if (decoded.includes("\0") || decoded.includes("\\")) return null;
    return decoded;
  } catch {
    return null;
  }
}

function classifyPublicPath(pathname) {
  const decoded = decodePathname(pathname);
  if (!decoded) return null;
  const raw = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const parts = raw.split("/");
  if (!raw || parts.some((part) => !part || part === "." || part === ".." || part.startsWith("."))) return null;

  if (parts.length === 1 && PUBLIC_ROOT_FILES.has(raw)) {
    return { kind: "root", relativePath: raw };
  }

  if (!PUBLIC_ASSET_DIRECTORIES.has(parts[0])) return null;
  if (!SAFE_ASSET_EXTENSIONS.has(path.posix.extname(raw).toLowerCase())) return null;
  return { kind: "asset", relativePath: raw };
}

function resolvePublicPath(root, pathname) {
  const entry = classifyPublicPath(pathname);
  if (!entry) return null;
  const absoluteRoot = path.resolve(root);
  const candidate = path.resolve(absoluteRoot, entry.relativePath);
  if (candidate !== absoluteRoot && !candidate.startsWith(`${absoluteRoot}${path.sep}`)) return null;

  let canonicalRoot;
  try {
    canonicalRoot = fs.realpathSync(absoluteRoot);
  } catch {
    return null;
  }

  let current = absoluteRoot;
  for (const part of entry.relativePath.split("/")) {
    current = path.join(current, part);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch {
      return null;
    }
    if (stats.isSymbolicLink()) return null;
    if (current === candidate && !stats.isFile()) return null;
  }

  let canonicalCandidate;
  try {
    canonicalCandidate = fs.realpathSync(candidate);
  } catch {
    return null;
  }
  if (canonicalCandidate !== canonicalRoot && !canonicalCandidate.startsWith(`${canonicalRoot}${path.sep}`)) return null;
  return candidate;
}

module.exports = {
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRECTORIES,
  SAFE_ASSET_EXTENSIONS,
  classifyPublicPath,
  resolvePublicPath
};
