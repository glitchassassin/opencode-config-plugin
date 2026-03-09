import { describe, it, expect, beforeEach } from 'vitest';
import { createConfigOperations } from './config.js';
import { homedir } from 'os';
import { resolve } from 'path';

describe('ConfigOperations', () => {
  let configOps: ReturnType<typeof createConfigOperations>;

  beforeEach(() => {
    configOps = createConfigOperations();
  });

  describe('getDefaultConfigPath', () => {
    it('should return global config path', () => {
      const path = configOps.getDefaultConfigPath('global');
      expect(path).toBe(resolve(homedir(), '.config/opencode/opencode.json'));
    });

    it('should return project config path', () => {
      const path = configOps.getDefaultConfigPath('project');
      expect(path).toBe(resolve(process.cwd(), 'opencode.json'));
    });
  });

  describe('generateDiff', () => {
    it('should return empty string for identical configs', () => {
      const config = { name: 'test', value: 123 };
      const diff = configOps.generateDiff(config, config);
      expect(diff).toBe('');
    });

    it('should show added properties', () => {
      const original = { name: 'test' };
      const updated = { name: 'test', newValue: 42 };
      const diff = configOps.generateDiff(original, updated);
      expect(diff).toContain('+   "newValue": 42');
    });

    it('should show removed properties', () => {
      const original = { name: 'test', oldValue: 10 };
      const updated = { name: 'test' };
      const diff = configOps.generateDiff(original, updated);
      expect(diff).toContain('-   "oldValue": 10');
    });

    it('should show modified properties', () => {
      const original = { name: 'old' };
      const updated = { name: 'new' };
      const diff = configOps.generateDiff(original, updated);
      expect(diff).toContain('-   "name": "old"');
      expect(diff).toContain('+   "name": "new"');
    });

    it('should handle nested changes', () => {
      const original = { nested: { a: 1, b: 2 } };
      const updated = { nested: { a: 1, b: 3 } };
      const diff = configOps.generateDiff(original, updated);
      expect(diff).toContain('-     "b": 2');
      expect(diff).toContain('+     "b": 3');
    });
  });
});
