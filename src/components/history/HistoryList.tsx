import React, { useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { useRequestStore } from '../../stores/requestStore';
import { collectionService } from '../../services/collectionService';
import { MethodBadge } from '../shared/MethodBadge';
import './HistoryList.css';

export const HistoryList: React.FC = () => {
  const { entries, clearHistory } = useHistoryStore();
  const { addTab } = useRequestStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      entry.url.toLowerCase().includes(lower) ||
      entry.method.toLowerCase().includes(lower) ||
      entry.status.toString().includes(lower)
    );
  });

  const handleOpenEntry = (entry: any) => {
    const tabPatch = collectionService.collectionRequestToTab(entry.request, '', '');
    // Remove collection/folder IDs so it opens as an unsaved historical copy
    delete tabPatch.collectionId;
    delete tabPatch.folderId;
    addTab(tabPatch);
  };

  return (
    <div className="history-list">
      <div className="history-search-container">
        <input
          type="text"
          placeholder="Search history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="history-search-input"
        />
        {entries.length > 0 && (
          <button 
            className="history-clear-btn" 
            title="Clear History"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all history?')) {
                clearHistory();
              }
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="history-items">
        {filteredEntries.length === 0 ? (
          <div className="history-empty-state">
            <p>{entries.length === 0 ? 'No history yet' : 'No matching entries'}</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="history-item" 
              onClick={() => handleOpenEntry(entry)}
              title={entry.url}
            >
              <div className="history-item-header">
                <MethodBadge method={entry.method} />
                <span className={`history-status status-${Math.floor(entry.status / 100)}`}>
                  {entry.status}
                </span>
                <span className="history-time">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="history-item-url">{entry.url}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
