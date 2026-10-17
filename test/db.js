import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveTomlPaths() {
  const configCandidates = [
    process.env.CONSUL_CONFIG_TOML_PATH,
    process.env.CONSUL_TOML_PATH,
    path.resolve(__dirname, '../../config/dev/consul/consul_config_local.toml'),
    path.resolve(__dirname, '../../config/dev/consul/consul_config.toml'),
  ].filter(Boolean);

  const secretCandidates = [
    process.env.CONSUL_SECRET_TOML_PATH,
    path.resolve(__dirname, '../../config/dev/consul/consul_secret.toml'),
  ].filter(Boolean);

  const pickFirstExisting = (candidates, fallback) => {
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        continue;
      }
    }
    return candidates[0] || fallback;
  };

  return {
    configPath: pickFirstExisting(configCandidates, path.resolve(__dirname, '../../config/dev/consul/consul_config.toml')),
    secretPath: pickFirstExisting(secretCandidates, path.resolve(__dirname, '../../config/dev/consul/consul_secret.toml')),
  };
}

const { configPath, secretPath } = resolveTomlPaths();
const configTomlContent = fs.readFileSync(configPath, 'utf-8');
const secretTomlContent = fs.readFileSync(secretPath, 'utf-8');

const readTomlKey = (content, key) => {
  const match = content.match(new RegExp(`${key}\\s*=\\s*"(.*)"`));
  if (match) return match[1];
  const matchInt = content.match(new RegExp(`${key}\\s*=\\s*(\\d+)`));
  if (matchInt) return parseInt(matchInt[1], 10);
  return null;
};

const getTomlValue = (key) => {
  const secretValue = readTomlKey(secretTomlContent, key);
  if (secretValue !== null) return secretValue;
  return readTomlKey(configTomlContent, key);
};

const config = {
  user: getTomlValue('DB_USER'),
  host: getTomlValue('DB_HOST'),
  database: getTomlValue('DB_NAME'),
  password: getTomlValue('DB_PASSWORD'),
  port: getTomlValue('DB_PORT'),
};

let pool = null;
let poolProcessHookInstalled = false;

function getPool() {
  if (!pool) {
    pool = new pg.Pool(config);
  }
  if (!poolProcessHookInstalled) {
    poolProcessHookInstalled = true;
    process.once('beforeExit', async () => {
      try {
        await pool?.end();
      } catch {
      } finally {
        pool = null;
      }
    });
  }
  return pool;
}

export async function getVerificationCode(email, status = null) {
  const res = await getPool().query(
    `SELECT code
     FROM app_verification_code
     WHERE email = $1
       AND ($2::text IS NULL OR status = $2)
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY expires_at DESC
     LIMIT 1`,
    [email, status]
  );
  return res.rows[0]?.code;
}

async function tableExists(tableName) {
  const res = await getPool().query('SELECT to_regclass($1) AS regclass', [`public.${tableName}`]);
  return !!res.rows[0]?.regclass;
}

async function columnExists(tableName, columnName) {
  const res = await getPool().query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return res.rowCount > 0;
}

export async function cleanupAccount(accountUsername) {
  try {
    const canUnlinkByAccountId =
      (await tableExists('model')) &&
      (await tableExists('user_account')) &&
      (await columnExists('model', 'account_id')) &&
      (await columnExists('user_account', 'account_id')) &&
      (await columnExists('user_account', 'account_username'));

    if (canUnlinkByAccountId) {
      await getPool().query(
        `WITH a AS (
           SELECT account_id FROM user_account WHERE account_username = $1
         )
         UPDATE model
         SET account_id = NULL
         FROM a
         WHERE model.account_id = a.account_id`,
        [accountUsername]
      );
    }

    if (await tableExists('user_account')) {
      await getPool().query('DELETE FROM user_account WHERE account_username = $1', [accountUsername]);
    }
  } catch (err) {
    console.error(`Error cleaning up account ${accountUsername}:`, err);
  }
}

export async function closePool() {
  try {
    await pool?.end();
  } finally {
    pool = null;
  }
}

export async function dbQuery(text, params = []) {
  return getPool().query(text, params);
}

export async function getContactByUserId(userId) {
  const res = await dbQuery(
    `SELECT user_id, username, email, conductor_public_key
     FROM contact
     WHERE user_id = $1::uuid
     LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function getUserAccountByUsername(accountUsername) {
  const res = await dbQuery(
    `SELECT account_id, account_username, account_token, is_local
     FROM user_account
     WHERE account_username = $1
     ORDER BY account_id DESC
     LIMIT 1`,
    [accountUsername]
  );
  return res.rows[0] || null;
}

export async function getModelByUserAndName(userId, name) {
  const res = await dbQuery(
    `SELECT model_id, user_id, prototype_id, name, settings, is_local, conductor_address
     FROM model
     WHERE user_id = $1::uuid AND name = $2
     ORDER BY model_id DESC
     LIMIT 1`,
    [userId, name]
  );
  return res.rows[0] || null;
}

export async function getModelByName(name) {
  const res = await dbQuery(
    `SELECT model_id::text AS model_id, user_id::text AS user_id, prototype_id, name
     FROM model
     WHERE name = $1
     ORDER BY model_id DESC
     LIMIT 1`,
    [name]
  );
  return res.rows[0] || null;
}

export async function getPrototypeByName(name) {
  const res = await dbQuery(
    `SELECT prototype_id, name, username
     FROM prototype
     WHERE name = $1
     ORDER BY prototype_id DESC
     LIMIT 1`,
    [name]
  );
  return res.rows[0] || null;
}

/**
 * Mirrors control/tool.CleanupUserViaDB: remove a test contact and related rows
 * (desired_state, error events, models, verification codes, then contact cascade).
 */
export async function cleanupUserViaDB(email) {
  email = String(email || '').trim();
  if (!email) {
    throw new Error('CleanupUserViaDB: empty email');
  }
  const lookup = await getPool().query(`SELECT user_id::text AS user_id FROM contact WHERE email = $1`, [email]);
  if (lookup.rowCount === 0) {
    await getPool().query(`DELETE FROM app_verification_code WHERE email = $1`, [email]);
    return;
  }
  await cleanupUserByUserID(lookup.rows[0].user_id, email);
}

/**
 * Mirrors control/tool.CleanupUserByUserID.
 */
export async function cleanupUserByUserID(userID, email = '') {
  userID = String(userID || '').trim();
  if (!userID) {
    throw new Error('CleanupUserByUserID: empty user_id');
  }
  if (!email) {
    const lookup = await getPool().query(`SELECT email FROM contact WHERE user_id = $1::uuid`, [userID]);
    if (lookup.rowCount === 0) {
      return;
    }
    email = lookup.rows[0].email || '';
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const modelsRes = await client.query(
      `SELECT m.model_id::text AS model_id
       FROM model m
       WHERE m.user_id = $1::uuid
          OR m.prototype_id IN (
            SELECT p.prototype_id
            FROM prototype p
            JOIN contact c ON c.username = p.username
            WHERE c.user_id = $1::uuid
          )`,
      [userID]
    );
    const modelIDs = modelsRes.rows.map((r) => r.model_id);

    const accountsRes = await client.query(
      `SELECT account_id::text AS account_id FROM user_account WHERE user_id = $1::uuid`,
      [userID]
    );
    const accountIDs = accountsRes.rows.map((r) => r.account_id);

    const chatsRes = await client.query(
      `SELECT REPLACE(c.account_id::text, '-', '') || ':' || c.chat_type || ':' || c.chat_id AS entity_id
       FROM chat c
       WHERE c.model_id IN (
         SELECT m.model_id
         FROM model m
         WHERE m.user_id = $1::uuid
            OR m.prototype_id IN (
              SELECT p.prototype_id
              FROM prototype p
              JOIN contact ct ON ct.username = p.username
              WHERE ct.user_id = $1::uuid
            )
       )
       OR c.account_id IN (
         SELECT account_id FROM user_account WHERE user_id = $1::uuid
       )`,
      [userID]
    );
    const chatEntityIDs = chatsRes.rows.map((r) => r.entity_id);

    const modelEntityIDs = [];
    for (const id of modelIDs) {
      modelEntityIDs.push(id, String(id).replace(/-/g, ''));
    }
    const accountEntityIDs = [];
    for (const id of accountIDs) {
      accountEntityIDs.push(id, String(id).replace(/-/g, ''));
    }

    await client.query(
      `DELETE FROM desired_state
       WHERE (entity_type = 'model' AND entity_id = ANY($1::text[]))
          OR (entity_type = 'account' AND entity_id = ANY($2::text[]))
          OR (entity_type = 'chat' AND entity_id = ANY($3::text[]))`,
      [modelEntityIDs, accountEntityIDs, chatEntityIDs]
    );

    await client.query(
      `DELETE FROM account_traffic_error_event
       WHERE acct_id IN (SELECT account_id FROM user_account WHERE user_id = $1::uuid)
          OR model_id IN (
            SELECT m.model_id
            FROM model m
            WHERE m.user_id = $1::uuid
               OR m.prototype_id IN (
                 SELECT p.prototype_id
                 FROM prototype p
                 JOIN contact c ON c.username = p.username
                 WHERE c.user_id = $1::uuid
               )
          )
          OR prototype_id IN (
            SELECT p.prototype_id
            FROM prototype p
            JOIN contact c ON c.username = p.username
            WHERE c.user_id = $1::uuid
          )`,
      [userID]
    );

    await client.query(
      `DELETE FROM station_error_event
       WHERE model_id IN (
         SELECT m.model_id
         FROM model m
         WHERE m.user_id = $1::uuid
            OR m.prototype_id IN (
              SELECT p.prototype_id
              FROM prototype p
              JOIN contact c ON c.username = p.username
              WHERE c.user_id = $1::uuid
            )
       )
          OR prototype_id IN (
            SELECT p.prototype_id
            FROM prototype p
            JOIN contact c ON c.username = p.username
            WHERE c.user_id = $1::uuid
          )`,
      [userID]
    );

    // Remove models before contact so prototype RESTRICT FKs cannot block cascade.
    await client.query(
      `DELETE FROM model
       WHERE user_id = $1::uuid
          OR prototype_id IN (
            SELECT p.prototype_id
            FROM prototype p
            JOIN contact c ON c.username = p.username
            WHERE c.user_id = $1::uuid
          )`,
      [userID]
    );

    if (email) {
      await client.query(`DELETE FROM app_verification_code WHERE email = $1`, [email]);
    }

    await client.query(`DELETE FROM contact WHERE user_id = $1::uuid`, [userID]);
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}
