const fs = require("node:fs/promises");
const fsConstants = require("node:fs").constants;
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRECTORIES,
  SAFE_ASSET_EXTENSIONS,
  classifyPublicPath,
  resolvePublicPath
} = require("../security/publication-manifest.cjs");
const { browserHeaderValues } = require("../security/browser-headers.cjs");

const LOCK_NAME = ".prepare-cloudflare-assets.lock";
const STAGE_PREFIX = ".assets-stage-";
const BACKUP_PREFIX = ".assets-backup-";
const GENERATED_HEADERS_NAME = "_headers";
const CANONICAL_PRODUCTION_PATTERN = "https://www.aixclub.co/*";

function generatedHeadersValue() {
  return [
    "/*",
    ...Object.entries(browserHeaderValues(false)).map(([name, value]) => `  ${name}: ${value}`),
    "",
    CANONICAL_PRODUCTION_PATTERN,
    `  Strict-Transport-Security: ${browserHeaderValues(true)["Strict-Transport-Security"]}`,
    ""
  ].join("\n");
}

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

function directoryIdentity(stats, canonical) {
  return { dev: stats.dev, ino: stats.ino, canonical };
}

function hasSameInode(stats, identity) {
  return stats.dev === identity.dev && stats.ino === identity.ino;
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
  let canonicalCloudflare = await assertSafeDirectory(cloudflareDirectory, "Cloudflare destination parent", canonicalRoot);
  if (!canonicalCloudflare) {
    try {
      await fs.mkdir(cloudflareDirectory);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    canonicalCloudflare = await assertSafeDirectory(cloudflareDirectory, "Cloudflare destination parent", canonicalRoot);
  }

  const parentHandle = await fs.open(
    cloudflareDirectory,
    fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY || 0) | (fsConstants.O_NOFOLLOW || 0)
  );
  try {
    const parentStats = await parentHandle.stat();
    if (!parentStats.isDirectory()) {
      throw new Error(`Unsafe Cloudflare destination parent non-directory: ${cloudflareDirectory}`);
    }

    const destinationStats = await lstatIfPresent(resolvedDestination);
    let destinationIdentity = null;
    if (destinationStats) {
      if (destinationStats.isSymbolicLink() || !destinationStats.isDirectory()) {
        throw new Error(`Unsafe Cloudflare destination symlink or non-directory: ${resolvedDestination}`);
      }
      const canonicalDestination = await fs.realpath(resolvedDestination);
      if (!isContainedBy(canonicalCloudflare, canonicalDestination)) {
        throw new Error(`Unsafe Cloudflare destination canonical escape: ${resolvedDestination}`);
      }
      destinationIdentity = directoryIdentity(destinationStats, canonicalDestination);
    }

    return {
      resolvedRoot,
      resolvedDestination,
      cloudflareDirectory,
      canonicalRoot,
      canonicalCloudflare,
      parentHandle,
      parentIdentity: directoryIdentity(parentStats, canonicalCloudflare),
      destinationIdentity
    };
  } catch (error) {
    await parentHandle.close();
    throw error;
  }
}

async function assertParentIdentity(context, boundary) {
  const handleStats = await context.parentHandle.stat();
  if (!handleStats.isDirectory() || !hasSameInode(handleStats, context.parentIdentity)) {
    throw new Error(`Cloudflare parent identity changed before ${boundary}`);
  }

  const pathStats = await lstatIfPresent(context.cloudflareDirectory);
  if (!pathStats || pathStats.isSymbolicLink() || !pathStats.isDirectory()) {
    throw new Error(`Cloudflare parent changed or became a symlink before ${boundary}`);
  }
  if (!hasSameInode(pathStats, context.parentIdentity)) {
    throw new Error(`Cloudflare parent inode changed before ${boundary}`);
  }
  const canonical = await fs.realpath(context.cloudflareDirectory);
  if (canonical !== context.canonicalCloudflare) {
    throw new Error(`Cloudflare parent canonical path changed before ${boundary}`);
  }
}

async function assertDestinationState(context, expectedIdentity, boundary) {
  const stats = await lstatIfPresent(context.resolvedDestination);
  if (!expectedIdentity) {
    if (stats) throw new Error(`Cloudflare destination appeared before ${boundary}`);
    return;
  }
  if (!stats || stats.isSymbolicLink() || !stats.isDirectory() || !hasSameInode(stats, expectedIdentity)) {
    throw new Error(`Cloudflare destination identity changed before ${boundary}`);
  }
  const canonical = await fs.realpath(context.resolvedDestination);
  if (canonical !== expectedIdentity.canonical || !isContainedBy(context.canonicalCloudflare, canonical)) {
    throw new Error(`Cloudflare destination canonical path changed before ${boundary}`);
  }
}

async function snapshotInvocationDirectory(context, filename, prefix) {
  const resolved = path.resolve(filename);
  if (path.dirname(resolved) !== context.cloudflareDirectory || !path.basename(resolved).startsWith(prefix)) {
    throw new Error(`Unsafe builder artifact path: ${resolved}`);
  }
  const stats = await fs.lstat(resolved);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`Unsafe builder artifact symlink or non-directory: ${resolved}`);
  }
  const canonical = await fs.realpath(resolved);
  if (!isContainedBy(context.canonicalCloudflare, canonical)) {
    throw new Error(`Builder artifact canonical escape: ${resolved}`);
  }
  return { path: resolved, prefix, ...directoryIdentity(stats, canonical) };
}

async function assertInvocationDirectory(context, artifact, boundary) {
  await assertParentIdentity(context, boundary);
  if (
    path.dirname(artifact.path) !== context.cloudflareDirectory
    || !path.basename(artifact.path).startsWith(artifact.prefix)
  ) {
    throw new Error(`Unsafe builder artifact path before ${boundary}: ${artifact.path}`);
  }
  const stats = await lstatIfPresent(artifact.path);
  if (!stats || stats.isSymbolicLink() || !stats.isDirectory() || !hasSameInode(stats, artifact)) {
    throw new Error(`Builder artifact identity changed before ${boundary}: ${artifact.path}`);
  }
  const canonical = await fs.realpath(artifact.path);
  if (!isContainedBy(context.canonicalCloudflare, canonical)) {
    throw new Error(`Builder artifact canonical escape before ${boundary}: ${artifact.path}`);
  }
}

async function acquireBuilderLock(context, token) {
  await assertParentIdentity(context, "lock acquisition");
  const lockPath = path.join(context.cloudflareDirectory, LOCK_NAME);
  let handle;
  try {
    handle = await fs.open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("Cloudflare asset builder already running (lock exists)");
    throw error;
  }
  let lockIdentity = null;
  try {
    await handle.writeFile(`${token}\n`);
    const handleStats = await handle.stat();
    lockIdentity = { path: lockPath, handle, dev: handleStats.dev, ino: handleStats.ino };
    const pathStats = await fs.lstat(lockPath);
    if (!pathStats.isFile() || !hasSameInode(pathStats, lockIdentity)) {
      throw new Error("Cloudflare builder lock identity mismatch");
    }
    await assertParentIdentity(context, "post-lock verification");
    return lockIdentity;
  } catch (error) {
    await handle.close().catch(() => {});
    if (lockIdentity) {
      try {
        await assertParentIdentity(context, "failed-lock cleanup");
        const stats = await lstatIfPresent(lockPath);
        if (stats && !stats.isSymbolicLink() && stats.isFile() && hasSameInode(stats, lockIdentity)) {
          await fs.unlink(lockPath);
        }
      } catch {}
    }
    throw error;
  }
}

async function releaseBuilderLock(context, lock) {
  await lock.handle.close();
  await assertParentIdentity(context, "lock removal");
  const stats = await lstatIfPresent(lock.path);
  if (!stats || stats.isSymbolicLink() || !stats.isFile() || !hasSameInode(stats, lock)) {
    throw new Error("Cloudflare builder lock changed before removal");
  }
  await fs.unlink(lock.path);
}

async function removeInvocationDirectory(context, artifact, boundary) {
  await assertInvocationDirectory(context, artifact, boundary);
  await fs.rm(artifact.path, { recursive: true, force: false });
}

async function copyRegularFile(source, target, canonicalRoot) {
  const beforeStats = await lstatIfPresent(source);
  if (!beforeStats || beforeStats.isSymbolicLink() || !beforeStats.isFile()) return false;
  const beforeCanonical = await fs.realpath(source);
  if (!isContainedBy(canonicalRoot, beforeCanonical)) {
    throw new Error(`Source file canonical escape: ${source}`);
  }

  let handle;
  try {
    handle = await fs.open(source, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ELOOP") return false;
    throw error;
  }

  try {
    const stats = await handle.stat();
    if (!stats.isFile() || !hasSameInode(stats, directoryIdentity(beforeStats, beforeCanonical))) return false;
    const contents = await handle.readFile();
    const afterStats = await lstatIfPresent(source);
    if (!afterStats || afterStats.isSymbolicLink() || !afterStats.isFile() || !hasSameInode(afterStats, directoryIdentity(stats, beforeCanonical))) {
      throw new Error(`Source file identity changed during copy: ${source}`);
    }
    const afterCanonical = await fs.realpath(source);
    if (afterCanonical !== beforeCanonical || !isContainedBy(canonicalRoot, afterCanonical)) {
      throw new Error(`Source file canonical path changed during copy: ${source}`);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, { flag: "wx", mode: 0o644 });
    return true;
  } finally {
    await handle.close();
  }
}

async function copySafeDirectory(root, destination, directory, canonicalRoot) {
  const sourceBase = path.join(root, directory);
  const baseStats = await lstatIfPresent(sourceBase);
  if (!baseStats || baseStats.isSymbolicLink() || !baseStats.isDirectory()) return 0;
  const canonicalBase = await fs.realpath(sourceBase);
  if (!isContainedBy(canonicalRoot, canonicalBase)) return 0;

  let copiedFiles = 0;
  async function walk(current) {
    const beforeStats = await lstatIfPresent(current);
    if (!beforeStats || beforeStats.isSymbolicLink() || !beforeStats.isDirectory()) return;
    const beforeCanonical = await fs.realpath(current);
    if (!isContainedBy(canonicalRoot, beforeCanonical)) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    const afterStats = await lstatIfPresent(current);
    if (!afterStats || afterStats.isSymbolicLink() || !hasSameInode(afterStats, directoryIdentity(beforeStats, beforeCanonical))) {
      throw new Error(`Source directory identity changed during traversal: ${current}`);
    }
    if (await fs.realpath(current) !== beforeCanonical) {
      throw new Error(`Source directory canonical path changed during traversal: ${current}`);
    }
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
      if (await copyRegularFile(approvedSource, target, canonicalRoot)) copiedFiles += 1;
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

async function assertExactGeneratedHeadersFile(filename, expectedStats, expectedCanonical, canonicalDestination) {
  let handle;
  try {
    handle = await fs.open(filename, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const handleStats = await handle.stat();
    if (!handleStats.isFile() || !hasSameInode(handleStats, expectedStats)) {
      throw new Error(`Generated _headers identity changed during validation: ${filename}`);
    }
    const contents = await handle.readFile({ encoding: "utf8" });
    const afterStats = await lstatIfPresent(filename);
    if (!afterStats || afterStats.isSymbolicLink() || !afterStats.isFile() || !hasSameInode(afterStats, handleStats)) {
      throw new Error(`Generated _headers identity changed during validation: ${filename}`);
    }
    const afterCanonical = await fs.realpath(filename);
    if (afterCanonical !== expectedCanonical || !isContainedBy(canonicalDestination, afterCanonical)) {
      throw new Error(`Generated _headers canonical path changed during validation: ${filename}`);
    }
    if (contents !== generatedHeadersValue()) {
      throw new Error("Generated _headers content does not match the browser-header policy");
    }
  } finally {
    await handle?.close();
  }
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
        if (relative === GENERATED_HEADERS_NAME) {
          await assertExactGeneratedHeadersFile(full, stats, canonical, canonicalDestination);
        } else if (!classifyPublicPath(`/${relative}`)) {
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

async function callHook(options, name, payload) {
  const hook = options?.hooks?.[name];
  if (hook === undefined) return;
  if (typeof hook !== "function") throw new Error(`Invalid Cloudflare builder hook: ${name}`);
  await hook(payload);
}

async function assertPromotedDestination(context, stageArtifact, boundary) {
  await assertParentIdentity(context, boundary);
  const stats = await lstatIfPresent(context.resolvedDestination);
  if (!stats || stats.isSymbolicLink() || !stats.isDirectory() || !hasSameInode(stats, stageArtifact)) {
    throw new Error(`Promoted Cloudflare destination identity changed before ${boundary}`);
  }
  const canonical = await fs.realpath(context.resolvedDestination);
  if (!isContainedBy(context.canonicalCloudflare, canonical)) {
    throw new Error(`Promoted Cloudflare destination canonical escape before ${boundary}`);
  }
}

async function prepareCloudflareAssets(root, destination, options = {}) {
  const context = await validateDestination(root, destination);
  const token = randomUUID();
  const hookPayload = {
    root: context.resolvedRoot,
    destination: context.resolvedDestination,
    cloudflareDirectory: context.cloudflareDirectory
  };
  let lock = null;
  let stageArtifact = null;
  let backupArtifact = null;
  let stagePresent = false;
  let backupPresent = false;
  let promoted = false;
  let result = null;
  let primaryError = null;

  try {
    lock = await acquireBuilderLock(context, token);
    await callHook(options, "afterLockAcquired", hookPayload);

    await assertParentIdentity(context, "staging directory creation");
    const stagePath = await fs.mkdtemp(path.join(context.cloudflareDirectory, `${STAGE_PREFIX}${token}-`));
    stageArtifact = await snapshotInvocationDirectory(context, stagePath, `${STAGE_PREFIX}${token}-`);
    stagePresent = true;

    let copiedFiles = 0;
    for (const filename of PUBLIC_ROOT_FILES) {
      const source = resolvePublicPath(context.resolvedRoot, `/${filename}`);
      if (!source) continue;
      const classification = classifyPublicPath(`/${filename}`);
      if (classification?.kind !== "root") continue;
      if (
        await copyRegularFile(
          source,
          path.join(stageArtifact.path, filename),
          context.canonicalRoot
        )
      ) copiedFiles += 1;
    }

    for (const directory of PUBLIC_ASSET_DIRECTORIES) {
      copiedFiles += await copySafeDirectory(
        context.resolvedRoot,
        stageArtifact.path,
        directory,
        context.canonicalRoot
      );
    }

    await fs.writeFile(
      path.join(stageArtifact.path, GENERATED_HEADERS_NAME),
      generatedHeadersValue(),
      { flag: "wx", mode: 0o644 }
    );
    copiedFiles += 1;

    await callHook(options, "beforeStageValidation", { ...hookPayload, stage: stageArtifact.path });
    const stagedFiles = await assertSafePreparedTree(stageArtifact.path);
    if (stagedFiles !== copiedFiles) {
      throw new Error(`Cloudflare staging count mismatch: copied ${copiedFiles}, scanned ${stagedFiles}`);
    }

    await callHook(options, "beforeReplace", { ...hookPayload, stage: stageArtifact.path });
    await assertParentIdentity(context, "asset replacement");
    await assertDestinationState(context, context.destinationIdentity, "asset replacement");

    if (context.destinationIdentity) {
      const backupPath = path.join(context.cloudflareDirectory, `${BACKUP_PREFIX}${token}-${randomUUID()}`);
      if (await lstatIfPresent(backupPath)) throw new Error(`Cloudflare backup path already exists: ${backupPath}`);
      await assertParentIdentity(context, "destination-to-backup rename");
      await assertDestinationState(context, context.destinationIdentity, "destination-to-backup rename");
      await fs.rename(context.resolvedDestination, backupPath);
      backupArtifact = {
        path: backupPath,
        prefix: `${BACKUP_PREFIX}${token}-`,
        dev: context.destinationIdentity.dev,
        ino: context.destinationIdentity.ino,
        canonical: backupPath
      };
      backupPresent = true;
    }

    try {
      await assertInvocationDirectory(context, stageArtifact, "stage promotion rename");
      await assertDestinationState(context, null, "stage promotion rename");
      await fs.rename(stageArtifact.path, context.resolvedDestination);
      stagePresent = false;
      promoted = true;

      await callHook(options, "afterPromotion", hookPayload);
      await assertPromotedDestination(context, stageArtifact, "post-promotion validation");
      const promotedFiles = await assertSafePreparedTree(context.resolvedDestination);
      if (promotedFiles !== stagedFiles) {
        throw new Error(`Cloudflare promotion count mismatch: staged ${stagedFiles}, promoted ${promotedFiles}`);
      }
    } catch (promotionError) {
      let rollbackError = null;
      try {
        if (promoted) {
          await assertPromotedDestination(context, stageArtifact, "failed-promotion rollback rename");
          if (await lstatIfPresent(stageArtifact.path)) {
            throw new Error(`Cloudflare rollback stage path unexpectedly exists: ${stageArtifact.path}`);
          }
          await fs.rename(context.resolvedDestination, stageArtifact.path);
          stagePresent = true;
          promoted = false;
        }
        if (backupPresent) {
          await assertInvocationDirectory(context, backupArtifact, "backup rollback rename");
          await assertDestinationState(context, null, "backup rollback rename");
          await fs.rename(backupArtifact.path, context.resolvedDestination);
          backupPresent = false;
        }
      } catch (error) {
        rollbackError = error;
      }
      if (rollbackError) {
        throw new Error(`${promotionError.message}; rollback failed: ${rollbackError.message}`, { cause: promotionError });
      }
      throw promotionError;
    }

    if (backupPresent) {
      await removeInvocationDirectory(context, backupArtifact, "validated backup removal");
      backupPresent = false;
    }
    result = { fileCount: stagedFiles };
  } catch (error) {
    primaryError = error;
  } finally {
    if (stagePresent && stageArtifact) {
      try {
        await removeInvocationDirectory(context, stageArtifact, "staging cleanup");
        stagePresent = false;
      } catch (error) {
        if (!primaryError) primaryError = error;
      }
    }

    if (lock) {
      try {
        await releaseBuilderLock(context, lock);
      } catch (error) {
        if (!primaryError) primaryError = error;
      }
    }
    try {
      await context.parentHandle.close();
    } catch (error) {
      if (!primaryError) primaryError = error;
    }
  }

  if (primaryError) throw primaryError;
  return result;
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
