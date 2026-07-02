# Min-Max 3 Month VBA Logic Specification

## Purpose

This document is the source of truth for the Min-Max 3 Month module implementation. The web application must replicate the original VBA calculation flow as closely as possible. Do not simplify, redesign, or replace VBA-equivalent behavior unless a future task explicitly requests it.

The implementation goal is VBA parity, not merely a working web form. Every calculation step must be implemented with traceability, warnings/errors for missing data, and a small test case or preview proving parity for that stage.

## Global implementation rules

### Shared text parser duplicate headers

- Source text files may contain duplicate header names.
- The parser must preserve original `columns` exactly as read and also expose duplicate-safe `uniqueColumns`.
- Parsed row objects must use `uniqueColumns` so no duplicate header overwrites an earlier column.
- VBA parity requires column-position behavior for duplicated headers.
- Use helper access such as `getValueByHeader(row, columns, uniqueColumns, headerName, occurrence)` when a header can be duplicated.


- Treat each upload/calculate request as a fresh calculation run.
- Do not reuse stale intermediate data from a previous run.
- Do not silently assume missing data.
- If source data is missing or a lookup fails, return an alarm/error log entry.
- Do not fuzzy match missing lookup keys unless explicitly requested.
- Use Excel-like calculation behavior where VBA/Excel functions are referenced.
- Use Excel-like `ROUNDUP`, not JavaScript `Math.round`, for VBA-equivalent rounded values.
- Preserve original dock-specific, route-specific, and safety-specific behavior.
- Keep the existing Capacity Flowrack module unchanged.

## 1. Clear

Original VBA clears intermediate sheets before recalculation.

Web app equivalent:

- Every upload/calculate run must be handled as a fresh calculation run.
- Intermediate objects must be rebuilt from the current request files and body config.
- Do not reuse cached rows, summaries, previews, lookup maps, or prior result data unless explicitly designed as immutable source configuration.

## 2. AddressMaster processing

Source file:

- `AddressMaster.txt`

VBA-equivalent flow:

1. Import `AddressMaster.txt`.
2. Use target month from the user.
3. Convert target month to `yyyymm31` style month-end value.
   - Example: `May-26` -> `20260531`
   - Example: `2026-05` -> `20260531`
   - Example: `202605` -> `20260531`
4. Keep rows where both conditions are true:
   - `T/C FROM(UNL) <= targetMonthEnd`
   - `T/C TO (UNL) >= targetMonthEnd`
5. Validate DataCal before processing:
   - `TargetCal = Format(Target, "yyyymm")` from user target month.
   - `DataCal = Format(Update Date Time / column W first data row, "yyyymm")`.
   - If `TargetCal != DataCal`, stop processing and return a `DATA_MONTH_MISMATCH` error.
6. Filter target docks to `S1`, `S4`, and `SH`.
7. Create `AddrKey`:
   - `SUPL + first PLANT + DOCK + PART #`
   - Do not use the second `PLANT` column for `AddrKey`.
8. Sort behavior should be considered equivalent to VBA where needed.
9. `AddrNo` is based on count of rows with the same `AddrKey`.
10. Create a Distribution Ratio summary grouped by:
   - `AddrKey`
   - `PART #`
   - `DOCK`
11. `TotalRatio = sum(Distribution Ratio)` in the group.
12. `Use This Distribution Ratio` / `JudeRatio`:
    - `ROUNDUP(Distribution Ratio / TotalRatio, 2)`
13. Use Excel-like positive `ROUNDUP`, not `Math.round`.
14. This value is used later as the distribution ratio for Min-Max calculation.
15. Preserve relevant fields:
    - `SUPL`
    - `PLANT`
    - `COMP`
    - `DOCK`
    - `PART #`
    - `KBN`
    - `Kanban Print Address`
    - `Lineside Address`
    - `Conveyance Route(External)`
    - `Depth`
    - `Distribution Ratio`
    - `TotalRatio`
    - `UseThisDistributionRatio`
    - `Conveyance Route(Internal)`

Warnings/errors:

- If `Distribution Ratio` is blank, keep the row, set calculated ratio to `null`, and add a warning/error log entry.
- If `TotalRatio` is `0`, keep the row, set calculated ratio to `null`, and add a warning/error log entry.
- If required columns are missing, do not silently guess column names; return warnings/errors.

Parity proof required:

- Include a small sample where two rows share the same `AddrKey` with ratios `1` and `2`.
- Confirm `TotalRatio = 3`.
- Confirm `UseThisDistributionRatio = 0.34` and `0.67`.
- Confirm expired rows are removed.
- Confirm non-target dock rows are removed.

## 3. PartMaster processing

Source file:

- `PartMaster.txt`

VBA-equivalent flow:

1. Import `PartMaster.txt`.
2. Preserve duplicate `PLANT` columns by column position.
   - First `PLANT` = `SupplierPlant`.
   - Second `PLANT` = `CompanyPlant`.
3. Validate DataCal before processing:
   - `DataCal = Format(Update Date Time / column AG / column 33 first data row, "yyyymm")`.
   - If target month does not match `DataCal`, stop processing and return a `DATA_MONTH_MISMATCH` error.
4. Apply effective date filtering like VBA using `T/C FROM(UNL)` and `T/C TO (UNL)`.
5. Filter target docks to `S1`, `S4`, and `SH`.
6. Create `PartMasterKey = DOCK + PART #` with hyphen removed from part number.
7. Create `SupplierKey = SUPL + first PLANT + S.DOCK + DOCK`.
8. Process endpoint must be strict like VBA.
9. Lookup part information by part number/key.
10. Preserve fields required by calculation, including:
   - Part name / part description
   - `KBN`
   - `QTY /CONT`
   - PC safety
   - LS safety
   - Packaging type
   - Other VBA-required fields used downstream
11. If Part No is not found, do not fuzzy match.
12. Add an alarm/error log entry for missing PartMaster lookups.

Warnings/errors:

- Missing part records must be returned in the alarm/error log.
- Missing required columns must be reported.
- Do not silently substitute default part data.

## 4. NQC processing

Source file:

- `NQC.xlsx`

VBA-equivalent flow:

1. Import `NQC.xlsx`.
2. Process endpoint must require sheet named exactly `NQC Result transfer`. Preview may be flexible, but process endpoints must be VBA-strict.
3. Validate DataCal before processing:
   - `TargetMonth = Format(Range("C2"), "yyyymm")` from user target month.
   - `DataCal = Range("K2")` from `NQC Result transfer`.
   - If `TargetMonth != DataCal`, stop processing and return a `DATA_MONTH_MISMATCH` error.
4. Create key equivalent to VBA:
   - `Dock + PartNo`
   - Remove hyphens if applicable, matching VBA behavior.
5. Pivot/summarize demand for:
   - `N`
   - `N+1`
   - `N+2`
   - `N+3`
6. Calculate daily demand using working days entered by the user:
   - `N+1/day = ROUNDUP(N+1 / workingDayN1, 0)`
   - `N+2/day = ROUNDUP(N+2 / workingDayN2, 0)`
   - `N+3/day = ROUNDUP(N+3 / workingDayN3, 0)`
7. Use max/target daily demand the same way as VBA.

Warnings/errors:

- Missing NQC lookup keys must be logged.
- Missing working day configuration must fail validation.
- Invalid or blank demand values must be reported rather than guessed.

## 5. Freq_LP processing

Source file:

- `Freq_LP.xlsx`

VBA-equivalent flow:

1. Import `Freq_LP.xlsx`.
2. Process endpoint behavior must be strict: only use relevant `S1`/`S4` sheets such as `1-3(S1)` and `1-3(S4)`.
3. If no relevant `S1`/`S4` sheet is found, stop with a clear error; do not silently use unrelated sheets.
4. Header rows may not be row 1, so detect them using explicit Freq_LP column candidates only.
5. Build frequency lookup key equivalent to VBA:
   - `FreqLpKey = SuppCd + SuppPlantCd + SuppDockCd + RcvCompDockCd`
6. Preserve both current and requested/new frequencies:
   - `CurrentFreq`
   - `NewFreq` / `RequestFreq` when available
7. First-stage `OrderFreqForCalculation` is staged as:
   - use numeric `NewFreq` / `RequestFreq` when it is greater than `0`
   - otherwise use numeric `CurrentFreq` when it is greater than `0`
   - otherwise set `null` and add a warning
8. `SH` order frequency must be fixed as `8` later in final calculation; do not derive `SH` final frequency from Freq_LP in this stage.
9. Do not use scenario frequency for now.

Warnings/errors:

- Missing frequency lookup keys must be logged.
- Missing frequency sheets must be reported.
- Missing, blank, or invalid frequencies must be warned/errors instead of silently guessed.
- Preview upload may remain flexible, but process endpoints must be VBA-strict.

## 6. SetPart processing

Source file:

- `SetPart.txt`

VBA-equivalent flow:

1. Import `SetPart.txt`.
2. SetPart has duplicate `PLANT` columns, so duplicate-safe parser behavior and VBA-like column-position access are required.
3. Use current date, not target month, for effective filtering:
   - `OD = Format(Now, "yyyymmdd")`
   - keep rows where `T/C FROM(UNL) <= OD` and `T/C TO (UNL) >= OD`
4. For testability, process endpoint may accept `asOfDate`, but production default must be current date.
5. Each active SetPart row creates two output rows:
   - `SetKey = DOCK + Key Part`, `PType = "1-Key"`
   - `SetKey = DOCK + Depend`, `PType = "2-Set"`
6. Preserve first `PLANT` as supplier plant and second `PLANT` as company plant.

Warnings/errors:

- Missing SetPart lookup data must be logged.
- Missing or invalid effective dates must be warned/errors instead of silently guessed.

## 7. Order Summary / Box Layer processing

Source file:

- `Order Sumary.txt`

VBA-equivalent flow:

1. Import `Order Sumary.txt`.
2. Order Summary has duplicate `PLANT` columns, so duplicate-safe parser behavior and VBA-like column-position access are required.
3. Create `BoxKey` equivalent to VBA:
   - `BoxKey = SUPL + first PLANT + S.DOCK + DOCK + PART # + KBN Print Address`
   - remove all spaces from the concatenated key.
4. Do not use the second `PLANT` column in `BoxKey`; preserve it only as company plant output data.
5. Use box layer from Order Summary, not fixed `1`.
6. BoxLayer value is the max numeric value of `A BoxLayer ADJ(Box)` grouped by `BoxKey`, matching the VBA pivot behavior.
7. Preserve the following fields according to VBA-equivalent logic:
   - `A BoxLayer ADJ(Box)`
   - `BC BoxLayer ADJ(Box)`
   - `BoxLayer FLG`
8. Do not apply target month or target dock filtering unless confirmed by VBA.
9. Do not replace missing or unclear box layer logic with assumptions.

Warnings/errors:

- Missing box layer data must be logged.
- Blank or invalid `A BoxLayer ADJ(Box)` should be warned and handled only in a VBA-equivalent way.
- Missing required fields must be reported.

## 8. Main Cal processing

VBA-equivalent flow:

1. Every combine/calculation request must be treated like VBA `Clear` plus fresh recalculation; do not reuse stale frontend state or cached intermediate data.
2. Combine processed data from:
   - AddressMaster
   - PartMaster
   - NQC
   - Freq_LP
   - SetPart
   - Order Summary
3. The first combine stage is `Cal Base / Combine`; final Min-Max formulas are not implemented in that stage.
4. Cal Base starts from processed AddressMaster rows.
5. AddressMaster rows must exist in processed NQC using:
   - `PartNoClean = PART #` with hyphens removed
   - `NQCKey = DOCK + PartNoClean`
   - rows missing NQC are excluded and logged as `NQC_NOT_FOUND`.
6. Missing PartMaster, Freq_LP, or BoxLayer lookups must create alarms/warnings rather than silent assumptions.
7. PartMaster lookup key is:
   - `PartMasterKey = DOCK + PartNoClean`
8. Freq_LP lookup key is created after PartMaster lookup:
   - `FreqLpKey = SUPL + SupplierPlant + S.DOCK + DOCK`
9. `SH` order frequency is fixed as `8` in the staged Cal Base output and must be traced with `OrderFreqSource = "SH_FIXED_8"`.
10. BoxLayer lookup key uses:
    - `BoxKey = SUPL + SupplierPlant + S.DOCK + DOCK + PART # + Kanban Print Address`
    - remove all spaces from the concatenated key.
11. Output should follow the old `Cal_Min-Max_N+3` layout as much as possible for comparison.
12. Include an error/alarm log for missing lookup data.
13. Every output row should include trace fields showing which source data was used.

Warnings/errors:

- Missing lookup data must not be hidden.
- Every missing lookup should be traceable to the source key and source file.
- Final PC/LS Min-Max formulas must remain deferred until explicitly implemented.

## 9. Route Code logic

Route Code is derived from `P/C Add`:

- `PC` -> route `1`
- `S/Direct` -> route `2`
- `D/Sequence` -> route `3`

Do not redesign this mapping.

## 10. Safety logic

VBA-equivalent safety rules:

- `PC Safety = Sup. Cap + Prod All. + Seq. Fluctuation`, according to original VBA fields.
- `Safety PC+LS = PC Safety + LS Safety`.
- Preserve original dock-specific and route-specific safety formula behavior.

Warnings/errors:

- If safety source fields are missing, return an alarm/error log entry.
- Do not silently use `0` unless VBA explicitly treats blank as `0`.

## 11. Min-Max calculation logic

VBA-equivalent PC calculations:

- `PC Min` uses:
  - NQC/day
  - `UseThisDistributionRatio`
  - Safety time
  - `QTY /CONT`
  - Original VBA conditions
- `PC Max`:
  - `PC Min + ROUNDUP(NQC/day * ratio / orderFreq / QTY, 0) + BoxLayer`

VBA-equivalent LS calculations:

- `LS Min` must follow dock/route-specific VBA logic.
- `SH` + route `1`/`2` uses Safety PC+LS style logic.
- Non-`SH` route `1` uses LS Safety.
- Route `2` uses total safety.
- Route `3` may return `-`.
- `LS Max` route `1`:
  - `LS Min + ROUNDUP(NQC/day * ratio / 24 / QTY, 0)`
- `LS Max` for other routes:
  - `LS Min + ROUNDUP(NQC/day * ratio / orderFreq / QTY, 0) + BoxLayer`

Frequency rules:

- Do not use scenario frequency for now.
- Use frequency from LP.
- `SH` fixed frequency = `8`.

Warnings/errors:

- Missing NQC/day, ratio, frequency, quantity, or box layer values must produce alarm/error log entries.
- Do not silently calculate with guessed values.

## 12. Export

VBA-equivalent export expectations:

1. Result should initially look like the original VBA result layout.
2. Include `Error_Log` / Alarm sheet or equivalent response.
3. Every output row should include trace fields showing which source data was used.
4. Export format should support side-by-side comparison with the old VBA output.

## Accuracy requirement

- The goal is not only to make a working web app.
- The goal is VBA parity.
- Every implementation step must include a small test case or preview that proves it matches the VBA logic for that stage.
- Do not silently assume missing data.
- If data is missing, return an alarm/error log.
- Do not modify the existing Capacity Flowrack module.

## 13. Min-Max Formula stage

VBA-equivalent flow:

1. `calculate-minmax` must treat each request as a fresh run and must internally reuse the Cal Base / Combine stage.
2. If Cal Base fails with a strict process error, stop and return that structured error.
3. Formula calculations start from Cal Base rows and must calculate `N+1`, `N+2`, and `N+3` separately.
4. `MaxNqcPerDay` is trace only in this stage unless later VBA review proves otherwise.
5. Route code is derived only from `P/C Add` or an explicitly equivalent source field using the original VBA pattern:
   - source value equal to `Error` -> route `Err` / route code `Err`
   - second character `-` -> route `PC` / route code `1`
   - first character `S` -> route `S` / route code `2`
   - otherwise -> route `D` / route code `3`
6. If RouteCode cannot be resolved because `P/C Add` is blank or unavailable, set `RouteCode = null`, add `ROUTE_CODE_UNRESOLVED`, and do not guess from unrelated fields.
7. Safety trace values are:
   - `PCSafetyTime = PC SAFETY`
   - `LSSafetyTime = LS SAFTY`
   - `TotalSafetyTime = PCSafetyTime + LSSafetyTime`
8. Missing or invalid numeric values must create alarms instead of guesses:
   - `INVALID_PC_SAFETY`
   - `INVALID_LS_SAFETY`
   - `INVALID_QTY_PER_CONT`
   - `INVALID_ORDER_FREQ`
   - `INVALID_DISTRIBUTION_RATIO`
   - `BOX_LAYER_REQUIRED_FOR_MAX`
9. `BoxLayer = null` must not silently become `0`; max formulas requiring BoxLayer must return `null`.
10. `SH` frequency uses the staged Cal Base fixed `8` value for formulas.

PC formulas:

- `PC Min Box = ROUNDUP(nqcPerDay * ratio * ((PCSafetyTime / 920) + 0.0005) / qtyPerCont, 0)`
- `PC Max Box = PC Min Box + ROUNDUP(nqcPerDay * ratio / orderFreq / qtyPerCont, 0) + boxLayer`
- `PC Min Pcs = PC Min Box * qtyPerCont`
- `PC Max Pcs = PC Max Box * qtyPerCont`

LS formulas:

- Route `3` returns `"-"` for LS min/max box and pieces.
- `SH` route `1`/`2` uses total safety for LS Min.
- Non-`SH` route `1` uses LS safety for LS Min.
- Route `2` uses total safety for LS Min.
- Route `1` LS Max uses fixed `24` and does not add BoxLayer.
- Route not `1` and not `3` LS Max uses `orderFreq` and adds BoxLayer.

Formula status:

- `OK` if required values exist and formulas complete.
- `WARNING` if lookup warnings exist but formulas complete.
- `ERROR` if formulas cannot calculate because required values are missing or invalid.

## 14. RouteCode audit and safety patch requirements

Before Excel export, the web app must provide a RouteCode audit endpoint that reuses a fresh Cal Base run and reports candidate source fields for VBA route derivation. Export must not be implemented until RouteCode audit has been checked with real files.

Original VBA route formula:

- `ROUTE = IF(P/C Add="Error","Err", IF(MID(P/C Add,2,1)="-","PC", IF(LEFT(P/C Add,1)="S","S","D")))`
- `ROUTE CODE = IF(ROUTE="Err","Err", IF(ROUTE="PC",1, IF(ROUTE="S",2,3)))`

Route is derived from the P/C Add pattern, not exact words such as `S/Direct` or `D/Sequence`.

Named formula constants:

- `WORKING_MINS_PER_DAY = 920`
- `SAFETY_RATIO_BUFFER = 0.0005`
- `ROUTE1_LS_MAX_FIXED_FREQ = 24`
- `SH_FIXED_ORDER_FREQ = 8`
- `DISPLAY_DASH = "-"`
- `DISPLAY_NO_DATA = "NO Data"`
- `DISPLAY_ERROR = "Err"`

Formula output fields may be mixed values:

- `number | "-" | "NO Data" | "Err" | null`

Frontend result tables must safely render mixed values, arrays, and objects. RouteCode `3` means Direct Sequence, and LS Min/Max must be `"-"` for that route.

## 15. Merge conflict resolution guardrail

When resolving merge conflicts for this module, keep the latest Min-Max 3 Month VBA-parity implementation for Min-Max files, including RouteCode audit, the P/C Add route pattern, named formula constants, mixed output values, and the refactored frontend structure. Existing Capacity Flowrack behavior must be preserved unchanged.
