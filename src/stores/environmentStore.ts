import { create } from 'zustand';
import type { Environment } from '../types/environment';
import { environmentService } from '../services/environmentService';

const ACTIVE_ENV_STORAGE_KEY = 'requaest-active-env';

interface EnvironmentState {
  /** All named environments, sorted alphabetically. Does NOT include globals. */
  environments: Environment[];
  /** The always-active globals environment. */
  globals: Environment;
  /** Name of the active named environment, or null if none selected. */
  activeEnvName: string | null;
  /** Whether the environment data has been loaded from disk. */
  isLoaded: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Load all environments from the current workspace. Called on app startup and workspace switch. */
  loadEnvironments: (restoreEnvName?: string | null) => Promise<void>;

  /** Set the active environment by name (null = no active env, only globals). */
  setActiveEnv: (name: string | null) => void;

  /** Create a new empty environment and persist it. */
  createEnvironment: (name: string) => Promise<void>;

  /** Update (rename or change variables of) an existing environment and persist. */
  updateEnvironment: (oldName: string, updated: Environment) => Promise<void>;

  /** Delete a named environment. Resets active env to null if it was active. */
  deleteEnvironment: (name: string) => Promise<void>;

  /** Update a single variable in an environment and persist. */
  setVariable: (envName: string, key: string, value: string) => Promise<void>;

  /** Delete a single variable from an environment and persist. */
  deleteVariable: (envName: string, key: string) => Promise<void>;

  // ── Derived ────────────────────────────────────────────────────────────────

  /**
   * Returns merged variables in priority order: collection → activeEnv → globals.
   * Pass collectionVars when inside a collection request context.
   */
  resolveVariables: (collectionVars?: Record<string, string>) => Record<string, string>;
}

const getStoredActiveEnv = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_ENV_STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistActiveEnv = (name: string | null): void => {
  try {
    if (name === null) {
      localStorage.removeItem(ACTIVE_ENV_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_ENV_STORAGE_KEY, name);
    }
  } catch {
    // localStorage may not be available in some contexts
  }
};

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  globals: { name: 'globals', variables: {} },
  activeEnvName: getStoredActiveEnv(),
  isLoaded: false,

  loadEnvironments: async (restoreEnvName?: string | null) => {
    const [envs, globals] = await Promise.all([
      environmentService.loadAll(),
      environmentService.loadGlobals(),
    ]);

    // Determine which env to restore
    const targetName =
      restoreEnvName !== undefined ? restoreEnvName : get().activeEnvName;

    const restoredName =
      targetName && envs.some((e) => e.name === targetName)
        ? targetName
        : null;

    persistActiveEnv(restoredName);

    set({
      environments: envs,
      globals,
      activeEnvName: restoredName,
      isLoaded: true,
    });
  },

  setActiveEnv: (name) => {
    persistActiveEnv(name);
    set({ activeEnvName: name });
  },

  createEnvironment: async (name) => {
    const validation = environmentService.validateName(name);
    if (validation) throw new Error(validation);

    const existing = get().environments.find((e) => e.name === name);
    if (existing) throw new Error(`Environment "${name}" already exists`);

    const newEnv: Environment = { name, variables: {} };
    await environmentService.save(newEnv);

    set((state) => ({
      environments: [...state.environments, newEnv].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));
  },

  updateEnvironment: async (oldName, updated) => {
    if (oldName === 'globals') {
      await environmentService.save(updated);
      set({ globals: updated });
      return;
    }

    // If renamed, delete the old file
    if (oldName !== updated.name) {
      const validation = environmentService.validateName(updated.name);
      if (validation) throw new Error(validation);

      const nameConflict = get().environments.find(
        (e) => e.name === updated.name && e.name !== oldName,
      );
      if (nameConflict) throw new Error(`Environment "${updated.name}" already exists`);

      await environmentService.delete(oldName);

      // Update active env reference if this was the active one
      if (get().activeEnvName === oldName) {
        persistActiveEnv(updated.name);
        set({ activeEnvName: updated.name });
      }
    }

    await environmentService.save(updated);

    set((state) => ({
      environments: state.environments
        .map((e) => (e.name === oldName ? updated : e))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  deleteEnvironment: async (name) => {
    await environmentService.delete(name);
    const wasActive = get().activeEnvName === name;

    set((state) => ({
      environments: state.environments.filter((e) => e.name !== name),
      activeEnvName: wasActive ? null : state.activeEnvName,
    }));

    if (wasActive) persistActiveEnv(null);
  },

  setVariable: async (envName, key, value) => {
    if (envName === 'globals') {
      const updated: Environment = {
        ...get().globals,
        variables: { ...get().globals.variables, [key]: value },
      };
      await environmentService.save(updated);
      set({ globals: updated });
      return;
    }

    const env = get().environments.find((e) => e.name === envName);
    if (!env) throw new Error(`Environment "${envName}" not found`);

    const updated: Environment = {
      ...env,
      variables: { ...env.variables, [key]: value },
    };
    await environmentService.save(updated);

    set((state) => ({
      environments: state.environments.map((e) =>
        e.name === envName ? updated : e,
      ),
    }));
  },

  deleteVariable: async (envName, key) => {
    if (envName === 'globals') {
      const { [key]: _removed, ...rest } = get().globals.variables;
      const updated: Environment = { ...get().globals, variables: rest };
      await environmentService.save(updated);
      set({ globals: updated });
      return;
    }

    const env = get().environments.find((e) => e.name === envName);
    if (!env) throw new Error(`Environment "${envName}" not found`);

    const { [key]: _removed, ...rest } = env.variables;
    const updated: Environment = { ...env, variables: rest };
    await environmentService.save(updated);

    set((state) => ({
      environments: state.environments.map((e) =>
        e.name === envName ? updated : e,
      ),
    }));
  },

  resolveVariables: (collectionVars = {}) => {
    const { environments, globals, activeEnvName } = get();
    const activeEnv = environments.find((e) => e.name === activeEnvName);
    const envVars = activeEnv?.variables ?? {};
    return {
      ...globals.variables,
      ...envVars,
      ...collectionVars,
    };
  },
}));
