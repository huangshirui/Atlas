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

function toFlowNodes(model, layout, readOnly, changedTargets) {
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
        draggable: !readOnly && !isRoot,
        selectable: true,
        data: {
          unit: current,
          readOnly,
          changed: changedTargets.has(current.id),
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

function toFlowEdges(model, changedTargets) {
  return model.relationships.map((current) => ({
    id: current.id,
    source: current.from_unit_id,
    target: current.to_unit_id,
    type: 'smoothstep',
    label: current.type,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    className: changedTargets.has(current.id) ? 'relationship-edge is-changed' : 'relationship-edge',
    labelStyle: { fontSize: 11, fontWeight: 700 },
  }));
}

function Inspector({ unit, model, readOnly, onSave, onAdd, onClose, startAdding, error }) {
  const [form, setForm] = useState(null);
  const [addOpen, setAddOpen] = useState(startAdding);
  const [newUnit, setNewUnit] = useState({ id: 'atlas.new-unit', name: 'New Unit', type: 'component', parent_id: 'atlas' });

  useEffect(() => {
    setForm(unit ? { name: unit.name, type: unit.type, parent_id: unit.parent_id, description: unit.description ?? '' } : null);
  }, [unit?.id, unit?.name, unit?.type, unit?.parent_id, unit?.description]);

  useEffect(() => {
    setAddOpen(startAdding);
  }, [startAdding]);

  if (!unit || !form) {
    return (
      <aside className="inspector">
        <div className="drawer-heading">
          <div>
            <span className="eyebrow">Unit Inspector（单元检查器）</span>
            <strong>{startAdding ? 'Add Unit（新增单元）' : 'No Unit selected'}</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
        </div>
        {!addOpen && (
          <div className="empty-state">
            <div className="empty-state__icon">↖</div>
            <strong>Select a Unit（选择单元）</strong>
            <span>点击画布中的 Unit 查看语义属性；Draft（草稿）模式下可以显式修改。</span>
          </div>
        )}
        {!readOnly && !addOpen && (
          <button className="button button--secondary button--wide" onClick={() => setAddOpen(true)}>+ Add Unit（新增单元）</button>
        )}
        {addOpen && !readOnly && (
          <AddUnitForm value={newUnit} onChange={setNewUnit} model={model} onCancel={() => setAddOpen(false)} onSubmit={() => { onAdd(newUnit); setAddOpen(false); }} />
        )}
      </aside>
    );
  }

  const isRoot = unit.parent_id === null;

  return (
    <aside className="inspector">
      <div className="drawer-heading inspector__title-row">
        <div>
          <span className="eyebrow">Unit Inspector（单元检查器）</span>
          <h2>{unit.name}</h2>
        </div>
        <div className="drawer-heading__actions">
          <span className="id-pill">{unit.id}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
        </div>
      </div>

      <label className="field">
        <span>Name（名称）</span>
        <input disabled={readOnly} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>

      <label className="field">
        <span>Type（类型）</span>
        <select disabled={readOnly} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          {CORE_UNIT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Parent（父级）</span>
        <select
          disabled={readOnly || isRoot}
          value={form.parent_id ?? ''}
          onChange={(event) => setForm({ ...form, parent_id: event.target.value || null })}
        >
          {isRoot && <option value="">Root Unit（根单元）</option>}
          {model.units.filter((candidate) => candidate.id !== unit.id).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Description（说明）</span>
        <textarea disabled={readOnly} rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>

      {error && <div className="error-box">{error}</div>}

      {!readOnly && (
        <div className="inspector__actions">
          <button className="button button--primary" onClick={() => onSave(unit, form)}>Save to Draft（保存到草稿）</button>
          <button className="button button--secondary" onClick={() => setAddOpen((open) => !open)}>+ Add Unit</button>
        </div>
      )}

      {addOpen && !readOnly && (
        <AddUnitForm value={newUnit} onChange={setNewUnit} model={model} onCancel={() => setAddOpen(false)} onSubmit={() => { onAdd(newUnit); setAddOpen(false); }} />
      )}
    </aside>
  );
}

function AddUnitForm({ value, onChange, model, onCancel, onSubmit }) {
  return (
    <div className="add-card">
      <div className="add-card__header">
        <strong>New Unit（新单元）</strong>
        <button className="icon-button" onClick={onCancel}>×</button>
      </div>
      <label className="field"><span>Stable ID（稳定 ID）</span><input value={value.id} onChange={(event) => onChange({ ...value, id: event.target.value })} /></label>
      <label className="field"><span>Name（名称）</span><input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
      <label className="field"><span>Type（类型）</span><select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>{CORE_UNIT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="field"><span>Parent（父级）</span><select value={value.parent_id} onChange={(event) => onChange({ ...value, parent_id: event.target.value })}>{model.units.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>)}</select></label>
      <button className="button button--primary button--wide" onClick={onSubmit}>Create in Draft（在草稿中新建）</button>
    </div>
  );
}

function DiffPanel({ changes, onClose }) {
  return (
    <section className="diff-panel">
      <div className="diff-panel__header">
        <div>
          <span className="eyebrow">Published ↔ Draft</span>
          <strong>Diff（差异）</strong>
        </div>
        <div className="drawer-heading__actions">
          <span className={`change-count ${changes.length ? 'has-changes' : ''}`}>{changes.length}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close diff">×</button>
        </div>
      </div>
      <div className="diff-panel__list">
        {changes.length === 0 ? (
          <div className="diff-empty">Draft 与 Published 一致。</div>
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
  const [mode, setMode] = useState('draft');
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
  const readOnly = mode === 'published';
  const edges = useMemo(() => toFlowEdges(active.model, changedTargets), [active.model, changedTargets]);
  const selectedUnit = active.model.units.find((current) => current.id === selectedId) ?? null;

  useEffect(() => saveExperienceState(state), [state]);
  useEffect(() => {
    setNodes(toFlowNodes(active.model, active.layout, readOnly, changedTargets));
  }, [active.model, active.layout, readOnly, changedTargets, setNodes]);
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

  const openAddUnit = () => {
    if (readOnly) return;
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
      commitDraftModel(nextModel, nextLayout, `Saved ${unit.id} to Draft`);
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
      if (commitDraftModel(nextModel, nextLayout, `Created ${normalized.id} in Draft`)) {
        setSelectedId(normalized.id);
        setInspectorMode('unit');
        setInspectorOpen(true);
      }
    } catch (cause) {
      setError(cause.message);
    }
  };

  const handleNodeDragStop = (_event, node) => {
    if (readOnly || node.id === active.model.root_unit_id) return;
    const nextLayout = updateLayoutNode(state.draft.layout, node.id, { x: node.position.x, y: node.position.y });
    setState((current) => ({ ...current, draft: { ...current.draft, layout: nextLayout } }));
    setNotice(`Moved ${node.id} · Layout only`);
  };

  const handlePublish = () => {
    if (!changes.length) return;
    if (!window.confirm(`Publish current Draft as Revision ${state.revisionNumber + 1}?`)) return;
    try {
      const next = publishExperienceState(state);
      setState(next);
      setMode('draft');
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
    setMode('draft');
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
          <div><strong>AISR Atlas</strong><span>System Atlas / Collaboration Control Plane（系统地图 / 协作控制面）</span></div>
        </div>
        <div className="topbar__center">
          <div className="mode-switch">
            <button className={mode === 'draft' ? 'is-active' : ''} onClick={() => setMode('draft')}>Draft（草稿）</button>
            <button className={mode === 'published' ? 'is-active' : ''} onClick={() => setMode('published')}>Published（已发布）</button>
          </div>
          <span className="revision-pill">{state.published.revisionId}</span>
        </div>
        <div className="topbar__actions">
          <span className="local-badge">Local Experience（本地体验）</span>
          <button className={`button button--secondary changes-button ${diffOpen ? 'is-active' : ''}`} onClick={() => setDiffOpen((open) => !open)}>
            Changes（变更） · {changes.length}
          </button>
          <button className="button button--ghost" onClick={handleReset}>Reset</button>
          <button className="button button--primary" disabled={!changes.length || mode !== 'draft'} onClick={handlePublish}>
            Publish（发布） {changes.length ? `· ${changes.length}` : ''}
          </button>
        </div>
      </header>

      <main className="workspace-canvas">
        <section className="canvas-panel canvas-panel--full">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">Workspace（工作区）</span>
              <strong>AISR Atlas</strong>
            </div>
            <div className="canvas-toolbar__actions">
              <div className="canvas-toolbar__legend">
                <span><i className="legend-dot legend-dot--draft" /> Definition Change（定义变更）</span>
                <span>Drag = Layout only（拖动仅布局）</span>
              </div>
              {!readOnly && <button className="button button--secondary" onClick={openAddUnit}>+ Add Unit（新增单元）</button>}
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
              readOnly={readOnly}
              onSave={handleSaveUnit}
              onAdd={handleAddUnit}
              onClose={closeInspector}
              startAdding={inspectorMode === 'add'}
              error={error}
            />
          </div>
        )}

        {diffOpen && (
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
