import React from 'react';
import type { KeyValuePair } from '../../types/request';
import './ResponseHeaders.css';

interface ResponseHeadersProps {
  headers: KeyValuePair[];
}

export const ResponseHeaders: React.FC<ResponseHeadersProps> = ({ headers }) => {
  if (headers.length === 0) {
    return (
      <div className="response-headers empty">
        No headers received.
      </div>
    );
  }

  return (
    <div className="response-headers">
      <table className="rh-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h, i) => (
            <tr key={h.id || i}>
              <td className="rh-key">{h.key}</td>
              <td className="rh-value">{h.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
