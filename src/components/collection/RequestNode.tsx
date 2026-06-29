import React, { useState } from 'react';
import type { CollectionRequest } from '../../types/collection';
import { useRequestStore } from '../../stores/requestStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { MethodBadge } from '../shared/MethodBadge';

interface RequestNodeProps {
  collectionId: string;
  request: CollectionRequest;
  depth: number;
}

export const RequestNode: React.FC<RequestNodeProps> = ({ collectionId, request, depth }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { activeTabId, openCollectionRequest } = useRequestStore();
  const { duplicateItem, renameItem, removeItem } = useCollectionStore();

  const isActive = activeTabId === request.id;

  const handleClick = () => {
    openCollectionRequest(request, collectionId);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateItem(collectionId, request.id);
    setShowMenu(false);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('Enter new request name:', request.name);
    if (newName && newName.trim()) {
      renameItem(collectionId, request.id, newName.trim());
    }
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete request "${request.name}"?`)) {
      removeItem(collectionId, request.id);
    }
    setShowMenu(false);
  };

  return (
    <div 
      className={`tree-node tree-node--request ${isActive ? 'tree-node--active' : ''}`}
      style={{ paddingLeft: `${depth * 16}px` }}
      onClick={handleClick}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="tree-node-header">
        <MethodBadge method={request.method} small />
        <span className="tree-node-name" title={request.name}>{request.name}</span>
        
        <div className="tree-node-actions">
          <button 
            className="tree-node-menu-btn"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          >
            ...
          </button>
          
          {showMenu && (
            <div className="context-menu" onClick={e => e.stopPropagation()}>
              <button onClick={handleDuplicate}>Duplicate</button>
              <button onClick={handleRename}>Rename</button>
              <button className="danger" onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
