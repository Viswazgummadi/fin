"use client";

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import {
  DashboardWidget,
  WIDGET_LABELS,
  getUserDashboardWidgets,
  normalizeDashboardWidgets,
  saveUserDashboardWidgets,
} from '../lib/dashboard';

type WidgetManagerContext = {
  widgets: DashboardWidget[];
  visibleWidgets: DashboardWidget[];
  isEditing: boolean;
  toggleEditMode: () => void;
  /** Pre-rendered, already-styled editor panel — place it wherever it fits your layout (e.g. under the page header). */
  editorPanel: React.ReactNode;
};

export function WidgetManager({ children }: { children: (ctx: WidgetManagerContext) => React.ReactNode }) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => normalizeDashboardWidgets(getUserDashboardWidgets()));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setWidgets(normalizeDashboardWidgets(getUserDashboardWidgets()));
  }, []);

  useEffect(() => {
    saveUserDashboardWidgets(widgets);
  }, [widgets]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'fin.dashboard-widgets.v1') return;
      setWidgets(normalizeDashboardWidgets(getUserDashboardWidgets()));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.visible), [widgets]);

  const toggleWidget = (widgetId: string) => {
    setWidgets((current) => current.map((widget) => (widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget)));
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return;

    const nextWidgets = [...widgets];
    if (direction === 'up' && index > 0) {
      [nextWidgets[index], nextWidgets[index - 1]] = [nextWidgets[index - 1], nextWidgets[index]];
    } else if (direction === 'down' && index < nextWidgets.length - 1) {
      [nextWidgets[index], nextWidgets[index + 1]] = [nextWidgets[index + 1], nextWidgets[index]];
    }

    setWidgets(nextWidgets.map((widget, position) => ({ ...widget, position })));
  };

  const resetWidgets = () => setWidgets(normalizeDashboardWidgets(null));
  const toggleEditMode = () => setIsEditing((current) => !current);

  const editorPanel = isEditing ? (
    <div className="glass-1 fade-up space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Customize dashboard</div>
          <p className="text-xs text-[--text-secondary]">Reorder and hide sections — changes save instantly, only on this device.</p>
        </div>
        <button onClick={resetWidgets} type="button" className="btn-ghost inline-flex shrink-0 items-center gap-1.5 text-xs">
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="space-y-1.5">
        {widgets.map((widget, index) => (
          <div key={widget.id} className="data-row flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <GripVertical size={14} className="shrink-0 text-[--text-muted]" />
              <span className={`truncate ${widget.visible ? 'text-[--text-primary]' : 'text-[--text-muted]'}`}>
                {WIDGET_LABELS[widget.type]}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => moveWidget(widget.id, 'up')}
                disabled={index === 0}
                aria-label={`Move ${WIDGET_LABELS[widget.type]} up`}
                className="btn-ghost grid h-7 w-7 place-items-center rounded-full p-0 disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => moveWidget(widget.id, 'down')}
                disabled={index === widgets.length - 1}
                aria-label={`Move ${WIDGET_LABELS[widget.type]} down`}
                className="btn-ghost grid h-7 w-7 place-items-center rounded-full p-0 disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => toggleWidget(widget.id)}
                aria-label={widget.visible ? `Hide ${WIDGET_LABELS[widget.type]}` : `Show ${WIDGET_LABELS[widget.type]}`}
                className="btn-ghost grid h-7 w-7 place-items-center rounded-full p-0"
              >
                {widget.visible ? <Eye size={14} className="text-[--accent]" /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return <>{children({ widgets, visibleWidgets, isEditing, toggleEditMode, editorPanel })}</>;
}
