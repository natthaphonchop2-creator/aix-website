const fs = require("node:fs/promises");
const fsConstants = require("node:fs").constants;
const path = require("node:path");
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRECTORIES,
  SAFE_ASSET_EXTENSIONS,
  classifyPublicPath,
  resolvePublicPath
} = require("../security/publication-manifest.cjs");

function isContainedBy(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

async function lstatIfPresent(filename) {
  try {
    return await fs.lstat(filename);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertSafeDirectory(filename, label, canonicalParent = null) {
  const stats = await lstatIfPresent(filename);
  if (!stats) return null;
  if (stats.isSymbolicLink()) throw new Error(`Unsafe ${label} symlink: ${filename}`);
  if (!stats.isDirectory()) throw new Error(`Unsafe ${label}; expected a directory: ${filename}`);
  const canonical = await fs.realpath(filename);
  if (canonicalParent && !isContainedBy(canonicalParent, canonical)) {
    throw new Error(`Unsafe ${label} canonical escape: ${filename}`);
  }
  return canonical;
}

async function validateDestination(root, destination) {
  const resolvedRoot = path.resolve(root);
  const resolvedDestination = path.resolve(destination);
  const cloudflareDirectory = path.join(resolvedRoot, "cloudflare");
  const expectedDestination = path.join(cloudflareDirectory, "assets");

  if (resolvedDestination !== expectedDestination) {
    throw new Error(`Unsafe Cloudflare destination: ${resolvedDestination}`);
  }

  const rootStats = await lstatIfPresent(resolvedRoot);
  if (!rootStats || rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error(`Unsafe repository root symlink or non-directory: ${resolvedRoot}`);
  }
  const canonicalRoot = await fs.realpath(resolvedRoot);
  const canonicalCloudflare = await assertSafeDirectory(
    cloudflareDirectory,
    "Cloudflare destination parent",
    canonicalRoot
  );
  const canonicalDestination = await assertSafeDirectory(
    resolvedDestination,
    "Cloudflare destination",
    canonicalRoot
  );

  if (canonicalDestination && canonicalCloudflare && !isContainedBy(canonicalCloudflare, canonicalDestination)) {
    throw new Error(`Unsafe Cloudflare destination canonical escape: ${resolvedDestination}`);
  }

  return {
    resolvedRoot,
    resolvedDestination,
    cloudflareDirectory,
    canonicalRoot
  };
}

async function copyRegularFile(source, target) {
  let handle;
  try {
    handle = await fs.open(source, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ELOOP") return false;
    throw error;
  }

  try {
    const stats = await handle.stat();
    if (!stats.isFile()) return false;
    const contents = await handle.readFile();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, { flag: "wx", mode: 0o644 });
    return true;
  } finally {
    await handle.close();
  }
}

async function copySafeDirectory(root, destination, directory) {
  const sourceBase = path.join(root, directory);
  const baseStats = await lstatIfPresent(sourceBase);
  if (!baseStats || baseStats.isSymbolicLink() || !baseStats.isDirectory()) return 0;

  let copiedFiles = 0;
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const source = path.join(current, entry.name);
      const stats = await lstatIfPresent(source);
      if (!stats || stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) {
        await walk(source);
        continue;
      }
      if (!stats.isFile()) continue;

      const relative = path.relative(root, source).split(path.sep).join("/");
      const classification = classifyPublicPath(`/${relative}`);
      const extension = path.posix.extname(relative).toLowerCase();
      if (classification?.kind !== "asset" || !SAFE_ASSET_EXTENSIONS.has(extension)) continue;
      const approvedSource = resolvePublicPath(root, `/${relative}`);
      if (!approvedSource || path.resolve(approvedSource) !== path.resolve(source)) continue;

      const target = path.join(destination, ...relative.split("/"));
      if (await copyRegularFile(approvedSource, target)) copiedFiles += 1;
    }
  }

  await walk(sourceBase);
  return copiedFiles;
}

function isApprovedAssetDirectory(relative) {
  const parts = relative.split("/");
  return PUBLIC_ASSET_DIRECTORIES.has(parts[0])
    && parts.every((part) => part && part !== "." && part !== ".." && !part.startsWith("."));
}

async function assertSafePreparedTree(destination) {
  const resolvedDestination = path.resolve(destination);
  const destinationStats = await lstatIfPresent(resolvedDestination);
  if (!destinationStats) throw new Error(`Missing Cloudflare assets destination: ${resolvedDestination}`);
  if (destinationStats.isSymbolicLink()) {
    throw new Error(`Unsafe Cloudflare assets destination symlink: ${resolvedDestination}`);
  }
  if (!destinationStats.isDirectory()) {
    throw new Error(`Unsafe Cloudflare assets destination non-directory: ${resolvedDestination}`);
  }

  const canonicalDestination = await fs.realpath(resolvedDestination);
  let fileCount = 0;
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = path.relative(resolvedDestination, full).split(path.sep).join("/");
      const stats = await fs.lstat(full);
      if (stats.isSymbolicLink()) throw new Error(`Symlink in Cloudflare assets: ${relative}`);

      const canonical = await fs.realpath(full);
      if (!isContainedBy(canonicalDestination, canonical)) {
        throw new Error(`Canonical escape in Cloudflare assets: ${relative}`);
      }

      if (stats.isDirectory()) {
        if (!isApprovedAssetDirectory(relative)) {
          throw new Error(`Unlisted Cloudflare asset directory: ${relative}`);
        }
        await walk(full);
      } else if (stats.isFile()) {
        if (!classifyPublicPath(`/${relative}`)) {
          throw new Error(`Unlisted Cloudflare asset: ${relative}`);
        }
        fileCount += 1;
      } else {
        throw new Error(`Non-regular Cloudflare asset: ${relative}`);
      }
    }
  }

  await walk(resolvedDestination);
  return fileCount;
}

async function prepareCloudflareAssets(root, destination) {
  const {
    resolvedRoot,
    resolvedDestination,
    cloudflareDirectory
  } = await validateDestination(root, destination);

  await fs.rm(resolvedDestination, { recursive: true, force: true });
  await fs.mkdir(cloudflareDirectory, { recursive: true });
  await fs.mkdir(resolvedDestination);

  let copiedFiles = 0;
  for (const filename of PUBLIC_ROOT_FILES) {
    const source = resolvePublicPath(resolvedRoot, `/${filename}`);
    if (!source) continue;
    const classification = classifyPublicPath(`/${filename}`);
    if (classification?.kind !== "root") continue;
    if (await copyRegularFile(source, path.join(resolvedDestination, filename))) copiedFiles += 1;
  }

  for (const directory of PUBLIC_ASSET_DIRECTORIES) {
    copiedFiles += await copySafeDirectory(resolvedRoot, resolvedDestination, directory);
  }

  const scannedFiles = await assertSafePreparedTree(resolvedDestination);
  if (scannedFiles !== copiedFiles) {
    throw new Error(`Cloudflare asset count mismatch: copied ${copiedFiles}, scanned ${scannedFiles}`);
  }
  return { fileCount: scannedFiles };
}

if (require.main === module) {
  prepareCloudflareAssets(process.cwd(), path.join(process.cwd(), "cloudflare", "assets"))
    .then(({ fileCount }) => {
      console.log(`Prepared ${fileCount} manifest-approved Cloudflare assets.`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { prepareCloudflareAssets, assertSafePreparedTree };
