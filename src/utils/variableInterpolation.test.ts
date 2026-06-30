import { describe, it, expect } from 'vitest';
import { interpolate, extractVariableNames, findUnresolvedVariables } from './variableInterpolation';

describe('variableInterpolation', () => {
  describe('interpolate', () => {
    it('should replace variables with their values', () => {
      const result = interpolate('Hello {{name}}', {}, { name: 'World' }, {});
      expect(result).toBe('Hello World');
    });

    it('should respect priority: collection > env > global', () => {
      const globals = { var: 'global' };
      const env = { var: 'env' };
      const collection = { var: 'collection' };

      expect(interpolate('{{var}}', {}, {}, globals)).toBe('global');
      expect(interpolate('{{var}}', {}, env, globals)).toBe('env');
      expect(interpolate('{{var}}', collection, env, globals)).toBe('collection');
    });

    it('should leave unresolved variables intact', () => {
      const result = interpolate('Hello {{name}}, {{age}}', {}, { name: 'Alice' }, {});
      expect(result).toBe('Hello Alice, {{age}}');
    });
  });

  describe('extractVariableNames', () => {
    it('should extract unique variable names', () => {
      const result = extractVariableNames('{{a}} and {{b}} and {{a}}');
      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('findUnresolvedVariables', () => {
    it('should return variables not present in any scope', () => {
      const result = findUnresolvedVariables('{{a}} and {{b}}', {}, { a: '1' }, {});
      expect(result).toEqual(['b']);
    });
  });
});
