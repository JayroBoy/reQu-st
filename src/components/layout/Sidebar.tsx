import React, { useEffect } from 'react';
import { CollectionTree } from '../collection/CollectionTree';
import { HistoryList } from '../history/HistoryList';
import { useCollectionStore } from '../../stores/collectionStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useUIStore } from '../../stores/uiStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { loadCollections, collections } = useCollectionStore();
  const history = useHistoryStore(state => state.entries);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <div className="sidebar">
      {/* Collections Section */}
      <div className="sidebar-section">
        <div className="sidebar-header">
          <h3>Collections</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="sidebar-action-btn" title="Import" onClick={() => useUIStore.getState().setActiveModal('import')}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button className="sidebar-action-btn" title="New Collection" onClick={async () => {
              const name = await useUIStore.getState().requestPrompt({
                title: 'New Collection',
                placeholder: 'Enter collection name',
                submitText: 'Create'
              });
              if (name && name.trim()) {
                useCollectionStore.getState().createCollection(name.trim());
              }
            }}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="sidebar-content">
          {collections.length === 0 ? (
            <div className="sidebar-empty-state fade-in">
              <p>No collections yet</p>
              <button 
                className="text-btn" 
                style={{ color: 'var(--accent-primary)', marginTop: '8px', cursor: 'pointer' }}
                onClick={() => useUIStore.getState().setActiveModal('import')}
              >
                Import Postman/Insomnia
              </button>
            </div>
          ) : (
            <CollectionTree />
          )}
        </div>
      </div>
      
      <div className="sidebar-divider"></div>
      
      {/* History Section */}
      <div className="sidebar-section history-section">
        <div className="sidebar-header">
          <h3>History</h3>
        </div>
        <div className="sidebar-content">
          {history.length === 0 ? (
            <div className="sidebar-empty-state fade-in">
              <p>No history yet</p>
            </div>
          ) : (
            <HistoryList />
          )}
        </div>
      </div>
    </div>
  );
};
