export interface ConfigUpdate {
  path: string;
  value: unknown;
}

export interface ConfigUpdaterParams {
  updates: ConfigUpdate[];
  configType?: 'global' | 'project';
  configPath?: string;
  dryRun?: boolean;
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

export interface OpenCodePlugin {
  name: string;
  tools: Record<string, unknown>;
}
