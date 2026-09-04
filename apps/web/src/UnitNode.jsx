import { Handle, NodeResizer, Position } from '@xyflow/react';

export function UnitNode({ data, selected }) {
  const {
    unit,
    changed,
    semanticReadOnly,
    hasChildren,
    childCount,
    collapsed,
    minWidth,
    minHeight,
    onResizeEnd,
    onToggleCollapsed,
  } = data;
  const isRoot = unit.parent_id === null;

  return (
    <div className={`unit-node ${isRoot ? 'unit-node--root' : ''} ${selected ? 'is-selected' : ''} ${changed ? 'is-changed' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <NodeResizer
        isVisible={selected && !collapsed}
        minWidth={minWidth}
        minHeight={minHeight}
        lineClassName="unit-resizer-line"
        handleClassName="unit-resizer-handle"
        onResizeEnd={(_event, params) => onResizeEnd(unit.id, params)}
      />

      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className={`unit-handle ${semanticReadOnly ? 'is-readonly' : ''}`}
          isConnectable={!semanticReadOnly}
        />
      )}

      <div className="unit-node__header">
        <span className="unit-node__type">{unit.type}</span>
        {hasChildren && !isRoot && (
          <button
            className="unit-node__collapse nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapsed(unit.id);
            }}
            aria-label={collapsed ? 'Expand Unit' : 'Collapse Unit'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
      </div>

      <div className="unit-node__name">{unit.name}</div>
      <div className="unit-node__id">{unit.id}</div>
      {hasChildren && !isRoot && (
        <div className="unit-node__children">{collapsed ? `${childCount} hidden` : `${childCount} children`}</div>
      )}

      {!isRoot && (
        <Handle
          type="source"
          position={Position.Right}
          className={`unit-handle ${semanticReadOnly ? 'is-readonly' : ''}`}
          isConnectable={!semanticReadOnly}
        />
      )}
    </div>
  );
}
