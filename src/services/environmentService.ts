import type { Environment } from '../types/environment';
import { storageService } from './storageService';

const ENV_DIR = 'environments';
const GLOBALS_FILE = `${ENV_DIR}/globals.json`;

/**
 * Business logic for environment CRUD.
 * No direct invoke() calls — all I/O goes through storageService.
 */
export const environmentService = {
  /**
   * Load all named environments (everything except globals.json).
   * Returns them sorted alphabetically by name.
   */
  async loadAll(): Promise<Environment[]> {
    const files = await storageService.listDirectory(ENV_DIR);
    const envFiles = files.filter(
      (f) => f.endsWith('.json') && f !== 'globals.json',
    );

    const envs = await Promise.all(
      envFiles.map(async (filename) => {
        const content = await storageService.load(`${ENV_DIR}/${filename}`);
        return JSON.parse(content) as Environment;
      }),
    );

    return envs.sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Load the globals environment. Creates it with empty variables if missing. */
  async loadGlobals(): Promise<Environment> {
    try {
      const content = await storageService.load(GLOBALS_FILE);
      return JSON.parse(content) as Environment;
    } catch {
      const defaults: Environment = { name: 'globals', variables: {} };
      await storageService.save(GLOBALS_FILE, JSON.stringify(defaults, null, 2));
      return defaults;
    }
  },

  /** Persist a named environment to disk. Overwrites if it already exists. */
  async save(env: Environment): Promise<void> {
    if (env.name === 'globals') {
      await storageService.save(GLOBALS_FILE, JSON.stringify(env, null, 2));
    } else {
      await storageService.save(
        `${ENV_DIR}/${env.name}.json`,
        JSON.stringify(env, null, 2),
      );
    }
  },

  /** Delete a named environment file. Cannot delete globals. */
  async delete(name: string): Promise<void> {
    if (name === 'globals') {
      throw new Error('Cannot delete the globals environment');
    }
    await storageService.delete(`${ENV_DIR}/${name}.json`);
  },

  /**
   * Check whether a given name is a valid slug.
   * Rules: lowercase letters, digits, hyphens only. No spaces. Must start with a letter.
   */
  validateName(name: string): string | null {
    if (!name) return 'Name is required';
    if (!/^[a-z][a-z0-9-]*$/.test(name))
      return 'Name must start with a letter and contain only lowercase letters, digits, and hyphens';
    if (name === 'globals') return '"globals" is reserved';
    return null; // valid
  },
};
