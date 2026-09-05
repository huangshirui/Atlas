import { createInitialExperienceState } from '@aisr-atlas/domain';

const STORAGE_SLOT = 'aisr-atlas.experience.v0.3';
const PREVIOUS_STORAGE_SLOT = 'aisr-atlas.experience.v0.2';
const WORKSPACE_ID = 'atlas';
const REMOTE_PERSISTENCE = import.meta.env.VITE_ATLAS_PERSISTENCE === 'remote';
const API_BASE_URL = (import.meta.env.VITE_ATLAS_API_BASE_URL ?? '').replace(/\/$/, '');

let remoteState = null;
let remoteVersion = null;
let remoteQueue = Promise.resolve();
let lastQueuedJson = null;
let persistenceFailureShown = false;

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_SLOT)
      ?? window.localStorage.getItem(PREVIOUS_STORAGE_SLOT);
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

  const error = new Error(payload?.error?.message ?? `Atlas API request failed (${response.status}).`);
  error.code = payload?.error?.code ?? 'api_error';
  error.currentVersion = payload?.error?.details?.current_version ?? null;
  throw error;
}

function reportPersistenceFailure(cause) {
  console.error('Atlas online persistence failed', cause);
  if (persistenceFailureShown) return;
  persistenceFailureShown = true;

  const conflict = cause?.code === 'version_conflict';
  const message = conflict
    ? 'Atlas changed in another browser session. Reload this page before continuing so newer online state is not overwritten.'
    : 'Atlas could not save to the online store. Reload after the connection is restored; the page will not silently switch to local storage.';

  window.alert(message);
  if (conflict) window.location.reload();
}

export function getPersistenceMode() {
  return REMOTE_PERSISTENCE ? 'remote' : 'local';
}

export async function initializePersistence() {
  document.documentElement.dataset.atlasPersistence = getPersistenceMode();
  if (!REMOTE_PERSISTENCE) return;

  const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/state`), {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  const payload = await responseJson(response);
  remoteState = payload.state;
  remoteVersion = payload.version;
  lastQueuedJson = JSON.stringify(payload.state);
}

export function loadExperienceState() {
  if (!REMOTE_PERSISTENCE) return loadLocalState();
  if (!remoteState) {
    throw new Error('Online Atlas state has not been initialized.');
  }
  return remoteState;
}

export function saveExperienceState(state) {
  if (!REMOTE_PERSISTENCE) {
    window.localStorage.setItem(STORAGE_SLOT, JSON.stringify(state));
    return;
  }

  const stateJson = JSON.stringify(state);
  if (stateJson === lastQueuedJson) return;
  lastQueuedJson = stateJson;

  remoteQueue = remoteQueue
    .then(async () => {
      if (!Number.isInteger(remoteVersion) || remoteVersion < 1) {
        throw new Error('Online persistence version is missing.');
      }

      const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/state`), {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          version: remoteVersion,
          state: JSON.parse(stateJson),
        }),
      });
      const payload = await responseJson(response);
      remoteVersion = payload.version;
      remoteState = JSON.parse(stateJson);
      persistenceFailureShown = false;
    })
    .catch(reportPersistenceFailure);
}

export function resetExperienceState() {
  if (!REMOTE_PERSISTENCE) {
    window.localStorage.removeItem(STORAGE_SLOT);
    window.localStorage.removeItem(PREVIOUS_STORAGE_SLOT);
    return createInitialExperienceState();
  }

  const seed = createInitialExperienceState();
  lastQueuedJson = JSON.stringify(seed);
  remoteState = seed;

  remoteQueue = remoteQueue
    .then(async () => {
      const response = await fetch(apiUrl(`/api/v1/workspaces/${WORKSPACE_ID}/reset`), {
        method: 'POST',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
      });
      const payload = await responseJson(response);
      remoteState = payload.state;
      remoteVersion = payload.version;
      lastQueuedJson = JSON.stringify(payload.state);
      persistenceFailureShown = false;
    })
    .catch(reportPersistenceFailure);

  return seed;
}
