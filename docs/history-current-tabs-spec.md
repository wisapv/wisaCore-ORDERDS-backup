# Claude Code Prompts — History + Current Tab-bar Feature

ส่งทีละ STEP รอผ่านก่อนไป step ถัดไป (รูปแบบเดิมที่ใช้มาตลอด)

---

## STEP 1 — Backend: PostgreSQL persistence layer

```
เพิ่มระบบเก็บประวัติการคำนวณ Min-Max โดยใช้ PostgreSQL (ผ่าน package "pg" ตรงๆ ไม่ใช้ ORM
หนักๆ อย่าง Prisma/Sequelize ในตอนนี้ เพื่อให้ตรงกับสไตล์โค้ดปัจจุบันของโปรเจกต์ที่เป็น
plain service function ล้วน — เปิดทางให้ย้ายไป ORM ทีหลังได้ถ้า phase ต่อไปต้องการ migration
tooling ที่เป็นระบบมากขึ้น) ผู้ใช้ติดตั้ง PostgreSQL เองบนเครื่อง ไม่ใช้ cloud

Connection config: ใช้ environment variable เดียว DATABASE_URL (มาตรฐาน libpq connection
string) เช่น "postgres://postgres:postgres@localhost:5432/wisacore_minmax" — อ่านจาก
process.env.DATABASE_URL ถ้าไม่มีให้ fallback เป็นค่า default นี้ (สำหรับ dev local) พร้อม
เพิ่มตัวอย่างใน .env.example (สร้างไฟล์นี้ถ้ายังไม่มี)

ไฟล์ที่ยังเก็บบน disk เหมือนเดิม (ไม่เปลี่ยน แค่ metadata/index ย้ายจาก SQLite ไป Postgres):
  data/minmax-history/{targetMonth}/{rev}.json     (raw calc result: rows/summary/warnings/alarms)
  data/minmax-history/{targetMonth}/{rev}.xlsx     (ไฟล์ export ที่ generate ไว้แล้ว)

สร้างไฟล์ db/pool.js: export pg.Pool instance เดียว (singleton, reuse connection pool
ทั้งแอป) ใช้ DATABASE_URL ข้างบน

สร้างไฟล์ db/initSchema.js: ฟังก์ชัน initSchema() รัน SQL แบบ idempotent
(CREATE TABLE IF NOT EXISTS) ตอน server start:

  CREATE TABLE IF NOT EXISTS calculation_runs (
    id            SERIAL PRIMARY KEY,
    target_month  TEXT NOT NULL,
    revision      INTEGER NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    config_json   JSONB NOT NULL,
    summary_json  JSONB NOT NULL,
    json_path     TEXT NOT NULL,
    excel_path    TEXT NOT NULL,
    UNIQUE(target_month, revision)
  );
  CREATE INDEX IF NOT EXISTS idx_calculation_runs_target_month
    ON calculation_runs(target_month);

  (ใช้ JSONB แทน TEXT สำหรับ config_json/summary_json — Postgres จะได้ query/filter เนื้อหา
  ข้างในได้ในอนาคตถ้าต้องการ ไม่ใช่แค่เก็บเป็น string ทึบ)

เรียก initSchema() ตอน server boot (src/index.js หรือจุดเริ่มต้นแอปที่มีอยู่แล้ว) ก่อนเปิดรับ
request — ถ้า connect ไม่ได้ (Postgres ยังไม่ได้ติดตั้ง/ไม่ได้เปิด) ให้ log error ชัดเจนบอกว่า
ต้องติดตั้ง PostgreSQL และตั้ง DATABASE_URL ก่อน ไม่ต้อง crash ทั้งแอป (endpoint อื่นที่ไม่
เกี่ยวกับ history ยังทำงานได้ตามปกติ)

สร้างไฟล์ใหม่ services/minmaxHistory.service.js (ใช้ parameterized query ผ่าน $1,$2,...
ของ pg เสมอ ป้องกัน SQL injection):
  - getNextRevision(targetMonth) → SELECT MAX(revision) FROM calculation_runs
    WHERE target_month=$1, แล้ว +1 (ถ้ายังไม่มีเลย เริ่มที่ 1)
  - saveRun({ targetMonth, config, result }) → เรียก getNextRevision, สร้างโฟลเดอร์/ไฟล์ตาม
    path ข้างบน, generate excel ด้วย minmaxExcel.exporter.js ที่มีอยู่แล้ว (reuse ฟังก์ชันเดิม
    ไม่ต้องเขียนใหม่), INSERT row ใน Postgres, return { id, revision, createdAt }
  - listRuns() → SELECT ทั้งหมด ORDER BY target_month DESC, revision DESC, จัดกลุ่มด้วย JS
    (reduce) เป็น [{ targetMonth, runs: [{id, revision, createdAt, summary}, ...] }, ...]
  - getRunDetail(id) → SELECT row เดียว, อ่าน json_path มา parse คืน rows/summary/warnings/
    alarms เต็ม (สำหรับหน้า Current ถ้าอยากดู revision เก่า)
  - getRunExcelPath(id) → SELECT excel_path สำหรับ download endpoint

แก้ controller: calculateMinMaxUpload (endpoint /calculate-minmax เดิม) — หลังจาก
calculateMinMax สำเร็จ (result.success !== false) ให้เรียก minmaxHistory.saveRun(...) ต่อทันที
แล้วแนบ { historyId, revision } เข้าไปใน response เดิม (ไม่เปลี่ยน field เดิมที่มีอยู่ ผ่าน
เพิ่มเข้าไป) — ถ้า saveRun fail (เช่น Postgres ไม่ได้เปิด/disk เขียนไม่ได้) ให้ log error แต่
ไม่ทำให้ response ของการคำนวณเองล้มเหลวไปด้วย (การคำนวณสำเร็จแล้ว ไม่ควรเสียเพราะ save
history พัง)

เพิ่ม route ใหม่ 3 endpoint ใน minmax.routes.js + controller:
  GET  /api/minmax3month/history              → minmaxHistory.listRuns()
  GET  /api/minmax3month/history/:id          → minmaxHistory.getRunDetail(id)
  GET  /api/minmax3month/history/:id/download → stream ไฟล์จาก getRunExcelPath(id) เป็น
                                                  attachment (Content-Disposition)

เพิ่ม data/ เข้า .gitignore (ไม่ commit ไฟล์ history เข้า repo — ตัว database เองก็ไม่ต้อง
commit อะไรเพราะเป็น service แยกที่ผู้ใช้ติดตั้งเองบนเครื่อง)

เพิ่ม "pg" เข้า package.json + ensure-dependencies.js (เหมือนที่เคยเพิ่ม exceljs)

เขียน test ใหม่ minmaxHistory.service.test.js — ต้องใช้ Postgres จริง connect ผ่าน
DATABASE_URL (ไม่ mock) เพราะเป็น integration test ระบุใน test file ชัดเจนว่าต้องมี Postgres
รันอยู่ก่อนถึงจะ test นี้ผ่าน (skip หรือ error message ชัดเจนถ้า connect ไม่ได้ ไม่ทำให้
suite อื่นพังไปด้วย):
  - saveRun 2 ครั้งด้วย targetMonth เดียวกัน → ได้ revision 1 แล้ว 2 ตามลำดับ
  - saveRun เดือนอื่น → เริ่ม revision 1 ใหม่ (ไม่ปนกับเดือนก่อน)
  - listRuns() คืนค่าจัดกลุ่มตามเดือนถูกต้อง เรียง revision DESC ในแต่ละกลุ่ม
  - getRunDetail คืน rows ตรงกับที่ save ไว้
  - cleanup: ลบ test rows ที่สร้างไว้ท้าย test (DELETE FROM calculation_runs WHERE
    target_month LIKE 'TEST-%' เป็นต้น) ไม่ให้ค้างเป็นขยะใน database จริง

*** verification protocol เดิม: expected value คำนวณเอง, revert แล้วดูแดง restore แล้วดูเขียว,
รัน full suite ก่อนและหลัง ***
```

---

## STEP 2 — Frontend: Tab-bar shell (History | Current)

```
ปรับ frontend ให้หน้า Min-Max 3 Month มี 2 tab: "History" (default/หน้าแรก) กับ "Current"
(หน้าคำนวณเดิมทั้งหมด)

สร้าง Minmax3MonthTabs.jsx (components/) ครอบ Minmax3MonthPage.jsx เดิม (rename เป็น
MinmaxCurrentTab.jsx ถ้าจำเป็นเพื่อความชัดเจน) กับ MinmaxHistoryTab.jsx ใหม่ (STEP 3)

ใช้ local useState('history' | 'current') เก็บ active tab ใน Minmax3MonthTabs.jsx (ไม่ต้อง
ใช้ router param ก็ได้ ถ้าไม่มีความจำเป็นต้อง deep-link) — Route เดิมใน App.jsx ที่ชี้มาที่
Minmax3MonthPage ให้เปลี่ยนไปชี้ Minmax3MonthTabs แทน

Layout tab bar: วางเหนือเนื้อหาทั้งหมด (เหนือ Header component เดิมก็ได้ หรือใต้ก็ได้ แล้วแต่
ดูดีกว่า) ใช้ปุ่ม 2 ปุ่ม "History"/"Current" active state ขีดเส้นใต้ underline indicator
```

---

## STEP 3 — Frontend: History tab UI

```
สร้าง MinmaxHistoryTab.jsx: fetch GET /api/minmax3month/history ตอน mount (useEffect)
แสดงผลเป็น card ต่อเดือน เรียงเดือนใหม่สุดก่อน แต่ละ card มี:
  - หัว card: ชื่อเดือน (format "mmm-yy" เช่น "Nov-25") + จำนวน revision รวม
  - แต่ละ revision แสดงเป็นแถว: badge "REV n" (revision ล่าสุดของเดือนนั้น highlight ด้วยสี
    accent, revision เก่ากว่าใช้สีเทา), วันเวลาที่ generate (format อ่านง่าย เช่น "13 Jul, 14:20"),
    ปุ่ม Download (เรียก GET /history/:id/download ตรงๆ เปิด browser download)
  - ถ้าไม่มีประวัติเลย (array ว่าง) → empty state สวยๆ "ยังไม่มีประวัติการคำนวณ กด Current
    เพื่อเริ่มคำนวณ"

Loading state ระหว่างรอ fetch, error state ถ้า fetch ไม่สำเร็จ (backend ไม่ทำงาน)

*** ทำ live ใน browser (Playwright) ด้วย mocked response ที่มี 2 เดือน หลาย revision
ยืนยันว่าเรียงลำดับถูก, badge สีถูก, ปุ่ม download มี href/onClick ที่ถูกต้อง ก่อน commit ***
```

---

## STEP 4 — Frontend: Current tab — ตารางผลลัพธ์ใหม่ + filter + month switcher + auto-navigate

```
แก้ผลลัพธ์ในหน้า Current (MinmaxResultsPanel.jsx หรือสร้าง component ใหม่แทนที่ tab
"Data table" เดิม) ให้เป็นตารางคอลัมน์คัดเฉพาะตามนี้ (ไม่ใช่ full 97 field เหมือนเดิม):

  Supplier Key, SUPL, PLANT, S.Dock, DOCK, PART #, Part Name, KBN, Q'ty, P/C Add,
  Lineside Address, "LP Design Freq = [{เดือนที่เลือก format mmm-yy}]", Check LP Freq Status,
  "AL Req LP Design Freq = [{เดือนที่เลือก}]", "Order Freq Status (Base Current)",
  PC Min, PC Max, LS Min, LS Max

  Mapping field จาก result.rows:
    Supplier Key→SupplierKey, SUPL→SUPL, PLANT→SupplierPlant, S.Dock→S.DOCK, DOCK→DOCK,
    PART #→PART #, Part Name→PART DESC, KBN→KBN, Q'ty→QTY /CONT, P/C Add→P/C Add,
    Lineside Address→Lineside Address, LP Design Freq→CurrentFreq, Check LP Freq Status→
    (คำนวณ client-side: CurrentFreq vs OrderFreqForCalculation → Same/Increase/Decrease),
    AL Req LP Design Freq→OrderFreqForCalculation, Order Freq Status→เหมือนกับ Check LP Freq
    Status (ค่าเดียวกันเสมอตามที่ยืนยันไปแล้วว่า W=U), PC Min/Max/LS Min/Max→ขึ้นกับเดือนที่
    เลือก (ดูข้อถัดไป)

  เพิ่ม month switcher (tab เล็กๆ หรือ dropdown เหนือตาราง) 3 ตัวเลือก: N+1/N+2/N+3 แสดงผล
  เป็นชื่อเดือนจริง (คำนวณจาก config.targetMonth) ไม่ใช่ข้อความ "N+1" ตรงๆ (เหมือนที่กำชับไว้
  ตอนทำ Excel exporter) — สลับ switcher แล้วคอลัมน์ PC Min/PC Max/LS Min/LS Max ต้องเปลี่ยนไป
  อ่านจาก field N1_.../N2_.../N3_... ตามเดือนที่เลือก (LP Design Freq/AL Req Freq ไม่เปลี่ยน
  ค่า เปลี่ยนแค่ bracket เดือนใน label ให้ตรงกับเดือนที่เลือกอยู่)

  เพิ่มแถว filter เหนือตาราง: text input สำหรับ Supplier Key, SUPL, PLANT, S.Dock, DOCK, KBN
  (filter แบบ client-side, string contains แบบ case-insensitive, ไม่ยิง request ใหม่ไปหลัง
  บ้าน — ข้อมูลอยู่ใน memory อยู่แล้วจาก result.rows)

Export tab: เปลี่ยนจาก disabled เป็นใช้งานได้จริง — ปุ่ม "Export to Excel" เรียก
GET /api/minmax3month/history/:historyId/download โดยใช้ historyId ที่ backend แนบมาใน
response ของ calculate-minmax (จาก STEP 1) — ไม่ต้อง generate ใหม่ฝั่ง frontend เพราะไฟล์
ถูกสร้างไว้แล้วตอน calculate สำเร็จ

Auto-navigate: หลัง calculate-minmax สำเร็จ (result.success===true) ให้ Minmax3MonthTabs
สลับ active tab ไปที่ "History" อัตโนมัติทันที (per user request "แคลเสร็จก็ไปเด้งหน้าแรก")
ต้องมีทาง trigger จาก MinmaxCurrentTab ขึ้นไปยัง parent Minmax3MonthTabs (callback prop
onCalculateSuccess หรือ lifting state ขึ้นไปจัดการที่ parent เลยก็ได้ถ้าง่ายกว่า)

*** ทำ live ใน browser (Playwright) ด้วย mocked response ยืนยัน: filter ทำงานถูก (กรอง
เหลือแถวที่ match), month switcher เปลี่ยนตัวเลข PC Min/Max ถูกตามเดือน, กด Calculate
(mocked success) แล้ว auto-switch ไป History tab จริง ก่อน commit ***
```

---

## หมายเหตุสำหรับผู้ใช้ (ไม่ต้องส่งให้ Claude Code)

- **ก่อนเริ่ม STEP 1**: ต้องติดตั้ง PostgreSQL บนเครื่องและสร้าง database ว่างไว้ก่อน (เช่น
  `createdb wisacore_minmax`) แล้วตั้งค่า `DATABASE_URL` ใน `.env` ให้ตรงกับที่เชื่อมต่อได้จริง
  ก่อนให้ Claude Code รัน test ของ STEP 1 (test เป็น integration test เชื่อม Postgres จริง
  ไม่ได้ mock)
- รันตามลำดับ 1→2→3→4 เพราะ STEP 4 ต้องพึ่ง `historyId` ที่ STEP 1 แนบเข้า response
- โฟลเดอร์ `data/minmax-history/` (ไฟล์ JSON+Excel) จะไม่ถูก commit เข้า git (อยู่ใน
  .gitignore) — ส่วนตัวข้อมูล metadata อยู่ใน PostgreSQL ของเครื่องคุณเอง ถ้าย้าย/deploy ไป
  เครื่องใหม่ ต้อง pg_dump/restore database เองแยกต่างหาก พร้อมกับ copy โฟลเดอร์ `data/`
  ไปด้วยกัน (ทั้งสองส่วนต้องอยู่คู่กันเสมอ ไม่งั้น metadata จะชี้ไปหาไฟล์ที่ไม่มีอยู่จริง)
