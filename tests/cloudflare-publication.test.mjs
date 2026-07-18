import test from "node:test";
import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  prepareCloudflareAssets,
  assertSafePreparedTree
} = require("../scripts/prepare-cloudflare-assets.cjs");

async function createSandbox(t) {
  const sandbox = await mkdtemp(join(tmpdir(), "aix-cf-publication-"));
  const root = join(sandbox, "repo");
  await mkdir(root);
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  return { sandbox, root };
}

async function assertMissing(filename) {
  await assert.rejects(lstat(filename), { code: "ENOENT" });
}

async function builderArtifacts(cloudflareDirectory) {
  return (await readdir(cloudflareDirectory)).filter((name) =>
    name === ".prepare-cloudflare-assets.lock"
    || name.startsWith(".assets-stage-")
    || name.startsWith(".assets-backup-")
  );
}

test("copies approved regular files and excludes sensitive or executable files", async (t) => {
  const { root } = await createSandbox(t);
  await mkdir(join(root, "assets", "vendor"), { recursive: true });
  await writeFile(join(root, "index.html"), "public");
  await writeFile(join(root, "styles.css"), "style");
  await writeFile(join(root, "safe-dom.js"), "safe helper");
  await writeFile(join(root, "server.js"), "secret");
  await writeFile(join(root, "dashboard.html"), "private");
  await mkdir(join(root, "content"));
  await writeFile(join(root, "content", "tools-library.cjs"), "premium");
  await writeFile(join(root, "assets", "logo.png"), "image");
  await writeFile(join(root, "assets", "vendor", "bad.js"), "code");
  await writeFile(join(root, "assets", "proposal.pdf"), "document");
  await writeFile(join(root, "assets", ".hidden.png"), "hidden");

  const destination = join(root, "cloudflare", "assets");
  await prepareCloudflareAssets(root, destination);

  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "public");
  assert.equal(await readFile(join(destination, "styles.css"), "utf8"), "style");
  assert.equal(await readFile(join(destination, "safe-dom.js"), "utf8"), "safe helper");
  assert.equal(await readFile(join(destination, "assets", "logo.png"), "utf8"), "image");
  await assertMissing(join(destination, "server.js"));
  await assertMissing(join(destination, "dashboard.html"));
  await assertMissing(join(destination, "content"));
  await assertMissing(join(destination, "assets", "vendor", "bad.js"));
  await assertMissing(join(destination, "assets", "proposal.pdf"));
  await assertMissing(join(destination, "assets", ".hidden.png"));
});

test("never follows approved root-file or asset symlinks", async (t) => {
  const { sandbox, root } = await createSandbox(t);
  const outside = join(sandbox, "outside");
  await mkdir(join(outside, "nested"), { recursive: true });
  await writeFile(join(outside, "outside.html"), "outside root file");
  await writeFile(join(outside, "outside.png"), "outside asset");
  await writeFile(join(outside, "nested", "inside.png"), "outside directory");

  await symlink(join(outside, "outside.html"), join(root, "index.html"), "file");
  await mkdir(join(root, "assets"));
  await symlink(join(outside, "outside.png"), join(root, "assets", "file-link.png"), "file");
  await symlink(join(outside, "nested"), join(root, "assets", "directory-link"), "dir");
  await symlink(outside, join(root, "AiX logo"), "dir");

  const destination = join(root, "cloudflare", "assets");
  await prepareCloudflareAssets(root, destination);

  await assertMissing(join(destination, "index.html"));
  await assertMissing(join(destination, "assets", "file-link.png"));
  await assertMissing(join(destination, "assets", "directory-link"));
  await assertMissing(join(destination, "AiX logo"));
});

test("rejects symlinked roots or Cloudflare parents before deletion", async (t) => {
  const { sandbox, root } = await createSandbox(t);
  const outside = join(sandbox, "outside");
  await mkdir(join(outside, "assets"), { recursive: true });
  await writeFile(join(outside, "assets", "keep.txt"), "must remain");
  await symlink(outside, join(root, "cloudflare"), "dir");

  await assert.rejects(
    prepareCloudflareAssets(root, join(root, "cloudflare", "assets")),
    /symlink/i
  );
  assert.equal(await readFile(join(outside, "assets", "keep.txt"), "utf8"), "must remain");

  const realRoot = join(sandbox, "real-repo");
  const rootLink = join(sandbox, "repo-link");
  await mkdir(realRoot);
  await symlink(realRoot, rootLink, "dir");
  await assert.rejects(
    prepareCloudflareAssets(rootLink, join(rootLink, "cloudflare", "assets")),
    /symlink/i
  );
});

test("rejects every non-exact destination and safely regenerates the exact tree", async (t) => {
  const { root } = await createSandbox(t);
  const destination = join(root, "cloudflare", "assets");
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "stale.txt"), "stale");
  await writeFile(join(root, "index.html"), "first");

  for (const unsafeDestination of [
    root,
    join(root, "cloudflare"),
    join(root, "elsewhere"),
    join(destination, "nested")
  ]) {
    await assert.rejects(
      prepareCloudflareAssets(root, unsafeDestination),
      /Unsafe Cloudflare destination/
    );
  }
  assert.equal(await readFile(join(destination, "stale.txt"), "utf8"), "stale");

  await prepareCloudflareAssets(root, destination);
  await assertMissing(join(destination, "stale.txt"));
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "first");

  await writeFile(join(root, "index.html"), "second");
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "assets", "new.webp"), "new asset");
  await prepareCloudflareAssets(root, destination);
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "second");
  assert.equal(await readFile(join(destination, "assets", "new.webp"), "utf8"), "new asset");
});

test("prepared-tree scan rejects unsafe files and destination or path symlinks", async (t) => {
  const { sandbox } = await createSandbox(t);
  const destination = join(sandbox, "prepared");
  await mkdir(join(destination, "assets"), { recursive: true });
  await writeFile(join(destination, "index.html"), "public");
  await writeFile(join(destination, "assets", "safe.svg"), "safe");
  await assertSafePreparedTree(destination);

  const unsafeFile = join(destination, "assets", "bad.js");
  await writeFile(unsafeFile, "unsafe");
  await assert.rejects(assertSafePreparedTree(destination), /Unlisted Cloudflare asset/);
  await rm(unsafeFile);

  const privateContent = join(destination, "content");
  await mkdir(privateContent);
  await writeFile(join(privateContent, "tools-library.cjs"), "premium");
  await assert.rejects(assertSafePreparedTree(destination), /Unlisted Cloudflare asset/);
  await rm(privateContent, { recursive: true });

  const outsideFile = join(sandbox, "outside.png");
  const pathLink = join(destination, "assets", "link.png");
  await writeFile(outsideFile, "outside");
  await symlink(outsideFile, pathLink, "file");
  await assert.rejects(assertSafePreparedTree(destination), /Symlink in Cloudflare assets/);
  await rm(pathLink);

  const destinationLink = join(sandbox, "prepared-link");
  await symlink(destination, destinationLink, "dir");
  await assert.rejects(assertSafePreparedTree(destinationLink), /symlink/i);
});

test("keeps the known-good tree when staging copy or scan fails", async (t) => {
  const { root } = await createSandbox(t);
  const destination = join(root, "cloudflare", "assets");
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "index.html"), "known good");
  await writeFile(join(root, "index.html"), "candidate");

  await assert.rejects(
    prepareCloudflareAssets(root, destination, {
      hooks: {
        beforeStageValidation() {
          throw new Error("injected staging scan failure");
        }
      }
    }),
    /injected staging scan failure/
  );

  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "known good");
  assert.deepEqual(await builderArtifacts(join(root, "cloudflare")), []);
});

test("rejects a Cloudflare parent changed to a symlink before replacement", async (t) => {
  const { sandbox, root } = await createSandbox(t);
  const cloudflareDirectory = join(root, "cloudflare");
  const destination = join(cloudflareDirectory, "assets");
  const movedCloudflare = join(root, "cloudflare-known-good");
  const outside = join(sandbox, "outside");
  await mkdir(destination, { recursive: true });
  await mkdir(join(outside, "assets"), { recursive: true });
  await writeFile(join(destination, "index.html"), "known good");
  await writeFile(join(root, "index.html"), "candidate");
  await writeFile(join(outside, "assets", "sentinel.txt"), "outside untouched");

  await assert.rejects(
    prepareCloudflareAssets(root, destination, {
      hooks: {
        async beforeReplace() {
          await rename(cloudflareDirectory, movedCloudflare);
          await symlink(outside, cloudflareDirectory, "dir");
        }
      }
    }),
    /changed|symlink|identity/i
  );

  assert.equal(await readFile(join(movedCloudflare, "assets", "index.html"), "utf8"), "known good");
  assert.equal(await readFile(join(outside, "assets", "sentinel.txt"), "utf8"), "outside untouched");
});

test("exclusive builder lock rejects a concurrent build", async (t) => {
  const { root } = await createSandbox(t);
  const destination = join(root, "cloudflare", "assets");
  await writeFile(join(root, "index.html"), "candidate");

  let signalLocked;
  let releaseFirst;
  const locked = new Promise((resolve) => { signalLocked = resolve; });
  const holdFirst = new Promise((resolve) => { releaseFirst = resolve; });
  const firstBuild = prepareCloudflareAssets(root, destination, {
    hooks: {
      async afterLockAcquired() {
        signalLocked();
        await holdFirst;
      }
    }
  });

  await Promise.race([
    locked,
    new Promise((_, reject) => setTimeout(() => reject(new Error("builder lock was not acquired")), 250))
  ]);
  await assert.rejects(prepareCloudflareAssets(root, destination), /already running|lock/i);
  releaseFirst();
  await firstBuild;
  assert.deepEqual(await builderArtifacts(join(root, "cloudflare")), []);
});

test("rolls back the known-good tree when post-promotion validation fails", async (t) => {
  const { root } = await createSandbox(t);
  const destination = join(root, "cloudflare", "assets");
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "index.html"), "known good");
  await writeFile(join(root, "index.html"), "candidate");

  await assert.rejects(
    prepareCloudflareAssets(root, destination, {
      hooks: {
        afterPromotion() {
          throw new Error("injected post-promotion failure");
        }
      }
    }),
    /injected post-promotion failure/
  );

  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "known good");
  assert.deepEqual(await builderArtifacts(join(root, "cloudflare")), []);
});

test("successful atomic regeneration leaves no stage backup or lock artifacts", async (t) => {
  const { root } = await createSandbox(t);
  const destination = join(root, "cloudflare", "assets");
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "index.html"), "known good");
  await writeFile(join(root, "index.html"), "candidate");

  await prepareCloudflareAssets(root, destination);

  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "candidate");
  assert.deepEqual(await builderArtifacts(join(root, "cloudflare")), []);
});

async function loadWorker() {
  const source = await readFile(join(process.cwd(), "cloudflare", "worker.js"), "utf8");
  const executable = source.replace(/\bexport default\b/, "return");
  return {
    source,
    worker: new Function(executable)()
  };
}

function createAssetBinding(status = 200) {
  const requests = [];
  return {
    requests,
    binding: {
      async fetch(request) {
        requests.push(request.url);
        return new Response("asset", { status });
      }
    }
  };
}

test("Worker normalizes auth routes and fails closed for every private or API family", async () => {
  const { source, worker } = await loadWorker();
  const assets = createAssetBinding();
  const env = { ASSETS: assets.binding };

  for (const [pathname, mode] of [
    ["/login", "login"],
    ["/login//", "login"],
    ["/register/", "signup"],
    ["/register//", "signup"]
  ]) {
    const response = await worker.fetch(new Request(`https://preview.example${pathname}`), env);
    assert.equal(response.status, 302, pathname);
    assert.equal(
      response.headers.get("location"),
      `https://preview.example/index.html?auth=${mode}`,
      pathname
    );
  }

  for (const pathname of [
    "/admin",
    "/admin/users",
    "/dashboard",
    "/dashboard/settings",
    "/tools-box",
    "/tools-box/library",
    "/live/demo",
    "/payment",
    "/payment/success",
    "/course/manus-ai/start",
    "/course/manus-ai/content",
    "/course/manus-ai/learn/lesson-1",
    "/api",
    "/api/",
    "/api/health",
    "/api/not-available",
    "/%61dmin",
    "/dashboard%2Fsettings",
    "/api%2Fhealth"
  ]) {
    const response = await worker.fetch(new Request(`https://preview.example${pathname}`), env);
    assert.equal(response.status, 503, pathname);
    assert.match(response.headers.get("content-type") || "", /application\/json/, pathname);
  }

  assert.deepEqual(assets.requests, []);
  assert.doesNotMatch(source, /HTML_ROUTES|pathname === ["']\/api\/health["']/);
});

test("Worker rejects malformed paths and passes marketing requests through unchanged", async () => {
  const { worker } = await loadWorker();
  const assets = createAssetBinding(200);
  const env = { ASSETS: assets.binding };

  for (const pathname of ["/%", "/%ZZ", "/%E0%A4%A"]) {
    const response = await worker.fetch(new Request(`https://preview.example${pathname}`), env);
    assert.equal(response.status, 400, pathname);
  }

  const marketingUrl = "https://preview.example/styles.css?v=manifest";
  const response = await worker.fetch(new Request(marketingUrl), env);
  assert.equal(response.status, 200);
  assert.deepEqual(assets.requests, [marketingUrl]);
});

test("Wrangler sends every dynamic private family through the Worker first", async () => {
  const config = JSON.parse(await readFile(join(process.cwd(), "wrangler.jsonc"), "utf8"));
  const workerFirst = new Set(config.assets?.run_worker_first || []);
  for (const pattern of [
    "/api",
    "/api/*",
    "/login",
    "/login/*",
    "/register",
    "/register/*",
    "/admin",
    "/admin/*",
    "/dashboard",
    "/dashboard/*",
    "/tools-box",
    "/tools-box/*",
    "/live",
    "/live/*",
    "/payment",
    "/payment/*",
    "/course/*/start",
    "/course/*/start/*",
    "/course/*/content",
    "/course/*/content/*",
    "/course/*/learn",
    "/course/*/learn/*"
  ]) {
    assert.equal(workerFirst.has(pattern), true, pattern);
  }
});

test("package scripts use the manifest builder and preserve the dry-run boundary", async () => {
  const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(
    packageJson.scripts["test:security"],
    "node --test tests/safe-dom.test.mjs tests/safe-render-contract.test.mjs tests/publication-manifest.test.mjs tests/publication-boundary.test.mjs tests/api-route-policy.test.mjs tests/cloudflare-publication.test.mjs tests/config-security.test.mjs tests/session-security.test.mjs tests/http-security.test.mjs tests/client-auth-contract.test.mjs tests/auth-integration.test.mjs tests/upload-policy.test.mjs tests/protected-media.test.mjs tests/tools-protection.test.mjs"
  );
  assert.equal(packageJson.scripts["cf:prepare"], "node scripts/prepare-cloudflare-assets.cjs");
  assert.equal(packageJson.scripts["cf:check"], "npm run cf:prepare && wrangler deploy --dry-run --env=\"\"");
  assert.equal(packageJson.scripts["cf:deploy:dry-run"], "npm run cf:check");
  assert.equal(packageJson.scripts.start, "node server.js");
  assert.equal(packageJson.scripts["cf:dev"], "wrangler dev");
  assert.equal(packageJson.scripts["cf:deploy"], "npm run cf:prepare && wrangler deploy --env=\"\"");
  assert.equal(packageJson.devDependencies.acorn, "8.15.0");
  assert.equal(packageJson.devDependencies.linkedom, "0.18.13");
});
