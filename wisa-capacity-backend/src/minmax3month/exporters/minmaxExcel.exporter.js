import ExcelJS from 'exceljs';

const SHEET_NAME = 'Min-Max 3 Month';
const LAST_COLUMN = 67; // BO
const FIRST_DATA_ROW = 8;
const FONT_NAME = 'Arial Narrow';
const ERR_TEXT = 'Err';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseTargetMonth = (targetMonth) => {
  const compact = String(targetMonth ?? '').trim().replace(/[-/\s]/g, '');
  if (!/^\d{6}$/.test(compact)) throw new Error(`Invalid targetMonth for export: ${targetMonth}`);
  return { year: Number(compact.slice(0, 4)), month: Number(compact.slice(4, 6)) };
};

const addMonths = ({ year, month }, offset) => {
  const zeroBased = month - 1 + offset;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12;
  return { year: newYear, month: newMonth + 1 };
};

const toUtcDate = ({ year, month }) => new Date(Date.UTC(year, month - 1, 1));
const formatMonthShort = ({ year, month }) => `${MONTH_ABBR[month - 1]}-${String(year % 100).padStart(2, '0')}`;

const formatIssuedDate = (date) => {
  const day = date.getDate();
  const month = MONTH_ABBR[date.getMonth()];
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  return `Issued date: ${day} ${month}'${year}`;
};

// ---- style helpers -------------------------------------------------------

const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const tintFill = (tint) => ({ type: 'pattern', pattern: 'solid', fgColor: { theme: 0, tint } });
const fontBlack = (size) => ({ name: FONT_NAME, bold: true, size, color: { argb: 'FF000000' } });
const fontWhite = (size) => ({ name: FONT_NAME, bold: true, size, color: { argb: 'FFFFFFFF' } });
const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const ALL_BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const CENTER_MIDDLE = { horizontal: 'center', vertical: 'middle' };
const HEADER_ALIGN = (wrap) => ({ horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: !!wrap });

const MMM_YY = 'mmm-yy';
const MMM_YY_LOCALE = '[$-409]mmm-yy;@';

const COLUMN_WIDTHS = [
  7, 13.36, 8.27, 5.91, 7.09, 5.91, 17.18, 40.54, 9, 8, 10.82, 13, 5.73, 11.73, 5.73, 11.73, 10.27, 10.18, 7.18,
  13.54, 13.54, 13.54, 13.82, 14.82, 9.63, 9.82, 8.91, 10.18, 10.91, 10.81, 6.73, 6.73, 6.73, 6.73, 6.73,
  ...Array(32).fill(9.27),
];

// ---- static row-7 header labels (columns 1-19, 25-35) -------------------

const STATIC_HEADER_LABELS = {
  1: 'Error',
  2: 'Supplier Key',
  3: 'SUPL',
  4: 'PLANT',
  5: 'S.Dock',
  6: 'DOCK',
  7: 'PART #',
  8: 'Part Name',
  9: 'KBN',
  10: "Q'ty",
  11: 'P/C Add',
  12: 'Lineside Address',
  13: 'Conveyance Route',
  14: 'USE THIS Distribution Ratio',
  15: 'ROUTE',
  16: 'ROUTE CODE',
  17: 'Minomi',
  18: 'Set Part',
  19: 'Box Layer',
  22: 'Check LP Freq Status',
  24: 'Order Freq Status\n(Base Current)',
  31: 'PC Del',
  32: 'PC Safety',
  33: 'LS Del',
  34: 'LS Safety',
  35: 'Safety (PC+LS)',
};

// col: [fill, numFmt|null, wrap]
const ROW7_COLUMN_STYLE = {
  1: ['FFFF0000', null, false, 14],
  2: ['TINT15', null, false],
  3: ['TINT15', '@', false],
  4: ['TINT15', '@', false],
  5: ['TINT15', '@', false],
  6: ['TINT15', '@', false],
  7: ['TINT15', '@', false],
  8: ['TINT15', '@', false],
  9: ['FFFFC000', '@', false],
  10: ['FFFFFF00', '@', false],
  11: ['TINT15', '@', false],
  12: ['TINT15', '@', false],
  13: ['TINT15', '@', false],
  14: ['TINT15', '@', true],
  15: ['TINT15', '@', false],
  16: ['TINT15', '@', false],
  17: ['TINT15', '@', false],
  18: ['TINT15', '@', false],
  19: ['ACCENT2', '@', false],
  20: ['FFD1D1FF', null, true],
  21: ['FFB9AFFF', null, true],
  22: ['FFD1D1FF', null, true],
  23: ['FFFFFF00', null, true],
  24: ['FFFFFF8B', '@', true],
  25: ['TINT15', MMM_YY, false],
  26: ['TINT15', MMM_YY, false],
  27: ['TINT15', MMM_YY, false],
  28: ['FFFCBAE4', MMM_YY, false],
  29: ['FFFEE2F4', MMM_YY, false],
  30: ['FFFEE2F4', MMM_YY, false],
  31: ['FFA7CDFF', null, false],
  32: ['FFA7CDFF', null, false],
  33: ['FFA7CDFF', null, false],
  34: ['FFA7CDFF', null, false],
  35: ['FFCDE2FF', null, false],
};

const BOX_PCS_GROUP_HEADER_LABELS = ['PC Min ', 'PC Max ', 'LS Min ', 'LS Max '];
// group start columns and their row7 fill
const BOX_PCS_GROUPS = [
  { start: 36, fill: 'FFD1D1FF' }, // BOX N+1 (AJ-AM)
  { start: 40, fill: 'FFE1E1FF' }, // BOX N+2 (AN-AQ)
  { start: 44, fill: 'FFE1E1FF' }, // BOX N+3 (AR-AU)
  { start: 48, fill: 'FFE1E1FF' }, // BOX MAX (AV-AY)
  { start: 52, fill: 'FFFDC7EA' }, // PCS N+1 (AZ-BC)
  { start: 56, fill: 'FFFEE2F4' }, // PCS N+2 (BD-BG)
  { start: 60, fill: 'FFFEE2F4' }, // PCS N+3 (BH-BK)
  { start: 64, fill: 'FFFEE2F4' }, // PCS MAX (BL-BO)
];

const resolveFill = (token) => {
  if (token === 'TINT15') return tintFill(-0.15);
  if (token === 'ACCENT2') return solidFill('FFE97132');
  return solidFill(token);
};

// ---- merges ---------------------------------------------------------------

const MERGES = [
  'A1:BO1',
  'Y3:Z3', 'AA3:AB3', 'AD3:AE3', 'AF3:AG3',
  'AJ5:AY5', 'AZ5:BO5',
  'T6:V6', 'W6:X6', 'Y6:AA6', 'AB6:AD6', 'AE6:AI6',
  'AJ6:AM6', 'AN6:AQ6', 'AR6:AU6', 'AV6:AY6',
  'AZ6:BC6', 'BD6:BG6', 'BH6:BK6', 'BL6:BO6',
];

// ---- header row builders ---------------------------------------------------

const buildRow1 = (sheet) => {
  sheet.getRow(1).height = 40.5;
  const cell = sheet.getRow(1).getCell(1);
  cell.value = 'Min-Max 3 Month (PA)';
  for (let c = 1; c <= LAST_COLUMN; c += 1) {
    const target = sheet.getRow(1).getCell(c);
    target.fill = solidFill('FF000000');
    target.font = fontWhite(28);
    target.alignment = CENTER_MIDDLE;
  }
};

const buildRow3 = (sheet, { unitPerDay, tackTime, issuedAt }) => {
  sheet.getRow(3).height = 60;

  const label = (address, text) => {
    const cell = sheet.getCell(address);
    cell.value = text;
    cell.fill = solidFill('FF000000');
    cell.font = fontWhite(18);
    cell.alignment = CENTER_MIDDLE;
  };
  const value = (address, val) => {
    const cell = sheet.getCell(address);
    cell.value = val === null || val === undefined ? '' : val;
    cell.fill = solidFill('FFFFFFFF');
    cell.font = fontBlack(28);
    cell.alignment = CENTER_MIDDLE;
    cell.border = { left: THIN, top: THIN, bottom: THIN };
  };

  label('Y3', 'Unit / Day');
  sheet.getCell('Z3').value = 'Unit / Day';
  sheet.getCell('Z3').fill = solidFill('FF000000');
  sheet.getCell('Z3').font = fontWhite(18);
  sheet.getCell('Z3').alignment = CENTER_MIDDLE;
  value('AA3', unitPerDay ?? '');
  sheet.getCell('AB3').value = unitPerDay ?? '';
  sheet.getCell('AB3').fill = solidFill('FFFFFFFF');
  sheet.getCell('AB3').font = fontBlack(28);
  sheet.getCell('AB3').alignment = CENTER_MIDDLE;

  label('AD3', 'Takt Time');
  sheet.getCell('AE3').value = 'Takt Time';
  sheet.getCell('AE3').fill = solidFill('FF000000');
  sheet.getCell('AE3').font = fontWhite(18);
  sheet.getCell('AE3').alignment = CENTER_MIDDLE;
  value('AF3', tackTime ?? '');
  sheet.getCell('AG3').value = tackTime ?? '';
  sheet.getCell('AG3').fill = solidFill('FFFFFFFF');
  sheet.getCell('AG3').font = fontBlack(28);
  sheet.getCell('AG3').alignment = CENTER_MIDDLE;

  const issued = sheet.getCell('BL3');
  issued.value = formatIssuedDate(issuedAt);
  issued.fill = solidFill('FFFFFFFF');
  issued.font = fontBlack(22);
};

const buildRow5 = (sheet) => {
  sheet.getRow(5).height = 31;
  const box = sheet.getCell('AJ5');
  box.value = 'BOX';
  box.fill = solidFill('FFA375FF');
  box.font = fontBlack(16);
  box.alignment = CENTER_MIDDLE;
  for (let c = 36; c <= 51; c += 1) {
    const cell = sheet.getRow(5).getCell(c);
    cell.fill = solidFill('FFA375FF');
    cell.font = fontBlack(16);
    cell.alignment = CENTER_MIDDLE;
    cell.border = ALL_BORDERS;
  }

  const pcs = sheet.getCell('AZ5');
  pcs.value = 'PCS';
  pcs.fill = solidFill('FFF973C9');
  pcs.font = fontBlack(16);
  pcs.alignment = CENTER_MIDDLE;
  for (let c = 52; c <= 67; c += 1) {
    const cell = sheet.getRow(5).getCell(c);
    cell.fill = solidFill('FFF973C9');
    cell.font = fontBlack(16);
    cell.alignment = CENTER_MIDDLE;
    cell.border = ALL_BORDERS;
  }
};

const buildRow6 = (sheet, { n1Month, n2Month, n3Month }) => {
  sheet.getRow(6).height = 35;

  const fillRange = (colStart, colEnd, fill, { numFmt } = {}) => {
    for (let c = colStart; c <= colEnd; c += 1) {
      const cell = sheet.getRow(6).getCell(c);
      cell.fill = solidFill(fill);
      cell.font = fontBlack(14);
      cell.alignment = CENTER_MIDDLE;
      cell.border = ALL_BORDERS;
      if (numFmt) cell.numFmt = numFmt;
    }
  };

  fillRange(20, 22, 'FFA375FF'); // T6:V6 "LP Design Freq"
  sheet.getCell('T6').value = 'LP Design Freq';
  fillRange(23, 24, 'FFFFC000'); // W6:X6 "AL Design Freq N+1"
  sheet.getCell('W6').value = 'AL Design Freq N+1';

  for (let c = 25; c <= 27; c += 1) { // Y6:AA6 "NQC MONTH"
    const cell = sheet.getRow(6).getCell(c);
    cell.fill = tintFill(-0.25);
    cell.font = fontBlack(14);
    cell.alignment = CENTER_MIDDLE;
    cell.border = ALL_BORDERS;
  }
  sheet.getCell('Y6').value = 'NQC MONTH';

  fillRange(28, 30, 'FFF973C9'); // AB6:AD6 "NQC MAX / DAY"
  sheet.getCell('AB6').value = 'NQC MAX / DAY';
  fillRange(31, 35, 'FF2D87FF'); // AE6:AI6 "Internal Lead Time"
  sheet.getCell('AE6').value = 'Internal Lead Time';

  fillRange(36, 39, 'FFC2A3FF', { numFmt: MMM_YY_LOCALE }); // AJ6:AM6 (N+1 month, box)
  sheet.getCell('AJ6').value = toUtcDate(n1Month);
  fillRange(40, 43, 'FFE1E1FF', { numFmt: MMM_YY_LOCALE }); // AN6:AQ6 (N+2 month, box)
  sheet.getCell('AN6').value = toUtcDate(n2Month);
  fillRange(44, 47, 'FFE1E1FF', { numFmt: MMM_YY_LOCALE }); // AR6:AU6 (N+3 month, box)
  sheet.getCell('AR6').value = toUtcDate(n3Month);
  fillRange(48, 51, 'FFE1E1FF'); // AV6:AY6 "MAX"
  sheet.getCell('AV6').value = 'MAX';

  fillRange(52, 55, 'FFFB9FDA', { numFmt: MMM_YY_LOCALE }); // AZ6:BC6 (N+1 month, pcs)
  sheet.getCell('AZ6').value = toUtcDate(n1Month);
  fillRange(56, 59, 'FFFEE2F4', { numFmt: MMM_YY_LOCALE }); // BD6:BG6 (N+2 month, pcs)
  sheet.getCell('BD6').value = toUtcDate(n2Month);
  fillRange(60, 63, 'FFFEE2F4', { numFmt: MMM_YY_LOCALE }); // BH6:BK6 (N+3 month, pcs)
  sheet.getCell('BH6').value = toUtcDate(n3Month);
  fillRange(64, 67, 'FFFEE2F4'); // BL6:BO6 "MAX"
  sheet.getCell('BL6').value = 'MAX';
};

const buildRow7 = (sheet, { baseMonth, n1Month, n2Month, n3Month }) => {
  sheet.getRow(7).height = 134.5;

  for (let c = 1; c <= LAST_COLUMN; c += 1) {
    const cell = sheet.getRow(7).getCell(c);
    const style = ROW7_COLUMN_STYLE[c];
    const size = (style && style[3]) || 16;
    cell.font = fontBlack(size);
    cell.alignment = HEADER_ALIGN(style ? style[2] : true);
    cell.border = ALL_BORDERS;
    if (style) {
      cell.fill = resolveFill(style[0]);
      if (style[1]) cell.numFmt = style[1];
    }
    if (STATIC_HEADER_LABELS[c]) cell.value = STATIC_HEADER_LABELS[c];
  }

  BOX_PCS_GROUPS.forEach(({ start, fill }) => {
    for (let i = 0; i < 4; i += 1) {
      const cell = sheet.getRow(7).getCell(start + i);
      cell.value = BOX_PCS_GROUP_HEADER_LABELS[i];
      cell.fill = solidFill(fill);
    }
  });

  sheet.getCell('T7').value = `LP Design Freq = [ ${formatMonthShort(baseMonth)} ]`;
  sheet.getCell('U7').value = `LP Design Freq = [ ${formatMonthShort(n1Month)} ]`;
  sheet.getCell('W7').value = `AL Req ${sheet.getCell('U7').value}`;

  sheet.getCell('Y7').value = toUtcDate(n1Month);
  sheet.getCell('Z7').value = toUtcDate(n2Month);
  sheet.getCell('AA7').value = toUtcDate(n3Month);
  sheet.getCell('AB7').value = toUtcDate(n1Month);
  sheet.getCell('AC7').value = toUtcDate(n2Month);
  sheet.getCell('AD7').value = toUtcDate(n3Month);
};

// ---- data row builders ----------------------------------------------------

const blankIfNull = (value) => (value === null || value === undefined ? '' : value);

const STATIC_DATA_FIELDS = {
  2: (row) => blankIfNull(row.SupplierKey),
  3: (row) => blankIfNull(row.SUPL),
  4: (row) => blankIfNull(row.SupplierPlant),
  5: (row) => blankIfNull(row['S.DOCK']),
  6: (row) => blankIfNull(row.DOCK),
  7: (row) => blankIfNull(row['PART #']),
  8: (row) => blankIfNull(row['PART DESC']),
  9: (row) => blankIfNull(row.KBN),
  10: (row) => blankIfNull(row['QTY /CONT']),
  11: (row) => blankIfNull(row['P/C Add']),
  12: (row) => blankIfNull(row['Lineside Address']),
  13: (row) => blankIfNull(row['Conveyance Route(External)']),
  14: (row) => blankIfNull(row.UseThisDistributionRatio),
  15: (row) => blankIfNull(row.Route),
  16: (row) => blankIfNull(row.RouteCode),
  17: () => '',
  18: (row) => blankIfNull(row.SetPartDependUsed),
  19: (row) => blankIfNull(row.BoxLayer),
  20: (row) => blankIfNull(row.CurrentFreq),
  21: (row) => blankIfNull(row.OrderFreqForCalculation),
  25: () => '',
  26: () => '',
  27: () => '',
  28: (row) => blankIfNull(row.N1PerDay),
  29: (row) => blankIfNull(row.N2PerDay),
  30: (row) => blankIfNull(row.N3PerDay),
  31: (row) => blankIfNull(row.PcDel),
  32: (row) => blankIfNull(row.PCSafetyTime),
  33: (row) => blankIfNull(row.LsDel),
  34: (row) => blankIfNull(row.LSSafetyTime),
  35: (row) => blankIfNull(row.TotalSafetyTime),
};

const buildRowFormulas = (n) => ({
  22: `IF(T${n}=U${n},"Same",IF(T${n}<U${n},"Increase","Decrease"))`,
  23: `U${n}`,
  24: `IF(T${n}=W${n},"Same",IF(T${n}<W${n},"Increase","Decrease"))`,
});

const buildBoxPcsFormulas = (n) => ({
  // BOX N+1 (AJ-AM = 36-39), NQC/DAY = $AB
  36: `IF($AB${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AB${n}*$N${n}*(($AF${n}/920)+0.05%)/$J${n},0)))))`,
  37: `IF($AJ${n}=0,0,IF(OR($AJ${n}="-",$AJ${n}="NO Data",$AJ${n}="Err"),$AJ${n},$AJ${n}+ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)+$S${n}))`,
  38: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AB${n}=0,0,ROUNDUP($AB${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%)/$J${n},0))))`,
  39: `IF($AL${n}=0,0,IF(OR($AL${n}="-",$AL${n}="NO Data",$AL${n}="Err"),$AL${n},IF($P${n}=1,$AL${n}+ROUNDUP($AB${n}*$N${n}/24/$J${n},0),IF($P${n}=2,$AL${n}+ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)+$S${n},"-"))))`,

  // BOX N+2 (AN-AQ = 40-43), NQC/DAY = $AC
  40: `IF($AC${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AC${n}*$N${n}*(($AF${n}/920)+0.05%)/$J${n},0)))))`,
  41: `IF($AN${n}=0,0,IF(OR($AN${n}="-",$AN${n}="NO Data",$AN${n}="Err"),$AN${n},$AN${n}+ROUNDUP($AC${n}*$N${n}/$W${n}/$J${n},0)+$S${n}))`,
  42: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AC${n}=0,0,ROUNDUP($AC${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%)/$J${n},0))))`,
  43: `IF($AP${n}=0,0,IF(OR($AP${n}="-",$AP${n}="NO Data",$AP${n}="Err"),$AP${n},IF($P${n}=1,$AP${n}+ROUNDUP($AC${n}*$N${n}/24/$J${n},0),IF($P${n}=2,$AP${n}+ROUNDUP($AC${n}*$N${n}/$W${n}/$J${n},0)+$S${n},"-"))))`,

  // BOX N+3 (AR-AU = 44-47), NQC/DAY = $AD
  44: `IF($AD${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AD${n}*$N${n}*(($AF${n}/920)+0.05%)/$J${n},0)))))`,
  45: `IF($AR${n}=0,0,IF(OR($AR${n}="-",$AR${n}="NO Data",$AR${n}="Err"),$AR${n},$AR${n}+ROUNDUP($AD${n}*$N${n}/$W${n}/$J${n},0)+$S${n}))`,
  46: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AD${n}=0,0,ROUNDUP($AD${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%)/$J${n},0))))`,
  47: `IF($AT${n}=0,0,IF(OR($AT${n}="-",$AT${n}="NO Data",$AT${n}="Err"),$AT${n},IF($P${n}=1,$AT${n}+ROUNDUP($AD${n}*$N${n}/24/$J${n},0),IF($P${n}=2,$AT${n}+ROUNDUP($AD${n}*$N${n}/$W${n}/$J${n},0)+$S${n},"-"))))`,

  // BOX MAX (AV-AY = 48-51)
  48: `IF(OR($AJ${n}="Err",$AN${n}="Err",$AR${n}="Err"),"Err",IF(COUNT($AJ${n},$AN${n},$AR${n})=0,$AJ${n},MAX($AJ${n},$AN${n},$AR${n})))`,
  49: `IF(OR($AK${n}="Err",$AO${n}="Err",$AS${n}="Err"),"Err",IF(COUNT($AK${n},$AO${n},$AS${n})=0,$AK${n},MAX($AK${n},$AO${n},$AS${n})))`,
  50: `IF(OR($AL${n}="Err",$AP${n}="Err",$AT${n}="Err"),"Err",IF(COUNT($AL${n},$AP${n},$AT${n})=0,$AL${n},MAX($AL${n},$AP${n},$AT${n})))`,
  51: `IF(OR($AM${n}="Err",$AQ${n}="Err",$AU${n}="Err"),"Err",IF(COUNT($AM${n},$AQ${n},$AU${n})=0,$AM${n},MAX($AM${n},$AQ${n},$AU${n})))`,

  // PCS N+1 (AZ-BC = 52-55), NQC/DAY = $AB
  52: `IF($AB${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AB${n}*$N${n}*(($AF${n}/920)+0.05%),0)))))`,
  53: `IF($AZ${n}=0,0,IF(OR($AZ${n}="-",$AZ${n}="NO Data",$AZ${n}="Err"),$AZ${n},$AZ${n}+(ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n})))`,
  54: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AB${n}=0,0,ROUNDUP($AB${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%),0))))`,
  55: `IF($BB${n}=0,0,IF(OR($BB${n}="-",$BB${n}="NO Data",$BB${n}="Err"),$BB${n},IF($P${n}=1,$BB${n}+(ROUNDUP($AB${n}*$N${n}/24/$J${n},0)*$J${n}),IF($P${n}=2,$BB${n}+(ROUNDUP($AB${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n}),"-"))))`,

  // PCS N+2 (BD-BG = 56-59), NQC/DAY = $AC
  56: `IF($AC${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AC${n}*$N${n}*(($AF${n}/920)+0.05%),0)))))`,
  57: `IF($BD${n}=0,0,IF(OR($BD${n}="-",$BD${n}="NO Data",$BD${n}="Err"),$BD${n},$BD${n}+(ROUNDUP($AC${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n})))`,
  58: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AC${n}=0,0,ROUNDUP($AC${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%),0))))`,
  59: `IF($BF${n}=0,0,IF(OR($BF${n}="-",$BF${n}="NO Data",$BF${n}="Err"),$BF${n},IF($P${n}=1,$BF${n}+(ROUNDUP($AC${n}*$N${n}/24/$J${n},0)*$J${n}),IF($P${n}=2,$BF${n}+(ROUNDUP($AC${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n}),"-"))))`,

  // PCS N+3 (BH-BK = 60-63), NQC/DAY = $AD
  60: `IF($AD${n}=0,0,IF($A${n}="Err","Err",IF(AND($F${n}="SH",$P${n}=1),"NO Data",IF($P${n}=2,"-",ROUNDUP($AD${n}*$N${n}*(($AF${n}/920)+0.05%),0)))))`,
  61: `IF($BH${n}=0,0,IF(OR($BH${n}="-",$BH${n}="NO Data",$BH${n}="Err"),$BH${n},$BH${n}+(ROUNDUP($AD${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n})))`,
  62: `IF($P${n}=3,"-",IF($A${n}="Err","Err",IF($AD${n}=0,0,ROUNDUP($AD${n}*$N${n}*((IF(AND($F${n}<>"SH",$P${n}=1),$AH${n},$AI${n})/920)+0.05%),0))))`,
  63: `IF($BJ${n}=0,0,IF(OR($BJ${n}="-",$BJ${n}="NO Data",$BJ${n}="Err"),$BJ${n},IF($P${n}=1,$BJ${n}+(ROUNDUP($AD${n}*$N${n}/24/$J${n},0)*$J${n}),IF($P${n}=2,$BJ${n}+(ROUNDUP($AD${n}*$N${n}/$W${n}/$J${n},0)*$J${n})+($S${n}*$J${n}),"-"))))`,

  // PCS MAX (BL-BO = 64-67)
  64: `IF(OR($AZ${n}="Err",$BD${n}="Err",$BH${n}="Err"),"Err",IF(COUNT($AZ${n},$BD${n},$BH${n})=0,$AZ${n},MAX($AZ${n},$BD${n},$BH${n})))`,
  65: `IF(OR($BA${n}="Err",$BE${n}="Err",$BI${n}="Err"),"Err",IF(COUNT($BA${n},$BE${n},$BI${n})=0,$BA${n},MAX($BA${n},$BE${n},$BI${n})))`,
  66: `IF(OR($BB${n}="Err",$BF${n}="Err",$BJ${n}="Err"),"Err",IF(COUNT($BB${n},$BF${n},$BJ${n})=0,$BB${n},MAX($BB${n},$BF${n},$BJ${n})))`,
  67: `IF(OR($BC${n}="Err",$BG${n}="Err",$BK${n}="Err"),"Err",IF(COUNT($BC${n},$BG${n},$BK${n})=0,$BC${n},MAX($BC${n},$BG${n},$BK${n})))`,
});

const buildDataRow = (sheet, rowIndex, row) => {
  const excelRow = sheet.getRow(rowIndex);
  excelRow.height = 22;

  excelRow.getCell(1).value = row.FormulaStatus === 'ERROR' ? ERR_TEXT : '';

  Object.entries(STATIC_DATA_FIELDS).forEach(([col, resolver]) => {
    excelRow.getCell(Number(col)).value = resolver(row);
  });

  const formulas = { ...buildRowFormulas(rowIndex), ...buildBoxPcsFormulas(rowIndex) };
  Object.entries(formulas).forEach(([col, formula]) => {
    excelRow.getCell(Number(col)).value = { formula };
  });
};

// ---- public API -------------------------------------------------------------

export const buildMinMaxExcelWorkbook = ({ rows = [], targetMonth, unitPerDay, tackTime, issuedAt = new Date() }) => {
  const baseMonth = parseTargetMonth(targetMonth);
  const n1Month = addMonths(baseMonth, 1);
  const n2Month = addMonths(baseMonth, 2);
  const n3Month = addMonths(baseMonth, 3);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);

  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  buildRow1(sheet);
  sheet.getRow(2).height = 10;
  buildRow3(sheet, { unitPerDay, tackTime, issuedAt });
  sheet.getRow(4).height = 10;
  buildRow5(sheet);
  buildRow6(sheet, { n1Month, n2Month, n3Month });
  buildRow7(sheet, { baseMonth, n1Month, n2Month, n3Month });

  rows.forEach((row, index) => {
    buildDataRow(sheet, FIRST_DATA_ROW + index, row);
  });

  MERGES.forEach((range) => sheet.mergeCells(range));

  return workbook;
};

export const exportMinMaxToBuffer = async (params) => {
  const workbook = buildMinMaxExcelWorkbook(params);
  return workbook.xlsx.writeBuffer();
};

export default { buildMinMaxExcelWorkbook, exportMinMaxToBuffer };
