import React, { useState } from 'react';
import type { CollectionFolder } from '../../types/collection';
import { useCollectionStore } from '../../stores/collectionStore';
import { RequestNode } from './RequestNode';

interface FolderNodeProps {
  collectionId: string;
  folder: CollectionFolder;
  depth: number;
}

export const FolderNode: React.FC<FolderNodeProps> = ({ collectionId, folder, depth }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { expandedFolders, toggleFolder, addFolder, renameItem, removeItem } = useCollectionStore();

  const isExpanded = expandedFolders.has(folder.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolder(folder.id);
  };

  const handleAddFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
      addFolder(collectionId, folder.id, name.trim());
      if (!isExpanded) toggleFolder(folder.id);
    }
    setShowMenu(false);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('Enter new folder name:', folder.name);
    if (newName && newName.trim()) {
      renameItem(collectionId, folder.id, newName.trim());
    }
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
      removeItem(collectionId, folder.id);
    }
    setShowMenu(false);
  };

  return (
    <div className="tree-node-container" onMouseLeave={() => setShowMenu(false)}>
      <div 
        className="tree-node tree-node--folder"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={handleToggle}
      >
        <div className="tree-node-header">
          <span className={`tree-node-chevron ${isExpanded ? 'expanded' : ''}`}>▶</span>
          <span className="tree-node-icon">{isExpanded ? '📂' : '📁'}</span>
          <span className="tree-node-name" title={folder.name}>{folder.name}</span>
          
          <div className="tree-node-actions">
            <button 
              className="tree-node-menu-btn"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              ...
            </button>
            
            {showMenu && (
              <div className="context-menu" onClick={e => e.stopPropagation()}>
                <button onClick={handleAddFolder}>Add Folder</button>
                <button onClick={handleRename}>Rename</button>
                <button className="danger" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="tree-node-children">
          {folder.items.map(item => (
            item.type === 'folder' 
              ? <FolderNode key={item.id} collectionId={collectionId} folder={item} depth={depth + 1} />
              : <RequestNode key={item.id} collectionId={collectionId} request={item} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
