import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createAisrEcosystemSeed } from '../../../packages/domain/src/aisr-ecosystem-seed.js';
import { UnitNode } from './UnitNode.jsx';

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

function hasCollapsedAncestor(unit, model, collapsed) {
  let parentId = unit.parent_id;
  while (parentId) {
    if (collapsed.has(parentId)) return true;
    parentId = model.units.find((candidate) => candidate.id === parentId)?.parent_id ?? null;
  }
  return false;
}

function displayValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function DataRows({ data }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return <p className="state-empty">No data.</p>;
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

function ExperimentWorkbench() {
  const seed = useMemo(() => createAisrEcosystemSeed(), []);
  const { model, layout, runtimeStates, workStates } = seed;
  const [selectedUnitId, setSelectedUnitId] = useState('aisr.ecosystem');
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());

  const layoutByUnit = useMemo(
    () => new Map(layout.nodes.map((entry) => [entry.unit_id, entry])),
    [layout.nodes],
  );

  const childCounts = useMemo(() => {
    const counts = new Map();
    for (const current of model.units) {
      if (current.parent_id) counts.set(current.parent_id, (counts.get(current.parent_id) ?? 0) + 1);
    }
    return counts;
  }, [model.units]);

  const nodes = useMemo(() => model.units
    .filter((current) => !hasCollapsedAncestor(current, model, collapsed))
    .sort((left, right) => depthFor(left, model) - depthFor(right, model))
    .map((current) => {
      const entry = layoutByUnit.get(current.id) ?? { x: 40, y: 80, width: 220, height: 104 };
      const isRoot = current.parent_id === null;
      const isCollapsed = collapsed.has(current.id);
      return {
        id: current.id,
        type: 'unit',
        position: { x: entry.x, y: entry.y },
        parentId: current.parent_id ?? undefined,
        extent: current.parent_id ? 'parent' : undefined,
        draggable: false,
        selectable: true,
        data: {
          unit: current,
          changed: false,
          semanticReadOnly: true,
          hasChildren: (childCounts.get(current.id) ?? 0) > 0,
          childCount: childCounts.get(current.id) ?? 0,
          collapsed: isCollapsed,
          minWidth: 160,
          minHeight: 72,
          onResizeEnd: () => {},
          onToggleCollapsed: (unitId) => setCollapsed((currentSet) => {
            const next = new Set(currentSet);
            if (next.has(unitId)) next.delete(unitId);
            else next.add(unitId);
            return next;
          }),
        },
        style: {
          width: entry.width,
          height: isCollapsed ? 72 : entry.height,
          zIndex: isRoot ? -10 : depthFor(current, model),
        },
      };
    }), [childCounts, collapsed, layoutByUnit, model]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const edges = useMemo(() => model.relationships
    .filter((current) => visibleNodeIds.has(current.from_unit_id) && visibleNodeIds.has(current.to_unit_id))
    .map((current) => ({
      id: current.id,
      source: current.from_unit_id,
      target: current.to_unit_id,
      type: 'smoothstep',
      label: current.type,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      className: 'relationship-edge',
      labelStyle: { fontSize: 10, fontWeight: 700 },
      interactionWidth: 24,
    })), [model.relationships, visibleNodeIds]);

  const selectedUnit = model.units.find((current) => current.id === selectedUnitId) ?? null;
  const selectedRelationship = model.relationships.find((current) => current.id === selectedRelationshipId) ?? null;
  const selectedFacets = selectedUnit
    ? model.facets.filter((current) => current.unit_id === selectedUnit.id)
    : [];
  const selectedRuntime = selectedUnit
    ? runtimeStates.find((current) => current.unit_id === selectedUnit.id)
    : null;
  const selectedWork = selectedUnit
    ? workStates.find((current) => current.unit_id === selectedUnit.id)
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">A</span>
          <div>
            <strong>AISR Atlas</strong>
            <span>AISR Ecosystem architecture experiment</span>
          </div>
        </div>
        <div className="topbar__context">
          <div className="workspace-state is-draft">
            <span className="workspace-state__dot" />
            <span>Experiment · read-only seed</span>
          </div>
          <a className="button button--secondary" href="/">Back to Atlas workspace</a>
        </div>
      </header>

      <main className="workbench">
        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">Real architecture stress-test</span>
              <strong>LifeSpace · n8n Nodes · Adapters · ALOHA · HomeMew</strong>
            </div>
            <div className="canvas-toolbar__meta">
              <span>{model.units.length} Units</span>
              <span>{model.relationships.length} Relationships</span>
              <span>{model.custom_types.relationships.length} custom relationship types</span>
            </div>
          </div>

          <div className="canvas" style={{ height: 'calc(100vh - 138px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.12}
              maxZoom={1.4}
              nodesDraggable={false}
              nodesConnectable={false}
              onNodeClick={(_event, node) => {
                setSelectedUnitId(node.id);
                setSelectedRelationshipId(null);
              }}
              onEdgeClick={(_event, edge) => {
                setSelectedRelationshipId(edge.id);
                setSelectedUnitId(null);
              }}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={24} size={1} />
            </ReactFlow>
          </div>
        </section>

        {(selectedUnit || selectedRelationship) && (
          <aside className="inspector">
            <div className="drawer-heading inspector__title-row">
              <div>
                <span className="eyebrow">{selectedUnit ? 'Unit Inspector' : 'Relationship Inspector'}</span>
                <h2>{selectedUnit?.name ?? selectedRelationship?.type}</h2>
              </div>
              <span className="id-pill">{selectedUnit?.id ?? selectedRelationship?.id}</span>
            </div>

            {selectedUnit && (
              <>
                <div className="inspector-section">
                  <div className="section-heading"><strong>Definition</strong></div>
                  <DataRows data={{
                    type: selectedUnit.type,
                    parent_id: selectedUnit.parent_id,
                    description: selectedUnit.description,
                  }} />
                </div>
                <div className="inspector-section">
                  <div className="section-heading"><strong>Definition Facets</strong><span>{selectedFacets.length}</span></div>
                  {selectedFacets.map((current) => (
                    <section className="facet-card" key={current.id}>
                      <div className="facet-card__heading"><strong>{current.type}</strong><span>{current.state_class}</span></div>
                      <DataRows data={current.data} />
                    </section>
                  ))}
                </div>
                <div className="inspector-section">
                  <div className="section-heading"><strong>Runtime State</strong></div>
                  {selectedRuntime ? <DataRows data={{ status: selectedRuntime.status, deployment: selectedRuntime.deployment }} /> : <p className="state-empty">No runtime state projected.</p>}
                </div>
                <div className="inspector-section">
                  <div className="section-heading"><strong>Work State</strong></div>
                  {selectedWork ? <DataRows data={{ status: selectedWork.status, summary: selectedWork.summary }} /> : <p className="state-empty">No work state projected.</p>}
                </div>
              </>
            )}

            {selectedRelationship && (
              <DataRows data={{
                from: selectedRelationship.from_unit_id,
                to: selectedRelationship.to_unit_id,
                type: selectedRelationship.type,
                description: selectedRelationship.description,
                properties: selectedRelationship.properties,
              }} />
            )}
          </aside>
        )}
      </main>
    </div>
  );
}

export default function AisrEcosystemExperiment() {
  return (
    <ReactFlowProvider>
      <ExperimentWorkbench />
    </ReactFlowProvider>
  );
}
