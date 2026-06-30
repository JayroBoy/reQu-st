import React, { useState, useEffect } from 'react';
import { useCollectionStore } from '../../stores/collectionStore';
import { useRequestStore } from '../../stores/requestStore';
import { useUIStore } from '../../stores/uiStore';
import { collectionService } from '../../services/collectionService';
import { Modal } from '../shared/Modal';
import type { CollectionItem } from '../../types/collection';

export const SaveToCollectionDialog: React.FC = () => {
  const { collections, addRequest, createCollection } = useCollectionStore();
  const { tabs, activeTabId, updateTab, markClean } = useRequestStore();
  const { setActiveModal } = useUIStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const [requestName, setRequestName] = useState(activeTab?.name || 'New Request');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  useEffect(() => {
    if (collections.length > 0 && !selectedCollectionId) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  if (!activeTab) return null;

  const handleClose = () => {
    setActiveModal(null);
  };

  const handleSave = async () => {
    let targetCollectionId = selectedCollectionId;

    if (isCreatingCollection) {
      if (!newCollectionName.trim()) {
        alert('Please enter a collection name');
        return;
      }
      await createCollection(newCollectionName.trim());
      // The newly created collection will be at the end, or we can just find it by name.
      // But Zustand store update is async. For simplicity, we just created it.
      // We really should return the created collection from createCollection, but let's just find it:
      const newCols = useCollectionStore.getState().collections;
      const created = newCols.find(c => c.name === newCollectionName.trim());
      if (created) {
        targetCollectionId = created.id;
      }
    }

    if (!targetCollectionId) {
      alert('Please select or create a collection');
      return;
    }

    // Update tab first
    updateTab(activeTab.id, {
      name: requestName.trim() || 'New Request',
      collectionId: targetCollectionId,
      folderId: selectedFolderId || undefined,
    });

    // Get the updated tab to convert
    const updatedTab = useRequestStore.getState().tabs.find(t => t.id === activeTab.id)!;
    const req = collectionService.requestToCollectionRequest(updatedTab);

    await addRequest(targetCollectionId, selectedFolderId, req);
    markClean(activeTab.id);
    handleClose();
  };

  const renderFolderOptions = (items: CollectionItem[], depth = 0): React.ReactNode[] => {
    let options: React.ReactNode[] = [];
    for (const item of items) {
      if (item.type === 'folder') {
        const prefix = '—'.repeat(depth + 1) + ' ';
        options.push(
          <option key={item.id} value={item.id}>
            {prefix}{item.name}
          </option>
        );
        options = options.concat(renderFolderOptions(item.items, depth + 1));
      }
    }
    return options;
  };

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  return (
    <Modal title="Save Request" onClose={handleClose} isOpen={true}>
      <div className="save-dialog" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '400px' }}>
        <div className="form-group">
          <label>Request Name</label>
          <input
            type="text"
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="e.g. Get User Profile"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Save to Collection</label>
          {isCreatingCollection ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New Collection Name"
                style={{ flex: 1 }}
              />
              <button onClick={() => setIsCreatingCollection(false)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                style={{ flex: 1 }}
              >
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => setIsCreatingCollection(true)}>New</button>
            </div>
          )}
        </div>

        {!isCreatingCollection && selectedCollection && (
          <div className="form-group">
            <label>Folder (Optional)</label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
            >
              <option value="">/ (Root)</option>
              {renderFolderOptions(selectedCollection.items)}
            </select>
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="secondary-btn" onClick={handleClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </Modal>
  );
};
