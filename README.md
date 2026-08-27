# Project Duck — Path to Nowhere Wiki (ไทย)

วิกิภาษาไทยของเกม **Path to Nowhere** — ฐานข้อมูลตัวละคร, Crimebrands, อีเวนต์,
เทียร์ลิสต์ และฟอรัมชุมชน พร้อมหลังบ้านสำหรับแอดมินแก้ข้อมูลได้ทั้งหมดโดยไม่ต้องแตะโค้ด

## Stack

| ส่วน | ใช้อะไร |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS 3 (ธีม `ptn-*` custom, รองรับ light/dark) |
| Routing | React Router 7 |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Deploy | Vercel (SPA rewrite ใน `vercel.json`) |

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.local.example .env.local   # ถ้ายังไม่มี ให้สร้างเอง (ดูหัวข้อถัดไป)
npm run dev
```

### Environment variables — `.env.local`

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

### ตั้งค่าฐานข้อมูล

1. สร้างโปรเจกต์ใหม่ใน Supabase
2. SQL Editor → รัน [`supabase_schema.sql`](supabase_schema.sql) ทั้งไฟล์ (ตาราง + RLS + seed หมวดฟอรัม)
3. Storage → สร้าง bucket แบบ **public** 4 อัน: `avatars`, `characters`, `events`, `forum`
4. สมัครสมาชิกบนเว็บ แล้วเลื่อนขั้นตัวเองเป็นแอดมิน:
   ```sql
   update public.profiles set role = 'admin' where username = 'your_username';
   ```

> **ฐานข้อมูลเดิมที่มีข้อมูลอยู่แล้ว** ให้รัน [`supabase_migration_full_sync.sql`](supabase_migration_full_sync.sql)
> แทน — เป็นสคริปต์ idempotent ที่เติมตาราง/คอลัมน์ที่ขาดโดยไม่ลบข้อมูล

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server พร้อม HMR |
| `npm run build` | build ลง `dist/` |
| `npm run typecheck` | ตรวจ TypeScript อย่างเดียว (`vite build` **ไม่** ตรวจให้) |
| `npm run lint` | ESLint |
| `npm run preview` | ดู production build ในเครื่อง |

## โครงสร้างโปรเจกต์

```
src/
├── components/
│   ├── auth/       ProtectedRoute (กันเส้นทางตาม role)
│   ├── events/     EventCountdown
│   ├── layout/     Navbar / Footer / Layout / AdminLayout
│   └── ui/         ชุด primitive — Button, Modal, Input, Toast, ImageUpload ฯลฯ
├── contexts/       AuthContext (session + profile), ThemeContext (light/dark)
├── hooks/          useAbilityTags (รวม default + override จาก DB), useCountdown
├── lib/            supabase client, constants (label/สี/ไอคอนทั้งเกม), abilityTags, utils
├── pages/
│   ├── admin/      หลังบ้าน 12 หน้า
│   ├── auth/       login / register
│   ├── characters/ รายการ + หน้ารายละเอียด (แท็บ ข้อมูล/สกิล/Shackles/เรื่องราว)
│   ├── crimebrands/
│   ├── forum/      หมวด → กระทู้ → ตอบกลับ
│   ├── profile/
│   └── tier-lists/ สร้าง/แก้ไขแบบ drag-and-drop + โหวต
└── types/          database.types.ts (โครง DB), models.ts (โครง JSONB + type ที่ join แล้ว)
```

## หมายเหตุสำหรับคนแก้โค้ด

- **ค่าคงที่ของเกม** (rarity, tendency, alignment, ชนิดอีเวนต์, สี, ไอคอน) รวมอยู่ที่
  [`src/lib/constants.ts`](src/lib/constants.ts) ที่เดียว — แก้ที่นี่มีผลทุกหน้า
  ส่วนแอดมินสามารถ override คำอธิบาย/สี/ไอคอน ทับค่าเหล่านี้ได้ผ่านตาราง `game_info`
- **คอลัมน์ JSONB** (`skills`, `shackles`, `stats`, `char_details`, `materials`,
  `overview_cards`, `trivia`, `effects`) มีโครงเป็น TypeScript อยู่ใน
  [`src/types/models.ts`](src/types/models.ts) — เพิ่มฟิลด์ต้องแก้ทั้งสองที่
- **แก้ schema ที่ Supabase แล้วต้องตามมาแก้ 3 ที่เสมอ**: `supabase_schema.sql`
  (สำหรับ DB ใหม่), `supabase_migration_full_sync.sql` (สำหรับ DB เดิม)
  และ `src/types/database.types.ts` (ให้ TypeScript รู้)
- **การจัดการตัวละครทั้งหมดอยู่หน้าเดียว** — `/admin/characters` มี 4 แท็บ
  (ข้อมูลตัวละคร / สกิล & Crimebrand / Shackle Break / Crimebrand Builds)
  แต่ละแท็บคือ panel component แยกไฟล์ใน `src/pages/admin/`
