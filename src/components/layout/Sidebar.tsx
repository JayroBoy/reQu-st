import React, { useEffect } from 'react';
import { CollectionTree } from '../collection/CollectionTree';
import { useCollectionStore } from '../../stores/collectionStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { loadCollections } = useCollectionStore();

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <div className="sidebar">
      {/* Collections Section */}
      <div className="sidebar-section">
        <div className="sidebar-header">
          <h3>Collections</h3>
          <button className="sidebar-action-btn" title="New Collection" onClick={() => {
            const name = prompt('Enter new collection name:');
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
        
        <div className="sidebar-content">
          <CollectionTree />
        </div>
      </div>
      
      <div className="sidebar-divider"></div>
      
      {/* History Section */}
      <div className="sidebar-section history-section">
        <div className="sidebar-header">
          <h3>History</h3>
        </div>
        
        <div className="sidebar-content empty">
          <div className="sidebar-empty-state">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <p>No history</p>
          </div>
        </div>
      </div>
    </div>
  );
};
