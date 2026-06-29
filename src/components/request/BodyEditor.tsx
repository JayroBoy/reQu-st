import React from 'react';
import type { RequestTab, KeyValuePair } from '../../types/request';
import { KeyValueEditor } from '../shared/KeyValueEditor';
import './BodyEditor.css';

interface BodyEditorProps {
  tab: RequestTab;
  onChange: (patch: Partial<RequestTab>) => void;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({ tab, onChange }) => {
  const { type, raw, formData, urlencoded } = tab.body;

  const setBodyType = (newType: typeof type) => {
    // Preserve existing content when switching types if possible
    onChange({
      body: { ...tab.body, type: newType }
    });
  };

  const handleRawFormatChange = (format: 'json' | 'xml' | 'text') => {
    onChange({
      body: {
        ...tab.body,
        raw: { content: raw?.content ?? '', format }
      }
    });
  };

  const handleRawContentChange = (content: string) => {
    onChange({
      body: {
        ...tab.body,
        raw: { content, format: raw?.format ?? 'text' }
      }
    });
  };

  const handleFormDataChange = (pairs: KeyValuePair[]) => {
    onChange({
      body: { ...tab.body, formData: pairs }
    });
  };

  const handleUrlEncodedChange = (pairs: KeyValuePair[]) => {
    onChange({
      body: { ...tab.body, urlencoded: pairs }
    });
  };

  return (
    <div className="body-editor">
      <div className="body-type-selector">
        <label>
          <input
            type="radio"
            checked={type === 'none'}
            onChange={() => setBodyType('none')}
          />
          None
        </label>
        <label>
          <input
            type="radio"
            checked={type === 'raw'}
            onChange={() => setBodyType('raw')}
          />
          Raw
        </label>
        <label>
          <input
            type="radio"
            checked={type === 'form-data'}
            onChange={() => setBodyType('form-data')}
          />
          Form Data
        </label>
        <label>
          <input
            type="radio"
            checked={type === 'x-www-form-urlencoded'}
            onChange={() => setBodyType('x-www-form-urlencoded')}
          />
          x-www-form-urlencoded
        </label>

        {type === 'raw' && (
          <select
            className="raw-format-select"
            value={raw?.format ?? 'text'}
            onChange={(e) => handleRawFormatChange(e.target.value as any)}
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
          </select>
        )}
      </div>

      <div className="body-editor-content">
        {type === 'none' && (
          <div className="body-empty-state">
            This request does not have a body.
          </div>
        )}

        {type === 'raw' && (
          <textarea
            className="raw-textarea"
            value={raw?.content ?? ''}
            onChange={(e) => handleRawContentChange(e.target.value)}
            placeholder="Enter raw body content..."
            spellCheck={false}
          />
        )}

        {type === 'form-data' && (
          <KeyValueEditor
            pairs={formData ?? []}
            onChange={handleFormDataChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        )}

        {type === 'x-www-form-urlencoded' && (
          <KeyValueEditor
            pairs={urlencoded ?? []}
            onChange={handleUrlEncodedChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        )}
      </div>
    </div>
  );
};
