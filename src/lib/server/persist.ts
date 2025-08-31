// Server-side persistence helpers for SQLite or PostgreSQL
// Driver selected via env PERSIST_DRIVER = 'postgres' | 'sqlite'

type JsonValue = any;

const DRIVER = (process.env.PERSIST_DRIVER || "").toLowerCase();

let initOnce: Promise<void> | null = null;

async function ensurePg() {
  const { Pool } = requireOptional("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL requerido para postgres");
  // reuse across hot reloads
  // @ts-ignore
  global.__pgPool = global.__pgPool || new Pool({ connectionString: url });
  // @ts-ignore
  const pool = global.__pgPool as import("pg").Pool;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS dashboard_state (
      key TEXT PRIMARY KEY,
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

function getPgPool() {
  // @ts-ignore
  return global.__pgPool as import("pg").Pool;
}

async function ensureSqlite() {
  const Database = requireOptional("better-sqlite3");
  const file = process.env.SQLITE_FILE || "./data.sqlite";
  // @ts-ignore
  global.__sqlite = global.__sqlite || new Database(file);
  // @ts-ignore
  const db = global.__sqlite as any;
  db.pragma("journal_mode = WAL");
  db.prepare(
    `CREATE TABLE IF NOT EXISTS dashboard_state (
      key TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
}

function getSqliteDb() {
  // @ts-ignore
  return global.__sqlite as any;
}

function requireOptional(mod: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(mod);
  } catch (e) {
    const driver = DRIVER || "";
    throw new Error(`Dependencia faltante '${mod}'. Instala el paquete para usar '${driver}'.`);
  }
}

async function ensureInited() {
  if (initOnce) return initOnce;
  initOnce = (async () => {
    if (DRIVER === "postgres") await ensurePg();
    else if (DRIVER === "sqlite") await ensureSqlite();
    else if (!DRIVER) {
      // no-op: remote persistence deshabilitado
      return;
    } else {
      throw new Error(`PERSIST_DRIVER desconocido: ${DRIVER}`);
    }
  })();
  return initOnce;
}

export async function getState(key: string): Promise<JsonValue | null> {
  await ensureInited();
  if (DRIVER === "postgres") {
    const pool = getPgPool();
    const { rows } = await pool.query("SELECT content FROM dashboard_state WHERE key = $1", [key]);
    if (!rows.length) return null;
    return rows[0].content;
  }
  if (DRIVER === "sqlite") {
    const db = getSqliteDb();
    const row = db.prepare("SELECT content FROM dashboard_state WHERE key = ?").get(key);
    if (!row) return null;
    try { return JSON.parse(row.content); } catch { return null; }
  }
  return null;
}

export async function putState(key: string, content: JsonValue): Promise<void> {
  await ensureInited();
  if (DRIVER === "postgres") {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO dashboard_state (key, content) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
      [key, JSON.stringify(content)]
    );
    return;
  }
  if (DRIVER === "sqlite") {
    const db = getSqliteDb();
    const json = JSON.stringify(content);
    db.prepare(
      `INSERT INTO dashboard_state (key, content, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
    ).run(key, json);
    return;
  }
}

export async function listKeys(): Promise<{ key: string; updated_at: string }[]> {
  await ensureInited();
  if (DRIVER === "postgres") {
    const pool = getPgPool();
    const { rows } = await pool.query(`SELECT key, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as updated_at FROM dashboard_state ORDER BY updated_at DESC`);
    return rows as any;
  }
  if (DRIVER === "sqlite") {
    const db = getSqliteDb();
    const rows = db.prepare("SELECT key, updated_at FROM dashboard_state ORDER BY updated_at DESC").all();
    return rows as any;
  }
  return [];
}

export async function deleteState(key: string): Promise<void> {
  await ensureInited();
  if (DRIVER === "postgres") {
    const pool = getPgPool();
    await pool.query("DELETE FROM dashboard_state WHERE key = $1", [key]);
    return;
  }
  if (DRIVER === "sqlite") {
    const db = getSqliteDb();
    db.prepare("DELETE FROM dashboard_state WHERE key = ?").run(key);
    return;
  }
}
