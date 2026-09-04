import { useEffect, useMemo, useState } from 'react';
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
import './published-first.css';
import {
  CORE_UNIT_TYPES,
  addLayoutNode,
  addUnit,
  diffModels,
  layoutEntry,
  publishExperienceState,
  updateLayoutNode,
  updateUnit,
  validateModel,
} from '@aisr-atlas/domain';
import { UnitNode } from './UnitNode.jsx';
import { loadExperienceState, resetExperienceState, saveExperienceState } from './storage.js';

const nodeTypes = { unit: UnitNode };

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

function toFlowNodes(model, layout, semanticReadOnly, changedTargets, highlightDraftChanges) {
  const childCounts = new Map();
  for (const current of model.units) {
    if (current.parent_id) childCounts.set(current.parent_id, (childCounts.get(current.parent_id) ?? 0) + 1);
  }

  return [...model.units]
    .sort((a, b) => depthFor(a, model) - depthFor(b, model))
    .map((current) => {
      const saved = layoutEntry(layout, current.id) ?? { x: 40, y: 80, width: 220, height: 104 };
      const isRoot = current.parent_id === null;
      return {
        id: current.id,
        type: 'unit',
        position: { x: saved.x, y: saved.y },
        parentId: current.parent_id ?? undefined,
        extent: current.parent_id ? 'parent' : undefined,
        draggable: !isRoot,
        selectable: true,
        data: {
          unit: current,
          semanticReadOnly,
          changed: highlightDraftChanges && changedTargets.has(current.id),
          hasChildren: (childCounts.get(current.id) ?? 0) > 0,
        },
        style: {
          width: saved.width,
          height: saved.height,
          zIndex: isRoot ? -10 : depthFor(current, model),
        },
      };
    });
}

function toFlowEdges(model, changedTargets, highlightDraftChanges) {
  return model.relationships.map((current) => ({
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
  }));
}

function Inspector({ unit, model, semanticReadOnly, onSave, onAdd, onClose, startAdding, error }) {
  const [form, setForm] = useState(null);
  const [addOpen, setAddOpen] = useState(startAdding);
  const [newUnit, setNewUnit] = useState({ id: 'atlas.new-unit', name: 'New Unit', type: 'component', parent_id: 'atlas' });

  useEffect(() => {
    setForm(unit ? {
      name: unit.name,
      type: unit.type,
      parent_id: unit.parent_id,
      description: unit.description ?? '',
    } : null);
  }, [unit?.id, unit?.name, unit?.type, unit?.parent_id, unit?.description]);

  useEffect(() => {
    setAddOpen(startAdding);
  }, [startAdding]);

  if (!unit || !form) {
    return (
      <aside className="inspector">
        <div className="drawer-heading">
          <div>
            <span className="eyebrow">Unit Inspector</span>
            <strong>{startAdding ? 'Add Unit' : 'No Unit selected'}</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
        </div>
        {!addOpen && (
          <div className="empty-state">
            <div className="empty-state__icon">↖</div>
            <strong>Select a Unit</strong>
            <span>Inspect semantic properties. Enter Draft mode to edit them.</span>
          </div>
        )}
        {!semanticReadOnly && !addOpen && (
          <button className="button button--secondary button--wide" onClick={() => setAddOpen(true)}>+ Add Unit</button>
        )}
        {addOpen && !semanticReadOnly && (
          <AddUnitForm
            value={newUnit}
            onChange={setNewUnit}
            model={model}
            onCancel={() => setAddOpen(false)}
            onSubmit={() => { onAdd(newUnit); setAddOpen(false); }}
          />
        )}
      </aside>
    );
  }

  const isRoot = unit.parent_id === null;

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
        <textarea disabled={semanticReadOnly} rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>

      {error && <div className="error-box">{error}</div>}

      {!semanticReadOnly && (
        <div className="inspector__actions">
          <button className="button button--primary" onClick={() => onSave(unit, form)}>Save</button>
          <button className="button button--secondary" onClick={() => setAddOpen((open) => !open)}>+ Add Unit</button>
        </div>
      )}

      {addOpen && !semanticReadOnly && (
        <AddUnitForm
          value={newUnit}
          onChange={setNewUnit}
          model={model}
          onCancel={() => setAddOpen(false)}
          onSubmit={() => { onAdd(newUnit); setAddOpen(false); }}
        />
      )}
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
      <button className="button button--primary button--wide" onClick={onSubmit}>Create Unit</button>
    </div>
  );
}

function DiffPanel({ changes, onClose }) {
  return (
    <section className="diff-panel">
      <div className="diff-panel__header">
        <div>
          <span className="eyebrow">Published ↔ Draft</span>
          <strong>Changes</strong>
        </div>
        <div className="drawer-heading__actions">
          <span className={`change-count ${changes.length ? 'has-changes' : ''}`}>{changes.length}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close changes">×</button>
        </div>
      </div>
      <div className="diff-panel__list">
        {changes.length === 0 ? (
          <div className="diff-empty">Draft matches the published revision.</div>
        ) : changes.map((change) => (
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
  const [mode, setMode] = useState('published');
  const [selectedId, setSelectedId] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState('unit');
  const [diffOpen, setDiffOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const changes = useMemo(() => diffModels(state.published.model, state.draft.model), [state]);
  const changedTargets = useMemo(() => new Set(changes.map((change) => change.target)), [changes]);
  const active = mode === 'draft' ? state.draft : state.published;
  const semanticReadOnly = mode === 'published';
  const highlightDraftChanges = mode === 'draft';
  const edges = useMemo(
    () => toFlowEdges(active.model, changedTargets, highlightDraftChanges),
    [active.model, changedTargets, highlightDraftChanges],
  );
  const selectedUnit = active.model.units.find((current) => current.id === selectedId) ?? null;

  useEffect(() => saveExperienceState(state), [state]);
  useEffect(() => {
    setNodes(toFlowNodes(active.model, active.layout, semanticReadOnly, changedTargets, highlightDraftChanges));
  }, [active.model, active.layout, semanticReadOnly, changedTargets, highlightDraftChanges, setNodes]);
  useEffect(() => {
    if (selectedId && !active.model.units.some((current) => current.id === selectedId)) {
      setSelectedId(null);
      setInspectorOpen(false);
    }
  }, [active.model, selectedId]);

  const closeInspector = () => {
    setInspectorOpen(false);
    setSelectedId(null);
    setInspectorMode('unit');
  };

  const enterDraft = ({ openChanges = false } = {}) => {
    setMode('draft');
    setDiffOpen(openChanges);
    setInspectorMode('unit');
    setNotice('Editing Draft');
  };

  const leaveDraft = () => {
    setMode('published');
    setDiffOpen(false);
    setInspectorMode('unit');
    setNotice('Viewing published revision');
  };

  const openAddUnit = () => {
    if (mode !== 'draft') return;
    setSelectedId(null);
    setInspectorMode('add');
    setInspectorOpen(true);
  };

  const commitDraftModel = (model, layout = state.draft.layout, message = 'Draft updated') => {
    const errors = validateModel(model);
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
        const parent = layoutEntry(nextLayout, form.parent_id);
        if (parent && form.parent_id !== state.draft.model.root_unit_id) {
          nextLayout = updateLayoutNode(nextLayout, form.parent_id, {
            width: Math.max(parent.width, 480),
            height: Math.max(parent.height, 300),
          });
        }
      }
      commitDraftModel(nextModel, nextLayout, `Saved ${unit.id}`);
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleAddUnit = (input) => {
    try {
      const normalized = { ...input, id: input.id.trim(), name: input.name.trim() };
      if (!normalized.id || !normalized.name) throw new Error('Stable ID and Name are required.');
      const nextModel = addUnit(state.draft.model, normalized);
      const nextLayout = addLayoutNode(state.draft.layout, normalized.id, normalized.parent_id, state.draft.model.units.length);
      if (commitDraftModel(nextModel, nextLayout, `Created ${normalized.id}`)) {
        setSelectedId(normalized.id);
        setInspectorMode('unit');
        setInspectorOpen(true);
      }
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleNodeDragStop = (_event, node) => {
    if (node.id === active.model.root_unit_id) return;

    if (mode === 'draft') {
      const nextLayout = updateLayoutNode(state.draft.layout, node.id, { x: node.position.x, y: node.position.y });
      setState((current) => ({ ...current, draft: { ...current.draft, layout: nextLayout } }));
    } else {
      const nextLayout = updateLayoutNode(state.published.layout, node.id, { x: node.position.x, y: node.position.y });
      setState((current) => ({ ...current, published: { ...current.published, layout: nextLayout } }));
    }

    setNotice(`Moved ${node.id} · Personal layout only`);
  };

  const handlePublish = () => {
    if (!changes.length) return;
    if (!window.confirm(`Publish current Draft as Revision ${state.revisionNumber + 1}?`)) return;
    try {
      const next = publishExperienceState(state);
      setState(next);
      setMode('published');
      setDiffOpen(false);
      setNotice(`Published ${next.published.revisionId}`);
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset local Atlas experience data?')) return;
    const next = resetExperienceState();
    setState(next);
    setMode('published');
    setSelectedId(null);
    setInspectorOpen(false);
    setInspectorMode('unit');
    setDiffOpen(false);
    setNotice('Local experience data reset');
    setError('');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>AISR Atlas</strong>
            <span>System Atlas / Collaboration Control Plane</span>
          </div>
        </div>

        <div className="topbar__center">
          <div className={`workspace-state ${mode === 'draft' ? 'is-draft' : ''}`}>
            <span className="workspace-state__dot" />
            <span>{mode === 'draft' ? 'Editing Draft' : 'Published'}</span>
            <span className="revision-text">· {mode === 'draft' ? state.draft.baseRevisionId : state.published.revisionId}</span>
          </div>
        </div>

        <div className="topbar__actions">
          <span className="local-badge">Local Experience</span>
          {mode === 'published' ? (
            <button
              className={`button button--secondary ${changes.length ? 'draft-change-button' : ''}`}
              onClick={() => enterDraft({ openChanges: changes.length > 0 })}
            >
              {changes.length ? `Review Draft · ${changes.length}` : 'Edit Draft'}
            </button>
          ) : (
            <>
              <button className="button button--ghost" onClick={leaveDraft}>Back to Published</button>
              <button className={`button button--secondary changes-button ${diffOpen ? 'is-active' : ''}`} onClick={() => setDiffOpen((open) => !open)}>
                Changes · {changes.length}
              </button>
              {changes.length > 0 && (
                <button className="button button--primary" onClick={handlePublish}>Publish</button>
              )}
            </>
          )}
          <button className="button button--ghost" onClick={handleReset}>Reset</button>
        </div>
      </header>

      <main className="workspace-canvas">
        <section className="canvas-panel canvas-panel--full">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">Workspace</span>
              <strong>AISR Atlas</strong>
            </div>
            <div className="canvas-toolbar__actions">
              <div className="canvas-toolbar__legend">
                {mode === 'draft' && <span><i className="legend-dot legend-dot--draft" /> Definition change</span>}
                <span className={`canvas-mode-note ${mode === 'draft' ? 'is-draft' : ''}`}>
                  {mode === 'draft' ? 'Editing semantics and layout' : 'Drag to adjust your personal layout'}
                </span>
              </div>
              {mode === 'draft' && <button className="button button--secondary" onClick={openAddUnit}>+ Add Unit</button>}
            </div>
          </div>

          <div className="canvas-wrap">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={(_event, node) => {
                setSelectedId(node.id);
                setInspectorMode('unit');
                setInspectorOpen(true);
              }}
              onPaneClick={closeInspector}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.25}
              maxZoom={1.8}
              proOptions={{ hideAttribution: false }}
            >
              <Background gap={24} size={1} />
              <MiniMap pannable zoomable />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          {(notice || error) && <div className={`toast ${error ? 'toast--error' : ''}`}>{error || notice}</div>}
        </section>

        {inspectorOpen && (
          <div className="workbench-drawer workbench-drawer--inspector">
            <Inspector
              unit={selectedUnit}
              model={active.model}
              semanticReadOnly={semanticReadOnly}
              onSave={handleSaveUnit}
              onAdd={handleAddUnit}
              onClose={closeInspector}
              startAdding={inspectorMode === 'add'}
              error={error}
            />
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
