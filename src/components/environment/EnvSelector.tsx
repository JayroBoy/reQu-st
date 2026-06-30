import React, { useEffect, useRef, useState } from 'react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useUIStore } from '../../stores/uiStore';
import './EnvSelector.css';

export const EnvSelector: React.FC = () => {
  const { environments, activeEnvName, setActiveEnv } = useEnvironmentStore();
  const { setActiveModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Ctrl+E — quick-switch environment focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (name: string | null) => {
    setActiveEnv(name);
    setIsOpen(false);
  };

  const handleManage = () => {
    setIsOpen(false);
    setActiveModal('env-manager');
  };



  return (
    <div className="env-selector" ref={dropdownRef}>
      <button
        id="env-selector-trigger"
        className={`env-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Switch environment (Ctrl+E)"
      >
        {activeEnvName ? (
          <>
            <span className="env-dot" />
            <span className="env-label">{activeEnvName}</span>
          </>
        ) : (
          <span className="env-label env-label--none">No Environment</span>
        )}
        <svg
          className={`env-caret ${isOpen ? 'rotated' : ''}`}
          viewBox="0 0 12 12"
          width="10"
          height="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </button>

      {isOpen && (
        <div className="env-dropdown" role="listbox" aria-label="Select environment">
          {/* No environment option */}
          <button
            className={`env-option ${activeEnvName === null ? 'active' : ''}`}
            onClick={() => handleSelect(null)}
            role="option"
            aria-selected={activeEnvName === null}
          >
            <span className="env-option-dot env-option-dot--none" />
            <span>No Environment</span>
            {activeEnvName === null && (
              <svg className="env-check" viewBox="0 0 12 12" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            )}
          </button>

          {environments.length > 0 && <div className="env-divider" />}

          {/* Named environments */}
          {environments.map((env) => (
            <button
              key={env.name}
              className={`env-option ${activeEnvName === env.name ? 'active' : ''}`}
              onClick={() => handleSelect(env.name)}
              role="option"
              aria-selected={activeEnvName === env.name}
            >
              <span className="env-option-dot" />
              <span>{env.name}</span>
              {activeEnvName === env.name && (
                <svg className="env-check" viewBox="0 0 12 12" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </button>
          ))}

          {environments.length === 0 && (
            <div className="env-empty">No environments yet</div>
          )}

          <div className="env-divider" />

          {/* Manage link */}
          <button className="env-manage-btn" onClick={handleManage} id="env-manage-trigger">
            <svg viewBox="0 0 14 14" width="12" height="12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round">
              <circle cx="7" cy="7" r="2.5" />
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M10.01 3.99l1.06-1.06M2.93 11.07l1.06-1.06" />
            </svg>
            Manage Environments
          </button>
        </div>
      )}
    </div>
  );
};
