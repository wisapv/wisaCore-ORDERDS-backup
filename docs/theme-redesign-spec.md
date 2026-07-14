# Claude Code Prompts — Theme redesign: Soft Glassmorphism / Warm Minimalist

ส่งทีละ STEP รอผ่านก่อนไปต่อ (งาน visual ล้วน ไม่กระทบ business logic — ไม่ต้องทำ
verification protocol revert-red-green แบบงานคำนวณ แค่เปิดดูจริงใน browser +
screenshot ยืนยันทุก step ก็พอ)

ธีมนี้ confirm เป็น**เวอร์ชันสุดท้าย**แล้ว โดยมี HTML reference ที่ user ทำเองเป็นต้นแบบตรงๆ
(ไม่ใช่การตีความใหม่) — ทุก STEP ด้านล่างแปลงจาก reference นั้นเป็น React/Tailwind ให้ตรง
กับ codebase จริง ถ้า STEP ไหนขัดกับ reference ให้ยึด reference เป็นหลักเสมอ

---

## STEP 1 — Design tokens + font + reusable utility classes

```
แก้ wisa-core/src/index.css:

1. เพิ่ม font Manrope จาก Google Fonts (แทน Segoe UI เดิมทั้งแอป):
   @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap");
   เปลี่ยน body { font-family: 'Manrope', sans-serif; } (ลบ 'Segoe UI', sans-serif เดิม)

2. เปลี่ยนค่าใน @theme block:
   --color-wisa-dark:  #241f21   (จาก #000000 — ใช้กับ Sidebar + ปุ่มหลักทั้งแอป)
   --color-wisa-pink:  #e69cb5   (จาก #e91e8c — โทนเข้มสุดของ gradient ชมพู)
   --color-wisa-white: #FDF6F2   (คงไว้)

3. เพิ่ม CSS custom property ใหม่ (plain :root vars เพราะเป็น gradient/rgba ที่ Tailwind
   color token ตรงๆ ไม่รองรับ):

   :root {
     --text-primary: #2b2326;
     --text-muted: #91838a;

     /* การ์ด tier 1 — เข้ม/ชมพูเด่น ใช้กับการ์ด hero/feature (เช่น Today card, hero card) */
     --glass-strong: linear-gradient(145deg, rgba(255,255,255,0.74), rgba(255,227,235,0.52));
     /* การ์ด tier 2 — ขาวนวลเกือบทึบ ใช้กับการ์ดข้อมูล/เนื้อหาทั่วไป (stat-card, table card) */
     --glass-soft: rgba(255,255,255,0.84);

     --glass-border: 1px solid rgba(255,255,255,0.48);
     --shadow-strong: 0 28px 70px rgba(92,43,62,0.18);
     --shadow-soft: 0 18px 42px rgba(92,43,62,0.10);

     /* gradient พื้นหลังเต็มหน้า ใช้กับ page wrapper (MainLayout) ทุกหน้าทั่วแอป */
     --page-gradient:
       radial-gradient(circle at 18% 20%, rgba(255,255,255,0.90), transparent 26%),
       radial-gradient(circle at 80% 28%, rgba(255,176,199,0.75), transparent 30%),
       linear-gradient(135deg, #f6d7df 0%, #efb9c8 45%, #e69cb5 100%);
   }

4. เพิ่ม utility class ใหม่:

   .card-strong {
     background: var(--glass-strong);
     border: var(--glass-border);
     box-shadow: var(--shadow-strong);
     backdrop-filter: blur(18px);
     -webkit-backdrop-filter: blur(18px);
     border-radius: 34px;
   }

   .card-soft {
     background: var(--glass-soft);
     border: 1px solid rgba(255,255,255,0.56);
     box-shadow: var(--shadow-soft);
     backdrop-filter: blur(14px);
     -webkit-backdrop-filter: blur(14px);
     border-radius: 24px;
   }

   .btn-dark {
     background: var(--color-wisa-dark);
     color: white;
     border-radius: 999px;
     border: none;
     box-shadow: 0 12px 24px rgba(36,31,33,0.18);
     transition: transform .2s ease, box-shadow .2s ease;
   }
   .btn-dark:hover {
     transform: translateY(-2px);
     box-shadow: 0 16px 30px rgba(36,31,33,0.24);
   }

   /* วงฟุ้งตกแต่งระดับหน้า (ไม่ใช่ระดับการ์ด) — fixed position มุมจอ ใช้ครั้งเดียวใน
      MainLayout ไม่ใช้ซ้ำในทุกการ์ด */
   .page-decoration::before,
   .page-decoration::after {
     content: '';
     position: fixed;
     z-index: -1;
     border-radius: 50%;
     filter: blur(8px);
     pointer-events: none;
   }
   .page-decoration::before {
     width: 390px; height: 390px; top: -120px; left: -80px;
     background: rgba(255,255,255,0.34);
   }
   .page-decoration::after {
     width: 470px; height: 470px; right: -140px; bottom: -150px;
     background: rgba(246,112,154,0.28);
   }

รัน grep หา hardcoded color เดิมทั่ว repo (bg-black, text-black, bg-white ตรงๆ, font
Segoe UI, #000000, #ffffff, #e91e8c inline) — เปลี่ยนเป็น token/class ใหม่ข้างบนให้หมด
ไม่ให้มีจุดหลุดเป็นธีมเก่าค้างอยู่

รัน build ให้ผ่าน ยังไม่ต้อง screenshot รอบนี้ (รอ STEP ถัดไปที่เริ่มใช้ class จริง)
```

---

## STEP 2 — Global chrome: Header only (Sidebar/MainLayout stay dark, gradient scoped to Overview)

```
*** แก้ไข scope จาก STEP 2 เดิม: Sidebar ทุกหน้าให้คงเป็น bg-wisa-dark ทึบเหมือนเดิม
ไม่ต้องเปลี่ยนเป็น glass/card-strong ใดๆ ทั้งสิ้น (ยกเลิกคำสั่งเดิมที่เคยให้เปลี่ยน Sidebar) ***

*** แก้ไข scope: --page-gradient และ .page-decoration ต้อง**ไม่ใช่ global ที่ <body>**
เพราะ MainLayout ใช้ร่วมกันทุกหน้า (Capacity, Min-Max, Overview) ทำให้ gradient เห็นทะลุ
ออกมาทุกหน้าโดยไม่ตั้งใจ — ให้ scope เฉพาะหน้า Overview เท่านั้น (รายละเอียดอยู่ใน STEP 3) ***

ถ้า STEP 2 รอบก่อนไปแก้ index.html <body class="page-decoration"> และ index.css body
{ background: var(--page-gradient) } ไว้แล้ว ให้ revert กลับ:
  - เอา class="page-decoration" ออกจาก <body> ใน index.html
  - เอา background: var(--page-gradient) ออกจาก body rule ใน index.css (body กลับไปไม่มี
    background พิเศษ หรือใช้ bg-wisa-dark เป็นพื้นหลัง fallback เหมือนเดิมก่อนแก้)
  - MainLayout.jsx: เอา bg-transparent ออก กลับไปใช้ bg-wisa-dark ทึบเหมือนเดิม (wrapper
    นอกสุด) — main panel ด้านในยังคงเปลี่ยนเป็น class "card-soft" ตามเดิมได้ (ส่วนนี้ไม่ผิด
    เป็นแค่การ์ดของ main panel เอง ไม่ใช่ global background)

Header.jsx (ส่วนนี้ทำได้ตามเดิม ไม่มีปัญหา):
  - ปุ่ม icon กลม (search, bell) เปลี่ยนเป็น bg-white/40 backdrop-blur-sm border
    border-white/30 (glass เบาๆ)
  - Avatar circle "AD" เปลี่ยนพื้นหลังเป็น class "btn-dark"

เปิดดูจริงใน browser (Playwright) ยืนยันว่า: Sidebar ทุกหน้า (Capacity, Min-Max, Overview)
กลับมาเป็นดำทึบเหมือนเดิม, พื้นหลังรอบนอก MainLayout ทุกหน้าเป็นดำทึบเหมือนเดิม (ไม่มี
gradient ชมพูรั่วออกมาที่หน้าอื่นนอกจาก Overview), เห็นแค่ Header icon/avatar ที่เปลี่ยน
แนบ screenshot เทียบ 3 หน้า (Capacity, Min-Max, Overview) ยืนยันว่าหน้าอื่นไม่ได้รับผลกระทบ
เลย ก่อน commit + push
```

---

## STEP 3 — Overview page (gradient background scoped ที่นี่เท่านั้น, ใช้ reference HTML ที่ user ให้มาโดยตรง)

```
*** จุดสำคัญที่เพิ่มจาก STEP 3 เดิม: --page-gradient และวงฟุ้งตกแต่ง (.page-decoration
::before/::after) ต้องถูก scope ไว้ใน Overview.jsx เท่านั้น ไม่ใช่ global ***

แก้ Overview.jsx:
  - Wrapper นอกสุดของ Overview.jsx (component เดียวนี้เท่านั้น ไม่กระทบ MainLayout) ใส่
    background: var(--page-gradient) และ class "page-decoration" ตรงนี้แทน (เปลี่ยนจากที่
    เคยจะใส่ที่ <body> — ต้องปรับ .page-decoration::before/::after ให้ใช้ position: absolute
    แทน position: fixed เดิม เพราะตอนนี้ scope อยู่แค่ใน Overview component ไม่ใช่ทั้ง viewport
    แล้ว ถ้าใช้ fixed จะหลุดไปแสดงทับหน้าอื่นตอน navigate อยู่ดี ต้องเปลี่ยนเป็น absolute
    + overflow: hidden ที่ wrapper ของ Overview เพื่อ clip ไม่ให้วงฟุ้งล้นออกนอกหน้านี้)
  - Wrapper นี้ต้อง border-radius มนตามที่ MainLayout กำหนดไว้แล้ว (เพราะ MainLayout ยังคง
    bg-wisa-dark ทึบรอบนอกตาม STEP 2 ที่แก้ไขแล้ว — gradient จะเห็นแค่ "ข้างใน" กรอบของ
    Overview page เท่านั้น ไม่ทะลุออกไปนอกกรอบ rounded ของ main panel)
```

(ต่อด้วยเนื้อหา TodayCard + stats + activity ตามที่ระบุไว้ด้านล่างในไฟล์นี้เหมือนเดิม
ไม่มีการเปลี่ยนแปลงส่วนนั้น)
แก้ Overview.jsx ให้ตรงกับ reference HTML ที่ user ส่งมาเป๊ะ (แปลงเป็น JSX + Tailwind +
reuse component ที่มีอยู่แล้วในโปรเจกต์ ไม่ใช่ copy inline style ดิบๆ ทั้งหมด):

โครง 2 คอลัมน์ (กว้าง 290px คงที่ + เนื้อหาที่เหลือ):

คอลัมน์ซ้าย — "TodayCard" (component ใหม่ components/TodayCard.jsx):
  - การ์ด class "card-strong" (gradient ชมพูอ่อนโปร่งแสง ตามที่ reference ใช้ .jul-card กับ
    background: var(--login-card) เดิม — ตอนนี้คือ var(--glass-strong))
  - สูง min-height เท่าเนื้อหาฝั่งขวา (calc(100vh - 48px) ตาม reference) ไม่ใช่แค่สูงเท่า
    เนื้อหาข้างในตัวเอง
  - เนื้อหาบนลงล่างตาม reference เป๊ะ:
    1. "Today" eyebrow เล็กสีเทา (var(--text-muted))
    2. เดือนปัจจุบัน ตัวใหญ่ (46px), font-weight 600, letter-spacing -3px, สีเข้ม
       (var(--text-primary)) — คำนวณจาก new Date() จริง format ชื่อเดือนย่อ (เช่น "Jul")
    3. ปีปัจจุบัน บรรทัดถัดมา ขนาดเท่ากัน (46px) font-weight 600 letter-spacing -3px
       เท่ากัน **สีชมพูเข้ม (#ee9eb8 ตาม reference, ไม่ใช่ gradient text)** — คำนวณจาก
       new Date() จริง (เช่น "2025")
    4. วันที่เต็มปัจจุบัน 2 บรรทัด: "Monday 14" ตัวหนา, "July 2025" สีเทา — คำนวณจาก
       new Date() จริง
    5. brand mark: วงกลม "W" พื้นหลัง wisa-dark + ข้อความ "wisaCore"
    6. ปุ่ม class "btn-dark" ข้อความ "Go to Min-Max →" กด navigate ไป /minmax3month
       (useNavigate จาก react-router ที่มีอยู่แล้ว)
  - ไม่มี gradient blob เป็นวงกลมลอยแยกต่างหากในการ์ดนี้ (reference ไม่มี blob ในการ์ด jul
    เลย ความนุ่มนวลมาจากตัว background gradient ของการ์ดเองล้วนๆ)

คอลัมน์ขวา — เนื้อหาเดิม:
  - หัวข้อ "Overview" font-size 31px, font-weight 500, letter-spacing -1.4px (ตาม
    .page-title ใน reference เป๊ะ — ไม่ใช่แค่ font-weight เฉยๆ)
  - Stats card (grid 3 อัน) เปลี่ยนเป็น class "card-soft" border-radius 24px (ตาม
    .stat-card ใน reference)
  - Recent Activity card เปลี่ยนเป็น class "card-soft" **แต่ override border-radius เป็น
    28px** (ตาม .activity-card ใน reference — คนละค่ากับ stat-card จงใจ ไม่ใช่พิมพ์ผิด
    ต้องสร้าง class ย่อยเพิ่ม เช่น "card-soft-lg" หรือ inline override เฉพาะจุดนี้)
  - แถวใน Activity card (activity-row): padding 24px 0, border-bottom: 1px solid
    rgba(92,43,62,0.12) (สีเส้นขอบอุ่นๆ ตัดกับโทนชมพู ไม่ใช่สีเทาทั่วไป), grid-template-
    columns: 1fr auto
  - badge สีเขียว/แดงของ activity status คงสี semantic เดิมไว้ (เขียว=Done, เหลือง/ส้ม=Review)
    ไม่เปลี่ยนเป็นชมพู เพราะสื่อความหมายสถานะ ไม่ใช่ theme decoration

เอารูปดอกไม้เดิม (bgFloral image + clip-path mask) ออกทั้งหมด แทนที่ด้วย TodayCard

เปิดดูจริงใน browser (Playwright) ยืนยัน: layout 2 คอลัมน์ตรงกับ reference, เดือน/ปี/วันที่
ที่แสดงตรงกับวันปัจจุบันจริงตอนเปิดหน้า (ไม่ hardcode "Jul 2025"), ปีเป็นสีชมพูเข้มตัวเดียว
(ไม่ใช่ gradient text), ปุ่ม Go to Min-Max กดแล้ว navigate ถูกหน้า, stats/activity เป็น
glass การ์ดชัดเจน ตัวเลขยังอ่านง่าย แนบ screenshot เทียบกับ reference ก่อน commit + push
```

---

## STEP 4 — Capacity page

```
แก้ CapacityPage.jsx (และ component ย่อยใน pages/Capacity/ ถ้ามี):
  - Hero card (บนสุด ที่มี upload button) เปลี่ยนจาก bg-[#111111] ทึบ เป็น class "card-strong"
  - Target Month card ข้างๆ เปลี่ยนเป็น "card-strong" เช่นกัน
  - ปุ่ม "Process Data" เปลี่ยนจาก bg-wisa-pink ทึบ เป็น class "btn-dark"
  - Table section card เปลี่ยนเป็น class "card-soft"
  - Export CSV button ปรับให้เข้ากับ glass theme (bg-white/10 border border-wisa-pink/40
    text-wisa-pink คงไว้ได้ ปรับแค่ให้ soft ขึ้นเล็กน้อย)

*** สำคัญ: ตาราง data (แถวข้อมูล NQC) ห้ามใส่ glass/blur effect ที่ตัวแถวข้อมูลเอง
ใส่ได้แค่ container/card รอบนอกเท่านั้น เพราะ blur บนตัวเลข/ตัวหนังสือข้อมูลจริงจะทำให้
อ่านยากขึ้น ผิดจุดประสงค์การใช้งานเป็นเครื่องมือทำงาน ***

เปิดดูจริงใน browser (Playwright) ยืนยัน glass effect ที่การ์ด แต่ตารางข้อมูลยังคมชัด
อ่านง่ายเหมือนเดิม แนบ screenshot ก่อน commit + push
```

---

## STEP 5 — Min-Max pages (History + Current)

```
แก้ทุก component ใน pages/Minmax3Month/:

Minmax3MonthTabs.jsx:
  - Tab bar segmented capsule เปลี่ยนพื้นหลังแคปซูลใหญ่จาก bg-wisa-dark ทึบ เป็น class
    "card-strong", active pill เปลี่ยนจาก bg-wisa-white ทึบ เป็น class "btn-dark" (พื้นเข้ม
    ตัวหนังสือขาว ให้สอดคล้องกับปุ่มหลักทั้งแอป)

MinmaxHistoryTab.jsx:
  - Card ต่อเดือน (MinmaxSectionCard) เปลี่ยนเป็น class "card-soft"
  - REV badge ล่าสุด (accent) เปลี่ยนพื้นหลังเป็น #ee9eb8 (สีชมพูเข้มเดียวกับที่ใช้ตัวเลขปี
    ใน TodayCard เพื่อความ consistent ทั่วแอป)

MinmaxCurrentTab.jsx / MinmaxUploadGrid.jsx / MinmaxConfigPanel.jsx / MinmaxResultsPanel.jsx
/ MinmaxDataTable.jsx:
  - Setup card, config panel → class "card-strong"
  - ปุ่ม Calculate Min-Max, ปุ่ม Export ท้ายหน้า → class "btn-dark"
  - Metric card (Rows/OK/Warnings/Errors) → class "card-soft" พื้นหลัง, คงสี semantic ของ
    ตัวเลข/badge เดิมไว้ (success=เขียว, warning=เหลือง, danger=แดง) ไม่เปลี่ยนเป็นชมพู
  - *** ตาราง MinmaxDataTable.jsx (19 คอลัมน์) และ filter input ทั้ง 6 ช่อง ห้ามใส่ glass/
    blur effect ที่ตัวข้อมูล/input โดยตรง ใส่ effect ได้แค่ card container ที่ห่อตารางอยู่
    ด้านนอกเท่านั้น ***
  - Month switcher pill (N+1/N+2/N+3) active state ใช้ class "btn-dark" เหมือน tab bar

เปิดดูจริงใน browser (Playwright) ทั้ง 2 tab (History/Current) รวมถึงสถานะที่มีข้อมูลจริง
(mocked calculate response) ยืนยันว่าตารางข้อมูล/filter ยังคมชัดอ่านง่าย ไม่มี blur รบกวน
เลย ส่วน card/ปุ่ม/decoration รอบๆ เป็นธีมใหม่ครบตรงกับ reference แนบ screenshot ก่อน
commit + push
```

---

## หมายเหตุสำหรับผู้ใช้ (ไม่ต้องส่งให้ Claude Code)

- รันตามลำดับ 1→2→3→4→5 เพราะ STEP 1 (token + font + utility class) เป็นฐานของทุก step
  ถัดไป และ STEP 2 (page-gradient พื้นหลังเต็มหน้า) ต้องทำก่อน STEP 3-5 ไม่งั้นการ์ด glass
  จะดูแปลกเพราะไม่มี gradient พื้นหลังให้โปร่งทะลุเห็น
- ทุก STEP กำชับไว้ตรงกันว่า **ห้ามใส่ blur/glass บนตัวข้อมูลจริง** (ตัวเลข, ตาราง, filter
  input) ใส่ได้แค่ card container รอบนอก
- สี semantic (เขียว=สำเร็จ, แดง=error, เหลือง=warning) ไม่แตะต้องทุกจุด เพราะสื่อความหมาย
  functional ไม่ใช่ theme decoration
- TodayCard (STEP 3) ไม่มี gradient blob วงกลมลอยแยก — ความนุ่มนวลมาจาก background
  gradient ของการ์ดเองเท่านั้น ตรงตาม reference ที่ user ยืนยันแล้ว
