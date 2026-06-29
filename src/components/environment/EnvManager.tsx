import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../shared/Modal';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useUIStore } from '../../stores/uiStore';
import { environmentService } from '../../services/environmentService';
import { invoke } from '@tauri-apps/api/core';
import type { WorkspaceInfo } from '../../types/workspace';
import './EnvManager.css';

type ActivePanel = string; // env name, or 'globals'

export const EnvManager: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();
  const {
    environments,
    globals,
    activeEnvName,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setVariable,
    deleteVariable,
  } = useEnvironmentStore();

  const isOpen = activeModal === 'env-manager';

  // Which env is being edited in the right panel
  const [selectedPanel, setSelectedPanel] = useState<ActivePanel>('globals');

  // New environment creation
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvError, setNewEnvError] = useState('');
  const [showNewEnvInput, setShowNewEnvInput] = useState(false);
  const newEnvInputRef = useRef<HTMLInputElement>(null);

  // Variable addition
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Rename
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  // Workspace info
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      invoke<WorkspaceInfo>('get_workspace_info')
        .then(setWorkspaceInfo)
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (showNewEnvInput) {
      newEnvInputRef.current?.focus();
    }
  }, [showNewEnvInput]);

  const close = () => setActiveModal(null);

  const selectedEnv =
    selectedPanel === 'globals'
      ? globals
      : environments.find((e) => e.name === selectedPanel) ?? globals;

  // ── New env ──────────────────────────────────────────────────────────────

  const handleCreateEnv = async () => {
    const err = environmentService.validateName(newEnvName.trim());
    if (err) {
      setNewEnvError(err);
      return;
    }
    try {
      await createEnvironment(newEnvName.trim());
      setSelectedPanel(newEnvName.trim());
      setNewEnvName('');
      setNewEnvError('');
      setShowNewEnvInput(false);
    } catch (e: unknown) {
      setNewEnvError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleNewEnvKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateEnv();
    if (e.key === 'Escape') {
      setShowNewEnvInput(false);
      setNewEnvName('');
      setNewEnvError('');
    }
  };

  // ── Rename ───────────────────────────────────────────────────────────────

  const startRename = () => {
    setRenameValue(selectedPanel);
    setRenameError('');
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const newName = renameValue.trim();
    if (newName === selectedPanel) {
      setIsRenaming(false);
      return;
    }
    const err = environmentService.validateName(newName);
    if (err) {
      setRenameError(err);
      return;
    }
    try {
      const env = environments.find((e) => e.name === selectedPanel)!;
      await updateEnvironment(selectedPanel, { ...env, name: newName });
      setSelectedPanel(newName);
      setIsRenaming(false);
      setRenameError('');
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : String(e));
    }
  };

  // ── Delete env ───────────────────────────────────────────────────────────

  const handleDeleteEnv = async () => {
    if (selectedPanel === 'globals') return;
    if (!confirm(`Delete environment "${selectedPanel}"? This cannot be undone.`)) return;
    await deleteEnvironment(selectedPanel);
    setSelectedPanel('globals');
  };

  // ── Variables ─────────────────────────────────────────────────────────────

  const handleAddVariable = async () => {
    if (!newKey.trim()) return;
    await setVariable(selectedPanel, newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
  };

  const handleAddVarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddVariable();
  };

  const handleVariableValueChange = async (key: string, value: string) => {
    await setVariable(selectedPanel, key, value);
  };

  const handleDeleteVariable = async (key: string) => {
    await deleteVariable(selectedPanel, key);
  };

  // ── Workspace ─────────────────────────────────────────────────────────────

  const handleOpenWorkspace = async () => {
    try {
      const previousEnvName = activeEnvName;
      const info = await invoke<WorkspaceInfo>('open_workspace');
      setWorkspaceInfo(info);
      // Reload envs, trying to restore the previous active env
      await loadEnvironments(previousEnvName);
    } catch (e) {
      console.error('Failed to open workspace:', e);
    }
  };

  const handleResetWorkspace = async () => {
    try {
      const previousEnvName = activeEnvName;
      const info = await invoke<WorkspaceInfo>('reset_to_default_workspace');
      setWorkspaceInfo(info);
      await loadEnvironments(previousEnvName);
    } catch (e) {
      console.error('Failed to reset workspace:', e);
    }
  };

  const variables = Object.entries(selectedEnv.variables);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Environments"
      width="760px"
    >
      <div className="env-manager">
        {/* ── Left: env list ─────────────────────────────────────────── */}
        <aside className="env-list-panel">
          <div className="env-list-scroll">
            {/* Globals — always first */}
            <button
              className={`env-list-item ${selectedPanel === 'globals' ? 'selected' : ''}`}
              onClick={() => {
                setSelectedPanel('globals');
                setIsRenaming(false);
              }}
            >
              <span className="env-list-dot env-list-dot--globals" />
              <span className="env-list-name">globals</span>
              <span className="env-list-badge">always on</span>
            </button>

            {environments.map((env) => (
              <button
                key={env.name}
                className={`env-list-item ${selectedPanel === env.name ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedPanel(env.name);
                  setIsRenaming(false);
                }}
              >
                <span className="env-list-dot" />
                <span className="env-list-name">{env.name}</span>
                {activeEnvName === env.name && (
                  <span className="env-list-badge env-list-badge--active">active</span>
                )}
              </button>
            ))}

            {/* New env input */}
            {showNewEnvInput && (
              <div className="env-new-input-row">
                <input
                  ref={newEnvInputRef}
                  className={`env-new-input ${newEnvError ? 'input-error' : ''}`}
                  type="text"
                  placeholder="env-name"
                  value={newEnvName}
                  onChange={(e) => {
                    setNewEnvName(e.target.value);
                    setNewEnvError('');
                  }}
                  onKeyDown={handleNewEnvKeyDown}
                />
                {newEnvError && (
                  <div className="env-input-error">{newEnvError}</div>
                )}
                <div className="env-new-input-actions">
                  <button className="btn-primary-sm" onClick={handleCreateEnv}>
                    Create
                  </button>
                  <button
                    className="btn-ghost-sm"
                    onClick={() => {
                      setShowNewEnvInput(false);
                      setNewEnvName('');
                      setNewEnvError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="env-list-footer">
            <button
              className="btn-ghost-sm"
              onClick={() => setShowNewEnvInput(true)}
              disabled={showNewEnvInput}
              id="env-new-btn"
            >
              <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11" />
                <line x1="1" y1="6" x2="11" y2="6" />
              </svg>
              New Environment
            </button>
          </div>
        </aside>

        {/* ── Right: variable editor ─────────────────────────────────── */}
        <main className="env-vars-panel">
          {/* Panel header */}
          <div className="env-vars-header">
            {isRenaming ? (
              <div className="env-rename-row">
                <input
                  className={`env-rename-input ${renameError ? 'input-error' : ''}`}
                  type="text"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setRenameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                />
                {renameError && (
                  <div className="env-input-error">{renameError}</div>
                )}
                <button className="btn-primary-sm" onClick={commitRename}>
                  Save
                </button>
                <button
                  className="btn-ghost-sm"
                  onClick={() => setIsRenaming(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h3 className="env-vars-title">
                  <span className="env-vars-title-dot" />
                  {selectedEnv.name}
                </h3>
                <div className="env-vars-actions">
                  {selectedPanel !== 'globals' && (
                    <>
                      <button
                        className="btn-ghost-sm"
                        onClick={startRename}
                        title="Rename environment"
                      >
                        Rename
                      </button>
                      <button
                        className="btn-danger-sm"
                        onClick={handleDeleteEnv}
                        title="Delete environment"
                        id="env-delete-btn"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Variables table */}
          <div className="env-vars-table-wrap">
            {variables.length > 0 ? (
              <table className="env-vars-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {variables.map(([key, value]) => (
                    <tr key={key} className="env-var-row">
                      <td className="env-var-key">{key}</td>
                      <td className="env-var-value">
                        <input
                          className="env-var-input selectable"
                          type="text"
                          defaultValue={value}
                          onBlur={(e) => {
                            if (e.target.value !== value) {
                              handleVariableValueChange(key, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </td>
                      <td className="env-var-delete-col">
                        <button
                          className="env-var-delete-btn"
                          onClick={() => handleDeleteVariable(key)}
                          title={`Delete variable "${key}"`}
                        >
                          <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                            <line x1="1" y1="1" x2="11" y2="11" />
                            <line x1="11" y1="1" x2="1" y2="11" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="env-vars-empty">
                No variables yet. Add one below.
              </div>
            )}
          </div>

          {/* Add variable row */}
          <div className="env-add-var-row">
            <input
              className="env-add-key selectable"
              type="text"
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={handleAddVarKeyDown}
            />
            <input
              className="env-add-value selectable"
              type="text"
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleAddVarKeyDown}
            />
            <button
              className="btn-primary-sm"
              onClick={handleAddVariable}
              disabled={!newKey.trim()}
            >
              Add
            </button>
          </div>

          {/* Workspace info */}
          <div className="env-workspace-bar">
            <div className="env-workspace-info">
              <span className="env-workspace-label">Workspace:</span>
              <span
                className="env-workspace-path selectable"
                title={workspaceInfo?.root ?? ''}
              >
                {workspaceInfo?.is_default
                  ? 'Default ($APPDATA/reQuæst)'
                  : workspaceInfo?.root ?? '…'}
              </span>
            </div>
            <div className="env-workspace-actions">
              <button
                className="btn-ghost-sm"
                onClick={handleOpenWorkspace}
                id="open-workspace-btn"
              >
                Open Workspace
              </button>
              {workspaceInfo && !workspaceInfo.is_default && (
                <button
                  className="btn-ghost-sm"
                  onClick={handleResetWorkspace}
                >
                  Reset to Default
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </Modal>
  );
};
