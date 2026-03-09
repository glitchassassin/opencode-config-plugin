import type { OpenCodePlugin } from './types.js';
import { configUpdaterTool } from './tools/config-updater.js';

export function createPlugin(): OpenCodePlugin {
  return {
    name: '@opencode-config-validator/plugin',
    tools: {
      config_updater: configUpdaterTool
    }
  };
}

export { configUpdater } from './tools/config-updater.js';
export type { ConfigUpdaterParams, ConfigUpdaterResult, ConfigUpdate, ValidationError } from './types.js';
