/**
 * Resolves all {{variable}} placeholders in a template string.
 *
 * Resolution priority (highest wins):
 *   collectionVars → activeEnvVars → globalVars
 *
 * Unresolved {{variables}} are left as-is (not replaced with empty string).
 */
export function interpolate(
  template: string,
  collectionVars: Record<string, string> = {},
  envVars: Record<string, string> = {},
  globalVars: Record<string, string> = {},
): string {
  // Merge with priority — later spreads win
  const merged: Record<string, string> = {
    ...globalVars,
    ...envVars,
    ...collectionVars,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(merged, key)
      ? merged[key]
      : `{{${key}}}`; // leave unresolved vars as-is
  });
}

/**
 * Returns an array of all {{variable}} names referenced in a template string.
 * Useful for highlighting unresolved variables in the URL bar.
 */
export function extractVariableNames(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

/**
 * Returns variable names from the template that are NOT present in the merged var map.
 */
export function findUnresolvedVariables(
  template: string,
  collectionVars: Record<string, string> = {},
  envVars: Record<string, string> = {},
  globalVars: Record<string, string> = {},
): string[] {
  const merged = { ...globalVars, ...envVars, ...collectionVars };
  return extractVariableNames(template).filter(
    (name) => !Object.prototype.hasOwnProperty.call(merged, name),
  );
}
