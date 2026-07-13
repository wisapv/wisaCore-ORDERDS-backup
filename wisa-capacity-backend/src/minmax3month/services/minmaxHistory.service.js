import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../../db/pool.js';
import { exportMinMaxToBuffer } from '../exporters/minmaxExcel.exporter.js';

const DATA_ROOT = fileURLToPath(new URL('../../../data/minmax-history/', import.meta.url));

const monthDir = (targetMonth) => path.join(DATA_ROOT, targetMonth);

export const getNextRevision = async (targetMonth) => {
  const { rows } = await pool.query(
    'SELECT MAX(revision) AS max_revision FROM calculation_runs WHERE target_month = $1',
    [targetMonth],
  );
  return (rows[0]?.max_revision ?? 0) + 1;
};

export const saveRun = async ({ targetMonth, config, result }) => {
  const revision = await getNextRevision(targetMonth);
  const dir = monthDir(targetMonth);
  await fs.mkdir(dir, { recursive: true });

  const jsonPath = path.join(dir, `${revision}.json`);
  const excelPath = path.join(dir, `${revision}.xlsx`);

  const jsonPayload = {
    rows: result.rows,
    summary: result.summary,
    warnings: result.warnings,
    alarms: result.alarms,
  };
  await fs.writeFile(jsonPath, JSON.stringify(jsonPayload));

  const excelBuffer = await exportMinMaxToBuffer({
    rows: result.rows,
    targetMonth,
    unitPerDay: config?.unitPerDay,
    tackTime: config?.tackTime,
  });
  await fs.writeFile(excelPath, excelBuffer);

  const { rows: inserted } = await pool.query(
    `INSERT INTO calculation_runs (target_month, revision, config_json, summary_json, json_path, excel_path)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [targetMonth, revision, JSON.stringify(config ?? {}), JSON.stringify(result.summary ?? {}), jsonPath, excelPath],
  );

  return { id: inserted[0].id, revision, createdAt: inserted[0].created_at };
};

export const listRuns = async () => {
  const { rows } = await pool.query(
    `SELECT id, target_month, revision, created_at, summary_json
     FROM calculation_runs
     ORDER BY target_month DESC, revision DESC`,
  );

  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.target_month)) grouped.set(row.target_month, { targetMonth: row.target_month, runs: [] });
    grouped.get(row.target_month).runs.push({
      id: row.id,
      revision: row.revision,
      createdAt: row.created_at,
      summary: row.summary_json,
    });
  });

  return [...grouped.values()];
};

export const getRunDetail = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, target_month, revision, created_at, json_path FROM calculation_runs WHERE id = $1',
    [id],
  );
  const row = rows[0];
  if (!row) return null;

  const raw = await fs.readFile(row.json_path, 'utf8');
  const { rows: dataRows, summary, warnings, alarms } = JSON.parse(raw);

  return {
    id: row.id,
    targetMonth: row.target_month,
    revision: row.revision,
    createdAt: row.created_at,
    rows: dataRows,
    summary,
    warnings,
    alarms,
  };
};

export const getRunExcelPath = async (id) => {
  const { rows } = await pool.query('SELECT excel_path FROM calculation_runs WHERE id = $1', [id]);
  return rows[0]?.excel_path ?? null;
};

export default { getNextRevision, saveRun, listRuns, getRunDetail, getRunExcelPath };
