# AiX Supabase Database

AiX ใช้ Supabase Postgres เป็นฐานข้อมูลหลักเมื่อ server พบ connection string ใน env

## Project

- Supabase project: `AiX`
- Project ref: `fetuhvitbjsxrzcrfkyz`
- Region: `ap-southeast-2`
- Postgres: 17

## Runtime Env

ตั้งค่าใน Render หรือ local `.env.local`:

```env
SUPABASE_DATABASE_URL=postgresql://...
SUPABASE_DB_SSL=true
SUPABASE_DB_POOL_MAX=4
SUPABASE_QUERY_TIMEOUT_MS=30000
```

Server อ่าน connection string ตามลำดับนี้:

1. `SUPABASE_DATABASE_URL`
2. `DATABASE_URL`
3. `SUPABASE_DB_URL`

ถ้าไม่มีค่าเหล่านี้ server จะ fallback ไปใช้ `data.db` แบบเดิม เพื่อให้ local dev ยังรันได้

## Schema

Migration อยู่ที่:

- `supabase/migrations/20260701000000_aix_initial_schema.sql`
- `supabase/migrations/20260701001000_aix_server_only_rls_policies.sql`

ตารางถูกออกแบบให้ใช้ผ่าน Node server เท่านั้น ไม่เปิด Data API จาก browser โดยตรง:

- เปิด RLS ทุก table
- revoke สิทธิ์ `anon` และ `authenticated`
- เพิ่ม policy `server_only_no_browser_access` เพื่อ deny browser roles แบบ explicit
- ให้ `service_role` ทำงานกับตารางได้

## Deploy Notes

หลังตั้ง `SUPABASE_DATABASE_URL` บน Render แล้ว restart/deploy server จะ log:

```text
Database: Supabase Postgres
```

ข้อมูล catalog เริ่มต้น เช่น courses, packages, resources จะถูก seed ตอน server start ถ้าตารางยังว่าง

ยังไม่ได้ copy ข้อมูลสมาชิก/payment จาก local `data.db` ขึ้น Supabase อัตโนมัติ เพราะอาจมีข้อมูล test หรือข้อมูลส่วนบุคคล ถ้าต้องย้ายข้อมูลจริง ให้ export/migrate แบบตรวจรายการก่อน
