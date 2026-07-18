"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");

function mediaNotFound(message = "Media file is unavailable") {
  const error = new Error(message);
  error.code = "MEDIA_NOT_FOUND";
  return error;
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function openContainedRegularFile(root, absolutePath) {
  if (typeof root !== "string" || typeof absolutePath !== "string" || root.includes("\0") || absolutePath.includes("\0")) {
    throw mediaNotFound();
  }
  const absoluteRoot = path.resolve(root);
  const candidate = path.resolve(absolutePath);
  const relative = path.relative(absoluteRoot, candidate);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw mediaNotFound();
  }

  let current = absoluteRoot;
  const parts = relative.split(path.sep);
  for (let index = 0; index < parts.length - 1; index += 1) {
    const details = await fsp.lstat(current, { bigint: true });
    if (details.isSymbolicLink() || !details.isDirectory()) throw mediaNotFound();
    current = path.join(current, parts[index]);
  }
  const rootDetails = await fsp.lstat(absoluteRoot, { bigint: true });
  if (rootDetails.isSymbolicLink() || !rootDetails.isDirectory()) throw mediaNotFound();
  if (parts.length > 1) {
    const parentDetails = await fsp.lstat(path.dirname(candidate), { bigint: true });
    if (parentDetails.isSymbolicLink() || !parentDetails.isDirectory()) throw mediaNotFound();
  }
  const before = await fsp.lstat(candidate, { bigint: true });
  if (before.isSymbolicLink() || !before.isFile()) throw mediaNotFound();

  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fsp.open(candidate, flags);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameIdentity(before, opened)) throw mediaNotFound();
    return { details: opened, handle };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

function parseSafeInteger(value) {
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseByteRange(header, size) {
  if (!Number.isSafeInteger(size) || size < 0 || typeof header !== "string") return null;
  const match = header.match(/^bytes=(?:(\d+)-(\d*)|-(\d+))$/u);
  if (!match || size === 0) return null;

  if (match[3] !== undefined) {
    const suffixBytes = parseSafeInteger(match[3]);
    if (!suffixBytes) return null;
    return { start: Math.max(size - suffixBytes, 0), end: size - 1 };
  }

  const start = parseSafeInteger(match[1]);
  const requestedEnd = match[2] ? parseSafeInteger(match[2]) : size - 1;
  if (start === null || requestedEnd === null || start >= size || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, size - 1) };
}

function truncateUtf8(value, maxBytes) {
  let output = "";
  let bytes = 0;
  for (const character of value) {
    const next = Buffer.byteLength(character, "utf8");
    if (bytes + next > maxBytes) break;
    output += character;
    bytes += next;
  }
  return output;
}

function safeDispositionHeader(disposition, downloadName, absolutePath) {
  const kind = disposition === "inline" ? "inline" : "attachment";
  const extensionCandidate = path.extname(absolutePath).toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/u.test(extensionCandidate) ? extensionCandidate : "";
  let name = String(downloadName || "file").toWellFormed().normalize("NFKC")
    .replace(/[\\/]+/gu, "-")
    .replace(/[\0\x00-\x1f\x7f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
  if (extension && name.toLowerCase().endsWith(extension)) name = name.slice(0, -extension.length);
  name = truncateUtf8(name.replace(/[. ]+$/gu, "") || "file", 180);
  const unicodeName = `${name || "file"}${extension}`;
  let asciiBase = name.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  asciiBase = truncateUtf8(asciiBase || "file", 96).replace(/[. ]+$/gu, "") || "file";
  const asciiName = `${asciiBase}${extension}`;
  const encoded = encodeURIComponent(unicodeName).replace(/[!'()*]/gu, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
  return `${kind}; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}

async function streamMedia(req, res, {
  absolutePath,
  contentType = "application/octet-stream",
  disposition = "inline",
  downloadName = "file",
  root
}) {
  const { details, handle } = await openContainedRegularFile(root, absolutePath);
  const size = Number(details.size);
  if (!Number.isSafeInteger(size) || size < 0) {
    await handle.close();
    throw mediaNotFound();
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", safeDispositionHeader(disposition, downloadName, absolutePath));
  const rangeHeader = typeof req.get === "function" ? req.get("range") : req.headers?.range;
  let range = null;
  if (rangeHeader !== undefined) {
    range = parseByteRange(rangeHeader, size);
    if (!range) {
      res.status(416);
      res.setHeader("Content-Range", `bytes */${size}`);
      res.setHeader("Content-Length", "0");
      await handle.close();
      return res.end();
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader("Content-Length", String(range.end - range.start + 1));
  } else {
    res.setHeader("Content-Length", String(size));
  }
  if (req.method === "HEAD" || size === 0) {
    await handle.close();
    return res.end();
  }
  let stream;
  try {
    stream = handle.createReadStream({ ...(range || {}), autoClose: true });
  } catch (error) {
    await handle.close();
    throw error;
  }
  try {
    await pipeline(stream, res);
  } catch (error) {
    if (error?.code === "ERR_STREAM_PREMATURE_CLOSE" && (req.aborted || res.destroyed)) return;
    throw error;
  }
}

module.exports = { parseByteRange, streamMedia };
