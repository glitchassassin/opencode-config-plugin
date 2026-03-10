import type { Plugin } from '@opencode-ai/plugin';

export { Plugin };

export interface ConfigUpdate {
  path: string;
  value: unknown;
}

export interface ConfigUpdaterParams {
  updates: ConfigUpdate[];
  configType: 'global' | 'project';
  dryRun?: boolean;
}

export interface ConfigReaderParams {
  configType: 'global' | 'project';
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ConfigUpdaterResult {
  success: boolean;
  message: string;
  configFile: string;
  appliedUpdates?: ConfigUpdate[];
  validationErrors?: ValidationError[];
  diff?: string;
}

export interface ConfigReaderResult {
  success: boolean;
  message: string;
  configFile: string;
  exists?: boolean;
  config?: Record<string, unknown>;
}
