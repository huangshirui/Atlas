import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  CORE_RELATIONSHIP_TYPES,
  CORE_UNIT_TYPES,
  addLayoutNode,
  addRelationship,
  addUnit,
  definitionFacetsForUnit,
  diffModels,
  fitAncestorsToLayout,
  layoutEntry,
  publishExperienceState,
  removeRelationship,
  runtimeStateForUnit,
  suggestRelationshipId,
  syncDraftLayoutFromPublished,
  toggleLayoutCollapsed,
  updateLayoutNode,
  updateRelationship,
  updateUnit,
  validateModel,
  validateStateReferences,
  workStateForUnit,
} from '@aisr-atlas/domain';
import { UnitNode } from './UnitNode.jsx';
import { loadExperienceState, resetExperienceState, saveExperienceState } from './storage.js';

const nodeTypes = { unit: UnitNode };
const WORKSPACE_OPTIONS = [{ id: 'atlas', name: 'AISR Ecosystem' }];
const IN_PROGRESS_WORK_STATUSES = new Set(['active', 'reviewing', 'blocked']);
const clone = (value) => JSON.parse(JSON.stringify(value));

function replaceActiveLayout(state, mode, layout) {
  return mode === 'draft'
    ? { ...state, draft: { ...state.draft, layout } }
    : { ...state, published: { ...state.published, layout } };
}

function depthFor(unit, model) {
  let depth = 0;
  let cursor = unit;
  const visited = new Set();
  while (cursor?.parent_id) {
    if (visited.has(cursor.id)) return 999;
    visited.add(cursor.id);
    cursor = model.units.find((candidate) => candidate.id === cursor.parent_id);
    depth += 1;
  }
  return depth;
}

function hiddenByCollapsedAncestor(unit, model, layout) {
  let parentId = unit.parent_id;
  const visited = new Set();
  while (parentId) {
    if (visited.has(parentId)) return false;
    visited.add(parentId);
    if (layoutEntry(layout, parentId)?.collapsed) return true;
    parentId = model.units.find((candidate) => candidate.id === parentId)?.parent_id ?? null;
  }
  return false;
}

function minimumSize(unitId, model, layout) {
  const children = model.units.filter((current) => current.parent_id === unitId);
  if (!children.length) return { minWidth: 180, minHeight: 84 };
  let minWidth = 280;
  let minHeight = 180;
  for (const child of children) {
    const entry = layoutEntry(layout, child.id);
    if (!entry) continue;
    minWidth = Math.max(minWidth, entry.x + entry.width + 28);
    minHeight = Math.max(minHeight, entry.y + entry.height + 28);
  }
  return { minWidth, minHeight };
}

function toFlowNodes(model, layout, semanticReadOnly, changedTargets, highlightDraftChanges, workStates, layoutUnlocked, handlers) {
  const childCounts = new Map();
  for (const current of model.units) {
    if (current.parent_id) childCounts.set(current.parent_id, (childCounts.get(current.parent_id) ?? 0) + 1);
  }

  const workByUnit = new Map((workStates ?? []).map((current) => [current.unit_id, current]));
  const activeDescendantCounts = new Map();
  for (const currentWork of workStates ?? []) {
    if (!IN_PROGRESS_WORK_STATUSES.has(currentWork.status)) continue;
    let cursor = model.units.find((candidate) => candidate.id === currentWork.unit_id);
    const visited = new Set();
    while (cursor?.parent_id) {
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      activeDescendantCounts.set(
        cursor.parent_id,
        (activeDescendantCounts.get(cursor.parent_id) ?? 0) + 1,
      );
      cursor = model.units.find((candidate) => candidate.id === cursor.parent_id);
    }
  }

  return [...model.units]
    .filter((current) => !hiddenByCollapsedAncestor(current, model, layout))
    .sort((a, b) => depthFor(a, model) - depthFor(b, model))
    .map((current) => {
      const saved = layoutEntry(layout, current.id) ?? { x: 40, y: 80, width: 220, height: 104, collapsed: false };
      const isRoot = current.parent_id === null;
      const collapsed = Boolean(saved.collapsed);
      const mins = minimumSize(current.id, model, layout);
      const directWork = workByUnit.get(current.id) ?? null;
      return {
        id: current.id,
        type: 'unit',
        position: { x: saved.x, y: saved.y },
        parentId: current.parent_id ?? undefined,
        extent: current.parent_id ? 'parent' : undefined,
        draggable: layoutUnlocked && !isRoot,
        selectable: true,
        data: {
          unit: current,
          semanticReadOnly,
          layoutUnlocked,
          changed: highlightDraftChanges && changedTargets.has(current.id),
          hasChildren: (childCounts.get(current.id) ?? 0) > 0,
          childCount: childCounts.get(current.id) ?? 0,
          collapsed,
          workStatus: directWork?.status ?? null,
          activeDescendantCount: activeDescendantCounts.get(current.id) ?? 0,
          ...mins,
          onResizeEnd: handlers.onResizeEnd,
          onToggleCollapsed: handlers.onToggleCollapsed,
        },
        style: {
          width: saved.width,
          height: collapsed ? 72 : saved.height,
          zIndex: isRoot ? -10 : depthFor(current, model),
        },
      };
    });
}

function toFlowEdges(model, visibleNodeIds, changedTargets, highlightDraftChanges) {
  return model.relationships
    .filter((current) => visibleNodeIds.has(current.from_unit_id) && visibleNodeIds.has(current.to_unit_id))
    .map((current) => ({
      id: current.id,
      source: current.from_unit_id,
      target: current.to_unit_id,
      type: 'smoothstep',
      label: current.type,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      className: highlightDraftChanges && changedTargets.has(current.id)
        ? 'relationship-edge is-changed'
        : 'relationship-edge',
      labelStyle: { fontSize: 11, fontWeight: 700 },
      interactionWidth: 24,
    }));
}

function displayValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function KeyValueData({ data }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return <div className="state-empty">No data.</div>;
  return (
    <div className="kv-list">
      {entries.map(([key, value]) => (
        <div className="kv-row" key={key}>
          <span>{key}</span>
          <pre>{displayValue(value)}</pre>
        </div>
      ))}
    </div>
  );
}

function FacetList({ facets }) {
  if (!facets?.length) return <div className="state-empty">No facets.</div>;
  return (
    <div className="facet-list">
      {facets.map((current) => (
        <section className="facet-card" key={current.id}>
          <div className="facet-card__heading">
            <strong>{current.type}</strong>
            <span>{current.state_class}</span>
          </div>
          <KeyValueData data={current.data} />
        </section>
      ))}
    </div>
  );
}

function UnitInspector({ unit, model, semanticReadOnly, runtimeState, workState, onSave, onAdd, onClose, error }) {
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('definition');
  const [addOpen, setAddOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ id: 'aisr.new-unit', name: 'New Unit', type: 'component', parent_id: model.root_unit_id });

  useEffect(() => {
    setForm(unit ? {
      name: unit.name,
      type: unit.type,
      parent_id: unit.parent_id,
      description: unit.description ?? '',
    } : null);
    setTab('definition');
    setAddOpen(false);
    if (unit) setNewUnit((current) => ({ ...current, parent_id: unit.id }));
  }, [unit?.id, unit?.name, unit?.type, unit?.parent_id, unit?.description]);

  if (!unit || !form) return null;
  const isRoot = unit.parent_id === null;
  const definitionFacets = definitionFacetsForUnit(model, unit.id);

  return (
    <aside className="inspector">
      <div className="drawer-heading inspector__title-row">
        <div>
          <span className="eyebrow">Unit Inspector</span>
          <h2>{unit.name}</h2>
        </div>
        <div className="drawer-heading__actions">
          <span className="id-pill">{unit.id}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
        </div>
      </div>

      <div className="inspector-tabs" role="tablist">
        {['definition', 'runtime', 'work'].map((current) => (
          <button key={current} className={tab === current ? 'is-active' : ''} onClick={() => setTab(current)}>
            {current[0].toUpperCase() + current.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'definition' && (
        <>
          <label className="field">
            <span>Name</span>
            <input disabled={semanticReadOnly} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Type</span>
            <select disabled={semanticReadOnly} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {CORE_UNIT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Parent</span>
            <select
              disabled={semanticReadOnly || isRoot}
              value={form.parent_id ?? ''}
              onChange={(event) => setForm({ ...form, parent_id: event.target.value || null })}
            >
              {isRoot && <option value="">Root Unit</option>}
              {model.units.filter((candidate) => candidate.id !== unit.id).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <textarea disabled={semanticReadOnly} rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>

          {!semanticReadOnly && (
            <div className="inspector__actions">
              <button className="button button--primary" onClick={() => onSave(unit, form)}>Save</button>
              <button className="button button--secondary" onClick={() => setAddOpen((open) => !open)}>+ Child Unit</button>
            </div>
          )}

          {addOpen && !semanticReadOnly && (
            <AddUnitForm
              value={newUnit}
              onChange={setNewUnit}
              model={model}
              onCancel={() => setAddOpen(false)}
              onSubmit={(value) => { onAdd(value); setAddOpen(false); }}
            />
          )}

          <div className="inspector-section">
            <div className="section-heading"><strong>Definition Facets</strong><span>{definitionFacets.length}</span></div>
            <FacetList facets={definitionFacets} />
          </div>
        </>
      )}

      {tab === 'runtime' && (
        <div className="state-panel">
          {runtimeState ? (
            <>
              <div className="state-summary">
                <span className={`status-dot status-dot--${runtimeState.status}`} />
                <div><strong>{runtimeState.status}</strong><span>{runtimeState.observed_at}</span></div>
              </div>
              {runtimeState.deployment && <KeyValueData data={runtimeState.deployment} />}
              <div className="inspector-section">
                <div className="section-heading"><strong>Metrics</strong></div>
                <KeyValueData data={runtimeState.metrics} />
              </div>
              <div className="inspector-section">
                <div className="section-heading"><strong>Runtime Facets</strong><span>{runtimeState.facets?.length ?? 0}</span></div>
                <FacetList facets={runtimeState.facets} />
              </div>
            </>
          ) : <div className="state-empty">No runtime state for this Unit.</div>}
        </div>
      )}

      {tab === 'work' && (
        <div className="state-panel">
          {workState ? (
            <>
              <div className="state-summary">
                <span className={`status-dot status-dot--${workState.status}`} />
                <div><strong>{workState.status}</strong><span>{workState.observed_at}</span></div>
              </div>
              <p className="work-summary">{workState.summary}</p>
              {workState.references?.length > 0 && (
                <div className="reference-list">
                  {workState.references.map((reference) => <span key={`${reference.kind}:${reference.id}`}>{reference.kind} · {reference.label ?? reference.id}</span>)}
                </div>
              )}
              <div className="inspector-section">
                <div className="section-heading"><strong>Work Facets</strong><span>{workState.facets?.length ?? 0}</span></div>
                <FacetList facets={workState.facets} />
              </div>
            </>
          ) : <div className="state-empty">No work state for this Unit.</div>}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
    </aside>
  );
}

function AddUnitForm({ value, onChange, model, onCancel, onSubmit }) {
  return (
    <div className="add-card">
      <div className="add-card__header">
        <strong>New Unit</strong>
        <button className="icon-button" onClick={onCancel} aria-label="Cancel add unit">×</button>
      </div>
      <label className="field"><span>Stable ID</span><input value={value.id} onChange={(event) => onChange({ ...value, id: event.target.value })} /></label>
      <label className="field"><span>Name</span><input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
      <label className="field"><span>Type</span><select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>{CORE_UNIT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="field"><span>Parent</span><select value={value.parent_id} onChange={(event) => onChange({ ...value, parent_id: event.target.value })}>{model.units.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>)}</select></label>
      <button className="button button--primary button--wide" onClick={() => onSubmit(value)}>Create Unit</button>
    </div>
  );
}

function AddUnitInspector({ model, onAdd, onClose }) {
  const [value, setValue] = useState({ id: 'aisr.new-unit', name: 'New Unit', type: 'component', parent_id: model.root_unit_id });
  return (
    <aside className="inspector">
      <div className="drawer-heading">
        <div><span className="eyebrow">Unit Inspector</span><strong>Add Unit</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
      </div>
      <AddUnitForm value={value} onChange={setValue} model={model} onCancel={onClose} onSubmit={onAdd} />
    </aside>
  );
}

function RelationshipInspector({ relationship, pending, model, semanticReadOnly, onSave, onCreate, onDelete, onClose, error }) {
  const source = pending ?? relationship;
  const [form, setForm] = useState(source);
  const creating = Boolean(pending);

  useEffect(() => setForm(source), [source?.id, source?.from_unit_id, source?.to_unit_id, source?.type, source?.description]);
  if (!source || !form) return null;

  return (
    <aside className="inspector">
      <div className="drawer-heading">
        <div><span className="eyebrow">Relationship Inspector</span><strong>{creating ? 'New Relationship' : relationship.id}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
      </div>

      {creating && (
        <label className="field"><span>Stable ID</span><input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} /></label>
      )}
      <label className="field"><span>From</span><select disabled={semanticReadOnly} value={form.from_unit_id} onChange={(event) => setForm({ ...form, from_unit_id: event.target.value })}>{model.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unit.id}</option>)}</select></label>
      <label className="field"><span>To</span><select disabled={semanticReadOnly} value={form.to_unit_id} onChange={(event) => setForm({ ...form, to_unit_id: event.target.value })}>{model.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unit.id}</option>)}</select></label>
      <label className="field"><span>Type</span><select disabled={semanticReadOnly} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{CORE_RELATIONSHIP_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="field"><span>Description</span><textarea disabled={semanticReadOnly} rows="3" value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>

      {!semanticReadOnly && (
        <div className="inspector__actions inspector__actions--split">
          <button className="button button--primary" onClick={() => creating ? onCreate(form) : onSave(relationship, form)}>{creating ? 'Create' : 'Save'}</button>
          {!creating && <button className="button button--danger" onClick={() => onDelete(relationship)}>Delete</button>}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
    </aside>
  );
}

function DiffPanel({ changes, onClose }) {
  return (
    <section className="diff-panel">
      <div className="diff-panel__header">
        <div><span className="eyebrow">Published ↔ Draft</span><strong>Changes</strong></div>
        <div className="drawer-heading__actions">
          <span className={`change-count ${changes.length ? 'has-changes' : ''}`}>{changes.length}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close changes">×</button>
        </div>
      </div>
      <div className="diff-panel__list">
        {changes.length === 0 ? <div className="diff-empty">Draft matches the published revision.</div> : changes.map((change) => (
          <div className={`diff-item diff-item--${change.kind}`} key={change.id}>
            <span className="diff-item__kind">{change.kind}</span>
            <span>{change.summary}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AtlasWorkbench() {
  const [state, setState] = useState(loadExperienceState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [mode, setMode] = useState('published');
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [pendingRelationship, setPendingRelationship] = useState(null);
  const [inspectorMode, setInspectorMode] = useState(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [layoutUnlocked, setLayoutUnlocked] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutBaseline, setLayoutBaseline] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const changes = useMemo(() => diffModels(state.published.model, state.draft.model), [state]);
  const changedNodeTargets = useMemo(() => new Set(changes.flatMap((change) => {
    if (change.entity === 'unit') return [change.target];
    if (change.entity === 'facet') return [change.after?.unit_id ?? change.before?.unit_id].filter(Boolean);
    return [];
  })), [changes]);
  const changedRelationshipTargets = useMemo(() => new Set(
    changes.filter((change) => change.entity === 'relationship').map((change) => change.target),
  ), [changes]);
  const active = mode === 'draft' ? state.draft : state.published;
  const semanticReadOnly = mode === 'published';
  const effectiveSemanticReadOnly = semanticReadOnly || layoutUnlocked;
  const highlightDraftChanges = mode === 'draft';
  const selectedUnit = active.model.units.find((current) => current.id === selectedUnitId) ?? null;
  const selectedRelationship = active.model.relationships.find((current) => current.id === selectedRelationshipId) ?? null;
  const runtimeState = selectedUnit ? runtimeStateForUnit(state.runtimeStates ?? [], selectedUnit.id) : null;
  const workState = selectedUnit ? workStateForUnit(state.workStates ?? [], selectedUnit.id) : null;
  const inspectorOpen = Boolean(inspectorMode);

  const patchActiveLayout = (unitId, patch, message) => {
    if (!layoutUnlocked) return;
    setState((current) => {
      const target = mode === 'draft' ? current.draft : current.published;
      const model = mode === 'draft' ? current.draft.model : current.published.model;
      let layout = updateLayoutNode(target.layout, unitId, patch);
      layout = fitAncestorsToLayout(layout, model, unitId);
      const next = replaceActiveLayout(current, mode, layout);
      stateRef.current = next;
      return next;
    });
    setLayoutDirty(true);
    setNotice(message);
  };

  const handleResizeEnd = (unitId, params) => {
    patchActiveLayout(unitId, {
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
    }, `Resized ${unitId} · Unsaved personal layout`);
  };

  const handleToggleCollapsed = (unitId) => {
    if (!layoutUnlocked) return;
    setState((current) => {
      const target = mode === 'draft' ? current.draft : current.published;
      const layout = toggleLayoutCollapsed(target.layout, unitId);
      const next = replaceActiveLayout(current, mode, layout);
      stateRef.current = next;
      return next;
    });
    setLayoutDirty(true);
    setNotice('Layout changed · not saved yet');
  };

  useEffect(() => {
    if (!layoutUnlocked) saveExperienceState(state);
  }, [state, layoutUnlocked]);

  useEffect(() => {
    const nextNodes = toFlowNodes(
      active.model,
      active.layout,
      effectiveSemanticReadOnly,
      changedNodeTargets,
      highlightDraftChanges,
      state.workStates ?? [],
      layoutUnlocked,
      { onResizeEnd: handleResizeEnd, onToggleCollapsed: handleToggleCollapsed },
    );
    setNodes(nextNodes);
  }, [active.model, active.layout, effectiveSemanticReadOnly, changedNodeTargets, highlightDraftChanges, state.workStates, layoutUnlocked, setNodes]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const edges = useMemo(
    () => toFlowEdges(active.model, visibleNodeIds, changedRelationshipTargets, highlightDraftChanges),
    [active.model, visibleNodeIds, changedRelationshipTargets, highlightDraftChanges],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (selectedUnitId && !active.model.units.some((current) => current.id === selectedUnitId)) closeInspector();
    if (selectedRelationshipId && !active.model.relationships.some((current) => current.id === selectedRelationshipId)) closeInspector();
  }, [active.model, selectedUnitId, selectedRelationshipId]);

  const closeInspector = () => {
    setSelectedUnitId(null);
    setSelectedRelationshipId(null);
    setPendingRelationship(null);
    setInspectorMode(null);
  };

  const handleUnlockLayout = () => {
    if (layoutUnlocked) return;
    setLayoutBaseline(clone(active.layout));
    setLayoutDirty(false);
    setLayoutUnlocked(true);
    closeInspector();
    setNotice('Layout unlocked · changes will not save automatically');
  };

  const handleSaveLayout = () => {
    if (!layoutUnlocked) return;
    const currentState = stateRef.current;
    const currentLayout = mode === 'draft' ? currentState.draft.layout : currentState.published.layout;
    saveExperienceState(currentState);
    setLayoutBaseline(clone(currentLayout));
    setLayoutDirty(false);
    setNotice('Personal layout saved');
  };

  const handleRestoreLayout = () => {
    if (!layoutUnlocked || !layoutBaseline) return;
    setState((current) => {
      const next = replaceActiveLayout(current, mode, clone(layoutBaseline));
      stateRef.current = next;
      return next;
    });
    setLayoutDirty(false);
    setNotice('Restored last saved personal layout');
  };

  const handleLockLayout = () => {
    if (!layoutUnlocked) return;
    if (layoutDirty && !window.confirm('Discard unsaved layout changes and lock the layout?')) return;
    if (layoutDirty && layoutBaseline) {
      const restored = replaceActiveLayout(stateRef.current, mode, clone(layoutBaseline));
      stateRef.current = restored;
      setState(restored);
      saveExperienceState(restored);
    }
    setLayoutUnlocked(false);
    setLayoutDirty(false);
    setLayoutBaseline(null);
    setNotice('Layout locked');
  };

  const enterDraft = ({ openChanges = false } = {}) => {
    if (layoutUnlocked) return;
    setState((current) => syncDraftLayoutFromPublished(current));
    setMode('draft');
    setDiffOpen(openChanges);
    closeInspector();
    setNotice('Editing Draft');
  };

  const leaveDraft = () => {
    if (layoutUnlocked) return;
    setMode('published');
    setDiffOpen(false);
    closeInspector();
    setNotice('Viewing published revision');
  };

  const commitDraftModel = (model, layout = state.draft.layout, message = 'Draft updated') => {
    if (layoutUnlocked) {
      setError('Lock the layout before editing Definition data.');
      return false;
    }
    const errors = [
      ...validateModel(model),
      ...validateStateReferences(model, state.runtimeStates ?? [], state.workStates ?? []),
    ];
    if (errors.length) {
      setError(errors[0]);
      return false;
    }
    setError('');
    setNotice(message);
    setState((current) => ({
      ...current,
      draft: {
        ...current.draft,
        model,
        layout,
        changeSequence: current.draft.changeSequence + 1,
      },
    }));
    return true;
  };

  const handleSaveUnit = (unit, form) => {
    try {
      const nextModel = updateUnit(state.draft.model, unit.id, {
        name: form.name.trim(),
        type: form.type,
        parent_id: unit.parent_id === null ? null : form.parent_id,
        description: form.description.trim(),
      });
      let nextLayout = state.draft.layout;
      if (unit.parent_id !== form.parent_id && unit.parent_id !== null) {
        nextLayout = updateLayoutNode(nextLayout, unit.id, { x: 36, y: 84 });
        nextLayout = fitAncestorsToLayout(nextLayout, nextModel, unit.id);
      }
      commitDraftModel(nextModel, nextLayout, `Saved ${unit.id}`);
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleAddUnit = (input) => {
    if (layoutUnlocked) return;
    try {
      const normalized = { ...input, id: input.id.trim(), name: input.name.trim() };
      if (!normalized.id || !normalized.name) throw new Error('Stable ID and Name are required.');
      const nextModel = addUnit(state.draft.model, normalized);
      let nextLayout = addLayoutNode(state.draft.layout, normalized.id, normalized.parent_id, state.draft.model.units.length);
      nextLayout = fitAncestorsToLayout(nextLayout, nextModel, normalized.id);
      if (commitDraftModel(nextModel, nextLayout, `Created ${normalized.id}`)) {
        setSelectedUnitId(normalized.id);
        setInspectorMode('unit');
      }
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleNodeDragStop = (_event, node) => {
    if (!layoutUnlocked || node.id === active.model.root_unit_id) return;
    patchActiveLayout(node.id, { x: node.position.x, y: node.position.y }, `Moved ${node.id} · Unsaved personal layout`);
  };

  const handleConnect = (connection) => {
    if (layoutUnlocked || mode !== 'draft' || !connection.source || !connection.target) return;
    const type = 'calls';
    setPendingRelationship({
      id: suggestRelationshipId(state.draft.model, connection.source, connection.target, type),
      from_unit_id: connection.source,
      to_unit_id: connection.target,
      type,
      description: '',
    });
    setSelectedUnitId(null);
    setSelectedRelationshipId(null);
    setInspectorMode('relationship-new');
  };

  const handleCreateRelationship = (form) => {
    try {
      const input = {
        ...form,
        id: form.id.trim(),
        description: form.description?.trim() ?? '',
      };
      if (!input.id) throw new Error('Stable ID is required.');
      const nextModel = addRelationship(state.draft.model, input);
      if (commitDraftModel(nextModel, state.draft.layout, `Created ${input.id}`)) {
        setPendingRelationship(null);
        setSelectedRelationshipId(input.id);
        setInspectorMode('relationship');
      }
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleSaveRelationship = (relationship, form) => {
    try {
      const nextModel = updateRelationship(state.draft.model, relationship.id, {
        from_unit_id: form.from_unit_id,
        to_unit_id: form.to_unit_id,
        type: form.type,
        description: form.description?.trim() ?? '',
      });
      commitDraftModel(nextModel, state.draft.layout, `Saved ${relationship.id}`);
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleDeleteRelationship = (relationship) => {
    if (layoutUnlocked) return;
    if (!window.confirm(`Delete Relationship ${relationship.id}?`)) return;
    try {
      const nextModel = removeRelationship(state.draft.model, relationship.id);
      if (commitDraftModel(nextModel, state.draft.layout, `Deleted ${relationship.id}`)) closeInspector();
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handlePublish = () => {
    if (layoutUnlocked || !changes.length) return;
    if (!window.confirm(`Publish current Draft as Revision ${state.revisionNumber + 1}?`)) return;
    try {
      const next = publishExperienceState(state);
      setState(next);
      setMode('published');
      setDiffOpen(false);
      closeInspector();
      setNotice(`Published ${next.published.revisionId}`);
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleReset = () => {
    if (layoutUnlocked) return;
    if (!window.confirm('Reset local Atlas experience data?')) return;
    setState(resetExperienceState());
    setMode('published');
    setDiffOpen(false);
    closeInspector();
    setNotice('Local experience data reset');
    setError('');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div><strong>Atlas</strong><span>System Atlas / Collaboration Control Plane</span></div>
        </div>

        <div className="topbar__context">
          <label className="workspace-picker">
            <span>Workspace</span>
            <select value={state.workspaceId} onChange={() => {}} aria-label="Workspace">
              {WORKSPACE_OPTIONS.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          </label>
          <div className={`workspace-state ${mode === 'draft' ? 'is-draft' : ''}`}>
            <span className="workspace-state__dot" />
            <span>{mode === 'draft' ? 'Editing Draft' : 'Published'}</span>
            <span className="revision-text">· {mode === 'draft' ? state.draft.baseRevisionId : state.published.revisionId}</span>
          </div>
        </div>

        <div className="topbar__actions">
          <span className="local-badge">Local Experience</span>
          {layoutUnlocked ? (
            <>
              <span className="local-badge">{layoutDirty ? 'Layout · Unsaved' : 'Layout · Unlocked'}</span>
              <button className="button button--primary" disabled={!layoutDirty} onClick={handleSaveLayout}>Save Layout</button>
              <button className="button button--secondary" disabled={!layoutDirty} onClick={handleRestoreLayout}>Restore</button>
              <button className="button button--ghost" onClick={handleLockLayout}>Lock</button>
            </>
          ) : (
            <button className="button button--secondary" onClick={handleUnlockLayout}>Unlock Layout</button>
          )}
          {mode === 'published' ? (
            <button
              className={`button button--secondary ${changes.length ? 'draft-change-button' : ''}`}
              disabled={layoutUnlocked}
              onClick={() => enterDraft({ openChanges: changes.length > 0 })}
            >
              {changes.length ? `Review Draft · ${changes.length}` : 'Edit Draft'}
            </button>
          ) : (
            <>
              <button
                className="button button--secondary"
                disabled={layoutUnlocked}
                onClick={() => { setInspectorMode('add'); setSelectedUnitId(null); setSelectedRelationshipId(null); }}
              >
                + Unit
              </button>
              <button className="button button--ghost" disabled={layoutUnlocked} onClick={leaveDraft}>Back</button>
              <button
                className={`button button--secondary changes-button ${diffOpen ? 'is-active' : ''}`}
                disabled={layoutUnlocked}
                onClick={() => setDiffOpen((open) => !open)}
              >
                Changes · {changes.length}
              </button>
              {changes.length > 0 && <button className="button button--primary" disabled={layoutUnlocked} onClick={handlePublish}>Publish</button>}
            </>
          )}
          <button className="button button--ghost" disabled={layoutUnlocked} onClick={handleReset}>Reset</button>
        </div>
      </header>

      <main className="workspace-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={(_event, node) => {
            setSelectedUnitId(node.id);
            setSelectedRelationshipId(null);
            setPendingRelationship(null);
            setInspectorMode('unit');
          }}
          onEdgeClick={(event, edge) => {
            event.stopPropagation();
            setSelectedUnitId(null);
            setSelectedRelationshipId(edge.id);
            setPendingRelationship(null);
            setInspectorMode('relationship');
          }}
          onConnect={handleConnect}
          onPaneClick={closeInspector}
          nodesDraggable={layoutUnlocked}
          nodesConnectable={!effectiveSemanticReadOnly}
          panOnDrag={!layoutUnlocked}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={24} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>

        {(notice || error) && <div className={`toast ${error ? 'toast--error' : ''}`}>{error || notice}</div>}

        {inspectorOpen && (
          <div className="workbench-drawer workbench-drawer--inspector">
            {inspectorMode === 'unit' && selectedUnit && (
              <UnitInspector
                unit={selectedUnit}
                model={active.model}
                semanticReadOnly={effectiveSemanticReadOnly}
                runtimeState={runtimeState}
                workState={workState}
                onSave={handleSaveUnit}
                onAdd={handleAddUnit}
                onClose={closeInspector}
                error={error}
              />
            )}
            {inspectorMode === 'add' && mode === 'draft' && !layoutUnlocked && <AddUnitInspector model={state.draft.model} onAdd={handleAddUnit} onClose={closeInspector} />}
            {(inspectorMode === 'relationship' || inspectorMode === 'relationship-new') && (
              <RelationshipInspector
                relationship={selectedRelationship}
                pending={pendingRelationship}
                model={active.model}
                semanticReadOnly={effectiveSemanticReadOnly}
                onSave={handleSaveRelationship}
                onCreate={handleCreateRelationship}
                onDelete={handleDeleteRelationship}
                onClose={closeInspector}
                error={error}
              />
            )}
          </div>
        )}

        {diffOpen && mode === 'draft' && (
          <div className={`workbench-drawer workbench-drawer--diff ${inspectorOpen ? 'has-inspector' : ''}`}>
            <DiffPanel changes={changes} onClose={() => setDiffOpen(false)} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return <ReactFlowProvider><AtlasWorkbench /></ReactFlowProvider>;
}
