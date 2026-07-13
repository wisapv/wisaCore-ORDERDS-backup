# Claude Code Prompt — Implement `minmaxExcel.exporter.js` (Excel Export ตาม Template เป๊ะ)

ส่ง prompt นี้ทั้งก้อนให้ Claude Code ได้เลย (ยาวเพราะมี spec ครบ ไม่ต้องตัด)

---

```
บริบท: services/exporters/minmaxExcel.exporter.js ตอนนี้เป็น placeholder เปล่า
(export default {}) ต้อง implement ให้ export ผลลัพธ์จาก calculateMinMaxFromCalBase
เป็นไฟล์ .xlsx ที่มีหน้าตาตรงกับ template ที่ user ออกแบบไว้เป๊ะ (สี/ฟอนต์/merge/สูตร)

ใช้ library "exceljs" (รองรับ formula, style, merge cell ครบกว่า xlsx package ที่ใช้
อยู่เดิมสำหรับงาน export ที่ต้องคุม styling ละเอียด — เพิ่ม dependency ใหม่ได้ถ้ายังไม่มี)

=== SECTION 1: STYLE SPEC (ยืนยันจาก theme.xml จริงของ template แล้ว ไม่ใช่เดา) ===

Font: "Arial Narrow", bold=true ทุกจุด ขนาดต่างกันตามส่วน:
  - Title (row1): 28pt
  - Issued date (row3): 22pt
  - Unit/Day, Tack time label (row3): 18pt
  - Group header BOX/PCS (row5), LP Design Freq/Internal Lead Time group (row6): 16pt / 14pt
    (row5 กลุ่มใหญ่ = 16pt, row6 กลุ่มย่อยบางอัน = 14pt — ดูตาม role)
  - Column header (row7): 16pt, wrapText=true

สี (hex ตรงจาก theme จริง):
  dk1 (ใช้เป็นสี text ของทุก header) = #000000
  lt1 (ใช้เป็นพื้นหลังคอลัมน์ id ทั่วไป, ก่อน tint) = #FFFFFF

  Title bar (row1, merge ทั้งแถวความกว้างเท่า sheet): fill=#000000, font color=#FFFFFF
  Issued date cell: fill=#000000, font color=#FFFFFF
  Unit/Day, Tack time label cells: fill=#000000, font color=#FFFFFF
  Unit/Day, Tack time VALUE cells: fill=#FFFFFF, font color=#000000, border thin ล้อมรอบ
  BOX group header (row5): fill=#A375FF, font color=#000000
  PCS group header (row5): fill=#F973C9, font color=#000000
  "LP Design Freq" group (row6): fill=#A375FF, font color=#000000
  "Internal Lead Time" group (row6): fill=#2D87FF, font color=#000000
  คอลัมน์ "Error" (col A, row7): fill=#FF0000, font color=#000000
  คอลัมน์ id ทั่วไป (SUPL, PLANT, DOCK, PART# ฯลฯ, row7): fill=#FFFFFF (tint -15%, ใช้ #C8C8C8
    ถ้า exceljs ไม่รองรับ tint), font color=#000000
  คอลัมน์ "Q'ty" (row7): fill=#FFFF00, font color=#000000
  คอลัมน์ PC Del/PC Safety/LS Del/LS Safety/Safety(PC+LS) (row7): fill=#A7CDFF, font color=#000000
  PC Min/Max/LS Min/Max กลุ่มแรก (N+1, ทั้ง Box และ Pcs, row7): fill=#D1D1FF, font color=#000000
  PC Min/Max/LS Min/Max กลุ่ม N+2/N+3/MAX (ทั้ง Box และ Pcs, row7): fill=#E1E1FF, font color=#000000

Border: thin ล้อมทุก header cell (row1, row3, row5, row6, row7)
Row height: row1=40.5, row3=60, row5=31, row6=35, row7=134.5
Alignment: header cells ทั้งหมด horizontal=center, vertical=center

=== SECTION 2: LAYOUT / MERGE CELLS (19 ranges ตรงจาก template) ===

BD6:BG6, AD3:AE3, AF3:AG3, Y3:Z3, AJ5:AY5, W6:X6, AV6:AY6, BH6:BK6, Y6:AA6, AN6:AQ6,
T6:V6, AZ6:BC6, BL6:BO6, AB6:AD6, AA3:AB3, AE6:AI6, AZ5:BO5, AJ6:AM6, AR6:AU6
(+ merge title row1 ทั้งแถวความกว้างของทุกคอลัมน์ที่ใช้จริง — เดิม template ให้ดูแค่ AB1
แต่ให้ merge ครอบคลุม A1:BO1 ทั้งแถวเพื่อให้ title กว้างเต็ม sheet)

=== SECTION 3: COLUMN MAPPING (1-67) — ความเชื่อมั่นสูง ===

col A (1)  "Error"        = FormulaStatus (แสดง "Err" ถ้า FormulaStatus==='ERROR' ไม่งั้นว่าง)
col B (2)  "Supplier Key" = SupplierKey
col C (3)  "SUPL"         = SUPL
col D (4)  "PLANT"        = SupplierPlant
col E (5)  "S.Dock"       = S.DOCK
col F (6)  "DOCK"         = DOCK
col G (7)  "PART #"       = PART #
col H (8)  "Part Name"    = PART DESC
col I (9)  "KBN"          = KBN
col J (10) "Q'ty"         = QTY /CONT
col K (11) "P/C Add"      = P/C Add (Kanban Print Address)
col L (12) "Lineside Address" = Lineside Address
col M (13) "Conveyance Route" = Conveyance Route(External)
col N (14) "USE THIS Distribution Ratio" = UseThisDistributionRatio
col O (15) "ROUTE"        = Route
col P (16) "ROUTE CODE"   = RouteCode
col Q (17) "Minomi"       = "" (ไม่มี data source — ปล่อยว่างเสมอ ตามที่ยืนยันไปก่อนหน้าว่า
                              ไม่พบว่าใช้ในสูตรคำนวณใดๆ ในไฟล์ VBA ต้นฉบับ)
col R (18) "Set Part"     = SetPartPType (หรือ SetPartDependUsed ถ้าอยากโชว์ค่า Depend จริง
                              แทน — ใช้ SetPartDependUsed เพื่อประโยชน์ในการ debug มากกว่า)
col S (19) "Box Layer"    = BoxLayer

col Y-AA (25-27) "NQC MONTH" = ชื่อเดือน N+1/N+2/N+3 (คำนวณจาก targetMonth + EDATE 1/2/3
                              เดือน format เป็น "mmm-yy" เช่น "Nov-25")
col AB-AD (28-30) "NQC MAX/DAY" = N1PerDay, N2PerDay, N3PerDay
col AE (31) "PC Del"      = PcDel
col AF (32) "PC Safety"   = PcSafetyTime
col AG (33) "LS Del"      = LsDel
col AH (34) "LS Safety"   = LsSafetyTime
col AI (35) "Safety (PC+LS)" = TotalSafetyTime

=== SECTION 3B: COLUMN 20-24 (T,U,V,W,X) — ยืนยันแล้ว 100% จากไฟล์ VBA ต้นฉบับจริง ===

(อ้างอิงจากไฟล์ Cal_Min-Max_N+3 ต้นฉบับจริงที่มีแถวข้อมูลตัวอย่าง — ไม่ใช่การเดาอีกต่อไป)

col T (20) = CurrentFreq (จาก Freq_LP คอลัมน์ "OrderFreq(*)" — freq ปัจจุบัน ณ เดือนฐาน)
             header แสดงผลเป็น dynamic string "LP Design = [เดือนฐาน]"
col U (21) = OrderFreqForCalculation (จาก Freq_LP คอลัมน์ "OrderFreq(24)" — ค่าที่ใช้คำนวณจริง)
             header แสดงผลเป็น dynamic string "LP Design = [เดือน N+1]" (label ดู confuse
             เพราะจริงๆ ดึงคอลัมน์เดียวกับ "Req" แต่ VBA ต้นฉบับตั้งชื่อแบบนี้ — คงชื่อไว้ตามต้นฉบับ)
col V (22) = "Check LP Freq Status" = IF(T=U,"Same",IF(T<U,"Increase","Decrease"))
col W (23) = OrderFreqForCalculation อีกครั้ง (= ค่าเดียวกับ U เป๊ะ, header เปลี่ยนเป็น
             "Req LP Design = [...]" ต่อท้าย label ของ U) — ให้เขียน static value เดียวกับ U
             หรือ Excel formula "=U{n}" ก็ได้ (ตรงกับต้นฉบับที่ AG2 = AE2 ตรงๆ)
col X (24) = "Order Freq Status (Base Current)" = IF(T=W,"Same",IF(T<W,"Increase","Decrease"))
             (จะได้ผลเหมือน V เสมอเพราะ W=U — คงไว้ตามต้นฉบับแม้จะดูซ้ำซ้อน)

*** ลบ "ASSUMPTION" comment เดิมออกได้ — mapping นี้ confirmed แล้วจากไฟล์ VBA ต้นฉบับจริง
พร้อมแถวข้อมูลตัวอย่าง ไม่ต้อง flag ให้ user verify เพิ่มอีก ***

=== SECTION 3C: ค่า DYNAMIC ทั้งหมด — ห้าม hardcode เด็ดขาด ===

ค่าต่อไปนี้ต้องคำนวณสดจากข้อมูล request จริงทุกครั้งที่ export ไม่ใช่ตัวเลข/ข้อความตายตัว:

1. Header ของคอลัมน์ T (20): รูปแบบข้อความ "LP Design Freq = [ {เดือนฐาน format mmm-yy} ]"
   → แทนที่ {เดือนฐาน...} ด้วยชื่อเดือนจริงที่คำนวณจาก targetMonth เช่น targetMonth="2025-10"
   → ข้อความจริงในไฟล์คือ "LP Design Freq = [ Oct-25 ]" (ห้าม print คำว่า "N" ลงไปเด็ดขาด)

2. Header ของคอลัมน์ U (21): รูปแบบข้อความ "LP Design Freq = [ {เดือนถัดจาก targetMonth 1
   เดือน format mmm-yy} ]" → เช่น targetMonth="2025-10" → ข้อความจริงคือ
   "LP Design Freq = [ Nov-25 ]" (ห้าม print คำว่า "N+1" ลงไปเด็ดขาด)

3. Header ของคอลัมน์ W (23): รูปแบบข้อความ "AL Req LP Design Freq = [ {เดือนเดียวกับข้อ 2} ]"
   → เช่น "AL Req LP Design Freq = [ Nov-25 ]" (เดือนเดียวกับคอลัมน์ U เป๊ะ แค่ prefix
   ข้อความต่างกัน "AL Req " นำหน้า — ห้าม print คำว่า "N+1" ลงไปเด็ดขาด)

4. Header ของคอลัมน์ Y,Z,AA (25-27, กลุ่ม "NQC MONTH"): ต้องขึ้นเป็น **ชื่อเดือนจริง format
   "mmm-yy"** เท่านั้น (เช่น "Nov-25", "Dec-25", "Jan-26") — **ห้าม print ข้อความ "N+1"/"N+2"/
   "N+3" ลงในไฟล์ Excel เด็ดขาด** คำว่า N+1/N+2/N+3 ในเอกสารนี้เป็นแค่ชื่อเรียกภายใน (internal
   label) สำหรับอธิบายว่าคอลัมน์ไหนคือเดือนที่เท่าไหร่ ไม่ใช่ข้อความที่ต้องปรากฏในไฟล์จริง
   ตัวอย่าง: targetMonth="2025-10" → คอลัมน์ Y แสดง "Nov-25" (เดือนที่ 1 ถัดจาก target),
   คอลัมน์ Z แสดง "Dec-25" (เดือนที่ 2 ถัดไป), คอลัมน์ AA แสดง "Jan-26" (เดือนที่ 3 ถัดไป)
   คำนวณจาก targetMonth บวก 1/2/3 เดือนตามลำดับ แล้ว format เป็น "mmm-yy" ทุกครั้ง

5. ค่า Unit/Day (cell AA3 หรือตำแหน่งเทียบเท่าใน template): = config.unitPerDay ที่ user
   กรอกมาจริงตอน request (ไม่ใช่ 750 ที่เห็นใน template ตัวอย่าง — นั่นเป็นแค่ตัวอย่าง)
   ถ้า user ไม่กรอก (เพราะตอนนี้เป็น optional แล้ว) ให้แสดงเป็นค่าว่างหรือ "-" ไม่ใช่ 0

6. ค่า Takt Time (cell AF3 หรือเทียบเท่า): = config.tackTime ที่ user กรอกมาจริง เหมือนข้อ 5

7. "Issued date: {D MMM'YY}" (เช่น "Issued date: 10 Jul'26") = **วันที่/เวลาปัจจุบัน ณ ตอนที่
   ระบบ generate ไฟล์ export นี้จริง** (new Date() ตอน request เข้ามา) ไม่ใช่ targetMonth และ
   ไม่ใช่ตัวอย่างวันที่ใน template — format แบบ "10 Jul'26" คือ D MMM'YY (วัน เดือนย่อ ปี 2 หลัก
   ต่อท้ายด้วย apostrophe)

*** ทุกจุดในข้อ 1-7 ให้เขียน unit test แยกเช็คว่าเปลี่ยนตาม input จริง (เช่น ทดสอบด้วย
targetMonth คนละค่ากัน 2 แบบ แล้วยืนยันว่า header เดือนเปลี่ยนตามจริง ไม่ใช่ค่าคงที่ที่หลุด
มาจาก template ตัวอย่าง) ***

=== SECTION 4: กลุ่ม BOX / PCS (col 36-67) — สูตร Excel จริง (ไม่ใช่ static value) ===

4 กลุ่มเรียงกัน: N+1(36-39), N+2(40-43), N+3(44-47), MAX(48-51) สำหรับ BOX
แล้วซ้ำ pattern เดียวกันอีกชุดสำหรับ PCS: N+1(52-55), N+2(56-59), N+3(60-63), MAX(64-67)
แต่ละกลุ่ม 4 คอลัมน์เรียง: PC Min, PC Max, LS Min, LS Max (ยืนยันแล้วว่า "LS Max" ที่ซ้ำใน
template จริงเป็น typo ควรเป็น "LS Min" ตามลำดับนี้ทุกกลุ่ม)

ให้แต่ละ cell เป็นสูตร Excel อ้างอิงคอลัมน์อื่นในแถวเดียวกัน (row ที่ n, เริ่มจาก row8):

--- BOX กลุ่ม N+1 (col AJ-AM = 36-39), ใช้ NQC MAX/DAY ที่ col AB (28) ---

PC Min (AJ{n}):
=IF($AB{n}=0,0,IF($A{n}="Err","Err",IF(AND($F{n}="SH",$P{n}=1),"NO Data",
  IF($P{n}=2,"-",ROUNDUP($AB{n}*$N{n}*(($AF{n}/920)+0.05%)/$J{n},0)))))

PC Max (AK{n}):
=IF($AJ{n}=0,0,IF(OR($AJ{n}="-",$AJ{n}="NO Data",$AJ{n}="Err"),$AJ{n},
  $AJ{n}+ROUNDUP($AB{n}*$N{n}/$W{n}/$J{n},0)+$S{n}))

LS Min (AL{n}):
=IF($P{n}=3,"-",IF($A{n}="Err","Err",IF($AB{n}=0,0,
  ROUNDUP($AB{n}*$N{n}*((IF(AND($F{n}<>"SH",$P{n}=1),$AH{n},$AI{n})/920)+0.05%)/$J{n},0))))

LS Max (AM{n}):
=IF($AL{n}=0,0,IF(OR($AL{n}="-",$AL{n}="NO Data",$AL{n}="Err"),$AL{n},
  IF($P{n}=1,$AL{n}+ROUNDUP($AB{n}*$N{n}/24/$J{n},0),
    IF($P{n}=2,$AL{n}+ROUNDUP($AB{n}*$N{n}/$W{n}/$J{n},0)+$S{n},"-"))))

--- BOX กลุ่ม N+2 (col AN-AQ = 40-43): เหมือนกลุ่ม N+1 ทุกตัวอักษร แค่เปลี่ยน $AB{n} เป็น
    $AC{n} (NQC MAX/DAY เดือน N+2) และเปลี่ยน cross-reference ในสูตร PC Max/LS Max จาก
    $AJ{n}/$AL{n} เป็น $AN{n}/$AP{n} (อ้างอิง PC Min/LS Min ของกลุ่มตัวเอง)

--- BOX กลุ่ม N+3 (col AR-AU = 44-47): เหมือนกัน ใช้ $AD{n} (NQC MAX/DAY เดือน N+3),
    cross-reference $AR{n}/$AT{n}

--- BOX กลุ่ม MAX (col AV-AY = 48-51): **ไม่ใช่สูตรคำนวณใหม่** เป็นแค่ MAX ของ 3 กลุ่มก่อนหน้า:

PC Min MAX (AV{n}):
=IF(OR($AJ{n}="Err",$AN{n}="Err",$AR{n}="Err"),"Err",
  IF(COUNT($AJ{n},$AN{n},$AR{n})=0,$AJ{n},MAX($AJ{n},$AN{n},$AR{n})))
  (ถ้าไม่มีค่าตัวเลขเลยสักตัว = ทั้ง 3 เดือนเป็น "-"/"NO Data" เหมือนกันหมด ให้ propagate
  ค่าแรก $AJ{n} ไปเลย เพราะควรจะเหมือนกันทั้ง 3 อยู่แล้ว)

PC Max MAX (AW{n}): เหมือน pattern บน แต่ใช้ $AK{n},$AO{n},$AS{n}
LS Min MAX (AX{n}): ใช้ $AL{n},$AP{n},$AT{n}
LS Max MAX (AY{n}): ใช้ $AM{n},$AQ{n},$AU{n}

--- PCS กลุ่ม N+1 (col AZ-BC = 52-55): pattern เดียวกับ BOX แต่ตัดการหาร $J{n} ในเทอมหลัก
    ของ Min ออก และเปลี่ยนเทอมที่บวกใน Max ให้คูณ $J{n} กลับ (ตามสูตร Pcs ที่ verify กันไปแล้ว):

PC Min Pcs (AZ{n}):
=IF($AB{n}=0,0,IF($A{n}="Err","Err",IF(AND($F{n}="SH",$P{n}=1),"NO Data",
  IF($P{n}=2,"-",ROUNDUP($AB{n}*$N{n}*(($AF{n}/920)+0.05%),0)))))

PC Max Pcs (BA{n}):
=IF($AZ{n}=0,0,IF(OR($AZ{n}="-",$AZ{n}="NO Data",$AZ{n}="Err"),$AZ{n},
  $AZ{n}+(ROUNDUP($AB{n}*$N{n}/$W{n}/$J{n},0)*$J{n})+($S{n}*$J{n})))

LS Min Pcs (BB{n}):
=IF($P{n}=3,"-",IF($A{n}="Err","Err",IF($AB{n}=0,0,
  ROUNDUP($AB{n}*$N{n}*((IF(AND($F{n}<>"SH",$P{n}=1),$AH{n},$AI{n})/920)+0.05%),0))))

LS Max Pcs (BC{n}):
=IF($BB{n}=0,0,IF(OR($BB{n}="-",$BB{n}="NO Data",$BB{n}="Err"),$BB{n},
  IF($P{n}=1,$BB{n}+(ROUNDUP($AB{n}*$N{n}/24/$J{n},0)*$J{n}),
    IF($P{n}=2,$BB{n}+(ROUNDUP($AB{n}*$N{n}/$W{n}/$J{n},0)*$J{n})+($S{n}*$J{n}),"-"))))

--- PCS กลุ่ม N+2 (BD-BG=56-59), N+3 (BH-BK=60-63): pattern เดียวกับ PCS N+1 เปลี่ยน
    NQC MAX/DAY เป็น $AC{n}/$AD{n} ตามลำดับ และ cross-reference กลุ่มตัวเอง

--- PCS กลุ่ม MAX (BL-BO=64-67): MAX ของ 3 กลุ่ม Pcs ก่อนหน้า เหมือน pattern BOX MAX
    (ใช้ $AZ{n}/$BD{n}/$BH{n} เป็นต้น)

=== SECTION 5: DATA ROW ===

เขียนแถวข้อมูลเริ่มที่ row 8 (ต่อจาก header row 7) หนึ่งแถวต่อ 1 row ผลลัพธ์จาก
calculateMinMaxFromCalBase.rows — คอลัมน์ A-AI, Q(Minomi), R(Set Part) เขียนเป็น static
value ตรงๆ, คอลัมน์ T-X (assumption section) เขียนตาม best-guess ที่ระบุไว้, คอลัมน์
AJ-BO (Box/Pcs ทั้งหมดรวม MAX group) เขียนเป็น **Excel formula string** ตาม Section 4
(ใช้ ws.getCell(...).value = { formula: '...' } แบบ exceljs)

=== SECTION 6: TESTING ===

เขียน test แยก (minmaxExcel.exporter.test.js) ที่:
1. เรียก exporter ด้วย fixture จาก calBase.vba-parity.test.js (happy case)
2. เปิดไฟล์ผลลัพธ์ด้วย exceljs อ่านกลับมา เช็ค: merge cell ranges ตรงกับ spec, สี/ฟอนต์ของ
   header cell สุ่มเช็คสัก 5-6 จุดตรงกับ spec, สูตรใน cell (ไม่ใช่ value) ตรงกับ template
   ที่ระบุ (string comparison ของ formula text)
3. **ไม่ต้อง evaluate สูตรเอง** (exceljs ไม่ได้ evaluate formula ให้อัตโนมัติ) แค่เช็คว่า
   string ของสูตรที่เขียนลงไปตรงกับที่ spec ต้องการ

รัน test ให้ผ่านก่อน commit แล้วสรุปผลกลับมา พร้อมแนบไฟล์ตัวอย่าง (ถ้าทำได้) หรือ base64/
บอกวิธี generate ไฟล์ตัวอย่างมาดู เพราะ section 3B (col T-X) เป็น assumption ที่ต้อง
verify กับ user ด้วยตา ก่อนถือว่าเสร็จสมบูรณ์
```
