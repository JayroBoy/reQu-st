export interface Environment {
  /** Slug-only identifier, e.g. "dev", "staging". Also the filename (without .json). */
  name: string;
  variables: Record<string, string>;
}
