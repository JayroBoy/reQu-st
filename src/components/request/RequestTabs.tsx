import React, { useRef } from 'react';
import type { RequestTab } from '../../types/request';
import { useUIStore } from '../../stores/uiStore';
import { useRequestStore } from '../../stores/requestStore';
import { MethodBadge } from '../shared/MethodBadge';
import './RequestTabs.css';

interface RequestTabsProps {
  tabs: RequestTab[];
  activeTabId: string | null;
  onAddTab: () => void;
  onCloseTab: (id: string) => void;
  onSelectTab: (id: string) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onAddTab,
  onCloseTab,
  onSelectTab,
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsContainerRef.current) {
      // Convert vertical scroll to horizontal scroll
      if (e.deltaY !== 0) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleMiddleClick = (e: React.MouseEvent, id: string) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      onCloseTab(id);
    }
  };

  const handleRename = async (e: React.MouseEvent, tab: RequestTab) => {
    e.stopPropagation();
    const newName = await useUIStore.getState().requestPrompt({
      title: 'Rename Tab',
      defaultValue: tab.name,
      submitText: 'Rename'
    });
    if (newName && newName.trim()) {
      useRequestStore.getState().updateTab(tab.id, { name: newName.trim() });
    }
  };

  return (
    <div className="request-tabs-bar">
      <div 
        className="request-tabs-scrollable" 
        ref={tabsContainerRef}
        onWheel={handleWheel}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`request-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => handleMiddleClick(e, tab.id)}
              title={tab.url || tab.name}
            >
              <MethodBadge method={tab.method} className="tab-method-badge" />
              <span 
                className="tab-name" 
                onDoubleClick={(e) => handleRename(e, tab)}
                title="Double-click to rename"
                style={{ cursor: 'text' }}
              >
                {tab.name}
              </span>
              {tab.isDirty && <span className="tab-dirty-dot">●</span>}
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close Tab (Ctrl+W or Middle Click)"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button className="tab-add-btn" onClick={onAddTab} title="New Tab (Ctrl+N)">
        +
      </button>
    </div>
  );
};
