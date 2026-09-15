import { createAisrWorkspaceExperienceState } from '../../../packages/domain/src/aisr-workspace-experience.js';

const STORAGE_SLOT = 'aisr-atlas.experience.v0.3';
const PREVIOUS_STORAGE_SLOT = 'aisr-atlas.experience.v0.2';
const WORKSPACE_ID = 'atlas';
const REMOTE_PERSISTENCE = import.meta.env.VITE_ATLAS_PERSISTENCE === 'remote';
const API_BASE_URL = (import.meta.env.VITE_ATLAS_API_BASE_URL ?? '').replace(/\/$/, '');

const LEGACY_AISR_LAYOUT_FIXES = [
  {
    unitId: 'lifespace.client',
    from: { x: 300, y: 420, width: 250, height: 130 },
    to: { x: 30, y: 580, width: 250, height: 130 },
  },
  {
    unitId: 'aloha.contracts',
    from: { x: 30, y: 590, width: 220, height: 120 },
    to: { x: 30, y: 580, width: 220, height: 120 },
  },
  {
    unitId: 'aloha.capabilities',
    from: { x: 280, y: 590, width: 220, height: 120 },
    to: { x: 280, y: 580, width: 220, height: 120 },
  },
  {
    unitId: 'aloha.runtime-n8n',
    from: { x: 30, y: 750, width: 600, height: 130 },
    to: { x: 30, y: 720, width: 600, height: 205 },
  },
  {
    unitId: 'aloha.lifespace-tool',
    from: { x: 300, y: 85, width: 250, height: 92 },
    to: { x: 520, y: 80, width: 180, height: 104 },
  },
];

let remoteState = null;
let remoteVersion = null;
let remoteQueue = Promise.resolve();
let lastQueuedJson = null;
let persistenceFailureShown = false;

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function createDefaultState() {
  return createAisrWorkspaceExperienceState();
}

function normalizeLayout(layout) {
  if (!layout) return layout;
  const {
    kind: _legacyKind,
    owner: _legacyOwner,
    ...normalized
  } = layout;
  return normalized;
}

function matchesGeometry(entry, expected) {
  return entry
    && entry.x === expected.x
    && entry.y === expected.y
    && entry.width === expected.width
    && entry.height === expected.height;
}

function migrateLegacyAisrSeedLayout(layout) {
  const normalized = normalizeLayout(layout);
  if (!normalized?.nodes) return normalized;

  const byUnit = new Map(normalized.nodes.map((current) => [current.unit_id, current]));
  const matchesLegacySeed = LEGACY_AISR_LAYOUT_FIXES.every((fix) => (
    matchesGeometry(byUnit.get(fix.unitId), fix.from)
  ));
  if (!matchesLegacySeed) return normalized;

  const fixesByUnit = new Map(LEGACY_AISR_LAYOUT_FIXES.map((fix) => [fix.unitId, fix.to]));
  return {
    ...normalized,
    nodes: normalized.nodes.map((current) => {
      const replacement = fixesByUnit.get(current.unit_id);
      return replacement ? { ...current, ...replacement } : current;
    }),
  };
}

function normalizeExperienceState(state) {
  if (!state?.published || !state?.draft) return state;
  return {
    ...state,
    published: {
      ...state.published,
      layout: migrateLegacyAisrSeedLayout(state.published.layout),
    },
    draft: {
      ...state.draft,
      layout: migrateLegacyAisrSeedLayout(state.draft.layout),
    },
  };
}

function isLegacySelfDemo(state) {
  return state?.published?.model?.root_unit_id === 'atlas'
    && state?.workspace?.name === 'Atlas';
}

function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_SLOT)
      ?? window.localStorage.getItem(PREVIOUS_STORAGE_SLOT);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    if (!parsed?.published?.model || !parsed?.draft?.model || !parsed?.runtimeStates || !parsed?.workStates) {
      throw new Error('Invalid stored state');
    }
    if (isLegacySelfDemo(parsed)) return createDefaultState();
    return normalizeExperienceState(parsed);
  } catch {
    return createDefaultState();
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
  remoteState = normalizeExperienceState(payload.state);
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
    return createDefaultState();
  }

  const seed = createDefaultState();
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
      remoteState = normalizeExperienceState(payload.state);
      remoteVersion = payload.version;
      lastQueuedJson = JSON.stringify(payload.state);
      persistenceFailureShown = false;
    })
    .catch(reportPersistenceFailure);

  return seed;
}
