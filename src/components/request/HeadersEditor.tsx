import React from 'react';
import type { RequestTab, KeyValuePair } from '../../types/request';
import { KeyValueEditor } from '../shared/KeyValueEditor';

const COMMON_HEADERS = [
  'Accept', 'Accept-Encoding', 'Authorization', 'Cache-Control', 
  'Content-Length', 'Content-Type', 'Cookie', 'Host', 
  'If-Modified-Since', 'If-None-Match', 'Origin', 'Pragma', 
  'Referer', 'User-Agent', 'X-API-Key', 'X-Forwarded-For', 
  'X-Request-ID', 'X-Requested-With', 'X-Total-Count', 'X-CSRF-Token'
];

interface HeadersEditorProps {
  tab: RequestTab;
  onChange: (patch: Partial<RequestTab>) => void;
}

export const HeadersEditor: React.FC<HeadersEditorProps> = ({ tab, onChange }) => {
  const handleHeadersChange = (newPairs: KeyValuePair[]) => {
    onChange({ headers: newPairs });
  };

  return (
    <div className="headers-editor p-4">
      <KeyValueEditor
        pairs={tab.headers}
        onChange={handleHeadersChange}
        keyPlaceholder="Header"
        valuePlaceholder="Value"
        suggestions={COMMON_HEADERS}
      />
    </div>
  );
};
