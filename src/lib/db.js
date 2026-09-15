import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return pool;
}

/**
 * Execute a parameterised SQL query.
 * Returns null (instead of throwing) when no DATABASE_URL is configured,
 * so the server can fall back to the JSON-file store gracefully.
 *
 * @param {string} text   - SQL statement
 * @param {any[]}  params - Positional parameters ($1, $2, …)
 * @returns {Promise<import('pg').QueryResult | null>}
 */
export async function query(text, params = []) {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
}

/**
 * Ensure the required tables exist.  Safe to call on every startup.
 */
export async function initSchema() {
  const p = getPool();
  if (!p) {
    console.warn('DATABASE_URL not set — skipping schema initialisation, using JSON file store.');
    return;
  }

  await p.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id           TEXT        PRIMARY KEY,
      run_id       TEXT,
      full_name    TEXT,
      phone        TEXT,
      email        TEXT,
      sms_consent  BOOLEAN     DEFAULT FALSE,
      call_consent BOOLEAN     DEFAULT FALSE,
      zip_code     TEXT,
      state        TEXT,
      income_range TEXT,
      household_size INTEGER,
      situation    TEXT,
      plan_preference TEXT,
      urgency      TEXT,
      agent_name   TEXT,
      verified     BOOLEAN     DEFAULT FALSE,
      status       TEXT        DEFAULT 'draft',
      zoho_lead_id TEXT,
      utm_source   TEXT,
      utm_medium   TEXT,
      utm_campaign TEXT,
      utm_content  TEXT,
      utm_term     TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migration for existing tables
  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent_name TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS zoho_lead_id TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
  `);

  await p.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id         TEXT        PRIMARY KEY,
      content    TEXT        NOT NULL,
      source     TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('PostgreSQL schema ready.');
}
