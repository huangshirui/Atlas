import { Handle, NodeResizer, Position } from '@xyflow/react';

const UNIT_TYPE_VISUALS = {
  system: { background: '#f8fafc', badgeBackground: '#e2e8f0', badgeColor: '#334155' },
  project: { background: '#faf5ff', badgeBackground: '#f3e8ff', badgeColor: '#7e22ce' },
  application: { background: '#eff6ff', badgeBackground: '#dbeafe', badgeColor: '#1d4ed8' },
  service: { background: '#ecfdf3', badgeBackground: '#d1fadf', badgeColor: '#027a48' },
  component: { background: '#fffbeb', badgeBackground: '#fef3c7', badgeColor: '#b45309' },
  agent: { background: '#fdf2fa', badgeBackground: '#fce7f3', badgeColor: '#be185d' },
  workflow: { background: '#fff7ed', badgeBackground: '#ffedd5', badgeColor: '#c2410c' },
  runtime: { background: '#ecfeff', badgeBackground: '#cffafe', badgeColor: '#0e7490' },
  datastore: { background: '#f0fdf4', badgeBackground: '#dcfce7', badgeColor: '#15803d' },
  'external-system': { background: '#fef2f2', badgeBackground: '#fee2e2', badgeColor: '#b91c1c' },
};

const DEFAULT_TYPE_VISUAL = {
  background: '#ffffff',
  badgeBackground: '#f2f4f7',
  badgeColor: '#475467',
};

const WORK_COLORS = {
  active: '#6172f3',
  reviewing: '#f79009',
  blocked: '#f04438',
  planned: '#98a2b3',
  done: '#12b76a',
  completed: '#12b76a',
  idle: '#667085',
  paused: '#667085',
};

export function UnitNode({ data, selected }) {
  const {
    unit,
    changed,
    semanticReadOnly,
    layoutUnlocked = false,
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
  const typeVisual = UNIT_TYPE_VISUALS[unit.type] ?? DEFAULT_TYPE_VISUAL;
  const directWorkColor = WORK_COLORS[workStatus] ?? null;
  const hasDirectWork = Boolean(directWorkColor);
  const hasDescendantWork = !hasDirectWork && activeDescendantCount > 0;
  const borderColor = hasDirectWork
    ? directWorkColor
    : hasDescendantWork
      ? '#a5b4fc'
      : '#cfd8e6';

  return (
    <div
      className={`unit-node ${isRoot ? 'unit-node--root' : ''} ${selected ? 'is-selected' : ''} ${changed ? 'is-changed' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      style={{
        background: typeVisual.background,
        borderColor,
        borderWidth: hasDirectWork ? 2 : 1,
        borderStyle: hasDescendantWork ? 'dashed' : 'solid',
      }}
    >
      <NodeResizer
        isVisible={layoutUnlocked && selected && !collapsed}
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
        <span
          className="unit-node__type"
          style={{ background: typeVisual.badgeBackground, color: typeVisual.badgeColor }}
        >
          {unit.type}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {changed && (
            <span
              title="Definition changed in current Draft"
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: '#f59e0b',
                boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.14)',
                flex: '0 0 auto',
              }}
            />
          )}
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
          {hasChildren && !isRoot && layoutUnlocked && (
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
