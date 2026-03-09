import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

export interface ConfigFileOperations {
  readConfig(configPath: string): Record<string, unknown>;
  writeConfig(configPath: string, config: Record<string, unknown>): void;
  getDefaultConfigPath(configType: 'global' | 'project'): string;
  generateDiff(original: Record<string, unknown>, updated: Record<string, unknown>): string;
}

export function createConfigOperations(): ConfigFileOperations {
  return {
    readConfig(configPath: string): Record<string, unknown> {
      if (!existsSync(configPath)) {
        return {};
      }
      try {
        const content = readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        return {};
      }
    },

    writeConfig(configPath: string, config: Record<string, unknown>): void {
      const dir = configPath.substring(0, configPath.lastIndexOf('/'));
      const fs = require('fs');
      if (!existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    },

    getDefaultConfigPath(configType: 'global' | 'project'): string {
      if (configType === 'global') {
        return resolve(homedir(), '.config/opencode/opencode.json');
      }
      return resolve(process.cwd(), 'opencode.json');
    },

    generateDiff(original: Record<string, unknown>, updated: Record<string, unknown>): string {
      const originalStr = JSON.stringify(original, null, 2);
      const updatedStr = JSON.stringify(updated, null, 2);
      const originalLines = originalStr.split('\n');
      const updatedLines = updatedStr.split('\n');

      const diff: string[] = [];
      const maxLines = Math.max(originalLines.length, updatedLines.length);

      for (let i = 0; i < maxLines; i++) {
        const origLine = originalLines[i] || '';
        const newLine = updatedLines[i] || '';
        if (origLine !== newLine) {
          if (origLine) diff.push(`- ${origLine}`);
          if (newLine) diff.push(`+ ${newLine}`);
        }
      }

      return diff.join('\n');
    }
  };
}
