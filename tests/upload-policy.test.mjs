import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { deflateRawSync } from "node:zlib";

const require = createRequire(import.meta.url);
const crypto = require("node:crypto");
const fsPromises = require("node:fs/promises");
const {
  UPLOAD_POLICIES,
  placeStagedUpload,
  removeContainedFile,
  resolveInside,
  safeUploadFilename,
  validateStagedUpload
} = require("../security/upload-policy.cjs");

const PDF = Buffer.from("%PDF-1.7\n");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489", "hex");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);
const MATROSKA = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x8b, 0x42, 0x82, 0x88, 0x6d, 0x61, 0x74, 0x72, 0x6f, 0x73, 0x6b, 0x61]);

function webpFixture() {
  const value = Buffer.alloc(16);
  value.write("RIFF", 0, "ascii");
  value.writeUInt32LE(value.length - 8, 4);
  value.write("WEBP", 8, "ascii");
  value.write("VP8 ", 12, "ascii");
  return value;
}

function mp4Fixture() {
  const value = Buffer.alloc(24);
  value.writeUInt32BE(value.length, 0);
  value.write("ftyp", 4, "ascii");
  value.write("isom", 8, "ascii");
  value.writeUInt32BE(0x200, 12);
  value.write("isom", 16, "ascii");
  value.write("iso2", 20, "ascii");
  return value;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFixture(entries, { compression = 0 } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [entryName, input] of entries) {
    const name = Buffer.from(entryName, "utf8");
    const data = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
    const compressed = compression === 8 ? deflateRawSync(data) : data;
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(compression, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(compression, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

const OFFICE = {
  docx: {
    main: "word/document.xml",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    root: "document",
    namespace: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    mainXml: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'
  },
  xlsx: {
    main: "xl/workbook.xml",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    root: "workbook",
    namespace: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    mainXml: '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>'
  },
  pptx: {
    main: "ppt/presentation.xml",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
    root: "presentation",
    namespace: "http://schemas.openxmlformats.org/presentationml/2006/main",
    mainXml: '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/></p:presentation>'
  }
};

function officeFixture(
  kind,
  {
    commentMetadata = false,
    compression = 8,
    duplicateMetadata = false,
    extraEntries = [],
    includeMain = true,
    mainContents,
    namespaceSpoof = false
  } = {}
) {
  const office = OFFICE[kind];
  const prefix = namespaceSpoof ? "evil:" : "";
  const evilNamespace = namespaceSpoof ? ' xmlns:evil="urn:aix:evil"' : "";
  const override = `<${prefix}Override PartName="/${office.main}" ContentType="${office.contentType}"/>`;
  const duplicateOverride = duplicateMetadata
    ? `<Override PartName="/${office.main}" ContentType="application/octet-stream"/>`
    : "";
  const relationship = `<${prefix}Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${office.main}"/>`;
  const duplicateRelationship = duplicateMetadata
    ? '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="evil.xml"/>'
    : "";
  const entries = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"${evilNamespace}>${commentMetadata ? `<!--${override}-->` : override}${duplicateOverride}</Types>`
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"${evilNamespace}>${commentMetadata ? `<!--${relationship}-->` : relationship}${duplicateRelationship}</Relationships>`
    ]
  ];
  if (includeMain) entries.push([office.main, mainContents ?? `<?xml version="1.0"?>${office.mainXml}`]);
  entries.push(...extraEntries);
  return zipFixture(entries, { compression });
}

function locateZipEntry(buffer, requestedName) {
  let endOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }
  assert.notEqual(endOffset, -1);
  let cursor = buffer.readUInt32LE(endOffset + 16);
  const entries = buffer.readUInt16LE(endOffset + 10);
  for (let index = 0; index < entries; index += 1) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50);
    const nameBytes = buffer.readUInt16LE(cursor + 28);
    const extraBytes = buffer.readUInt16LE(cursor + 30);
    const commentBytes = buffer.readUInt16LE(cursor + 32);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameBytes).toString("utf8");
    if (name === requestedName) return { centralOffset: cursor, localOffset: buffer.readUInt32LE(cursor + 42) };
    cursor += 46 + nameBytes + extraBytes + commentBytes;
  }
  throw new Error(`Missing ZIP fixture entry: ${requestedName}`);
}

function withEntryMetadata(buffer, entryName, { crc, uncompressedBytes } = {}) {
  const mutated = Buffer.from(buffer);
  const entry = locateZipEntry(mutated, entryName);
  if (crc !== undefined) {
    mutated.writeUInt32LE(crc >>> 0, entry.centralOffset + 16);
    mutated.writeUInt32LE(crc >>> 0, entry.localOffset + 14);
  }
  if (uncompressedBytes !== undefined) {
    mutated.writeUInt32LE(uncompressedBytes >>> 0, entry.centralOffset + 24);
    mutated.writeUInt32LE(uncompressedBytes >>> 0, entry.localOffset + 22);
  }
  return mutated;
}

async function temporaryRoot(t, prefix = "aix-upload-") {
  const canonicalTmp = await realpath(tmpdir());
  const root = await mkdtemp(join(canonicalTmp, prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function stage(root, diskName, originalname, contents) {
  const path = join(root, diskName);
  const data = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  await writeFile(path, data);
  return { path, originalname, size: data.length };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

test("declares the replay and resource upload boundaries", () => {
  assert.equal(UPLOAD_POLICIES.replay.maxBytes, 500 * 1024 * 1024);
  assert.deepEqual([...UPLOAD_POLICIES.replay.extensions], [".mp4", ".webm"]);
  assert.equal(UPLOAD_POLICIES.resource.maxBytes, 50 * 1024 * 1024);
  assert.deepEqual(
    [...UPLOAD_POLICIES.resource.extensions],
    [".pdf", ".zip", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".webp"]
  );
});

test("preserves safe filename text while adding an unpredictable server prefix", () => {
  const generated = safeUploadFilename("Quarterly_Report-2026.PDF");
  assert.match(generated, /^\d+-[a-f0-9]{16,}-Quarterly_Report-2026\.pdf$/);
  assert.equal(generated.includes("/"), false);
  assert.equal(generated.includes("\\"), false);

  const longUnicode = safeUploadFilename(`${"ก".repeat(200)}.pdf`);
  assert.ok(Buffer.byteLength(longUnicode, "utf8") <= 240, Buffer.byteLength(longUnicode, "utf8"));
  assert.ok(longUnicode.endsWith(".pdf"));
});

test("rejects separators, traversal, dotfiles, unsupported types, and extension disguises before disk access", async () => {
  const dangerousNames = [
    "../guide.pdf",
    "folder/guide.pdf",
    "..\\guide.pdf",
    "folder\\guide.pdf",
    "guide\0.pdf",
    ".hidden.pdf",
    "payload.html",
    "image.svg",
    "guide.pdf.exe",
    "guide.exe.pdf",
    "guide.lnk.pdf",
    "guide.ps1.pdf",
    "guide.pdf.jpg",
    "guide..pdf",
    " guide.pdf",
    "guide.pdf "
  ];
  for (const originalname of dangerousNames) {
    await assert.rejects(
      validateStagedUpload({ path: "/definitely/not/a/staged/file", originalname, size: 1 }, UPLOAD_POLICIES.resource),
      /name|extension/i,
      originalname
    );
  }
});

test("accepts ordinary dotted names and uppercase allowed extensions", async (t) => {
  const root = await temporaryRoot(t);
  const file = await stage(root, "safe.tmp", "quarterly.v2-final.PDF", PDF);
  const result = await validateStagedUpload(file, UPLOAD_POLICIES.resource);
  assert.equal(result.extension, ".pdf");
  assert.equal(result.bytes, PDF.length);
});

test("resolves only lexical descendants on exact path-component boundaries", () => {
  const root = resolve("/safe/root");
  assert.equal(resolveInside(root, "folder/file.pdf"), join(root, "folder/file.pdf"));
  assert.equal(resolveInside(root, "folder/../file.pdf"), join(root, "file.pdf"));
  for (const candidate of [".", "..", "../escape", "..\\escape", "/absolute/escape", "../../root-other/file"] ) {
    assert.equal(resolveInside(root, candidate), null, candidate);
  }
});

test("uses regular-file stat size and requires one matching positive finite reported size", async (t) => {
  const root = await temporaryRoot(t);
  const file = await stage(root, "size.tmp", "guide.pdf", PDF);
  const exactPolicy = { maxBytes: PDF.length, extensions: new Set([".pdf"]) };
  await assert.doesNotReject(validateStagedUpload(file, exactPolicy));

  for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, PDF.length - 1, PDF.length + 1, String(PDF.length)]) {
    await assert.rejects(validateStagedUpload({ ...file, size }, exactPolicy), /size/i, String(size));
  }
  await assert.rejects(
    validateStagedUpload(file, { ...exactPolicy, maxBytes: PDF.length - 1 }),
    /size/i
  );

  const empty = await stage(root, "empty.tmp", "empty.pdf", Buffer.alloc(0));
  await assert.rejects(validateStagedUpload(empty, exactPolicy), /size/i);

  const directory = join(root, "directory.tmp");
  await mkdir(directory);
  await assert.rejects(
    validateStagedUpload({ path: directory, originalname: "guide.pdf", size: PDF.length }, exactPolicy),
    /regular|file/i
  );

  const linked = join(root, "linked.tmp");
  await symlink(file.path, linked);
  await assert.rejects(
    validateStagedUpload({ path: linked, originalname: "guide.pdf", size: PDF.length }, exactPolicy),
    /regular|symlink|file/i
  );
});

test("accepts exact PDF PNG JPEG WebP MP4 and WebM signatures", async (t) => {
  const root = await temporaryRoot(t);
  const samples = [
    ["pdf", "guide.pdf", PDF, UPLOAD_POLICIES.resource],
    ["png", "image.png", PNG, UPLOAD_POLICIES.resource],
    ["jpg", "photo.jpg", JPEG, UPLOAD_POLICIES.resource],
    ["jpeg", "photo.jpeg", JPEG, UPLOAD_POLICIES.resource],
    ["webp", "image.webp", webpFixture(), UPLOAD_POLICIES.resource],
    ["mp4", "clip.mp4", mp4Fixture(), UPLOAD_POLICIES.replay],
    ["webm", "clip.webm", WEBM, UPLOAD_POLICIES.replay]
  ];
  for (const [diskName, originalname, contents, policy] of samples) {
    const file = await stage(root, `${diskName}.tmp`, originalname, contents);
    await assert.doesNotReject(validateStagedUpload(file, policy), originalname);
  }
});

test("rejects markup, truncated magic bytes, and cross-type signature mismatches", async (t) => {
  const root = await temporaryRoot(t);
  const samples = [
    ["html.tmp", "guide.pdf", "<html><script>alert(1)</script>", UPLOAD_POLICIES.resource],
    ["pdf.tmp", "guide.pdf", "%PDF", UPLOAD_POLICIES.resource],
    ["pdf-version.tmp", "guide.pdf", "%PDF-X.Y\n", UPLOAD_POLICIES.resource],
    ["png.tmp", "image.png", PNG.subarray(0, 7), UPLOAD_POLICIES.resource],
    ["png-signature.tmp", "image.png", PNG.subarray(0, 8), UPLOAD_POLICIES.resource],
    ["jpg.tmp", "photo.jpg", JPEG.subarray(0, 2), UPLOAD_POLICIES.resource],
    ["webp.tmp", "image.webp", Buffer.from("RIFF0000WEB"), UPLOAD_POLICIES.resource],
    ["mp4.tmp", "clip.mp4", mp4Fixture().subarray(0, 12), UPLOAD_POLICIES.replay],
    ["webm.tmp", "clip.webm", WEBM.subarray(0, 3), UPLOAD_POLICIES.replay],
    ["webm-signature.tmp", "clip.webm", WEBM.subarray(0, 4), UPLOAD_POLICIES.replay],
    ["matroska.tmp", "clip.webm", MATROSKA, UPLOAD_POLICIES.replay],
    ["mismatch.tmp", "clip.webm", mp4Fixture(), UPLOAD_POLICIES.replay]
  ];
  for (const [diskName, originalname, contents, policy] of samples) {
    const file = await stage(root, diskName, originalname, contents);
    await assert.rejects(validateStagedUpload(file, policy), /signature|format|truncated/i, originalname);
  }
});

test("accepts a well-formed ZIP and discriminates DOCX XLSX and PPTX structures", async (t) => {
  const root = await temporaryRoot(t);
  const generic = await stage(root, "generic.tmp", "bundle.zip", zipFixture([["readme.txt", "hello"]]));
  await assert.doesNotReject(validateStagedUpload(generic, UPLOAD_POLICIES.resource));

  for (const kind of Object.keys(OFFICE)) {
    const file = await stage(
      root,
      `${kind}.tmp`,
      `document.${kind}`,
      officeFixture(kind, { extraEntries: [[`${kind}/media/preview.bin`, Buffer.from([0, 1, 2, 3, 4])]] })
    );
    await assert.doesNotReject(validateStagedUpload(file, UPLOAD_POLICIES.resource), kind);
  }
});

test("rejects arbitrary PK data, missing Office parts, cross-Office disguises, and unsafe ZIP entries", async (t) => {
  const root = await temporaryRoot(t);
  const samples = [
    ["pk.tmp", "fake.zip", Buffer.from("PK not a zip")],
    ["generic.tmp", "fake.docx", zipFixture([["readme.txt", "hello"]])],
    ["missing.tmp", "broken.docx", officeFixture("docx", { includeMain: false })],
    ["cross.tmp", "fake.xlsx", officeFixture("docx")],
    ["unsafe.tmp", "unsafe.zip", zipFixture([["../outside.txt", "bad"]])]
  ];
  for (const [diskName, originalname, contents] of samples) {
    const file = await stage(root, diskName, originalname, contents);
    await assert.rejects(validateStagedUpload(file, UPLOAD_POLICIES.resource), /zip|office|structure|entry|format/i, originalname);
  }
});

test("rejects Office comment spoofing, unsafe XML, invalid main parts, CRC mismatch, and advertised ZIP bombs", async (t) => {
  const root = await temporaryRoot(t);
  const office = OFFICE.docx;
  const crcSource = officeFixture("docx");
  const crcLocation = locateZipEntry(crcSource, office.main);
  const crcMismatch = withEntryMetadata(crcSource, office.main, {
    crc: crcSource.readUInt32LE(crcLocation.centralOffset + 16) ^ 0xffffffff
  });
  const ratioBomb = withEntryMetadata(officeFixture("docx"), office.main, { uncompressedBytes: 4 * 1024 * 1024 });
  const advertisedBomb = withEntryMetadata(officeFixture("docx"), office.main, { uncompressedBytes: 0xffffffff });
  const extraSource = officeFixture("docx", { extraEntries: [["word/media/preview.bin", Buffer.from([1])]] });
  const extraLocation = locateZipEntry(extraSource, "word/media/preview.bin");
  const extraCrcMismatch = withEntryMetadata(extraSource, "word/media/preview.bin", {
    crc: extraSource.readUInt32LE(extraLocation.centralOffset + 16) ^ 0xffffffff
  });
  const extraAdvertisedBomb = withEntryMetadata(extraSource, "word/media/preview.bin", {
    uncompressedBytes: 0xffffffff
  });
  const cappedExtraName = "word/media/capped.bin";
  const cappedExtraSource = officeFixture("docx", {
    compression: 0,
    extraEntries: [[cappedExtraName, Buffer.alloc(384 * 1024)]]
  });
  const extraPerEntryLimit = withEntryMetadata(cappedExtraSource, cappedExtraName, {
    uncompressedBytes: 65 * 1024 * 1024
  });
  const aggregateNames = Array.from({ length: 5 }, (_, index) => `word/media/aggregate-${index}.bin`);
  let extraAggregateLimit = officeFixture("docx", {
    compression: 0,
    extraEntries: aggregateNames.map((name) => [name, Buffer.alloc(384 * 1024)])
  });
  for (const name of aggregateNames) {
    extraAggregateLimit = withEntryMetadata(extraAggregateLimit, name, {
      uncompressedBytes: 60 * 1024 * 1024
    });
  }
  const entityMain = `<?xml version="1.0"?><!DOCTYPE w:document [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${office.mainXml}`;
  const samples = [
    ["comment.tmp", "comment.docx", officeFixture("docx", { commentMetadata: true })],
    ["namespace.tmp", "namespace.docx", officeFixture("docx", { namespaceSpoof: true })],
    ["duplicate.tmp", "duplicate.docx", officeFixture("docx", { duplicateMetadata: true })],
    ["garbage.tmp", "garbage.docx", officeFixture("docx", { mainContents: "not Office XML" })],
    ["entity.tmp", "entity.docx", officeFixture("docx", { mainContents: entityMain })],
    ["crc.tmp", "crc.docx", crcMismatch],
    ["ratio.tmp", "ratio.docx", ratioBomb],
    ["bomb.tmp", "bomb.docx", advertisedBomb],
    ["extra-crc.tmp", "extra-crc.docx", extraCrcMismatch],
    ["extra-bomb.tmp", "extra-bomb.docx", extraAdvertisedBomb],
    ["extra-cap.tmp", "extra-cap.docx", extraPerEntryLimit],
    ["extra-aggregate.tmp", "extra-aggregate.docx", extraAggregateLimit]
  ];
  for (const [diskName, originalname, contents] of samples) {
    const file = await stage(root, diskName, originalname, contents);
    await assert.rejects(
      validateStagedUpload(file, UPLOAD_POLICIES.resource),
      /zip|office|xml|metadata|crc|size|ratio|structure|format/i,
      originalname
    );
  }
});

test("accepts complete UTF-8 text and rejects BOM-prefixed markup, binary controls, and invalid trailing UTF-8", async (t) => {
  const root = await temporaryRoot(t);
  const validText = Buffer.from("\ufeffหัวข้อ,รายละเอียด\nหนึ่ง,ข้อมูล\n", "utf8");
  const valid = await stage(root, "valid.tmp", "ข้อมูล.csv", validText);
  await assert.doesNotReject(validateStagedUpload(valid, UPLOAD_POLICIES.resource));

  const samples = [
    ["markup.tmp", "notes.txt", Buffer.from("\ufeff  \n\t<html><body>bad</body></html>", "utf8")],
    ["binary.tmp", "notes.txt", Buffer.from([0x61, 0x62, 0x00, 0x63])],
    ["invalid.tmp", "notes.txt", Buffer.concat([Buffer.alloc(70 * 1024, 0x61), Buffer.from([0xc3, 0x28])])],
    ["late-markup.tmp", "notes.txt", Buffer.concat([Buffer.from("\ufeff", "utf8"), Buffer.alloc(70 * 1024, 0x20), Buffer.from("<svg/>")])]
  ];
  for (const [diskName, originalname, contents] of samples) {
    const file = await stage(root, diskName, originalname, contents);
    await assert.rejects(validateStagedUpload(file, UPLOAD_POLICIES.resource), /text|utf|binary|markup/i, originalname);
  }
});

test("closes the staged file handle when validation fails", async (t) => {
  const root = await temporaryRoot(t);
  const file = await stage(root, "bad.tmp", "guide.pdf", Buffer.from("not a pdf"));
  const originalOpen = fsPromises.open;
  let closeCalls = 0;
  fsPromises.open = async function instrumentedOpen(...args) {
    const handle = await originalOpen.apply(this, args);
    const originalClose = handle.close;
    handle.close = async function instrumentedClose(...closeArgs) {
      closeCalls += 1;
      return originalClose.apply(this, closeArgs);
    };
    return handle;
  };
  try {
    await assert.rejects(validateStagedUpload(file, UPLOAD_POLICIES.resource), /signature|format/i);
  } finally {
    fsPromises.open = originalOpen;
  }
  assert.equal(closeCalls, 1);
});

test("places only the same validated regular file and removes the staged source", async (t) => {
  const root = await temporaryRoot(t, "aix-place-");
  const file = await stage(root, "staged.tmp", "Quarterly_Report-2026.pdf", PDF);
  await validateStagedUpload(file, UPLOAD_POLICIES.resource);
  const stagedIdentity = await lstat(file.path);
  const directory = join(root, "resources", "documents");
  const placed = await placeStagedUpload(file, directory);

  assert.equal(await readFile(placed.absolutePath, "utf8"), PDF.toString("utf8"));
  const placedIdentity = await lstat(placed.absolutePath);
  assert.equal(placedIdentity.dev, stagedIdentity.dev);
  assert.equal(placedIdentity.ino, stagedIdentity.ino);
  assert.equal(placed.absolutePath, join(directory, placed.filename));
  assert.equal(basename(placed.absolutePath), placed.filename);
  assert.match(placed.filename, /^\d+-[a-f0-9]{16,}-Quarterly_Report-2026\.pdf$/);
  assert.equal(await exists(file.path), false);

  const unvalidated = await stage(root, "unvalidated.tmp", "guide.pdf", PDF);
  await assert.rejects(placeStagedUpload(unvalidated, directory), /validat/i);
  assert.equal(await exists(unvalidated.path), true);

  const changed = await stage(root, "changed.tmp", "guide.pdf", PDF);
  await validateStagedUpload(changed, UPLOAD_POLICIES.resource);
  await writeFile(changed.path, Buffer.concat([PDF, Buffer.from("changed") ]));
  await assert.rejects(placeStagedUpload(changed, directory), /changed|validat|size/i);
  assert.equal(await exists(changed.path), true);
});

test("never overwrites a colliding destination and cleans up without moving the source", async (t) => {
  const root = await temporaryRoot(t, "aix-collision-");
  const directory = join(root, "resources");
  await mkdir(directory);
  const file = await stage(root, "staged.tmp", "guide.pdf", PDF);
  await validateStagedUpload(file, UPLOAD_POLICIES.resource);

  const originalNow = Date.now;
  const originalRandomBytes = crypto.randomBytes;
  Date.now = () => 1_700_000_000_000;
  crypto.randomBytes = (size) => Buffer.alloc(size, 0xab);
  try {
    const collidingName = safeUploadFilename(file.originalname);
    const collidingPath = join(directory, collidingName);
    await writeFile(collidingPath, "existing");
    await assert.rejects(placeStagedUpload(file, directory), /collision|exist/i);
    assert.equal(await readFile(collidingPath, "utf8"), "existing");
    assert.equal(await readFile(file.path, "utf8"), PDF.toString("utf8"));
  } finally {
    Date.now = originalNow;
    crypto.randomBytes = originalRandomBytes;
  }
});

test("refuses an existing destination reached through a symlinked intermediate directory", async (t) => {
  const root = await temporaryRoot(t, "aix-place-link-");
  const outside = await temporaryRoot(t, "aix-place-outside-");
  const outsideDirectory = join(outside, "existing");
  await mkdir(outsideDirectory);
  await symlink(outside, join(root, "linked-parent"));
  const file = await stage(root, "staged.tmp", "guide.pdf", PDF);
  await validateStagedUpload(file, UPLOAD_POLICIES.resource);

  await assert.rejects(
    placeStagedUpload(file, join(root, "linked-parent", "existing")),
    /destination|symlink|directory/i
  );
  assert.equal(await exists(file.path), true);
  assert.deepEqual(await fsPromises.readdir(outsideDirectory), []);
});

test("removes only regular files beneath a real root and refuses traversal or symlinked parents", async (t) => {
  const root = await temporaryRoot(t, "aix-remove-");
  const outside = await temporaryRoot(t, "aix-outside-");
  await mkdir(join(root, "nested"));
  const contained = join(root, "nested", "resource.pdf");
  await writeFile(contained, PDF);
  assert.equal(await removeContainedFile(root, "nested/resource.pdf"), true);
  assert.equal(await exists(contained), false);
  assert.equal(await removeContainedFile(root, "nested/resource.pdf"), false);

  const outsideFile = join(outside, "outside.pdf");
  await writeFile(outsideFile, PDF);
  assert.equal(await removeContainedFile(root, "../" + basename(outside) + "/outside.pdf"), false);
  assert.equal(await removeContainedFile(root, "..\\escape.pdf"), false);
  assert.equal(await readFile(outsideFile, "utf8"), PDF.toString("utf8"));

  const linkedParent = join(root, "linked-parent");
  await symlink(outside, linkedParent);
  assert.equal(await removeContainedFile(root, "linked-parent/outside.pdf"), false);
  assert.equal(await readFile(outsideFile, "utf8"), PDF.toString("utf8"));

  const targetLink = join(root, "target-link.pdf");
  await symlink(outsideFile, targetLink);
  assert.equal(await removeContainedFile(root, "target-link.pdf"), false);
  assert.equal((await lstat(targetLink)).isSymbolicLink(), true);

  assert.equal(await removeContainedFile(root, "nested"), false);
  assert.equal(await removeContainedFile(root, "."), false);
});
