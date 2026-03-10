import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import type { ConfigReaderParams, ConfigReaderResult } from '../types.js';
import { createConfigOperations } from '../lib/config.js';

export async function configReader(params: ConfigReaderParams): Promise<ConfigReaderResult> {
  const configOps = createConfigOperations();
  const configPath = configOps.getDefaultConfigPath(params.configType);

  try {
    const result = configOps.readConfigWithMetadata(configPath);

    return {
      success: true,
      message: result.exists
        ? `Read ${params.configType === 'global' ? 'global' : 'project'} config`
        : `No ${params.configType === 'global' ? 'global' : 'project'} config file found`,
      configFile: configPath,
      exists: result.exists,
      config: result.config
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      configFile: configPath
    };
  }
}

export const configReaderTool: ToolDefinition = tool({
  description: 'Read the current OpenCode configuration file without modifying it.',
  args: {
    configType: tool.schema.enum(['global', 'project'])
  },
  execute: async (args, context) => {
    const result = await configReader(args);
    return JSON.stringify(result);
  }
});
