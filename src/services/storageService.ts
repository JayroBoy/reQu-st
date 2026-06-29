import { invoke } from '@tauri-apps/api/core';

/**
 * Thin wrapper around the Rust FS Tauri commands.
 * All paths are relative to the active workspace root (managed by WorkspaceState in Rust).
 * All other services use this instead of calling invoke() directly.
 */
export const storageService = {
  /** Read a file and return its string content. */
  async load(relativePath: string): Promise<string> {
    return invoke<string>('load_file', { relativePath });
  },

  /** Write string content to a file. Creates parent dirs automatically. */
  async save(relativePath: string, content: string): Promise<void> {
    return invoke<void>('save_file', { relativePath, content });
  },

  /** Delete a file. Throws if the file doesn't exist. */
  async delete(relativePath: string): Promise<void> {
    return invoke<void>('delete_file', { relativePath });
  },

  /** List file names (not full paths) in a directory. Returns [] if the dir doesn't exist. */
  async listDirectory(relativePath: string): Promise<string[]> {
    return invoke<string[]>('list_directory', { relativePath });
  },

  /** Ensure a directory exists, creating it and all parents recursively. */
  async ensureDirectory(relativePath: string): Promise<void> {
    return invoke<void>('ensure_directory', { relativePath });
  },
};
