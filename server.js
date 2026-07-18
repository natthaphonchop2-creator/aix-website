/* ============================================================
   AiX Club — Server.js
   Express + SQLite Backend
   ============================================================ */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const Stripe = require('stripe');
const multer = require('multer');
const { Worker } = require('worker_threads');
const { resolvePublicPath } = require('./security/publication-manifest.cjs');
const {
  DEVELOPMENT_SIGNING_SECRETS,
  validateSecurityConfig
} = require('./security/config-security.cjs');
const {
  ADMIN_SESSION_TTL_MS: ADMIN_SESSION_LIFETIME_MS,
  SESSION_IDENTITY_MAX_LENGTH,
  assertSessionIdentity,
  createSessionSecurity
} = require('./security/session-security.cjs');
const { assertLoginAllowed } = require('./security/account-policy.cjs');
const { createHttpSecurity } = require('./security/http-security.cjs');
const {
  UPLOAD_POLICIES,
  placeStagedUpload,
  removeContainedFile,
  resolveInside,
  validateStagedUpload
} = require('./security/upload-policy.cjs');
const { streamMedia } = require('./security/media-delivery.cjs');

let BetterSqliteDatabase;
try {
  BetterSqliteDatabase = require('better-sqlite3');
} catch (error) {
  BetterSqliteDatabase = null;
}

function createBuiltInSqliteDatabase(filename) {
  const { DatabaseSync } = require('node:sqlite');

  return new class BuiltInSqliteDatabase {
    constructor() {
      this.db = new DatabaseSync(filename);
    }

    pragma(sql) {
      return this.db.exec(`PRAGMA ${sql}`);
    }

    exec(sql) {
      return this.db.exec(sql);
    }

    prepare(sql) {
      return this.db.prepare(sql);
    }

    transaction(fn) {
      return (...args) => {
        this.db.exec('BEGIN');
        try {
          const result = fn(...args);
          this.db.exec('COMMIT');
          return result;
        } catch (txError) {
          this.db.exec('ROLLBACK');
          throw txError;
        }
      };
    }
  }();
}

const POSTGRES_COLUMN_ALIASES = {
  activeindex: 'activeIndex',
  amountdiscount: 'amountDiscount',
  amountsubtotal: 'amountSubtotal',
  amounttax: 'amountTax',
  authprovider: 'authProvider',
  avatarurl: 'avatarUrl',
  brandfocus: 'brandFocus',
  codehash: 'codeHash',
  completedcount: 'completedCount',
  consentaccepted: 'consentAccepted',
  couponname: 'couponName',
  courseid: 'courseId',
  createdat: 'createdAt',
  displayname: 'displayName',
  durationtext: 'durationText',
  emailverified: 'emailVerified',
  enrolledcourses: 'enrolledCourses',
  expiresat: 'expiresAt',
  filename: 'fileName',
  filepath: 'filePath',
  firstname: 'firstName',
  googlesub: 'googleSub',
  invoiceurl: 'invoiceUrl',
  joineddate: 'joinedDate',
  lastloginat: 'lastLoginAt',
  lastsentat: 'lastSentAt',
  lastname: 'lastName',
  lessonstext: 'lessonsText',
  lineid: 'lineId',
  marketingconsent: 'marketingConsent',
  meetingurl: 'meetingUrl',
  memberid: 'memberId',
  moduletitle: 'moduleTitle',
  notifybeforeminutes: 'notifyBeforeMinutes',
  notifystatus: 'notifyStatus',
  originalprice: 'originalPrice',
  paidat: 'paidAt',
  passwordhash: 'passwordHash',
  paymentamount: 'paymentAmount',
  paymentcurrency: 'paymentCurrency',
  paymentmethod: 'paymentMethod',
  paymentprovider: 'paymentProvider',
  paymentstatus: 'paymentStatus',
  phoneverified: 'phoneVerified',
  productname: 'productName',
  promotioncode: 'promotionCode',
  ratingcount: 'ratingCount',
  readat: 'readAt',
  receipturl: 'receiptUrl',
  scheduleid: 'scheduleId',
  sortorder: 'sortOrder',
  startsat: 'startsAt',
  endsat: 'endsAt',
  stripechargeid: 'stripeChargeId',
  stripecustomerid: 'stripeCustomerId',
  stripepaymentintentid: 'stripePaymentIntentId',
  stripesessionid: 'stripeSessionId',
  totalmodules: 'totalModules',
  updatedat: 'updatedAt',
  verifiedat: 'verifiedAt',
  videourl: 'videoUrl'
};

function mapPostgresColumnName(name) {
  return POSTGRES_COLUMN_ALIASES[name] || name;
}

function mapPostgresRow(row) {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [mapPostgresColumnName(key), value])
  );
}

function sqlitePlaceholdersToPostgres(sql) {
  let index = 0;
  let output = '';
  let quote = '';

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (quote) {
      output += char;
      if (char === quote) {
        if (next === quote) {
          output += next;
          i += 1;
        } else {
          quote = '';
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      output += char;
      continue;
    }

    if (char === '?') {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += char;
  }

  return output;
}

function normalizePostgresSql(sql) {
  const source = String(sql || '').trim();
  const insertOrIgnore = /^INSERT\s+OR\s+IGNORE\s+INTO/i.test(source);
  let normalized = source.replace(/^INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
  normalized = sqlitePlaceholdersToPostgres(normalized);

  if (insertOrIgnore && !/\bON\s+CONFLICT\b/i.test(normalized)) {
    normalized = normalized.replace(/;+\s*$/, '');
    normalized += ' ON CONFLICT DO NOTHING';
  }

  if (/^INSERT\s+INTO\s+users\b/i.test(normalized) && !/\bRETURNING\b/i.test(normalized)) {
    normalized = normalized.replace(/;+\s*$/, '');
    normalized += ' RETURNING id';
  }

  return normalized;
}

class PostgresCompatStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.tableInfoMatch = String(sql || '').trim().match(/^PRAGMA\s+table_info\(([^)]+)\)/i);
  }

  all(...params) {
    if (this.tableInfoMatch) return this.database.tableInfo(this.tableInfoMatch[1]);
    const result = this.database.query(normalizePostgresSql(this.sql), params);
    return result.rows.map(mapPostgresRow);
  }

  get(...params) {
    return this.all(...params)[0];
  }

  run(...params) {
    const result = this.database.query(normalizePostgresSql(this.sql), params);
    const row = result.rows[0] ? mapPostgresRow(result.rows[0]) : {};
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: row.id
    };
  }
}

class PostgresCompatDatabase {
  constructor(connectionString) {
    this.kind = 'supabase-postgres';
    this.connectionString = connectionString;
    this.worker = new Worker(path.join(__dirname, 'postgres-worker.js'), {
      workerData: {
        connectionString,
        ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : true,
        max: Number(process.env.SUPABASE_DB_POOL_MAX || 4)
      }
    });
    this.worker.unref();
    if (process.env.SUPABASE_AUTO_MIGRATE === 'true' || process.env.NODE_ENV !== 'production') {
      this.ensureSchema();
    }
  }

  ensureSchema() {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) return;
    fs.readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith('.sql'))
      .sort()
      .forEach((filename) => {
        const migrationPath = path.join(migrationsDir, filename);
        this.query(fs.readFileSync(migrationPath, 'utf8'), []);
      });
  }

  query(sql, params = []) {
    const sharedBuffer = new SharedArrayBuffer(4);
    const view = new Int32Array(sharedBuffer);
    const outFile = path.join(os.tmpdir(), `aix-pg-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
    this.worker.postMessage({ sql, params, outFile, sharedBuffer });

    const timeoutMs = Number(process.env.SUPABASE_QUERY_TIMEOUT_MS || 30_000);
    const status = Atomics.wait(view, 0, 0, timeoutMs);
    if (status === 'timed-out') {
      throw new Error(`Supabase query timed out after ${timeoutMs}ms`);
    }

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    fs.rmSync(outFile, { force: true });
    if (!payload.ok) {
      const error = new Error(`Supabase query failed: ${payload.error}`);
      error.code = payload.code;
      throw error;
    }
    return payload;
  }

  pragma() {
    return undefined;
  }

  exec(sql) {
    const source = String(sql || '').trim();
    if (/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+courses/i.test(source)) return undefined;
    return this.query(source, []);
  }

  prepare(sql) {
    return new PostgresCompatStatement(this, sql);
  }

  transaction(fn) {
    return (...args) => fn(...args);
  }

  tableInfo(table) {
    const cleanTable = String(table || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const result = this.query(
      `select column_name as name
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [cleanTable]
    );
    return result.rows.map((row) => ({ name: mapPostgresColumnName(row.name) }));
  }
}

function createDatabase(filename) {
  const postgresUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  if (postgresUrl) return new PostgresCompatDatabase(postgresUrl);

  if (BetterSqliteDatabase) {
    try {
      const sqlite = new BetterSqliteDatabase(filename);
      sqlite.kind = 'sqlite';
      return sqlite;
    } catch (error) {
      console.warn('better-sqlite3 could not be loaded; using Node built-in SQLite fallback.');
    }
  }

  try {
    const sqlite = createBuiltInSqliteDatabase(filename);
    sqlite.kind = 'sqlite';
    return sqlite;
  } catch (fallbackError) {
    throw new Error(`Could not open SQLite database: ${fallbackError.message}`);
  }
}

function loadLocalEnv() {
  if (process.env.AIX_SKIP_LOCAL_ENV === '1') return;
  ['.env', '.env.local'].forEach((filename) => {
    const envPath = path.join(__dirname, filename);
    if (!fs.existsSync(envPath)) return;

    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return;
      const key = match[1];
      const value = match[2].replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined || filename === '.env.local') process.env[key] = value;
    });
  });
}

loadLocalEnv();

const SECURITY_CONFIG = validateSecurityConfig(process.env);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const app = express();
if (IS_PRODUCTION) app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || __dirname);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^0\d{9}$/;
const SMS_OTP_TTL_MS = Number(process.env.SMS_OTP_TTL_MS || 5 * 60 * 1000);
const SMS_OTP_RESEND_MS = Number(process.env.SMS_OTP_RESEND_MS || 60 * 1000);
const SMS_OTP_MAX_ATTEMPTS = Number(process.env.SMS_OTP_MAX_ATTEMPTS || 5);
const SMS_TOKEN_TTL_MS = Number(process.env.SMS_TOKEN_TTL_MS || 15 * 60 * 1000);

const SMS_OTP_SECRET = IS_PRODUCTION
  ? process.env.SMS_OTP_SECRET
  : (process.env.SMS_OTP_SECRET || DEVELOPMENT_SIGNING_SECRETS.SMS_OTP_SECRET);
const AUTH_SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const AUTH_SECRET = IS_PRODUCTION
  ? process.env.AUTH_SECRET
  : (process.env.AUTH_SECRET || DEVELOPMENT_SIGNING_SECRETS.AUTH_SECRET);
const CSRF_SECRET = IS_PRODUCTION
  ? process.env.CSRF_SECRET
  : (process.env.CSRF_SECRET || DEVELOPMENT_SIGNING_SECRETS.CSRF_SECRET);
const ADMIN_EMAIL = String(
  IS_PRODUCTION ? process.env.ADMIN_EMAIL : (process.env.ADMIN_EMAIL || 'admin@aix.club')
).trim();
const ADMIN_PASSWORD = String(
  IS_PRODUCTION ? process.env.ADMIN_PASSWORD : (process.env.ADMIN_PASSWORD || 'admin1234')
);
const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_LIFETIME_MS;
const SESSION_SECURITY = createSessionSecurity({
  authSecret: AUTH_SECRET,
  csrfSecret: CSRF_SECRET,
  secure: IS_PRODUCTION,
  memberTtlMs: AUTH_SESSION_TTL_MS,
  adminTtlMs: ADMIN_SESSION_TTL_MS
});
const HTTP_ALLOWED_ORIGINS = SECURITY_CONFIG.allowedOrigins.size
  ? SECURITY_CONFIG.allowedOrigins
  : new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
const HTTP_SECURITY = createHttpSecurity({
  allowedOrigins: HTTP_ALLOWED_ORIGINS,
  validCsrf: (session, token) => SESSION_SECURITY.validCsrf(session, token),
  canonicalEmail(value) {
    const email = normalizeEmail(value);
    return email.length <= SESSION_IDENTITY_MAX_LENGTH && EMAIL_RE.test(email) ? email : '';
  },
  canonicalPhone(value) {
    const phone = normalizePhone(value);
    return PHONE_RE.test(phone) ? phone : '';
  }
});
const MEMBER_PRICE = Number(process.env.MEMBER_PRICE || 1999);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_API_VERSION = process.env.STRIPE_API_VERSION || '';
const STRIPE_PAYMENT_METHOD_TYPES = (process.env.STRIPE_PAYMENT_METHOD_TYPES || 'card,promptpay')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
let googleJwksCache = { expiresAt: 0, keys: [] };
let stripeClient = null;

function isValidGoogleClientId(clientId) {
  return /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(String(clientId || ''));
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads'));
const STAGING_UPLOAD_DIR = path.join(UPLOAD_ROOT, '.staging');
const REPLAY_STAGING_DIR = path.join(STAGING_UPLOAD_DIR, 'replays');
const RESOURCE_STAGING_DIR = path.join(STAGING_UPLOAD_DIR, 'resources');
const REPLAY_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'replays');
const RESOURCE_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'resources');

function ensurePrivateUploadDirectory(directory) {
  try {
    const existing = fs.lstatSync(directory);
    if (existing.isSymbolicLink() || !existing.isDirectory()) {
      throw new Error(`Upload path must be an application-owned directory: ${directory}`);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(directory, 0o700);
}

for (const directory of [
  UPLOAD_ROOT,
  STAGING_UPLOAD_DIR,
  REPLAY_STAGING_DIR,
  RESOURCE_STAGING_DIR,
  REPLAY_UPLOAD_DIR,
  RESOURCE_UPLOAD_DIR
]) ensurePrivateUploadDirectory(directory);

function stagingStorage(directory) {
  return multer.diskStorage({
    destination(req, file, callback) {
      callback(null, directory);
    },
    filename(req, file, callback) {
      callback(null, `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.stage`);
    }
  });
}

const COMMON_UPLOAD_LIMITS = Object.freeze({
  files: 1,
  fields: 8,
  parts: 10,
  fieldNameSize: 100,
  fieldSize: 16 * 1024,
  fieldNestingDepth: 0
});
const replayUploadParser = multer({
  storage: stagingStorage(REPLAY_STAGING_DIR),
  limits: { ...COMMON_UPLOAD_LIMITS, fileSize: UPLOAD_POLICIES.replay.maxBytes }
}).single('video');
const resourceUploadParser = multer({
  storage: stagingStorage(RESOURCE_STAGING_DIR),
  limits: { ...COMMON_UPLOAD_LIMITS, fileSize: UPLOAD_POLICIES.resource.maxBytes }
}).single('file');

async function cleanupStagedUpload(file) {
  if (!file?.path) return;
  await fs.promises.rm(file.path, { force: true }).catch(() => {});
}

function guardedUpload(parser) {
  return (req, res, next) => {
    req.once('aborted', () => { void cleanupStagedUpload(req.file); });
    parser(req, res, (error) => {
      if (!error && !req.aborted) return next();
      cleanupStagedUpload(req.file).finally(() => {
        if (res.headersSent || res.writableEnded) return;
        if (req.aborted) return res.destroy();
        const status = error?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const message = status === 413 ? 'ไฟล์มีขนาดเกินกำหนด' : 'ข้อมูลอัปโหลดไม่ถูกต้อง';
        return res.status(status).json({ error: message });
      });
    });
  };
}

const replayUpload = guardedUpload(replayUploadParser);
const resourceUpload = guardedUpload(resourceUploadParser);

// ---- Middleware ----
app.use(cors(HTTP_SECURITY.corsOptions));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json({ limit: '1mb' }));
app.use(rejectLegacyClientToken);
app.use(HTTP_SECURITY.requireMutationOrigin);
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

function serveApprovedPublicFile(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // The positive manifest replaces legacy checks such as pathParts.includes('supabase').
  const filename = resolvePublicPath(__dirname, req.path);
  if (!filename || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) return next();
  return res.sendFile(filename, { dotfiles: 'deny' });
}

app.use(serveApprovedPublicFile);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'aix-club',
    time: new Date().toISOString()
  });
});

// ---- Database Setup ----
const db = createDatabase(path.join(DATA_DIR, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    originalPrice INTEGER DEFAULT 0,
    instructor TEXT DEFAULT '',
    level TEXT DEFAULT 'beginner',
    hours INTEGER DEFAULT 0,
    lessons INTEGER DEFAULT 0,
    students INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    ratingCount INTEGER DEFAULT 0,
    image TEXT DEFAULT '',
    description TEXT DEFAULT '',
    type TEXT DEFAULT '',
    status TEXT DEFAULT '',
    subtitle TEXT DEFAULT '',
    overview TEXT DEFAULT '',
    durationText TEXT DEFAULT '',
    lessonsText TEXT DEFAULT '',
    learners TEXT DEFAULT '',
    schedule TEXT DEFAULT '',
    skills TEXT DEFAULT '[]',
    tools TEXT DEFAULT '[]',
    outcomes TEXT DEFAULT '[]',
    info TEXT DEFAULT '[]',
    syllabus TEXT DEFAULT '[]',
    project TEXT DEFAULT '',
    faq TEXT DEFAULT '[]',
    brandFocus TEXT DEFAULT '[]',
    sortOrder INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    lineId TEXT DEFAULT '',
    business TEXT DEFAULT '',
    courseId TEXT DEFAULT '',
    membership TEXT DEFAULT 'explorer',
    payment TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    tier TEXT DEFAULT 'explorer',
    enrolledCourses TEXT DEFAULT '[]',
    joinedDate TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    lineId TEXT DEFAULT '',
    business TEXT DEFAULT '',
    courseId TEXT DEFAULT '',
    membership TEXT DEFAULT 'aix-member',
    payment TEXT DEFAULT 'promptpay',
    status TEXT DEFAULT 'active',
    authProvider TEXT DEFAULT 'email',
    googleSub TEXT UNIQUE,
    picture TEXT DEFAULT '',
    emailVerified INTEGER DEFAULT 0,
    phoneVerified INTEGER DEFAULT 0,
    consentAccepted INTEGER DEFAULT 0,
    marketingConsent INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    lastLoginAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    period TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    features TEXT DEFAULT '[]',
    popular INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sms_verifications (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    purpose TEXT DEFAULT 'register',
    codeHash TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expiresAt TEXT NOT NULL,
    verifiedAt TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    lastSentAt TEXT DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone, purpose, createdAt);

  CREATE TABLE IF NOT EXISTS course_replays (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    videoUrl TEXT DEFAULT '',
    filePath TEXT DEFAULT '',
    durationText TEXT DEFAULT '',
    visibility TEXT DEFAULT 'members',
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_course_replays_course ON course_replays(courseId, sortOrder, createdAt);

  CREATE TABLE IF NOT EXISTS member_resources (
    id TEXT PRIMARY KEY,
    courseId TEXT DEFAULT '',
    type TEXT DEFAULT 'tool',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    filePath TEXT DEFAULT '',
    fileName TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    visibility TEXT DEFAULT 'members',
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_member_resources_course ON member_resources(courseId, sortOrder, createdAt);

  CREATE TABLE IF NOT EXISTS class_schedules (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    startsAt TEXT NOT NULL,
    endsAt TEXT DEFAULT '',
    meetingUrl TEXT DEFAULT '',
    notifyBeforeMinutes INTEGER DEFAULT 1440,
    notifyStatus TEXT DEFAULT 'scheduled',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_class_schedules_course ON class_schedules(courseId, startsAt);

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    scheduleId TEXT DEFAULT '',
    channel TEXT DEFAULT 'dashboard',
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'unread',
    createdAt TEXT DEFAULT (datetime('now')),
    readAt TEXT DEFAULT '',
    UNIQUE(memberId, scheduleId, channel)
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(memberId, status, createdAt);

  CREATE TABLE IF NOT EXISTS learning_progress (
    memberId TEXT NOT NULL,
    courseId TEXT NOT NULL,
    activeIndex INTEGER DEFAULT 0,
    completedCount INTEGER DEFAULT 0,
    totalModules INTEGER DEFAULT 0,
    moduleTitle TEXT DEFAULT '',
    updatedAt TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (memberId, courseId)
  );

  CREATE INDEX IF NOT EXISTS idx_learning_progress_member ON learning_progress(memberId, updatedAt);

  CREATE TABLE IF NOT EXISTS payment_records (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    provider TEXT DEFAULT 'stripe',
    status TEXT DEFAULT 'pending',
    paymentMethod TEXT DEFAULT '',
    productName TEXT DEFAULT 'AiX Member',
    amount INTEGER DEFAULT 0,
    amountSubtotal INTEGER DEFAULT 0,
    amountDiscount INTEGER DEFAULT 0,
    amountTax INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'thb',
    stripeCustomerId TEXT DEFAULT '',
    stripeSessionId TEXT DEFAULT '',
    stripePaymentIntentId TEXT DEFAULT '',
    stripeChargeId TEXT DEFAULT '',
    receiptUrl TEXT DEFAULT '',
    invoiceUrl TEXT DEFAULT '',
    promotionCode TEXT DEFAULT '',
    couponName TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
    paidAt TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_payment_records_member ON payment_records(memberId, createdAt);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_session ON payment_records(stripeSessionId) WHERE stripeSessionId != '';
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_intent ON payment_records(stripePaymentIntentId) WHERE stripePaymentIntentId != '';
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_charge ON payment_records(stripeChargeId) WHERE stripeChargeId != '';
`);

// ---- Seed Default Data ----
function seedData() {
  const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  if (courseCount === 0) {
    const insert = db.prepare(`INSERT INTO courses (id, name, price, originalPrice, instructor, level, hours, lessons, students, rating, ratingCount, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const courses = [
      ['ai-fundamentals', 'AI Fundamentals: Zero to Hero', 1490, 4990, 'Dr. Nova Chen', 'beginner', 42, 156, 8200, 4.9, 2847, 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=225&fit=crop', 'คอร์ส AI พื้นฐานครบครัน ตั้งแต่ศูนย์จนถึงมืออาชีพ'],
      ['prompt-engineering', 'Prompt Engineering Mastery', 1290, 3990, 'Alex Cosmos', 'intermediate', 28, 98, 5400, 4.8, 1932, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop', 'เทคนิค Prompt ขั้นสูงสำหรับ AI ทุกแพลตฟอร์ม'],
      ['computer-vision', 'Computer Vision & Deep Learning', 1990, 5990, 'Dr. Nova Chen', 'advanced', 38, 132, 3100, 4.7, 1205, 'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=400&h=225&fit=crop', 'CNN, Object Detection, Image Segmentation'],
      ['nlp', 'Natural Language Processing', 1690, 4490, 'Alex Cosmos', 'intermediate', 34, 118, 4700, 4.8, 1687, 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=400&h=225&fit=crop', 'Transformers, Chatbots, Text Analysis'],
      ['ai-business', 'AI for Business Automation', 990, 2990, 'Dr. Nova Chen', 'beginner', 24, 88, 6300, 4.9, 2103, 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=225&fit=crop', 'RPA, Workflow AI, Business Intelligence'],
      ['gen-ai', 'Generative AI & Creative Tools', 1890, 5490, 'Alex Cosmos', 'advanced', 36, 124, 9100, 4.9, 3421, 'https://images.unsplash.com/photo-1547954575-855750c57bd3?w=400&h=225&fit=crop', 'สร้างภาพ วิดีโอ เพลงด้วย AI']
    ];
    const tx = db.transaction(() => { courses.forEach(c => insert.run(...c)); });
    tx();
  }

  const pkgCount = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
  if (pkgCount === 0) {
    const insert = db.prepare(`INSERT INTO packages (id, name, price, period, icon, features, popular, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const pkgs = [
      ['aix-member', 'AiX Member', 1999, 'บาท', 'spark', JSON.stringify(['เข้าถึงคอร์สหลัก', 'ดูย้อนหลังได้', 'Prompt Templates', 'Private Community']), 1, 1],
      ['team', 'Team Access', 9900, 'บาท', 'users', JSON.stringify(['สิทธิ์สำหรับทีม', 'Workshop สำหรับองค์กร', 'Resource ใช้ร่วมกัน', 'สรุปผลการเรียน']), 0, 1]
    ];
    const tx = db.transaction(() => { pkgs.forEach(p => insert.run(...p)); });
    tx();
  }
}
seedData();

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('leads', 'lineId', "TEXT DEFAULT ''");
ensureColumn('leads', 'business', "TEXT DEFAULT ''");
[
  ['members', 'displayName', "TEXT DEFAULT ''"],
  ['members', 'avatarUrl', "TEXT DEFAULT ''"],
  ['members', 'paymentStatus', "TEXT DEFAULT 'unpaid'"],
  ['members', 'paidAt', "TEXT DEFAULT ''"],
  ['members', 'expiresAt', "TEXT DEFAULT ''"],
  ['members', 'passwordHash', "TEXT DEFAULT ''"],
  ['members', 'role', "TEXT DEFAULT 'member'"],
  ['members', 'paymentMethod', "TEXT DEFAULT ''"],
  ['members', 'paymentProvider', "TEXT DEFAULT ''"],
  ['members', 'paymentAmount', "INTEGER DEFAULT 0"],
  ['members', 'paymentCurrency', "TEXT DEFAULT 'thb'"],
  ['members', 'stripeCustomerId', "TEXT DEFAULT ''"],
  ['members', 'stripeSessionId', "TEXT DEFAULT ''"],
  ['members', 'stripePaymentIntentId', "TEXT DEFAULT ''"]
].forEach(([table, column, definition]) => ensureColumn(table, column, definition));

db.prepare(`
  UPDATE members
  SET
    paymentStatus = CASE
      WHEN paymentStatus IN ('paid', 'unpaid') THEN paymentStatus
      WHEN status IN ('paid', 'active', 'verified') THEN 'paid'
      ELSE 'unpaid'
    END,
    displayName = CASE
      WHEN displayName != '' THEN displayName
      ELSE TRIM(firstName || ' ' || lastName)
    END,
    avatarUrl = CASE
      WHEN avatarUrl != '' THEN avatarUrl
      ELSE picture
    END,
    role = CASE
      WHEN role != '' THEN role
      ELSE 'member'
    END
`).run();

const inaccessiblePasswordCount = Number(db.prepare(`
  SELECT COUNT(*) AS count FROM members
  WHERE COALESCE(passwordHash, '') = '' AND COALESCE(googleSub, '') = ''
`).get()?.count || 0);
if (inaccessiblePasswordCount > 0) {
  console.warn(`[SECURITY] ${inaccessiblePasswordCount} member account(s) require a reviewed password-setup migration.`);
}
[
  ['courses', 'type', "TEXT DEFAULT ''"],
  ['courses', 'status', "TEXT DEFAULT ''"],
  ['courses', 'subtitle', "TEXT DEFAULT ''"],
  ['courses', 'overview', "TEXT DEFAULT ''"],
  ['courses', 'durationText', "TEXT DEFAULT ''"],
  ['courses', 'lessonsText', "TEXT DEFAULT ''"],
  ['courses', 'learners', "TEXT DEFAULT ''"],
  ['courses', 'schedule', "TEXT DEFAULT ''"],
  ['courses', 'skills', "TEXT DEFAULT '[]'"],
  ['courses', 'tools', "TEXT DEFAULT '[]'"],
  ['courses', 'outcomes', "TEXT DEFAULT '[]'"],
  ['courses', 'info', "TEXT DEFAULT '[]'"],
  ['courses', 'syllabus', "TEXT DEFAULT '[]'"],
  ['courses', 'project', "TEXT DEFAULT ''"],
  ['courses', 'faq', "TEXT DEFAULT '[]'"],
  ['courses', 'brandFocus', "TEXT DEFAULT '[]'"],
  ['courses', 'sortOrder', "INTEGER DEFAULT 0"],
  ['courses', 'featured', "INTEGER DEFAULT 0"]
].forEach(([table, column, definition]) => ensureColumn(table, column, definition));

function loadPlatformCourseDetails() {
  const sourcePath = path.join(__dirname, 'class-detail.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const start = source.indexOf('const detailCourses = ');
  const end = source.indexOf(';\n\nconst fallbackCourse');
  if (start === -1 || end === -1) throw new Error('ไม่พบข้อมูล detailCourses สำหรับ sync database');

  const objectSource = source.slice(start + 'const detailCourses = '.length, end);
  return vm.runInNewContext(`(${objectSource})`, {}, { timeout: 1000 });
}

function safeJson(value) {
  return JSON.stringify(value ?? []);
}

function numericText(value, fallback = 0) {
  const match = String(value || '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function syncPlatformCourses() {
  let detailCourses;
  try {
    detailCourses = loadPlatformCourseDetails();
  } catch (error) {
    console.warn(`Could not sync platform course details: ${error.message}`);
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO courses (
      id, name, price, originalPrice, instructor, level, hours, lessons, students,
      rating, ratingCount, image, description, type, status, subtitle, overview,
      durationText, lessonsText, learners, schedule, skills, tools, outcomes,
      info, syllabus, project, faq, brandFocus, sortOrder, featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      price=excluded.price,
      originalPrice=excluded.originalPrice,
      instructor=excluded.instructor,
      level=excluded.level,
      hours=excluded.hours,
      lessons=excluded.lessons,
      rating=excluded.rating,
      image=excluded.image,
      description=excluded.description,
      type=excluded.type,
      status=excluded.status,
      subtitle=excluded.subtitle,
      overview=excluded.overview,
      durationText=excluded.durationText,
      lessonsText=excluded.lessonsText,
      learners=excluded.learners,
      schedule=excluded.schedule,
      skills=excluded.skills,
      tools=excluded.tools,
      outcomes=excluded.outcomes,
      info=excluded.info,
      syllabus=excluded.syllabus,
      project=excluded.project,
      faq=excluded.faq,
      brandFocus=excluded.brandFocus,
      sortOrder=excluded.sortOrder,
      featured=excluded.featured
  `);

  const tx = db.transaction(() => {
    Object.values(detailCourses).forEach((course, index) => {
      upsert.run(
        course.id,
        course.title,
        course.price || 0,
        0,
        course.instructor || 'AiX Team',
        course.level || 'Practical',
        numericText(course.duration),
        numericText(course.lessons),
        0,
        Number.parseFloat(course.rating) || 0,
        0,
        course.image || '',
        course.subtitle || course.overview || '',
        course.type || '',
        course.status || '',
        course.subtitle || '',
        course.overview || '',
        course.duration || '',
        course.lessons || '',
        course.learners || '',
        course.schedule || '',
        safeJson(course.skills),
        safeJson(course.tools),
        safeJson(course.outcomes),
        safeJson(course.info),
        safeJson(course.syllabus),
        course.project || '',
        safeJson(course.faq),
        safeJson(course.brandFocus),
        index,
        1
      );
    });
  });
  tx();
}

syncPlatformCourses();

function syncPackages() {
  db.prepare('DELETE FROM packages').run();
  const insert = db.prepare(`INSERT INTO packages (id, name, price, period, icon, features, popular, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['aix-member', 'AiX Member', 1999, 'บาท', 'spark', JSON.stringify(['เข้าถึงคอร์สหลัก', 'ดูย้อนหลังได้', 'Prompt Templates', 'Private Community']), 1, 1],
    ['team', 'Team Access', 9900, 'บาท', 'users', JSON.stringify(['สิทธิ์สำหรับทีม', 'Workshop สำหรับองค์กร', 'Resource ใช้ร่วมกัน', 'สรุปผลการเรียน']), 0, 1]
  ].forEach((pkg) => insert.run(...pkg));
}

syncPackages();

function seedMemberLearningData() {
  const resourceCount = db.prepare('SELECT COUNT(*) as c FROM member_resources').get().c;
  if (resourceCount === 0) {
    const insertResource = db.prepare(`
      INSERT INTO member_resources (
        id, courseId, type, title, description, url, filePath, fileName, tags, visibility, sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?, 'members', ?, ?, ?)
    `);
    const now = new Date().toISOString();
    [
      ['', 'tool', 'AI Agent Workflow Blueprint', 'ไฟล์โครงสร้างสำหรับวาง role, task, input, output และจุดตรวจสอบของ AI Agent ก่อนนำไปใช้จริง', '/tools-box#workflow', ['AI Agent', 'Workflow'], 1],
      ['', 'skill', 'Prompt Review Checklist', 'Checklist ตรวจ prompt ให้ชัดเจน ลดผลลัพธ์มั่ว และทำซ้ำได้กับทีม', '/tools-box#skill-set', ['Prompt Engineering', 'QA'], 2],
      ['claude-deep-dive', 'template', 'Claude Deep Research Template', 'Template สำหรับสั่ง Claude วิเคราะห์ข้อมูล สรุป insight และเปลี่ยนเป็นแผนปฏิบัติการ', '/course/claude-deep-dive/start', ['Claude', 'Research'], 3]
    ].forEach(([courseId, type, title, description, url, tags, sortOrder]) => {
      insertResource.run(createRecordId('resource'), courseId, type, title, description, url, safeJson(tags), sortOrder, now, now);
    });
  }

  const scheduleCount = db.prepare('SELECT COUNT(*) as c FROM class_schedules').get().c;
  if (scheduleCount === 0) {
    const now = Date.now();
    const startsAt = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(now + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO class_schedules (
        id, courseId, title, description, startsAt, endsAt, meetingUrl, notifyBeforeMinutes, notifyStatus, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).run(
      createRecordId('schedule'),
      'claude-deep-dive',
      'Live Class: Claude Deep Dive',
      'คลาสสดสำหรับสมาชิก พร้อมแจ้งเตือนใน Dashboard ก่อนเริ่มเรียน',
      startsAt,
      endsAt,
      '/course/claude-deep-dive/start',
      1440,
      createdAt,
      createdAt
    );
  }
}

seedMemberLearningData();

function normalizedLearningLink(value = '') {
  const raw = String(value || '').trim();
  const contentMatch = raw.match(/^\/course\/([^/?#]+)\/content(?:[?#].*)?$/);
  if (contentMatch) {
    try {
      return `/course/${encodeURIComponent(decodeURIComponent(contentMatch[1]))}/start`;
    } catch (error) {
      return `/course/${contentMatch[1]}/start`;
    }
  }
  return raw;
}

function normalizeStoredLearningLinks() {
  [
    { table: 'member_resources', column: 'url' },
    { table: 'class_schedules', column: 'meetingUrl' }
  ].forEach(({ table, column }) => {
    const rows = db.prepare(`SELECT id, courseId, ${column} as value FROM ${table}`).all();
    const update = db.prepare(`UPDATE ${table} SET ${column} = ?, updatedAt = ? WHERE id = ?`);
    const now = new Date().toISOString();
    rows.forEach((row) => {
      const normalized = normalizedLearningLink(row.value);
      if (normalized && normalized !== row.value) update.run(normalized, now, row.id);
    });
  });
}

normalizeStoredLearningLinks();
db.prepare("UPDATE member_resources SET url = '/tools-box#resources' WHERE url = '/dashboard'").run();

function liveClassMeetUrl(dateKey) {
  return String(process.env[`LIVE_CLASS_MEET_${dateKey}`] || process.env.LIVE_CLASS_GOOGLE_MEET_URL || '').trim();
}

function upsertDefaultLiveSchedules() {
  const now = new Date().toISOString();
  const schedules = [
    {
      id: 'aix-live-2026-05-16',
      courseId: 'manus-ai',
      title: 'สอนสดออนไลน์: ทดสอบ Live Classroom วันที่ 16',
      description: 'ทดสอบระบบเรียนสดผ่านเว็บ AiX Club พร้อมห้อง Google Meet สำหรับสมาชิก',
      startsAt: '2026-05-16T20:00:00+07:00',
      endsAt: '2026-05-16T22:00:00+07:00',
      meetingUrl: liveClassMeetUrl('2026_05_16')
    },
    {
      id: 'aix-live-2026-05-17',
      courseId: 'manus-ai',
      title: 'สอนสดออนไลน์: Workshop AI Agent วันที่ 17',
      description: 'ทดลองสอนสดและใช้งาน Live Room สำหรับเรียนผ่านเว็บ พร้อม Google Meet',
      startsAt: '2026-05-17T20:00:00+07:00',
      endsAt: '2026-05-17T22:00:00+07:00',
      meetingUrl: liveClassMeetUrl('2026_05_17')
    },
    {
      id: 'aix-live-2026-05-18',
      courseId: 'manus-ai',
      title: 'สอนสดออนไลน์: Q&A และทดลองระบบเรียนสด วันที่ 18',
      description: 'ทดสอบ flow เข้าเรียนสดผ่าน Dashboard, Live Room, Google Meet และหน้าเรียนประกอบ',
      startsAt: '2026-05-18T20:00:00+07:00',
      endsAt: '2026-05-18T22:00:00+07:00',
      meetingUrl: liveClassMeetUrl('2026_05_18')
    }
  ];

  const upsert = db.prepare(`
    INSERT INTO class_schedules (
      id, courseId, title, description, startsAt, endsAt, meetingUrl, notifyBeforeMinutes, notifyStatus, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1440, 'scheduled', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      courseId = excluded.courseId,
      title = excluded.title,
      description = excluded.description,
      startsAt = excluded.startsAt,
      endsAt = excluded.endsAt,
      meetingUrl = CASE
        WHEN excluded.meetingUrl != '' THEN excluded.meetingUrl
        ELSE class_schedules.meetingUrl
      END,
      notifyBeforeMinutes = excluded.notifyBeforeMinutes,
      notifyStatus = excluded.notifyStatus,
      updatedAt = excluded.updatedAt
  `);

  const tx = db.transaction(() => {
    schedules.forEach((schedule) => {
      upsert.run(
        schedule.id,
        schedule.courseId,
        schedule.title,
        schedule.description,
        new Date(schedule.startsAt).toISOString(),
        new Date(schedule.endsAt).toISOString(),
        schedule.meetingUrl,
        now,
        now
      );
    });
  });
  tx();
}

upsertDefaultLiveSchedules();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function toThaiInternationalPhone(phone) {
  const normalized = normalizePhone(phone);
  return normalized.startsWith('0') ? `+66${normalized.slice(1)}` : normalized;
}

function createOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(phone, code) {
  return crypto.createHmac('sha256', SMS_OTP_SECRET)
    .update(`${normalizePhone(phone)}:${String(code || '').trim()}`)
    .digest('hex');
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function safeTextCompare(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createMemberId() {
  return `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function createRecordId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function splitDisplayName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'AiX',
    lastName: parts.slice(1).join(' ')
  };
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return safeTextCompare(candidate, hash);
}

function rejectLegacyClientToken(req, res, next) {
  if (/^\s*Bearer\s+/i.test(req.get('authorization') || '')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบใหม่' });
  }

  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const field of ['token', 'authToken', 'adminToken', 'sessionToken']) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return res.status(400).json({ error: 'ไม่รับ token จาก browser' });
      }
    }
  }
  next();
}

function requestHasCookie(req, name) {
  return String(req.get('cookie') || '').split(';').some((part) => {
    const trimmed = part.trim();
    return trimmed === name || trimmed.startsWith(`${name}=`);
  });
}

const RETIRED_MEMBER_COOKIE_EXPIRED = Symbol('retired-member-cookie-expired');

function expireRetiredMemberCookieOnce(res) {
  if (res[RETIRED_MEMBER_COOKIE_EXPIRED]) return;
  res[RETIRED_MEMBER_COOKIE_EXPIRED] = true;
  SESSION_SECURITY.expireRetiredMemberCookie(res);
}

function expireRetiredMemberCookieIfPresent(req, res) {
  if (requestHasCookie(req, 'aix_session')) expireRetiredMemberCookieOnce(res);
}

function requireMemberSession(req, res, next) {
  expireRetiredMemberCookieIfPresent(req, res);
  const data = SESSION_SECURITY.readMember(req);
  if (!data) return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(data.sub);
  try {
    assertLoginAllowed(member);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  req.authSession = data;
  req.member = member;
  return HTTP_SECURITY.requireSessionCsrf(req, res, next);
}

function requireAdminSession(req, res, next) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า ADMIN_EMAIL หรือ ADMIN_PASSWORD บน server' });
  }

  const data = SESSION_SECURITY.readAdmin(req);
  if (!data || data.email !== ADMIN_EMAIL) {
    return res.status(401).json({ error: 'Admin session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }

  req.authSession = data;
  return HTTP_SECURITY.requireSessionCsrf(req, res, next);
}

function hasValidMemberSession(req, res) {
  if (res) expireRetiredMemberCookieIfPresent(req, res);
  const data = SESSION_SECURITY.readMember(req);
  if (!data) return false;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(data.sub);
  try {
    assertLoginAllowed(member);
    return true;
  } catch {
    return false;
  }
}

function assertMemberSessionEligible(member) {
  assertLoginAllowed(member);
  assertSessionIdentity({ sub: member.id, email: member.email });
  return member;
}

function issueMemberSession(res, member) {
  assertMemberSessionEligible(member);
  expireRetiredMemberCookieOnce(res);
  return SESSION_SECURITY.issueMember(res, publicMember(member));
}

function createPhoneVerificationToken(phone, purpose = 'register') {
  const payload = Buffer.from(JSON.stringify({
    phone: normalizePhone(phone),
    purpose,
    exp: Date.now() + SMS_TOKEN_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex')
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', SMS_OTP_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyPhoneVerificationToken(token, phone, purpose = 'register') {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return false;
    const expected = crypto.createHmac('sha256', SMS_OTP_SECRET).update(payload).digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.phone !== normalizePhone(phone)) return false;
    if ((data.purpose || 'register') !== purpose) return false;
    if (Number(data.exp || 0) < Date.now()) return false;

    const verified = db.prepare(`
      SELECT verifiedAt FROM sms_verifications
      WHERE phone = ? AND purpose = ? AND verifiedAt != ''
      ORDER BY verifiedAt DESC
      LIMIT 1
    `).get(normalizePhone(phone), purpose);
    return Boolean(verified && Date.parse(verified.verifiedAt) > Date.now() - SMS_TOKEN_TTL_MS);
  } catch (error) {
    return false;
  }
}

async function sendPhoneOtp(phone, purpose = 'register') {
  const latest = db.prepare(`
    SELECT lastSentAt FROM sms_verifications
    WHERE phone = ? AND purpose = ?
    ORDER BY createdAt DESC
    LIMIT 1
  `).get(phone, purpose);
  const lastSent = latest?.lastSentAt ? Date.parse(latest.lastSentAt) : 0;
  const retryAfterMs = SMS_OTP_RESEND_MS - (Date.now() - lastSent);
  if (retryAfterMs > 0) {
    const retryAfter = Math.ceil(retryAfterMs / 1000);
    const error = new Error(`ขอรหัสใหม่ได้อีกครั้งใน ${retryAfter} วินาที`);
    error.status = 429;
    error.retryAfter = retryAfter;
    throw error;
  }

  const code = createOtpCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SMS_OTP_TTL_MS).toISOString();
  const id = `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const message = `รหัสยืนยัน AiX Club คือ ${code} ใช้ได้ภายใน ${Math.ceil(SMS_OTP_TTL_MS / 60000)} นาที`;
  const smsResult = await sendSmsMessage(phone, message);

  db.prepare(`
    INSERT INTO sms_verifications (id, phone, purpose, codeHash, attempts, expiresAt, verifiedAt, createdAt, lastSentAt)
    VALUES (?, ?, ?, ?, 0, ?, '', ?, ?)
  `).run(id, phone, purpose, hashOtp(phone, code), expiresAt, now.toISOString(), now.toISOString());

  return {
    ok: true,
    provider: smsResult.provider,
    sentRealSms: smsResult.provider !== 'dev',
    expiresIn: Math.floor(SMS_OTP_TTL_MS / 1000),
    resendIn: Math.floor(SMS_OTP_RESEND_MS / 1000),
    devCode: smsResult.provider === 'dev' ? code : undefined
  };
}

function verifyPhoneOtp(phone, code, purpose = 'register') {
  const row = db.prepare(`
    SELECT * FROM sms_verifications
    WHERE phone = ? AND purpose = ? AND verifiedAt = ''
    ORDER BY createdAt DESC
    LIMIT 1
  `).get(phone, purpose);

  if (!row) {
    const error = new Error('ไม่พบรหัสยืนยัน กรุณาขอรหัสใหม่');
    error.status = 400;
    throw error;
  }
  if (Date.parse(row.expiresAt) < Date.now()) {
    const error = new Error('รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่');
    error.status = 400;
    throw error;
  }
  if (row.attempts >= SMS_OTP_MAX_ATTEMPTS) {
    const error = new Error('กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่');
    error.status = 429;
    throw error;
  }

  if (!safeCompare(row.codeHash, hashOtp(phone, code))) {
    db.prepare('UPDATE sms_verifications SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    const error = new Error('รหัส SMS ไม่ถูกต้อง');
    error.status = 400;
    throw error;
  }

  const verifiedAt = new Date().toISOString();
  db.prepare('UPDATE sms_verifications SET verifiedAt = ? WHERE id = ?').run(verifiedAt, row.id);
  return {
    verified: true,
    phoneVerificationToken: createPhoneVerificationToken(phone, purpose),
    expiresIn: Math.floor(SMS_TOKEN_TTL_MS / 1000)
  };
}

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY, STRIPE_API_VERSION ? { apiVersion: STRIPE_API_VERSION } : undefined);
  }
  return stripeClient;
}

function stripeReady() {
  return Boolean(STRIPE_SECRET_KEY);
}

function getRequestOrigin(req) {
  const origin = req.get('origin');
  if (origin) return origin;
  return `${req.protocol}://${req.get('host')}`;
}

function requestedStripePaymentTypes(paymentMethod) {
  const requested = String(paymentMethod || 'card').trim().toLowerCase();
  if (requested === 'promptpay') return ['promptpay'];
  if (requested === 'all') return STRIPE_PAYMENT_METHOD_TYPES.length ? STRIPE_PAYMENT_METHOD_TYPES : ['card', 'promptpay'];
  return ['card'];
}

function paymentMethodLabelFromTypes(types = []) {
  if (types.includes('promptpay') && types.length === 1) return 'promptpay';
  if (types.includes('card') && types.length === 1) return 'card';
  return types.join(',') || 'stripe';
}

function stripeObjectId(value) {
  return typeof value === 'string' ? value : value?.id || '';
}

function stripeDate(seconds) {
  return Number(seconds) ? new Date(Number(seconds) * 1000).toISOString() : '';
}

function stripeLatestCharge(paymentIntent) {
  const intent = typeof paymentIntent === 'object' && paymentIntent ? paymentIntent : null;
  if (typeof intent?.latest_charge === 'object' && intent.latest_charge) return intent.latest_charge;
  if (Array.isArray(intent?.charges?.data) && intent.charges.data.length) return intent.charges.data[0];
  return null;
}

function stripeDiscountSummary(session = {}) {
  const discount = Array.isArray(session.discounts) ? session.discounts[0] : null;
  const coupon = discount?.coupon || discount?.discount?.coupon || {};
  const promotion = discount?.promotion_code || discount?.discount?.promotion_code || {};
  return {
    promotionCode: typeof promotion === 'string' ? promotion : promotion?.code || '',
    couponName: typeof coupon === 'string' ? coupon : coupon?.name || coupon?.id || ''
  };
}

function paymentRecordFromStripeSession(session = {}) {
  const charge = stripeLatestCharge(session.payment_intent);
  const discount = stripeDiscountSummary(session);
  const paid = session.payment_status === 'paid';
  const amountTotal = Number(session.amount_total ?? MEMBER_PRICE * 100);
  const amountSubtotal = Number(session.amount_subtotal ?? session.amount_total ?? MEMBER_PRICE * 100);
  return {
    memberId: memberIdFromStripeObject(session),
    provider: 'stripe',
    status: session.payment_status || session.status || 'pending',
    paymentMethod: paymentMethodLabelFromTypes(session.payment_method_types || []),
    productName: 'AiX Member',
    amount: amountTotal,
    amountSubtotal,
    amountDiscount: Number(session.total_details?.amount_discount || 0),
    amountTax: Number(session.total_details?.amount_tax || 0),
    currency: String(session.currency || 'thb').toLowerCase(),
    stripeCustomerId: stripeObjectId(session.customer),
    stripeSessionId: session.id || '',
    stripePaymentIntentId: stripeObjectId(session.payment_intent),
    stripeChargeId: charge?.id || '',
    receiptUrl: charge?.receipt_url || '',
    invoiceUrl: typeof session.invoice === 'object' ? session.invoice?.hosted_invoice_url || '' : '',
    promotionCode: discount.promotionCode,
    couponName: discount.couponName,
    metadata: session.metadata || {},
    paidAt: paid ? stripeDate(charge?.created || session.created) : ''
  };
}

function paymentRecordFromStripePaymentIntent(intent = {}) {
  const charge = stripeLatestCharge(intent);
  return {
    memberId: intent.metadata?.member_id || '',
    provider: 'stripe',
    status: intent.status === 'succeeded' ? 'paid' : intent.status || 'pending',
    paymentMethod: intent.payment_method_types?.[0] || charge?.payment_method_details?.type || 'stripe',
    productName: 'AiX Member',
    amount: Number(intent.amount_received ?? intent.amount ?? MEMBER_PRICE * 100),
    amountSubtotal: Number(intent.amount ?? intent.amount_received ?? MEMBER_PRICE * 100),
    amountDiscount: 0,
    amountTax: 0,
    currency: String(intent.currency || 'thb').toLowerCase(),
    stripeCustomerId: stripeObjectId(intent.customer),
    stripeSessionId: '',
    stripePaymentIntentId: intent.id || '',
    stripeChargeId: charge?.id || '',
    receiptUrl: charge?.receipt_url || '',
    invoiceUrl: '',
    promotionCode: '',
    couponName: '',
    metadata: intent.metadata || {},
    paidAt: intent.status === 'succeeded' ? stripeDate(charge?.created || intent.created) : ''
  };
}

function paymentRecordFromStripeCharge(charge = {}, existing = {}) {
  return {
    memberId: existing.memberId || charge.metadata?.member_id || '',
    provider: 'stripe',
    status: charge.status === 'succeeded' ? 'paid' : charge.status || existing.status || 'pending',
    paymentMethod: charge.payment_method_details?.type || existing.paymentMethod || 'stripe',
    productName: existing.productName || 'AiX Member',
    amount: Number(charge.amount_captured ?? charge.amount ?? existing.amount ?? MEMBER_PRICE * 100),
    amountSubtotal: Number(existing.amountSubtotal ?? charge.amount ?? charge.amount_captured ?? MEMBER_PRICE * 100),
    amountDiscount: Number(existing.amountDiscount ?? 0),
    amountTax: Number(existing.amountTax ?? 0),
    currency: String(charge.currency || existing.currency || 'thb').toLowerCase(),
    stripeCustomerId: stripeObjectId(charge.customer) || existing.stripeCustomerId || '',
    stripeSessionId: existing.stripeSessionId || '',
    stripePaymentIntentId: stripeObjectId(charge.payment_intent) || existing.stripePaymentIntentId || '',
    stripeChargeId: charge.id || existing.stripeChargeId || '',
    receiptUrl: charge.receipt_url || existing.receiptUrl || '',
    invoiceUrl: existing.invoiceUrl || '',
    promotionCode: existing.promotionCode || '',
    couponName: existing.couponName || '',
    metadata: existing.metadata ? parseJsonField(existing.metadata, {}) : charge.metadata || {},
    paidAt: charge.status === 'succeeded' ? stripeDate(charge.created) : existing.paidAt || ''
  };
}

function findPaymentRecord(data = {}) {
  const lookups = [
    ['stripeSessionId', data.stripeSessionId],
    ['stripePaymentIntentId', data.stripePaymentIntentId],
    ['stripeChargeId', data.stripeChargeId],
    ['id', data.id]
  ];
  for (const [column, value] of lookups) {
    if (!value) continue;
    const row = db.prepare(`SELECT * FROM payment_records WHERE ${column} = ?`).get(value);
    if (row) return row;
  }
  return null;
}

function upsertPaymentRecord(data = {}) {
  if (!data.memberId) return null;
  const existing = findPaymentRecord(data);
  const now = new Date().toISOString();
  const nextStatus = existing?.status === 'paid' && data.status !== 'paid' ? 'paid' : data.status || existing?.status || 'pending';
  const paidAt = data.paidAt || existing?.paidAt || '';
  const id = existing?.id
    || data.id
    || (data.stripeSessionId ? `stripe_session_${data.stripeSessionId}` : '')
    || (data.stripePaymentIntentId ? `stripe_intent_${data.stripePaymentIntentId}` : '')
    || `payment_${crypto.randomUUID()}`;
  const payload = {
    id,
    memberId: data.memberId,
    provider: data.provider || existing?.provider || 'stripe',
    status: nextStatus,
    paymentMethod: data.paymentMethod || existing?.paymentMethod || 'stripe',
    productName: data.productName || existing?.productName || 'AiX Member',
    amount: Number(data.amount ?? existing?.amount ?? 0),
    amountSubtotal: Number(data.amountSubtotal ?? existing?.amountSubtotal ?? data.amount ?? 0),
    amountDiscount: Number(data.amountDiscount ?? existing?.amountDiscount ?? 0),
    amountTax: Number(data.amountTax ?? existing?.amountTax ?? 0),
    currency: String(data.currency || existing?.currency || 'thb').toLowerCase(),
    stripeCustomerId: data.stripeCustomerId || existing?.stripeCustomerId || '',
    stripeSessionId: data.stripeSessionId || existing?.stripeSessionId || '',
    stripePaymentIntentId: data.stripePaymentIntentId || existing?.stripePaymentIntentId || '',
    stripeChargeId: data.stripeChargeId || existing?.stripeChargeId || '',
    receiptUrl: data.receiptUrl || existing?.receiptUrl || '',
    invoiceUrl: data.invoiceUrl || existing?.invoiceUrl || '',
    promotionCode: data.promotionCode || existing?.promotionCode || '',
    couponName: data.couponName || existing?.couponName || '',
    metadata: JSON.stringify(data.metadata || (existing?.metadata ? parseJsonField(existing.metadata, {}) : {})),
    paidAt,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    db.prepare(`
      UPDATE payment_records
      SET memberId = ?, provider = ?, status = ?, paymentMethod = ?, productName = ?,
          amount = ?, amountSubtotal = ?, amountDiscount = ?, amountTax = ?, currency = ?,
          stripeCustomerId = ?, stripeSessionId = ?, stripePaymentIntentId = ?, stripeChargeId = ?,
          receiptUrl = ?, invoiceUrl = ?, promotionCode = ?, couponName = ?, metadata = ?,
          paidAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      payload.memberId, payload.provider, payload.status, payload.paymentMethod, payload.productName,
      payload.amount, payload.amountSubtotal, payload.amountDiscount, payload.amountTax, payload.currency,
      payload.stripeCustomerId, payload.stripeSessionId, payload.stripePaymentIntentId, payload.stripeChargeId,
      payload.receiptUrl, payload.invoiceUrl, payload.promotionCode, payload.couponName, payload.metadata,
      payload.paidAt, payload.updatedAt, payload.id
    );
  } else {
    db.prepare(`
      INSERT INTO payment_records (
        id, memberId, provider, status, paymentMethod, productName,
        amount, amountSubtotal, amountDiscount, amountTax, currency,
        stripeCustomerId, stripeSessionId, stripePaymentIntentId, stripeChargeId,
        receiptUrl, invoiceUrl, promotionCode, couponName, metadata,
        paidAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.id, payload.memberId, payload.provider, payload.status, payload.paymentMethod, payload.productName,
      payload.amount, payload.amountSubtotal, payload.amountDiscount, payload.amountTax, payload.currency,
      payload.stripeCustomerId, payload.stripeSessionId, payload.stripePaymentIntentId, payload.stripeChargeId,
      payload.receiptUrl, payload.invoiceUrl, payload.promotionCode, payload.couponName, payload.metadata,
      payload.paidAt, payload.createdAt, payload.updatedAt
    );
  }

  return db.prepare('SELECT * FROM payment_records WHERE id = ?').get(payload.id);
}

function publicPaymentRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    provider: record.provider || 'stripe',
    status: record.status || 'pending',
    paymentMethod: record.paymentMethod || 'stripe',
    productName: record.productName || 'AiX Member',
    amount: Number(record.amount || 0),
    amountSubtotal: Number(record.amountSubtotal || 0),
    amountDiscount: Number(record.amountDiscount || 0),
    amountTax: Number(record.amountTax || 0),
    currency: String(record.currency || 'thb').toUpperCase(),
    receiptUrl: record.receiptUrl || '',
    invoiceUrl: record.invoiceUrl || '',
    promotionCode: record.promotionCode || '',
    couponName: record.couponName || '',
    reference: record.stripeSessionId || record.stripePaymentIntentId || record.stripeChargeId || record.id,
    paidAt: record.paidAt || '',
    createdAt: record.createdAt || '',
    updatedAt: record.updatedAt || ''
  };
}

function memberPaymentRecords(member) {
  const rows = db.prepare(`
    SELECT * FROM payment_records
    WHERE memberId = ?
    ORDER BY COALESCE(NULLIF(paidAt, ''), updatedAt, createdAt) DESC
    LIMIT 30
  `).all(member.id);
  if (rows.length) return rows.map(publicPaymentRecord);
  if ((member.paymentStatus || 'unpaid') !== 'paid') return [];
  return [publicPaymentRecord({
    id: `legacy_${member.id}`,
    provider: member.paymentProvider || 'stripe',
    status: 'paid',
    paymentMethod: member.paymentMethod || member.payment || 'stripe',
    productName: 'AiX Member',
    amount: member.paymentAmount ?? MEMBER_PRICE * 100,
    amountSubtotal: member.paymentAmount ?? MEMBER_PRICE * 100,
    amountDiscount: 0,
    amountTax: 0,
    currency: member.paymentCurrency || 'thb',
    receiptUrl: '',
    invoiceUrl: '',
    promotionCode: '',
    couponName: '',
    stripeSessionId: member.stripeSessionId || '',
    stripePaymentIntentId: member.stripePaymentIntentId || '',
    stripeChargeId: '',
    paidAt: member.paidAt || '',
    createdAt: member.paidAt || member.createdAt || '',
    updatedAt: member.updatedAt || ''
  })];
}

async function retrieveStripeCheckoutSession(sessionId) {
  try {
    return await getStripeClient().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge']
    });
  } catch (error) {
    if (String(error.message || '').includes('expand')) {
      return getStripeClient().checkout.sessions.retrieve(sessionId);
    }
    throw error;
  }
}

async function retrieveStripePaymentIntent(paymentIntentId) {
  try {
    return await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge']
    });
  } catch (error) {
    if (String(error.message || '').includes('expand')) {
      return getStripeClient().paymentIntents.retrieve(paymentIntentId);
    }
    throw error;
  }
}

async function retrieveStripeCharge(chargeId) {
  return getStripeClient().charges.retrieve(chargeId);
}

function paidStripeRecordMissingReceipt(record = {}) {
  const status = String(record.status || '').toLowerCase();
  return record.provider === 'stripe'
    && (status === 'paid' || status === 'succeeded')
    && !record.receiptUrl
    && !record.invoiceUrl
    && Number(record.amount || 0) > 0
    && Boolean(record.stripeSessionId || record.stripePaymentIntentId || record.stripeChargeId);
}

async function refreshStripePaymentRecord(record) {
  if (!record || !stripeReady()) return record;

  try {
    if (record.stripeSessionId) {
      const session = await retrieveStripeCheckoutSession(record.stripeSessionId);
      return upsertPaymentRecord(paymentRecordFromStripeSession(session));
    }
    if (record.stripePaymentIntentId) {
      const intent = await retrieveStripePaymentIntent(record.stripePaymentIntentId);
      return upsertPaymentRecord(paymentRecordFromStripePaymentIntent(intent));
    }
    if (record.stripeChargeId) {
      const charge = await retrieveStripeCharge(record.stripeChargeId);
      return upsertPaymentRecord(paymentRecordFromStripeCharge(charge, record));
    }
  } catch (error) {
    console.warn(`Could not refresh Stripe payment record ${record.id}:`, error.message);
  }

  return record;
}

async function refreshMemberPaymentReceipts(member) {
  if (!stripeReady()) return;
  const rows = db.prepare(`
    SELECT * FROM payment_records
    WHERE memberId = ?
    ORDER BY COALESCE(NULLIF(paidAt, ''), updatedAt, createdAt) DESC
    LIMIT 30
  `).all(member.id);
  for (const row of rows) {
    if (paidStripeRecordMissingReceipt(row)) {
      await refreshStripePaymentRecord(row);
    }
  }
}

function markMemberPaid(memberId, paymentData = {}) {
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!existing) return null;

  const now = new Date();
  const expiresAt = existing.expiresAt || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE members
    SET paymentStatus = 'paid',
        paidAt = COALESCE(NULLIF(paidAt, ''), ?),
        expiresAt = ?,
        payment = ?,
        paymentMethod = ?,
        paymentProvider = ?,
        paymentAmount = ?,
        paymentCurrency = ?,
        stripeCustomerId = COALESCE(NULLIF(?, ''), stripeCustomerId),
        stripeSessionId = COALESCE(NULLIF(?, ''), stripeSessionId),
        stripePaymentIntentId = COALESCE(NULLIF(?, ''), stripePaymentIntentId),
        updatedAt = ?
    WHERE id = ?
  `).run(
    now.toISOString(),
    expiresAt,
    paymentData.paymentMethod || existing.payment || 'stripe',
    paymentData.paymentMethod || existing.paymentMethod || 'stripe',
    paymentData.paymentProvider || existing.paymentProvider || 'stripe',
    Number(paymentData.amount ?? existing.paymentAmount ?? MEMBER_PRICE * 100),
    String(paymentData.currency || existing.paymentCurrency || 'thb').toLowerCase(),
    paymentData.stripeCustomerId || '',
    paymentData.stripeSessionId || '',
    paymentData.stripePaymentIntentId || '',
    now.toISOString(),
    memberId
  );

  return db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
}

function memberIdFromStripeObject(object = {}) {
  return object.metadata?.member_id || object.client_reference_id || object.client_reference_id?.toString();
}

function applyPaidStripeSession(session) {
  const memberId = memberIdFromStripeObject(session);
  if (!memberId) return null;
  upsertPaymentRecord(paymentRecordFromStripeSession(session));
  return markMemberPaid(memberId, {
    paymentMethod: paymentMethodLabelFromTypes(session.payment_method_types || []),
    paymentProvider: 'stripe',
    amount: session.amount_total ?? MEMBER_PRICE * 100,
    currency: session.currency || 'thb',
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
    stripeSessionId: session.id || '',
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || ''
  });
}

async function handleStripeWebhook(req, res) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า STRIPE_WEBHOOK_SECRET' });
  }

  let event;
  try {
    event = getStripeClient().webhooks.constructEvent(req.body, req.get('stripe-signature'), STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = await retrieveStripeCheckoutSession(event.data.object.id).catch(() => event.data.object);
      upsertPaymentRecord(paymentRecordFromStripeSession(session));
      if (session.payment_status === 'paid') applyPaidStripeSession(session);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = await retrieveStripePaymentIntent(event.data.object.id).catch(() => event.data.object);
      const memberId = intent.metadata?.member_id;
      upsertPaymentRecord(paymentRecordFromStripePaymentIntent(intent));
      if (memberId) {
        markMemberPaid(memberId, {
          paymentMethod: intent.payment_method_types?.[0] || 'stripe',
          paymentProvider: 'stripe',
          amount: intent.amount_received ?? intent.amount ?? MEMBER_PRICE * 100,
          currency: intent.currency || 'thb',
          stripePaymentIntentId: intent.id
        });
      }
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return res.status(500).json({ error: 'Stripe webhook processing failed' });
  }

  res.json({ received: true });
}

async function sendSmsMessage(phone, message) {
  const thaiBulkKey = process.env.THAIBULKSMS_API_KEY;
  const thaiBulkSecret = process.env.THAIBULKSMS_API_SECRET;
  const thaiBulkSender = process.env.THAIBULKSMS_SENDER || 'Demo';

  if (thaiBulkKey && thaiBulkSecret) {
    const body = new URLSearchParams({
      msisdn: normalizePhone(phone),
      message,
      sender: thaiBulkSender
    });
    const response = await fetch('https://api-v2.thaibulksms.com/sms', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${thaiBulkKey}:${thaiBulkSecret}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || data.message || 'ThaibulkSMS ส่ง SMS ไม่สำเร็จ');
    }
    return { provider: 'thaibulksms' };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[SMS DEV] ${phone}: ${message}`);
    return { provider: 'dev' };
  }

  const body = new URLSearchParams({
    To: toThaiInternationalPhone(phone),
    From: from,
    Body: message
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'ไม่สามารถส่ง SMS ได้');
  }
  return { provider: 'twilio' };
}

function getSmsConfig() {
  if (process.env.THAIBULKSMS_API_KEY && process.env.THAIBULKSMS_API_SECRET) {
    return { provider: 'thaibulksms', ready: true };
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return { provider: 'twilio', ready: true };
  }
  return { provider: 'dev', ready: false };
}

function requireValidMemberInput(input) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const business = String(input.business || '').trim();
  const password = String(input.password || '');
  const passwordConfirm = String(input.passwordConfirm || '');

  if (!firstName || !email || !phone) {
    return { error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ' };
  }
  if (email.length > SESSION_IDENTITY_MAX_LENGTH || !EMAIL_RE.test(email)) {
    return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (!PHONE_RE.test(phone)) {
    return { error: 'รูปแบบเบอร์โทรไม่ถูกต้อง ต้องเป็นเบอร์ 10 หลักที่ขึ้นต้นด้วย 0' };
  }
  if (!input.googleCredential && password.length < 8) {
    return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
  }
  if (!input.googleCredential && password !== passwordConfirm) {
    return { error: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน' };
  }
  if (!input.consentAccepted) {
    return { error: 'กรุณายืนยันข้อมูลและการติดต่อก่อนสมัครสมาชิก' };
  }

  return { email, phone, firstName, lastName, business, password };
}

function publicMember(member) {
  if (!member) return null;
  const displayName = member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email;
  const safePhone = String(member.phone || '').startsWith('auth_') ? '' : member.phone;
  return {
    id: member.id,
    userId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    displayName,
    name: displayName,
    email: member.email,
    phone: safePhone,
    lineId: member.lineId,
    business: member.business,
    courseId: member.courseId,
    membership: member.membership,
    payment: member.payment,
    paymentMethod: member.paymentMethod || member.payment || '',
    paymentProvider: member.paymentProvider || '',
    paymentAmount: member.paymentAmount ?? 0,
    paymentCurrency: member.paymentCurrency || 'thb',
    role: member.role || 'member',
    status: member.status || 'active',
    paymentStatus: member.paymentStatus || 'unpaid',
    payment_status: member.paymentStatus || 'unpaid',
    paidAt: member.paidAt || '',
    paid_at: member.paidAt || '',
    expiresAt: member.expiresAt || '',
    expires_at: member.expiresAt || '',
    authProvider: member.authProvider,
    provider: member.authProvider,
    picture: member.avatarUrl || member.picture,
    avatarUrl: member.avatarUrl || member.picture,
    avatar_url: member.avatarUrl || member.picture,
    emailVerified: Boolean(member.emailVerified),
    phoneVerified: Boolean(member.phoneVerified),
    marketingConsent: Boolean(member.marketingConsent),
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    lastLoginAt: member.lastLoginAt
  };
}

function memberAccess(member) {
  const paymentStatus = member?.paymentStatus || 'unpaid';
  const expiresAt = member?.expiresAt || '';
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const expired = paymentStatus === 'paid' && Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  return {
    paid: paymentStatus === 'paid',
    expired,
    active: paymentStatus === 'paid' && !expired,
    expiresAt
  };
}

function memberHasActiveAccess(member) {
  return memberAccess(member).active;
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

async function getGoogleJwks() {
  if (googleJwksCache.expiresAt > Date.now() && googleJwksCache.keys.length) {
    return googleJwksCache.keys;
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) throw new Error('ไม่สามารถโหลด Google public keys ได้');
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 300);
  const data = await response.json();
  googleJwksCache = {
    expiresAt: Date.now() + (maxAge * 1000),
    keys: data.keys || []
  };
  return googleJwksCache.keys;
}

async function verifyGoogleCredential(credential) {
  if (!isValidGoogleClientId(GOOGLE_CLIENT_ID)) {
    throw new Error('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID');
  }

  const parts = String(credential || '').split('.');
  if (parts.length !== 3) throw new Error('Google credential ไม่ถูกต้อง');

  const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  const signature = base64UrlDecode(parts[2]);
  const keys = await getGoogleJwks();
  const key = keys.find((item) => item.kid === header.kid);
  if (!key) throw new Error('ไม่พบ Google public key สำหรับตรวจสอบ token');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const validSignature = verifier.verify(crypto.createPublicKey({ key, format: 'jwk' }), signature);
  if (!validSignature) throw new Error('Google token signature ไม่ถูกต้อง');

  const issuerOk = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
  if (!issuerOk) throw new Error('Google token issuer ไม่ถูกต้อง');
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('Google token audience ไม่ตรงกับ Client ID');
  if (Number(payload.exp || 0) * 1000 < Date.now()) throw new Error('Google token หมดอายุแล้ว');
  if (!payload.email || payload.email_verified !== true) throw new Error('Google account ยังไม่ยืนยันอีเมล');

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name || '',
    given_name: payload.given_name || '',
    family_name: payload.family_name || '',
    picture: payload.picture || '',
    email_verified: Boolean(payload.email_verified)
  };
}

async function verifyGoogleAccessToken(accessToken) {
  if (!isValidGoogleClientId(GOOGLE_CLIENT_ID)) {
    throw new Error('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID');
  }

  const token = String(accessToken || '').trim();
  if (!token) throw new Error('Google access token ไม่ถูกต้อง');

  const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  if (!tokenInfoResponse.ok) throw new Error('ไม่สามารถตรวจสอบ Google access token ได้');
  const tokenInfo = await tokenInfoResponse.json();
  const audience = tokenInfo.aud || tokenInfo.audience || tokenInfo.azp;
  if (audience !== GOOGLE_CLIENT_ID) throw new Error('Google token audience ไม่ตรงกับ Client ID');

  const scope = String(tokenInfo.scope || '');
  if (!scope.split(/\s+/).includes('email')) throw new Error('Google token ไม่มีสิทธิ์อ่านอีเมล');

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!profileResponse.ok) throw new Error('ไม่สามารถโหลดข้อมูล Google account ได้');
  const payload = await profileResponse.json();
  if (!payload.email || payload.email_verified !== true) throw new Error('Google account ยังไม่ยืนยันอีเมล');

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name || '',
    given_name: payload.given_name || '',
    family_name: payload.family_name || '',
    picture: payload.picture || '',
    email_verified: Boolean(payload.email_verified)
  };
}

function upsertGoogleMember(profile) {
  const googleSub = String(profile.sub || '');
  const email = normalizeEmail(profile.email);
  const member = db.prepare('SELECT * FROM members WHERE googleSub = ? OR email = ?').get(googleSub, email);

  if (member) {
    assertMemberSessionEligible(member);
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE members
      SET lastLoginAt = ?, updatedAt = ?, emailVerified = 1,
          googleSub = COALESCE(NULLIF(googleSub, ''), ?),
          authProvider = CASE WHEN authProvider IN ('', 'email') THEN 'google' ELSE authProvider END,
          displayName = COALESCE(NULLIF(displayName, ''), ?),
          picture = COALESCE(NULLIF(picture, ''), ?),
          avatarUrl = COALESCE(NULLIF(avatarUrl, ''), ?)
      WHERE id = ?
    `).run(now, now, googleSub, profile.name, profile.picture, profile.picture, member.id);
    return { member: db.prepare('SELECT * FROM members WHERE id = ?').get(member.id), created: false };
  }

  const id = createMemberId();
  const candidateMember = { id, email, status: 'active' };
  assertMemberSessionEligible(candidateMember);
  const now = new Date().toISOString();
  const names = splitDisplayName(profile.name);
  db.prepare(`
    INSERT INTO members (
      id, firstName, lastName, displayName, email, phone, lineId, business, courseId, membership, payment,
      status, paymentStatus, authProvider, googleSub, picture, avatarUrl, emailVerified, phoneVerified,
      consentAccepted, marketingConsent, createdAt, updatedAt, lastLoginAt
    )
    VALUES (?, ?, ?, ?, ?, ?, '', '', 'aix-membership-gen-zero', 'aix-member', 'online',
      'active', 'unpaid', 'google', ?, ?, ?, 1, 0, 1, 0, ?, ?, ?)
  `).run(
    id,
    profile.given_name || names.firstName,
    profile.family_name || names.lastName,
    profile.name || email,
    email,
    `auth_google_${profile.sub}`,
    googleSub,
    profile.picture,
    profile.picture,
    now,
    now,
    now
  );

  return { member: db.prepare('SELECT * FROM members WHERE id = ?').get(id), created: true };
}

app.get('/api/config', (req, res) => {
  const sms = getSmsConfig();
  const googleReady = isValidGoogleClientId(GOOGLE_CLIENT_ID);

  res.setHeader('Cache-Control', 'no-store');

  res.json({
    googleClientId: googleReady ? GOOGLE_CLIENT_ID : '',
    googleReady,
    smsProvider: sms.provider,
    smsReady: sms.ready,
    sessionTtlDays: Math.round(AUTH_SESSION_TTL_MS / 86400000),
    memberPrice: MEMBER_PRICE,
    stripeReady: stripeReady(),
    stripePaymentMethods: STRIPE_PAYMENT_METHOD_TYPES
  });
});

// ============================================================
// MEMBER API
// ============================================================
app.post('/api/auth/google', async (req, res) => {
  try {
    const profile = await verifyGoogleCredential(req.body.credential);
    const result = upsertGoogleMember(profile);
    assertMemberSessionEligible(result.member);
    res.json({ ...issueMemberSession(res, result.member), profile, created: result.created });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้' });
  }
});

app.post('/api/auth/google-access-token', async (req, res) => {
  try {
    const profile = await verifyGoogleAccessToken(req.body.accessToken);
    const result = upsertGoogleMember(profile);
    assertMemberSessionEligible(result.member);
    res.json({ ...issueMemberSession(res, result.member), profile, created: result.created });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้' });
  }
});

app.get('/api/members', requireAdminSession, (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY createdAt DESC').all();
  res.json(members.map(publicMember));
});

app.get('/api/members/:id', requireAdminSession, (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'ไม่พบสมาชิก' });
  res.json(publicMember(member));
});

app.put('/api/members/:id', requireAdminSession, (req, res) => {
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบสมาชิก' });

  const displayName = String(req.body.displayName ?? req.body.name ?? existing.displayName ?? '').trim();
  const splitName = splitDisplayName(displayName || `${existing.firstName} ${existing.lastName}`);
  const status = req.body.status ?? existing.status;
  const paymentStatus = req.body.paymentStatus ?? req.body.payment_status ?? existing.paymentStatus;
  const phone = req.body.phone !== undefined ? normalizePhone(req.body.phone) : existing.phone;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'สถานะบัญชีไม่ถูกต้อง' });
  }
  if (!['paid', 'unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'สถานะชำระเงินไม่ถูกต้อง' });
  }
  if (phone && !String(phone).startsWith('auth_') && !PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'รูปแบบเบอร์โทรไม่ถูกต้อง ต้องเป็นเบอร์ 10 หลักที่ขึ้นต้นด้วย 0' });
  }

  const duplicatePhone = phone && phone !== existing.phone
    ? db.prepare('SELECT id FROM members WHERE phone = ? AND id != ?').get(phone, req.params.id)
    : null;
  if (duplicatePhone) return res.status(409).json({ error: 'เบอร์โทรนี้ถูกใช้กับสมาชิกคนอื่นแล้ว' });

  const now = new Date();
  const paidAt = paymentStatus === 'paid'
    ? (req.body.paidAt !== undefined ? String(req.body.paidAt || '') : (existing.paidAt || now.toISOString()))
    : '';
  const expiresAt = paymentStatus === 'paid'
    ? (req.body.expiresAt !== undefined ? String(req.body.expiresAt || '') : (existing.expiresAt || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()))
    : '';

  db.prepare(`
    UPDATE members
    SET firstName = ?, lastName = ?, displayName = ?, phone = ?, business = ?,
        status = ?, paymentStatus = ?, paidAt = ?, expiresAt = ?, membership = ?,
        updatedAt = ?
    WHERE id = ?
  `).run(
    req.body.firstName ?? splitName.firstName,
    req.body.lastName ?? splitName.lastName,
    displayName || `${splitName.firstName} ${splitName.lastName}`.trim(),
    phone || existing.phone,
    String(req.body.business ?? existing.business ?? '').trim(),
    status,
    paymentStatus,
    paidAt,
    expiresAt,
    String(req.body.membership ?? existing.membership ?? 'aix-member').trim(),
    now.toISOString(),
    req.params.id
  );

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(publicMember(member));
});

app.delete('/api/members/:id', requireAdminSession, (req, res) => {
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'ไม่พบสมาชิก' });
  res.json({ success: true });
});

app.post('/api/members/otp/send', HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone, async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);

    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ error: 'กรุณากรอกเบอร์โทร 10 หลักที่ขึ้นต้นด้วย 0' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    const existing = email
      ? db.prepare('SELECT id FROM members WHERE phone = ? OR email = ?').get(phone, email)
      : db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(409).json({ error: 'อีเมลหรือเบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว' });
    }

    res.json(await sendPhoneOtp(phone, 'register'));
  } catch (error) {
    res.status(error.status || 400).json({
      error: error.message || 'ไม่สามารถส่งรหัส SMS ได้',
      retryAfter: error.retryAfter
    });
  }
});

app.post('/api/members/otp/verify', HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone, (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();

  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทร 10 หลักที่ขึ้นต้นด้วย 0' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'รหัส SMS ต้องเป็นตัวเลข 6 หลัก' });
  }

  try {
    res.json(verifyPhoneOtp(phone, code, 'register'));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || 'ยืนยันรหัสไม่สำเร็จ' });
  }
});

app.post('/api/member/phone/otp/send', requireMemberSession, HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone, async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone || req.member.phone);
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ error: 'กรุณากรอกเบอร์โทร 10 หลักที่ขึ้นต้นด้วย 0' });
    }

    const duplicate = db.prepare('SELECT id FROM members WHERE phone = ? AND id != ?').get(phone, req.member.id);
    if (duplicate) {
      return res.status(409).json({ error: 'เบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว' });
    }

    if (phone !== req.member.phone || req.member.phoneVerified) {
      db.prepare('UPDATE members SET phone = ?, phoneVerified = 0, updatedAt = ? WHERE id = ?')
        .run(phone, new Date().toISOString(), req.member.id);
    }

    res.json(await sendPhoneOtp(phone, `payment:${req.member.id}`));
  } catch (error) {
    res.status(error.status || 400).json({
      error: error.message || 'ไม่สามารถส่งรหัส SMS ได้',
      retryAfter: error.retryAfter
    });
  }
});

app.post('/api/member/phone/otp/verify', requireMemberSession, HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone, (req, res) => {
  const phone = normalizePhone(req.body.phone || req.member.phone);
  const code = String(req.body.code || '').trim();

  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทร 10 หลักที่ขึ้นต้นด้วย 0' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'รหัส SMS ต้องเป็นตัวเลข 6 หลัก' });
  }

  try {
    const duplicate = db.prepare('SELECT id FROM members WHERE phone = ? AND id != ?').get(phone, req.member.id);
    if (duplicate) {
      return res.status(409).json({ error: 'เบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว' });
    }

    const result = verifyPhoneOtp(phone, code, `payment:${req.member.id}`);
    db.prepare('UPDATE members SET phone = ?, phoneVerified = 1, updatedAt = ? WHERE id = ?')
      .run(phone, new Date().toISOString(), req.member.id);
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.member.id);
    res.json({
      ...result,
      member: publicMember(member)
    });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || 'ยืนยันรหัสไม่สำเร็จ' });
  }
});

app.post('/api/members/register', async (req, res) => {
  try {
    const input = { ...req.body };
    let googleProfile = null;

    if (input.googleCredential) {
      googleProfile = await verifyGoogleCredential(input.googleCredential);
      input.email = googleProfile.email;
      input.firstName = input.firstName || googleProfile.given_name || googleProfile.name.split(' ')[0];
      input.lastName = input.lastName || googleProfile.family_name || googleProfile.name.split(' ').slice(1).join(' ');
    }

    const valid = requireValidMemberInput(input);
    if (valid.error) return res.status(400).json({ error: valid.error });

    const id = createMemberId();
    const candidateMember = { id, email: valid.email, status: 'active' };
    assertMemberSessionEligible(candidateMember);
    const existing = valid.phone
      ? db.prepare('SELECT * FROM members WHERE email = ? OR phone = ?').get(valid.email, valid.phone)
      : db.prepare('SELECT * FROM members WHERE email = ?').get(valid.email);
    if (existing) {
      return res.status(409).json({ error: 'อีเมลหรือเบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว' });
    }

    const now = new Date().toISOString();
    const displayName = String(input.displayName || `${valid.firstName} ${valid.lastName}`.trim()).trim();
    const passwordHash = googleProfile ? '' : createPasswordHash(valid.password);
    const phoneForDb = valid.phone || `auth_email_${crypto.createHash('sha1').update(valid.email).digest('hex').slice(0, 16)}`;
    const phoneVerified = valid.phone && verifyPhoneVerificationToken(input.phoneVerificationToken, valid.phone, 'register') ? 1 : 0;
    db.prepare(`
      INSERT INTO members (
        id, firstName, lastName, displayName, email, phone, lineId, business, courseId, membership, payment,
        status, paymentStatus, paidAt, expiresAt, authProvider, googleSub, picture, avatarUrl, emailVerified, phoneVerified, passwordHash,
        consentAccepted, marketingConsent, createdAt, updatedAt, lastLoginAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      valid.firstName,
      valid.lastName,
      displayName,
      valid.email,
      phoneForDb,
      String(input.lineId || '').trim(),
      valid.business,
      String(input.courseId || 'aix-membership-gen-zero').trim(),
      String(input.membership || 'aix-member').trim(),
      String(input.payment || 'online').trim(),
      'active',
      'unpaid',
      googleProfile ? 'google' : 'email',
      googleProfile?.sub || null,
      googleProfile?.picture || '',
      googleProfile?.picture || '',
      googleProfile ? 1 : 0,
      phoneVerified,
      passwordHash,
      input.consentAccepted ? 1 : 0,
      input.marketingConsent ? 1 : 0,
      now,
      now,
      now
    );

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    assertMemberSessionEligible(member);
    res.json(issueMemberSession(res, member));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || 'ไม่สามารถสมัครสมาชิกได้' });
  }
});

app.post('/api/members/login', HTTP_SECURITY.memberLoginIp, HTTP_SECURITY.memberLoginIdentity, (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!EMAIL_RE.test(email) || !password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const member = db.prepare('SELECT * FROM members WHERE email = ?').get(email);
  if (!member || !verifyPassword(password, member.passwordHash)) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }
  try {
    assertMemberSessionEligible(member);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE members SET lastLoginAt = ?, updatedAt = ? WHERE id = ?').run(now, now, member.id);
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id);
  res.json(issueMemberSession(res, updated));
});

app.get('/api/auth/me', requireMemberSession, (req, res) => {
  res.json({
    member: publicMember(req.member),
    csrfToken: SESSION_SECURITY.csrfTokenFor(req.authSession)
  });
});

app.post('/api/auth/logout', requireMemberSession, (req, res) => {
  SESSION_SECURITY.clearMember(res);
  expireRetiredMemberCookieOnce(res);
  res.json({ ok: true });
});

app.get('/api/member/dashboard', requireMemberSession, async (req, res) => {
  const member = publicMember(req.member);
  const access = memberAccess(req.member);
  const courses = access.active
    ? db.prepare('SELECT * FROM courses WHERE featured = 1 ORDER BY sortOrder ASC, name ASC').all().map(publicCourse)
    : [];
  const resources = access.active
    ? db.prepare(`
        SELECT * FROM member_resources
        WHERE visibility = 'members'
        ORDER BY sortOrder ASC, createdAt DESC
      `).all().map(memberResource)
    : [];
  const schedule = access.active ? getUpcomingSchedules().slice(0, 8) : [];
  const notifications = access.active ? ensureScheduleNotifications(req.member) : [];
  const progress = memberLearningProgress(req.member.id);
  let payments = memberPaymentRecords(req.member);

  if (stripeReady()) {
    await refreshMemberPaymentReceipts(req.member);
    payments = memberPaymentRecords(req.member);
  }

  const hasOnlyLegacyPayment = payments.length === 1 && payments[0].id === `legacy_${req.member.id}`;
  if ((!payments.length || hasOnlyLegacyPayment) && req.member.stripeSessionId && stripeReady()) {
    try {
      const session = await retrieveStripeCheckoutSession(req.member.stripeSessionId);
      if (memberIdFromStripeObject(session) === req.member.id) {
        upsertPaymentRecord(paymentRecordFromStripeSession(session));
        payments = memberPaymentRecords(req.member);
      }
    } catch (error) {
      console.warn('Could not refresh Stripe payment history:', error.message);
    }
  }

  res.json({
    member,
    courses,
    resources,
    schedule,
    notifications,
    progress,
    payments,
    access,
    nextAction: access.active ? 'learn' : 'pay',
    payment: {
      amount: MEMBER_PRICE,
      currency: 'THB',
      status: member.paymentStatus,
      active: access.active,
      expired: access.expired,
      paidAt: member.paidAt,
      expiresAt: member.expiresAt
    }
  });
});

app.get('/api/member/schedules/:id', requireMemberSession, (req, res) => {
  const access = memberAccess(req.member);
  if (!access.active) {
    return res.status(402).json({
      error: access.expired ? 'สมาชิกหมดอายุแล้ว กรุณาต่ออายุเพื่อเข้าเรียนสด' : 'กรุณาชำระเงินเพื่อเข้าเรียนสด',
      paymentRequired: true,
      expired: access.expired,
      expiresAt: access.expiresAt
    });
  }

  const schedule = getScheduleById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'ไม่พบตารางเรียนสดนี้' });

  const courseRow = schedule.courseId
    ? db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(schedule.courseId)
    : null;
  const course = courseRow ? publicCourse(courseRow) : null;
  res.json({
    schedule,
    course,
    learningUrl: course ? `/course/${encodeURIComponent(course.id)}/learn?module=0&ready=1` : '/dashboard#courses'
  });
});

app.get('/api/member/notifications', requireMemberSession, (req, res) => {
  ensureScheduleNotifications(req.member);
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE memberId = ?
    ORDER BY CASE WHEN status = 'unread' THEN 0 ELSE 1 END, createdAt DESC
    LIMIT 50
  `).all(req.member.id).map(publicNotification);
  res.json(notifications);
});

app.post('/api/member/notifications/:id/read', requireMemberSession, (req, res) => {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE notifications
    SET status = 'read', readAt = ?
    WHERE id = ? AND memberId = ?
  `).run(now, req.params.id, req.member.id);
  if (result.changes === 0) return res.status(404).json({ error: 'ไม่พบแจ้งเตือนนี้' });
  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  res.json(publicNotification(notification));
});

app.post('/api/member/progress', requireMemberSession, (req, res) => {
  const access = memberAccess(req.member);
  if (!access.active) {
    return res.status(402).json({
      error: access.expired ? 'สมาชิกหมดอายุแล้ว กรุณาต่ออายุเพื่อเข้าเรียน' : 'กรุณาชำระเงินเพื่อเข้าเรียน',
      paymentRequired: true,
      expired: access.expired,
      expiresAt: access.expiresAt
    });
  }

  const courseId = String(req.body?.courseId || '').trim();
  if (!courseId) return res.status(400).json({ error: 'กรุณาระบุคอร์ส' });

  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND featured = 1').get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const activeIndex = Math.min(Math.max(Number.parseInt(req.body?.activeIndex, 10) || 0, 0), 500);
  const totalModules = Math.min(Math.max(Number.parseInt(req.body?.totalModules, 10) || 0, activeIndex + 1), 500);
  const requestedCompleted = Number.parseInt(req.body?.completedCount, 10) || activeIndex + 1;
  const completedCount = Math.min(Math.max(requestedCompleted, activeIndex + 1), Math.max(totalModules, activeIndex + 1));
  const moduleTitle = String(req.body?.moduleTitle || '').trim().slice(0, 200);
  const existing = db.prepare(`
    SELECT * FROM learning_progress
    WHERE memberId = ? AND courseId = ?
  `).get(req.member.id, courseId);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE learning_progress
      SET activeIndex = ?,
          completedCount = ?,
          totalModules = ?,
          moduleTitle = ?,
          updatedAt = ?
      WHERE memberId = ? AND courseId = ?
    `).run(
      activeIndex,
      Math.max(Number(existing.completedCount || 0), completedCount),
      Math.max(Number(existing.totalModules || 0), totalModules),
      moduleTitle || existing.moduleTitle || '',
      now,
      req.member.id,
      courseId
    );
  } else {
    db.prepare(`
      INSERT INTO learning_progress (
        memberId, courseId, activeIndex, completedCount, totalModules, moduleTitle, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.member.id, courseId, activeIndex, completedCount, totalModules, moduleTitle, now);
  }

  const progress = db.prepare(`
    SELECT * FROM learning_progress
    WHERE memberId = ? AND courseId = ?
  `).get(req.member.id, courseId);
  res.json({ progress: publicLearningProgress(progress) });
});

app.get('/api/member/payments', requireMemberSession, async (req, res) => {
  if (stripeReady()) {
    await refreshMemberPaymentReceipts(req.member).catch((error) => {
      console.warn('Could not refresh member payments:', error.message);
    });
  }
  res.json({
    payments: memberPaymentRecords(req.member)
  });
});

app.get('/api/payments/config', requireMemberSession, (req, res) => {
  const access = memberAccess(req.member);
  res.json({
    amount: MEMBER_PRICE,
    currency: 'THB',
    stripeReady: stripeReady(),
    paymentMethods: STRIPE_PAYMENT_METHOD_TYPES,
    paymentStatus: req.member.paymentStatus || 'unpaid',
    phone: publicMember(req.member).phone,
    phoneVerified: Boolean(req.member.phoneVerified),
    phoneVerificationRequired: !req.member.phoneVerified,
    active: access.active,
    expired: access.expired,
    expiresAt: access.expiresAt
  });
});

app.post('/api/payments/stripe/checkout', requireMemberSession, async (req, res) => {
  try {
    if (memberHasActiveAccess(req.member)) {
      return res.status(400).json({ error: 'บัญชีนี้ชำระเงินแล้ว' });
    }
    if (!req.member.phoneVerified) {
      return res.status(403).json({
        error: 'กรุณายืนยันเบอร์โทรก่อนชำระเงิน',
        phoneVerificationRequired: true
      });
    }
    if (!stripeReady()) {
      return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า Stripe API Key' });
    }

    const stripe = getStripeClient();
    const paymentMethodTypes = requestedStripePaymentTypes(req.body.paymentMethod);
    const origin = getRequestOrigin(req);
    const memberName = req.member.displayName || `${req.member.firstName || ''} ${req.member.lastName || ''}`.trim() || req.member.email;
    const metadata = {
      member_id: req.member.id,
      customer_email: req.member.email,
      customer_name: memberName,
      membership: req.member.membership || 'aix-member'
    };

    const lineItem = STRIPE_PRICE_ID
      ? { price: STRIPE_PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: 'thb',
            product_data: {
              name: 'AiX Member',
              description: 'สมาชิก AiX Club สำหรับเข้าถึงคอร์ส AI, วิดีโอย้อนหลัง, Template และ Resource'
            },
            unit_amount: MEMBER_PRICE * 100
          },
          quantity: 1
        };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      payment_method_types: paymentMethodTypes,
      line_items: [lineItem],
      customer_email: req.member.email,
      client_reference_id: req.member.id,
      metadata,
      payment_intent_data: { metadata },
      locale: 'th',
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?cancelled=1`
    });

    db.prepare(`
      UPDATE members
      SET payment = ?, paymentMethod = ?, paymentProvider = 'stripe',
          stripeSessionId = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      paymentMethodLabelFromTypes(paymentMethodTypes),
      paymentMethodLabelFromTypes(paymentMethodTypes),
      session.id,
      new Date().toISOString(),
      req.member.id
    );
    upsertPaymentRecord(paymentRecordFromStripeSession(session));

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentMethodTypes
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถสร้าง Stripe Checkout ได้' });
  }
});

app.get('/api/payments/stripe/session/:sessionId', requireMemberSession, async (req, res) => {
  try {
    if (!stripeReady()) {
      return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า Stripe API Key' });
    }

    const session = await retrieveStripeCheckoutSession(req.params.sessionId);
    const sessionMemberId = memberIdFromStripeObject(session);
    if (sessionMemberId && sessionMemberId !== req.member.id) {
      return res.status(403).json({ error: 'Session นี้ไม่ตรงกับสมาชิกที่เข้าสู่ระบบ' });
    }

    let member = req.member;
    let paymentRecord = upsertPaymentRecord(paymentRecordFromStripeSession(session));
    if (session.payment_status === 'paid') {
      member = applyPaidStripeSession(session) || req.member;
      paymentRecord = findPaymentRecord(paymentRecordFromStripeSession(session)) || paymentRecord;
    }

    res.json({
      ok: true,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      member: publicMember(member),
      payment: publicPaymentRecord(paymentRecord)
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถตรวจสอบ Stripe Session ได้' });
  }
});

app.post('/api/payments/confirm', requireMemberSession, (req, res) => {
  if (process.env.ALLOW_DEV_PAYMENT_CONFIRM !== 'true') {
    return res.status(403).json({ error: 'ปิด mock payment แล้ว กรุณาชำระผ่าน Stripe หรือ PromptPay' });
  }
  if (!req.member.phoneVerified) {
    return res.status(403).json({
      error: 'กรุณายืนยันเบอร์โทรก่อนชำระเงิน',
      phoneVerificationRequired: true
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  db.prepare(`
    UPDATE members
    SET paymentStatus = 'paid', paidAt = ?, expiresAt = ?, payment = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    now.toISOString(),
    expiresAt.toISOString(),
    String(req.body.paymentMethod || 'online').trim(),
    now.toISOString(),
    req.member.id
  );

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.member.id);
  console.log(`[EMAIL DEV] Payment confirmation queued for ${member.email}`);
  res.json({
    ok: true,
    member: publicMember(member),
    payment: {
      amount: MEMBER_PRICE,
      currency: 'THB',
      paidAt: member.paidAt,
      expiresAt: member.expiresAt
    }
  });
});

// ============================================================
// AUTH API
// ============================================================
app.post('/api/auth/signup', (req, res) => {
  res.status(410).json({ error: 'เส้นทางนี้ยกเลิกแล้ว กรุณาใช้ระบบสมาชิก AiX' });
});

app.post('/api/auth/login', (req, res) => {
  res.status(410).json({ error: 'เส้นทางนี้ยกเลิกแล้ว กรุณาใช้ระบบสมาชิก AiX' });
});

function parseJsonField(value, fallback = []) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function omitInternalFilePaths(value) {
  if (Array.isArray(value)) return value.map(omitInternalFilePaths);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'filePath')
    .map(([key, child]) => [key, omitInternalFilePaths(child)]));
}

function publicCourse(course) {
  if (!course) return null;
  return omitInternalFilePaths({
    id: course.id,
    title: course.name,
    name: course.name,
    originalPrice: course.originalPrice || 0,
    type: course.type || course.level || '',
    status: course.status || '',
    subtitle: course.subtitle || course.description || '',
    description: course.description || course.subtitle || '',
    overview: course.overview || course.description || '',
    instructor: course.instructor || 'AiX Team',
    image: course.image || '',
    price: course.price || 0,
    rating: course.rating ? String(course.rating) : 'New',
    ratingCount: course.ratingCount || 0,
    students: course.students || 0,
    learners: course.learners || '',
    duration: course.durationText || (course.hours ? `${course.hours} ชั่วโมง` : ''),
    hours: course.hours || 0,
    level: course.level || '',
    schedule: course.schedule || '',
    lessons: course.lessonsText || (course.lessons ? `${course.lessons} lessons` : ''),
    lessonsCount: course.lessons || 0,
    skills: parseJsonField(course.skills),
    tools: parseJsonField(course.tools),
    outcomes: parseJsonField(course.outcomes),
    topics: parseJsonField(course.outcomes),
    info: parseJsonField(course.info),
    syllabus: parseJsonField(course.syllabus),
    project: course.project || '',
    faq: parseJsonField(course.faq),
    brandFocus: parseJsonField(course.brandFocus),
    sortOrder: course.sortOrder || 0,
    featured: Boolean(course.featured)
  });
}

function publicCatalogCourse(course) {
  const projected = publicCourse(course);
  if (!projected) return null;
  return {
    id: projected.id,
    title: projected.title,
    name: projected.name,
    originalPrice: projected.originalPrice,
    type: projected.type,
    status: projected.status,
    subtitle: projected.subtitle,
    description: projected.description,
    overview: projected.overview,
    instructor: projected.instructor,
    image: projected.image,
    price: projected.price,
    rating: projected.rating,
    ratingCount: projected.ratingCount,
    students: projected.students,
    learners: projected.learners,
    duration: projected.duration,
    hours: projected.hours,
    level: projected.level,
    schedule: projected.schedule,
    lessons: projected.lessons,
    lessonsCount: projected.lessonsCount,
    skills: projected.skills,
    tools: projected.tools,
    outcomes: projected.outcomes,
    topics: projected.topics,
    info: projected.info,
    syllabus: projected.syllabus,
    project: projected.project,
    faq: projected.faq,
    brandFocus: projected.brandFocus
  };
}

function publicReplay(replay) {
  if (!replay) return null;
  return omitInternalFilePaths({
    id: replay.id,
    courseId: replay.courseId,
    courseTitle: replay.courseTitle || replay.courseName || '',
    title: replay.title,
    description: replay.description || '',
    videoUrl: safeExternalUrl(replay.videoUrl),
    mediaUrl: '',
    duration: replay.durationText || '',
    durationText: replay.durationText || '',
    visibility: replay.visibility || 'members',
    sortOrder: replay.sortOrder || 0,
    createdAt: replay.createdAt,
    updatedAt: replay.updatedAt
  });
}

function publicResource(resource) {
  if (!resource) return null;
  return omitInternalFilePaths({
    id: resource.id,
    courseId: resource.courseId || '',
    courseTitle: resource.courseTitle || resource.courseName || '',
    type: resource.type || 'tool',
    title: resource.title,
    description: resource.description || '',
    url: safeExternalUrl(resource.url),
    mediaUrl: '',
    fileName: resource.fileName || '',
    tags: parseJsonField(resource.tags),
    visibility: resource.visibility || 'members',
    sortOrder: resource.sortOrder || 0,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt
  });
}

function safeExternalUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\/(?!\/)/u.test(text)) {
    const rawPath = text.split(/[?#]/u, 1)[0];
    const unsafeSegments = (pathname) => pathname.split('/').some((segment) => segment === '.' || segment === '..');
    const unsafePath = (pathname) => (
      /[\\\0\x00-\x1f\x7f]/u.test(pathname) ||
      unsafeSegments(pathname) ||
      /^\/uploads(?:\/|$)/iu.test(pathname)
    );
    if (unsafePath(rawPath) || /%(?![0-9a-f]{2})/iu.test(rawPath)) return '';
    let decodedPath = rawPath;
    try {
      for (let pass = 0; pass < 2 && /%[0-9a-f]{2}/iu.test(decodedPath); pass += 1) {
        decodedPath = decodeURIComponent(decodedPath.replace(/%(?![0-9a-f]{2})/giu, '%25'));
        if (unsafePath(decodedPath)) return '';
      }
    } catch {
      return '';
    }
    return text;
  }
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function protectedMediaUrl(family, row) {
  return row?.filePath ? `/api/media/${family}/${encodeURIComponent(row.id)}` : '';
}

function memberReplay(replay) {
  const item = publicReplay(replay);
  if (!item) return null;
  const mediaUrl = protectedMediaUrl('replays', replay);
  return { ...item, videoUrl: mediaUrl || safeExternalUrl(replay.videoUrl), mediaUrl };
}

function adminReplay(replay) {
  const item = memberReplay(replay);
  return item ? { ...item, hasUpload: Boolean(replay.filePath) } : null;
}

function memberResource(resource) {
  const item = publicResource(resource);
  if (!item) return null;
  const mediaUrl = protectedMediaUrl('resources', resource);
  return { ...item, url: mediaUrl || safeExternalUrl(resource.url), mediaUrl };
}

function adminResource(resource) {
  const item = memberResource(resource);
  return item ? { ...item, hasUpload: Boolean(resource.filePath) } : null;
}

function publicLearningProgress(progress) {
  if (!progress) return null;
  return {
    courseId: progress.courseId,
    activeIndex: Number(progress.activeIndex || 0),
    completedCount: Number(progress.completedCount || 0),
    totalModules: Number(progress.totalModules || 0),
    moduleTitle: progress.moduleTitle || '',
    updatedAt: progress.updatedAt || ''
  };
}

function memberLearningProgress(memberId) {
  return db.prepare(`
    SELECT * FROM learning_progress
    WHERE memberId = ?
    ORDER BY updatedAt DESC
  `).all(memberId).map(publicLearningProgress);
}

function publicSchedule(schedule) {
  if (!schedule) return null;
  return {
    id: schedule.id,
    courseId: schedule.courseId,
    courseTitle: schedule.courseTitle || schedule.courseName || '',
    title: schedule.title,
    description: schedule.description || '',
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt || '',
    meetingUrl: schedule.meetingUrl || '',
    notifyBeforeMinutes: schedule.notifyBeforeMinutes || 1440,
    notifyStatus: schedule.notifyStatus || 'scheduled',
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt
  };
}

function publicNotification(notification) {
  if (!notification) return null;
  return {
    id: notification.id,
    scheduleId: notification.scheduleId || '',
    channel: notification.channel || 'dashboard',
    title: notification.title,
    message: notification.message || '',
    status: notification.status || 'unread',
    createdAt: notification.createdAt,
    readAt: notification.readAt || ''
  };
}

function courseModules(publicData, replays = []) {
  const syllabus = Array.isArray(publicData.syllabus) ? publicData.syllabus : [];
  const modules = syllabus.map((module, index) => ({
    id: `${publicData.id}-module-${index + 1}`,
    title: module.title || `Module ${index + 1}`,
    time: module.time || 'บทเรียน',
    lessons: Array.isArray(module.points) ? module.points : [],
    videoUrl: replays[index]?.videoUrl || '',
    status: 'available'
  }));

  if (modules.length) return modules;

  return [{
    id: `${publicData.id}-module-1`,
    title: publicData.title || 'เริ่มต้นคอร์ส',
    time: publicData.duration || 'บทเรียน',
    lessons: [
      publicData.overview || publicData.description || 'อ่านภาพรวมคอร์สและเริ่มลงมือทำตามขั้นตอน',
      'ใช้พื้นที่หมายเหตุเพื่อจดสิ่งที่เรียนรู้',
      'ถาม AiX Coach เพื่อขอสรุป ตัวอย่าง prompt หรือ checklist เพิ่ม'
    ].filter(Boolean),
    videoUrl: replays[0]?.videoUrl || '',
    status: 'available'
  }];
}

function truncateText(value = '', max = 2200) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function lessonKnowledgeBase(publicData, modules = [], resources = [], moduleIndex = 0) {
  const index = Math.min(Math.max(Number(moduleIndex) || 0, 0), Math.max(modules.length - 1, 0));
  const module = modules[index] || modules[0] || {
    title: publicData.title || 'บทเรียน',
    time: publicData.duration || '',
    lessons: []
  };
  const relevantResources = resources
    .filter((resource) => !resource.courseId || resource.courseId === publicData.id)
    .slice(0, 8)
    .map((resource) => ({
      title: resource.title,
      type: resource.type,
      description: resource.description || '',
      tags: Array.isArray(resource.tags) ? resource.tags.slice(0, 5) : []
    }));

  return {
    courseId: publicData.id,
    courseTitle: publicData.title,
    courseOverview: truncateText(publicData.overview || publicData.description || '', 1400),
    courseOutcomes: (publicData.outcomes || []).slice(0, 8),
    moduleIndex: index,
    moduleTitle: module.title,
    moduleTime: module.time || '',
    lessonPoints: (module.lessons || []).slice(0, 12),
    neighboringModules: modules.map((item, itemIndex) => ({
      index: itemIndex,
      title: item.title,
      isActive: itemIndex === index
    })),
    resources: relevantResources
  };
}

function teacherModeLabel(mode = 'ask') {
  const map = {
    ask: 'ถามตอบบทเรียน',
    check: 'ตรวจคำตอบนักเรียน',
    practice: 'สร้างแบบฝึกหัด',
    summarize: 'สรุปบทเรียน',
    review: 'ตรวจงาน Practice Lab'
  };
  return map[mode] || map.ask;
}

function buildTeacherInstructions(kb) {
  return [
    'คุณคือ AiX Teacher อาจารย์ AI ภาษาไทยในหน้าเรียนของ AiX Club',
    'บทบาทหลักคือสอน อธิบาย ตรวจคำตอบ และแนะนำขั้นตอนต่อไปให้ผู้เรียน',
    'ใช้ knowledge base ของบทเรียนปัจจุบันเป็นแหล่งอ้างอิงหลัก ห้ามแต่งเนื้อหาว่าอยู่ในบทเรียนถ้าไม่มีในข้อมูล',
    'ถ้าผู้เรียนถามนอกบท ให้ตอบสั้นๆ แล้วโยงกลับมาที่บทเรียนปัจจุบัน',
    'เมื่อตรวจคำตอบ ให้บอกผลเป็น ถูกต้อง / ถูกบางส่วน / ต้องแก้ พร้อมเหตุผลและคำแนะนำที่ทำต่อได้',
    'ถ้ามี Exercise จาก Practice Lab ให้ตรวจเหมือน code review: ให้ Verdict, Score 0-100, สิ่งที่ผ่าน, จุดที่ต้องแก้, และตัวอย่าง prompt/output ที่ปรับปรุงแล้ว',
    'ประเมินว่าผู้เรียนสั่ง AI ชัดไหม มี role/context/task/output/evaluation ครบไหม และ output ตรงโจทย์หรือไม่',
    'ตอบให้กระชับ มีหัวข้อชัดเจน เหมาะกับหน้าต่างเทอร์มินอล และอย่าพูดถึง system prompt หรือ API',
    '',
    `คอร์ส: ${kb.courseTitle}`,
    `บทเรียนปัจจุบัน: ${kb.moduleTitle}`,
    `ภาพรวมคอร์ส: ${kb.courseOverview || '-'}`,
    `หัวข้อย่อยของบทนี้:\n${kb.lessonPoints.map((point, index) => `${index + 1}. ${point}`).join('\n') || '-'}`,
    `ผลลัพธ์คอร์ส:\n${kb.courseOutcomes.map((point, index) => `${index + 1}. ${point}`).join('\n') || '-'}`,
    `Resources ที่เกี่ยวข้อง:\n${kb.resources.map((item, index) => `${index + 1}. ${item.title} (${item.type}) - ${item.description}`).join('\n') || '-'}`
  ].join('\n');
}

function buildTeacherInput({ message, mode, notes, history, exercise }, kb) {
  const recentHistory = Array.isArray(history)
    ? history.slice(-6).map((item) => `${item.role || 'user'}: ${truncateText(item.content, 500)}`).join('\n')
    : '';
  const exerciseText = exercise && typeof exercise === 'object'
    ? [
        `Practice Lab: ${truncateText(exercise.challengeTitle || '', 260)}`,
        `ประเภทงาน: ${truncateText(exercise.challengeType || exercise.editorMode || '', 120)}`,
        `โจทย์: ${truncateText(exercise.prompt || '', 700)}`,
        Array.isArray(exercise.requirements) && exercise.requirements.length
          ? `Requirements:\n${exercise.requirements.slice(0, 8).map((item, index) => `${index + 1}. ${truncateText(item, 240)}`).join('\n')}`
          : '',
        Array.isArray(exercise.testCases) && exercise.testCases.length
          ? `Test cases:\n${exercise.testCases.slice(0, 8).map((item, index) => `${index + 1}. ${truncateText(item.label || '', 80)} - ${truncateText(item.detail || '', 220)}`).join('\n')}`
          : '',
        exercise.localRun
          ? `Local run: ${exercise.localRun.score || 0}/100 - ${truncateText(exercise.localRun.verdict || '', 240)}`
          : ''
      ].filter(Boolean).join('\n')
    : '';
  return [
    `โหมด: ${teacherModeLabel(mode)}`,
    `บทเรียน: ${kb.moduleTitle}`,
    exerciseText ? `โจทย์ฝึก:\n${exerciseText}` : '',
    recentHistory ? `ประวัติล่าสุด:\n${recentHistory}` : '',
    notes ? `บันทึกของผู้เรียน:\n${truncateText(notes, 900)}` : '',
    `ข้อความผู้เรียน:\n${truncateText(message, 6000)}`
  ].filter(Boolean).join('\n\n');
}

function extractOpenAIText(payload = {}) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  (payload.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (typeof content.text === 'string') parts.push(content.text);
      if (typeof content.output_text === 'string') parts.push(content.output_text);
    });
  });
  return parts.join('\n').trim();
}

function localTeacherFallback(message, kb, mode = 'ask', exercise = null) {
  const points = kb.lessonPoints.slice(0, 4);
  if (mode === 'check' || /ตรวจ|คำตอบ|ถูกไหม|ถูกหรือ|Practice Lab|Local run/i.test(message)) {
    if (exercise?.localRun) {
      const missing = (exercise.localRun.checks || [])
        .filter((item) => !item.pass)
        .map((item) => item.label)
        .join(', ');
      return [
        `Verdict: ${exercise.localRun.verdict || 'ต้องตรวจเพิ่ม'}`,
        `Score: ${exercise.localRun.score || 0}/100`,
        missing ? `Must fix: เพิ่ม ${missing}` : 'Passed: โครงสร้างหลักครบ role/context/task/output/evaluation',
        points.length ? `ควรผูกกับบทเรียนเพิ่ม: ${points.slice(0, 2).join(' / ')}` : '',
        'Next: เพิ่มตัวอย่าง input จริง 1 ชุด แล้วระบุเกณฑ์ pass/fail ก่อนนำ output ไปใช้'
      ].filter(Boolean).join('\n');
    }
    return [
      'ผลตรวจเบื้องต้น: ผมยังตรวจจากโมเดลหลักไม่ได้ จึงตรวจด้วย knowledge base ในระบบก่อน',
      points.length ? `สิ่งที่คำตอบควรแตะ: ${points.join(' / ')}` : `คำตอบควรอิงจากหัวข้อ "${kb.moduleTitle}"`,
      'ลองเขียนคำตอบให้มี 3 ส่วน: เป้าหมาย, วิธีทำ, ผลลัพธ์ที่ตรวจสอบได้ แล้วส่งมาให้ตรวจอีกครั้ง'
    ].join('\n');
  }
  if (mode === 'practice' || /แบบฝึกหัด|ฝึก|quiz/i.test(message)) {
    return [
      `แบบฝึกหัดจากบท "${kb.moduleTitle}"`,
      '1. สรุปหัวข้อนี้ด้วยภาษาของตัวเอง 3 ข้อ',
      '2. เลือกงานจริง 1 งาน แล้วบอกว่าจะใช้ AI ช่วยตรงจุดไหน',
      '3. เขียน prompt สั้นๆ เพื่อทดลองแนวคิดนี้'
    ].join('\n');
  }
  if (/สรุป|summary/i.test(message)) {
    return `สรุปบท "${kb.moduleTitle}": ${points.join(' / ') || kb.courseOverview || 'เริ่มจากภาพรวมของบทนี้ แล้วลงมือทำตัวอย่างเล็กๆ เพื่อเช็กความเข้าใจ'}`;
  }
  return `จาก knowledge base ของบท "${kb.moduleTitle}" ให้เริ่มที่ ${points[0] || 'เป้าหมายของบทเรียน'} แล้วเช็กความเข้าใจด้วยการสรุปเป็นขั้นตอนสั้นๆ หากต้องการให้ตรวจคำตอบ ให้พิมพ์ขึ้นต้นว่า "ตรวจคำตอบ:"`;
}

async function generateTeacherAnswer({ message, mode, notes, history, exercise, kb, memberId }) {
  if (!OPENAI_API_KEY) {
    return {
      answer: localTeacherFallback(message, kb, mode, exercise),
      source: 'local-fallback',
      model: 'local'
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: buildTeacherInstructions(kb),
      input: buildTeacherInput({ message, mode, notes, history, exercise }, kb),
      max_output_tokens: 1200,
      temperature: 0.35,
      store: false,
      safety_identifier: crypto.createHash('sha256').update(String(memberId || '')).digest('hex'),
      metadata: {
        service: 'aix-teacher',
        courseId: kb.courseId,
        moduleIndex: String(kb.moduleIndex)
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `OpenAI API error ${response.status}`;
    throw new Error(message);
  }

  return {
    answer: extractOpenAIText(payload) || localTeacherFallback(message, kb, mode),
    source: 'openai',
    model: payload.model || OPENAI_MODEL,
    responseId: payload.id || ''
  };
}

function getUpcomingSchedules(courseId = '') {
  const rows = courseId
    ? db.prepare(`
        SELECT s.*, c.name as courseTitle
        FROM class_schedules s
        LEFT JOIN courses c ON c.id = s.courseId
        WHERE s.courseId = ?
        ORDER BY s.startsAt ASC
      `).all(courseId)
    : db.prepare(`
        SELECT s.*, c.name as courseTitle
        FROM class_schedules s
        LEFT JOIN courses c ON c.id = s.courseId
        ORDER BY s.startsAt ASC
      `).all();
  const cutoff = Date.now() - 60 * 60 * 1000;
  return rows
    .filter((item) => Date.parse(item.startsAt) >= cutoff)
    .map(publicSchedule);
}

function getScheduleById(scheduleId) {
  const schedule = db.prepare(`
    SELECT s.*, c.name as courseTitle
    FROM class_schedules s
    LEFT JOIN courses c ON c.id = s.courseId
    WHERE s.id = ?
  `).get(scheduleId);
  return publicSchedule(schedule);
}

function ensureScheduleNotifications(member) {
  if (!member || !memberHasActiveAccess(member)) return [];
  const now = new Date().toISOString();
  const schedules = getUpcomingSchedules();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO notifications (id, memberId, scheduleId, channel, title, message, status, createdAt, readAt)
    VALUES (?, ?, ?, 'dashboard', ?, ?, 'unread', ?, '')
  `);

  schedules.forEach((schedule) => {
    insert.run(
      createRecordId('notice'),
      member.id,
      schedule.id,
      `ตารางเรียน: ${schedule.title}`,
      `${schedule.courseTitle || 'AiX Class'} เริ่มเรียน ${schedule.startsAt}`,
      now
    );
  });

  return db.prepare(`
    SELECT * FROM notifications
    WHERE memberId = ?
    ORDER BY CASE WHEN status = 'unread' THEN 0 ELSE 1 END, createdAt DESC
    LIMIT 20
  `).all(member.id).map(publicNotification);
}

function allowMediaSession(req, res, next) {
  expireRetiredMemberCookieIfPresent(req, res);
  const adminSession = SESSION_SECURITY.readAdmin(req);
  if (adminSession && adminSession.email === ADMIN_EMAIL) {
    req.mediaRole = 'admin';
    req.authSession = adminSession;
    return next();
  }

  const memberSession = SESSION_SECURITY.readMember(req);
  if (!memberSession) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberSession.sub);
  try {
    assertLoginAllowed(member);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }
  if (!memberAccess(member).active) {
    return res.status(403).json({ error: 'สมาชิกยังไม่มีสิทธิ์เข้าถึงไฟล์นี้' });
  }
  req.mediaRole = 'member';
  req.authSession = memberSession;
  req.member = member;
  return next();
}

function resolveStoredUpload(filePath, family) {
  const prefix = `/uploads/${family}/`;
  const value = String(filePath || '');
  if (!value.startsWith(prefix)) return null;
  const filename = value.slice(prefix.length);
  if (
    !filename || filename === '.' || filename === '..' || filename.includes('/') || filename.includes('\\') ||
    /%(?:2f|5c)/i.test(filename) || /[\0\x00-\x1f\x7f]/u.test(filename)
  ) return null;
  return resolveInside(path.join(UPLOAD_ROOT, family), filename);
}

function contentTypeFor(filePath) {
  return ({
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.csv': 'text/csv; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  })[path.extname(String(filePath || '')).toLowerCase()] || 'application/octet-stream';
}

function mediaNotFound(error) {
  return ['ENOENT', 'ENOTDIR', 'ELOOP', 'MEDIA_NOT_FOUND'].includes(error?.code);
}

app.get('/api/media/replays/:id', allowMediaSession, async (req, res, next) => {
  const replay = req.mediaRole === 'admin'
    ? db.prepare('SELECT * FROM course_replays WHERE id = ?').get(req.params.id)
    : db.prepare(`
        SELECT r.* FROM course_replays r
        INNER JOIN courses c ON c.id = r.courseId AND c.featured = 1
        WHERE r.id = ? AND r.visibility = 'members'
      `).get(req.params.id);
  if (!replay?.filePath) return res.sendStatus(404);
  const absolutePath = resolveStoredUpload(replay.filePath, 'replays');
  if (!absolutePath) return res.sendStatus(404);
  try {
    await streamMedia(req, res, {
      absolutePath,
      root: REPLAY_UPLOAD_DIR,
      contentType: path.extname(replay.filePath).toLowerCase() === '.webm' ? 'video/webm' : 'video/mp4',
      disposition: 'inline',
      downloadName: replay.title || path.basename(replay.filePath)
    });
  } catch (error) {
    if (mediaNotFound(error) && !res.headersSent) return res.sendStatus(404);
    return next(error);
  }
});

app.get('/api/media/resources/:id', allowMediaSession, async (req, res, next) => {
  const resource = req.mediaRole === 'admin'
    ? db.prepare('SELECT * FROM member_resources WHERE id = ?').get(req.params.id)
    : db.prepare(`
        SELECT r.* FROM member_resources r
        LEFT JOIN courses c ON c.id = r.courseId AND c.featured = 1
        WHERE r.id = ? AND r.visibility = 'members' AND (r.courseId = '' OR c.id IS NOT NULL)
      `).get(req.params.id);
  if (!resource?.filePath) return res.sendStatus(404);
  const absolutePath = resolveStoredUpload(resource.filePath, 'resources');
  if (!absolutePath) return res.sendStatus(404);
  try {
    await streamMedia(req, res, {
      absolutePath,
      root: RESOURCE_UPLOAD_DIR,
      contentType: contentTypeFor(resource.filePath),
      disposition: 'attachment',
      downloadName: resource.fileName || resource.title || path.basename(resource.filePath)
    });
  } catch (error) {
    if (mediaNotFound(error) && !res.headersSent) return res.sendStatus(404);
    return next(error);
  }
});

// ============================================================
// COURSES API
// ============================================================
app.get('/api/platform/courses', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const courses = db.prepare('SELECT * FROM courses WHERE featured = 1 ORDER BY sortOrder ASC, name ASC').all();
  res.json(courses.map(publicCatalogCourse));
});

app.get('/api/platform/courses/:id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(publicCatalogCourse(course));
});

app.get('/api/courses/:id/content', requireMemberSession, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const access = memberAccess(req.member);
  if (!access.active) {
    return res.status(402).json({
      error: access.expired ? 'สมาชิกหมดอายุแล้ว กรุณาต่ออายุเพื่อเข้าเรียน' : 'กรุณาชำระเงินเพื่อเข้าเรียน',
      paymentRequired: true,
      expired: access.expired,
      expiresAt: access.expiresAt
    });
  }

  const publicData = publicCourse(course);
  const replays = db.prepare(`
    SELECT * FROM course_replays
    WHERE courseId = ? AND visibility = 'members'
    ORDER BY sortOrder ASC, createdAt DESC
  `).all(publicData.id).map(memberReplay);
  const resources = db.prepare(`
    SELECT * FROM member_resources
    WHERE visibility = 'members' AND (courseId = '' OR courseId = ?)
    ORDER BY CASE WHEN courseId = ? THEN 0 ELSE 1 END, sortOrder ASC, createdAt DESC
  `).all(publicData.id, publicData.id).map(memberResource);
  const schedule = getUpcomingSchedules(publicData.id);
  res.json({
    course: publicData,
    modules: courseModules(publicData, replays),
    replays,
    resources,
    schedule
  });
});

app.post('/api/courses/:id/teacher-chat', requireMemberSession, async (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const access = memberAccess(req.member);
  if (!access.active) {
    return res.status(402).json({
      error: access.expired ? 'สมาชิกหมดอายุแล้ว กรุณาต่ออายุเพื่อถาม AiX Teacher' : 'กรุณาชำระเงินเพื่อถาม AiX Teacher',
      paymentRequired: true,
      expired: access.expired,
      expiresAt: access.expiresAt
    });
  }

  const message = truncateText(req.body?.message || '', 6500);
  if (!message) return res.status(400).json({ error: 'กรุณาพิมพ์คำถามหรือคำตอบที่ต้องการให้ตรวจ' });

  const publicData = publicCourse(course);
  const replays = db.prepare(`
    SELECT * FROM course_replays
    WHERE courseId = ? AND visibility = 'members'
    ORDER BY sortOrder ASC, createdAt DESC
  `).all(publicData.id).map(memberReplay);
  const resources = db.prepare(`
    SELECT * FROM member_resources
    WHERE visibility = 'members' AND (courseId = '' OR courseId = ?)
    ORDER BY CASE WHEN courseId = ? THEN 0 ELSE 1 END, sortOrder ASC, createdAt DESC
  `).all(publicData.id, publicData.id).map(memberResource);
  const modules = courseModules(publicData, replays);
  const kb = lessonKnowledgeBase(publicData, modules, resources, req.body?.moduleIndex);
  const mode = ['ask', 'check', 'practice', 'summarize', 'review'].includes(req.body?.mode) ? req.body.mode : 'ask';
  const rawExercise = req.body?.exercise && typeof req.body.exercise === 'object' ? req.body.exercise : null;
  const exercise = rawExercise
    ? {
        editorMode: truncateText(rawExercise.editorMode || '', 80),
        challengeTitle: truncateText(rawExercise.challengeTitle || '', 260),
        challengeType: truncateText(rawExercise.challengeType || '', 120),
        prompt: truncateText(rawExercise.prompt || '', 1000),
        requirements: Array.isArray(rawExercise.requirements)
          ? rawExercise.requirements.slice(0, 8).map((item) => truncateText(item, 260))
          : [],
        testCases: Array.isArray(rawExercise.testCases)
          ? rawExercise.testCases.slice(0, 8).map((item) => ({
              label: truncateText(item?.label || '', 80),
              detail: truncateText(item?.detail || '', 240)
            }))
          : [],
        localRun: rawExercise.localRun && typeof rawExercise.localRun === 'object'
          ? {
              score: Number(rawExercise.localRun.score || 0),
              verdict: truncateText(rawExercise.localRun.verdict || '', 240),
              checks: Array.isArray(rawExercise.localRun.checks)
                ? rawExercise.localRun.checks.slice(0, 8).map((item) => ({
                    label: truncateText(item?.label || '', 80),
                    pass: Boolean(item?.pass)
                  }))
                : []
            }
          : null
      }
    : null;

  try {
    const result = await generateTeacherAnswer({
      message,
      mode,
      notes: truncateText(req.body?.notes || '', 1200),
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      exercise,
      kb,
      memberId: req.member.id
    });

    res.json({
      ...result,
      knowledgeBase: {
        courseId: kb.courseId,
        courseTitle: kb.courseTitle,
        moduleIndex: kb.moduleIndex,
        moduleTitle: kb.moduleTitle,
        lessonPoints: kb.lessonPoints.length
      }
    });
  } catch (error) {
    console.error('AiX Teacher failed:', error.message);
    res.json({
      answer: localTeacherFallback(message, kb, mode, exercise),
      source: 'local-fallback',
      model: 'local',
      warning: 'AI teacher API unavailable; returned lesson fallback instead.',
      knowledgeBase: {
        courseId: kb.courseId,
        courseTitle: kb.courseTitle,
        moduleIndex: kb.moduleIndex,
        moduleTitle: kb.moduleTitle,
        lessonPoints: kb.lessonPoints.length
      }
    });
  }
});

app.get('/api/courses', requireAdminSession, (req, res) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  res.json(courses.map(publicCourse));
});

app.get('/api/courses/:id', requireAdminSession, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(publicCourse(course));
});

app.post('/api/courses', requireAdminSession, (req, res) => {
  const {
    name, price, originalPrice, instructor, level, hours, lessons, image, description,
    type, status, featured
  } = req.body;
  if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อคอร์ส' });

  const id = 'course_' + Date.now();
  db.prepare(
    `INSERT INTO courses (
      id, name, price, originalPrice, instructor, level, hours, lessons, students,
      rating, ratingCount, image, description, type, status, subtitle, overview,
      durationText, lessonsText, featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(name).trim(),
    price || 0,
    originalPrice || 0,
    instructor || 'AiX Team',
    level || 'beginner',
    hours || 0,
    lessons || 0,
    image || '',
    description || '',
    type || level || '',
    status || 'เปิดรับสมัคร',
    description || '',
    description || '',
    hours ? `${hours} ชั่วโมง` : '',
    lessons ? `${lessons} บทเรียน` : '',
    featured === false ? 0 : 1
  );

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  res.json(publicCourse(course));
});

app.put('/api/courses/:id', requireAdminSession, (req, res) => {
  const {
    name, price, originalPrice, instructor, level, hours, lessons, students, rating,
    ratingCount, image, description, type, status, featured
  } = req.body;
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  const nextHours = hours ?? existing.hours;
  const nextLessons = lessons ?? existing.lessons;
  const nextDescription = description ?? existing.description;

  db.prepare(`
    UPDATE courses SET
      name=?, price=?, originalPrice=?, instructor=?, level=?, hours=?, lessons=?,
      students=?, rating=?, ratingCount=?, image=?, description=?, type=?, status=?,
      subtitle=?, overview=?, durationText=?, lessonsText=?, featured=?
    WHERE id=?
  `).run(
    name ?? existing.name, price ?? existing.price, originalPrice ?? existing.originalPrice,
    instructor ?? existing.instructor, level ?? existing.level, nextHours,
    nextLessons, students ?? existing.students, rating ?? existing.rating,
    ratingCount ?? existing.ratingCount, image ?? existing.image, nextDescription,
    type ?? existing.type, status ?? existing.status,
    nextDescription, nextDescription,
    nextHours ? `${nextHours} ชั่วโมง` : existing.durationText,
    nextLessons ? `${nextLessons} บทเรียน` : existing.lessonsText,
    featured !== undefined ? (featured ? 1 : 0) : existing.featured,
    req.params.id
  );

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  res.json(publicCourse(course));
});

app.delete('/api/courses/:id', requireAdminSession, (req, res) => {
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Course not found' });
  res.json({ success: true });
});

// ============================================================
// ADMIN LEARNING ASSETS API
// ============================================================
function adminListReplays() {
  return db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM course_replays r
    LEFT JOIN courses c ON c.id = r.courseId
    ORDER BY r.sortOrder ASC, r.createdAt DESC
  `).all().map(adminReplay);
}

function adminListResources() {
  return db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM member_resources r
    LEFT JOIN courses c ON c.id = r.courseId
    ORDER BY r.sortOrder ASC, r.createdAt DESC
  `).all().map(adminResource);
}

function adminListSchedules() {
  return db.prepare(`
    SELECT s.*, c.name as courseTitle
    FROM class_schedules s
    LEFT JOIN courses c ON c.id = s.courseId
    ORDER BY s.startsAt ASC
  `).all().map(publicSchedule);
}

function normalSort(value, fallback = 0) {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeTagsInput(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateCourseId(courseId, allowEmpty = false) {
  const id = String(courseId || '').trim();
  if (!id && allowEmpty) return '';
  if (!id) return null;
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(id);
  return course ? id : null;
}

const REPLAY_BODY_FIELDS = new Set([
  'courseId', 'title', 'description', 'videoUrl', 'durationText', 'visibility', 'sortOrder'
]);
const RESOURCE_BODY_FIELDS = new Set([
  'courseId', 'type', 'title', 'description', 'url', 'tags', 'visibility', 'sortOrder'
]);
const RESOURCE_TYPES = new Set(['tool', 'skill', 'template', 'file', 'link']);
const ASSET_VISIBILITIES = new Set(['members', 'hidden']);

function uploadInputError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function assertUploadBodyFields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw uploadInputError('ข้อมูลอัปโหลดไม่ถูกต้อง');
  if (Object.values(body).some((value) => typeof value !== 'string')) {
    throw uploadInputError('ช่องข้อมูลอัปโหลดต้องมีค่าเดียว');
  }
  const unknown = Object.keys(body).find((field) => !allowed.has(field));
  if (unknown) throw uploadInputError('พบช่องข้อมูลอัปโหลดที่ไม่รองรับ');
}

function uploadText(body, field, fallback = '', maxBytes = 1000, required = false) {
  const value = body[field] === undefined ? String(fallback || '') : String(body[field] || '').trim();
  if (Buffer.byteLength(value, 'utf8') > maxBytes) throw uploadInputError(`${field} ยาวเกินกำหนด`);
  if (required && !value) throw uploadInputError(`กรุณาระบุ ${field}`);
  return value;
}

function uploadSort(body, fallback = 0) {
  if (body.sortOrder === undefined) return Number(fallback || 0);
  const value = String(body.sortOrder).trim();
  if (!/^-?\d{1,9}$/u.test(value)) throw uploadInputError('ลำดับไม่ถูกต้อง');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw uploadInputError('ลำดับไม่ถูกต้อง');
  return parsed;
}

function uploadVisibility(body, fallback = 'members') {
  const value = uploadText(body, 'visibility', fallback, 20) || 'members';
  if (!ASSET_VISIBILITIES.has(value)) throw uploadInputError('ค่าการมองเห็นไม่ถูกต้อง');
  return value;
}

function uploadExternalUrl(body, field, fallback = '') {
  if (body[field] === undefined) return String(fallback || '');
  const value = uploadText(body, field, '', 2048);
  if (!value) return '';
  const safe = safeExternalUrl(value);
  if (!safe) throw uploadInputError('ลิงก์ต้องเป็น HTTPS หรือ path ภายในระบบที่ปลอดภัย');
  return safe;
}

function replayUploadInput(body, existing = null) {
  assertUploadBodyFields(body, REPLAY_BODY_FIELDS);
  return {
    courseId: uploadText(body, 'courseId', existing?.courseId, 160, true),
    title: uploadText(body, 'title', existing?.title, 240, true),
    description: uploadText(body, 'description', existing?.description, 8000),
    videoUrl: uploadExternalUrl(body, 'videoUrl', existing?.videoUrl),
    durationText: uploadText(body, 'durationText', existing?.durationText, 160),
    visibility: uploadVisibility(body, existing?.visibility),
    sortOrder: uploadSort(body, existing?.sortOrder)
  };
}

function resourceUploadInput(body, existing = null) {
  assertUploadBodyFields(body, RESOURCE_BODY_FIELDS);
  const type = uploadText(body, 'type', existing?.type || 'tool', 40) || 'tool';
  if (!RESOURCE_TYPES.has(type)) throw uploadInputError('ประเภท Resource ไม่ถูกต้อง');
  const tags = body.tags === undefined
    ? parseJsonField(existing?.tags)
    : normalizeTagsInput(uploadText(body, 'tags', '', 4000));
  if (tags.length > 20 || tags.some((tag) => Buffer.byteLength(tag, 'utf8') > 80)) {
    throw uploadInputError('Tags เกินขอบเขตที่รองรับ');
  }
  return {
    courseId: uploadText(body, 'courseId', existing?.courseId, 160),
    type,
    title: uploadText(body, 'title', existing?.title, 240, true),
    description: uploadText(body, 'description', existing?.description, 8000),
    url: uploadExternalUrl(body, 'url', existing?.url),
    tags,
    visibility: uploadVisibility(body, existing?.visibility),
    sortOrder: uploadSort(body, existing?.sortOrder)
  };
}

async function finalizeUpload(file, policy, directory) {
  if (!file) return null;
  try {
    await validateStagedUpload(file, policy);
    return await placeStagedUpload(file, directory);
  } catch (error) {
    await cleanupStagedUpload(file);
    throw uploadInputError('ไฟล์อัปโหลดไม่ผ่านการตรวจสอบ');
  }
}

function storedUploadRelative(filePath, family) {
  const prefix = `/uploads/${family}/`;
  const value = String(filePath || '');
  if (!value.startsWith(prefix)) return null;
  const filename = value.slice(prefix.length);
  if (!filename || filename.includes('/') || filename.includes('\\') || /%(?:2f|5c)/i.test(filename)) return null;
  return `${family}/${filename}`;
}

async function removeStoredUpload(filePath, family) {
  const relative = storedUploadRelative(filePath, family);
  return relative ? removeContainedFile(UPLOAD_ROOT, relative) : false;
}

async function removePlacedUpload(placed, family) {
  if (!placed?.filename) return false;
  return removeContainedFile(UPLOAD_ROOT, `${family}/${placed.filename}`);
}

function sendAssetRouteError(error, res, next) {
  if (error?.status === 400 && !res.headersSent) return res.status(400).json({ error: error.message });
  if (!res.headersSent) return res.status(500).json({ error: 'ไม่สามารถดำเนินการกับไฟล์ได้' });
  return next(error);
}

app.get('/api/admin/replays', requireAdminSession, (req, res) => {
  res.json(adminListReplays());
});

app.post('/api/admin/replays', requireAdminSession, replayUpload, async (req, res, next) => {
  let placed = null;
  let databaseSucceeded = false;
  try {
    const input = replayUploadInput(req.body);
    const courseId = validateCourseId(input.courseId);
    if (!courseId) throw uploadInputError('กรุณาเลือกคอร์สที่ถูกต้อง');
    placed = await finalizeUpload(req.file, UPLOAD_POLICIES.replay, REPLAY_UPLOAD_DIR);
    const now = new Date().toISOString();
    const id = createRecordId('replay');
    const filePath = placed ? `/uploads/replays/${placed.filename}` : '';
    db.prepare(`
      INSERT INTO course_replays (
        id, courseId, title, description, videoUrl, filePath, durationText, visibility, sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, courseId, input.title, input.description, input.videoUrl, filePath,
      input.durationText, input.visibility, input.sortOrder, now, now
    );
    databaseSucceeded = true;
    const replay = db.prepare(`
      SELECT r.*, c.name as courseTitle
      FROM course_replays r
      LEFT JOIN courses c ON c.id = r.courseId
      WHERE r.id = ?
    `).get(id);
    return res.json(adminReplay(replay));
  } catch (error) {
    if (!databaseSucceeded && placed) await removePlacedUpload(placed, 'replays').catch(() => {});
    await cleanupStagedUpload(req.file);
    return sendAssetRouteError(error, res, next);
  }
});

app.put('/api/admin/replays/:id', requireAdminSession, replayUpload, async (req, res, next) => {
  const existing = db.prepare('SELECT * FROM course_replays WHERE id = ?').get(req.params.id);
  if (!existing) {
    await cleanupStagedUpload(req.file);
    return res.status(404).json({ error: 'ไม่พบคลิปย้อนหลัง' });
  }

  let placed = null;
  let databaseSucceeded = false;
  try {
    const input = replayUploadInput(req.body, existing);
    const courseId = validateCourseId(input.courseId);
    if (!courseId) throw uploadInputError('กรุณาเลือกคอร์สที่ถูกต้อง');
    placed = await finalizeUpload(req.file, UPLOAD_POLICIES.replay, REPLAY_UPLOAD_DIR);
    const filePath = placed ? `/uploads/replays/${placed.filename}` : (existing.filePath || '');
    db.prepare(`
      UPDATE course_replays
      SET courseId = ?, title = ?, description = ?, videoUrl = ?, filePath = ?,
          durationText = ?, visibility = ?, sortOrder = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      courseId, input.title, input.description, input.videoUrl, filePath,
      input.durationText, input.visibility, input.sortOrder, new Date().toISOString(), req.params.id
    );
    databaseSucceeded = true;
    if (placed && existing.filePath) {
      const removed = await removeStoredUpload(existing.filePath, 'replays').catch((error) => {
        console.warn('Replay upload cleanup debt:', error.message);
        return false;
      });
      if (!removed) console.warn('Replay upload cleanup debt: previous file was not removed');
    }
    const replay = db.prepare(`
      SELECT r.*, c.name as courseTitle
      FROM course_replays r
      LEFT JOIN courses c ON c.id = r.courseId
      WHERE r.id = ?
    `).get(req.params.id);
    return res.json(adminReplay(replay));
  } catch (error) {
    if (!databaseSucceeded && placed) await removePlacedUpload(placed, 'replays').catch(() => {});
    await cleanupStagedUpload(req.file);
    return sendAssetRouteError(error, res, next);
  }
});

app.delete('/api/admin/replays/:id', requireAdminSession, async (req, res, next) => {
  const existing = db.prepare('SELECT * FROM course_replays WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบคลิปย้อนหลัง' });
  try {
    db.prepare('DELETE FROM course_replays WHERE id = ?').run(req.params.id);
  } catch (error) {
    return sendAssetRouteError(error, res, next);
  }
  if (existing.filePath) {
    const removed = await removeStoredUpload(existing.filePath, 'replays').catch((error) => {
      console.warn('Replay delete cleanup debt:', error.message);
      return false;
    });
    if (!removed) console.warn('Replay delete cleanup debt: file was not removed');
  }
  return res.json({ success: true });
});

app.get('/api/admin/resources', requireAdminSession, (req, res) => {
  res.json(adminListResources());
});

app.post('/api/admin/resources', requireAdminSession, resourceUpload, async (req, res, next) => {
  let placed = null;
  let databaseSucceeded = false;
  try {
    const input = resourceUploadInput(req.body);
    const courseId = validateCourseId(input.courseId, true);
    if (courseId === null) throw uploadInputError('คอร์สไม่ถูกต้อง');
    placed = await finalizeUpload(req.file, UPLOAD_POLICIES.resource, RESOURCE_UPLOAD_DIR);
    const now = new Date().toISOString();
    const id = createRecordId('resource');
    const filePath = placed ? `/uploads/resources/${placed.filename}` : '';
    db.prepare(`
      INSERT INTO member_resources (
        id, courseId, type, title, description, url, filePath, fileName, tags, visibility, sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, courseId, input.type, input.title, input.description, input.url, filePath,
      placed ? req.file.originalname : '', safeJson(input.tags), input.visibility, input.sortOrder, now, now
    );
    databaseSucceeded = true;
    const resource = db.prepare(`
      SELECT r.*, c.name as courseTitle
      FROM member_resources r
      LEFT JOIN courses c ON c.id = r.courseId
      WHERE r.id = ?
    `).get(id);
    return res.json(adminResource(resource));
  } catch (error) {
    if (!databaseSucceeded && placed) await removePlacedUpload(placed, 'resources').catch(() => {});
    await cleanupStagedUpload(req.file);
    return sendAssetRouteError(error, res, next);
  }
});

app.put('/api/admin/resources/:id', requireAdminSession, resourceUpload, async (req, res, next) => {
  const existing = db.prepare('SELECT * FROM member_resources WHERE id = ?').get(req.params.id);
  if (!existing) {
    await cleanupStagedUpload(req.file);
    return res.status(404).json({ error: 'ไม่พบ Resource' });
  }

  let placed = null;
  let databaseSucceeded = false;
  try {
    const input = resourceUploadInput(req.body, existing);
    const courseId = validateCourseId(input.courseId, true);
    if (courseId === null) throw uploadInputError('คอร์สไม่ถูกต้อง');
    placed = await finalizeUpload(req.file, UPLOAD_POLICIES.resource, RESOURCE_UPLOAD_DIR);
    const filePath = placed ? `/uploads/resources/${placed.filename}` : (existing.filePath || '');
    const fileName = placed ? req.file.originalname : (existing.fileName || '');
    db.prepare(`
      UPDATE member_resources
      SET courseId = ?, type = ?, title = ?, description = ?, url = ?, filePath = ?,
          fileName = ?, tags = ?, visibility = ?, sortOrder = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      courseId, input.type, input.title, input.description, input.url, filePath,
      fileName, safeJson(input.tags), input.visibility, input.sortOrder, new Date().toISOString(), req.params.id
    );
    databaseSucceeded = true;
    if (placed && existing.filePath) {
      const removed = await removeStoredUpload(existing.filePath, 'resources').catch((error) => {
        console.warn('Resource upload cleanup debt:', error.message);
        return false;
      });
      if (!removed) console.warn('Resource upload cleanup debt: previous file was not removed');
    }
    const resource = db.prepare(`
      SELECT r.*, c.name as courseTitle
      FROM member_resources r
      LEFT JOIN courses c ON c.id = r.courseId
      WHERE r.id = ?
    `).get(req.params.id);
    return res.json(adminResource(resource));
  } catch (error) {
    if (!databaseSucceeded && placed) await removePlacedUpload(placed, 'resources').catch(() => {});
    await cleanupStagedUpload(req.file);
    return sendAssetRouteError(error, res, next);
  }
});

app.delete('/api/admin/resources/:id', requireAdminSession, async (req, res, next) => {
  const existing = db.prepare('SELECT * FROM member_resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบ Resource' });
  try {
    db.prepare('DELETE FROM member_resources WHERE id = ?').run(req.params.id);
  } catch (error) {
    return sendAssetRouteError(error, res, next);
  }
  if (existing.filePath) {
    const removed = await removeStoredUpload(existing.filePath, 'resources').catch((error) => {
      console.warn('Resource delete cleanup debt:', error.message);
      return false;
    });
    if (!removed) console.warn('Resource delete cleanup debt: file was not removed');
  }
  return res.json({ success: true });
});

app.get('/api/admin/schedules', requireAdminSession, (req, res) => {
  res.json(adminListSchedules());
});

app.post('/api/admin/schedules', requireAdminSession, (req, res) => {
  const courseId = validateCourseId(req.body.courseId);
  const title = String(req.body.title || '').trim();
  const startsAt = String(req.body.startsAt || '').trim();
  if (!courseId) return res.status(400).json({ error: 'กรุณาเลือกคอร์สที่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุหัวข้อตารางเรียน' });
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return res.status(400).json({ error: 'วันเวลาเริ่มเรียนไม่ถูกต้อง' });

  const now = new Date().toISOString();
  const id = createRecordId('schedule');
  db.prepare(`
    INSERT INTO class_schedules (
      id, courseId, title, description, startsAt, endsAt, meetingUrl, notifyBeforeMinutes, notifyStatus, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
  `).run(
    id,
    courseId,
    title,
    String(req.body.description || '').trim(),
    new Date(startsAt).toISOString(),
    req.body.endsAt && !Number.isNaN(Date.parse(req.body.endsAt)) ? new Date(req.body.endsAt).toISOString() : '',
    String(req.body.meetingUrl || '').trim(),
    normalSort(req.body.notifyBeforeMinutes, 1440),
    now,
    now
  );

  if (String(req.body.notifyNow || '') === 'true') createNotificationsForSchedule(id);
  const schedule = adminListSchedules().find((item) => item.id === id);
  res.json(schedule);
});

app.put('/api/admin/schedules/:id', requireAdminSession, (req, res) => {
  const existing = db.prepare('SELECT * FROM class_schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบตารางเรียน' });

  const courseId = req.body.courseId !== undefined ? validateCourseId(req.body.courseId) : existing.courseId;
  const title = req.body.title !== undefined ? String(req.body.title || '').trim() : existing.title;
  const startsAtRaw = req.body.startsAt !== undefined ? String(req.body.startsAt || '').trim() : existing.startsAt;
  if (!courseId) return res.status(400).json({ error: 'กรุณาเลือกคอร์สที่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุหัวข้อตารางเรียน' });
  if (!startsAtRaw || Number.isNaN(Date.parse(startsAtRaw))) return res.status(400).json({ error: 'วันเวลาเริ่มเรียนไม่ถูกต้อง' });

  db.prepare(`
    UPDATE class_schedules
    SET courseId = ?, title = ?, description = ?, startsAt = ?, endsAt = ?,
        meetingUrl = ?, notifyBeforeMinutes = ?, notifyStatus = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    courseId,
    title,
    req.body.description !== undefined ? String(req.body.description || '').trim() : existing.description,
    new Date(startsAtRaw).toISOString(),
    req.body.endsAt !== undefined
      ? (req.body.endsAt && !Number.isNaN(Date.parse(req.body.endsAt)) ? new Date(req.body.endsAt).toISOString() : '')
      : existing.endsAt,
    req.body.meetingUrl !== undefined ? String(req.body.meetingUrl || '').trim() : existing.meetingUrl,
    req.body.notifyBeforeMinutes !== undefined ? normalSort(req.body.notifyBeforeMinutes, 1440) : existing.notifyBeforeMinutes,
    req.body.notifyStatus !== undefined ? String(req.body.notifyStatus || 'scheduled').trim() : existing.notifyStatus,
    new Date().toISOString(),
    req.params.id
  );

  if (String(req.body.notifyNow || '') === 'true') createNotificationsForSchedule(req.params.id);
  const schedule = adminListSchedules().find((item) => item.id === req.params.id);
  res.json(schedule);
});

app.delete('/api/admin/schedules/:id', requireAdminSession, (req, res) => {
  const existing = db.prepare('SELECT id FROM class_schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบตารางเรียน' });
  db.prepare('DELETE FROM notifications WHERE scheduleId = ?').run(req.params.id);
  db.prepare('DELETE FROM class_schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function createNotificationsForSchedule(scheduleId) {
  const schedule = db.prepare(`
    SELECT s.*, c.name as courseTitle
    FROM class_schedules s
    LEFT JOIN courses c ON c.id = s.courseId
    WHERE s.id = ?
  `).get(scheduleId);
  if (!schedule) return 0;

  const members = db.prepare(`
    SELECT id FROM members
    WHERE status = 'active' AND paymentStatus = 'paid'
  `).all();
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO notifications (id, memberId, scheduleId, channel, title, message, status, createdAt, readAt)
    VALUES (?, ?, ?, 'dashboard', ?, ?, 'unread', ?, '')
  `);
  let created = 0;
  const tx = db.transaction(() => {
    members.forEach((member) => {
      const result = insert.run(
        createRecordId('notice'),
        member.id,
        schedule.id,
        `ตารางเรียน: ${schedule.title}`,
        `${schedule.courseTitle || 'AiX Class'} เริ่มเรียน ${schedule.startsAt}`,
        now
      );
      created += result.changes || 0;
    });
  });
  tx();
  return created;
}

app.post('/api/admin/schedules/:id/notify', requireAdminSession, (req, res) => {
  const created = createNotificationsForSchedule(req.params.id);
  res.json({ success: true, created });
});

// ============================================================
// LEADS API
// ============================================================
app.get('/api/leads', requireAdminSession, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY createdAt DESC').all();
  res.json(leads);
});

app.post('/api/leads', requireAdminSession, (req, res) => {
  const { firstName, lastName, email, phone, lineId, business, courseId, membership, payment } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

  const id = 'lead_' + Date.now();
  db.prepare(
    'INSERT INTO leads (id, firstName, lastName, email, phone, lineId, business, courseId, membership, payment, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, firstName, lastName || '', email, phone || '', lineId || '', business || '', courseId || '', membership || 'aix-member', payment || '', 'new', new Date().toISOString());

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.json(lead);
});

app.put('/api/leads/:id', requireAdminSession, (req, res) => {
  const { status } = req.body;
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  if (status) {
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(lead);
});

app.delete('/api/leads/:id', requireAdminSession, (req, res) => {
  const result = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true });
});

// ============================================================
// USERS API
// ============================================================
app.get('/api/users', requireAdminSession, (req, res) => {
  const users = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users ORDER BY joinedDate DESC').all();
  users.forEach(u => { u.enrolledCourses = JSON.parse(u.enrolledCourses); });
  res.json(users);
});

app.get('/api/users/:id', requireAdminSession, (req, res) => {
  const user = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.enrolledCourses = JSON.parse(user.enrolledCourses);
  res.json(user);
});

app.put('/api/users/:id', requireAdminSession, (req, res) => {
  const { name, tier, enrolledCourses } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET name=?, tier=?, enrolledCourses=? WHERE id=?').run(
    name ?? existing.name,
    tier ?? existing.tier,
    enrolledCourses ? JSON.stringify(enrolledCourses) : existing.enrolledCourses,
    req.params.id
  );

  const user = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE id = ?').get(req.params.id);
  user.enrolledCourses = JSON.parse(user.enrolledCourses);
  res.json(user);
});

app.delete('/api/users/:id', requireAdminSession, (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

// Enroll course
app.post('/api/users/:id/enroll', requireAdminSession, (req, res) => {
  const { courseId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const enrolled = JSON.parse(user.enrolledCourses);
  if (!enrolled.includes(courseId)) {
    enrolled.push(courseId);
    db.prepare('UPDATE users SET enrolledCourses = ? WHERE id = ?').run(JSON.stringify(enrolled), req.params.id);
  }

  const updated = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE id = ?').get(req.params.id);
  updated.enrolledCourses = JSON.parse(updated.enrolledCourses);
  res.json(updated);
});

// ============================================================
// PACKAGES API
// ============================================================
app.get('/api/packages', requireAdminSession, (req, res) => {
  const packages = db.prepare('SELECT * FROM packages').all();
  packages.forEach(p => { p.features = JSON.parse(p.features); p.popular = !!p.popular; p.enabled = !!p.enabled; });
  res.json(packages);
});

app.put('/api/packages/:id', requireAdminSession, (req, res) => {
  const { name, price, period, icon, features, popular, enabled } = req.body;
  const existing = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Package not found' });

  db.prepare('UPDATE packages SET name=?, price=?, period=?, icon=?, features=?, popular=?, enabled=? WHERE id=?').run(
    name ?? existing.name,
    price ?? existing.price,
    period ?? existing.period,
    icon ?? existing.icon,
    features ? JSON.stringify(features) : existing.features,
    popular !== undefined ? (popular ? 1 : 0) : existing.popular,
    enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    req.params.id
  );

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  pkg.features = JSON.parse(pkg.features);
  pkg.popular = !!pkg.popular;
  pkg.enabled = !!pkg.enabled;
  res.json(pkg);
});

// ============================================================
// STATS API
// ============================================================
app.get('/api/stats', requireAdminSession, (req, res) => {
  const members = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
  const leads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const courses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;

  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(c.price), 0) as total
    FROM leads l
    JOIN courses c ON l.courseId = c.id
    WHERE l.status = 'converted'
  `).get();

  res.json({
    members,
    leads,
    courses,
    revenue: revenueRow.total
  });
});

// ============================================================
// ADMIN AUTH (simple)
// ============================================================
app.post('/api/admin/login', HTTP_SECURITY.adminLoginIp, (req, res) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า ADMIN_EMAIL หรือ ADMIN_PASSWORD บน server' });
  }

  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json(SESSION_SECURITY.issueAdmin(res, ADMIN_EMAIL));
  } else {
    res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
  }
});

app.get('/api/admin/session', requireAdminSession, (req, res) => {
  res.json({
    success: true,
    csrfToken: SESSION_SECURITY.csrfTokenFor(req.authSession)
  });
});

app.post('/api/admin/logout', requireAdminSession, (req, res) => {
  SESSION_SECURITY.clearAdmin(res);
  res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.html', (req, res) => res.redirect(308, '/admin'));
app.get('/admin.css', (req, res) => res.sendFile(path.join(__dirname, 'admin.css')));
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'admin.js')));

function requireMemberPage(req, res, next) {
  if (!hasValidMemberSession(req, res)) return res.redirect('/index.html?auth=login');
  next();
}

function memberPageAsset(filename) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, filename));
  };
}

app.get('/dashboard.js', requireMemberPage, memberPageAsset('dashboard.js'));
app.get('/tools-box.js', requireMemberPage, memberPageAsset('tools-box.js'));
app.get('/live-class.js', requireMemberPage, memberPageAsset('live-class.js'));
app.get('/payment.js', requireMemberPage, memberPageAsset('payment.js'));
app.get('/payment-success.js', requireMemberPage, memberPageAsset('payment-success.js'));
app.get('/course-start.js', requireMemberPage, memberPageAsset('course-start.js'));
app.get('/course-content.js', requireMemberPage, memberPageAsset('course-content.js'));
app.get('/course-learn.js', requireMemberPage, memberPageAsset('course-learn.js'));

app.get('/dashboard', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/tools-box', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'tools-box.html'));
});

app.get('/live/:id', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'live-class.html'));
});

app.get('/login', (req, res) => {
  if (hasValidMemberSession(req, res)) return res.redirect('/dashboard');
  res.redirect('/index.html?auth=login');
});

app.get('/register', (req, res) => {
  if (hasValidMemberSession(req, res)) return res.redirect('/dashboard');
  res.redirect('/index.html?auth=signup');
});

app.get('/payment', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/payment/success', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'payment-success.html'));
});

app.get('/payment/cancel', requireMemberPage, (req, res) => {
  res.redirect('/payment?cancelled=1');
});

app.get('/course/:id/start', requireMemberPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'course-start.html'));
});

app.get('/course/:id/content', requireMemberPage, (req, res) => {
  if (req.query.ready !== '1') {
    return res.redirect(`/course/${encodeURIComponent(req.params.id)}/start`);
  }
  res.sendFile(path.join(__dirname, 'course-content.html'));
});

app.get('/course/:id/learn', requireMemberPage, (req, res) => {
  if (req.query.ready !== '1') {
    return res.redirect(`/course/${encodeURIComponent(req.params.id)}/start`);
  }
  res.sendFile(path.join(__dirname, 'course-learn.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(404);
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 AiX Club Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🗄️  Database: ${db.kind === 'supabase-postgres' ? 'Supabase Postgres' : path.join(DATA_DIR, 'data.db')}`);
  console.log(`📁 Uploads: ${UPLOAD_ROOT}\n`);
});
