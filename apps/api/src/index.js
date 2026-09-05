import {
  ONLINE_WORKSPACE_ID,
  createOnlineSeedState,
  validateExperienceState,
} from './state.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function apiError(status, code, message, details = undefined) {
  return json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  }, status);
}

function stateRoute(pathname) {
  const match = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/(state|reset)$/);
  if (!match) return null;
  return {
    workspaceId: decodeURIComponent(match[1]),
    action: match[2],
  };
}

async function readStoredState(db, workspaceId) {
  return db.prepare(
    `SELECT workspace_id, schema_version, version, state_json, updated_at
       FROM workspace_experience_state
      WHERE workspace_id = ?`,
  ).bind(workspaceId).first();
}

async function insertSeedIfMissing(db, workspaceId) {
  const seed = createOnlineSeedState(workspaceId);
  const errors = validateExperienceState(seed, workspaceId);
  if (errors.length) throw new Error(errors[0]);

  const now = new Date().toISOString();
  await db.prepare(
    `INSERT OR IGNORE INTO workspace_experience_state
      (workspace_id, schema_version, version, state_json, updated_at)
     VALUES (?, ?, 1, ?, ?)`,
  ).bind(
    workspaceId,
    seed.schemaVersion,
    JSON.stringify(seed),
    now,
  ).run();
}

async function getState(db, workspaceId) {
  let row = await readStoredState(db, workspaceId);
  if (!row) {
    await insertSeedIfMissing(db, workspaceId);
    row = await readStoredState(db, workspaceId);
  }
  if (!row) throw new Error(`Unable to initialize Workspace ${workspaceId}.`);

  let state;
  try {
    state = JSON.parse(row.state_json);
  } catch {
    throw new Error(`Stored state for Workspace ${workspaceId} is invalid JSON.`);
  }

  const errors = validateExperienceState(state, workspaceId);
  if (errors.length) {
    throw new Error(`Stored state failed validation: ${errors[0]}`);
  }

  return {
    workspace_id: row.workspace_id,
    version: row.version,
    updated_at: row.updated_at,
    state,
  };
}

async function putState(request, db, workspaceId) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  if (!Number.isInteger(payload?.version) || payload.version < 1) {
    return apiError(400, 'invalid_version', 'version must be a positive integer.');
  }

  const errors = validateExperienceState(payload.state, workspaceId);
  if (errors.length) {
    return apiError(422, 'invalid_state', 'Experience state failed validation.', errors);
  }

  const now = new Date().toISOString();
  const result = await db.prepare(
    `UPDATE workspace_experience_state
        SET schema_version = ?,
            state_json = ?,
            version = version + 1,
            updated_at = ?
      WHERE workspace_id = ?
        AND version = ?`,
  ).bind(
    payload.state.schemaVersion,
    JSON.stringify(payload.state),
    now,
    workspaceId,
    payload.version,
  ).run();

  if ((result.meta?.changes ?? 0) === 0) {
    const current = await getState(db, workspaceId);
    return apiError(
      409,
      'version_conflict',
      'Workspace state changed since this client loaded it. Reload before saving again.',
      { current_version: current.version },
    );
  }

  return json({
    workspace_id: workspaceId,
    version: payload.version + 1,
    updated_at: now,
  });
}

async function resetState(db, workspaceId) {
  const seed = createOnlineSeedState(workspaceId);
  const errors = validateExperienceState(seed, workspaceId);
  if (errors.length) throw new Error(errors[0]);

  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO workspace_experience_state
      (workspace_id, schema_version, version, state_json, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(workspace_id) DO UPDATE SET
       schema_version = excluded.schema_version,
       version = workspace_experience_state.version + 1,
       state_json = excluded.state_json,
       updated_at = excluded.updated_at`,
  ).bind(
    workspaceId,
    seed.schemaVersion,
    JSON.stringify(seed),
    now,
  ).run();

  return getState(db, workspaceId);
}

async function handleApi(request, env, url) {
  if (!env.DB) {
    return apiError(503, 'database_unavailable', 'Atlas D1 binding is not configured.');
  }

  if (url.pathname === '/api/v1/health' && request.method === 'GET') {
    return json({ ok: true, service: 'atlas-api', schema_version: '0.1' });
  }

  const route = stateRoute(url.pathname);
  if (!route) return apiError(404, 'not_found', 'API route not found.');
  if (route.workspaceId !== ONLINE_WORKSPACE_ID) {
    return apiError(404, 'workspace_not_found', `Workspace ${route.workspaceId} is not available in V0.3.`);
  }

  if (route.action === 'state' && request.method === 'GET') {
    return json(await getState(env.DB, route.workspaceId));
  }
  if (route.action === 'state' && request.method === 'PUT') {
    return putState(request, env.DB, route.workspaceId);
  }
  if (route.action === 'reset' && request.method === 'POST') {
    return json(await resetState(env.DB, route.workspaceId));
  }

  return apiError(405, 'method_not_allowed', 'Method not allowed.', undefined);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url);
      }
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Atlas Web assets are not configured.', { status: 503 });
    } catch (cause) {
      console.error('Atlas request failed', {
        pathname: url.pathname,
        method: request.method,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return apiError(500, 'internal_error', 'Atlas request failed.');
    }
  },
};
