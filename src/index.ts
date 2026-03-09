import type { Plugin } from '@opencode-ai/plugin';
import { configUpdaterTool } from './tools/config-updater.js';

export const createPlugin: Plugin = async () => {
  return {
    tool: {
      config_updater: configUpdaterTool
    }
  };
};

export { configUpdater } from './tools/config-updater.js';
export type { ConfigUpdaterParams, ConfigUpdaterResult, ConfigUpdate, ValidationError } from './types.js';
