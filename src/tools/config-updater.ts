import { tool, type ToolDefinition } from "@opencode-ai/plugin";
import type {
  ConfigUpdaterParams,
  ConfigUpdaterResult,
  ConfigUpdate,
} from "../types.js";
import { createConfigOperations } from "../lib/config.js";
import { createSchemaOperations } from "../lib/schema.js";
import { createValidator } from "../lib/validator.js";

function parseDottedPath(path: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of path) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === ".") {
      if (!current) {
        throw new Error(`Invalid dotted path: ${path}`);
      }

      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (escaped || !current) {
    throw new Error(`Invalid dotted path: ${path}`);
  }

  parts.push(current);
  return parts;
}

function parsePath(path: string): string[] {
  if (!path) {
    throw new Error("Update path cannot be empty");
  }

  if (path.startsWith("/")) {
    return path
      .slice(1)
      .split("/")
      .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  }

  return parseDottedPath(path);
}

function isArrayIndex(segment: string): boolean {
  return /^(0|[1-9]\d*)$/.test(segment);
}

function createContainer(
  nextSegment: string,
): Record<string, unknown> | unknown[] {
  return isArrayIndex(nextSegment) ? [] : {};
}

function setAtPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = parsePath(path);

  if (parts.length === 0) {
    throw new Error("Update path must target a config property");
  }

  let current: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];

    if (Array.isArray(current)) {
      if (!isArrayIndex(key)) {
        throw new Error(`Path segment "${key}" must be an array index`);
      }

      const index = Number(key);
      if (typeof current[index] !== "object" || current[index] === null) {
        current[index] = createContainer(nextKey);
      }
      current = current[index] as Record<string, unknown> | unknown[];
      continue;
    }

    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = createContainer(nextKey);
    }

    current = current[key] as Record<string, unknown> | unknown[];
  }

  const lastKey = parts[parts.length - 1];
  if (Array.isArray(current)) {
    if (!isArrayIndex(lastKey)) {
      throw new Error(`Path segment "${lastKey}" must be an array index`);
    }

    current[Number(lastKey)] = value;
    return;
  }

  current[lastKey] = value;
}

function deleteAtPath(target: Record<string, unknown>, path: string): void {
  const parts = parsePath(path);

  if (parts.length === 0) {
    throw new Error("Update path must target a config property");
  }

  let current: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];

    if (Array.isArray(current)) {
      if (!isArrayIndex(key)) {
        throw new Error(`Path segment "${key}" must be an array index`);
      }

      const next = current[Number(key)];
      if (typeof next !== "object" || next === null) {
        return;
      }

      current = next as Record<string, unknown> | unknown[];
      continue;
    }

    const next = current[key];
    if (typeof next !== "object" || next === null) {
      return;
    }

    current = next as Record<string, unknown> | unknown[];
  }

  const lastKey = parts[parts.length - 1];

  if (Array.isArray(current)) {
    if (!isArrayIndex(lastKey)) {
      throw new Error(`Path segment "${lastKey}" must be an array index`);
    }

    current.splice(Number(lastKey), 1);
    return;
  }

  delete current[lastKey];
}

function applyUpdates(
  config: Record<string, unknown>,
  updates: ConfigUpdate[],
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(config));

  for (const update of updates) {
    if (update.value === undefined) {
      deleteAtPath(result, update.path);
      continue;
    }

    setAtPath(result, update.path, update.value);
  }

  return result;
}

export async function configUpdater(
  params: ConfigUpdaterParams,
): Promise<ConfigUpdaterResult> {
  const configOps = createConfigOperations();
  const schemaOps = createSchemaOperations();
  const validator = createValidator();

  const configPath = configOps.getDefaultConfigPath(params.configType);
  const currentConfig = configOps.readConfig(configPath);

  try {
    const schema = await schemaOps.fetchSchema();
    const updatedConfig = applyUpdates(currentConfig, params.updates);

    const validationErrors = await validator.validate(updatedConfig, schema);

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: "Validation failed",
        configFile: configPath,
        validationErrors,
      };
    }

    if (params.dryRun) {
      return {
        success: true,
        message: "Dry run - validation passed",
        configFile: configPath,
        appliedUpdates: params.updates,
        diff: configOps.generateDiff(currentConfig, updatedConfig),
      };
    }

    configOps.writeConfig(configPath, updatedConfig);

    return {
      success: true,
      message: `Updated ${params.configType === "global" ? "global" : "project"} config with validated changes`,
      configFile: configPath,
      appliedUpdates: params.updates,
      diff: configOps.generateDiff(currentConfig, updatedConfig),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      configFile: configPath,
    };
  }
}

export const configUpdaterTool: ToolDefinition = tool({
  description:
    "Safely update OpenCode configuration with JSON Schema validation. See https://opencode.ai/config.json for supported config fields. Update paths accept either dotted paths like mode.build.model or JSON Pointer paths like /mode/build/model; use JSON Pointer escaping (~1 for /, ~0 for ~) for special characters in keys. Set a value to undefined to remove that key from the config.",
  args: {
    updates: tool.schema.array(
      tool.schema.object({
        path: tool.schema.string(),
        value: tool.schema.any(),
      }),
    ),
    configType: tool.schema.enum(["global", "project"]),
    dryRun: tool.schema.boolean().optional(),
  },
  execute: async (args, context) => {
    const result = await configUpdater(args);
    return JSON.stringify(result);
  },
});
