import pg from 'pg';

const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/wisacore_minmax';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
});

export default pool;
