import React from 'react';
import './ScriptConsole.css';

interface ScriptConsoleProps {
  logs: string[];
}

export const ScriptConsole: React.FC<ScriptConsoleProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="script-console empty">
        No console output.
      </div>
    );
  }

  return (
    <div className="script-console">
      {logs.map((log, index) => {
        const isError = log.startsWith('Error:');
        return (
          <div key={index} className={`sc-log-line ${isError ? 'sc-error' : ''}`}>
            <span className="sc-timestamp">
              {new Date().toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="sc-message">{log}</span>
          </div>
        );
      })}
    </div>
  );
};
