import type { Plugin } from '@opencode-ai/plugin';
import { configReaderTool } from './tools/config-reader.js';
import { configUpdaterTool } from './tools/config-updater.js';

export const createPlugin: Plugin = async () => {
  return {
    tool: {
      config_reader: configReaderTool,
      config_updater: configUpdaterTool
    }
  };
};

export { configReader } from './tools/config-reader.js';
export { configUpdater } from './tools/config-updater.js';
export type {
  ConfigReaderParams,
  ConfigReaderResult,
  ConfigUpdaterParams,
  ConfigUpdaterResult,
  ConfigUpdate,
  ValidationError
} from './types.js';
