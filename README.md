# OpenCode Config Plugin

A plugin that provides a safe, deterministic way to update OpenCode configuration files with JSON Schema validation.

## Installation

```bash
npm install opencode-config-plugin
```

## Usage

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-config-plugin"]
}
```

## Tool: config_updater

The plugin exposes a single tool for updating OpenCode configuration with validation based on https://opencode.ai/docs/config/.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `updates` | `Array<{path: string, value: unknown}>` | Yes | Array of JSON path/value updates |
| `configType` | `"global" \| "project"` | Yes | Which config to update |
| `dryRun` | `boolean` | No | Validate without writing |

### Example

```json
{
  "configType": "project",
  "updates": [
    {"path": "model", "value": "anthropic/claude-sonnet-4-20250514"}
  ]
}
```
