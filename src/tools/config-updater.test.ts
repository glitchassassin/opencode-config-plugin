import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { configUpdater } from './config-updater.js';

vi.mock('@opencode-ai/plugin', () => ({
  tool: Object.assign(
    (definition: unknown) => definition,
    {
      schema: {
        array: () => ({ optional() { return this; } }),
        object: () => ({ optional() { return this; } }),
        string: () => ({ optional() { return this; } }),
        any: () => ({ optional() { return this; } }),
        boolean: () => ({ optional() { return this; } }),
        enum: () => ({ optional() { return this; } })
      }
    }
  )
}));

describe('configUpdater', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'opencode-config-plugin-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns a diff for a valid dry-run update against the canonical schema', async () => {
    writeFileSync(join(tempDir, 'opencode.json'), JSON.stringify({ share: 'manual' }, null, 2));

    const result = await configUpdater({
      configType: 'project',
      dryRun: true,
      updates: [{ path: '/share', value: 'disabled' }]
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Dry run - validation passed');
    expect(result.appliedUpdates).toEqual([{ path: '/share', value: 'disabled' }]);
    expect(result.diff).toContain('-   "share": "manual"');
    expect(result.diff).toContain('+   "share": "disabled"');
    expect(JSON.parse(readFileSync(join(tempDir, 'opencode.json'), 'utf-8'))).toEqual({ share: 'manual' });
  });

  it('writes the config file for a valid update', async () => {
    const result = await configUpdater({
      configType: 'project',
      updates: [{ path: '/share', value: 'manual' }]
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Updated project config');
    expect(JSON.parse(readFileSync(join(tempDir, 'opencode.json'), 'utf-8'))).toEqual({ share: 'manual' });
  });

  it('supports dotted paths for nested updates', async () => {
    const result = await configUpdater({
      configType: 'project',
      updates: [{ path: 'mode.build.model', value: 'openai/gpt-5.4' }]
    });

    expect(result.success).toBe(true);
    expect(JSON.parse(readFileSync(join(tempDir, 'opencode.json'), 'utf-8'))).toEqual({
      mode: {
        build: {
          model: 'openai/gpt-5.4'
        }
      }
    });
  });

  it('supports JSON Pointer escaping for special characters in keys', async () => {
    const result = await configUpdater({
      configType: 'project',
      updates: [{ path: '/command/foo~1bar/template', value: 'run foo/bar' }]
    });

    expect(result.success).toBe(true);
    expect(JSON.parse(readFileSync(join(tempDir, 'opencode.json'), 'utf-8'))).toEqual({
      command: {
        'foo/bar': {
          template: 'run foo/bar'
        }
      }
    });
  });

  it('returns validation errors for invalid config values from the canonical schema', async () => {
    const result = await configUpdater({
      configType: 'project',
      dryRun: true,
      updates: [{ path: '/share', value: 'sometimes' }]
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Validation failed');
    expect(result.validationErrors?.length).toBeGreaterThan(0);
    expect(result.validationErrors?.some((error) => error.path === '/share')).toBe(true);
  });
});
