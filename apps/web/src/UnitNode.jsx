import { Handle, Position } from '@xyflow/react';

export function UnitNode({ data, selected }) {
  const { unit, changed, hasChildren } = data;
  const isRoot = unit.parent_id === null;

  return (
    <div className={`unit-node ${isRoot ? 'unit-node--root' : ''} ${selected ? 'is-selected' : ''} ${changed ? 'is-changed' : ''}`}>
      {!isRoot && <Handle type="target" position={Position.Left} className="unit-handle" />}
      <div className="unit-node__header">
        <span className="unit-node__type">{unit.type}</span>
      </div>
      <div className="unit-node__name">{unit.name}</div>
      <div className="unit-node__id">{unit.id}</div>
      {hasChildren && !isRoot && <div className="unit-node__children">Container</div>}
      {!isRoot && <Handle type="source" position={Position.Right} className="unit-handle" />}
    </div>
  );
}
