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

## Tools

The plugin exposes two tools for working with OpenCode configuration files.

### `config_reader`

Reads the current global or project config without modifying it.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `configType` | `"global" \| "project"` | Yes | Which config to read |

#### Example

```json
{
  "configType": "project"
}
```

### `config_updater`

Safely updates OpenCode configuration with validation based on `https://opencode.ai/config.json`. Set an update `value` to `undefined` to remove that key from the config.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `updates` | `Array<{path: string, value: unknown}>` | Yes | Array of JSON path/value updates; set `value` to `undefined` to remove a key |
| `configType` | `"global" \| "project"` | Yes | Which config to update |
| `dryRun` | `boolean` | No | Validate without writing |

#### Example

```json
{
  "configType": "project",
  "updates": [
    {"path": "model", "value": "anthropic/claude-sonnet-4-20250514"}
  ]
}
```
