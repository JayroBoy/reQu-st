import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { Modal } from '../shared/Modal';
import { importService } from '../../services/importService';
import type { ImportResult } from '../../services/importService';

export const ImportDialog: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (activeModal !== 'import') return null;

  const handleClose = () => {
    setActiveModal(null);
    setResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (content) {
          const res = await importService.importFile(content);
          setResult(res);
        }
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setResult({ success: false, warnings: [err.message] });
      setLoading(false);
    }
  };

  return (
    <Modal title="Import Collection" isOpen={true} onClose={handleClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
        
        {!result && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select a Postman Collection v2.1 JSON or Insomnia v4 Export JSON file to import.
            </p>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileChange}
              disabled={loading}
              style={{
                padding: '12px',
                border: '1px dashed var(--border)',
                borderRadius: '4px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            />
            {loading && <p style={{ color: 'var(--text-secondary)' }}>Importing...</p>}
          </>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ color: result.success ? 'var(--color-success)' : 'var(--color-error)' }}>
              {result.success ? 'Import Successful' : 'Import Failed'}
            </h4>
            
            {result.collectionName && (
              <p>Collection: <strong>{result.collectionName}</strong></p>
            )}

            {result.warnings.length > 0 && (
              <div style={{ 
                background: 'var(--bg-primary)', 
                padding: '12px', 
                borderRadius: '4px',
                borderLeft: '4px solid var(--color-warning)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <h5 style={{ margin: '0 0 8px 0', color: 'var(--color-warning)' }}>Warnings</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                onClick={handleClose}
                style={{
                  background: 'var(--brand-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
