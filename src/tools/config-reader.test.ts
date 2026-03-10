import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { configReader } from './config-reader.js';

vi.mock('@opencode-ai/plugin', () => ({
  tool: Object.assign(
    (definition: unknown) => definition,
    {
      schema: {
        enum: () => ({})
      }
    }
  )
}));

describe('configReader', () => {
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

  it('returns config contents when the project config exists', async () => {
    writeFileSync(
      join(tempDir, 'opencode.json'),
      JSON.stringify({ model: 'test-model', theme: { mode: 'light' } }, null, 2)
    );

    const result = await configReader({ configType: 'project' });

    expect(result.success).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.config).toEqual({ model: 'test-model', theme: { mode: 'light' } });
    expect(result.configFile).toBe(join(realpathSync(tempDir), 'opencode.json'));
  });

  it('returns an empty config when the project config is missing', async () => {
    const result = await configReader({ configType: 'project' });

    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.config).toEqual({});
    expect(result.message).toContain('No project config file found');
  });

  it('returns an error when the config file contains invalid JSON', async () => {
    writeFileSync(join(tempDir, 'opencode.json'), '{invalid json');

    const result = await configReader({ configType: 'project' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('JSON');
  });
});
