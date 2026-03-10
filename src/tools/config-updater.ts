import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import type { ConfigUpdaterParams, ConfigUpdaterResult, ConfigUpdate } from '../types.js';
import { createConfigOperations } from '../lib/config.js';
import { createSchemaOperations } from '../lib/schema.js';
import { createValidator } from '../lib/validator.js';

function applyUpdates(config: Record<string, unknown>, updates: ConfigUpdate[]): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(config));

  for (const update of updates) {
    const parts = update.path.split('/').filter(Boolean);
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = parts[parts.length - 1];
    current[lastKey] = update.value;
  }

  return result;
}

export async function configUpdater(params: ConfigUpdaterParams): Promise<ConfigUpdaterResult> {
  const configOps = createConfigOperations();
  const schemaOps = createSchemaOperations();
  const validator = createValidator();

  const configPath = configOps.getDefaultConfigPath(params.configType);
  const currentConfig = configOps.readConfig(configPath);

  try {
    const schema = await schemaOps.fetchSchema();
    const updatedConfig = applyUpdates(currentConfig, params.updates);

    const validationErrors = validator.validate(updatedConfig, schema);

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        configFile: configPath,
        validationErrors
      };
    }

    if (params.dryRun) {
      return {
        success: true,
        message: 'Dry run - validation passed',
        configFile: configPath,
        appliedUpdates: params.updates,
        diff: configOps.generateDiff(currentConfig, updatedConfig)
      };
    }

    configOps.writeConfig(configPath, updatedConfig);

    return {
      success: true,
      message: `Updated ${params.configType === 'global' ? 'global' : 'project'} config with validated changes`,
      configFile: configPath,
      appliedUpdates: params.updates,
      diff: configOps.generateDiff(currentConfig, updatedConfig)
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      configFile: configPath
    };
  }
}

export const configUpdaterTool: ToolDefinition = tool({
  description: 'Safely update OpenCode configuration with JSON Schema validation. See https://opencode.ai/docs/config/ for config options.',
  args: {
    updates: tool.schema.array(tool.schema.object({
      path: tool.schema.string(),
      value: tool.schema.any()
    })),
    configType: tool.schema.enum(['global', 'project']),
    dryRun: tool.schema.boolean().optional()
  },
  execute: async (args, context) => {
    const result = await configUpdater(args);
    return JSON.stringify(result);
  }
});
