# OpenCode Config Validator Plugin

## Overview

A plugin that provides a safe, deterministic way to update OpenCode configuration files with JSON Schema validation. The plugin bundles a custom tool that enforces schema validity on all config changes, preventing invalid configurations from being written.

## Problem Statement

When using OpenCode agents to modify the `opencode.json` configuration file:

1. **No validation guarantee** — The agent may produce invalid JSON or violate the schema
2. **Direct tool access required** — The agent needs `read`, `write`, or `edit` tools to modify config
3. **Manual review needed** — Users must manually verify config validity after changes

This plugin solves these issues by:

- Providing a single dedicated tool that handles all config updates
- Validating changes against the OpenCode JSON Schema before writing
- Restricting the agent to only that tool (no direct file access)
- Bundling the schema for validation
- Accessing OpenCode documentation via the built-in `webfetch` tool with URL permissions

## Architecture

### Components

```
opencode-config-validator/
├── src/
│   ├── tools/
│   │   └── config-updater.ts    # Custom tool with schema validation
│   ├── lib/
│   │   ├── schema.ts            # Schema fetching and caching
│   │   ├── validator.ts         # JSON Schema validation logic
│   │   └── config.ts            # Config file operations
│   ├── index.ts                 # Plugin entry point
│   └── types.ts                 # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

### Tool: `config_updater`

The plugin exposes a single tool that handles all config modifications for both global and project-specific configs.

**Arguments:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `updates` | `Array<{path: string, value: unknown}>` | Yes | Array of JSON path/value updates to apply |
| `configType` | `"global" \| "project"` | No | Which config to update (default: `"project"`) |
| `configPath` | `string` | No | Explicit path to config file (overrides `configType`) |
| `dryRun` | `boolean` | No | Validate without writing (default: `false`) |

**Config Resolution:**

| `configType` | Default Path |
|--------------|-------------|
| `"global"` | `~/.config/opencode/opencode.json` |
| `"project"` | `./opencode.json` (current working directory) |

**Returns:**

```typescript
{
  success: boolean
  message: string
  configFile: string    // Path to the config that was modified
  appliedUpdates?: Array<{path: string, value: unknown}>
  validationErrors?: Array<{
    path: string
    message: string
  }>
  diff?: string // git-style diff if dryRun or on success
}
```

**Behavior:**

1. **Resolve config path** — Based on `configType` or explicit `configPath`
2. **Read current config** — Loads existing config file (or creates empty object if none)
3. **Fetch schema** — Retrieves `https://opencode.ai/config.json` at runtime (cached with ETag)
4. **Apply updates** — Merges updates into a copy of the current config
5. **Validate** — Uses AJV to validate against the JSON Schema
6. **Write** — Only writes if validation passes
7. **Return result** — Reports success/failure with details

### Documentation Access

The agent needs access to OpenCode documentation for reference. This is handled via the built-in `webfetch` tool with URL-based permissions configured per-agent.

**Configuration:**

```json
{
  "permission": {
    "webfetch": {
      "*": "deny",
      "https://opencode.ai/docs/*": "allow"
    }
  }
}
```

This ensures the agent can only fetch OpenCode docs, not arbitrary URLs. The agent-specific permission overrides the global setting.

### Agent: `config-manager`

The plugin pairs with a dedicated agent definition that restricts tool access.

**Configuration:**

```markdown
---
description: Safely manages OpenCode configuration with schema validation
mode: subagent
permission:
  webfetch:
    "*": deny
    "https://opencode.ai/docs/*": allow
tools:
  config_updater: true
  webfetch: true
  read: false
  write: false
  edit: false
  glob: false
  grep: false
  bash: false
---
You are a configuration manager. When asked to update OpenCode configuration:
1. Use webfetch to look up relevant documentation from https://opencode.ai/docs/
2. Use config_updater tool to apply validated changes
3. Use configType "global" for ~/.config/opencode/opencode.json or "project" for ./opencode.json
4. Never attempt to read, write, or edit files directly
5. Report success or failure of each update
6. Explain what changes were made
```

**Usage in opencode.json:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@opencode-config-validator/plugin"],
  "agent": {
    "config-manager": {
      "description": "Safely manages OpenCode configuration with schema validation",
      "mode": "subagent",
      "permission": {
        "webfetch": {
          "*": "deny",
          "https://opencode.ai/docs/*": "allow"
        }
      },
      "tools": {
        "config_updater": true,
        "webfetch": true,
        "read": false,
        "write": false,
        "edit": false,
        "glob": false,
        "grep": false,
        "bash": false,
        "todowrite": false,
        "todoread": false,
        "question": false,
        "websearch": false,
        "patch": false,
        "skill": false,
        "lsp": false
      }
    }
  }
}
```

### Agent Registration

The plugin does not automatically register the agent. Users must add the agent configuration to their `opencode.json` as shown above. This is intentional — it makes the restricted permissions explicit and visible.

## User Flow

### Example: Updating the Model

**User asks:**
> Change my model to anthropic/claude-sonnet-4-20250514

**Agent calls `config_updater`:**

```json
{
  "updates": [
    {"path": "model", "value": "anthropic/claude-sonnet-4-20250514"}
  ]
}
```

**Plugin response:**

```json
{
  "success": true,
  "message": "Updated opencode.json with validated changes",
  "configFile": "/path/to/project/opencode.json",
  "appliedUpdates": [
    {"path": "model", "value": "anthropic/claude-sonnet-4-20250514"}
  ],
  "diff": "- \"model\": \"anthropic/claude-haiku-4-20250514\"\n+ \"model\": \"anthropic/claude-sonnet-4-20250514\""
}
```

### Example: Updating Global Config

**User asks:**
> Enable auto-update in my global config

**Agent calls `config_updater`:**

```json
{
  "configType": "global",
  "updates": [
    {"path": "autoupdate", "value": true}
  ]
}
```

**Plugin response:**

```json
{
  "success": true,
  "message": "Updated global config with validated changes",
  "configFile": "/home/user/.config/opencode/opencode.json",
  "appliedUpdates": [
    {"path": "autoupdate", "value": true}
  ]
}
```

### Example: Looking up Documentation

**User asks:**
> How do I configure permissions for the agent?

**Agent calls `webfetch`:**

```json
{
  "url": "https://opencode.ai/docs/permissions/",
  "format": "markdown"
}
```

**OpenCode returns:** The documentation content (via the built-in webfetch tool, restricted to `opencode.ai/docs/*`)

### Example: Invalid Update

**User asks:**
> Set the model to an invalid value

**Agent calls `config_updater`:**

```json
{
  "updates": [
    {"path": "model", "value": 12345}
  ]
}
```

**Plugin response:**

```json
{
  "success": false,
  "message": "Validation failed",
  "configFile": "/path/to/project/opencode.json",
  "validationErrors": [
    {
      "path": "/model",
      "message": "should be string"
    }
  ]
}
```

## Security Considerations

1. **No shell execution** — The tool doesn't invoke any shell commands
2. **Scoped file access** — Only reads/writes the specific config file
3. **No credential exposure** — Schema is fetched via HTTPS, no secrets passed
4. **Agent isolation** — By disabling all other tools, the agent cannot bypass validation

## Limitations

1. **Schema coverage** — Only validates against `https://opencode.ai/config.json`; doesn't include TUI schema
2. **No rollback** — Tool doesn't automatically rollback on failure (user can use git)
3. **No multi-file** — Operates on single config file at a time
4. **No partial validation** — Entire config must be valid, not just the changed parts
