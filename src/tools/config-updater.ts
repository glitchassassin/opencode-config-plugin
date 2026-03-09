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

  const configPath = params.configPath || configOps.getDefaultConfigPath(params.configType || 'project');
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

export const configUpdaterTool = {
  name: 'config_updater',
  description: 'Safely update OpenCode configuration with JSON Schema validation',
  params: {
    type: 'object',
    properties: {
      updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            value: {}
          },
          required: ['path', 'value']
        },
        description: 'Array of JSON path/value updates to apply'
      },
      configType: {
        type: 'string',
        enum: ['global', 'project'],
        description: 'Which config to update (default: "project")'
      },
      configPath: {
        type: 'string',
        description: 'Explicit path to config file (overrides configType)'
      },
      dryRun: {
        type: 'boolean',
        description: 'Validate without writing (default: false)'
      }
    },
    required: ['updates']
  },
  handler: configUpdater
};
