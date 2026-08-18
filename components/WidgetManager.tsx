"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardWidget, getUserDashboardWidgets, normalizeDashboardWidgets, saveUserDashboardWidgets } from '../lib/dashboard';

export function WidgetManager({ 
  children,
  onWidgetsChange 
}: { 
  children: React.ReactNode | ((visibleWidgets: DashboardWidget[], widgets: DashboardWidget[], setWidgets: (widgets: DashboardWidget[]) => void) => React.ReactNode);
  onWidgetsChange?: (widgets: DashboardWidget[]) => void;
}) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => normalizeDashboardWidgets(getUserDashboardWidgets()));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setWidgets(normalizeDashboardWidgets(getUserDashboardWidgets()));
  }, []);

  useEffect(() => {
    saveUserDashboardWidgets(widgets);
    onWidgetsChange?.(widgets);
  }, [widgets, onWidgetsChange]);

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
    setWidgets((current) =>
      current.map((widget) => (widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget))
    );
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return;

    const newWidgets = [...widgets];
    if (direction === 'up' && index > 0) {
      [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]];
    } else if (direction === 'down' && index < newWidgets.length - 1) {
      [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    }

    setWidgets(
      newWidgets.map((widget, position) => ({
        ...widget,
        position,
      }))
    );
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const resetWidgets = () => {
    setWidgets(normalizeDashboardWidgets(null));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <button 
          onClick={toggleEditMode}
          className="px-3 py-1 text-sm rounded-md border border-[--border] hover:bg-[--bg-secondary]"
        >
          {isEditing ? 'Done' : 'Edit Widgets'}
        </button>
      </div>
      
      {isEditing && (
        <div className="border border-[--border] rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-medium">Widget Management</h3>
            <button onClick={resetWidgets} className="text-sm text-[--text-secondary]">
              Reset
            </button>
          </div>
          <p className="mb-3 text-sm text-[--text-secondary]">Reorder and hide dashboard sections. Changes save instantly.</p>
          <div className="space-y-2">
            {widgets.map((widget, index) => (
              <div key={widget.id} className="flex items-center justify-between p-2 border-b border-[--border]">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{widget.type.replace('-', ' ')}</span>
                  <button 
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="text-xs px-2 py-1 rounded border border-[--border] disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                    className="text-xs px-2 py-1 rounded border border-[--border] disabled:opacity-50"
                  >
                    ↓
                  </button>
                </div>
                <button 
                  onClick={() => toggleWidget(widget.id)}
                  className={`px-3 py-1 text-sm rounded ${
                    widget.visible 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-gray-500/10 text-gray-500'
                  }`}
                >
                  {widget.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {typeof children === 'function' ? children(visibleWidgets, widgets, setWidgets) : children}
    </div>
  );
}