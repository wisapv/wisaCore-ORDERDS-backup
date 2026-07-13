import { pool } from './pool.js';

export const initSchema = async () => {
  try {
    await pool.query(`
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
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_calculation_runs_target_month
        ON calculation_runs(target_month);
    `);
  } catch (error) {
    console.error('Failed to initialize the Min-Max history PostgreSQL schema.');
    console.error('Install PostgreSQL and set DATABASE_URL (see .env.example) before using history features.');
    console.error(error.message);
  }
};

export default initSchema;
