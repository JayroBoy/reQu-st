import React, { useEffect, useRef } from 'react';
import type { RequestTab, KeyValuePair } from '../../types/request';
import { KeyValueEditor } from '../shared/KeyValueEditor';

interface ParamsEditorProps {
  tab: RequestTab;
  onChange: (patch: Partial<RequestTab>) => void;
}

export const ParamsEditor: React.FC<ParamsEditorProps> = ({ tab, onChange }) => {
  // We use a ref to track if a change originated from this component
  // to avoid infinite loops when syncing with the URL
  const isInternalChange = useRef(false);

  // Sync from URL to params (if URL's query string changed externally)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    try {
      const urlObj = new URL(tab.url, 'http://dummy.com'); // dummy base for parsing relative/incomplete URLs
      const searchParams = urlObj.searchParams;
      
      const newParams: KeyValuePair[] = [];
      searchParams.forEach((value, key) => {
        newParams.push({
          id: crypto.randomUUID(), // simple unique id
          key,
          value,
          enabled: true
        });
      });

      // Keep disabled params that were already in the state
      const disabledParams = tab.params.filter(p => !p.enabled);
      
      // If the resulting enabled params differ from tab.params (enabled ones), update state
      // (This is a simplified check. A full robust check would deep-compare).
      
      // For simplicity in this iteration, we just accept the params from URL if they differ in length
      // or simple serialization.
      const currentEnabled = tab.params.filter(p => p.enabled);
      if (currentEnabled.length !== newParams.length || JSON.stringify(currentEnabled.map(p => ({ k: p.key, v: p.value }))) !== JSON.stringify(newParams.map(p => ({ k: p.key, v: p.value })))) {
         isInternalChange.current = true;
         onChange({ params: [...newParams, ...disabledParams] });
      }

    } catch (e) {
      // invalid URL, ignore
    }
  }, [tab.url, tab.params, onChange]);

  const handleParamsChange = (newPairs: KeyValuePair[]) => {
    isInternalChange.current = true;

    // Build new query string
    const enabled = newPairs.filter(p => p.enabled && p.key.trim() !== '');
    let newUrl = tab.url;
    
    try {
      // Split off existing query string
      const qIndex = newUrl.indexOf('?');
      const baseUrl = qIndex >= 0 ? newUrl.substring(0, qIndex) : newUrl;
      
      if (enabled.length > 0) {
        const parts = enabled.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`);
        newUrl = `${baseUrl}?${parts.join('&')}`;
      } else {
        newUrl = baseUrl;
      }
    } catch (e) {
      // ignore
    }

    onChange({ params: newPairs, url: newUrl });
  };

  return (
    <div className="params-editor p-4">
      <KeyValueEditor
        pairs={tab.params}
        onChange={handleParamsChange}
        keyPlaceholder="Query Param"
        valuePlaceholder="Value"
      />
    </div>
  );
};
