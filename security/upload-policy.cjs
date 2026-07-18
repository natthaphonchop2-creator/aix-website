const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { constants: FS_CONSTANTS } = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");
const zlib = require("node:zlib");

const MB = 1024 * 1024;
const HEAD_BYTES = 4096;
const TEXT_CHUNK_BYTES = 64 * 1024;
const MAX_ZIP_ENTRIES = 4096;
const MAX_CENTRAL_DIRECTORY_BYTES = 4 * MB;
const MAX_OFFICE_METADATA_BYTES = 256 * 1024;
const MAX_OFFICE_MAIN_BYTES = 8 * MB;
const MAX_OFFICE_ENTRY_BYTES = 64 * MB;
const MAX_OFFICE_ARCHIVE_BYTES = 256 * MB;
const MAX_OFFICE_COMPRESSION_RATIO = 200;
const MAX_DESTINATION_ATTEMPTS = 8;
const CONTENT_TYPES_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/content-types";
const RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_RELATIONSHIP_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

const UPLOAD_POLICIES = {
  replay: { maxBytes: 500 * MB, extensions: new Set([".mp4", ".webm"]) },
  resource: {
    maxBytes: 50 * MB,
    extensions: new Set([
      ".pdf",
      ".zip",
      ".docx",
      ".xlsx",
      ".pptx",
      ".csv",
      ".txt",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp"
    ])
  }
};

const DANGEROUS_PARTS = new Set([
  "app",
  "bat",
  "cjs",
  "cmd",
  "com",
  "dll",
  "dmg",
  "exe",
  "htm",
  "html",
  "jar",
  "js",
  "lnk",
  "mjs",
  "msi",
  "php",
  "ps1",
  "py",
  "reg",
  "scr",
  "sh",
  "svg",
  "vbe",
  "vbs",
  "wsf"
]);
const KNOWN_UPLOAD_PARTS = new Set(
  Object.values(UPLOAD_POLICIES).flatMap((policy) => [...policy.extensions].map((extension) => extension.slice(1)))
);
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const validatedFiles = new WeakMap();

const OFFICE_FORMATS = {
  ".docx": {
    main: "word/document.xml",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    root: "document",
    namespace: "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  },
  ".xlsx": {
    main: "xl/workbook.xml",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    root: "workbook",
    namespace: "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  },
  ".pptx": {
    main: "ppt/presentation.xml",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
    root: "presentation",
    namespace: "http://schemas.openxmlformats.org/presentationml/2006/main"
  }
};

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});

function resolveInside(root, relative) {
  if (typeof root !== "string" || typeof relative !== "string" || root.includes("\0") || relative.includes("\0")) {
    return null;
  }
  const absoluteRoot = path.resolve(root);
  const crossPlatformRelative = relative.replaceAll("\\", path.sep);
  const candidate = path.resolve(absoluteRoot, crossPlatformRelative);
  const fromRoot = path.relative(absoluteRoot, candidate);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) return null;
  return candidate;
}

function truncateUtf8(value, maxBytes) {
  let bytes = 0;
  let result = "";
  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (bytes + characterBytes > maxBytes) break;
    result += character;
    bytes += characterBytes;
  }
  return result;
}

function safeUploadFilename(originalName) {
  const raw = String(originalName || "")
    .normalize("NFKC")
    .replace(/[\\/\0]/g, "-")
    .replace(BIDI_CONTROL, "")
    .trim();
  const sourceExtension = path.extname(raw);
  const rawExtension = sourceExtension.toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/.test(rawExtension) ? rawExtension : ".bin";
  const rawBase = path.basename(raw, sourceExtension);
  const cleanedBase = rawBase
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  const base = truncateUtf8(cleanedBase || "file", 120);
  const nonce = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${nonce}-${base}${extension}`;
}

function validatePolicy(policy) {
  if (
    !policy ||
    !Number.isSafeInteger(policy.maxBytes) ||
    policy.maxBytes <= 0 ||
    !(policy.extensions instanceof Set) ||
    policy.extensions.size === 0
  ) {
    throw new Error("Upload policy is invalid");
  }
}

function validateOriginalName(file, policy) {
  if (typeof file?.originalname !== "string") throw new Error("Upload name is invalid");
  const original = file.originalname;
  if (
    !original ||
    original.length > 255 ||
    original !== original.trim() ||
    original.startsWith(".") ||
    original.includes("..") ||
    /[\\/\0\x00-\x1f\x7f:]/u.test(original) ||
    BIDI_CONTROL.test(original) ||
    WINDOWS_RESERVED_NAME.test(original)
  ) {
    throw new Error("Upload name is invalid");
  }

  const extension = path.extname(original).toLowerCase();
  const base = path.basename(original, path.extname(original));
  if (!base || !policy.extensions.has(extension)) throw new Error("Upload extension is not allowed");

  const innerParts = base.toLowerCase().split(".").slice(1);
  if (innerParts.some((part) => DANGEROUS_PARTS.has(part) || KNOWN_UPLOAD_PARTS.has(part))) {
    throw new Error("Upload name contains a disguised extension");
  }
  return extension;
}

function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function sameValidatedInode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs
  );
}

async function lstatBigInt(filePath) {
  return fs.lstat(filePath, { bigint: true });
}

async function readExactly(handle, length, position) {
  if (!Number.isSafeInteger(length) || length < 0) throw new Error("Bounded read length is invalid");
  const buffer = Buffer.alloc(length);
  let total = 0;
  while (total < length) {
    const { bytesRead } = await handle.read(buffer, total, length - total, position + total);
    if (bytesRead === 0) throw new Error("Upload format is truncated");
    total += bytesRead;
  }
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function readEbmlSize(buffer, offset) {
  const first = buffer[offset];
  if (first === undefined || first === 0) return null;
  let marker = 0x80;
  let length = 1;
  while ((first & marker) === 0) {
    marker >>>= 1;
    length += 1;
  }
  if (length > 8 || offset + length > buffer.length) return null;
  let value = BigInt(first & (marker - 1));
  let unknown = BigInt(marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = (value << 8n) | BigInt(buffer[offset + index]);
    unknown = (unknown << 8n) | 0xffn;
  }
  if (value === unknown || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return { bytes: length, value: Number(value) };
}

function hasWebmSignature(head, actualBytes) {
  if (head.length < 12 || !head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return false;
  const headerSize = readEbmlSize(head, 4);
  if (!headerSize) return false;
  const headerEnd = 4 + headerSize.bytes + headerSize.value;
  if (headerEnd > actualBytes || headerEnd > head.length) return false;
  const docType = Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);
  const docTypeAt = head.indexOf(docType, 4 + headerSize.bytes);
  return docTypeAt !== -1 && docTypeAt + docType.length <= headerEnd;
}

function basicSignature(head, actualBytes) {
  if (/^%PDF-(?:1\.[0-7]|2\.0)[\t\r\n ]/u.test(head.subarray(0, 10).toString("ascii"))) return ".pdf";
  if (
    head.length >= 33 &&
    head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
    head.readUInt32BE(8) === 13 &&
    head.subarray(12, 16).toString("ascii") === "IHDR" &&
    head.readUInt32BE(16) > 0 &&
    head.readUInt32BE(20) > 0 &&
    head.readUInt32BE(29) === crc32(head.subarray(12, 29))
  ) {
    return ".png";
  }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return ".jpg";
  if (head.length >= 12 && head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") {
    const declaredBytes = head.readUInt32LE(4) + 8;
    if (declaredBytes === actualBytes) return ".webp";
  }
  if (head.length >= 16 && head.subarray(4, 8).toString("ascii") === "ftyp") {
    const boxBytes = head.readUInt32BE(0);
    const majorBrand = head.subarray(8, 12);
    if (boxBytes >= 16 && boxBytes <= actualBytes && majorBrand.some((byte) => byte !== 0 && byte !== 0x20)) return ".mp4";
  }
  if (hasWebmSignature(head, actualBytes)) return ".webm";
  return "";
}

function unsafeZipEntry(name) {
  if (!name || name.includes("\0") || name.includes("\\") || name.startsWith("/") || /^[a-z]:/i.test(name)) return true;
  const parts = name.split("/");
  return parts.some((part, index) => part === ".." || (part === "" && index !== parts.length - 1));
}

async function parseZip(handle, actualBytes) {
  const tailBytes = Math.min(actualBytes, 22 + 0xffff);
  const tailOffset = actualBytes - tailBytes;
  const tail = await readExactly(handle, tailBytes, tailOffset);
  let endIndex = -1;
  for (let index = tail.length - 22; index >= 0; index -= 1) {
    if (tail.readUInt32LE(index) !== 0x06054b50) continue;
    const commentBytes = tail.readUInt16LE(index + 20);
    if (tailOffset + index + 22 + commentBytes === actualBytes) {
      endIndex = index;
      break;
    }
  }
  if (endIndex === -1) throw new Error("Upload ZIP end record is missing or truncated");

  const disk = tail.readUInt16LE(endIndex + 4);
  const centralDisk = tail.readUInt16LE(endIndex + 6);
  const diskEntries = tail.readUInt16LE(endIndex + 8);
  const entryCount = tail.readUInt16LE(endIndex + 10);
  const centralBytes = tail.readUInt32LE(endIndex + 12);
  const centralOffset = tail.readUInt32LE(endIndex + 16);
  const endOffset = tailOffset + endIndex;
  if (
    disk !== 0 ||
    centralDisk !== 0 ||
    diskEntries === 0xffff ||
    entryCount === 0xffff ||
    centralBytes === 0xffffffff ||
    centralOffset === 0xffffffff ||
    diskEntries !== entryCount ||
    entryCount > MAX_ZIP_ENTRIES ||
    centralBytes > MAX_CENTRAL_DIRECTORY_BYTES ||
    centralOffset + centralBytes !== endOffset
  ) {
    throw new Error("Upload ZIP structure is unsupported or invalid");
  }

  const central = await readExactly(handle, centralBytes, centralOffset);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = new Map();
  let cursor = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > central.length || central.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Upload ZIP central directory is invalid");
    }
    const flags = central.readUInt16LE(cursor + 8);
    const method = central.readUInt16LE(cursor + 10);
    const checksum = central.readUInt32LE(cursor + 16);
    const compressedBytes = central.readUInt32LE(cursor + 20);
    const uncompressedBytes = central.readUInt32LE(cursor + 24);
    const nameBytes = central.readUInt16LE(cursor + 28);
    const extraBytes = central.readUInt16LE(cursor + 30);
    const commentBytes = central.readUInt16LE(cursor + 32);
    const startDisk = central.readUInt16LE(cursor + 34);
    const localOffset = central.readUInt32LE(cursor + 42);
    const recordBytes = 46 + nameBytes + extraBytes + commentBytes;
    if (
      nameBytes === 0 ||
      cursor + recordBytes > central.length ||
      startDisk !== 0 ||
      compressedBytes === 0xffffffff ||
      uncompressedBytes === 0xffffffff ||
      localOffset === 0xffffffff ||
      (flags & 0x0001) !== 0 ||
      ![0, 8].includes(method)
    ) {
      throw new Error("Upload ZIP entry metadata is invalid");
    }
    let name;
    try {
      name = decoder.decode(central.subarray(cursor + 46, cursor + 46 + nameBytes));
    } catch {
      throw new Error("Upload ZIP entry name is not valid UTF-8");
    }
    if (unsafeZipEntry(name) || entries.has(name)) throw new Error("Upload ZIP entry path is unsafe or duplicated");

    const local = await readExactly(handle, 30, localOffset);
    if (local.readUInt32LE(0) !== 0x04034b50) throw new Error("Upload ZIP local entry is invalid");
    const localFlags = local.readUInt16LE(6);
    const localMethod = local.readUInt16LE(8);
    const localChecksum = local.readUInt32LE(14);
    const localCompressedBytes = local.readUInt32LE(18);
    const localUncompressedBytes = local.readUInt32LE(22);
    const localNameBytes = local.readUInt16LE(26);
    const localExtraBytes = local.readUInt16LE(28);
    const localName = await readExactly(handle, localNameBytes, localOffset + 30);
    if (
      localFlags !== flags ||
      localMethod !== method ||
      localNameBytes !== nameBytes ||
      localCompressedBytes === 0xffffffff ||
      localUncompressedBytes === 0xffffffff ||
      ((flags & 0x0008) === 0 &&
        (localChecksum !== checksum ||
          localCompressedBytes !== compressedBytes ||
          localUncompressedBytes !== uncompressedBytes)) ||
      !localName.equals(central.subarray(cursor + 46, cursor + 46 + nameBytes))
    ) {
      throw new Error("Upload ZIP local and central entries do not match");
    }
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes;
    if (dataOffset + compressedBytes > centralOffset) throw new Error("Upload ZIP entry data is out of bounds");
    entries.set(name, {
      checksum,
      compressedBytes,
      dataOffset,
      flags,
      method,
      name,
      uncompressedBytes
    });
    cursor += recordBytes;
  }
  if (cursor !== central.length) throw new Error("Upload ZIP central directory length does not match");
  return entries;
}

async function readZipEntry(handle, entry, maxBytes) {
  if (
    entry.uncompressedBytes > maxBytes ||
    entry.compressedBytes > maxBytes ||
    (entry.uncompressedBytes > 0 && entry.compressedBytes === 0) ||
    (entry.compressedBytes > 0 && entry.uncompressedBytes / entry.compressedBytes > MAX_OFFICE_COMPRESSION_RATIO)
  ) {
    throw new Error("Upload Office entry exceeds its size or compression-ratio limit");
  }
  const compressed = await readExactly(handle, entry.compressedBytes, entry.dataOffset);
  let output;
  if (entry.method === 0) {
    output = compressed;
  } else {
    try {
      output = zlib.inflateRawSync(compressed, { maxOutputLength: maxBytes });
    } catch {
      throw new Error("Upload Office metadata cannot be decompressed safely");
    }
  }
  if (output.length !== entry.uncompressedBytes) throw new Error("Upload Office entry size does not match");
  if (crc32(output) !== entry.checksum) throw new Error("Upload Office entry CRC does not match");
  return output;
}

async function validateOfficeArchiveEntries(handle, entries, retainedLimits) {
  let aggregateBytes = 0;
  for (const entry of entries.values()) {
    const maxBytes = retainedLimits.get(entry.name) ?? MAX_OFFICE_ENTRY_BYTES;
    if (entry.name.endsWith("/") && entry.uncompressedBytes !== 0) {
      throw new Error("Upload Office directory entry contains data");
    }
    if (
      entry.uncompressedBytes > maxBytes ||
      entry.compressedBytes > maxBytes ||
      (entry.uncompressedBytes > 0 && entry.compressedBytes === 0) ||
      (entry.compressedBytes > 0 && entry.uncompressedBytes / entry.compressedBytes > MAX_OFFICE_COMPRESSION_RATIO)
    ) {
      throw new Error("Upload Office entry exceeds its size or compression-ratio limit");
    }
    aggregateBytes += entry.uncompressedBytes;
    if (aggregateBytes > MAX_OFFICE_ARCHIVE_BYTES) {
      throw new Error("Upload Office archive exceeds its aggregate uncompressed-size limit");
    }
  }

  const retained = new Map();
  for (const entry of entries.values()) {
    const maxBytes = retainedLimits.get(entry.name) ?? MAX_OFFICE_ENTRY_BYTES;
    const output = await readZipEntry(handle, entry, maxBytes);
    if (retainedLimits.has(entry.name)) retained.set(entry.name, output);
  }
  return retained;
}

function stripXmlComments(xml) {
  let cursor = 0;
  let result = "";
  while (cursor < xml.length) {
    const start = xml.indexOf("<!--", cursor);
    if (start === -1) {
      result += xml.slice(cursor);
      break;
    }
    result += xml.slice(cursor, start);
    const end = xml.indexOf("-->", start + 4);
    if (end === -1) throw new Error("Upload Office XML comment is not terminated");
    cursor = end + 3;
  }
  if (result.includes("-->")) throw new Error("Upload Office XML comment is malformed");
  return result;
}

function parseXmlAttributes(source) {
  const attributes = new Map();
  let cursor = 0;
  while (cursor < source.length) {
    while (/\s/u.test(source[cursor] || "")) cursor += 1;
    if (cursor >= source.length) break;
    const nameMatch = source.slice(cursor).match(/^[A-Za-z_][A-Za-z0-9_.:-]*/u);
    if (!nameMatch) throw new Error("Upload Office XML attribute name is invalid");
    const name = nameMatch[0];
    cursor += name.length;
    while (/\s/u.test(source[cursor] || "")) cursor += 1;
    if (source[cursor] !== "=") throw new Error("Upload Office XML attribute assignment is invalid");
    cursor += 1;
    while (/\s/u.test(source[cursor] || "")) cursor += 1;
    const quote = source[cursor];
    if (quote !== '"' && quote !== "'") throw new Error("Upload Office XML attribute must be quoted");
    cursor += 1;
    const end = source.indexOf(quote, cursor);
    if (end === -1) throw new Error("Upload Office XML attribute quote is not terminated");
    const value = source.slice(cursor, end);
    if (value.includes("<") || attributes.has(name)) throw new Error("Upload Office XML attribute is invalid or duplicated");
    attributes.set(name, value);
    cursor = end + 1;
  }
  return attributes;
}

function parseOfficeXml(buffer, visitor = () => {}) {
  if (containsBinaryControl(buffer)) throw new Error("Upload Office XML contains binary control bytes");
  let xml;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("Upload Office XML is not valid UTF-8");
  }
  xml = stripXmlComments(xml);
  xml = xml.replace(/^\s*<\?xml\s[^?]*\?>/iu, "");
  if (/<\?(?!xml\b)|<!/iu.test(xml)) throw new Error("Upload Office XML declarations, entities, or CDATA are not allowed");

  const tagPattern = /<(\/?)([A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?)([^<>]*?)(\/?)>/gu;
  const stack = [];
  let root = null;
  let cursor = 0;
  for (const match of xml.matchAll(tagPattern)) {
    const gap = xml.slice(cursor, match.index);
    if (gap.includes("<") || (stack.length === 0 && gap.trim())) throw new Error("Upload Office XML has invalid text outside its root");
    const closing = match[1] === "/";
    const qname = match[2];
    const attributeSource = match[3];
    const selfClosing = match[4] === "/";
    if (closing) {
      if (attributeSource.trim() || selfClosing || stack.at(-1)?.qname !== qname) {
        throw new Error("Upload Office XML closing tag does not match");
      }
      stack.pop();
    } else {
      const attributes = parseXmlAttributes(attributeSource);
      const [prefix, localName] = qname.includes(":") ? qname.split(":") : ["", qname];
      const parent = stack.at(-1) || null;
      const namespaces = new Map(parent?.namespaces || []);
      for (const [name, value] of attributes) {
        if (name === "xmlns") namespaces.set("", value);
        else if (name.startsWith("xmlns:")) namespaces.set(name.slice("xmlns:".length), value);
      }
      const element = {
        attributes,
        depth: stack.length,
        localName,
        namespace: namespaces.get(prefix) || "",
        namespaces,
        parent,
        prefix,
        qname
      };
      if (stack.length === 0) {
        if (root) throw new Error("Upload Office XML has multiple root elements");
        root = element;
      }
      visitor(element);
      if (!selfClosing) stack.push(element);
    }
    cursor = match.index + match[0].length;
  }
  const tail = xml.slice(cursor);
  if (!root || stack.length !== 0 || tail.includes("<") || tail.trim()) {
    throw new Error("Upload Office XML document is incomplete or malformed");
  }
  return root;
}

function elementNamespace(element) {
  return element.namespace;
}

async function validateZipOrOffice(handle, actualBytes, extension) {
  const entries = await parseZip(handle, actualBytes);
  if (extension === ".zip") return;
  const office = OFFICE_FORMATS[extension];
  const contentTypesEntry = entries.get("[Content_Types].xml");
  const relationshipsEntry = entries.get("_rels/.rels");
  const mainEntry = entries.get(office.main);
  if (!contentTypesEntry || !relationshipsEntry || !mainEntry || mainEntry.uncompressedBytes === 0) {
    throw new Error(`Upload Office ${extension} structure is incomplete`);
  }

  const retained = await validateOfficeArchiveEntries(
    handle,
    entries,
    new Map([
      [contentTypesEntry.name, MAX_OFFICE_METADATA_BYTES],
      [relationshipsEntry.name, MAX_OFFICE_METADATA_BYTES],
      [mainEntry.name, MAX_OFFICE_MAIN_BYTES]
    ])
  );
  const contentTypes = retained.get(contentTypesEntry.name);
  const relationships = retained.get(relationshipsEntry.name);
  const main = retained.get(mainEntry.name);

  let mainPartOverrides = 0;
  let matchingOverrides = 0;
  const contentTypesRoot = parseOfficeXml(contentTypes, (element) => {
    if (
      element.depth === 1 &&
      element.localName === "Override" &&
      element.parent?.localName === "Types" &&
      elementNamespace(element) === CONTENT_TYPES_NAMESPACE &&
      element.attributes.get("PartName") === `/${office.main}`
    ) {
      mainPartOverrides += 1;
      if (element.attributes.get("ContentType") === office.contentType) matchingOverrides += 1;
    }
  });
  if (
    contentTypesRoot.localName !== "Types" ||
    elementNamespace(contentTypesRoot) !== CONTENT_TYPES_NAMESPACE ||
    mainPartOverrides !== 1 ||
    matchingOverrides !== 1
  ) {
    throw new Error(`Upload Office ${extension} content types do not match its structure`);
  }

  let officeRelationships = 0;
  let matchingRelationships = 0;
  const relationshipsRoot = parseOfficeXml(relationships, (element) => {
    const target = String(element.attributes.get("Target") || "").replace(/^\/+/, "");
    const targetMode = element.attributes.get("TargetMode");
    if (
      element.depth === 1 &&
      element.localName === "Relationship" &&
      element.parent?.localName === "Relationships" &&
      elementNamespace(element) === RELATIONSHIPS_NAMESPACE &&
      element.attributes.get("Type") === OFFICE_RELATIONSHIP_TYPE
    ) {
      officeRelationships += 1;
      if (target === office.main && (!targetMode || targetMode.toLowerCase() === "internal")) {
        matchingRelationships += 1;
      }
    }
  });
  if (
    relationshipsRoot.localName !== "Relationships" ||
    elementNamespace(relationshipsRoot) !== RELATIONSHIPS_NAMESPACE ||
    officeRelationships !== 1 ||
    matchingRelationships !== 1
  ) {
    throw new Error(`Upload Office ${extension} relationships do not match its structure`);
  }

  const mainRoot = parseOfficeXml(main);
  if (mainRoot.localName !== office.root || elementNamespace(mainRoot) !== office.namespace) {
    throw new Error(`Upload Office ${extension} main XML root does not match its format`);
  }
}

function containsBinaryControl(buffer) {
  return buffer.some(
    (byte) => byte === 0 || byte === 0x7f || (byte < 0x09) || (byte > 0x0d && byte < 0x20) || byte === 0x0b || byte === 0x0c
  );
}

async function validateText(handle, actualBytes) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let position = 0;
  let leading = true;
  try {
    while (position < actualBytes) {
      const length = Math.min(TEXT_CHUNK_BYTES, actualBytes - position);
      const chunk = await readExactly(handle, length, position);
      if (containsBinaryControl(chunk)) throw new Error("Upload text contains binary control bytes");
      const decoded = decoder.decode(chunk, { stream: position + length < actualBytes });
      if (leading) {
        for (const character of decoded) {
          if (character === "\ufeff" || /\s/u.test(character)) continue;
          if (character === "<") throw new Error("Upload text begins with markup");
          leading = false;
          break;
        }
      }
      position += length;
    }
    decoder.decode();
  } catch (error) {
    if (/Upload text/.test(error?.message || "")) throw error;
    throw new Error("Upload text is not valid UTF-8");
  }
}

async function validateContents(handle, actualBytes, extension) {
  if ([".txt", ".csv"].includes(extension)) {
    await validateText(handle, actualBytes);
    return extension;
  }
  if ([".zip", ".docx", ".xlsx", ".pptx"].includes(extension)) {
    await validateZipOrOffice(handle, actualBytes, extension);
    return ".zip";
  }
  const head = await readExactly(handle, Math.min(HEAD_BYTES, actualBytes), 0);
  const detected = basicSignature(head, actualBytes);
  const expected = extension === ".jpeg" ? ".jpg" : extension;
  if (detected !== expected) throw new Error("Upload signature does not match its extension or is truncated");
  return detected;
}

async function validateStagedUpload(file, policy) {
  validatePolicy(policy);
  const extension = validateOriginalName(file, policy);
  if (!Number.isSafeInteger(file?.size) || file.size <= 0 || file.size > policy.maxBytes) {
    throw new Error("Upload reported size is invalid or exceeds policy");
  }
  if (typeof file.path !== "string" || !file.path || file.path.includes("\0")) throw new Error("Upload staged file path is invalid");

  const before = await lstatBigInt(file.path);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error("Upload staged path must be a regular file, not a symlink");
  if (before.size <= 0n || before.size > BigInt(policy.maxBytes) || before.size !== BigInt(file.size)) {
    throw new Error("Upload actual file size is invalid, oversized, or mismatched");
  }

  const flags = FS_CONSTANTS.O_RDONLY | (FS_CONSTANTS.O_NOFOLLOW || 0);
  let handle;
  let detected;
  try {
    handle = await fs.open(file.path, flags);
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameIdentity(before, opened)) throw new Error("Upload staged file changed during validation");
    detected = await validateContents(handle, Number(before.size), extension);
  } finally {
    if (handle) await handle.close();
  }

  const after = await lstatBigInt(file.path);
  if (!after.isFile() || after.isSymbolicLink() || !sameIdentity(before, after)) {
    throw new Error("Upload staged file changed during validation");
  }
  const record = {
    extension,
    identity: after,
    originalname: file.originalname,
    path: file.path,
    size: file.size
  };
  validatedFiles.set(file, record);
  return { bytes: file.size, detected, extension };
}

function commonAncestor(left, right) {
  const target = path.resolve(right);
  let candidate = path.resolve(left);
  while (true) {
    const relative = path.relative(candidate, target);
    if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
      return candidate;
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) return candidate;
    candidate = parent;
  }
}

async function ensureDirectory(directory, sourcePath) {
  if (typeof directory !== "string" || !directory || directory.includes("\0")) {
    throw new Error("Upload destination directory is invalid");
  }
  const absolute = path.resolve(directory);
  const anchor = commonAncestor(path.dirname(path.resolve(sourcePath)), absolute);
  const anchorDetails = await lstatBigInt(anchor);
  if (anchorDetails.isSymbolicLink() || !anchorDetails.isDirectory()) {
    throw new Error("Upload source and destination must share a real directory ancestor");
  }
  let next = anchor;
  for (const part of path.relative(anchor, absolute).split(path.sep).filter(Boolean)) {
    next = path.join(next, part);
    try {
      await fs.mkdir(next, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const details = await lstatBigInt(next);
    if (details.isSymbolicLink() || !details.isDirectory()) throw new Error("Upload destination must be a real directory");
  }
  return absolute;
}

async function placeStagedUpload(file, directory) {
  const record = file && typeof file === "object" ? validatedFiles.get(file) : null;
  if (!record || file.path !== record.path || file.originalname !== record.originalname || file.size !== record.size) {
    throw new Error("Upload must be validated before placement");
  }

  const current = await lstatBigInt(record.path);
  if (current.isSymbolicLink() || !current.isFile() || !sameIdentity(record.identity, current)) {
    throw new Error("Upload staged file changed after validation");
  }
  const absoluteDirectory = await ensureDirectory(directory, record.path);

  for (let attempt = 0; attempt < MAX_DESTINATION_ATTEMPTS; attempt += 1) {
    const filename = safeUploadFilename(record.originalname);
    const absolutePath = resolveInside(absoluteDirectory, filename);
    if (!absolutePath) throw new Error("Upload destination filename is invalid");

    let linked = false;
    try {
      try {
        await fs.link(record.path, absolutePath);
        linked = true;
      } catch (error) {
        if (error?.code === "EEXIST") continue;
        throw error;
      }
      const [sourceAfterLink, destinationAfterLink] = await Promise.all([
        lstatBigInt(record.path),
        lstatBigInt(absolutePath)
      ]);
      if (
        sourceAfterLink.isSymbolicLink() ||
        destinationAfterLink.isSymbolicLink() ||
        !sourceAfterLink.isFile() ||
        !destinationAfterLink.isFile() ||
        !sameValidatedInode(record.identity, sourceAfterLink) ||
        !sameIdentity(sourceAfterLink, destinationAfterLink)
      ) {
        throw new Error("Upload staged file changed while being placed");
      }

      const beforeUnlink = await lstatBigInt(record.path);
      if (!beforeUnlink.isFile() || beforeUnlink.isSymbolicLink() || !sameIdentity(sourceAfterLink, beforeUnlink)) {
        throw new Error("Upload staged file changed before promotion completed");
      }
      await fs.unlink(record.path);
    } catch (error) {
      if (linked) {
        try {
          await fs.unlink(absolutePath);
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "Upload promotion failed and destination cleanup also failed");
        }
      }
      throw error;
    }
    validatedFiles.delete(file);
    return { absolutePath, filename };
  }
  throw new Error("Upload destination collision limit reached");
}

async function lstatOrNull(target) {
  try {
    return await lstatBigInt(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function removeContainedFile(root, relativePath) {
  if (typeof root !== "string" || typeof relativePath !== "string") return false;
  const absoluteRoot = path.resolve(root);
  const absolute = resolveInside(absoluteRoot, relativePath);
  if (!absolute) return false;

  const rootDetails = await lstatOrNull(absoluteRoot);
  if (!rootDetails || rootDetails.isSymbolicLink() || !rootDetails.isDirectory()) return false;
  const relative = path.relative(absoluteRoot, absolute);
  const parts = relative.split(path.sep);
  let parent = absoluteRoot;
  for (const part of parts.slice(0, -1)) {
    parent = path.join(parent, part);
    const details = await lstatOrNull(parent);
    if (!details || details.isSymbolicLink() || !details.isDirectory()) return false;
  }

  const target = await lstatOrNull(absolute);
  if (!target || target.isSymbolicLink() || !target.isFile()) return false;
  await fs.unlink(absolute);
  return true;
}

module.exports = {
  UPLOAD_POLICIES,
  placeStagedUpload,
  removeContainedFile,
  resolveInside,
  safeUploadFilename,
  validateStagedUpload
};
