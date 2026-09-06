import { Handle, NodeResizer, Position } from '@xyflow/react';

const WORK_COLORS = {
  active: '#6172f3',
  reviewing: '#f79009',
  blocked: '#f04438',
  planned: '#98a2b3',
};

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
    workStatus = null,
    activeDescendantCount = 0,
  } = data;
  const isRoot = unit.parent_id === null;
  const directWorkColor = WORK_COLORS[workStatus] ?? null;
  const hasDirectWork = Boolean(directWorkColor);
  const hasDescendantWork = !hasDirectWork && activeDescendantCount > 0;

  return (
    <div
      className={`unit-node ${isRoot ? 'unit-node--root' : ''} ${selected ? 'is-selected' : ''} ${changed ? 'is-changed' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      style={hasDirectWork
        ? { borderColor: directWorkColor, borderWidth: 2 }
        : hasDescendantWork
          ? { borderColor: '#a5b4fc', borderStyle: 'dashed' }
          : undefined}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {hasDirectWork && (
            <span
              title={`Direct Work State: ${workStatus}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 6px',
                borderRadius: 999,
                background: `${directWorkColor}18`,
                color: directWorkColor,
                fontSize: 9,
                fontWeight: 850,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: directWorkColor }} />
              {workStatus}
            </span>
          )}
          {hasDescendantWork && (
            <span
              title={`${activeDescendantCount} descendant Units have work in progress`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 6px',
                borderRadius: 999,
                background: '#eef2ff',
                color: '#4f46e5',
                fontSize: 9,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              ↳ {activeDescendantCount} active below
            </span>
          )}
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
