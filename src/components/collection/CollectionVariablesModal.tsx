import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCollectionStore } from '../../stores/collectionStore';
import { useUIStore } from '../../stores/uiStore';
import { Modal } from '../shared/Modal';
import { KeyValueEditor } from '../shared/KeyValueEditor';
import type { KeyValuePair } from '../../types/request';

export const CollectionVariablesModal: React.FC = () => {
  const { collections, setCollectionVariables, getCollectionVariables } = useCollectionStore();
  const { editingCollectionId, setEditingCollectionId, setActiveModal } = useUIStore();
  
  const [pairs, setPairs] = useState<KeyValuePair[]>([]);

  const collection = collections.find(c => c.id === editingCollectionId);

  useEffect(() => {
    if (editingCollectionId) {
      const vars = getCollectionVariables(editingCollectionId);
      const initialPairs: KeyValuePair[] = Object.entries(vars).map(([key, value]) => ({
        id: uuidv4(),
        key,
        value,
        enabled: true,
      }));
      setPairs(initialPairs);
    }
  }, [editingCollectionId, getCollectionVariables]);

  const handleClose = () => {
    setActiveModal(null);
    setEditingCollectionId(null);
  };

  const handleSave = async () => {
    if (!editingCollectionId) return;

    const variables: Record<string, string> = {};
    for (const pair of pairs) {
      if (pair.key.trim() && pair.enabled) {
        variables[pair.key.trim()] = pair.value;
      }
    }

    await setCollectionVariables(editingCollectionId, variables);
    handleClose();
  };

  if (!collection) return null;

  return (
    <Modal title={`Variables: ${collection.name}`} onClose={handleClose}>
      <div style={{ width: '600px', height: '400px', display: 'flex', flexDirection: 'column' }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Collection variables override environment variables for all requests within this collection.
        </p>
        
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <KeyValueEditor
            pairs={pairs}
            onChange={setPairs}
            keyPlaceholder="Variable Name"
            valuePlaceholder="Initial Value"
          />
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="secondary-btn" onClick={handleClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save Variables</button>
        </div>
      </div>
    </Modal>
  );
};
