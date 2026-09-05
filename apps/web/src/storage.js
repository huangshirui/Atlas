import { createInitialExperienceState } from '@aisr-atlas/domain';

const STORAGE_SLOT = 'aisr-atlas.experience.v0.3';
const WORKSPACE_ID = 'atlas';
const REMOTE_PERSISTENCE = import.meta.env.VITE_ATLAS_PERSISTENCE === 'remote';
const API_BASE_URL = (import.meta.env.VITE_ATLAS_API_BASE_URL ?? '').replace(/\/$/, '');

export class PersistenceConflictError extends Error {
  constructor(message, currentVersion = null) {
    super(message);
    this.name = 'PersistenceConflictError';
    this.currentVersion = currentVersion;
  }
}

export function getPersistenceMode() {
  return REMOTE_PERSISTENCE ? 'remote' : 'local';
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_SLOT);
    if (!raw) return createInitialExperienceState();
    const parsed = JSON.parse(raw);
    if (!parsed?.published?.model || !parsed?.draft?.model || !parsed?.runtimeStates || !parsed?.workStates) {
      throw new Error('Invalid stored state');
    }
    return parsed;
  } catch {
    return createInitialExperienceState();
  }
}

async function responseJson(response) {
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  if (response.status === 409 && payload?.error?.code === 'version_conflict') {
    throw new PersistenceConflictError(
      payload.error.message,
      payload.error.details?.current_version ?? null,
    );
  }

  throw new Error(payload?.error?.message ?? `Atlas API request failed (${response.status}).`);
}

export async function loadExperienceState() {
  if (!REMOTE_PERSISTENCE) {
    return {
      state: loadLocalState(),
      version: null,
      mode: 'local',
    };
  }

  const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/state`), {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  const payload = await responseJson(response);
  return {
    state: payload.state,
    version: payload.version,
    mode: 'remote',
  };
}

export async function saveExperienceState(state, version) {
  if (!REMOTE_PERSISTENCE) {
    window.localStorage.setItem(STORAGE_SLOT, JSON.stringify(state));
    return { version: null, mode: 'local' };
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Online persistence version is missing. Reload Atlas before saving.');
  }

  const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/state`), {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ version, state }),
  });
  const payload = await responseJson(response);
  return {
    version: payload.version,
    mode: 'remote',
  };
}

export async function resetExperienceState() {
  if (!REMOTE_PERSISTENCE) {
    window.localStorage.removeItem(STORAGE_SLOT);
    return {
      state: createInitialExperienceState(),
      version: null,
      mode: 'local',
    };
  }

  const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/reset`), {
    method: 'POST',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  const payload = await responseJson(response);
  return {
    state: payload.state,
    version: payload.version,
    mode: 'remote',
  };
}
