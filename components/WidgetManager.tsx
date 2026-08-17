"use client";

import { useState, useEffect } from 'react';
import { DashboardWidget, getUserDashboardWidgets, saveUserDashboardWidgets } from '../lib/dashboard';

export function WidgetManager({ 
  children,
  onWidgetsChange 
}: { 
  children: React.ReactNode;
  onWidgetsChange?: (widgets: DashboardWidget[]) => void;
}) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedWidgets = getUserDashboardWidgets();
    setWidgets(savedWidgets);
  }, []);

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map(widget => 
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    );
    setWidgets(updatedWidgets);
    saveUserDashboardWidgets(updatedWidgets);
    onWidgetsChange?.(updatedWidgets);
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return;

    const newWidgets = [...widgets];
    if (direction === 'up' && index > 0) {
      [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]];
    } else if (direction === 'down' && index < newWidgets.length - 1) {
      [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    }

    // Re-sort by position
    newWidgets.sort((a, b) => a.position - b.position);
    setWidgets(newWidgets);
    saveUserDashboardWidgets(newWidgets);
    onWidgetsChange?.(newWidgets);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
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
          <h3 className="font-medium mb-3">Widget Management</h3>
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
      
      {children}
    </div>
  );
}