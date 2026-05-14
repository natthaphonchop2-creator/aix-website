/* ============================================================
   AiX Club — Server.js
   Express + SQLite Backend
   ============================================================ */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const vm = require('vm');
const Stripe = require('stripe');
const multer = require('multer');

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

function createDatabase(filename) {
  if (BetterSqliteDatabase) {
    try {
      return new BetterSqliteDatabase(filename);
    } catch (error) {
      console.warn('better-sqlite3 could not be loaded; using Node built-in SQLite fallback.');
    }
  }

  try {
    return createBuiltInSqliteDatabase(filename);
  } catch (fallbackError) {
    throw new Error(`Could not open SQLite database: ${fallbackError.message}`);
  }
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  });
}

loadLocalEnv();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || __dirname);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^0\d{9}$/;
const SMS_OTP_TTL_MS = Number(process.env.SMS_OTP_TTL_MS || 5 * 60 * 1000);
const SMS_OTP_RESEND_MS = Number(process.env.SMS_OTP_RESEND_MS || 60 * 1000);
const SMS_OTP_MAX_ATTEMPTS = Number(process.env.SMS_OTP_MAX_ATTEMPTS || 5);
const SMS_TOKEN_TTL_MS = Number(process.env.SMS_TOKEN_TTL_MS || 15 * 60 * 1000);
const SMS_OTP_SECRET = process.env.SMS_OTP_SECRET || crypto.createHash('sha256').update(`${__dirname}:aix-sms-otp`).digest('hex');
const AUTH_SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.createHash('sha256').update(`${__dirname}:aix-auth-session`).digest('hex');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aix.club';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const MEMBER_PRICE = Number(process.env.MEMBER_PRICE || 1999);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_API_VERSION = process.env.STRIPE_API_VERSION || '';
const STRIPE_PAYMENT_METHOD_TYPES = (process.env.STRIPE_PAYMENT_METHOD_TYPES || 'card,promptpay')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
let googleJwksCache = { expiresAt: 0, keys: [] };
let stripeClient = null;
fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads'));
const REPLAY_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'replays');
const RESOURCE_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'resources');
fs.mkdirSync(REPLAY_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });

function safeUploadFilename(originalName = 'upload') {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const base = path.basename(originalName, ext).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'file';
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}${ext}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, file.fieldname === 'video' ? REPLAY_UPLOAD_DIR : RESOURCE_UPLOAD_DIR);
    },
    filename(req, file, cb) {
      cb(null, safeUploadFilename(file.originalname));
    }
  }),
  limits: { fileSize: 1024 * 1024 * 800 }
});

// ---- Middleware ----
app.use(cors());
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use('/uploads', express.static(UPLOAD_ROOT));
app.use(express.static(path.join(__dirname)));

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
    status = CASE
      WHEN status IN ('suspended', 'cancelled') THEN status
      ELSE 'active'
    END,
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
      ['', 'tool', 'AI Agent Workflow Blueprint', 'ไฟล์โครงสร้างสำหรับวาง role, task, input, output และจุดตรวจสอบของ AI Agent ก่อนนำไปใช้จริง', '/dashboard', ['AI Agent', 'Workflow'], 1],
      ['', 'skill', 'Prompt Review Checklist', 'Checklist ตรวจ prompt ให้ชัดเจน ลดผลลัพธ์มั่ว และทำซ้ำได้กับทีม', '/dashboard', ['Prompt Engineering', 'QA'], 2],
      ['claude-deep-dive', 'template', 'Claude Deep Research Template', 'Template สำหรับสั่ง Claude วิเคราะห์ข้อมูล สรุป insight และเปลี่ยนเป็นแผนปฏิบัติการ', '/course/claude-deep-dive/content', ['Claude', 'Research'], 3]
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
      '/course/claude-deep-dive/content',
      1440,
      createdAt,
      createdAt
    );
  }
}

seedMemberLearningData();

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

function createAuthToken(member) {
  const payload = Buffer.from(JSON.stringify({
    sub: member.id,
    email: member.email,
    exp: Date.now() + AUTH_SESSION_TTL_MS,
    iat: Date.now()
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyAuthToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
    if (!safeTextCompare(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number(data.exp || 0) < Date.now()) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function getRequestToken(req) {
  const auth = req.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const cookie = req.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)aix_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function setSessionCookie(res, token) {
  const maxAge = Math.floor(AUTH_SESSION_TTL_MS / 1000);
  res.setHeader('Set-Cookie', `aix_session=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax; HttpOnly`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'aix_session=; Max-Age=0; Path=/; SameSite=Lax; HttpOnly');
}

function requireMemberSession(req, res, next) {
  const token = getRequestToken(req);
  const data = verifyAuthToken(token);
  if (!data) return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(data.sub);
  if (!member || member.status === 'suspended') {
    return res.status(401).json({ error: 'บัญชีนี้ไม่สามารถใช้งานได้' });
  }

  req.member = member;
  next();
}

function hasValidMemberSession(req) {
  const data = verifyAuthToken(getRequestToken(req));
  if (!data) return false;
  const member = db.prepare('SELECT id, status FROM members WHERE id = ?').get(data.sub);
  return Boolean(member && member.status !== 'suspended');
}

function issueMemberSession(res, member) {
  const token = createAuthToken(member);
  setSessionCookie(res, token);
  return {
    token,
    expiresIn: Math.floor(AUTH_SESSION_TTL_MS / 1000),
    member: publicMember(member)
  };
}

function createPhoneVerificationToken(phone) {
  const payload = Buffer.from(JSON.stringify({
    phone: normalizePhone(phone),
    exp: Date.now() + SMS_TOKEN_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex')
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', SMS_OTP_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyPhoneVerificationToken(token, phone) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return false;
    const expected = crypto.createHmac('sha256', SMS_OTP_SECRET).update(payload).digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.phone !== normalizePhone(phone)) return false;
    if (Number(data.exp || 0) < Date.now()) return false;

    const verified = db.prepare(`
      SELECT verifiedAt FROM sms_verifications
      WHERE phone = ? AND purpose = 'register' AND verifiedAt != ''
      ORDER BY verifiedAt DESC
      LIMIT 1
    `).get(normalizePhone(phone));
    return Boolean(verified && Date.parse(verified.verifiedAt) > Date.now() - SMS_TOKEN_TTL_MS);
  } catch (error) {
    return false;
  }
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
    Number(paymentData.amount || existing.paymentAmount || MEMBER_PRICE * 100),
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
  return markMemberPaid(memberId, {
    paymentMethod: paymentMethodLabelFromTypes(session.payment_method_types || []),
    paymentProvider: 'stripe',
    amount: session.amount_total || MEMBER_PRICE * 100,
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
      const session = event.data.object;
      if (session.payment_status === 'paid') applyPaidStripeSession(session);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const memberId = intent.metadata?.member_id;
      if (memberId) {
        markMemberPaid(memberId, {
          paymentMethod: intent.payment_method_types?.[0] || 'stripe',
          paymentProvider: 'stripe',
          amount: intent.amount_received || intent.amount || MEMBER_PRICE * 100,
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

  if (!firstName || !email) {
    return { error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ' };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (phone && !PHONE_RE.test(phone)) {
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
    paymentAmount: member.paymentAmount || 0,
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
  if (!GOOGLE_CLIENT_ID) {
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

app.get('/api/config', (req, res) => {
  const sms = getSmsConfig();
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    googleReady: Boolean(GOOGLE_CLIENT_ID),
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
    const member = db.prepare('SELECT * FROM members WHERE googleSub = ? OR email = ?').get(profile.sub, profile.email);
    const now = new Date().toISOString();

    if (member) {
      db.prepare(`
        UPDATE members
        SET lastLoginAt = ?, updatedAt = ?, status = 'active', emailVerified = 1,
            googleSub = COALESCE(NULLIF(googleSub, ''), ?),
            authProvider = CASE WHEN authProvider IN ('', 'email') THEN 'google' ELSE authProvider END,
            displayName = COALESCE(NULLIF(displayName, ''), ?),
            picture = COALESCE(NULLIF(picture, ''), ?),
            avatarUrl = COALESCE(NULLIF(avatarUrl, ''), ?)
        WHERE id = ?
      `).run(now, now, profile.sub, profile.name, profile.picture, profile.picture, member.id);
      const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id);
      return res.json({ ...issueMemberSession(res, updated), profile });
    }

    const id = createMemberId();
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
      profile.name || profile.email,
      profile.email,
      `auth_google_${profile.sub}`,
      profile.sub,
      profile.picture,
      profile.picture,
      now,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    res.json({ ...issueMemberSession(res, created), profile, created: true });
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้' });
  }
});

app.get('/api/members', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY createdAt DESC').all();
  res.json(members.map(publicMember));
});

app.get('/api/members/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'ไม่พบสมาชิก' });
  res.json(publicMember(member));
});

app.put('/api/members/:id', (req, res) => {
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

app.delete('/api/members/:id', (req, res) => {
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'ไม่พบสมาชิก' });
  res.json({ success: true });
});

app.post('/api/members/otp/send', async (req, res) => {
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

    const latest = db.prepare(`
      SELECT lastSentAt FROM sms_verifications
      WHERE phone = ? AND purpose = 'register'
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(phone);
    const lastSent = latest?.lastSentAt ? Date.parse(latest.lastSentAt) : 0;
    const retryAfterMs = SMS_OTP_RESEND_MS - (Date.now() - lastSent);
    if (retryAfterMs > 0) {
      return res.status(429).json({
        error: `ขอรหัสใหม่ได้อีกครั้งใน ${Math.ceil(retryAfterMs / 1000)} วินาที`,
        retryAfter: Math.ceil(retryAfterMs / 1000)
      });
    }

    const code = createOtpCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SMS_OTP_TTL_MS).toISOString();
    const id = `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const message = `รหัสยืนยัน AiX Club คือ ${code} ใช้ได้ภายใน ${Math.ceil(SMS_OTP_TTL_MS / 60000)} นาที`;
    const smsResult = await sendSmsMessage(phone, message);

    db.prepare(`
      INSERT INTO sms_verifications (id, phone, purpose, codeHash, attempts, expiresAt, verifiedAt, createdAt, lastSentAt)
      VALUES (?, ?, 'register', ?, 0, ?, '', ?, ?)
    `).run(id, phone, hashOtp(phone, code), expiresAt, now.toISOString(), now.toISOString());

    res.json({
      ok: true,
      provider: smsResult.provider,
      sentRealSms: smsResult.provider !== 'dev',
      expiresIn: Math.floor(SMS_OTP_TTL_MS / 1000),
      resendIn: Math.floor(SMS_OTP_RESEND_MS / 1000),
      devCode: smsResult.provider === 'dev' ? code : undefined
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถส่งรหัส SMS ได้' });
  }
});

app.post('/api/members/otp/verify', (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();

  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'กรุณากรอกเบอร์โทร 10 หลักที่ขึ้นต้นด้วย 0' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'รหัส SMS ต้องเป็นตัวเลข 6 หลัก' });
  }

  const row = db.prepare(`
    SELECT * FROM sms_verifications
    WHERE phone = ? AND purpose = 'register' AND verifiedAt = ''
    ORDER BY createdAt DESC
    LIMIT 1
  `).get(phone);

  if (!row) return res.status(400).json({ error: 'ไม่พบรหัสยืนยัน กรุณาขอรหัสใหม่' });
  if (Date.parse(row.expiresAt) < Date.now()) return res.status(400).json({ error: 'รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่' });
  if (row.attempts >= SMS_OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่' });

  if (!safeCompare(row.codeHash, hashOtp(phone, code))) {
    db.prepare('UPDATE sms_verifications SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return res.status(400).json({ error: 'รหัส SMS ไม่ถูกต้อง' });
  }

  const verifiedAt = new Date().toISOString();
  db.prepare('UPDATE sms_verifications SET verifiedAt = ? WHERE id = ?').run(verifiedAt, row.id);
  res.json({
    verified: true,
    phoneVerificationToken: createPhoneVerificationToken(phone),
    expiresIn: Math.floor(SMS_TOKEN_TTL_MS / 1000)
  });
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

    const existing = valid.phone
      ? db.prepare('SELECT * FROM members WHERE email = ? OR phone = ?').get(valid.email, valid.phone)
      : db.prepare('SELECT * FROM members WHERE email = ?').get(valid.email);
    if (existing) {
      return res.status(409).json({ error: 'อีเมลหรือเบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว' });
    }

    const id = createMemberId();
    const now = new Date().toISOString();
    const displayName = String(input.displayName || `${valid.firstName} ${valid.lastName}`.trim()).trim();
    const passwordHash = googleProfile ? '' : createPasswordHash(valid.password);
    const phoneForDb = valid.phone || `auth_email_${crypto.createHash('sha1').update(valid.email).digest('hex').slice(0, 16)}`;
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
      valid.phone ? 1 : 0,
      passwordHash,
      input.consentAccepted ? 1 : 0,
      input.marketingConsent ? 1 : 0,
      now,
      now,
      now
    );

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    res.json(issueMemberSession(res, member));
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถสมัครสมาชิกได้' });
  }
});

app.post('/api/members/login', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || '');

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });

  let member = null;
  if (password) {
    member = db.prepare('SELECT * FROM members WHERE email = ?').get(email);
    if (!member || !verifyPassword(password, member.passwordHash)) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
  } else {
    if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
    member = db.prepare('SELECT * FROM members WHERE email = ? AND phone = ?').get(email, phone);
    if (!member) return res.status(404).json({ error: 'ไม่พบข้อมูลสมาชิกจากอีเมลและเบอร์โทรนี้' });
  }

  db.prepare('UPDATE members SET lastLoginAt = ?, updatedAt = ? WHERE id = ?').run(new Date().toISOString(), new Date().toISOString(), member.id);
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id);
  res.json(issueMemberSession(res, updated));
});

app.get('/api/auth/me', requireMemberSession, (req, res) => {
  res.json({ member: publicMember(req.member) });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/member/dashboard', requireMemberSession, (req, res) => {
  const member = publicMember(req.member);
  const paid = member.paymentStatus === 'paid';
  const courses = paid
    ? db.prepare('SELECT * FROM courses WHERE featured = 1 ORDER BY sortOrder ASC, name ASC').all().map(publicCourse)
    : [];
  const resources = paid
    ? db.prepare(`
        SELECT * FROM member_resources
        WHERE visibility = 'members'
        ORDER BY sortOrder ASC, createdAt DESC
      `).all().map(publicResource)
    : [];
  const schedule = paid ? getUpcomingSchedules().slice(0, 8) : [];
  const notifications = paid ? ensureScheduleNotifications(req.member) : [];

  res.json({
    member,
    courses,
    resources,
    schedule,
    notifications,
    nextAction: paid ? 'learn' : 'pay',
    payment: {
      amount: MEMBER_PRICE,
      currency: 'THB',
      status: member.paymentStatus,
      paidAt: member.paidAt,
      expiresAt: member.expiresAt
    }
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

app.get('/api/payments/config', requireMemberSession, (req, res) => {
  res.json({
    amount: MEMBER_PRICE,
    currency: 'THB',
    stripeReady: stripeReady(),
    paymentMethods: STRIPE_PAYMENT_METHOD_TYPES
  });
});

app.post('/api/payments/stripe/checkout', requireMemberSession, async (req, res) => {
  try {
    if (!stripeReady()) {
      return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า Stripe API Key' });
    }
    if ((req.member.paymentStatus || 'unpaid') === 'paid') {
      return res.status(400).json({ error: 'บัญชีนี้ชำระเงินแล้ว' });
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

    const session = await getStripeClient().checkout.sessions.retrieve(req.params.sessionId);
    const sessionMemberId = memberIdFromStripeObject(session);
    if (sessionMemberId && sessionMemberId !== req.member.id) {
      return res.status(403).json({ error: 'Session นี้ไม่ตรงกับสมาชิกที่เข้าสู่ระบบ' });
    }

    let member = req.member;
    if (session.payment_status === 'paid') {
      member = applyPaidStripeSession(session) || req.member;
    }

    res.json({
      ok: true,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      member: publicMember(member)
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'ไม่สามารถตรวจสอบ Stripe Session ได้' });
  }
});

app.post('/api/payments/confirm', requireMemberSession, (req, res) => {
  if (process.env.ALLOW_DEV_PAYMENT_CONFIRM !== 'true') {
    return res.status(403).json({ error: 'ปิด mock payment แล้ว กรุณาชำระผ่าน Stripe หรือ PromptPay' });
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
  const { name, email, password, tier } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email นี้ถูกใช้งานแล้ว' });
  }

  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  const result = db.prepare(
    'INSERT INTO users (name, email, password, tier, enrolledCourses, joinedDate) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, hashed, tier || 'explorer', '[]', new Date().toISOString());

  const user = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE id = ?').get(result.lastInsertRowid);
  user.enrolledCourses = JSON.parse(user.enrolledCourses);
  res.json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Email และ Password' });
  }

  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE email = ? AND password = ?').get(email, hashed);

  if (!user) {
    return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
  }

  user.enrolledCourses = JSON.parse(user.enrolledCourses);
  res.json({ user });
});

function parseJsonField(value, fallback = []) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function publicCourse(course) {
  if (!course) return null;
  return {
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
  };
}

function publicReplay(replay) {
  if (!replay) return null;
  return {
    id: replay.id,
    courseId: replay.courseId,
    courseTitle: replay.courseTitle || replay.courseName || '',
    title: replay.title,
    description: replay.description || '',
    videoUrl: replay.videoUrl || replay.filePath || '',
    filePath: replay.filePath || '',
    duration: replay.durationText || '',
    durationText: replay.durationText || '',
    visibility: replay.visibility || 'members',
    sortOrder: replay.sortOrder || 0,
    createdAt: replay.createdAt,
    updatedAt: replay.updatedAt
  };
}

function publicResource(resource) {
  if (!resource) return null;
  return {
    id: resource.id,
    courseId: resource.courseId || '',
    courseTitle: resource.courseTitle || resource.courseName || '',
    type: resource.type || 'tool',
    title: resource.title,
    description: resource.description || '',
    url: resource.url || resource.filePath || '',
    filePath: resource.filePath || '',
    fileName: resource.fileName || '',
    tags: parseJsonField(resource.tags),
    visibility: resource.visibility || 'members',
    sortOrder: resource.sortOrder || 0,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt
  };
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

function ensureScheduleNotifications(member) {
  if (!member || (member.paymentStatus || 'unpaid') !== 'paid') return [];
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

function removeLocalUpload(filePath = '') {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const relativeUpload = filePath.replace(/^\/uploads\/?/, '');
  const fullPath = path.resolve(UPLOAD_ROOT, relativeUpload);
  if (fullPath.startsWith(`${UPLOAD_ROOT}${path.sep}`) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// ============================================================
// COURSES API
// ============================================================
app.get('/api/platform/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses WHERE featured = 1 ORDER BY sortOrder ASC, name ASC').all();
  res.json(courses.map(publicCourse));
});

app.get('/api/platform/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(publicCourse(course));
});

app.get('/api/courses/:id/content', requireMemberSession, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND featured = 1').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if ((req.member.paymentStatus || 'unpaid') !== 'paid') {
    return res.status(402).json({ error: 'กรุณาชำระเงินเพื่อเข้าเรียน', paymentRequired: true });
  }

  const publicData = publicCourse(course);
  const replays = db.prepare(`
    SELECT * FROM course_replays
    WHERE courseId = ? AND visibility = 'members'
    ORDER BY sortOrder ASC, createdAt DESC
  `).all(publicData.id).map(publicReplay);
  const resources = db.prepare(`
    SELECT * FROM member_resources
    WHERE visibility = 'members' AND (courseId = '' OR courseId = ?)
    ORDER BY CASE WHEN courseId = ? THEN 0 ELSE 1 END, sortOrder ASC, createdAt DESC
  `).all(publicData.id, publicData.id).map(publicResource);
  const schedule = getUpcomingSchedules(publicData.id);
  res.json({
    course: publicData,
    modules: publicData.syllabus.map((module, index) => ({
      id: `${publicData.id}-module-${index + 1}`,
      title: module.title,
      time: module.time,
      lessons: module.points,
      videoUrl: replays[index]?.videoUrl || '',
      status: 'available'
    })),
    replays,
    resources,
    schedule
  });
});

app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  res.json(courses.map(publicCourse));
});

app.get('/api/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(publicCourse(course));
});

app.post('/api/courses', (req, res) => {
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

app.put('/api/courses/:id', (req, res) => {
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

app.delete('/api/courses/:id', (req, res) => {
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
  `).all().map(publicReplay);
}

function adminListResources() {
  return db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM member_resources r
    LEFT JOIN courses c ON c.id = r.courseId
    ORDER BY r.sortOrder ASC, r.createdAt DESC
  `).all().map(publicResource);
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

app.get('/api/admin/replays', (req, res) => {
  res.json(adminListReplays());
});

app.post('/api/admin/replays', upload.single('video'), (req, res) => {
  const courseId = validateCourseId(req.body.courseId);
  const title = String(req.body.title || '').trim();
  if (!courseId) return res.status(400).json({ error: 'กรุณาเลือกคอร์สที่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุชื่อคลิปย้อนหลัง' });

  const now = new Date().toISOString();
  const id = createRecordId('replay');
  const filePath = req.file ? `/uploads/replays/${req.file.filename}` : '';
  db.prepare(`
    INSERT INTO course_replays (
      id, courseId, title, description, videoUrl, filePath, durationText, visibility, sortOrder, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    courseId,
    title,
    String(req.body.description || '').trim(),
    String(req.body.videoUrl || '').trim(),
    filePath,
    String(req.body.durationText || '').trim(),
    String(req.body.visibility || 'members').trim(),
    normalSort(req.body.sortOrder),
    now,
    now
  );

  const replay = db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM course_replays r
    LEFT JOIN courses c ON c.id = r.courseId
    WHERE r.id = ?
  `).get(id);
  res.json(publicReplay(replay));
});

app.put('/api/admin/replays/:id', upload.single('video'), (req, res) => {
  const existing = db.prepare('SELECT * FROM course_replays WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบคลิปย้อนหลัง' });

  const courseId = req.body.courseId !== undefined ? validateCourseId(req.body.courseId) : existing.courseId;
  const title = req.body.title !== undefined ? String(req.body.title || '').trim() : existing.title;
  if (!courseId) return res.status(400).json({ error: 'กรุณาเลือกคอร์สที่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุชื่อคลิปย้อนหลัง' });

  let filePath = existing.filePath || '';
  if (req.file) {
    removeLocalUpload(filePath);
    filePath = `/uploads/replays/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE course_replays
    SET courseId = ?, title = ?, description = ?, videoUrl = ?, filePath = ?,
        durationText = ?, visibility = ?, sortOrder = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    courseId,
    title,
    req.body.description !== undefined ? String(req.body.description || '').trim() : existing.description,
    req.body.videoUrl !== undefined ? String(req.body.videoUrl || '').trim() : existing.videoUrl,
    filePath,
    req.body.durationText !== undefined ? String(req.body.durationText || '').trim() : existing.durationText,
    req.body.visibility !== undefined ? String(req.body.visibility || 'members').trim() : existing.visibility,
    req.body.sortOrder !== undefined ? normalSort(req.body.sortOrder) : existing.sortOrder,
    new Date().toISOString(),
    req.params.id
  );

  const replay = db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM course_replays r
    LEFT JOIN courses c ON c.id = r.courseId
    WHERE r.id = ?
  `).get(req.params.id);
  res.json(publicReplay(replay));
});

app.delete('/api/admin/replays/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM course_replays WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบคลิปย้อนหลัง' });
  removeLocalUpload(existing.filePath);
  db.prepare('DELETE FROM course_replays WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/resources', (req, res) => {
  res.json(adminListResources());
});

app.post('/api/admin/resources', upload.single('file'), (req, res) => {
  const courseId = validateCourseId(req.body.courseId, true);
  const title = String(req.body.title || '').trim();
  if (courseId === null) return res.status(400).json({ error: 'คอร์สไม่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุชื่อ Resource' });

  const now = new Date().toISOString();
  const id = createRecordId('resource');
  const filePath = req.file ? `/uploads/resources/${req.file.filename}` : '';
  db.prepare(`
    INSERT INTO member_resources (
      id, courseId, type, title, description, url, filePath, fileName, tags, visibility, sortOrder, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    courseId,
    String(req.body.type || 'tool').trim(),
    title,
    String(req.body.description || '').trim(),
    String(req.body.url || '').trim(),
    filePath,
    req.file?.originalname || '',
    safeJson(normalizeTagsInput(req.body.tags)),
    String(req.body.visibility || 'members').trim(),
    normalSort(req.body.sortOrder),
    now,
    now
  );

  const resource = db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM member_resources r
    LEFT JOIN courses c ON c.id = r.courseId
    WHERE r.id = ?
  `).get(id);
  res.json(publicResource(resource));
});

app.put('/api/admin/resources/:id', upload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM member_resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบ Resource' });

  const courseId = req.body.courseId !== undefined ? validateCourseId(req.body.courseId, true) : existing.courseId;
  const title = req.body.title !== undefined ? String(req.body.title || '').trim() : existing.title;
  if (courseId === null) return res.status(400).json({ error: 'คอร์สไม่ถูกต้อง' });
  if (!title) return res.status(400).json({ error: 'กรุณาระบุชื่อ Resource' });

  let filePath = existing.filePath || '';
  let fileName = existing.fileName || '';
  if (req.file) {
    removeLocalUpload(filePath);
    filePath = `/uploads/resources/${req.file.filename}`;
    fileName = req.file.originalname;
  }

  db.prepare(`
    UPDATE member_resources
    SET courseId = ?, type = ?, title = ?, description = ?, url = ?, filePath = ?,
        fileName = ?, tags = ?, visibility = ?, sortOrder = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    courseId,
    req.body.type !== undefined ? String(req.body.type || 'tool').trim() : existing.type,
    title,
    req.body.description !== undefined ? String(req.body.description || '').trim() : existing.description,
    req.body.url !== undefined ? String(req.body.url || '').trim() : existing.url,
    filePath,
    fileName,
    req.body.tags !== undefined ? safeJson(normalizeTagsInput(req.body.tags)) : existing.tags,
    req.body.visibility !== undefined ? String(req.body.visibility || 'members').trim() : existing.visibility,
    req.body.sortOrder !== undefined ? normalSort(req.body.sortOrder) : existing.sortOrder,
    new Date().toISOString(),
    req.params.id
  );

  const resource = db.prepare(`
    SELECT r.*, c.name as courseTitle
    FROM member_resources r
    LEFT JOIN courses c ON c.id = r.courseId
    WHERE r.id = ?
  `).get(req.params.id);
  res.json(publicResource(resource));
});

app.delete('/api/admin/resources/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM member_resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบ Resource' });
  removeLocalUpload(existing.filePath);
  db.prepare('DELETE FROM member_resources WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/schedules', (req, res) => {
  res.json(adminListSchedules());
});

app.post('/api/admin/schedules', (req, res) => {
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

app.put('/api/admin/schedules/:id', (req, res) => {
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

app.delete('/api/admin/schedules/:id', (req, res) => {
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

app.post('/api/admin/schedules/:id/notify', (req, res) => {
  const created = createNotificationsForSchedule(req.params.id);
  res.json({ success: true, created });
});

// ============================================================
// LEADS API
// ============================================================
app.get('/api/leads', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY createdAt DESC').all();
  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const { firstName, lastName, email, phone, lineId, business, courseId, membership, payment } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

  const id = 'lead_' + Date.now();
  db.prepare(
    'INSERT INTO leads (id, firstName, lastName, email, phone, lineId, business, courseId, membership, payment, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, firstName, lastName || '', email, phone || '', lineId || '', business || '', courseId || '', membership || 'aix-member', payment || '', 'new', new Date().toISOString());

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.json(lead);
});

app.put('/api/leads/:id', (req, res) => {
  const { status } = req.body;
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  if (status) {
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(lead);
});

app.delete('/api/leads/:id', (req, res) => {
  const result = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true });
});

// ============================================================
// USERS API
// ============================================================
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users ORDER BY joinedDate DESC').all();
  users.forEach(u => { u.enrolledCourses = JSON.parse(u.enrolledCourses); });
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, email, tier, enrolledCourses, joinedDate FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.enrolledCourses = JSON.parse(user.enrolledCourses);
  res.json(user);
});

app.put('/api/users/:id', (req, res) => {
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

app.delete('/api/users/:id', (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

// Enroll course
app.post('/api/users/:id/enroll', (req, res) => {
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
app.get('/api/packages', (req, res) => {
  const packages = db.prepare('SELECT * FROM packages').all();
  packages.forEach(p => { p.features = JSON.parse(p.features); p.popular = !!p.popular; p.enabled = !!p.enabled; });
  res.json(packages);
});

app.put('/api/packages/:id', (req, res) => {
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
app.get('/api/stats', (req, res) => {
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
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'admin-token-' + Date.now() });
  } else {
    res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/dashboard', (req, res) => {
  if (!hasValidMemberSession(req)) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/login', (req, res) => {
  if (hasValidMemberSession(req)) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/register', (req, res) => {
  if (hasValidMemberSession(req)) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/payment', (req, res) => {
  if (!hasValidMemberSession(req)) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/payment/success', (req, res) => {
  if (!hasValidMemberSession(req)) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'payment-success.html'));
});

app.get('/payment/cancel', (req, res) => {
  if (!hasValidMemberSession(req)) return res.redirect('/login');
  res.redirect('/payment?cancelled=1');
});

app.get('/course/:id/content', (req, res) => {
  if (!hasValidMemberSession(req)) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'course-content.html'));
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 AiX Club Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🗄️  Database: ${path.join(DATA_DIR, 'data.db')}`);
  console.log(`📁 Uploads: ${UPLOAD_ROOT}\n`);
});
