import React, { useState } from 'react';
import { useCollectionStore } from '../../stores/collectionStore';
import { useUIStore } from '../../stores/uiStore';
import { FolderNode } from './FolderNode';
import { RequestNode } from './RequestNode';
import type { Collection } from '../../types/collection';

export const CollectionTree: React.FC = () => {
  const { collections, expandedFolders, toggleFolder, createCollection, deleteCollection, renameCollection, addFolder } = useCollectionStore();
  const { setEditingCollectionId, setActiveModal } = useUIStore();
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleCreateCollection = async () => {
    const name = await useUIStore.getState().requestPrompt({
      title: 'New Collection',
      placeholder: 'Enter collection name',
      submitText: 'Create'
    });
    if (name && name.trim()) {
      createCollection(name.trim());
    }
  };

  const handleToggle = (id: string) => {
    toggleFolder(id);
  };

  const handleAddFolder = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    const name = await useUIStore.getState().requestPrompt({
      title: 'New Folder',
      placeholder: 'Enter folder name',
      submitText: 'Create'
    });
    if (name && name.trim()) {
      addFolder(collectionId, null, name.trim());
      if (!expandedFolders.has(collectionId)) toggleFolder(collectionId);
    }
    setActiveMenuId(null);
  };

  const handleEditVariables = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    setEditingCollectionId(collectionId);
    setActiveModal('collectionVariables');
    setActiveMenuId(null);
  };

  const handleRename = async (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation();
    const newName = await useUIStore.getState().requestPrompt({
      title: 'Rename Collection',
      defaultValue: collection.name,
      submitText: 'Rename'
    });
    if (newName && newName.trim()) {
      renameCollection(collection.id, newName.trim());
    }
    setActiveMenuId(null);
  };

  const handleDelete = (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete collection "${collection.name}"?`)) {
      deleteCollection(collection.id);
    }
    setActiveMenuId(null);
  };

  if (collections.length === 0) {
    return (
      <div className="sidebar-empty-state">
        <p>No collections yet</p>
        <p className="sidebar-empty-hint">Create a collection to organize your requests</p>
        <button className="primary-btn" onClick={handleCreateCollection} style={{ marginTop: '1rem' }}>
          Create Collection
        </button>
      </div>
    );
  }

  return (
    <div className="collection-tree" onMouseLeave={() => setActiveMenuId(null)}>
      {collections.map(collection => {
        const isExpanded = expandedFolders.has(collection.id);
        const showMenu = activeMenuId === collection.id;

        return (
          <div key={collection.id} className="tree-node-container">
            <div 
              className="tree-node tree-node--collection"
              style={{ paddingLeft: '8px' }}
              onClick={() => handleToggle(collection.id)}
            >
              <div className="tree-node-header">
                <span className={`tree-node-chevron ${isExpanded ? 'expanded' : ''}`}>▶</span>
                <span className="tree-node-name" title={collection.name}>{collection.name}</span>
                
                <div className="tree-node-actions">
                  <button 
                    className="tree-node-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(showMenu ? null : collection.id); }}
                  >
                    ...
                  </button>
                  
                  {showMenu && (
                    <div className="context-menu" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => handleAddFolder(e, collection.id)}>Add Folder</button>
                      <button onClick={(e) => handleEditVariables(e, collection.id)}>Edit Variables</button>
                      <button onClick={(e) => handleRename(e, collection)}>Rename</button>
                      <button className="danger" onClick={(e) => handleDelete(e, collection)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {isExpanded && (
              <div className="tree-node-children">
                {collection.items.map(item => (
                  item.type === 'folder' 
                    ? <FolderNode key={item.id} collectionId={collection.id} folder={item} depth={1} />
                    : <RequestNode key={item.id} collectionId={collection.id} request={item} depth={1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
