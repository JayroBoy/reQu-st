import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { KeyValuePair } from '../../types/request';
import './KeyValueEditor.css';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  suggestions?: string[];
  readOnly?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  suggestions = [],
  readOnly = false,
}) => {
  // Ensure we always have an empty row at the bottom
  const hasEmptyLastRow = pairs.length > 0 && pairs[pairs.length - 1].key === '' && pairs[pairs.length - 1].value === '';
  const displayPairs = hasEmptyLastRow ? pairs : [...pairs, { id: uuidv4(), key: '', value: '', enabled: true }];

  const handleUpdate = (index: number, patch: Partial<KeyValuePair>) => {
    const newPairs = [...displayPairs];
    newPairs[index] = { ...newPairs[index], ...patch };
    
    // If we just edited the last row, the UI will add a new one automatically
    // But we need to filter out completely empty trailing rows before notifying parent
    // to keep the state clean. We'll let the UI append the visual empty row.
    const cleaned = newPairs.filter((p, i) => i !== newPairs.length - 1 || p.key !== '' || p.value !== '');
    onChange(cleaned);
  };

  const handleDelete = (index: number) => {
    const newPairs = displayPairs.filter((_, i) => i !== index);
    const cleaned = newPairs.filter((p, i) => i !== newPairs.length - 1 || p.key !== '' || p.value !== '');
    onChange(cleaned);
  };

  return (
    <div className="kv-editor">
      <div className="kv-header">
        <div className="kv-col-enabled"></div>
        <div className="kv-col-key">{keyPlaceholder}</div>
        <div className="kv-col-value">{valuePlaceholder}</div>
        <div className="kv-col-actions"></div>
      </div>
      <div className="kv-body">
        {displayPairs.map((pair, index) => {
          const isLast = index === displayPairs.length - 1;
          const isEmpty = pair.key === '' && pair.value === '';

          return (
            <div key={pair.id} className={`kv-row ${isEmpty ? 'kv-row-empty' : ''}`}>
              <div className="kv-col-enabled">
                <input
                  type="checkbox"
                  checked={pair.enabled}
                  onChange={(e) => handleUpdate(index, { enabled: e.target.checked })}
                  disabled={readOnly || (isLast && isEmpty)}
                  title={pair.enabled ? 'Disable' : 'Enable'}
                />
              </div>
              <div className="kv-col-key">
                <input
                  type="text"
                  value={pair.key}
                  placeholder={keyPlaceholder}
                  onChange={(e) => handleUpdate(index, { key: e.target.value })}
                  disabled={readOnly}
                  list={suggestions.length > 0 ? `suggestions-${keyPlaceholder}` : undefined}
                />
              </div>
              <div className="kv-col-value">
                <input
                  type="text"
                  value={pair.value}
                  placeholder={valuePlaceholder}
                  onChange={(e) => handleUpdate(index, { value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLast) {
                      e.preventDefault();
                      // Focus the next row's key input (would need refs to do properly, simple for now)
                    }
                  }}
                  disabled={readOnly}
                />
              </div>
              <div className="kv-col-actions">
                <button
                  type="button"
                  className="kv-btn-delete"
                  onClick={() => handleDelete(index)}
                  disabled={readOnly || (isLast && isEmpty)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <datalist id={`suggestions-${keyPlaceholder}`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
};
